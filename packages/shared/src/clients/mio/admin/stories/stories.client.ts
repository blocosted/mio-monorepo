/**
 * Stories Admin Client
 *
 * HTTP client methods for stories admin endpoints.
 */

import type { MioApiClient } from '../..';
import type { PaginatedResponse, CursorPagination } from '../common';
import type {
  StoryFilters,
  AdminStory,
  StorySegment,
  AudioAsset,
  UpdateStoryPromptResponse
} from './stories.client.types';

const DEFAULT_LIMIT = 20;

export class StoriesAdminClient {
  constructor(private readonly client: MioApiClient) {}

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
    const res = await this.client.api.admin.stories({ id }).patch({ prompt }, { headers: this.client.headers });

    if (res.status === 200 && res.data) {
      return res.data as unknown as UpdateStoryPromptResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to update story prompt: ${res.status}`);
  }
}
