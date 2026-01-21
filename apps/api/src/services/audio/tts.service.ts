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
import { injectable, inject } from 'inversify';
import pLimit from 'p-limit';

import { AppError, ErrorCodes, Emotion } from '@mio/shared';
import type { ElevenLabsVoiceSettings } from '@mio/shared/models';
import { Logger } from '@mio/shared/server/logger';

import { getInstance, IocInfrastructure, IocService } from '../../ioc';
import type { ICacheService } from '../cache/cache.service.types';
import type { IAudioCacheService } from '../cache/audio-cache.service.types';
import type { IStorageService } from '../storage';
import type { IElevenLabsProvider } from './elevenLabs.provider.types';
import type {
    ITTSService,
    GenerateSpeechInput,
    GenerateSpeechResult,
    BatchGenerateSpeechInput,
    BatchGenerateSpeechResult,
    CharacterArchetype,
} from './tts.service.types';
import {
    VOICE_IDS_BY_LANGUAGE,
    EMOTION_VOICE_SETTINGS,
    EMOTION_AUDIO_TAGS,
    DEFAULT_VOICE_SETTINGS,
    RATE_LIMIT_CONFIG,
    CONCURRENCY_CONFIG,
    AUDIO_FORMAT,
    ARCHETYPE_KEYWORDS,
    DEFAULT_TTS_MODEL,
    DEFAULT_OUTPUT_FORMAT,
} from './tts.service.constants';
import { Language } from '@mio/shared/types';
import { ElevenLabsProvider } from './elevenLabs.provider';

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
export class TTSService implements ITTSService {
    private readonly localLimit: ReturnType<typeof pLimit>;

    constructor(
        @inject(IocInfrastructure.LOGGER) private readonly logger: Logger,
        @inject(IocService.CACHE) private readonly cache: ICacheService,
        @inject(IocService.AUDIO_CACHE) private readonly audioCache: IAudioCacheService,
        @inject(IocService.STORAGE) private readonly storage: IStorageService,
    ) {
        this.localLimit = pLimit(CONCURRENCY_CONFIG.maxLocalConcurrency);
    }

    /**
     * Lazily create ElevenLabs provider to avoid initialization issues
     */
    private _provider: IElevenLabsProvider | null = null;
    private get provider(): IElevenLabsProvider {
        if (!this._provider) {
            // Create provider lazily to ensure Logger is available
            this._provider = getInstance<IElevenLabsProvider>(IocService.ELEVENLABS_PROVIDER);
        }
        return this._provider;
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
            voiceSettings: mergedSettings ? {
                stability: mergedSettings.stability,
                similarityBoost: mergedSettings.similarityBoost,
                style: mergedSettings.style,
                speed: mergedSettings.speed,
            } : undefined,
        };

        this.logger.debug('Generating speech', {
            textLength: text.length,
            voiceId,
            emotion,
            audioTag,
            characterName,
            cacheKey: this.audioCache.generateCacheKey(cacheKeyParams),
        });

        // Check cache first (with all parameters)
        const cached = await this.audioCache.get(cacheKeyParams);
        if (cached) {
            this.logger.info('[TTS CACHE HIT] Found cached audio', {
                voiceId,
                cacheKey: this.audioCache.generateCacheKey(cacheKeyParams),
                cachedUrl: cached.url,
            });

            try {
                // Download from storage
                const audio = await this.storage.download(cached.url);

                // Increment usage counter
                await this.audioCache.incrementUsage(cacheKeyParams);

                return {
                    audio,
                    durationSeconds: cached.duration / 1000, // Convert ms to seconds
                    voiceId,
                    format: AUDIO_FORMAT,
                    fromCache: true,
                };
            } catch (error) {
                // Cache entry exists but file not found, continue to generate
                this.logger.warn('[TTS CACHE INVALID] Cache entry exists but file not found, regenerating', {
                    voiceId,
                    error: error instanceof Error ? error.message : 'Unknown',
                });
            }
        } else {
            this.logger.info('[TTS CACHE MISS] No cached audio found, will call API', {
                voiceId,
                cacheKey: this.audioCache.generateCacheKey(cacheKeyParams),
                voiceSettings: cacheKeyParams.voiceSettings,
            });
        }

