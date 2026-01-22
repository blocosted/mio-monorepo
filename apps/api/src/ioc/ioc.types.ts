/**
 * Inversify IoC Service Identifiers
 *
 * Define all injection tokens using enums to avoid magic strings
 * and enable type-safe dependency injection.
 */

/**
 * Infrastructure connections (DB, Redis, Storage, Logger)
 * These are shared across all services and stores
 */
export enum IocConnection {
    DATABASE = 'DatabaseConnection',
    REDIS = 'RedisConnection',
    STORAGE = 'StorageConnection',
    LOGGER = 'Logger',
}

/**
 * Data access stores
 * IMPORTANT: Stores are PRIVATE to their associated service
 * A service should only inject its own store, never another service's store
 * For cross-service data access, inject the SERVICE, not its store
 */
export enum IocStore {
    PROFILES_STORE = 'ProfilesStore',
    STORIES_STORE = 'StoriesStore',
    STORY_SEGMENTS_STORE = 'StorySegmentsStore',
    AUDIO_ASSETS_STORE = 'AudioAssetsStore',
    GENERATION_JOBS_STORE = 'GenerationJobsStore',
    SCRIPT_GENERATION_STORE = 'ScriptGenerationStore',
    TTS_STORE = 'TTSStore',
    SOUND_EFFECTS_STORE = 'SoundEffectsStore',
    AUDIO_LIBRARY_STORE = 'AudioLibraryStore',
    VOICE_REGISTRY_STORE = 'VoiceRegistryStore',
}

/**
 * External API repositories (formerly providers)
 * These are shared across services and act as pure API clients
 */
export enum IocRepository {
    OPENAI = 'OpenAIRepository',
    ANTHROPIC = 'AnthropicRepository',
    VOICES = 'VoicesRepository',
    SOUND_EFFECTS = 'SoundEffectsRepository',
}

/**
 * @deprecated Use IocRepository instead. This enum is kept for backwards compatibility during migration.
 */
export enum IocProvider {
    OPENAI = 'OpenAIRepository',
    ANTHROPIC = 'AnthropicRepository',
    ELEVENLABS = 'VoicesRepository',
    SOUND_EFFECTS_PROVIDER = 'SoundEffectsRepository',
}

/**
 * Business logic services
 * Services can depend on:
 * - Their own store (IocStore)
 * - Other services (IocService)
 * - Providers (IocProvider)
 * - Connections (IocConnection)
 */
export enum IocService {
    STORAGE = 'StorageService',
    CACHE = 'CacheService',
    AUDIO_CACHE = 'AudioCacheService',
    SFX_CACHE = 'SfxCacheService',
    JOB_PROGRESS = 'JobProgressService',
    PROFILES = 'ProfilesService',
    STORIES = 'StoriesService',
    SCRIPT_GENERATION = 'ScriptGenerationService',
    TTS = 'TTSService',
    VOICE_REGISTRY = 'VoiceRegistryService',
    FFMPEG_MIXER = 'FFmpegMixerService',
    SOUND_EFFECTS = 'SoundEffectsService',
    AUDIO_LIBRARY = 'AudioLibraryService',
}

/**
 * Legacy enum for backwards compatibility
 * @deprecated Use IocConnection instead
 */
export enum IocInfrastructure {
    STORAGE_CLIENT = 'StorageConnection',
    REDIS_CLIENT = 'RedisConnection',
    DATABASE_CLIENT = 'DatabaseConnection',
    LOGGER = 'Logger',
}

/**
 * Bucket names for Supabase Storage
 */
export const BUCKETS = {
    AUDIO: 'audio',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];
