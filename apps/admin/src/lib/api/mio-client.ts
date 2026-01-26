/**
 * MioApiClient Provider for Admin App
 *
 * Singleton provider for the shared MioApiClient.
 * Use getMioApiClient() to get the client instance.
 */

import { MioApiClient } from '@mio/shared/clients/mio';

let clientInstance: MioApiClient | null = null;

/**
 * Get the MioApiClient singleton instance.
 * Creates the instance on first call.
 */
export function getMioApiClient(): MioApiClient {
  if (!clientInstance) {
    clientInstance = new MioApiClient();
  }
  return clientInstance;
}
