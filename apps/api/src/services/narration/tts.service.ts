/**
 * TTS Service Implementation
 *
 * Text-to-Speech service using ElevenLabs with:
 * - Distributed rate limiting (Redis)
 * - Local concurrency control (p-limit)
 * - Audio caching
 * - Emotion-based voice settings
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import pLimit from 'p-limit';

import type { ElevenLabsVoiceSettings, Emotion } from '@mio/shared/types';
import { AppError, ErrorCodes } from '@mio/shared';

import type { IAudioRepository } from '../../repositories/audio/audio-repository.types';
import type { ICacheService } from '../cache/cache.service.types';
import type { TTSStore } from './tts.service.store';
import type { BatchGenerateSpeechInput, BatchGenerateSpeechResult, GenerateSpeechInput, GenerateSpeechResult, ITTSService } from './tts.service.types';
import { IocRepository, IocService, IocStore } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';
import { AbstractService } from '../service.abstract';
import {
  AUDIO_FORMAT,
  CONCURRENCY_CONFIG,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_TTS_MODEL,
  DEFAULT_VOICE_SETTINGS,
  EMOTION_AUDIO_TAGS,
  EMOTION_VOICE_SETTINGS,
  RATE_LIMIT_CONFIG
} from './tts.service.constants';

/**
 * TTS Service
 *
 * Orchestrates text-to-speech generation with:
 * - Distributed rate limiting via Redis
 * - Local concurrency control via p-limit
 * - Cache integration for cost optimization
 * - Emotion-based voice customization
 */
@injectable()
export class TTSService extends AbstractService implements ITTSService {
  private readonly localLimit: ReturnType<typeof pLimit>;

  constructor(
    @inject(IocStore.TTS_STORE) private readonly ttsStore: TTSStore,
    @inject(IocService.CACHE) private readonly cache: ICacheService
  ) {
    super();
    this.localLimit = pLimit(CONCURRENCY_CONFIG.maxLocalConcurrency);
  }

