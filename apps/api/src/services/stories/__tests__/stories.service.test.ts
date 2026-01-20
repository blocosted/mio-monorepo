/**
 * Stories Service Integration Tests
 *
 * Tests the StoriesService and StoriesStore with a real PostgreSQL database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@mio/db/schema';
import { ErrorCodes, Gender, StoryStatus } from '@mio/shared';

import { DEFAULT_TEST_CONFIG, cleanTestPostgresData } from '../../../tests/test-utils';
import { ProfilesStore } from '../../profiles/profiles.service.store';
import { StoriesStore } from '../stories.service.store';
import { StoriesService } from '../stories.service';
import type { IProfilesStore } from '../../profiles/profiles.service.types';
import type { IStoriesStore } from '../stories.service.types';

// Create test database connection
const client = postgres(DEFAULT_TEST_CONFIG.databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

// Create a mock store that uses the test database
class TestProfilesStore extends ProfilesStore {
    constructor() {
        // Bypass DI by directly assigning the db
        super(undefined as never);
        (this as { db: typeof db }).db = db;
    }
}

class TestStoriesStore extends StoriesStore {
    constructor() {
        // Bypass DI by directly assigning the db
        super(undefined as never);
        (this as { db: typeof db }).db = db;
    }
}

describe('StoriesService', () => {
    let profilesStore: IProfilesStore;
    let storiesStore: IStoriesStore;
    let service: StoriesService;

    beforeEach(async () => {
        // Clean up database before each test
        await cleanTestPostgresData(db);

        // Create fresh instances
        profilesStore = new TestProfilesStore();
        storiesStore = new TestStoriesStore();
        service = new StoriesService(storiesStore, profilesStore);
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

