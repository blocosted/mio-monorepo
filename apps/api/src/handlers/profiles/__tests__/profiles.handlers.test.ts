/**
 * Profiles Handlers Integration Tests
 *
 * Covers the real HTTP layer (Elysia + Treaty) and the handler mappers.
 */

import type { MioApiClient } from '@mio/shared/clients/mio';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { createMioApiClient } from '@mio/api/tests/test-utils';
import { Gender } from '@mio/shared/types';

import { IocConnection } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('profilesHandlers', () => {
  let db: DatabaseConnection;
  let mio: MioApiClient;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    mio = createMioApiClient();
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  it('creates a profile', async () => {
    const created = await mio.profiles.createProfile({
      firstName: 'Emma',
      age: 7,
      gender: Gender.Girl
    });

    expect(created.id).toBeDefined();
    expect(created.firstName).toBe('Emma');
    expect(created.age).toBe(7);
    expect(created.gender).toBe(Gender.Girl);
    expect(created.preferences).toEqual({});
    // In-memory `treaty(app)` can preserve Date objects; real HTTP will serialize to strings.
    const createdAt = (created as unknown as { createdAt: unknown }).createdAt;
    const updatedAt = (created as unknown as { updatedAt: unknown }).updatedAt;
    expect(createdAt instanceof Date || typeof createdAt === 'string').toBe(true);
    expect(updatedAt instanceof Date || typeof updatedAt === 'string').toBe(true);
  });

  it('returns 404 when profile is not found', async () => {
    const res = await mio.api.profiles({ id: '00000000-0000-0000-0000-000000000000' }).get();
    expect(res.status).toBe(404);
  });

  it('updates a profile', async () => {
    const created = await mio.profiles.createProfile({
      firstName: 'Emma',
      age: 7,
      gender: Gender.Girl
    });

    const res = await mio.api.profiles({ id: created.id }).patch({ firstName: 'Emilie' });

    expect(res.status).toBe(200);
    expect(res.error).toBeNull();

    const data = res.data as { firstName: string };
    expect(data.firstName).toBe('Emilie');
  });

  it('deletes a profile', async () => {
    const created = await mio.profiles.createProfile({
      firstName: 'Emma',
      age: 7,
      gender: Gender.Girl
    });

    const del = await mio.api.profiles({ id: created.id }).delete();
    expect(del.status).toBe(204);
  });
});
