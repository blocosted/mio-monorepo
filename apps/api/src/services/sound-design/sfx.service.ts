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

import { inject, injectable } from 'inversify';
import pLimit from 'p-limit';

import type { AudioIntensity, SfxEnvironment, SfxLibraryCategory } from '@mio/shared/types';
import { AppError, ErrorCodes } from '@mio/shared';

import type { ISoundEffectsRepository, SfxCategory } from '../../repositories/audio/audio-repository.types';
import type { ICacheService } from '../cache/cache.service.types';
import type { SfxStore } from './sfx.service.store';
import type { BatchGenerateSfxInput, BatchGenerateSfxResult, GenerateSfxInput, GenerateSfxResult, ISfxService } from './sfx.service.types';
import { IocRepository, IocService, IocStore } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';
import { AbstractService } from '../service.abstract';
import {
  CATEGORY_PROMPT_INFLUENCE,
  DEFAULT_PROMPT_INFLUENCE,
  DEFAULT_SFX_OUTPUT_FORMAT,
  SFX_AUDIO_FORMAT,
  SFX_CONCURRENCY_CONFIG,
  SFX_RATE_LIMIT_CONFIG
} from './sfx.service.constants';

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
    music: 'ambient' // Map music to ambient for library (music has its own table)
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
export class SfxService extends AbstractService implements ISfxService {
  private readonly localLimit: ReturnType<typeof pLimit>;
  private cacheHits = 0;
  private cacheMisses = 0;
  private libraryHits = 0;
  private libraryMisses = 0;

  constructor(
    @inject(IocStore.SOUND_EFFECTS_STORE) private readonly sfxStore: SfxStore,
    @inject(IocService.CACHE) private readonly cache: ICacheService
  ) {
    super();
    this.localLimit = pLimit(SFX_CONCURRENCY_CONFIG.maxLocalConcurrency);
  }

  /**
   * Lazily create SoundEffects repository to avoid initialization issues
   */
  private _repository: ISoundEffectsRepository | null = null;
  private get repository(): ISoundEffectsRepository {
    if (!this._repository) {
      this._repository = getInstance<ISoundEffectsRepository>(IocRepository.AUDIO);
    }
    return this._repository;
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
    const effectivePromptInfluence = promptInfluence ?? (category ? CATEGORY_PROMPT_INFLUENCE[category] : DEFAULT_PROMPT_INFLUENCE);

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
      promptInfluence: effectivePromptInfluence
    });

    // =====================================================================
    // Step 1: Check persistent library for matching SFX via store
    // =====================================================================
    const librarySfx = await this.sfxStore.getLibrarySfx({
      text,
      category: libraryCategory,
      subcategory,
      environment,
      intensity
    });

    if (librarySfx) {
      this.logger.info('[LIBRARY HIT] Found SFX in persistent library', {
        sfxId: librarySfx.sfxId,
        canonicalKey: librarySfx.canonicalKey
      });
      this.libraryHits++;

      return {
        audio: librarySfx.audio,
        durationSeconds: librarySfx.durationSeconds,
        format: SFX_AUDIO_FORMAT,
        url: librarySfx.url,
        fromCache: false,
        fromLibrary: true,
        cacheKey: librarySfx.canonicalKey
      };
    }

    this.logger.info('[LIBRARY MISS] No SFX found in persistent library', {
      text: text.substring(0, 50),
      category: libraryCategory
    });
    this.libraryMisses++;

    // =====================================================================
    // Step 2: Check Redis cache for recent generations via store
    // =====================================================================
    const cacheKeyParams = {
      text,
      outputFormat: DEFAULT_SFX_OUTPUT_FORMAT,
      durationSeconds,
      promptInfluence: effectivePromptInfluence
    };

    const cacheKey = this.sfxStore.generateCacheKey(cacheKeyParams);

    const cachedSfx = await this.sfxStore.getCachedSfx(cacheKeyParams);
    if (cachedSfx) {
      this.logger.info('[SFX CACHE HIT] Found cached SFX', {
        cacheKey,
        cachedUrl: cachedSfx.url
      });
      this.cacheHits++;

      return {
        audio: cachedSfx.audio,
        durationSeconds: cachedSfx.durationSeconds,
        format: SFX_AUDIO_FORMAT,
        url: cachedSfx.url,
        fromCache: true,
        fromLibrary: false,
        cacheKey
      };
    }

    this.logger.info('[SFX CACHE MISS] No cached SFX found, will call API', {
      cacheKey
    });
    this.cacheMisses++;

    // =====================================================================
    // Step 3: Generate new SFX via ElevenLabs API
    // =====================================================================
    await this.waitForRateLimitSlot();

    const result = await this.repository.createSoundEffect({
      text,
      outputFormat: DEFAULT_SFX_OUTPUT_FORMAT,
      durationSeconds,
      promptInfluence: effectivePromptInfluence
    });

    // =====================================================================
    // Step 4: Persist to storage, cache, and library via store
    // =====================================================================
    const { url: storagePath } = await this.sfxStore.persistSfx(cacheKeyParams, {
      audio: result.audio,
      durationSeconds: result.durationSeconds,
      text,
      category,
      libraryCategory,
      subcategory,
      environment,
      intensity,
      promptInfluence: effectivePromptInfluence,
      tags: this.extractTags(text)
    });

    this.logger.info('Sound effect generated and persisted', {
      textPreview: text.substring(0, 50),
      durationSeconds: result.durationSeconds,
      category,
      storagePath
    });

    return {
      audio: result.audio,
      durationSeconds: result.durationSeconds,
      format: SFX_AUDIO_FORMAT,
      url: storagePath,
      fromCache: false,
      fromLibrary: false,
      cacheKey
    };
  }

  /**
   * Generate multiple sound effects with controlled concurrency
   */
  async generateBatch(input: BatchGenerateSfxInput): Promise<BatchGenerateSfxResult> {
    const { segments } = input;

    this.logger.info('Starting batch SFX generation', { segmentCount: segments.length });

    const results = await Promise.allSettled(
      segments.map((segment) =>
        this.localLimit(async () => {
          const result = await this.generateSfx({
            text: segment.text,
            category: segment.category,
            durationSeconds: segment.durationSeconds,
            promptInfluence: segment.promptInfluence
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

    this.logger.info('Batch SFX generation complete', {
      segmentCount: segments.length,
      successCount,
      failureCount,
      totalDurationSeconds,
      libraryHits: this.libraryHits,
      libraryMisses: this.libraryMisses
    });

    return {
      results: processedResults,
      successCount,
      failureCount,
      totalDurationSeconds
    };
  }

  /**
   * Get cache statistics for sound effects
   */
  async getCacheStats(): Promise<{ hits: number; misses: number; size: number }> {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: 0 // Would need Redis SCAN to count sfx:audio:* keys
    };
  }

  /**
   * Extract tags from text for library search
   */
  private extractTags(text: string): string[] {
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'and',
      'but',
      'or',
      'nor',
      'so',
      'yet',
      'both',
      'either',
      'neither',
      'not',
      'sound',
      'sounds',
      'effect',
      'effects',
      'audio'
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
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
        max: SFX_RATE_LIMIT_CONFIG.maxRequestsPerMinute
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
      name: 'SFXRateLimitExceeded'
    });
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
