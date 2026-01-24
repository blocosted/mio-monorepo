/**
 * SFX Library Service
 *
 * Manages the persistent SFX library for reuse across stories.
 * Handles caching via CacheService.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { CacheService } from '../cache/cache.service';
import type { FindSfxParams, SfxLookupResult, StoredSfx, StoreSfxParams } from './sfx-library.service.types';
import type { SfxLibraryStore } from './sfx-library.store';
import { IocService, IocStore } from '../../ioc/ioc.types';

/** Redis cache TTL for SFX lookups (1 hour) */
const CACHE_TTL_SECONDS = 3600;

/** Cache key prefix */
const CACHE_PREFIX = 'audio-library:sfx';

/**
 * SFX Library Service Implementation
 *
 * Provides a clean interface for managing the persistent SFX library.
 * Handles caching and delegates DB operations to SfxLibraryStore.
 */
@injectable()
export class SfxLibraryService {
  constructor(
    @inject(IocStore.SFX_LIBRARY_STORE)
    private readonly store: SfxLibraryStore,
    @inject(IocService.CACHE)
    private readonly cache: CacheService
  ) {}

  /**
   * Find SFX in library (cache-first)
   */
  async findSfx(params: FindSfxParams): Promise<SfxLookupResult> {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cache.get<StoredSfx>(cacheKey);

    if (cached) {
      return { sfx: cached, fromCache: true };
    }

    // Query DB for matching SFX
    const results = await this.store.query({
      category: params.category,
      subcategory: params.subcategory,
      environment: params.environment,
      intensity: params.intensity,
      limit: 1
    });

    if (results[0]) {
      // Cache the result
      await this.cache.set(cacheKey, results[0], { ex: CACHE_TTL_SECONDS });
      return { sfx: results[0], fromCache: false };
    }

    return { sfx: null, fromCache: false };
  }

  /**
   * Store new SFX in library
   */
  async storeSfx(params: StoreSfxParams): Promise<StoredSfx> {
    return this.store.insert(params);
  }

  /**
   * Increment SFX usage counter
   */
  async incrementSfxUsage(id: string): Promise<void> {
    await this.store.incrementUsage(id);
  }

  /**
   * Build cache key for SFX lookup
   */
  private buildCacheKey(params: FindSfxParams): string {
    const parts = [
      CACHE_PREFIX,
      params.category ?? 'any',
      params.subcategory ?? 'any',
      params.environment ?? 'any',
      params.intensity ?? 'any',
      Bun.hash(params.text).toString(36)
    ];
    return parts.join(':');
  }
}