        // Wait for rate limit slot
        await this.waitForRateLimitSlot();

        // Generate speech (with audio tag if emotion specified)
        const result = await this.provider.convertWithTimestamps({
            text: textWithEmotion,
            voiceId,
            modelId: DEFAULT_TTS_MODEL,
            outputFormat: DEFAULT_OUTPUT_FORMAT,
            voiceSettings: mergedSettings,
        });

        // Store in storage and cache
        const storagePath = `tts/${voiceId}/${Date.now()}-${Bun.hash(text)}.mp3`;
        await this.storage.upload(result.audio, storagePath, {
            contentType: 'audio/mpeg',
        });

        await this.audioCache.set(
            cacheKeyParams,
            {
                url: storagePath,
                duration: result.durationSeconds * 1000, // Convert to ms
                voiceId,
                metadata: {
                    emotion,
                    characterName,
                },
            }
        );

        this.logger.info('Speech generated', {
            voiceId,
            durationSeconds: result.durationSeconds,
            characterName,
        });

        return {
            audio: result.audio,
            durationSeconds: result.durationSeconds,
            voiceId,
            format: AUDIO_FORMAT,
            fromCache: false,
        };
    }

    /**
     * Generate speech for multiple segments with controlled concurrency
     */
    async generateBatch(input: BatchGenerateSpeechInput): Promise<BatchGenerateSpeechResult> {
        const { segments } = input;

        this.logger.info('Starting batch generation', { segmentCount: segments.length });

        const results = await Promise.allSettled(
            segments.map(segment =>
                this.localLimit(async () => {
                    const result = await this.generateSpeech({
                        text: segment.text,
                        voiceId: segment.voiceId,
                        emotion: segment.emotion,
                        voiceSettings: segment.voiceSettings,
                        characterName: segment.characterName,
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
                    result: result.value.result,
                };
            } else {
                return {
                    id: segment.id,
                    error: result.reason instanceof Error
                        ? result.reason
                        : new Error(String(result.reason)),
                };
            }
        });

        const successCount = processedResults.filter(r => r.result).length;
        const failureCount = processedResults.filter(r => r.error).length;
        const totalDurationSeconds = processedResults
            .filter(r => r.result)
            .reduce((sum, r) => sum + (r.result?.durationSeconds ?? 0), 0);

        this.logger.info('Batch generation complete', {
            segmentCount: segments.length,
            successCount,
            failureCount,
            totalDurationSeconds,
        });

        return {
            results: processedResults,
            successCount,
            failureCount,
            totalDurationSeconds,
        };
    }

    /**
     * Select appropriate voice ID for a character
     *
     * @param description - Character description or archetype name
     * @param options - Voice selection options (gender, language)
     * @returns ElevenLabs voice ID appropriate for the language
     */
    selectVoiceForCharacter(
        description: string,
        options?: { gender?: 'male' | 'female'; language?: typeof Language[keyof typeof Language] }
    ): string {
        const gender = options?.gender ?? 'female';
        const language = options?.language ?? Language.French; // Default to French
        const lowerDescription = description.toLowerCase();

        // Get voice IDs for the specified language
        const voiceIds = VOICE_IDS_BY_LANGUAGE[language];

        // Find matching archetype by keywords
        for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
            if (keywords.some(keyword => lowerDescription.includes(keyword))) {
                const voices = voiceIds[archetype as CharacterArchetype];
                return voices[gender];
            }
        }

        // Default to narrator
        return voiceIds.narrator[gender];
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
                max: RATE_LIMIT_CONFIG.maxRequestsPerMinute,
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
            name: 'TTSRateLimitExceeded',
        });
    }

    /**
     * Merge emotion-based settings with explicit overrides
     */
    private mergeVoiceSettings(
        emotion?: Emotion,
        overrides?: ElevenLabsVoiceSettings
    ): ElevenLabsVoiceSettings {
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
                ...overrides,
            };
        }

        return baseSettings;
    }

    /**
     * Sleep for a given number of milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
