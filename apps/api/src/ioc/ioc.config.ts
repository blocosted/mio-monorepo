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

import { IocConnection, IocStore, IocRepository, IocProvider, IocService, IocInfrastructure } from './ioc.types';

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
// Repositories (external API clients)
import {
    OpenAIRepository,
    AnthropicRepository,
    type ILLMRepository,
} from '../repositories/llm';
import {
    VoicesRepository,
    SoundEffectsRepository,
    type IVoicesRepository,
    type ISoundEffectsRepository,
} from '../repositories/audio';

// LLM Services
import {
    OpenAILLMService,
    ScriptGenerationService,
    type ILLMService,
    type IScriptGenerationService,
} from '../services/llm';

// Audio Services
import {
    TTSService,
    TTSStore,
    VoiceRegistryService,
    FFmpegMixerService,
    SoundEffectsService,
    SoundEffectsStore,
    type ITTSService,
    type IVoiceRegistryService,
    type IFFmpegMixerService,
    type ISoundEffectsService,
} from '../services/audio';
import {
    AudioLibraryService,
    AudioLibraryStore,
    type IAudioLibraryService,
} from '../services/audio-library';

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
    container.bind<Logger>(IocConnection.LOGGER).toConstantValue(logger);
    // Backwards compatibility
    container.bind<Logger>(IocInfrastructure.LOGGER).toConstantValue(logger);

    /**
     * Service factory definitions
     * Maps IoC identifiers to their factory functions
     */
    const factories = {
        // Connections
        // Connections (IocInfrastructure enum values map to same strings for backwards compatibility)
        [IocConnection.DATABASE]: () => dbConnectionFactory(),
        [IocConnection.STORAGE]: () => storageConnectionFactory(),
        [IocConnection.REDIS]: () =>
            redisConnectionFactory(container.get<Logger>(IocConnection.LOGGER)),

        // Stores (private to their services)
        [IocStore.PROFILES_STORE]: () => container.get(ProfilesStore, { autobind: true }),
        [IocStore.STORIES_STORE]: () => container.get(StoriesStore, { autobind: true }),
        [IocStore.TTS_STORE]: () => container.get(TTSStore, { autobind: true }),
        [IocStore.SOUND_EFFECTS_STORE]: () => container.get(SoundEffectsStore, { autobind: true }),
        [IocStore.AUDIO_LIBRARY_STORE]: () => container.get(AudioLibraryStore, { autobind: true }),

        // Repositories (shared external API clients)
        // Note: IocProvider enum values map to the same strings for backwards compatibility
        [IocRepository.OPENAI]: () => container.get(OpenAIRepository, { autobind: true }),
        [IocRepository.ANTHROPIC]: () => container.get(AnthropicRepository, { autobind: true }),
        [IocRepository.VOICES]: () => container.get(VoicesRepository, { autobind: true }),
        [IocRepository.SOUND_EFFECTS]: () => container.get(SoundEffectsRepository, { autobind: true }),

        // Services
        [IocService.STORAGE]: () => container.get(StorageService, { autobind: true }),
        [IocService.CACHE]: () => container.get(CacheService, { autobind: true }),
        [IocService.AUDIO_CACHE]: () => container.get(AudioCacheService, { autobind: true }),
        [IocService.JOB_PROGRESS]: () => container.get(JobProgressService, { autobind: true }),
        [IocService.PROFILES]: () => container.get(ProfilesService, { autobind: true }),
        [IocService.STORIES]: () => container.get(StoriesService, { autobind: true }),
        [IocService.SCRIPT_GENERATION]: () => container.get(ScriptGenerationService, { autobind: true }),
        [IocService.VOICE_REGISTRY]: () => container.get(VoiceRegistryService, { autobind: true }),
        [IocService.TTS]: () => container.get(TTSService, { autobind: true }),
        [IocService.FFMPEG_MIXER]: () => container.get(FFmpegMixerService, { autobind: true }),
        [IocService.SFX_CACHE]: () => container.get(SfxCacheService, { autobind: true }),
        [IocService.SOUND_EFFECTS]: () => container.get(SoundEffectsService, { autobind: true }),
        [IocService.AUDIO_LIBRARY]: () => container.get(AudioLibraryService, { autobind: true }),

    } as const;

    // Register all factories
    for (const [identifier, factory] of Object.entries(factories)) {
        container.bind(identifier).toDynamicValue(factory).inSingletonScope();
    }

    initialized = true;
}

// Type for all identifiers
type IocIdentifier = IocConnection | IocStore | IocRepository | IocProvider | IocService | IocInfrastructure;

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
    // Repositories
    ILLMRepository,
    IVoicesRepository,
    ISoundEffectsRepository,
    // Services
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
    IScriptGenerationService,
    ITTSService,
    IVoiceRegistryService,
    IFFmpegMixerService,
    ISoundEffectsService,
    IAudioLibraryService,
};
export type { RedisClient, DatabaseConnection, Logger };

export { container };
