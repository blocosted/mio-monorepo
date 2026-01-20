import type { MioApiClient } from '..';
import type { CreateStoryBody as CreateStoryParams, StoryResponse } from './index';

export class MioApiStoriesClient {
    public readonly client: MioApiClient;

    constructor(client: MioApiClient) {
        this.client = client;
    }

    public async createStory(params: CreateStoryParams): Promise<StoryResponse> {
        const res = await this.client.api.stories.post(params, { headers: this.client.headers });

        if (res.status === 201 && res.data) {
            return res.data as unknown as StoryResponse;
        }

        if (res.error) {
            this.client.throwFromTreatyError(res.error);
        }

        throw new Error(`Failed to create story: ${res.status} - ${JSON.stringify(res.error)}`);
    }
}

