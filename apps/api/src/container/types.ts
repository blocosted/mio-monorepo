/**
 * Inversify Service Identifiers
 *
 * Define all injection tokens here to avoid magic strings
 * and enable type-safe dependency injection.
 */

export const TYPES = {
    // Infrastructure
    SupabaseClient: Symbol.for('SupabaseClient'),
    RedisClient: Symbol.for('RedisClient'),
    DatabaseClient: Symbol.for('DatabaseClient'),

    // Services
    StorageService: Symbol.for('StorageService'),
    CacheService: Symbol.for('CacheService'),
    LLMService: Symbol.for('LLMService'),
    AudioService: Symbol.for('AudioService'),

    // Repositories
    ProfileRepository: Symbol.for('ProfileRepository'),
    StoryRepository: Symbol.for('StoryRepository'),
    JobRepository: Symbol.for('JobRepository'),

    // Configuration
    StorageConfig: Symbol.for('StorageConfig'),
    AppConfig: Symbol.for('AppConfig'),
} as const;

/**
 * Bucket names for storage
 */
export const BUCKETS = {
    AUDIO: 'audio',
} as const;
