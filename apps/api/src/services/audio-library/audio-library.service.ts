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

import { Logger } from '@mio/shared/server/logger';
import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AmbianceEnvironment,
    TimeOfDay,
    WeatherCondition,
    AudioMood,
} from '@mio/shared/types';

import { IocInfrastructure, IocService } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { ICacheService } from '../cache/cache.service.types';
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
 * Extract keywords from text for semantic matching
 */
function extractKeywords(text: string): string[] {
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not',
        'sound', 'sounds', 'effect', 'effects', 'audio', 'background', 'ambient',
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Infer SFX category from text description
 */
function inferSfxCategory(text: string): SfxLibraryCategory | undefined {
    const lowerText = text.toLowerCase();

    // Ambient indicators
    if (/rain|wind|storm|weather|breeze|rustling|flowing|nature|forest|ocean|sea|stream|river/i.test(lowerText)) {
        return 'ambient';
    }

    // Effects indicators
    if (/footstep|door|knock|click|tap|slam|crash|break|hit|strike|impact|step/i.test(lowerText)) {
        return 'effects';
    }

    // Transitions indicators
    if (/whoosh|swish|swoosh|transition|fade|magic.*appear|disappear|portal|teleport/i.test(lowerText)) {
        return 'transitions';
    }

    // Foley indicators
    if (/cloth|fabric|paper|book|page|eating|drinking|writing|typing/i.test(lowerText)) {
        return 'foley';
    }

    // Creatures indicators
    if (/bird|animal|creature|monster|dragon|wolf|howl|roar|growl|squawk|chirp/i.test(lowerText)) {
        return 'creatures';
    }

    return undefined;
}

/**
 * Infer SFX environment from text description
 */
function inferSfxEnvironment(text: string): SfxEnvironment | undefined {
    const lowerText = text.toLowerCase();

    if (/forest|tree|leaf|leaves|nature|garden|park|meadow/i.test(lowerText)) {
        return 'nature';
    }
    if (/city|urban|street|traffic|car|bus|train|subway/i.test(lowerText)) {
        return 'urban';
    }
    if (/indoor|room|house|building|kitchen|bathroom|office/i.test(lowerText)) {
        return 'indoor';
    }
    if (/outdoor|outside|field|sky|open|mountain/i.test(lowerText)) {
        return 'outdoor';
    }
    if (/magic|magical|fantasy|enchant|spell|fairy|dragon|castle/i.test(lowerText)) {
        return 'fantasy';
    }

    return undefined;
}

/**
 * Infer ambiance environment from description
 */
function inferAmbianceEnvironment(description: string): AmbianceEnvironment | undefined {
    const lowerDesc = description.toLowerCase();

    if (/forest|tree|woods|woodland|jungle/i.test(lowerDesc)) return 'forest';
    if (/ocean|sea|beach|wave|coast|shore/i.test(lowerDesc)) return 'ocean';
    if (/city|urban|street|traffic|downtown/i.test(lowerDesc)) return 'city';
    if (/village|town|market|shop/i.test(lowerDesc)) return 'village';
    if (/castle|palace|throne|dungeon|tower/i.test(lowerDesc)) return 'castle';
    if (/cave|cavern|underground|grotto/i.test(lowerDesc)) return 'cave';
    if (/mountain|peak|cliff|summit|alpine/i.test(lowerDesc)) return 'mountain';
    if (/meadow|field|grassland|prairie/i.test(lowerDesc)) return 'meadow';
    if (/space|star|galaxy|cosmic|nebula/i.test(lowerDesc)) return 'space';
    if (/underwater|ocean floor|deep sea|coral/i.test(lowerDesc)) return 'underwater';

    return undefined;
}

/**
 * Infer time of day from description
 */
function inferTimeOfDay(description: string): TimeOfDay | undefined {
    const lowerDesc = description.toLowerCase();

    if (/night|midnight|nocturnal|starry|moonlit/i.test(lowerDesc)) return 'night';
    if (/dawn|sunrise|early morning|first light/i.test(lowerDesc)) return 'dawn';
    if (/dusk|sunset|evening|twilight/i.test(lowerDesc)) return 'dusk';
    if (/day|sunny|afternoon|morning|noon/i.test(lowerDesc)) return 'day';

    return 'any';
}

/**
 * Infer weather from description
 */
function inferWeather(description: string): WeatherCondition | undefined {
    const lowerDesc = description.toLowerCase();

    if (/rain|rainy|drizzle|shower/i.test(lowerDesc)) return 'rainy';
    if (/storm|thunder|lightning|tempest/i.test(lowerDesc)) return 'stormy';
    if (/snow|snowy|blizzard|frost/i.test(lowerDesc)) return 'snowy';
    if (/fog|foggy|mist|misty|hazy/i.test(lowerDesc)) return 'foggy';
    if (/clear|sunny|bright|cloudless/i.test(lowerDesc)) return 'clear';

    return 'any';
}

/**
 * Infer mood from description
 */
function inferMood(description: string): AudioMood | undefined {
    const lowerDesc = description.toLowerCase();

    if (/peaceful|calm|serene|tranquil|relaxing/i.test(lowerDesc)) return 'peaceful';
    if (/mysterious|eerie|enigmatic|strange|curious/i.test(lowerDesc)) return 'mysterious';
    if (/tense|suspense|danger|threat|scary|dark/i.test(lowerDesc)) return 'tense';
    if (/magic|magical|enchant|wonder|fairy/i.test(lowerDesc)) return 'magical';
    if (/adventure|epic|heroic|exciting|action/i.test(lowerDesc)) return 'adventurous';

    return undefined;
}

/**
 * Select random item from array
 */
function selectRandom<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}

