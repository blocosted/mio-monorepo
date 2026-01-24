/**
 * Sound Effects Service Store
 *
 * Handles all persistence operations for SoundEffects service:
 * - Library lookups (persistent SFX database)
 * - Redis cache lookups (short-term)
 * - Storage uploads/downloads
 * - Cache and library writes
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { RedisClient } from '@mio/shared/server/connections/redis';
import type { AudioIntensity, SfxEnvironment, SfxLibraryCategory } from '@mio/shared/types';

import type { SfxCategory } from '../../repositories/audio/audio-repository.types';
import type { SfxCacheKeyParams } from '../cache/sfx-cache.service.types';
import type { SfxCacheService } from '../cache/sfx-cache.service';
import type { StorageService } from '../storage';
import type { SfxLibraryService } from './sfx-library.service';
import { IocConnection, IocService } from '../../ioc/ioc.types';

/**
 * Cached SFX metadata with full details
 */
export interface CachedSfxMetadata {
  audio: Buffer;
  durationSeconds: number;
  url: string;
  category?: SfxCategory;
  fromLibrary: boolean;
  sfxId?: string;
  canonicalKey?: string;
}

/**
 * Library search parameters
 */
export interface LibrarySearchParams {
  text: string;
  category?: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
}

/**
 * Persistence parameters for new SFX
 */
export interface PersistSfxParams {
  audio: Buffer;
  durationSeconds: number;
  text: string;
  category?: SfxCategory;
  libraryCategory?: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
  promptInfluence?: number;
  tags?: string[];
}

/**
 * SfxStore - Repository for SFX persistence
 *
 * Isolates all library, cache, and storage operations from business logic.
 * Implements a library-first approach:
 * 1. Check persistent library (PostgreSQL)
 * 2. Check Redis cache (short-term)
 * 3. Persist new SFX to both library and cache
 */
@injectable()
export class SfxStore {
  constructor(
    @inject(IocConnection.DATABASE) protected readonly db: DatabaseConnection,
    @inject(IocConnection.REDIS) protected readonly redis: RedisClient,
    @inject(IocService.SFX_CACHE) private readonly sfxCache: SfxCacheService,
    @inject(IocService.STORAGE) private readonly storage: StorageService,
    @inject(IocService.SFX_LIBRARY) private readonly sfxLibrary: SfxLibraryService
  ) {}

  /**
   * Search for SFX in persistent library
   *
   * @returns Cached SFX from library with audio blob, or null if not found
   */
  async getLibrarySfx(params: LibrarySearchParams): Promise<CachedSfxMetadata | null> {
    if (!params.category) {
      return null;
    }

    const libraryResult = await this.sfxLibrary.findSfx(params);

    if (!libraryResult.sfx) {
      return null;
    }

    try {
      // Download from storage
      const audio = await this.storage.download(libraryResult.sfx.s3Url);

      // Increment usage counter (fire and forget)
      this.sfxLibrary.incrementSfxUsage(libraryResult.sfx.id).catch(() => {
        // Ignore increment errors
      });

      return {
        audio,
        durationSeconds: libraryResult.sfx.durationSeconds,
        url: libraryResult.sfx.s3Url,
        fromLibrary: true,
        sfxId: libraryResult.sfx.id,
        canonicalKey: libraryResult.sfx.canonicalKey
      };
    } catch {
      // Library entry exists but file not found in storage
      return null;
    }
  }

  /**
   * Get cached SFX from Redis cache and storage
   *
   * @returns Cached SFX with audio blob, or null if not found
   */
  async getCachedSfx(cacheParams: SfxCacheKeyParams): Promise<CachedSfxMetadata | null> {
    // Check cache metadata
    const cached = await this.sfxCache.get(cacheParams);
    if (!cached) {
      return null;
    }

    try {
      // Download audio from storage
      const audio = await this.storage.download(cached.url);

      // Increment usage counter
      await this.sfxCache.incrementUsage(cacheParams);

      return {
        audio,
        durationSeconds: cached.durationSeconds,
        url: cached.url,
        category: cached.category,
        fromLibrary: false
      };
    } catch {
      // Cache entry exists but file not found in storage
      return null;
    }
  }

  /**
   * Persist generated SFX to storage, cache, and library
   *
   * @param cacheParams - Cache key parameters
   * @param persistParams - Full persistence parameters
   * @returns Storage URL of persisted audio
   */
  async persistSfx(cacheParams: SfxCacheKeyParams, persistParams: PersistSfxParams): Promise<{ url: string }> {
    // Generate storage path
    const storagePath = `sfx/${persistParams.category ?? 'general'}/${Date.now()}-${Bun.hash(persistParams.text).toString(36)}.mp3`;

    // Upload to storage
    await this.storage.upload(persistParams.audio, storagePath, {
      contentType: 'audio/mpeg'
    });

    // Store in Redis cache (short-term)
    await this.sfxCache.set(cacheParams, {
      url: storagePath,
      durationSeconds: persistParams.durationSeconds,
      category: persistParams.category
    });

    // Store in persistent library (long-term)
    if (persistParams.libraryCategory) {
      try {
        // Generate canonical key
        const canonicalParts = [
          'sfx',
          persistParams.libraryCategory,
          persistParams.subcategory ?? 'general',
          persistParams.environment ?? 'any',
          persistParams.intensity ?? 'any',
          Bun.hash(persistParams.text).toString(36)
        ];
        const canonicalKey = canonicalParts.join(':');

        await this.sfxLibrary.storeSfx({
          canonicalKey,
          category: persistParams.libraryCategory,
          subcategory: persistParams.subcategory ?? 'general',
          environment: persistParams.environment,
          intensity: persistParams.intensity,
          prompt: persistParams.text,
          promptInfluence: persistParams.promptInfluence ?? 0.3,
          s3Url: storagePath,
          durationSeconds: persistParams.durationSeconds,
          format: 'mp3',
          tags: persistParams.tags ?? []
        });
      } catch {
        // Don't fail if library storage fails
        // SFX is already in cache and storage
      }
    }

    return { url: storagePath };
  }

  /**
   * Generate cache key for logging/debugging
   */
  generateCacheKey(cacheParams: SfxCacheKeyParams): string {
    return this.sfxCache.generateCacheKey(cacheParams);
  }
}
