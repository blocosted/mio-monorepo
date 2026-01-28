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
  UpdateStoryPromptResponse,
  CreateAndGenerateStoryBody,
  CreateAndGenerateStoryResponse,
  RegenerateStoryBody,
  RegenerateStoryResponse,
  ComputedTimelineResponse,
  RemixStoryResponse
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

  public async createAndGenerateStory(body: CreateAndGenerateStoryBody): Promise<CreateAndGenerateStoryResponse> {
    const res = await this.client.api.admin.stories.generate.post(body, {
      headers: this.client.headers
    });

    if (res.status === 202 && res.data) {
      return res.data as unknown as CreateAndGenerateStoryResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to create and generate story: ${res.status}`);
  }

  public async regenerateStory(storyId: string, body?: RegenerateStoryBody): Promise<RegenerateStoryResponse> {
    const res = await this.client.api.admin.stories({ id: storyId }).regenerate.post(body ?? {}, {
      headers: this.client.headers
    });

    if (res.status === 202 && res.data) {
      return res.data as unknown as RegenerateStoryResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to regenerate story: ${res.status}`);
  }

  public async getStoryComputedTimeline(storyId: string): Promise<ComputedTimelineResponse> {
    const res = await this.client.api.admin.stories({ id: storyId })['computed-timeline'].get({
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as ComputedTimelineResponse;
    }

    // 404 is expected when timeline not yet computed
    if (res.status === 404) {
      return { computed: false };
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to fetch computed timeline: ${res.status}`);
  }

  public async remixStory(storyId: string): Promise<RemixStoryResponse> {
    const res = await this.client.api.admin.stories({ id: storyId }).remix.post({}, {
      headers: this.client.headers
    });

    if (res.status === 200 && res.data) {
      return res.data as unknown as RemixStoryResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to remix story: ${res.status}`);
  }
}
