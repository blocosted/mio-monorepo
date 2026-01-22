/**
 * Sound Effects Service Implementation
 *
 * Sound effects generation service using ElevenLabs with:
 * - Distributed rate limiting (Redis)
 * - Local concurrency control (p-limit)
 * - Audio caching with deterministic keys
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import pLimit from 'p-limit';

import { AppError, ErrorCodes } from '@mio/shared';
import { Logger } from '@mio/shared/server/logger';

import { getInstance, IocInfrastructure, IocService } from '../../ioc';
import type { ICacheService } from '../cache/cache.service.types';
import type { ISfxCacheService } from '../cache/sfx-cache.service.types';
import type { IStorageService } from '../storage';
import type { ISoundEffectsProvider } from './soundEffects.provider.types';
import type {
    ISoundEffectsService,
    GenerateSfxInput,
    GenerateSfxResult,
    BatchGenerateSfxInput,
    BatchGenerateSfxResult,
} from './soundEffects.service.types';
import {
    SFX_AUDIO_FORMAT,
    DEFAULT_SFX_OUTPUT_FORMAT,
    DEFAULT_PROMPT_INFLUENCE,
    SFX_RATE_LIMIT_CONFIG,
    SFX_CONCURRENCY_CONFIG,
    RECOMMENDED_DURATIONS,
    CATEGORY_PROMPT_INFLUENCE,
} from './soundEffects.service.constants';
import { SfxCategory } from './soundEffects.provider.types';

/**
 * Sound Effects Service
 *
 * Orchestrates sound effects generation with:
 * - Distributed rate limiting via Redis
 * - Local concurrency control via p-limit
 * - Cache integration for cost optimization
 * - Category-based configuration
 */
@injectable()
export class SoundEffectsService implements ISoundEffectsService {
    private readonly localLimit: ReturnType<typeof pLimit>;
    private cacheHits = 0;
    private cacheMisses = 0;

    constructor(
        @inject(IocInfrastructure.LOGGER) private readonly logger: Logger,
        @inject(IocService.CACHE) private readonly cache: ICacheService,
        @inject(IocService.SFX_CACHE) private readonly sfxCache: ISfxCacheService,
        @inject(IocService.STORAGE) private readonly storage: IStorageService,
    ) {
        this.localLimit = pLimit(SFX_CONCURRENCY_CONFIG.maxLocalConcurrency);
    }

    /**
     * Lazily create SoundEffects provider to avoid initialization issues
     */
    private _provider: ISoundEffectsProvider | null = null;
    private get provider(): ISoundEffectsProvider {
        if (!this._provider) {
            this._provider = getInstance<ISoundEffectsProvider>(IocService.SOUND_EFFECTS_PROVIDER);
        }
        return this._provider;
    }

