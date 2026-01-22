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
    SfxCacheService,
    JobProgressService,
    type ICacheService,
    type IAudioCacheService,
    type ISfxCacheService,
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
import { OpenAILLMService, type ILLMService } from '../services/llm';
import {
    TTSService,
    ElevenLabsProvider,
    VoiceRegistryService,
    FFmpegMixerService,
    SoundEffectsProvider,
    SoundEffectsService,
    type ITTSService,
    type IElevenLabsProvider,
    type IVoiceRegistryService,
    type IFFmpegMixerService,
    type ISoundEffectsProvider,
    type ISoundEffectsService,
} from '../services/audio';

// Create container instance
const container = new Container({ defaultScope: 'Singleton' });

// Track initialization state
let initialized = false;

/**
 * Initialize the IoC container (must be called before using getInstance)
 */
export async function initializeContainer(): Promise<void> {
    if (initialized) return;

    // Create Logger instance asynchronously
    const logger = await Logger.create();

    // Bind the pre-created Logger instance
    container.bind<Logger>(IocInfrastructure.LOGGER).toConstantValue(logger);

    /**
     * Service factory definitions
     * Maps IoC identifiers to their factory functions
     */
    const factories = {
        // Infrastructure - Database Client
        [IocInfrastructure.DATABASE_CLIENT]: () => dbConnectionFactory(),

        // Infrastructure - Storage Client
        [IocInfrastructure.STORAGE_CLIENT]: () => storageConnectionFactory(),

        // Infrastructure - Redis Client
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
        [IocService.LLM]: () => container.get(OpenAILLMService, { autobind: true }),
        [IocService.ELEVENLABS_PROVIDER]: () => container.get(ElevenLabsProvider, { autobind: true }),
        [IocService.VOICE_REGISTRY]: () => container.get(VoiceRegistryService, { autobind: true }),
        [IocService.TTS]: () => container.get(TTSService, { autobind: true }),
        [IocService.FFMPEG_MIXER]: () => container.get(FFmpegMixerService, { autobind: true }),
        [IocService.SOUND_EFFECTS_PROVIDER]: () => container.get(SoundEffectsProvider, { autobind: true }),
        [IocService.SFX_CACHE]: () => container.get(SfxCacheService, { autobind: true }),
        [IocService.SOUND_EFFECTS]: () => container.get(SoundEffectsService, { autobind: true }),
    } as const;

    // Register all factories
    for (const [identifier, factory] of Object.entries(factories)) {
        container.bind(identifier).toDynamicValue(factory).inSingletonScope();
    }

    initialized = true;
}

// Type for all identifiers
type IocIdentifier = IocInfrastructure | IocService;

/**
 * Get an instance from the container
 */
export function getInstance<T>(identifier: IocIdentifier): T {
    if (!initialized) {
        throw new Error('IoC container not initialized. Call initializeContainer() first.');
    }
    return container.get<T>(identifier);
}

/**
 * Reset the container (useful for testing)
 */
export async function resetContainer(): Promise<void> {
    container.unbindAll();
    initialized = false;
    await initializeContainer();
}

// Type exports for container access
export type {
    IStorageService,
    ICacheService,
    IAudioCacheService,
    ISfxCacheService,
    IJobProgressService,
    IProfilesService,
    IProfilesStore,
    IStoriesService,
    IStoriesStore,
    ILLMService,
    ITTSService,
    IElevenLabsProvider,
    IVoiceRegistryService,
    IFFmpegMixerService,
    ISoundEffectsProvider,
    ISoundEffectsService,
};
export type { RedisClient, DatabaseConnection, Logger };

export { container };