/**
 * Audio Library Service
 */
@injectable()
export class AudioLibraryService implements IAudioLibraryService {
    constructor(
        @inject(IocInfrastructure.DATABASE_CLIENT)
        private readonly db: DatabaseConnection,
        @inject(IocInfrastructure.LOGGER)
        private readonly logger: Logger,
        @inject(IocService.CACHE)
        private readonly cache: ICacheService,
    ) { }

    // =========================================================================
    // SFX Operations
    // =========================================================================

    async findSfx(params: FindSfxParams): Promise<SfxLookupResult> {
        const { text, limit = 5 } = params;

        // Build cache key from params
        const cacheKey = this.buildSfxCacheKey(params);

        // Check cache first
        const cached = await this.cache.get<StoredSfx>(cacheKey);
        if (cached) {
            this.logger.info('[LIBRARY HIT] SFX found in cache', {
                cacheKey,
                sfxId: cached.id,
            });
            return { sfx: cached, fromCache: true };
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

        // Query database
        const results = await querySfx(this.db, {
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

        // Cache the result
        await this.cache.set(cacheKey, selected, { ex: CACHE_TTL_SECONDS });

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

        const sfx = await insertSfx(this.db, params);

        this.logger.info('SFX stored in library', {
            sfxId: sfx.id,
            canonicalKey: sfx.canonicalKey,
        });

        return sfx;
    }

    async incrementSfxUsage(id: string): Promise<void> {
        await incrementSfxUsageById(this.db, id);
    }

    // =========================================================================
    // Ambiance Operations
    // =========================================================================

    async findAmbiance(params: FindAmbianceParams): Promise<AmbianceLookupResult> {
        const { description, limit = 5 } = params;

        // Build cache key from params
        const cacheKey = this.buildAmbianceCacheKey(params);

        // Check cache first
        const cached = await this.cache.get<StoredAmbiance>(cacheKey);
        if (cached) {
            this.logger.info('[LIBRARY HIT] Ambiance found in cache', {
                cacheKey,
                ambianceId: cached.id,
            });
            return { ambiance: cached, fromCache: true };
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

        // Query database
        const results = await queryAmbiance(this.db, {
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

        // Cache the result
        await this.cache.set(cacheKey, selected, { ex: CACHE_TTL_SECONDS });

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

        const ambiance = await insertAmbiance(this.db, params);

        this.logger.info('Ambiance stored in library', {
            ambianceId: ambiance.id,
            canonicalKey: ambiance.canonicalKey,
        });

        return ambiance;
    }

    async incrementAmbianceUsage(id: string): Promise<void> {
        await incrementAmbianceUsageById(this.db, id);
    }

    // =========================================================================
    // Music Operations
    // =========================================================================

    async findMusic(params: FindMusicParams): Promise<MusicLookupResult> {
        const { mood, limit = 5 } = params;

        // Build cache key from params
        const cacheKey = this.buildMusicCacheKey(params);

        // Check cache first
        const cached = await this.cache.get<StoredMusic>(cacheKey);
        if (cached) {
            this.logger.info('[LIBRARY HIT] Music found in cache', {
                cacheKey,
                musicId: cached.id,
            });
            return { music: cached, fromCache: true };
        }

        this.logger.debug('Finding Music in library', {
            mood,
            intensity: params.intensity,
            tempo: params.tempo,
        });

        // Query database
        const results = await queryMusic(this.db, {
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

        // Cache the result
        await this.cache.set(cacheKey, selected, { ex: CACHE_TTL_SECONDS });

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

        const music = await insertMusic(this.db, params);

        this.logger.info('Music stored in library', {
            musicId: music.id,
            canonicalKey: music.canonicalKey,
        });

        return music;
    }

    async incrementMusicUsage(id: string): Promise<void> {
        await incrementMusicUsageById(this.db, id);
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
