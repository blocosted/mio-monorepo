/**
 * Audio Library Service Implementation
 *
 * Manages persistent audio libraries for SFX, Ambiance, and Music.
 * Uses a library-first approach: check library before generating new assets.
 *
 * Features:
 * - Semantic lookup by taxonomy (category, environment, mood, etc.)
 * - Redis caching for fast lookups (TTL 1h)
 * - Random selection from top results for variety
 * - Usage tracking for popular assets
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocStore } from '../../ioc';
import { AbstractService } from '../service.abstract';
import type {
    IAudioLibraryService,
    FindSfxParams,
    FindAmbianceParams,
    FindMusicParams,
    StoreSfxParams,
    StoreAmbianceParams,
    StoreMusicParams,
    StoredSfx,
    StoredAmbiance,
    StoredMusic,
    SfxLookupResult,
    AmbianceLookupResult,
    MusicLookupResult,
    AudioLibraryStats,
} from './audio-library.service.types';
import type { AudioLibraryStore } from './audio-library.store';
import {
    extractKeywords,
    inferSfxCategory,
    inferSfxEnvironment,
    inferAmbianceEnvironment,
    inferTimeOfDay,
    inferWeather,
    inferMood,
    selectRandom,
} from './audio-library.service.helpers';

/**
 * Audio Library Service
 */
@injectable()
export class AudioLibraryService extends AbstractService implements IAudioLibraryService {
    constructor(
        @inject(IocStore.AUDIO_LIBRARY_STORE)
        private readonly libraryStore: AudioLibraryStore,
    ) {
        super();
    }

    // =========================================================================
    // SFX Operations
    // =========================================================================

    async findSfx(params: FindSfxParams): Promise<SfxLookupResult> {
        const { text, limit = 5 } = params;

        // Check cache first via store
        const cachedResult = await this.libraryStore.findSfxWithCache(params);
        if (cachedResult.sfx) {
            this.logger.info('[LIBRARY HIT] SFX found in cache', {
                sfxId: cachedResult.sfx.id,
            });
            return cachedResult;
        }

        // Infer taxonomy from text if not provided
        const category = params.category ?? inferSfxCategory(text);
        const environment = params.environment ?? inferSfxEnvironment(text);
        const keywords = extractKeywords(text);

        this.logger.debug('Finding SFX in library', {
            text: text.substring(0, 50),
            category,
            environment,
            keywords: keywords.slice(0, 5),
        });

        // Query database via store
        const results = await this.libraryStore.querySfx({
            category,
            subcategory: params.subcategory,
            environment,
            intensity: params.intensity,
            tags: keywords,
            limit,
        });

        if (results.length === 0) {
            this.logger.info('[LIBRARY MISS] No SFX found', {
                text: text.substring(0, 50),
                category,
            });
            return { sfx: null, fromCache: false };
        }

        // Select random from top results for variety
        const selected = selectRandom(results);
        if (!selected) {
            return { sfx: null, fromCache: false };
        }

        // Cache the result via store
        await this.libraryStore.cacheSfx(params, selected);

        this.logger.info('[LIBRARY HIT] SFX found in database', {
            sfxId: selected.id,
            canonicalKey: selected.canonicalKey,
            category: selected.category,
        });

        return { sfx: selected, fromCache: false };
    }

    async storeSfx(params: StoreSfxParams): Promise<StoredSfx> {
        this.logger.info('Storing new SFX in library', {
            category: params.category,
            subcategory: params.subcategory,
            environment: params.environment,
        });

        const sfx = await this.libraryStore.insertSfx(params);

        this.logger.info('SFX stored in library', {
            sfxId: sfx.id,
            canonicalKey: sfx.canonicalKey,
        });

        return sfx;
    }

    async incrementSfxUsage(id: string): Promise<void> {
        await this.libraryStore.incrementSfxUsage(id);
    }

    // =========================================================================
    // Ambiance Operations
    // =========================================================================

