/**
 * Voices Admin Client
 *
 * HTTP client methods for voice admin endpoints.
 */

import type { MioApiClient } from '../..';
import type { PaginatedResponse, CursorPagination } from '../common';
import type { VoiceFilters, Voice } from './voices.client.types';

const DEFAULT_LIMIT = 20;

export class VoicesAdminClient {
  constructor(private readonly client: MioApiClient) {}

  public async getVoices(filters?: VoiceFilters, pagination?: CursorPagination): Promise<PaginatedResponse<Voice>> {
    const res = await this.client.api.admin.voices.get({
      query: {
        ...filters,
        cursor: pagination?.cursor,
        limit: pagination?.limit ?? DEFAULT_LIMIT
      },
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as PaginatedResponse<Voice>;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch voices: ${res.status}`);
  }
}
