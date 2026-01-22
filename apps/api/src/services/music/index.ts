/**
 * Music Service Exports
 */

// Stores
export { MusicLibraryStore } from './music-library.store';
export type {
    StoredMusic,
    FindMusicParams,
    MusicQueryParams,
    StoreMusicParams,
    MusicLookupResult,
    MusicLibraryStats,
} from './music-library.store';

// Services
export { MusicGeneratorService } from './music-generator.service';
export { MusicStrategyService } from './music-strategy.service';
export { MusicLibraryService } from './music-library.service';

// Types
export type {
    IMusicGeneratorService,
    MusicGenerateInput,
    MusicGenerateResult,
    MusicSegmentInput,
    MusicSegmentResult,
    MoodPromptMapping,
} from './music-generator.service.types';
export type {
    IMusicStrategyService,
    MusicMood,
    MusicCueReason,
    MusicStrategy,
    MusicCue,
    MusicStrategyInput,
    MusicStrategyOutput,
    PunctualStrategyConfig,
} from './music-strategy.service.types';
export type {
    IMusicLibraryService,
    FindMusicParams as MusicLibraryFindParams,
    StoreMusicParams as MusicLibraryStoreParams,
    StoredMusic as MusicLibraryStoredMusic,
    MusicLookupResult as MusicLibraryLookupResult,
} from './music-library.service.types';
