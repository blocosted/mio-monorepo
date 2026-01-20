/**
 * Inversify IoC Container Configuration
 *
 * Central dependency injection container for the Mio API.
 * Uses a dictionary-based registration pattern for cleaner configuration.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import '@mio/helpers/env.loader';

// Import ensures env loader hydration happens before wiring connections
import '@mio/shared/constants/environment.constants';

import { IocInfrastructure, IocService } from './ioc.types';

// Connections
import { dbConnectionFactory, type DatabaseConnection } from '@mio/shared/server/connections/db';
import { redisConnectionFactory, type RedisClient } from '@mio/shared/server/connections/redis';
import { storageConnectionFactory } from '@mio/shared/server/connections/storage';

// Cross-cutting
import { Logger } from '@mio/shared/server/logger';

// Services
import { StorageService, type IStorageService } from '../services/storage';
import {
    CacheService,
    AudioCacheService,
    JobProgressService,
    type ICacheService,
    type IAudioCacheService,
    type IJobProgressService,
} from '../services/cache';
import {
    ProfilesService,
    ProfilesStore,
    type IProfilesService,
    type IProfilesStore,
} from '../services/profiles';
import {
    StoriesService,
    StoriesStore,
    type IStoriesService,
    type IStoriesStore,
} from '../services/stories';

// Create container instance
const container = new Container({ defaultScope: 'Singleton' });

/**
 * Service factory definitions
 * Maps IoC identifiers to their factory functions
 */
const factories = {
    // Infrastructure - Logger
    [IocInfrastructure.LOGGER]: () => container.get(Logger, { autobind: true }),

    // Infrastructure - Database Client
    [IocInfrastructure.DATABASE_CLIENT]: () => dbConnectionFactory(),

    // Infrastructure - Storage Client
    [IocInfrastructure.STORAGE_CLIENT]: () => storageConnectionFactory(),

    // Infrastructure - Redis Client (Bun Redis client encapsulated in connections/redis.ts)
    [IocInfrastructure.REDIS_CLIENT]: () =>
        redisConnectionFactory(container.get<Logger>(IocInfrastructure.LOGGER)),

    // Services
    [IocService.STORAGE]: () => container.get(StorageService, { autobind: true }),
    [IocService.CACHE]: () => container.get(CacheService, { autobind: true }),
    [IocService.AUDIO_CACHE]: () => container.get(AudioCacheService, { autobind: true }),
    [IocService.JOB_PROGRESS]: () => container.get(JobProgressService, { autobind: true }),
    [IocService.PROFILES_STORE]: () => container.get(ProfilesStore, { autobind: true }),
    [IocService.PROFILES]: () => container.get(ProfilesService, { autobind: true }),
    [IocService.STORIES_STORE]: () => container.get(StoriesStore, { autobind: true }),
    [IocService.STORIES]: () => container.get(StoriesService, { autobind: true }),
} as const;

// Type for all identifiers
type IocIdentifier = keyof typeof factories;

// Register all factories
for (const [identifier, factory] of Object.entries(factories)) {
    container.bind(identifier).toDynamicValue(factory).inSingletonScope();
}

/**
 * Get an instance from the container
 */
export function getInstance<T>(identifier: IocIdentifier): T {
    return container.get<T>(identifier);
}

/**
 * Reset the container (useful for testing)
 */
export function resetContainer(): void {
    container.unbindAll();
    // Re-register all factories
    for (const [identifier, factory] of Object.entries(factories)) {
        container.bind(identifier).toDynamicValue(factory).inSingletonScope();
    }
}

// Type exports for container access
export type {
    IStorageService,
    ICacheService,
    IAudioCacheService,
    IJobProgressService,
    IProfilesService,
    IProfilesStore,
    IStoriesService,
    IStoriesStore,
};
export type { RedisClient, DatabaseConnection, Logger };

export { container };
