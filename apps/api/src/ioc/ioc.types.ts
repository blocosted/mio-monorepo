/**
 * Inversify IoC Service Identifiers
 *
 * Define all injection tokens using enums to avoid magic strings
 * and enable type-safe dependency injection.
 */

export enum IocInfrastructure {
    STORAGE_CLIENT = 'StorageClient',
    REDIS_CLIENT = 'RedisClient',
    DATABASE_CLIENT = 'DatabaseClient',
    LOGGER = 'Logger',
}

export enum IocService {
    STORAGE = 'StorageService',
    CACHE = 'CacheService',
    AUDIO_CACHE = 'AudioCacheService',
    JOB_PROGRESS = 'JobProgressService',
    PROFILES = 'ProfilesService',
    PROFILES_STORE = 'ProfilesStore',
}

/**
 * Bucket names for Supabase Storage
 */
export const BUCKETS = {
    AUDIO: 'audio',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];
