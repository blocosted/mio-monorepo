/**
 * Stories Handlers Integration Tests
 *
 * Covers handler logic (happy path + AppError propagation via errorHandler).
 */

import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { treaty } from '@elysiajs/eden';

import { createApiApp } from '../../../api.server';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { getInstance, IocConnection } from '../../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { MioApiClient } from '@mio/shared/clients/mio';
import { ErrorCodes, StoryStatus } from '@mio/shared';
import { Gender } from '@mio/shared/types';

describe('storiesHandlers', () => {
  let db: DatabaseConnection;
  let mio: MioApiClient;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    const app = createApiApp();
    const api = treaty(app);
    mio = new MioApiClient({ apiClient: api });
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  it('creates a story for an existing profile', async () => {
    const profile = await mio.profiles.createProfile({
      firstName: 'Emma',
      age: 7,
      gender: Gender.Girl,
    });

    const story = await mio.stories.createStory({
      childProfileId: profile.id,
      prompt: 'Un dragon qui a peur du noir',
    });

    expect(story.id).toBeDefined();
    expect(story.childProfileId).toBe(profile.id);
    expect(story.initialPrompt).toBe('Un dragon qui a peur du noir');
    expect(story.status).toBe(StoryStatus.Draft);
  });

  it('returns NotFound AppError when profile does not exist', async () => {
    await expect(
      mio.stories.createStory({
        childProfileId: '00000000-0000-0000-0000-000000000000',
        prompt: 'Un prompt valide',
      })
    ).rejects.toMatchObject({ code: ErrorCodes.NotFound });
  });
});