    /**
     * Generate a sound effect from text description
     */
    async generateSfx(input: GenerateSfxInput): Promise<GenerateSfxResult> {
        const { text, category, durationSeconds, promptInfluence } = input;

        // Apply category-based defaults if not explicitly provided
        const effectivePromptInfluence = promptInfluence
            ?? (category ? CATEGORY_PROMPT_INFLUENCE[category] : DEFAULT_PROMPT_INFLUENCE);

        // Build complete cache key parameters
        const cacheKeyParams = {
            text,
            outputFormat: DEFAULT_SFX_OUTPUT_FORMAT,
            durationSeconds,
            promptInfluence: effectivePromptInfluence,
        };

        const cacheKey = this.sfxCache.generateCacheKey(cacheKeyParams);

        this.logger.debug('Generating sound effect', {
            textLength: text.length,
            textPreview: text.substring(0, 50),
            category,
            durationSeconds,
            promptInfluence: effectivePromptInfluence,
            cacheKey,
        });

        // Check cache first
        const cached = await this.sfxCache.get(cacheKeyParams);
        if (cached) {
            this.logger.info('[SFX CACHE HIT] Found cached SFX', {
                cacheKey,
                cachedUrl: cached.url,
            });

            try {
                // Download from storage
                const audio = await this.storage.download(cached.url);

                // Increment usage counter
                await this.sfxCache.incrementUsage(cacheKeyParams);
                this.cacheHits++;

                return {
                    audio,
                    durationSeconds: cached.durationSeconds,
                    format: SFX_AUDIO_FORMAT,
                    fromCache: true,
                    cacheKey,
                };
            } catch (error) {
                // Cache entry exists but file not found, continue to generate
                this.logger.warn('[SFX CACHE INVALID] Cache entry exists but file not found, regenerating', {
                    cacheKey,
                    error: error instanceof Error ? error.message : 'Unknown',
                });
            }
        } else {
            this.logger.info('[SFX CACHE MISS] No cached SFX found, will call API', {
                cacheKey,
            });
            this.cacheMisses++;
        }

        // Wait for rate limit slot
        await this.waitForRateLimitSlot();

        // Generate sound effect
        const result = await this.provider.convert({
            text,
            outputFormat: DEFAULT_SFX_OUTPUT_FORMAT,
            durationSeconds,
            promptInfluence: effectivePromptInfluence,
        });

        // Store in storage and cache
        const storagePath = `sfx/${category ?? 'general'}/${Date.now()}-${Bun.hash(text)}.mp3`;
        await this.storage.upload(result.audio, storagePath, {
            contentType: 'audio/mpeg',
        });

        await this.sfxCache.set(
            cacheKeyParams,
            {
                url: storagePath,
                durationSeconds: result.durationSeconds,
                category,
            }
        );

        this.logger.info('Sound effect generated', {
            textPreview: text.substring(0, 50),
            durationSeconds: result.durationSeconds,
            category,
            storagePath,
        });

        return {
            audio: result.audio,
            durationSeconds: result.durationSeconds,
            format: SFX_AUDIO_FORMAT,
            fromCache: false,
            cacheKey,
        };
    }

    /**
     * Generate multiple sound effects with controlled concurrency
     */
    async generateBatch(input: BatchGenerateSfxInput): Promise<BatchGenerateSfxResult> {
        const { segments } = input;

        this.logger.info('Starting batch SFX generation', { segmentCount: segments.length });

        const results = await Promise.allSettled(
            segments.map(segment =>
                this.localLimit(async () => {
                    const result = await this.generateSfx({
                        text: segment.text,
                        category: segment.category,
                        durationSeconds: segment.durationSeconds,
                        promptInfluence: segment.promptInfluence,
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

        this.logger.info('Batch SFX generation complete', {
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
     * Get cache statistics for sound effects
     */
    async getCacheStats(): Promise<{ hits: number; misses: number; size: number }> {
        // Note: Getting actual cache size would require a Redis SCAN operation
        // For now, we return local statistics for the current session
        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            size: 0, // Would need Redis SCAN to count sfx:audio:* keys
        };
    }

    /**
     * Acquire a slot for API request (distributed rate limiting)
     */
    private async acquireRateLimitSlot(): Promise<boolean> {
        const currentMinute = Math.floor(Date.now() / 60000);
        const key = `${SFX_RATE_LIMIT_CONFIG.keyPrefix}:${currentMinute}`;

        // Atomic increment with TTL
        const count = await this.cache.incr(key);
        if (count === 1) {
            // First request of this minute, set TTL
            await this.cache.expire(key, SFX_RATE_LIMIT_CONFIG.keyTtlSeconds);
        }

        if (count > SFX_RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
            this.logger.warn('SFX rate limit reached', {
                count,
                max: SFX_RATE_LIMIT_CONFIG.maxRequestsPerMinute,
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
        let waitTime = SFX_RATE_LIMIT_CONFIG.initialBackoffMs;

        while (Date.now() - startTime < SFX_RATE_LIMIT_CONFIG.maxWaitMs) {
            if (await this.acquireRateLimitSlot()) {
                return;
            }

            await this.sleep(waitTime);
            waitTime = Math.min(waitTime * 1.5, SFX_RATE_LIMIT_CONFIG.maxBackoffMs);
        }

        throw new AppError(ErrorCodes.SFXRateLimited, {
            name: 'SFXRateLimitExceeded',
        });
    }

    /**
     * Sleep for a given number of milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
