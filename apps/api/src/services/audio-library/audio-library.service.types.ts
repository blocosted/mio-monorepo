/**
 * Audio Library Service Types
 *
 * Type definitions for the persistent audio library service that manages
 * SFX, Ambiance, and Music assets for reuse across stories.
 */

import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AudioIntensity,
    AmbianceEnvironment,
    TimeOfDay,
    WeatherCondition,
    AudioMood,
    MusicMood,
    MusicIntensity,
    MusicTempo,
} from '@mio/shared/types';

// =============================================================================
// SFX Library Types
// =============================================================================

/**
 * Stored SFX asset in the library
 */
export interface StoredSfx {
    id: string;
    canonicalKey: string;

    // Taxonomy
    category: SfxLibraryCategory;
    subcategory: string;
    environment?: SfxEnvironment | null;
    intensity?: AudioIntensity | null;

    // Generation
    prompt: string;
    promptInfluence: number;

    // Audio
    s3Url: string;
    durationSeconds: number;
    format: string;

    // Search
    tags?: string[] | null;
    storyUniverses?: string[] | null;

    // Stats
    usageCount?: number | null;
    lastUsedAt?: Date | null;
    createdAt: Date;
}

/**
 * Parameters for finding SFX in the library
 */
export interface FindSfxParams {
    /** Text description to match */
    text: string;
    /** Category to match */
    category?: SfxLibraryCategory;
    /** Subcategory to match */
    subcategory?: string;
    /** Environment to match */
    environment?: SfxEnvironment;
    /** Intensity to match */
    intensity?: AudioIntensity;
    /** Tags to match (any of) */
    tags?: string[];
    /** Maximum results to return */
    limit?: number;
}

/**
 * Parameters for storing a new SFX in the library
 */
export interface StoreSfxParams {
    /** Category */
    category: SfxLibraryCategory;
    /** Subcategory */
    subcategory: string;
    /** Environment (optional) */
    environment?: SfxEnvironment;
    /** Intensity (optional) */
    intensity?: AudioIntensity;
    /** Original prompt used for generation */
    prompt: string;
    /** Prompt influence used */
    promptInfluence: number;
    /** S3 URL of the audio file */
    s3Url: string;
    /** Duration in seconds */
    durationSeconds: number;
    /** Tags for search */
    tags?: string[];
    /** Story universes this SFX fits */
    storyUniverses?: string[];
}

// =============================================================================
// Ambiance Library Types
// =============================================================================

/**
 * Stored Ambiance asset in the library
 */
export interface StoredAmbiance {
    id: string;
    canonicalKey: string;

    // Taxonomy
    environment: AmbianceEnvironment;
    subEnvironment?: string | null;
    timeOfDay?: TimeOfDay | null;
    weather?: WeatherCondition | null;
    mood?: AudioMood | null;

    // Generation
    prompt: string;
    promptInfluence: number;

    // Audio
    s3Url: string;
    sourceDurationSeconds: number;
    format: string;
    isLoopable?: boolean | null;

    // Search
    tags?: string[] | null;
    storyUniverses?: string[] | null;

    // Stats
    usageCount?: number | null;
    lastUsedAt?: Date | null;
    createdAt: Date;
}

/**
 * Parameters for finding Ambiance in the library
 */
export interface FindAmbianceParams {
    /** Text description to match */
    description: string;
    /** Environment to match */
    environment?: AmbianceEnvironment;
    /** Sub-environment to match */
    subEnvironment?: string;
    /** Time of day to match */
    timeOfDay?: TimeOfDay;
    /** Weather to match */
    weather?: WeatherCondition;
    /** Mood to match */
    mood?: AudioMood;
    /** Tags to match (any of) */
    tags?: string[];
    /** Maximum results to return */
    limit?: number;
}

/**
 * Parameters for storing a new Ambiance in the library
 */
export interface StoreAmbianceParams {
    /** Environment */
    environment: AmbianceEnvironment;
    /** Sub-environment (optional) */
    subEnvironment?: string;
    /** Time of day (optional) */
    timeOfDay?: TimeOfDay;
    /** Weather (optional) */
    weather?: WeatherCondition;
    /** Mood (optional) */
    mood?: AudioMood;
    /** Original prompt used for generation */
    prompt: string;
    /** Prompt influence used */
    promptInfluence: number;
    /** S3 URL of the audio file */
    s3Url: string;
    /** Source duration in seconds (before looping) */
    sourceDurationSeconds: number;
    /** Whether the audio is loopable */
    isLoopable?: boolean;
    /** Tags for search */
    tags?: string[];
    /** Story universes this ambiance fits */
    storyUniverses?: string[];
}

