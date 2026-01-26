import type { MioApiClient } from '..';
import type {
  CreateStoryBody,
  StoryResponse,
  EnrichStoryBody,
  EnrichStoryResponse,
  GenerateStoryBody,
  GenerateStoryResponse
} from './index';

export class MioApiStoriesClient {
  public readonly client: MioApiClient;

  constructor(client: MioApiClient) {
    this.client = client;
  }

  public async createStory(params: CreateStoryBody): Promise<StoryResponse> {
    const res = await this.client.api.stories.post(params, { headers: this.client.headers });

    if (res.status === 201 && res.data) {
      return res.data as unknown as StoryResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to create story: ${res.status} - ${JSON.stringify(res.error)}`);
  }

  public async enrichStory(id: string, body?: EnrichStoryBody): Promise<EnrichStoryResponse> {
    const res = await this.client.api.stories({ id }).enrich.post(body ?? {}, { headers: this.client.headers });

    if (res.status === 200 && res.data) {
      return res.data as unknown as EnrichStoryResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to enrich story: ${res.status}`);
  }

  public async generateStory(id: string, body: GenerateStoryBody): Promise<GenerateStoryResponse> {
    const res = await this.client.api.stories({ id }).generate.post(body, { headers: this.client.headers });

    if (res.status === 202 && res.data) {
      return res.data as unknown as GenerateStoryResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to generate story: ${res.status}`);
  }

  public async deleteStory(id: string): Promise<void> {
    const res = await this.client.api.stories({ id }).delete({ headers: this.client.headers });

    if (res.status === 204) {
      return;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to delete story: ${res.status}`);
  }
}
