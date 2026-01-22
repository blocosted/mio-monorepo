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

import { IocConnection, IocStore, IocRepository, IocService } from './ioc.types';

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
    StorySegmentsStore,
    AudioAssetsStore,
    GenerationJobsStore,
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
    ScriptGenerationService,
    type ILLMService,
    type IScriptGenerationService,
} from '../services/llm';

// Narration Services
import {
    TTSService,
    TTSStore,
    VoiceRegistryService,
    VoiceRegistryStore,
    type ITTSService,
    type IVoiceRegistryService,
} from '../services/narration';

// Sound Design Services
import {
    SfxService,
    SfxStore,
    type ISfxService,
} from '../services/sound-design';

// Audio Mixing Services
import {
    FFmpegMixerService,
    type IFFmpegMixerService,
} from '../services/audio-mixing';
import {
    SfxLibraryStore,
    SfxLibraryService,
    type ISfxLibraryService,
} from '../services/sound-design';
import {
    AmbianceLibraryStore,
    AmbianceLibraryService,
    type IAmbianceLibraryService,
} from '../services/ambiance';
import {
    MusicLibraryStore,
    MusicLibraryService,
    type IMusicLibraryService,
} from '../services/music';

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

    /**
     * Service factory definitions
     * Maps IoC identifiers to their factory functions
     */
    const factories = {
        // Connections
        [IocConnection.DATABASE]: () => dbConnectionFactory(),
        [IocConnection.STORAGE]: () => storageConnectionFactory(),
        [IocConnection.REDIS]: () => redisConnectionFactory(container.get<Logger>(IocConnection.LOGGER)),

        // Stores (private to their services)
        [IocStore.PROFILES_STORE]: () => container.get(ProfilesStore, { autobind: true }),
        [IocStore.STORIES_STORE]: () => container.get(StoriesStore, { autobind: true }),
        [IocStore.STORY_SEGMENTS_STORE]: () => container.get(StorySegmentsStore, { autobind: true }),
        [IocStore.AUDIO_ASSETS_STORE]: () => container.get(AudioAssetsStore, { autobind: true }),
        [IocStore.GENERATION_JOBS_STORE]: () => container.get(GenerationJobsStore, { autobind: true }),
        [IocStore.TTS_STORE]: () => container.get(TTSStore, { autobind: true }),
        [IocStore.SOUND_EFFECTS_STORE]: () => container.get(SfxStore, { autobind: true }),
        [IocStore.VOICE_REGISTRY_STORE]: () => container.get(VoiceRegistryStore, { autobind: true }),
        [IocStore.SFX_LIBRARY_STORE]: () => container.get(SfxLibraryStore, { autobind: true }),
        [IocStore.AMBIANCE_LIBRARY_STORE]: () => container.get(AmbianceLibraryStore, { autobind: true }),
        [IocStore.MUSIC_LIBRARY_STORE]: () => container.get(MusicLibraryStore, { autobind: true }),

        // Repositories (shared external API clients)
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
        [IocService.SOUND_EFFECTS]: () => container.get(SfxService, { autobind: true }),
        [IocService.SFX_LIBRARY]: () => container.get(SfxLibraryService, { autobind: true }),
        [IocService.MUSIC_LIBRARY]: () => container.get(MusicLibraryService, { autobind: true }),
        [IocService.AMBIANCE_LIBRARY]: () => container.get(AmbianceLibraryService, { autobind: true }),

    } as const;

    // Register all factories
    for (const [identifier, factory] of Object.entries(factories)) {
        container.bind(identifier).toDynamicValue(factory).inSingletonScope();
    }

    initialized = true;
}

// Type for all identifiers
type IocIdentifier = IocConnection | IocStore | IocRepository | IocService;

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
    ISfxService,
    ISfxLibraryService,
    IMusicLibraryService,
    IAmbianceLibraryService,
};
export type { RedisClient, DatabaseConnection, Logger };

export { container };
