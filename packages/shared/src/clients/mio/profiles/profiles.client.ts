import type { MioApiClient } from '..';
import type { CreateProfileBody as CreateProfileParams, ProfileResponse } from './index';

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

