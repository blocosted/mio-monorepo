/**
 * Profiles Service Integration Tests
 *
 * Tests the ProfilesService and ProfilesStore with a real PostgreSQL database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import { Gender, StoryDuration, Language } from '@mio/shared/types';

import { cleanTestPostgresData } from '../../../tests/test-utils';
import { assertNotNull } from '../../../tests/test.helpers';
import { getInstance, IocConnection, IocService } from '../../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { IProfilesService } from '../profiles.service.types';

describe('ProfilesService', () => {
    let db: DatabaseConnection;
    let service: IProfilesService;

    beforeAll(() => {
        // Use IoC to resolve real instances with injected dependencies.
        db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
        service = getInstance<IProfilesService>(IocService.PROFILES);
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
        it('creates a profile with valid data', async () => {
            const input = {
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            };

            const profile = await service.create(input);

            expect(profile.id).toBeDefined();
            expect(profile.firstName).toBe('Emma');
            expect(profile.age).toBe(7);
            expect(profile.gender).toBe(Gender.Girl);
            expect(profile.preferences).toEqual({});
            expect(profile.createdAt).toBeInstanceOf(Date);
            expect(profile.updatedAt).toBeInstanceOf(Date);
        });

        it('creates a profile with preferences', async () => {
            const input = {
                firstName: 'Lucas',
                age: 5,
                gender: Gender.Boy,
                preferences: {
                    favoriteThemes: ['dragons', 'pirates'],
                    avoidThemes: ['scary'],
                    preferredStoryDuration: StoryDuration.Medium,
                    language: Language.French,
                },
            };

            const profile = await service.create(input);

            expect(profile.firstName).toBe('Lucas');
            expect(profile.preferences.favoriteThemes).toEqual(['dragons', 'pirates']);
            expect(profile.preferences.avoidThemes).toEqual(['scary']);
            expect(profile.preferences.preferredStoryDuration).toBe(StoryDuration.Medium);
            expect(profile.preferences.language).toBe(Language.French);
        });

        it('creates a profile with gender neutral', async () => {
            const input = {
                firstName: 'Alex',
                age: 8,
                gender: Gender.Neutral,
            };

            const profile = await service.create(input);

            expect(profile.gender).toBe(Gender.Neutral);
        });

        it('creates a profile with minimum age (3)', async () => {
            const input = {
                firstName: 'Baby',
                age: 3,
                gender: Gender.Girl,
            };

            const profile = await service.create(input);

            expect(profile.age).toBe(3);
        });

        it('creates a profile with maximum age (12)', async () => {
            const input = {
                firstName: 'Preteen',
                age: 12,
                gender: Gender.Boy,
            };

            const profile = await service.create(input);

            expect(profile.age).toBe(12);
        });
    });

    describe('getById()', () => {
        it('returns profile when found', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            const found = await service.getById(created.id);

            assertNotNull(found);
            expect(found.id).toBe(created.id);
            expect(found.firstName).toBe('Emma');
        });

        it('returns null when profile not found', async () => {
            const found = await service.getById('00000000-0000-0000-0000-000000000000');

            expect(found).toBeNull();
        });
    });

    describe('getAll()', () => {
        it('returns empty array when no profiles', async () => {
            const profiles = await service.getAll();

            expect(profiles).toEqual([]);
        });

        it('returns all profiles', async () => {
            await service.create({ firstName: 'Emma', age: 7, gender: Gender.Girl });
            await service.create({ firstName: 'Lucas', age: 5, gender: Gender.Boy });

            const profiles = await service.getAll();

            expect(profiles.length).toBe(2);
            expect(profiles.map((p) => p.firstName).sort()).toEqual(['Emma', 'Lucas']);
        });
    });

    describe('update()', () => {
        it('updates firstName', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            const updated = await service.update(created.id, { firstName: 'Emilie' });

            assertNotNull(updated);
            expect(updated.firstName).toBe('Emilie');
            expect(updated.age).toBe(7);
        });

        it('updates age', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            const updated = await service.update(created.id, { age: 8 });

            assertNotNull(updated);
            expect(updated.age).toBe(8);
        });

        it('updates gender', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            const updated = await service.update(created.id, { gender: Gender.Neutral });

            assertNotNull(updated);
            expect(updated.gender).toBe(Gender.Neutral);
        });

        it('updates preferences', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            const updated = await service.update(created.id, {
                preferences: {
                    favoriteThemes: ['princesses'],
                    language: Language.English,
                },
            });

            assertNotNull(updated);
            expect(updated.preferences.favoriteThemes).toEqual(['princesses']);
            expect(updated.preferences.language).toBe(Language.English);
        });

        it('returns null when profile not found', async () => {
            const updated = await service.update('00000000-0000-0000-0000-000000000000', {
                firstName: 'Test',
            });

            expect(updated).toBeNull();
        });

        it('updates updatedAt timestamp', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            // Wait a bit to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 10));

            const updated = await service.update(created.id, { firstName: 'Emilie' });

            assertNotNull(updated);
            expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
        });
    });

    describe('delete()', () => {
        it('deletes profile successfully', async () => {
            const created = await service.create({
                firstName: 'Emma',
                age: 7,
                gender: Gender.Girl,
            });

            const deleted = await service.delete(created.id);

            expect(deleted).toBe(true);

            const found = await service.getById(created.id);
            expect(found).toBeNull();
        });

        it('returns false when profile not found', async () => {
            const deleted = await service.delete('00000000-0000-0000-0000-000000000000');

            expect(deleted).toBe(false);
        });
    });
});
