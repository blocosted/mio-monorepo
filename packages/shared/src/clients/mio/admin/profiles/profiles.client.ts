/**
 * Profiles Admin Client
 *
 * HTTP client methods for profiles admin endpoints.
 */

import type { MioApiClient } from '../..';
import type { PaginatedResponse, CursorPagination } from '../common';
import type { ProfileFilters, AdminProfile } from './profiles.client.types';

const DEFAULT_LIMIT = 20;

export class ProfilesAdminClient {
  constructor(private readonly client: MioApiClient) {}

  public async getProfiles(
    filters?: ProfileFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<AdminProfile>> {
    const res = await this.client.api.admin.profiles.get({
      query: {
        ...filters,
        cursor: pagination?.cursor,
        limit: pagination?.limit ?? DEFAULT_LIMIT
      },
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as PaginatedResponse<AdminProfile>;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch profiles: ${res.status}`);
  }
}
