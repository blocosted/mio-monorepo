/**
 * Music Library Service
 *
 * Manages the persistent Music library for reuse across stories.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { FindMusicParams, IMusicLibraryService, MusicLookupResult, StoredMusic, StoreMusicParams } from './music-library.service.types';
import type { MusicLibraryStore } from './music-library.store';
import { IocStore } from '../../ioc/ioc.types';

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
    private readonly store: MusicLibraryStore
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
