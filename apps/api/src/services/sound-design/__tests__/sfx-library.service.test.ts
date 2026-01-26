/**
 * SFX Library Service Integration Tests
 *
 * Tests the SfxLibraryService findPaginated() method with a real PostgreSQL database.
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { AudioIntensity, SfxEnvironment, SfxLibraryCategory } from '@mio/shared/types';

import type { SfxLibraryService } from '../sfx-library.service';
import type { SfxLibraryStore } from '../sfx-library.store';
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('SfxLibraryService', () => {
  let db: DatabaseConnection;
  let store: SfxLibraryStore;
  let service: SfxLibraryService;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    store = getInstance<SfxLibraryStore>(IocStore.SFX_LIBRARY_STORE);
    service = getInstance<SfxLibraryService>(IocService.SFX_LIBRARY);
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  afterEach(async () => {
    await cleanTestPostgresData(db);
  });

  describe('findPaginated()', () => {
    it('returns empty result when no SFX', async () => {
      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('returns paginated SFX', async () => {
      await store.insert({
        canonicalKey: 'sfx-1',
        category: SfxLibraryCategory.Ambient,
        prompt: 'Birds chirping',
        s3Url: 'https://storage.test/sfx-1.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'sfx-2',
        category: SfxLibraryCategory.Effects,
        prompt: 'Explosion',
        s3Url: 'https://storage.test/sfx-2.mp3',
        durationSeconds: 3,
        format: 'mp3'
      });

      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows.length).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('filters by category', async () => {
      await store.insert({
        canonicalKey: 'ambient-sfx',
        category: SfxLibraryCategory.Ambient,
        prompt: 'Birds',
        s3Url: 'https://storage.test/ambient.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'effects-sfx',
        category: SfxLibraryCategory.Effects,
        prompt: 'Explosion',
        s3Url: 'https://storage.test/effects.mp3',
        durationSeconds: 3,
        format: 'mp3'
      });

      const result = await service.findPaginated({ category: SfxLibraryCategory.Ambient }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].category).toBe(SfxLibraryCategory.Ambient);
    });

    it('filters by environment', async () => {
      await store.insert({
        canonicalKey: 'nature-sfx',
        category: SfxLibraryCategory.Ambient,
        environment: SfxEnvironment.Nature,
        prompt: 'Forest ambiance',
        s3Url: 'https://storage.test/nature.mp3',
        durationSeconds: 10,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'urban-sfx',
        category: SfxLibraryCategory.Ambient,
        environment: SfxEnvironment.Urban,
        prompt: 'City sounds',
        s3Url: 'https://storage.test/urban.mp3',
        durationSeconds: 8,
        format: 'mp3'
      });

      const result = await service.findPaginated({ environment: SfxEnvironment.Nature }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].environment).toBe(SfxEnvironment.Nature);
    });

    it('filters by intensity', async () => {
      await store.insert({
        canonicalKey: 'subtle-sfx',
        category: SfxLibraryCategory.Ambient,
        intensity: AudioIntensity.Subtle,
        prompt: 'Gentle breeze',
        s3Url: 'https://storage.test/subtle.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'intense-sfx',
        category: SfxLibraryCategory.Effects,
        intensity: AudioIntensity.Intense,
        prompt: 'Thunder',
        s3Url: 'https://storage.test/intense.mp3',
        durationSeconds: 4,
        format: 'mp3'
      });

      const result = await service.findPaginated({ intensity: AudioIntensity.Subtle }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].intensity).toBe(AudioIntensity.Subtle);
    });

    it('filters by search term', async () => {
      await store.insert({
        canonicalKey: 'bird-chirping',
        category: SfxLibraryCategory.Ambient,
        prompt: 'Birds chirping in forest',
        s3Url: 'https://storage.test/birds.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'car-engine',
        category: SfxLibraryCategory.Foley,
        prompt: 'Car engine starting',
        s3Url: 'https://storage.test/car.mp3',
        durationSeconds: 3,
        format: 'mp3'
      });

      const result = await service.findPaginated({ search: 'bird' }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].canonicalKey).toBe('bird-chirping');
    });

    it('paginates with cursor', async () => {
      await store.insert({
        canonicalKey: 'sfx-1',
        category: SfxLibraryCategory.Ambient,
        prompt: 'SFX 1',
        s3Url: 'https://storage.test/1.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'sfx-2',
        category: SfxLibraryCategory.Ambient,
        prompt: 'SFX 2',
        s3Url: 'https://storage.test/2.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'sfx-3',
        category: SfxLibraryCategory.Ambient,
        prompt: 'SFX 3',
        s3Url: 'https://storage.test/3.mp3',
        durationSeconds: 5,
        format: 'mp3'
      });

      const firstPage = await service.findPaginated({}, { limit: 2 });

      expect(firstPage.rows.length).toBe(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      const secondPage = await service.findPaginated({}, { limit: 2, cursor: firstPage.nextCursor! });

      expect(secondPage.rows.length).toBe(1);
      expect(secondPage.hasMore).toBe(false);
    });

    it('combines multiple filters', async () => {
      await store.insert({
        canonicalKey: 'nature-subtle',
        category: SfxLibraryCategory.Ambient,
        environment: SfxEnvironment.Nature,
        intensity: AudioIntensity.Subtle,
        prompt: 'Forest breeze',
        s3Url: 'https://storage.test/nature-subtle.mp3',
        durationSeconds: 10,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'nature-intense',
        category: SfxLibraryCategory.Ambient,
        environment: SfxEnvironment.Nature,
        intensity: AudioIntensity.Intense,
        prompt: 'Forest storm',
        s3Url: 'https://storage.test/nature-intense.mp3',
        durationSeconds: 15,
        format: 'mp3'
      });
      await store.insert({
        canonicalKey: 'urban-subtle',
        category: SfxLibraryCategory.Ambient,
        environment: SfxEnvironment.Urban,
        intensity: AudioIntensity.Subtle,
        prompt: 'Quiet street',
        s3Url: 'https://storage.test/urban-subtle.mp3',
        durationSeconds: 8,
        format: 'mp3'
      });

      const result = await service.findPaginated(
        { category: SfxLibraryCategory.Ambient, environment: SfxEnvironment.Nature, intensity: AudioIntensity.Subtle },
        { limit: 10 }
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].canonicalKey).toBe('nature-subtle');
    });
  });
});
