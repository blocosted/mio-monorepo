/**
 * Audio Library Store (Repository Pattern)
 *
 * Encapsulates all database operations for audio library tables.
 * This is a wrapper around the existing store functions to provide
 * a consistent Store pattern across the application.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocConnection, IocService } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { ICacheService } from '../cache/cache.service.types';
import type {
    StoredSfx,
    StoredAmbiance,
    StoredMusic,
    StoreSfxParams,
    StoreAmbianceParams,
    StoreMusicParams,
    FindSfxParams,
    FindAmbianceParams,
    FindMusicParams,
    SfxLookupResult,
    AmbianceLookupResult,
    MusicLookupResult,
    AudioLibraryStats,
} from './audio-library.service.types';
import {
    querySfx,
    queryAmbiance,
    queryMusic,
    insertSfx,
    insertAmbiance,
    insertMusic,
    incrementSfxUsageById,
    incrementAmbianceUsageById,
    incrementMusicUsageById,
    getSfxStats,
    getAmbianceStats,
    getMusicStats,
    type SfxQueryParams,
    type AmbianceQueryParams,
    type MusicQueryParams,
} from './audio-library.service.store';

/** Redis cache TTL for library lookups (1 hour) */
const CACHE_TTL_SECONDS = 3600;

/** Cache key prefixes */
const CACHE_PREFIX = {
    SFX: 'audio-library:sfx',
    AMBIANCE: 'audio-library:ambiance',
    MUSIC: 'audio-library:music',
} as const;

/**
 * AudioLibraryStore - Repository for audio library persistence
 *
 * Handles all database and cache operations for SFX, Ambiance, and Music libraries.
 */
@injectable()
export class AudioLibraryStore {
    constructor(
        @inject(IocConnection.DATABASE) private readonly db: DatabaseConnection,
        @inject(IocService.CACHE) private readonly cache: ICacheService,
    ) {}

    // =========================================================================
    // SFX Operations
    // =========================================================================

    async findSfxWithCache(params: FindSfxParams): Promise<SfxLookupResult> {
        // Build cache key
        const cacheKey = this.buildSfxCacheKey(params);

        // Check cache first
        const cached = await this.cache.get<StoredSfx>(cacheKey);
        if (cached) {
            return { sfx: cached, fromCache: true };
        }

        return { sfx: null, fromCache: false };
    }

    async querySfx(params: SfxQueryParams): Promise<StoredSfx[]> {
        return querySfx(this.db, params);
    }

    async cacheSfx(params: FindSfxParams, sfx: StoredSfx): Promise<void> {
        const cacheKey = this.buildSfxCacheKey(params);
        await this.cache.set(cacheKey, sfx, { ex: CACHE_TTL_SECONDS });
    }

    async insertSfx(params: StoreSfxParams): Promise<StoredSfx> {
        return insertSfx(this.db, params);
    }

    async incrementSfxUsage(id: string): Promise<void> {
        return incrementSfxUsageById(this.db, id);
    }

    // =========================================================================
    // Ambiance Operations
    // =========================================================================

    async findAmbianceWithCache(params: FindAmbianceParams): Promise<AmbianceLookupResult> {
        // Build cache key
        const cacheKey = this.buildAmbianceCacheKey(params);

        // Check cache first
        const cached = await this.cache.get<StoredAmbiance>(cacheKey);
        if (cached) {
            return { ambiance: cached, fromCache: true };
        }

        return { ambiance: null, fromCache: false };
    }

    async queryAmbiance(params: AmbianceQueryParams): Promise<StoredAmbiance[]> {
        return queryAmbiance(this.db, params);
    }

    async cacheAmbiance(params: FindAmbianceParams, ambiance: StoredAmbiance): Promise<void> {
        const cacheKey = this.buildAmbianceCacheKey(params);
        await this.cache.set(cacheKey, ambiance, { ex: CACHE_TTL_SECONDS });
    }

    async insertAmbiance(params: StoreAmbianceParams): Promise<StoredAmbiance> {
        return insertAmbiance(this.db, params);
    }

    async incrementAmbianceUsage(id: string): Promise<void> {
        return incrementAmbianceUsageById(this.db, id);
    }

    // =========================================================================
    // Music Operations
    // =========================================================================

    async findMusicWithCache(params: FindMusicParams): Promise<MusicLookupResult> {
        // Build cache key
        const cacheKey = this.buildMusicCacheKey(params);

        // Check cache first
        const cached = await this.cache.get<StoredMusic>(cacheKey);
        if (cached) {
            return { music: cached, fromCache: true };
        }

        return { music: null, fromCache: false };
    }

    async queryMusic(params: MusicQueryParams): Promise<StoredMusic[]> {
        return queryMusic(this.db, params);
    }

    async cacheMusic(params: FindMusicParams, music: StoredMusic): Promise<void> {
        const cacheKey = this.buildMusicCacheKey(params);
        await this.cache.set(cacheKey, music, { ex: CACHE_TTL_SECONDS });
    }

    async insertMusic(params: StoreMusicParams): Promise<StoredMusic> {
        return insertMusic(this.db, params);
    }

    async incrementMusicUsage(id: string): Promise<void> {
        return incrementMusicUsageById(this.db, id);
    }

    // =========================================================================
    // Stats
    // =========================================================================

    async getStats(): Promise<AudioLibraryStats> {
        const [sfxStats, ambianceStats, musicStats] = await Promise.all([
            getSfxStats(this.db),
            getAmbianceStats(this.db),
            getMusicStats(this.db),
        ]);

        return {
            sfx: {
                total: sfxStats.total,
                byCategory: sfxStats.byCategory,
                byEnvironment: sfxStats.byEnvironment,
            },
            ambiance: {
                total: ambianceStats.total,
                byEnvironment: ambianceStats.byEnvironment,
                byMood: ambianceStats.byMood,
            },
            music: {
                total: musicStats.total,
                byMood: musicStats.byMood,
                byIntensity: musicStats.byIntensity,
            },
            topUsed: {
                sfx: sfxStats.topUsed,
                ambiance: ambianceStats.topUsed,
                music: musicStats.topUsed,
            },
        };
    }

    // =========================================================================
    // Cache Key Builders
    // =========================================================================

    private buildSfxCacheKey(params: FindSfxParams): string {
        const parts = [
            CACHE_PREFIX.SFX,
            params.category ?? 'any',
            params.subcategory ?? 'any',
            params.environment ?? 'any',
            params.intensity ?? 'any',
            Bun.hash(params.text).toString(36),
        ];
        return parts.join(':');
    }

    private buildAmbianceCacheKey(params: FindAmbianceParams): string {
        const parts = [
            CACHE_PREFIX.AMBIANCE,
            params.environment ?? 'any',
            params.subEnvironment ?? 'any',
            params.timeOfDay ?? 'any',
            params.weather ?? 'any',
            params.mood ?? 'any',
            Bun.hash(params.description).toString(36),
        ];
        return parts.join(':');
    }

    private buildMusicCacheKey(params: FindMusicParams): string {
        const parts = [
            CACHE_PREFIX.MUSIC,
            params.mood,
            params.intensity ?? 'any',
            params.tempo ?? 'any',
        ];
        return parts.join(':');
    }
}
