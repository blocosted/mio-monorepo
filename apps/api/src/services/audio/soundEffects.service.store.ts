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
import { injectable, inject } from 'inversify';

import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AudioIntensity,
} from '@mio/shared/types';

import { IocConnection, IocService } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { RedisClient } from '@mio/shared/server/connections/redis';
import type { ISfxCacheService } from '../cache/sfx-cache.service.types';
import type { IStorageService } from '../storage';
import type { IAudioLibraryService } from '../audio-library';
import type { SfxCacheKey } from '../cache/sfx-cache.service.types';
import type { SfxCategory } from './soundEffects.provider.types';

/**
 * Cached SFX metadata with full details
 */
export interface CachedSfxMetadata {
    audio: Blob;
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
    audio: Blob;
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
 * SoundEffectsStore - Repository for SFX persistence
 *
 * Isolates all library, cache, and storage operations from business logic.
 * Implements a library-first approach:
 * 1. Check persistent library (PostgreSQL)
 * 2. Check Redis cache (short-term)
 * 3. Persist new SFX to both library and cache
 */
@injectable()
export class SoundEffectsStore {
    constructor(
        @inject(IocConnection.DATABASE) protected readonly db: DatabaseConnection,
        @inject(IocConnection.REDIS) protected readonly redis: RedisClient,
        @inject(IocService.SFX_CACHE) private readonly sfxCache: ISfxCacheService,
        @inject(IocService.STORAGE) private readonly storage: IStorageService,
        @inject(IocService.AUDIO_LIBRARY) private readonly audioLibrary: IAudioLibraryService,
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

        const libraryResult = await this.audioLibrary.findSfx(params);

        if (!libraryResult.sfx) {
            return null;
        }

        try {
            // Download from storage
            const audio = await this.storage.download(libraryResult.sfx.s3Url);

            // Increment usage counter (fire and forget)
            this.audioLibrary.incrementSfxUsage(libraryResult.sfx.id).catch(() => {
                // Ignore increment errors
            });

            return {
                audio,
                durationSeconds: libraryResult.sfx.durationSeconds,
                url: libraryResult.sfx.s3Url,
                fromLibrary: true,
                sfxId: libraryResult.sfx.id,
                canonicalKey: libraryResult.sfx.canonicalKey,
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
    async getCachedSfx(cacheParams: SfxCacheKey): Promise<CachedSfxMetadata | null> {
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
                fromLibrary: false,
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
    async persistSfx(
        cacheParams: SfxCacheKey,
        persistParams: PersistSfxParams
    ): Promise<{ url: string }> {
        // Generate storage path
        const storagePath = `sfx/${persistParams.category ?? 'general'}/${Date.now()}-${Bun.hash(persistParams.text).toString(36)}.mp3`;

        // Upload to storage
        await this.storage.upload(persistParams.audio, storagePath, {
            contentType: 'audio/mpeg',
        });

        // Store in Redis cache (short-term)
        await this.sfxCache.set(cacheParams, {
            url: storagePath,
            durationSeconds: persistParams.durationSeconds,
            category: persistParams.category,
        });

        // Store in persistent library (long-term)
        if (persistParams.libraryCategory) {
            try {
                await this.audioLibrary.storeSfx({
                    category: persistParams.libraryCategory,
                    subcategory: persistParams.subcategory,
                    environment: persistParams.environment,
                    intensity: persistParams.intensity,
                    prompt: persistParams.text,
                    promptInfluence: persistParams.promptInfluence,
                    s3Url: storagePath,
                    durationSeconds: persistParams.durationSeconds,
                    tags: persistParams.tags ?? [],
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
    generateCacheKey(cacheParams: SfxCacheKey): string {
        return this.sfxCache.generateCacheKey(cacheParams);
    }
}
