/**
 * Audio Library Admin Client
 *
 * HTTP client methods for SFX, Ambiance, and Music admin endpoints.
 */

import type { MioApiClient } from '../..';
import type { PaginatedResponse, CursorPagination } from '../common';
import type { SfxFilters, SfxTrack, AmbianceFilters, AmbianceTrack, MusicFilters, MusicTrack } from './audio-library.client.types';

const DEFAULT_LIMIT = 20;

export class AudioLibraryAdminClient {
  constructor(private readonly client: MioApiClient) {}

  // ===========================================================================
  // SFX
  // ===========================================================================

  public async getSfx(filters?: SfxFilters, pagination?: CursorPagination): Promise<PaginatedResponse<SfxTrack>> {
    const res = await this.client.api.admin['audio-library'].sfx.get({
      query: {
        ...filters,
        cursor: pagination?.cursor,
        limit: pagination?.limit ?? DEFAULT_LIMIT
      },
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as PaginatedResponse<SfxTrack>;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch SFX: ${res.status}`);
  }

  // ===========================================================================
  // Ambiance
  // ===========================================================================

  public async getAmbiance(
    filters?: AmbianceFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<AmbianceTrack>> {
    const res = await this.client.api.admin['audio-library'].ambiance.get({
      query: {
        ...filters,
        cursor: pagination?.cursor,
        limit: pagination?.limit ?? DEFAULT_LIMIT
      },
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as PaginatedResponse<AmbianceTrack>;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch ambiance: ${res.status}`);
  }

  // ===========================================================================
  // Music
  // ===========================================================================

  public async getMusic(filters?: MusicFilters, pagination?: CursorPagination): Promise<PaginatedResponse<MusicTrack>> {
    const res = await this.client.api.admin['audio-library'].music.get({
      query: {
        ...filters,
        cursor: pagination?.cursor,
        limit: pagination?.limit ?? DEFAULT_LIMIT
      },
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as PaginatedResponse<MusicTrack>;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch music: ${res.status}`);
  }
}
