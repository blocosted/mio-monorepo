/**
 * Admin API Client
 *
 * HTTP client for admin API endpoints using Eden treaty.
 * Provides type-safe methods for all admin operations.
 */

import type { MioApiClient } from '..';
import type {
  VoiceFilters,
  Voice,
  SfxFilters,
  SfxTrack,
  AmbianceFilters,
  AmbianceTrack,
  MusicFilters,
  MusicTrack,
  StoryFilters,
  AdminStory,
  StorySegment,
  AudioAsset,
  ProfileFilters,
  AdminProfile,
  PaginatedResponse,
  CursorPagination,
  UpdateStoryPromptResponse
} from './index';

const DEFAULT_LIMIT = 20;

export class MioApiAdminClient {
  public readonly client: MioApiClient;

  constructor(client: MioApiClient) {
    this.client = client;
  }

  // ===========================================================================
  // Voices
  // ===========================================================================

  public async getVoices(
    filters?: VoiceFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<Voice>> {
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

  // ===========================================================================
  // SFX
  // ===========================================================================

  public async getSfx(
    filters?: SfxFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<SfxTrack>> {
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

  public async getMusic(
    filters?: MusicFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<MusicTrack>> {
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

  // ===========================================================================
  // Stories
  // ===========================================================================

  public async getStories(
    filters?: StoryFilters,
    pagination?: CursorPagination
  ): Promise<PaginatedResponse<AdminStory>> {
    const res = await this.client.api.admin.stories.get({
      query: {
        ...filters,
        cursor: pagination?.cursor,
        limit: pagination?.limit ?? DEFAULT_LIMIT
      },
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as PaginatedResponse<AdminStory>;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch stories: ${res.status}`);
  }

  public async getStory(id: string): Promise<AdminStory> {
    const res = await this.client.api.admin.stories({ id }).get({
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as AdminStory;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch story: ${res.status}`);
  }

  public async getStorySegments(storyId: string): Promise<StorySegment[]> {
    const res = await this.client.api.admin.stories({ id: storyId }).segments.get({
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      const response = res.data as unknown as { data: StorySegment[] };
      return response.data;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch story segments: ${res.status}`);
  }

  public async getStoryAudioAssets(storyId: string): Promise<AudioAsset[]> {
    const res = await this.client.api.admin.stories({ id: storyId })['audio-assets'].get({
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      const response = res.data as unknown as { data: AudioAsset[] };
      return response.data;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch story audio assets: ${res.status}`);
  }

  public async updateStoryPrompt(id: string, prompt: string): Promise<UpdateStoryPromptResponse> {
    const res = await this.client.api.admin.stories({ id }).patch(
      { prompt },
      { headers: this.client.headers }
    );

    if (res.status === 200 && res.data) {
      return res.data as unknown as UpdateStoryPromptResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to update story prompt: ${res.status}`);
  }

  // ===========================================================================
  // Profiles
  // ===========================================================================

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
