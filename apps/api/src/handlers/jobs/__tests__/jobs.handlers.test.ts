/**
 * Jobs Handlers Integration Tests
 */

import { describe, it, expect, beforeAll } from 'bun:test';

import { createMioApiClient } from '@mio/api/tests/test-utils';
import { MioApiClient } from '@mio/shared/clients/mio';

describe('jobsHandlers', () => {
  let mio: MioApiClient;

  beforeAll(() => {
    mio = createMioApiClient();
  });

  it('gets job status', async () => {
    const id = crypto.randomUUID();
    const res = await mio.api.jobs({ id }).get();

    expect(res.status).toBe(200);
    expect(res.data?.id).toBe(id);
  });

  it('cancels a job', async () => {
    const id = crypto.randomUUID();
    const res = await mio.api.jobs({ id }).delete();

    expect(res.status).toBe(202);
    expect(res.data?.jobId).toBe(id);
  });
});

