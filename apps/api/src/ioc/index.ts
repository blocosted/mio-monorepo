/**
 * IoC Container Exports
 *
 * Central dependency injection module for the Mio API.
 */

// Re-export connection types for convenience
export type { IStorageClient, StorageS3Config } from '@mio/shared/server/connections/storage';

// Container configuration
export { container, getInstance, initializeContainer, resetContainer } from './ioc.config';
// Types and identifiers
export {
  BUCKETS,
  type BucketName,
  IocConnection,
  IocRepository,
  IocService,
  IocStore
} from './ioc.types';
