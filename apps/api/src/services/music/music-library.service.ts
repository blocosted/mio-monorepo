/**
 * Music Library Service
 *
 * Manages the persistent Music library for reuse across stories.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocStore } from '../../ioc';
import type { MusicLibraryStore } from './music-library.store';
import type {
    IMusicLibraryService,
    FindMusicParams,
    StoreMusicParams,
    StoredMusic,
    MusicLookupResult,
} from './music-library.service.types';

/**
 * Music Library Service Implementation
 *
 * Provides a clean interface for managing the persistent Music library.
 * Delegates all data operations to MusicLibraryStore.
 */
@injectable()
export class MusicLibraryService implements IMusicLibraryService {
    constructor(
        @inject(IocStore.MUSIC_LIBRARY_STORE)
        private readonly store: MusicLibraryStore,
    ) {}

    /**
     * Find Music in library
     */
    async findMusic(params: FindMusicParams): Promise<MusicLookupResult> {
        return this.store.findWithCache(params);
    }

    /**
     * Store new Music in library
     */
    async storeMusic(params: StoreMusicParams): Promise<StoredMusic> {
        return this.store.insert(params);
    }

    /**
     * Increment Music usage counter
     */
    async incrementMusicUsage(id: string): Promise<void> {
        await this.store.incrementUsage(id);
    }
}
