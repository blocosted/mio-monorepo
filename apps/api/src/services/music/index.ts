/**
 * Music Service Exports
 */

// Types
export type {
  MoodPromptMapping,
  MusicGenerateInput,
  MusicGenerateResult,
  MusicSegmentInput,
  MusicSegmentResult
} from './music-generator.service.types';
export type {
  FindMusicParams as MusicLibraryFindParams,
  MusicLookupResult as MusicLibraryLookupResult,
  StoredMusic as MusicLibraryStoredMusic,
  StoreMusicParams as MusicLibraryStoreParams
} from './music-library.service.types';
export type {
  FindMusicParams,
  MusicLibraryStats,
  MusicLookupResult,
  MusicQueryParams,
  StoredMusic,
  StoreMusicParams
} from './music-library.store';
export type {
  MusicCue,
  MusicCueReason,
  MusicMood,
  MusicStrategy,
  MusicStrategyInput,
  MusicStrategyOutput,
  PunctualStrategyConfig
} from './music-strategy.service.types';
// Services
export { MusicGeneratorService } from './music-generator.service';
export { MusicLibraryService } from './music-library.service';
// Stores
export { MusicLibraryStore } from './music-library.store';
export { MusicStrategyService } from './music-strategy.service';