    async findAmbiance(params: FindAmbianceParams): Promise<AmbianceLookupResult> {
        const { description, limit = 5 } = params;

        // Check cache first via store
        const cachedResult = await this.libraryStore.findAmbianceWithCache(params);
        if (cachedResult.ambiance) {
            this.logger.info('[LIBRARY HIT] Ambiance found in cache', {
                ambianceId: cachedResult.ambiance.id,
            });
            return cachedResult;
        }

        // Infer taxonomy from description if not provided
        const environment = params.environment ?? inferAmbianceEnvironment(description);
        const timeOfDay = params.timeOfDay ?? inferTimeOfDay(description);
        const weather = params.weather ?? inferWeather(description);
        const mood = params.mood ?? inferMood(description);
        const keywords = extractKeywords(description);

        this.logger.debug('Finding Ambiance in library', {
            description: description.substring(0, 50),
            environment,
            timeOfDay,
            weather,
            mood,
        });

        // Need at least environment to search
        if (!environment) {
            this.logger.info('[LIBRARY MISS] Could not infer environment', {
                description: description.substring(0, 50),
            });
            return { ambiance: null, fromCache: false };
        }

        // Query database via store
        const results = await this.libraryStore.queryAmbiance({
            environment,
            subEnvironment: params.subEnvironment,
            timeOfDay,
            weather,
            mood,
            tags: keywords,
            limit,
        });

        if (results.length === 0) {
            this.logger.info('[LIBRARY MISS] No Ambiance found', {
                description: description.substring(0, 50),
                environment,
            });
            return { ambiance: null, fromCache: false };
        }

        // Select random from top results
        const selected = selectRandom(results);
        if (!selected) {
            return { ambiance: null, fromCache: false };
        }

        // Cache the result via store
        await this.libraryStore.cacheAmbiance(params, selected);

        this.logger.info('[LIBRARY HIT] Ambiance found in database', {
            ambianceId: selected.id,
            canonicalKey: selected.canonicalKey,
            environment: selected.environment,
        });

        return { ambiance: selected, fromCache: false };
    }

    async storeAmbiance(params: StoreAmbianceParams): Promise<StoredAmbiance> {
        this.logger.info('Storing new Ambiance in library', {
            environment: params.environment,
            timeOfDay: params.timeOfDay,
            weather: params.weather,
            mood: params.mood,
        });

        const ambiance = await this.libraryStore.insertAmbiance(params);

        this.logger.info('Ambiance stored in library', {
            ambianceId: ambiance.id,
            canonicalKey: ambiance.canonicalKey,
        });

        return ambiance;
    }

    async incrementAmbianceUsage(id: string): Promise<void> {
        await this.libraryStore.incrementAmbianceUsage(id);
    }

    // =========================================================================
    // Music Operations
    // =========================================================================

    async findMusic(params: FindMusicParams): Promise<MusicLookupResult> {
        const { mood, limit = 5 } = params;

        // Check cache first via store
        const cachedResult = await this.libraryStore.findMusicWithCache(params);
        if (cachedResult.music) {
            this.logger.info('[LIBRARY HIT] Music found in cache', {
                musicId: cachedResult.music.id,
            });
            return cachedResult;
        }

        this.logger.debug('Finding Music in library', {
            mood,
            intensity: params.intensity,
            tempo: params.tempo,
        });

        // Query database via store
        const results = await this.libraryStore.queryMusic({
            mood,
            intensity: params.intensity,
            tempo: params.tempo,
            tags: params.tags,
            limit,
        });

        if (results.length === 0) {
            this.logger.info('[LIBRARY MISS] No Music found', { mood });
            return { music: null, fromCache: false };
        }

        // Select random from top results
        const selected = selectRandom(results);
        if (!selected) {
            return { music: null, fromCache: false };
        }

        // Cache the result via store
        await this.libraryStore.cacheMusic(params, selected);

        this.logger.info('[LIBRARY HIT] Music found in database', {
            musicId: selected.id,
            canonicalKey: selected.canonicalKey,
            mood: selected.mood,
        });

        return { music: selected, fromCache: false };
    }

    async storeMusic(params: StoreMusicParams): Promise<StoredMusic> {
        this.logger.info('Storing new Music in library', {
            mood: params.mood,
            intensity: params.intensity,
            tempo: params.tempo,
            variationIndex: params.variationIndex,
        });

        const music = await this.libraryStore.insertMusic(params);

        this.logger.info('Music stored in library', {
            musicId: music.id,
            canonicalKey: music.canonicalKey,
        });

        return music;
    }

    async incrementMusicUsage(id: string): Promise<void> {
        await this.libraryStore.incrementMusicUsage(id);
    }

    // =========================================================================
    // Stats
    // =========================================================================

    async getStats(): Promise<AudioLibraryStats> {
        return this.libraryStore.getStats();
    }

}
