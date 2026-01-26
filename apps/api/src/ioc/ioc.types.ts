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
  LOGGER = 'Logger'
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
  VOICE_REGISTRY_STORE = 'VoiceRegistryStore',
  SFX_LIBRARY_STORE = 'SfxLibraryStore',
  AMBIANCE_LIBRARY_STORE = 'AmbianceLibraryStore',
  MUSIC_LIBRARY_STORE = 'MusicLibraryStore'
}

/**
 * External API repositories (formerly providers)
 * These are shared across services and act as pure API clients
 */
export enum IocRepository {
  OPENAI = 'OpenAIRepository',
  ANTHROPIC = 'AnthropicRepository',
  AUDIO = 'AudioRepository',
  LLM_REPOSITORY = 'LLMRepository'
}

/**
 * Business logic services
 * Services can depend on:
 * - Their own store (IocStore)
 * - Other services (IocService)
 * - Connections (IocConnection)
 * - Repositories (IocRepository)
 */
export enum IocService {
  STORAGE = 'StorageService',
  CACHE = 'CacheService',
  AUDIO_CACHE = 'AudioCacheService',
  SFX_CACHE = 'SfxCacheService',
  JOB_PROGRESS = 'JobProgressService',
  PROFILES = 'ProfilesService',
  STORIES = 'StoriesService',
  STORY_SEGMENTS = 'StorySegmentsService',
  AUDIO_ASSETS = 'AudioAssetsService',
  GENERATION_JOBS = 'GenerationJobsService',
  ENRICHMENT = 'EnrichmentService',
  SCRIPT_GENERATION = 'ScriptGenerationService',
  TTS = 'TTSService',
  VOICE_REGISTRY = 'VoiceRegistryService',
  FFMPEG_MIXER = 'FFmpegMixerService',
  SOUND_EFFECTS = 'SoundEffectsService',
  SFX = 'SfxService',
  SFX_LIBRARY = 'SfxLibraryService',
  MUSIC_GENERATOR = 'MusicGeneratorService',
  MUSIC_STRATEGY = 'MusicStrategyService',
  MUSIC_LIBRARY = 'MusicLibraryService',
  AMBIANCE_GENERATOR = 'AmbianceGeneratorService',
  AMBIANCE_LIBRARY = 'AmbianceLibraryService',
  WORKFLOW_ORCHESTRATOR = 'WorkflowOrchestratorService',
  // Story generation orchestration services
  STORY_CONTEXT = 'StoryContextService',
  VOICE_ASSIGNMENT = 'VoiceAssignmentService',
  VOICE_GENERATION_ORCHESTRATOR = 'VoiceGenerationOrchestrator',
  AUDIO_GENERATION_ORCHESTRATOR = 'AudioGenerationOrchestrator',
  STORY_MIXING_ORCHESTRATOR = 'StoryMixingOrchestrator',
  STORY_FINALIZATION = 'StoryFinalizationService'
}

/**
 * Bucket names for Supabase Storage
 */
export const BUCKETS = {
  AUDIO: 'audio'
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];
