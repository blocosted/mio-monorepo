import type { MioApiClient } from '..';

export type CreateProfileParams = {
    firstName: string;
    age: number;
    gender: 'boy' | 'girl' | 'neutral';
};

export type ProfileResponse = {
    id: string;
    firstName: string;
    age: number;
    gender: 'boy' | 'girl' | 'neutral';
    preferences: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
};

export class MioApiProfilesClient {
    public readonly client: MioApiClient;

    constructor(client: MioApiClient) {
        this.client = client;
    }

    public async createProfile(params: CreateProfileParams): Promise<ProfileResponse> {
        const res = await this.client.api.profiles.post(params, { headers: this.client.headers });

        if (res.status === 201 && res.data) {
            return res.data as unknown as ProfileResponse;
        }

        if (res.error) {
            this.client.throwFromTreatyError(res.error);
        }

        throw new Error(`Failed to create profile: ${res.status} - ${JSON.stringify(res.error)}`);
    }
}

