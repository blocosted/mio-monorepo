/**
 * Abstract Service Base Class
 *
 * Provides common infrastructure access (DB, Redis, Logger, Storage)
 * for all services via Inversify property injection.
 *
 * All services should extend this class to access shared infrastructure.
 */

import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { RedisClient } from '@mio/shared/server/connections/redis';
import type { Logger } from '@mio/shared/server/logger';

import type { IStorageService } from './storage';
import { IocConnection, IocService } from '../ioc/ioc.types';

@injectable()
export abstract class AbstractService {
  /**
   * Database connection (available to all services)
   */
  @inject(IocConnection.DATABASE)
  protected db!: DatabaseConnection;

  /**
   * Redis client (available to all services)
   */
  @inject(IocConnection.REDIS)
  protected redis!: RedisClient;

  /**
   * Logger instance (lazy-loaded via getter)
   */
  private _logger?: Logger;

  /**
   * Storage service (lazy-loaded via getter)
   */
  private _storageService?: IStorageService;

  /**
   * Get logger instance (lazy-loaded)
   */
  protected get logger(): Logger {
    if (!this._logger) {
      const { getInstance } = require('../ioc/ioc.config') as typeof import('../ioc/ioc.config');
      this._logger = getInstance<Logger>(IocConnection.LOGGER);
    }
    return this._logger!;
  }

  /**
   * Get storage service (lazy-loaded)
   */
  protected get storageService(): IStorageService {
    if (!this._storageService) {
      const { getInstance } = require('../ioc/ioc.config') as typeof import('../ioc/ioc.config');
      this._storageService = getInstance<IStorageService>(IocService.STORAGE);
    }
    return this._storageService!;
  }

  /**
   * Execute a function within a transaction
   *
   * @param fn - Function to execute within transaction context
   * @param tx - Optional existing transaction (for nested transactions)
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * await this.withTrx(async (trx) => {
   *   await trx.insert(table).values(data);
   *   await trx.update(anotherTable).set(update);
   * });
   * ```
   */
  protected async withTrx<T>(fn: (trx: DatabaseConnection) => Promise<T>, tx?: DatabaseConnection): Promise<T> {
    // If already in a transaction, reuse it
    if (tx) {
      return fn(tx);
    }

    // Otherwise, create a new transaction
    return this.db.transaction(async (trx) => {
      return fn(trx);
    });
  }
}
