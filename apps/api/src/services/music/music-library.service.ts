/**
 * Music Library Service
 *
 * Manages the persistent Music library for reuse across stories.
 * Handles caching via CacheService.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { CacheService } from '../cache/cache.service';
import type { FindMusicParams, MusicLookupResult, StoredMusic, StoreMusicParams } from './music-library.service.types';
import type { MusicLibraryStore } from './music-library.store';
import { IocService, IocStore } from '../../ioc/ioc.types';

/** Redis cache TTL for music lookups (1 hour) */
const CACHE_TTL_SECONDS = 3600;

/** Cache key prefix */
const CACHE_PREFIX = 'audio-library:music';

/**
 * Music Library Service Implementation
 *
 * Provides a clean interface for managing the persistent Music library.
 * Handles caching and delegates DB operations to MusicLibraryStore.
 */
@injectable()
export class MusicLibraryService {
  constructor(
    @inject(IocStore.MUSIC_LIBRARY_STORE)
    private readonly store: MusicLibraryStore,
    @inject(IocService.CACHE)
    private readonly cache: CacheService
  ) {}

  /**
   * Find Music in library (cache-first)
   */
  async findMusic(params: FindMusicParams): Promise<MusicLookupResult> {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cache.get<StoredMusic>(cacheKey);

    if (cached) {
      return { music: cached, fromCache: true };
    }

    // Query DB for matching music
    const results = await this.store.query({
      mood: params.mood,
      intensity: params.intensity,
      tempo: params.tempo,
      limit: 1
    });

    if (results[0]) {
      // Cache the result
      await this.cache.set(cacheKey, results[0], { ex: CACHE_TTL_SECONDS });
      return { music: results[0], fromCache: false };
    }

    return { music: null, fromCache: false };
  }

  /**
   * Store new Music in library
   */
  async storeMusic(params: StoreMusicParams): Promise<StoredMusic> {
    return this.store.insert(params);
  }

  /**
   * Increment Music usage counter
   */
  async incrementMusicUsage(id: string): Promise<void> {
    await this.store.incrementUsage(id);
  }

  /**
   * Build cache key for Music lookup
   */
  private buildCacheKey(params: FindMusicParams): string {
    const parts = [CACHE_PREFIX, params.mood, params.intensity ?? 'any', params.tempo ?? 'any'];
    return parts.join(':');
  }
}
