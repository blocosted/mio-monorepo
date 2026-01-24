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

// Connections
import { type DatabaseConnection, dbConnectionFactory } from '@mio/shared/server/connections/db';
import { type RedisClient, redisConnectionFactory } from '@mio/shared/server/connections/redis';
import { storageConnectionFactory } from '@mio/shared/server/connections/storage';
// Cross-cutting
import { Logger } from '@mio/shared/server/logger';

import { AudioRepository, type IAudioRepository, type ISoundEffectsRepository } from '../repositories/audio';
// Repositories (external API clients)
import { AnthropicRepository, type ILLMRepository, OpenAIRepository } from '../repositories/llm';
import {
  AmbianceGeneratorService,
  AmbianceLibraryService,
  AmbianceLibraryStore
} from '../services/ambiance';
// Audio Generation Services
import { AudioGenerationOrchestrator } from '../services/audio';
// Audio Mixing Services
import { FFmpegMixerService, StoryMixingOrchestrator } from '../services/audio-mixing';
import {
  AudioCacheService,
  CacheService,
  JobProgressService,
  SfxCacheService
} from '../services/cache';
// LLM Services
import { EnrichmentService, ScriptGenerationService } from '../services/llm';
import {
  MusicGeneratorService,
  MusicLibraryService,
  MusicLibraryStore,
  MusicStrategyService
} from '../services/music';
// Narration Services
import {
  TTSService,
  TTSStore,
  VoiceAssignmentService,
  VoiceGenerationOrchestrator,
  VoiceRegistryService,
  VoiceRegistryStore
} from '../services/narration';
import { ProfilesService, ProfilesStore } from '../services/profiles';
// Sound Design Services
import { SfxLibraryService, SfxLibraryStore, SfxService, SfxStore } from '../services/sound-design';
// Services
import { StorageService } from '../services/storage';
import {
  AudioAssetsStore,
  GenerationJobsStore,
  StoriesService,
  StoriesStore,
  StoryContextService,
  StoryFinalizationService,
  StorySegmentsStore
} from '../services/stories';
import { WorkflowOrchestratorService } from '../services/workflows';
import { IocConnection, IocRepository, IocService, IocStore } from './ioc.types';

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
    [IocRepository.AUDIO]: () => container.get(AudioRepository, { autobind: true }),
    [IocRepository.LLM_REPOSITORY]: () => container.get(AnthropicRepository, { autobind: true }),

    // Services
    [IocService.STORAGE]: () => container.get(StorageService, { autobind: true }),
    [IocService.CACHE]: () => container.get(CacheService, { autobind: true }),
    [IocService.AUDIO_CACHE]: () => container.get(AudioCacheService, { autobind: true }),
    [IocService.JOB_PROGRESS]: () => container.get(JobProgressService, { autobind: true }),
    [IocService.PROFILES]: () => container.get(ProfilesService, { autobind: true }),
    [IocService.STORIES]: () => container.get(StoriesService, { autobind: true }),
    [IocService.ENRICHMENT]: () => container.get(EnrichmentService, { autobind: true }),
    [IocService.SCRIPT_GENERATION]: () => container.get(ScriptGenerationService, { autobind: true }),
    [IocService.VOICE_REGISTRY]: () => container.get(VoiceRegistryService, { autobind: true }),
    [IocService.TTS]: () => container.get(TTSService, { autobind: true }),
    [IocService.FFMPEG_MIXER]: () => container.get(FFmpegMixerService, { autobind: true }),
    [IocService.SFX_CACHE]: () => container.get(SfxCacheService, { autobind: true }),
    [IocService.SOUND_EFFECTS]: () => container.get(SfxService, { autobind: true }),
    [IocService.SFX]: () => container.get(SfxService, { autobind: true }), // Alias for SOUND_EFFECTS
    [IocService.SFX_LIBRARY]: () => container.get(SfxLibraryService, { autobind: true }),
    [IocService.MUSIC_LIBRARY]: () => container.get(MusicLibraryService, { autobind: true }),
    [IocService.MUSIC_GENERATOR]: () => container.get(MusicGeneratorService, { autobind: true }),
    [IocService.MUSIC_STRATEGY]: () => container.get(MusicStrategyService, { autobind: true }),
    [IocService.AMBIANCE_LIBRARY]: () => container.get(AmbianceLibraryService, { autobind: true }),
    [IocService.AMBIANCE_GENERATOR]: () => container.get(AmbianceGeneratorService, { autobind: true }),
    [IocService.WORKFLOW_ORCHESTRATOR]: () => container.get(WorkflowOrchestratorService, { autobind: true }),

    // Story generation orchestration services
    [IocService.STORY_CONTEXT]: () => container.get(StoryContextService, { autobind: true }),
    [IocService.VOICE_ASSIGNMENT]: () => container.get(VoiceAssignmentService, { autobind: true }),
    [IocService.VOICE_GENERATION_ORCHESTRATOR]: () => container.get(VoiceGenerationOrchestrator, { autobind: true }),
    [IocService.AUDIO_GENERATION_ORCHESTRATOR]: () => container.get(AudioGenerationOrchestrator, { autobind: true }),
    [IocService.STORY_MIXING_ORCHESTRATOR]: () => container.get(StoryMixingOrchestrator, { autobind: true }),
    [IocService.STORY_FINALIZATION]: () => container.get(StoryFinalizationService, { autobind: true })
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
  IAudioRepository as IVoicesRepository,
  ISoundEffectsRepository
};
export type { RedisClient, DatabaseConnection, Logger };

export { container };
