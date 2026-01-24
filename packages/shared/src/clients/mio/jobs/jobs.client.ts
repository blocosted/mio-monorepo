import type { MioApiClient } from '..';
import type { CancelJobResponse, JobStatusResponse } from './index';

export class MioApiJobsClient {
  public readonly client: MioApiClient;

  constructor(client: MioApiClient) {
    this.client = client;
  }

  public async getJobStatus(id: string): Promise<JobStatusResponse> {
    const res = await this.client.api.jobs({ id }).get({ headers: this.client.headers });

    if (res.status === 200 && res.data) {
      return res.data as unknown as JobStatusResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to get job status: ${res.status} - ${JSON.stringify(res.error)}`);
  }

  public async cancelJob(id: string): Promise<CancelJobResponse> {
    const res = await this.client.api.jobs({ id }).delete({ headers: this.client.headers });

    if (res.status === 202 && res.data) {
      return res.data as unknown as CancelJobResponse;
    }

    if (res.error) {
      this.client.throwFromTreatyError(res.error);
    }

    throw new Error(`Failed to cancel job: ${res.status} - ${JSON.stringify(res.error)}`);
  }
}
