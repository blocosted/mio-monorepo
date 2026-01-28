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
import type { AudioCacheKeyParams } from '../cache/audio-cache.service.types';
import type { AudioCacheService } from '../cache/audio-cache.service';
import type { CacheService } from '../cache/cache.service';
import type { StorageService } from '../storage';
import type { BatchGenerateSpeechInput, BatchGenerateSpeechResult, GenerateSpeechInput, GenerateSpeechResult } from './tts.service.types';
import { IocRepository, IocService } from '../../ioc/ioc.types';
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
import { extractTTSText } from './tts-text-extractor';

/**
 * Cached audio metadata with full details
 */
interface CachedAudioMetadata {
  url: string;
  duration: number;
  voiceId: string;
  metadata?: { emotion?: string; characterName?: string };
  audio: Buffer;
}

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
export class TTSService extends AbstractService {
  private readonly localLimit: ReturnType<typeof pLimit>;

  constructor(
    @inject(IocService.AUDIO_CACHE) private readonly audioCache: AudioCacheService,
    @inject(IocService.CACHE) private readonly cache: CacheService,
    @inject(IocService.STORAGE) private readonly storage: StorageService
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
    const { text, voiceId, segmentType = 'narration', emotion, voiceSettings, characterName } = input;

    // Extract TTS text based on segment type
    // For dialogue: extracts only quoted text (e.g., "REGARDE!" from '[excited] "REGARDE!" s\'ecria-t-il')
    // For narration: uses full text
    const extraction = extractTTSText(text, segmentType);

    // Log if text was extracted (dialogue with narrative description)
    if (extraction.ttsText !== text.trim()) {
      this.logger.debug('TTS text extracted from dialogue', {
        originalLength: text.length,
        extractedLength: extraction.ttsText.length,
        quotedSections: extraction.quotedSections.length,
        spokenWordCount: extraction.spokenWordCount
      });
    }

    // Use extracted text for TTS
    const ttsText = extraction.ttsText;

    // Apply audio tag for emotion (eleven_v3 best practice)
    // Note: If extractTTSText already found an emotion tag, don't duplicate it
    const audioTag = emotion && !extraction.emotionTag ? EMOTION_AUDIO_TAGS[emotion] : null;
    const textWithEmotion = audioTag ? `${audioTag} ${ttsText}` : ttsText;

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

    const cacheKey = this.generateCacheKey(cacheKeyParams);

    this.logger.debug('Generating speech', {
      textLength: text.length,
      voiceId,
      emotion,
      audioTag,
      characterName,
      cacheKey
    });

    // Check cache first
    const cached = await this.getCachedAudio(cacheKeyParams);
    if (cached) {
      this.logger.info('[TTS CACHE HIT] Found cached audio', {
        voiceId,
        cacheKey,
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
      cacheKey,
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

    // Persist audio to cache and storage
    await this.persistAudio(cacheKeyParams, result.audio, {
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
            segmentType: segment.segmentType,
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

  /**
   * Get cached audio from cache and storage
   *
   * @returns Cached audio with blob and metadata, or null if not found
   */
  private async getCachedAudio(cacheParams: AudioCacheKeyParams): Promise<CachedAudioMetadata | null> {
    // Check cache metadata
    const cached = await this.audioCache.get(cacheParams);
    if (!cached) {
      return null;
    }

    try {
      // Download audio from storage
      const audio = await this.storage.download(cached.url);

      // Increment usage counter
      await this.audioCache.incrementUsage(cacheParams);

      return {
        ...cached,
        audio
      };
    } catch {
      // Cache entry exists but file not found in storage
      // Return null to trigger regeneration
      return null;
    }
  }

  /**
   * Persist generated audio to storage and cache
   *
   * @param cacheParams - Cache key parameters
   * @param audio - Audio buffer to persist
   * @param metadata - Audio metadata (duration, voiceId, etc.)
   */
  private async persistAudio(
    cacheParams: AudioCacheKeyParams,
    audio: Buffer,
    metadata: {
      voiceId: string;
      durationSeconds: number;
      emotion?: string;
      characterName?: string;
    }
  ): Promise<{ url: string }> {
    // Generate storage path
    const storagePath = `tts/${metadata.voiceId}/${Date.now()}-${Bun.hash(cacheParams.text)}.mp3`;

    // Upload to storage
    await this.storage.upload(audio, storagePath, {
      contentType: 'audio/mpeg'
    });

    // Store in cache
    await this.audioCache.set(cacheParams, {
      url: storagePath,
      duration: metadata.durationSeconds * 1000, // Convert to ms
      voiceId: metadata.voiceId,
      metadata: {
        emotion: metadata.emotion,
        characterName: metadata.characterName
      }
    });

    return { url: storagePath };
  }

  /**
   * Generate cache key for logging/debugging
   */
  private generateCacheKey(cacheParams: AudioCacheKeyParams): string {
    return this.audioCache.generateCacheKey(cacheParams);
  }
}
