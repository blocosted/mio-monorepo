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

// Types
export type {
    IMusicGeneratorService,
    GenerateMusicInput,
    GenerateMusicResult,
} from './music-generator.service.types';
export type {
    IMusicStrategyService,
    DetermineMusicMoodInput,
    MusicStrategyResult,
} from './music-strategy.service.types';
