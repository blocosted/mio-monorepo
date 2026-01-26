/**
 * Ambiance Library Service
 *
 * Manages the persistent Ambiance library for reuse across stories.
 * Handles caching via CacheService.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { CacheService } from '../cache/cache.service';
import type { AmbianceLookupResult, FindAmbianceParams, StoreAmbianceParams, StoredAmbiance } from './ambiance-library.service.types';
import type { AmbianceFilterOptions, AmbianceLibraryStore, AmbiancePaginationOptions, PaginatedAmbianceResult } from './ambiance-library.store';
import { IocService, IocStore } from '../../ioc/ioc.types';

/** Redis cache TTL for ambiance lookups (1 hour) */
const CACHE_TTL_SECONDS = 3600;

/** Cache key prefix */
const CACHE_PREFIX = 'audio-library:ambiance';

/**
 * Ambiance Library Service Implementation
 *
 * Provides a clean interface for managing the persistent Ambiance library.
 * Handles caching and delegates DB operations to AmbianceLibraryStore.
 */
@injectable()
export class AmbianceLibraryService {
  constructor(
    @inject(IocStore.AMBIANCE_LIBRARY_STORE)
    private readonly store: AmbianceLibraryStore,
    @inject(IocService.CACHE)
    private readonly cache: CacheService
  ) {}

  /**
   * Find Ambiance in library (cache-first)
   */
  async findAmbiance(params: FindAmbianceParams): Promise<AmbianceLookupResult> {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cache.get<StoredAmbiance>(cacheKey);

    if (cached) {
      return { ambiance: cached, fromCache: true };
    }

    // Query DB for matching ambiance
    const results = await this.store.query({
      environment: params.environment,
      subEnvironment: params.subEnvironment,
      timeOfDay: params.timeOfDay,
      weather: params.weather,
      mood: params.mood,
      limit: 1
    });

    if (results[0]) {
      // Cache the result
      await this.cache.set(cacheKey, results[0], { ex: CACHE_TTL_SECONDS });
      return { ambiance: results[0], fromCache: false };
    }

    return { ambiance: null, fromCache: false };
  }

  /**
   * Store new Ambiance in library
   */
  async storeAmbiance(params: StoreAmbianceParams): Promise<StoredAmbiance> {
    return this.store.insert(params);
  }

  /**
   * Increment Ambiance usage counter
   */
  async incrementAmbianceUsage(id: string): Promise<void> {
    await this.store.incrementUsage(id);
  }

  /**
   * Build cache key for Ambiance lookup
   */
  private buildCacheKey(params: FindAmbianceParams): string {
    const parts = [
      CACHE_PREFIX,
      params.environment ?? 'any',
      params.subEnvironment ?? 'any',
      params.timeOfDay ?? 'any',
      params.weather ?? 'any',
      params.mood ?? 'any',
      Bun.hash(params.description).toString(36)
    ];
    return parts.join(':');
  }

  /**
   * Find ambiance with cursor-based pagination (delegates to store)
   */
  async findPaginated(filters: AmbianceFilterOptions, pagination: AmbiancePaginationOptions): Promise<PaginatedAmbianceResult> {
    return this.store.findPaginated(filters, pagination);
  }
}
