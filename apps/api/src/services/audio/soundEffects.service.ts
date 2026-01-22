/**
 * Sound Effects Service Implementation
 *
 * Sound effects generation service using ElevenLabs with:
 * - Library-first approach (check persistent library before generating)
 * - Distributed rate limiting (Redis)
 * - Local concurrency control (p-limit)
 * - Audio caching with deterministic keys
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import pLimit from 'p-limit';

import { AppError, ErrorCodes } from '@mio/shared';
import { Logger } from '@mio/shared/server/logger';
import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AudioIntensity,
} from '@mio/shared/types';

import { getInstance, IocInfrastructure, IocService } from '../../ioc';
import type { ICacheService } from '../cache/cache.service.types';
import type { ISfxCacheService } from '../cache/sfx-cache.service.types';
import type { IStorageService } from '../storage';
import type { ISoundEffectsProvider } from './soundEffects.provider.types';
import type { IAudioLibraryService } from '../audio-library';
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
    CATEGORY_PROMPT_INFLUENCE,
} from './soundEffects.service.constants';
import { SfxCategory } from './soundEffects.provider.types';

/**
 * Map SfxCategory to SfxLibraryCategory
 */
function mapToLibraryCategory(category: SfxCategory | undefined): SfxLibraryCategory | undefined {
    if (!category) return undefined;

    // The categories are the same, just different module locations
    const mapping: Record<SfxCategory, SfxLibraryCategory> = {
        ambient: 'ambient',
        effects: 'effects',
        transitions: 'transitions',
        foley: 'foley',
        creatures: 'creatures',
        music: 'ambient', // Map music to ambient for library (music has its own table)
    };

    return mapping[category];
}

/**
 * Infer subcategory from text description
 */
function inferSubcategory(text: string, category: SfxLibraryCategory | undefined): string {
    const lowerText = text.toLowerCase();

    if (category === 'ambient') {
        if (/rain|drizzle|shower/i.test(lowerText)) return 'weather';
        if (/wind|breeze|gust/i.test(lowerText)) return 'weather';
        if (/water|stream|river|ocean|wave/i.test(lowerText)) return 'water';
        if (/fire|flame|crackling/i.test(lowerText)) return 'fire';
        return 'atmosphere';
    }

    if (category === 'effects') {
        if (/footstep|step|walk|run/i.test(lowerText)) return 'footsteps';
        if (/door|gate|knock/i.test(lowerText)) return 'doors';
        if (/impact|hit|crash|break/i.test(lowerText)) return 'impacts';
        return 'general';
    }

    if (category === 'transitions') {
        if (/whoosh|swish|swoosh/i.test(lowerText)) return 'whoosh';
        if (/magic|spell|enchant/i.test(lowerText)) return 'magical';
        return 'general';
    }

    if (category === 'foley') {
        if (/cloth|fabric|rustl/i.test(lowerText)) return 'fabric';
        if (/paper|book|page/i.test(lowerText)) return 'paper';
        return 'general';
    }

    if (category === 'creatures') {
        if (/bird|chirp|tweet|squawk/i.test(lowerText)) return 'birds';
        if (/dragon|roar|growl|monster/i.test(lowerText)) return 'fantasy';
        return 'animals';
    }

    return 'general';
}

/**
 * Infer environment from text description
 */
function inferEnvironment(text: string): SfxEnvironment | undefined {
    const lowerText = text.toLowerCase();

    if (/forest|tree|leaf|nature|garden/i.test(lowerText)) return 'nature';
    if (/city|urban|street|traffic/i.test(lowerText)) return 'urban';
    if (/indoor|room|house|kitchen/i.test(lowerText)) return 'indoor';
    if (/outdoor|outside|field/i.test(lowerText)) return 'outdoor';
    if (/magic|fantasy|spell|dragon/i.test(lowerText)) return 'fantasy';

    return undefined;
}

/**
 * Infer intensity from text description
 */
function inferIntensity(text: string): AudioIntensity {
    const lowerText = text.toLowerCase();

    if (/soft|gentle|light|quiet|subtle|faint/i.test(lowerText)) return 'subtle';
    if (/heavy|loud|intense|strong|powerful|violent/i.test(lowerText)) return 'intense';

    return 'medium';
}

