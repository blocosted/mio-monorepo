/**
 * Stories Service Integration Tests
 *
 * Tests the StoriesService and StoriesStore with a real PostgreSQL database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import { ErrorCodes, Gender, StoryStatus } from '@mio/shared';

import { cleanTestPostgresData } from '../../../tests/test-utils';
import { getInstance, IocConnection, IocService, IocStore } from '../../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { IProfilesStore } from '../../profiles/profiles.service.types';
import type { IStoriesService } from '../stories.service.types';

describe('StoriesService', () => {
    let db: DatabaseConnection;
    let profilesStore: IProfilesStore;
    let service: IStoriesService;

    beforeAll(() => {
        // Use IoC to resolve real instances with injected dependencies.
        db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
        profilesStore = getInstance<IProfilesStore>(IocStore.PROFILES_STORE);
        service = getInstance<IStoriesService>(IocService.STORIES);
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
                gender: Gender.Girl,
            });

            const story = await service.create({
                childProfileId: profile.id,
                prompt: 'Un dragon qui a peur du noir',
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
                    prompt: 'Test prompt',
                })
            ).rejects.toMatchObject({ code: ErrorCodes.NotFound, name: 'ChildProfileNotFound' });
        });
    });
});

