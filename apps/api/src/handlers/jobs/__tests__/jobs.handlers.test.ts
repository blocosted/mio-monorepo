/**
 * Jobs Handlers Integration Tests
 */

import { describe, it, expect, beforeAll } from 'bun:test';

import { createMioApiClient } from '@mio/api/tests/test-utils';
import { MioApiClient } from '@mio/shared/clients/mio';
import { getInstance, IocConnection, IocStore } from '@mio/api/ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { GenerationJobsStore } from '@mio/api/services/stories/generation-jobs.store';
import { Gender } from '@mio/shared/types';

describe('jobsHandlers', () => {
  let mio: MioApiClient;
  let db: DatabaseConnection;
  let jobsStore: GenerationJobsStore;

  beforeAll(() => {
    mio = createMioApiClient();
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    jobsStore = getInstance<GenerationJobsStore>(IocStore.GENERATION_JOBS_STORE);
  });

  it('returns 404 for non-existent job', async () => {
    const id = crypto.randomUUID();
    const res = await mio.api.jobs({ id }).get();

    expect(res.status).toBe(404);
    expect(res.error?.value).toEqual({ error: 'Job not found' });
  });

  it('gets job status for existing job', async () => {
    // Create a story first
    const { stories, childProfiles } = await import('@mio/db/schema');

    const [profile] = await db
      .insert(childProfiles)
      .values({
        firstName: 'Test',
        age: 7,
        gender: Gender.Neutral,
        preferences: {},
      })
      .returning({ id: childProfiles.id });

    const [story] = await db
      .insert(stories)
      .values({
        childProfileId: profile.id,
        initialPrompt: 'Test prompt',
        status: 'draft',
      })
      .returning({ id: stories.id });

    // Create a job
    const job = await jobsStore.create({ storyId: story.id });

    // Get job status
    const res = await mio.api.jobs({ id: job.id }).get();

    expect(res.status).toBe(200);
    expect(res.data?.id).toBe(job.id);
    expect(res.data?.storyId).toBe(story.id);
    expect(res.data?.status).toBe('pending');
  });

  it('cancels an existing job', async () => {
    // Create a story first
    const { stories, childProfiles } = await import('@mio/db/schema');

    const [profile] = await db
      .insert(childProfiles)
      .values({
        firstName: 'Test',
        age: 7,
        gender: Gender.Neutral,
        preferences: {},
      })
      .returning({ id: childProfiles.id });

    const [story] = await db
      .insert(stories)
      .values({
        childProfileId: profile.id,
        initialPrompt: 'Test prompt',
        status: 'draft',
      })
      .returning({ id: stories.id });

    // Create a job
    const job = await jobsStore.create({ storyId: story.id });

    // Cancel the job
    const res = await mio.api.jobs({ id: job.id }).delete();

    expect(res.status).toBe(202);
    expect(res.data?.jobId).toBe(job.id);
    expect(res.data?.message).toBe('Job cancellation requested');

    // Verify job is cancelled in DB
    const cancelled = await jobsStore.findById(job.id);
    expect(cancelled?.status).toBe('cancelled');
  });

  it('returns 404 when cancelling non-existent job', async () => {
    const id = crypto.randomUUID();
    const res = await mio.api.jobs({ id }).delete();

    expect(res.status).toBe(404);
    expect(res.error?.value).toEqual({ error: 'Job not found' });
  });
});

