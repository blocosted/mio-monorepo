/**
 * Stories Service Integration Tests
 *
 * Tests the StoriesService and StoriesStore with a real PostgreSQL database.
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { ErrorCodes, Gender, StoryStatus } from '@mio/shared';

import type { ProfilesStore } from '../../profiles/profiles.store';
import type { StoriesService } from '../stories.service';
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('StoriesService', () => {
  let db: DatabaseConnection;
  let profilesStore: ProfilesStore;
  let service: StoriesService;

  beforeAll(() => {
    // Use IoC to resolve real instances with injected dependencies.
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    profilesStore = getInstance<ProfilesStore>(IocStore.PROFILES_STORE);
    service = getInstance<StoriesService>(IocService.STORIES);
  });

  beforeEach(async () => {
    // Clean up database before each test
    await cleanTestPostgresData(db);
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanTestPostgresData(db);
  });

  describe('create()', () => {
    it('creates a story with a valid profile', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await service.create({
        childProfileId: profile.id,
        prompt: 'Un dragon qui a peur du noir'
      });

      expect(story.id).toBeDefined();
      expect(story.childProfileId).toBe(profile.id);
      expect(story.initialPrompt).toBe('Un dragon qui a peur du noir');
      expect(story.status).toBe(StoryStatus.Draft);
      expect(story.createdAt).toBeInstanceOf(Date);
      expect(story.updatedAt).toBeInstanceOf(Date);
    });

    it('throws NotFound AppError when profile does not exist', async () => {
      await expect(
        service.create({
          childProfileId: '00000000-0000-0000-0000-000000000000',
          prompt: 'Test prompt'
        })
      ).rejects.toMatchObject({ code: ErrorCodes.NotFound, name: 'ChildProfileNotFound' });
    });
  });

  describe('findById()', () => {
    it('returns story when found', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Tom',
        age: 8,
        gender: Gender.Boy
      });

      const created = await service.create({
        childProfileId: profile.id,
        prompt: "Un pirate à la recherche d'un trésor"
      });

      const found = await service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.childProfileId).toBe(profile.id);
      expect(found.initialPrompt).toBe("Un pirate à la recherche d'un trésor");
    });

    it('returns null when story not found', async () => {
      const found = await service.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('createGenerationJob()', () => {
    it('creates a generation job for a story', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Sophie',
        age: 6,
        gender: Gender.Girl
      });

      const story = await service.create({
        childProfileId: profile.id,
        prompt: "Une aventure dans l'espace"
      });

      const job = await service.createGenerationJob(story.id);

      expect(job.id).toBeDefined();
      expect(job.storyId).toBe(story.id);
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('enforces unique constraint on story_id', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Alex',
        age: 9,
        gender: Gender.Neutral
      });

      const story = await service.create({
        childProfileId: profile.id,
        prompt: 'Une histoire de super-héros'
      });

      const job1 = await service.createGenerationJob(story.id);
      expect(job1.storyId).toBe(story.id);

      // Should fail due to unique constraint
      await expect(service.createGenerationJob(story.id)).rejects.toThrow(/duplicate key/);
    });
  });

  describe('updateJobWorkflowRunId()', () => {
    it('updates workflow run ID for a job', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Lucas',
        age: 7,
        gender: Gender.Boy
      });

      const story = await service.create({
        childProfileId: profile.id,
        prompt: 'Un voyage au fond des océans'
      });

      const job = await service.createGenerationJob(story.id);
      const workflowRunId = `wfr_${crypto.randomUUID()}`;

      await service.updateJobWorkflowRunId(job.id, workflowRunId);

      // Verify the update by reading the job from the store
      const { IocStore, getInstance } = await import('../../../ioc');
      const jobsStore = getInstance<any>(IocStore.GENERATION_JOBS_STORE);
      const updatedJob = await jobsStore.findById(job.id);

      expect(updatedJob.workflowRunId).toBe(workflowRunId);
    });

    it('handles updating non-existent job gracefully', async () => {
      const nonExistentJobId = '00000000-0000-0000-0000-000000000000';
      const workflowRunId = 'wfr_test';

      // Should not throw - just silently fail or return
      await expect(service.updateJobWorkflowRunId(nonExistentJobId, workflowRunId)).resolves.toBeUndefined();
    });
  });
});