/**
 * Sound Effects Service
 *
 * Orchestrates sound effects generation with:
 * - Library-first approach (check persistent library before API)
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
    private libraryHits = 0;
    private libraryMisses = 0;

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
     * Lazily get AudioLibrary service
     */
    private _audioLibrary: IAudioLibraryService | null = null;
    private get audioLibrary(): IAudioLibraryService {
        if (!this._audioLibrary) {
            this._audioLibrary = getInstance<IAudioLibraryService>(IocService.AUDIO_LIBRARY);
        }
        return this._audioLibrary;
    }

    /**
     * Generate a sound effect from text description
     *
     * Uses library-first approach:
     * 1. Check persistent library for matching SFX
     * 2. Check Redis cache for recent generations
     * 3. Generate new SFX via API if not found
     * 4. Store new SFX in library for future reuse
     */
    async generateSfx(input: GenerateSfxInput): Promise<GenerateSfxResult> {
        const { text, category, durationSeconds, promptInfluence } = input;

        // Apply category-based defaults if not explicitly provided
        const effectivePromptInfluence = promptInfluence
            ?? (category ? CATEGORY_PROMPT_INFLUENCE[category] : DEFAULT_PROMPT_INFLUENCE);

        // Infer taxonomy from text
        const libraryCategory = mapToLibraryCategory(category);
        const subcategory = inferSubcategory(text, libraryCategory);
        const environment = inferEnvironment(text);
        const intensity = inferIntensity(text);

        this.logger.debug('Generating sound effect', {
            textLength: text.length,
            textPreview: text.substring(0, 50),
            category,
            libraryCategory,
            subcategory,
            environment,
            intensity,
            durationSeconds,
            promptInfluence: effectivePromptInfluence,
        });

        // =====================================================================
        // Step 1: Check persistent library for matching SFX
        // =====================================================================
        if (libraryCategory) {
            const libraryResult = await this.audioLibrary.findSfx({
                text,
                category: libraryCategory,
                subcategory,
                environment,
                intensity,
            });

            if (libraryResult.sfx) {
                this.logger.info('[LIBRARY HIT] Found SFX in persistent library', {
                    sfxId: libraryResult.sfx.id,
                    canonicalKey: libraryResult.sfx.canonicalKey,
                    fromCache: libraryResult.fromCache,
                });
                this.libraryHits++;

                try {
                    // Download from storage
                    const audio = await this.storage.download(libraryResult.sfx.s3Url);

                    // Increment usage counter (fire and forget)
                    this.audioLibrary.incrementSfxUsage(libraryResult.sfx.id).catch((err) => {
                        this.logger.warn('Failed to increment SFX usage', { error: err.message });
                    });

                    return {
                        audio,
                        durationSeconds: libraryResult.sfx.durationSeconds,
                        format: SFX_AUDIO_FORMAT,
                        fromCache: false,
                        fromLibrary: true,
                        cacheKey: libraryResult.sfx.canonicalKey,
                    };
                } catch (error) {
                    this.logger.warn('[LIBRARY INVALID] Library entry exists but file not found', {
                        sfxId: libraryResult.sfx.id,
                        error: error instanceof Error ? error.message : 'Unknown',
                    });
                    // Fall through to cache/API
                }
            } else {
                this.logger.info('[LIBRARY MISS] No SFX found in persistent library', {
                    text: text.substring(0, 50),
                    category: libraryCategory,
                });
                this.libraryMisses++;
            }
        }

        // =====================================================================
        // Step 2: Check Redis cache for recent generations
        // =====================================================================
        const cacheKeyParams = {
            text,
            outputFormat: DEFAULT_SFX_OUTPUT_FORMAT,
            durationSeconds,
            promptInfluence: effectivePromptInfluence,
        };

        const cacheKey = this.sfxCache.generateCacheKey(cacheKeyParams);

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
                    fromLibrary: false,
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

        // =====================================================================
        // Step 3: Generate new SFX via ElevenLabs API
        // =====================================================================
        await this.waitForRateLimitSlot();

        const result = await this.provider.convert({
            text,
            outputFormat: DEFAULT_SFX_OUTPUT_FORMAT,
            durationSeconds,
            promptInfluence: effectivePromptInfluence,
        });

        // Store in storage
        const storagePath = `sfx/${category ?? 'general'}/${Date.now()}-${Bun.hash(text).toString(36)}.mp3`;
        await this.storage.upload(result.audio, storagePath, {
            contentType: 'audio/mpeg',
        });

        // =====================================================================
        // Step 4: Store in both cache and library for future reuse
        // =====================================================================

        // Store in Redis cache (short-term)
        await this.sfxCache.set(
            cacheKeyParams,
            {
                url: storagePath,
                durationSeconds: result.durationSeconds,
                category,
            }
        );

        // Store in persistent library (long-term)
        if (libraryCategory) {
            try {
                await this.audioLibrary.storeSfx({
                    category: libraryCategory,
                    subcategory,
                    environment,
                    intensity,
                    prompt: text,
                    promptInfluence: effectivePromptInfluence,
                    s3Url: storagePath,
                    durationSeconds: result.durationSeconds,
                    tags: this.extractTags(text),
                });
                this.logger.info('SFX stored in persistent library', {
                    category: libraryCategory,
                    subcategory,
                    storagePath,
                });
            } catch (error) {
                // Don't fail if library storage fails
                this.logger.warn('Failed to store SFX in library', {
                    error: error instanceof Error ? error.message : 'Unknown',
                });
            }
        }

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
            fromLibrary: false,
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
            libraryHits: this.libraryHits,
            libraryMisses: this.libraryMisses,
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
        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            size: 0, // Would need Redis SCAN to count sfx:audio:* keys
        };
    }

    /**
     * Extract tags from text for library search
     */
    private extractTags(text: string): string[] {
        const stopWords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
            'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
            'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not',
            'sound', 'sounds', 'effect', 'effects', 'audio',
        ]);

        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10); // Limit to 10 tags
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
