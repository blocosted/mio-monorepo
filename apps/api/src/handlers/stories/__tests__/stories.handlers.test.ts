/**
 * Stories Handlers Integration Tests
 *
 * Covers handler logic (happy path + AppError propagation via errorHandler).
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { MioApiClient } from '@mio/shared/clients/mio';
import { ErrorCodes, StoryStatus } from '@mio/shared';
import { Gender } from '@mio/shared/types';

import { IocConnection } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { createTestMioApiClient } from '@mio/api/tests/test.helpers';

describe('storiesHandlers', () => {
  let db: DatabaseConnection;
  let mio: MioApiClient;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    mio = createTestMioApiClient();
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  // =========================================================================
  // POST / - Create a story
  // =========================================================================

  describe('POST / - Create story', () => {
    it('creates a story for an existing profile', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Un dragon qui a peur du noir'
      });

      expect(story.id).toBeDefined();
      expect(story.childProfileId).toBe(profile.id);
      expect(story.initialPrompt).toBe('Un dragon qui a peur du noir');
      expect(story.status).toBe(StoryStatus.Draft);
    });

    it('returns NotFound when profile does not exist', async () => {
      await expect(
        mio.stories.createStory({
          childProfileId: '00000000-0000-0000-0000-000000000000',
          prompt: 'Un prompt valide'
        })
      ).rejects.toMatchObject({ code: ErrorCodes.NotFound });
    });

    it('rejects prompt too short', async () => {
      await expect(
        mio.stories.createStory({
          childProfileId: '00000000-0000-0000-0000-000000000000',
          prompt: 'hi'
        })
      ).rejects.toMatchObject({ code: ErrorCodes.ValidationError });
    });

    it('rejects prompt too long', async () => {
      const longPrompt = 'a'.repeat(501);

      await expect(
        mio.stories.createStory({
          childProfileId: '00000000-0000-0000-0000-000000000000',
          prompt: longPrompt
        })
      ).rejects.toMatchObject({ code: ErrorCodes.ValidationError });
    });
  });

  // =========================================================================
  // GET /:id - Get story by ID
  // =========================================================================

  describe('GET /:id - Get story by ID', () => {
    it('returns a story when it exists', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const created = await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Une histoire de licorne'
      });

      const res = await mio.api.stories({ id: created.id }).get();

      expect(res.status).toBe(200);
      expect(res.error).toBeNull();

      const story = res.data as { id: string; initialPrompt: string; status: string };
      expect(story.id).toBe(created.id);
      expect(story.initialPrompt).toBe('Une histoire de licorne');
      expect(story.status).toBe(StoryStatus.Draft);
    });

    it('returns 404 when story does not exist', async () => {
      const res = await mio.api.stories({ id: '00000000-0000-0000-0000-000000000000' }).get();

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const res = await mio.api.stories({ id: 'not-a-uuid' }).get();

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // GET /profile/:profileId - List stories for a profile
  // =========================================================================

  describe('GET /profile/:profileId - List stories for profile', () => {
    it('returns empty array when profile has no stories', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const res = await mio.api.stories.profile({ profileId: profile.id }).get();

      expect(res.status).toBe(200);
      expect(res.data).toEqual([]);
    });

    it('returns all stories for a profile', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Histoire 1'
      });

      await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Histoire 2'
      });

      const res = await mio.api.stories.profile({ profileId: profile.id }).get();

      expect(res.status).toBe(200);

      const stories = res.data as { initialPrompt: string }[];
      expect(stories).toHaveLength(2);
      expect(stories.map((s) => s.initialPrompt)).toContain('Histoire 1');
      expect(stories.map((s) => s.initialPrompt)).toContain('Histoire 2');
    });

    it('returns empty array for non-existent profile', async () => {
      const res = await mio.api.stories.profile({ profileId: '00000000-0000-0000-0000-000000000000' }).get();

      expect(res.status).toBe(200);
      expect(res.data).toEqual([]);
    });

    it('does not return stories from other profiles', async () => {
      const profile1 = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const profile2 = await mio.profiles.createProfile({
        firstName: 'Lucas',
        age: 5,
        gender: Gender.Boy
      });

      await mio.stories.createStory({
        childProfileId: profile1.id,
        prompt: 'Histoire de Emma'
      });

      await mio.stories.createStory({
        childProfileId: profile2.id,
        prompt: 'Histoire de Lucas'
      });

      const res = await mio.api.stories.profile({ profileId: profile1.id }).get();

      expect(res.status).toBe(200);

      const stories = res.data as { initialPrompt: string }[];
      expect(stories).toHaveLength(1);
      expect(stories[0]?.initialPrompt).toBe('Histoire de Emma');
    });
  });

  // =========================================================================
  // POST /:id/enrich - Enrich a story
  // =========================================================================

  describe('POST /:id/enrich - Enrich story', () => {
    it('returns 404 when story does not exist', async () => {
      const res = await mio.api.stories({ id: '00000000-0000-0000-0000-000000000000' }).enrich.post({});

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const res = await mio.api.stories({ id: 'not-a-uuid' }).enrich.post({});

      expect(res.status).toBe(400);
    });

    // Note: Testing the actual enrichment requires mocking the LLM service
    // which is outside the scope of these integration tests
  });

  // =========================================================================
  // POST /:id/generate - Generate a story
  // =========================================================================

  describe('POST /:id/generate - Generate story', () => {
    it('returns 404 when story does not exist', async () => {
      const res = await mio.api.stories({ id: '00000000-0000-0000-0000-000000000000' }).generate.post({
        answers: []
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const res = await mio.api.stories({ id: 'not-a-uuid' }).generate.post({
        answers: []
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 when answers field is missing', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Une histoire'
      });

      // @ts-expect-error - Testing validation without answers field
      const res = await mio.api.stories({ id: story.id }).generate.post({});

      expect(res.status).toBe(400);
    });

    // Note: Testing actual generation requires mocking the workflow orchestrator
    // which is outside the scope of these integration tests
  });

  // =========================================================================
  // DELETE /:id - Delete a story
  // =========================================================================

  describe('DELETE /:id - Delete story', () => {
    it('deletes a story successfully', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Une histoire a supprimer'
      });

      const deleteRes = await mio.api.stories({ id: story.id }).delete();
      expect(deleteRes.status).toBe(204);

      // Verify story is deleted
      const getRes = await mio.api.stories({ id: story.id }).get();
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when story does not exist', async () => {
      const res = await mio.api.stories({ id: '00000000-0000-0000-0000-000000000000' }).delete();

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const res = await mio.api.stories({ id: 'not-a-uuid' }).delete();

      expect(res.status).toBe(400);
    });

    it('deletes story even when profile is deleted (cascade)', async () => {
      const profile = await mio.profiles.createProfile({
        firstName: 'Emma',
        age: 7,
        gender: Gender.Girl
      });

      const story = await mio.stories.createStory({
        childProfileId: profile.id,
        prompt: 'Une histoire'
      });

      // Delete profile first (should cascade to story)
      await mio.api.profiles({ id: profile.id }).delete();

      // Story should no longer exist
      const getRes = await mio.api.stories({ id: story.id }).get();
      expect(getRes.status).toBe(404);
    });
  });
});