  /**
   * Lazily create Voices repository to avoid initialization issues
   */
  private _repository: IAudioRepository | null = null;
  private get repository(): IAudioRepository {
    if (!this._repository) {
      // Create repository lazily to ensure Logger is available
      this._repository = getInstance<IAudioRepository>(IocRepository.AUDIO);
    }
    return this._repository;
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechResult> {
    const { text, voiceId, emotion, voiceSettings, characterName } = input;

    // Apply audio tag for emotion (eleven_v3 best practice)
    const audioTag = emotion ? EMOTION_AUDIO_TAGS[emotion] : null;
    const textWithEmotion = audioTag ? `${audioTag} ${text}` : text;

    // Merge voice settings with emotion settings (needed for both cache key and generation)
    const mergedSettings = this.mergeVoiceSettings(emotion, voiceSettings);

    // Build complete cache key parameters (all params that affect TTS output)
    // Use textWithEmotion since audio tags affect the output
    const cacheKeyParams = {
      text: textWithEmotion,
      voiceId,
      modelId: DEFAULT_TTS_MODEL,
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      voiceSettings: mergedSettings
        ? {
            stability: mergedSettings.stability,
            similarityBoost: mergedSettings.similarityBoost,
            style: mergedSettings.style,
            speed: mergedSettings.speed
          }
        : undefined
    };

    this.logger.debug('Generating speech', {
      textLength: text.length,
      voiceId,
      emotion,
      audioTag,
      characterName,
      cacheKey: this.ttsStore.generateCacheKey(cacheKeyParams)
    });

    // Check cache first via store
    const cached = await this.ttsStore.getCachedAudio(cacheKeyParams);
    if (cached) {
      this.logger.info('[TTS CACHE HIT] Found cached audio', {
        voiceId,
        cacheKey: this.ttsStore.generateCacheKey(cacheKeyParams),
        cachedUrl: cached.url
      });

      return {
        audio: cached.audio,
        durationSeconds: cached.duration / 1000, // Convert ms to seconds
        voiceId,
        format: AUDIO_FORMAT,
        fromCache: true
      };
    }

    this.logger.info('[TTS CACHE MISS] No cached audio found, will call API', {
      voiceId,
      cacheKey: this.ttsStore.generateCacheKey(cacheKeyParams),
      voiceSettings: cacheKeyParams.voiceSettings
    });

    // Wait for rate limit slot
    await this.waitForRateLimitSlot();

    // Generate speech (with audio tag if emotion specified)
    const result = await this.repository.convertTextToSpeech({
      text: textWithEmotion,
      voiceId,
      modelId: DEFAULT_TTS_MODEL,
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      voiceSettings: mergedSettings
    });

    // Persist via store
    await this.ttsStore.persistAudio(cacheKeyParams, result.audio, {
      voiceId,
      durationSeconds: result.durationSeconds,
      emotion,
      characterName
    });

    this.logger.info('Speech generated and cached', {
      voiceId,
      durationSeconds: result.durationSeconds,
      characterName
    });

    return {
      audio: result.audio,
      durationSeconds: result.durationSeconds,
      voiceId,
      format: AUDIO_FORMAT,
      fromCache: false
    };
  }

  /**
   * Generate speech for multiple segments with controlled concurrency
   */
  async generateBatch(input: BatchGenerateSpeechInput): Promise<BatchGenerateSpeechResult> {
    const { segments } = input;

    this.logger.info('Starting batch generation', { segmentCount: segments.length });

    const results = await Promise.allSettled(
      segments.map((segment) =>
        this.localLimit(async () => {
          const result = await this.generateSpeech({
            text: segment.text,
            voiceId: segment.voiceId,
            emotion: segment.emotion,
            voiceSettings: segment.voiceSettings,
            characterName: segment.characterName
          });
          return { id: segment.id, result };
        })
      )
    );

    // Process results
    const processedResults = results.map((result, index) => {
      const segment = segments[index];
      if (!segment) {
        return { id: 'unknown', error: new Error('Missing segment') };
      }

      if (result.status === 'fulfilled') {
        return {
          id: segment.id,
          result: result.value.result
        };
      } else {
        return {
          id: segment.id,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
        };
      }
    });

    const successCount = processedResults.filter((r) => r.result).length;
    const failureCount = processedResults.filter((r) => r.error).length;
    const totalDurationSeconds = processedResults.filter((r) => r.result).reduce((sum, r) => sum + (r.result?.durationSeconds ?? 0), 0);

    this.logger.info('Batch generation complete', {
      segmentCount: segments.length,
      successCount,
      failureCount,
      totalDurationSeconds
    });

    return {
      results: processedResults,
      successCount,
      failureCount,
      totalDurationSeconds
    };
  }

  /**
   * Acquire a slot for API request (distributed rate limiting)
   */
  private async acquireRateLimitSlot(): Promise<boolean> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const key = `${RATE_LIMIT_CONFIG.keyPrefix}:${currentMinute}`;

    // Atomic increment with TTL
    const count = await this.cache.incr(key);
    if (count === 1) {
      // First request of this minute, set TTL
      await this.cache.expire(key, RATE_LIMIT_CONFIG.keyTtlSeconds);
    }

    if (count > RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
      this.logger.warn('TTS rate limit reached', {
        count,
        max: RATE_LIMIT_CONFIG.maxRequestsPerMinute
      });
      return false;
    }

    return true;
  }

  /**
   * Wait for rate limit slot with exponential backoff
   */
  private async waitForRateLimitSlot(): Promise<void> {
    const startTime = Date.now();
    let waitTime = RATE_LIMIT_CONFIG.initialBackoffMs;

    while (Date.now() - startTime < RATE_LIMIT_CONFIG.maxWaitMs) {
      if (await this.acquireRateLimitSlot()) {
        return;
      }

      await this.sleep(waitTime);
      waitTime = Math.min(waitTime * 1.5, RATE_LIMIT_CONFIG.maxBackoffMs);
    }

    throw new AppError(ErrorCodes.TTSRateLimited, {
      name: 'TTSRateLimitExceeded'
    });
  }

  /**
   * Merge emotion-based settings with explicit overrides
   */
  private mergeVoiceSettings(emotion?: Emotion, overrides?: ElevenLabsVoiceSettings): ElevenLabsVoiceSettings {
    // Start with default settings
    let baseSettings = { ...DEFAULT_VOICE_SETTINGS };

    // Apply emotion-based settings
    if (emotion && EMOTION_VOICE_SETTINGS[emotion]) {
      baseSettings = { ...EMOTION_VOICE_SETTINGS[emotion] };
    }

    // Apply explicit overrides
    if (overrides) {
      baseSettings = {
        ...baseSettings,
        ...overrides
      };
    }

    return baseSettings;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
