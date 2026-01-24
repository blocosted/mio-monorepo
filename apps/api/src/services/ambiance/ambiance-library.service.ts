/**
 * Ambiance Library Service
 *
 * Manages the persistent Ambiance library for reuse across stories.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { AmbianceLookupResult, FindAmbianceParams, StoreAmbianceParams, StoredAmbiance } from './ambiance-library.service.types';
import type { AmbianceLibraryStore } from './ambiance-library.store';
import { IocStore } from '../../ioc/ioc.types';

/**
 * Ambiance Library Service Implementation
 *
 * Provides a clean interface for managing the persistent Ambiance library.
 * Delegates all data operations to AmbianceLibraryStore.
 */
@injectable()
export class AmbianceLibraryService {
  constructor(
    @inject(IocStore.AMBIANCE_LIBRARY_STORE)
    private readonly store: AmbianceLibraryStore
  ) {}

  /**
   * Find Ambiance in library
   */
  async findAmbiance(params: FindAmbianceParams): Promise<AmbianceLookupResult> {
    return this.store.findWithCache(params);
  }

  /**
   * Store new Ambiance in library
   */
  async storeAmbiance(params: StoreAmbianceParams): Promise<StoredAmbiance> {
    return this.store.insert(params);
  }

  /**
   * Increment Ambiance usage counter
   */
  async incrementAmbianceUsage(id: string): Promise<void> {
    await this.store.incrementUsage(id);
  }
}
