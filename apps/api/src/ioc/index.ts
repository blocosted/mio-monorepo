/**
 * IoC Container Exports
 *
 * Central dependency injection module for the Mio API.
 */

// Types and identifiers
export {
    IocInfrastructure,
    IocService,
    BUCKETS,
    type BucketName,
} from './ioc.types';

// Container configuration
export { container, getInstance, resetContainer } from './ioc.config';

// Re-export connection types for convenience
export type { StorageS3Config, IStorageClient } from '../connections/storage';
