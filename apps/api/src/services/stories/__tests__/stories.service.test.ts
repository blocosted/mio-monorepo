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

  describe('findPaginated()', () => {
    it('returns empty result when no stories', async () => {
      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('returns paginated stories', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      await service.create({ childProfileId: profile.id, prompt: 'Story 1' });
      await service.create({ childProfileId: profile.id, prompt: 'Story 2' });
      await service.create({ childProfileId: profile.id, prompt: 'Story 3' });

      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows.length).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('filters by status', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      await service.create({ childProfileId: profile.id, prompt: 'Draft story' });

      const result = await service.findPaginated({ status: StoryStatus.Draft }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe(StoryStatus.Draft);
    });

    it('filters by childProfileId', async () => {
      const profile1 = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });
      const profile2 = await profilesStore.insert({
        firstName: 'Lucas',
        age: 5,
        gender: Gender.Boy
      });

      await service.create({ childProfileId: profile1.id, prompt: 'Emma story 1' });
      await service.create({ childProfileId: profile1.id, prompt: 'Emma story 2' });
      await service.create({ childProfileId: profile2.id, prompt: 'Lucas story' });

      const result = await service.findPaginated({ childProfileId: profile1.id }, { limit: 10 });

      expect(result.rows.length).toBe(2);
      expect(result.rows.every((s) => s.childProfileId === profile1.id)).toBe(true);
    });

    it('filters by search term', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      await service.create({ childProfileId: profile.id, prompt: 'A dragon adventure' });
      await service.create({ childProfileId: profile.id, prompt: 'A pirate story' });
      await service.create({ childProfileId: profile.id, prompt: 'Dragon in the forest' });

      const result = await service.findPaginated({ search: 'dragon' }, { limit: 10 });

      expect(result.rows.length).toBe(2);
    });

    it('paginates with cursor', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      await service.create({ childProfileId: profile.id, prompt: 'Story 1' });
      await service.create({ childProfileId: profile.id, prompt: 'Story 2' });
      await service.create({ childProfileId: profile.id, prompt: 'Story 3' });

      const firstPage = await service.findPaginated({}, { limit: 2 });

      expect(firstPage.rows.length).toBe(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      const secondPage = await service.findPaginated({}, { limit: 2, cursor: firstPage.nextCursor! });

      expect(secondPage.rows.length).toBe(1);
      expect(secondPage.hasMore).toBe(false);
    });
  });

  describe('updatePrompt()', () => {
    it('updates prompt for a draft story', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await service.create({
        childProfileId: profile.id,
        prompt: 'Original prompt'
      });

      await service.updatePrompt(story.id, 'Updated prompt');

      const updated = await service.findById(story.id);
      expect(updated?.initialPrompt).toBe('Updated prompt');
    });

    it('throws NotFound when story does not exist', async () => {
      await expect(service.updatePrompt('00000000-0000-0000-0000-000000000000', 'New prompt')).rejects.toMatchObject({
        code: ErrorCodes.NotFound,
        name: 'StoryNotFound'
      });
    });

    it('throws ValidationError when story is not in draft status', async () => {
      const profile = await profilesStore.insert({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await service.create({
        childProfileId: profile.id,
        prompt: 'Original prompt'
      });

      // Manually update story status to 'generating' to simulate non-draft state
      const { IocStore, getInstance } = await import('../../../ioc');
      const storiesStore = getInstance<any>(IocStore.STORIES_STORE);
      await storiesStore.updateScript(story.id, { scenes: [] });

      await expect(service.updatePrompt(story.id, 'New prompt')).rejects.toMatchObject({
        code: ErrorCodes.ValidationError,
        name: 'StoryNotDraft'
      });
    });
  });
});
