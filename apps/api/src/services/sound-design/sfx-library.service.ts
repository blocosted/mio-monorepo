/**
 * SFX Library Service
 *
 * Manages the persistent SFX library for reuse across stories.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { FindSfxParams, ISfxLibraryService, SfxLookupResult, StoredSfx, StoreSfxParams } from './sfx-library.service.types';
import type { SfxLibraryStore } from './sfx-library.store';
import { IocStore } from '../../ioc/ioc.types';

/**
 * SFX Library Service Implementation
 *
 * Provides a clean interface for managing the persistent SFX library.
 * Delegates all data operations to SfxLibraryStore.
 */
@injectable()
export class SfxLibraryService implements ISfxLibraryService {
  constructor(
    @inject(IocStore.SFX_LIBRARY_STORE)
    private readonly store: SfxLibraryStore
  ) {}

  /**
   * Find SFX in library
   */
  async findSfx(params: FindSfxParams): Promise<SfxLookupResult> {
    return this.store.findWithCache(params);
  }

  /**
   * Store new SFX in library
   */
  async storeSfx(params: StoreSfxParams): Promise<StoredSfx> {
    return this.store.insert(params);
  }

  /**
   * Increment SFX usage counter
   */
  async incrementSfxUsage(id: string): Promise<void> {
    await this.store.incrementUsage(id);
  }
}