// =============================================================================
// Music Library Types
// =============================================================================

/**
 * Stored Music asset in the library
 */
export interface StoredMusic {
    id: string;
    canonicalKey: string;

    // Taxonomy
    mood: MusicMood;
    intensity?: MusicIntensity | null;
    tempo?: MusicTempo | null;
    variationIndex?: number | null;

    // Generation
    prompt: string;
    promptInfluence: number;

    // Audio
    s3Url: string;
    sourceDurationSeconds: number;
    format: string;
    isLoopable?: boolean | null;

    // Search
    tags?: string[] | null;
    storyUniverses?: string[] | null;

    // Stats
    usageCount?: number | null;
    lastUsedAt?: Date | null;
    createdAt: Date;
}

/**
 * Parameters for finding Music in the library
 */
export interface FindMusicParams {
    /** Mood to match */
    mood: MusicMood;
    /** Intensity to match (optional) */
    intensity?: MusicIntensity;
    /** Tempo to match (optional) */
    tempo?: MusicTempo;
    /** Tags to match (any of) */
    tags?: string[];
    /** Maximum results to return */
    limit?: number;
}

/**
 * Parameters for storing a new Music in the library
 */
export interface StoreMusicParams {
    /** Mood */
    mood: MusicMood;
    /** Intensity (optional) */
    intensity?: MusicIntensity;
    /** Tempo (optional) */
    tempo?: MusicTempo;
    /** Variation index (0-4) */
    variationIndex?: number;
    /** Original prompt used for generation */
    prompt: string;
    /** Prompt influence used */
    promptInfluence: number;
    /** S3 URL of the audio file */
    s3Url: string;
    /** Source duration in seconds (before looping) */
    sourceDurationSeconds: number;
    /** Whether the audio is loopable */
    isLoopable?: boolean;
    /** Tags for search */
    tags?: string[];
    /** Story universes this music fits */
    storyUniverses?: string[];
}

// =============================================================================
// Lookup Result Types
// =============================================================================

/**
 * Result from SFX lookup
 */
export interface SfxLookupResult {
    /** Found SFX (null if not found) */
    sfx: StoredSfx | null;
    /** Whether the result came from cache */
    fromCache: boolean;
}

/**
 * Result from Ambiance lookup
 */
export interface AmbianceLookupResult {
    /** Found Ambiance (null if not found) */
    ambiance: StoredAmbiance | null;
    /** Whether the result came from cache */
    fromCache: boolean;
}

/**
 * Result from Music lookup
 */
export interface MusicLookupResult {
    /** Found Music (null if not found) */
    music: StoredMusic | null;
    /** Whether the result came from cache */
    fromCache: boolean;
}

// =============================================================================
// Library Stats Types
// =============================================================================

/**
 * Statistics for the audio library
 */
export interface AudioLibraryStats {
    /** SFX stats */
    sfx: {
        total: number;
        byCategory: Record<string, number>;
        byEnvironment: Record<string, number>;
    };
    /** Ambiance stats */
    ambiance: {
        total: number;
        byEnvironment: Record<string, number>;
        byMood: Record<string, number>;
    };
    /** Music stats */
    music: {
        total: number;
        byMood: Record<string, number>;
        byIntensity: Record<string, number>;
    };
    /** Top used assets */
    topUsed: {
        sfx: Array<{ canonicalKey: string; usageCount: number }>;
        ambiance: Array<{ canonicalKey: string; usageCount: number }>;
        music: Array<{ canonicalKey: string; usageCount: number }>;
    };
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Audio Library Service Interface
 */
export interface IAudioLibraryService {
    // SFX operations
    findSfx(params: FindSfxParams): Promise<SfxLookupResult>;
    storeSfx(params: StoreSfxParams): Promise<StoredSfx>;
    incrementSfxUsage(id: string): Promise<void>;

    // Ambiance operations
    findAmbiance(params: FindAmbianceParams): Promise<AmbianceLookupResult>;
    storeAmbiance(params: StoreAmbianceParams): Promise<StoredAmbiance>;
    incrementAmbianceUsage(id: string): Promise<void>;

    // Music operations
    findMusic(params: FindMusicParams): Promise<MusicLookupResult>;
    storeMusic(params: StoreMusicParams): Promise<StoredMusic>;
    incrementMusicUsage(id: string): Promise<void>;

    // Stats
    getStats(): Promise<AudioLibraryStats>;
}
