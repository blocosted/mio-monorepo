/**
 * QStash Workflow Client
 *
 * Provides a singleton QStash client for triggering and managing workflows.
 * Uses environment variables for configuration.
 */

import { Client } from '@upstash/workflow';

import { environment } from '@mio/shared/constants/environment.constants';

let clientInstance: Client | null = null;

/**
 * Get or create the QStash workflow client instance
 */
export function getWorkflowClient(): Client {
  if (!clientInstance) {
    const token = environment.QSTASH_TOKEN;
    const url = environment.QSTASH_URL;

    if (!token) {
      throw new Error('QSTASH_TOKEN is not configured');
    }

    clientInstance = new Client({
      token,
      baseUrl: url ?? 'http://localhost:8082'
    });
  }

  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetWorkflowClient(): void {
  clientInstance = null;
}
