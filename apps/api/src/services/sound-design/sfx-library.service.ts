/**
 * SFX Library Service
 *
 * Manages the persistent SFX library for reuse across stories.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocStore } from '../../ioc';
import type { SfxLibraryStore } from './sfx-library.store';
import type {
    ISfxLibraryService,
    FindSfxParams,
    StoreSfxParams,
    StoredSfx,
    SfxLookupResult,
} from './sfx-library.service.types';

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
        private readonly store: SfxLibraryStore,
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
