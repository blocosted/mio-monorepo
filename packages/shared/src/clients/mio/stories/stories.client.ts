import type { MioApiClient } from '..';

export type CreateStoryParams = {
    childProfileId: string;
    prompt: string;
};

export type StoryResponse = {
    id: string;
    childProfileId: string;
    initialPrompt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
};

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

