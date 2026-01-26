/**
 * Music Library Service Integration Tests
 *
 * Tests the MusicLibraryService findPaginated() method with a real PostgreSQL database.
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { MusicIntensity, MusicMood, MusicTempo } from '@mio/shared/types';

import type { MusicLibraryService } from '../music-library.service';
import type { MusicLibraryStore } from '../music-library.store';
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('MusicLibraryService', () => {
  let db: DatabaseConnection;
  let store: MusicLibraryStore;
  let service: MusicLibraryService;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    store = getInstance<MusicLibraryStore>(IocStore.MUSIC_LIBRARY_STORE);
    service = getInstance<MusicLibraryService>(IocService.MUSIC_LIBRARY);
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  afterEach(async () => {
    await cleanTestPostgresData(db);
  });

  describe('findPaginated()', () => {
    it('returns empty result when no music', async () => {
      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('returns paginated music', async () => {
      await store.insert({
        canonicalKey: 'music-1',
        mood: MusicMood.Joyful,
        variationIndex: 0,
        prompt: 'Joyful theme',
        s3Url: 'https://storage.test/music-1.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'music-2',
        mood: MusicMood.Sad,
        variationIndex: 0,
        prompt: 'Sad theme',
        s3Url: 'https://storage.test/music-2.mp3',
        sourceDurationSeconds: 90,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows.length).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('filters by mood', async () => {
      await store.insert({
        canonicalKey: 'joyful-music',
        mood: MusicMood.Joyful,
        variationIndex: 0,
        prompt: 'Cheerful melody',
        s3Url: 'https://storage.test/joyful.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'sad-music',
        mood: MusicMood.Sad,
        variationIndex: 0,
        prompt: 'Melancholic tune',
        s3Url: 'https://storage.test/sad.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ mood: MusicMood.Joyful }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].mood).toBe(MusicMood.Joyful);
    });

    it('filters by intensity', async () => {
      await store.insert({
        canonicalKey: 'soft-music',
        mood: MusicMood.Calm,
        intensity: MusicIntensity.Soft,
        variationIndex: 0,
        prompt: 'Gentle melody',
        s3Url: 'https://storage.test/soft.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'epic-music',
        mood: MusicMood.Adventurous,
        intensity: MusicIntensity.Epic,
        variationIndex: 0,
        prompt: 'Epic orchestral',
        s3Url: 'https://storage.test/epic.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ intensity: MusicIntensity.Soft }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].intensity).toBe(MusicIntensity.Soft);
    });

    it('filters by tempo', async () => {
      await store.insert({
        canonicalKey: 'slow-music',
        mood: MusicMood.Serene,
        tempo: MusicTempo.Slow,
        variationIndex: 0,
        prompt: 'Slow peaceful melody',
        s3Url: 'https://storage.test/slow.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'fast-music',
        mood: MusicMood.Adventurous,
        tempo: MusicTempo.Fast,
        variationIndex: 0,
        prompt: 'Fast exciting beat',
        s3Url: 'https://storage.test/fast.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ tempo: MusicTempo.Slow }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].tempo).toBe(MusicTempo.Slow);
    });

    it('filters by search term', async () => {
      await store.insert({
        canonicalKey: 'adventure-theme',
        mood: MusicMood.Adventurous,
        variationIndex: 0,
        prompt: 'Epic adventure theme',
        s3Url: 'https://storage.test/adventure.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'lullaby-theme',
        mood: MusicMood.Serene,
        variationIndex: 0,
        prompt: 'Gentle lullaby',
        s3Url: 'https://storage.test/lullaby.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ search: 'adventure' }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].canonicalKey).toBe('adventure-theme');
    });

    it('paginates with cursor', async () => {
      await store.insert({
        canonicalKey: 'music-1',
        mood: MusicMood.Calm,
        variationIndex: 0,
        prompt: 'Music 1',
        s3Url: 'https://storage.test/1.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'music-2',
        mood: MusicMood.Calm,
        variationIndex: 0,
        prompt: 'Music 2',
        s3Url: 'https://storage.test/2.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'music-3',
        mood: MusicMood.Calm,
        variationIndex: 0,
        prompt: 'Music 3',
        s3Url: 'https://storage.test/3.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
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
        canonicalKey: 'calm-soft-slow',
        mood: MusicMood.Calm,
        intensity: MusicIntensity.Soft,
        tempo: MusicTempo.Slow,
        variationIndex: 0,
        prompt: 'Calm soft slow',
        s3Url: 'https://storage.test/calm-soft-slow.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'calm-soft-fast',
        mood: MusicMood.Calm,
        intensity: MusicIntensity.Soft,
        tempo: MusicTempo.Fast,
        variationIndex: 0,
        prompt: 'Calm soft fast',
        s3Url: 'https://storage.test/calm-soft-fast.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'sad-soft-slow',
        mood: MusicMood.Sad,
        intensity: MusicIntensity.Soft,
        tempo: MusicTempo.Slow,
        variationIndex: 0,
        prompt: 'Sad soft slow',
        s3Url: 'https://storage.test/sad-soft-slow.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated(
        { mood: MusicMood.Calm, intensity: MusicIntensity.Soft, tempo: MusicTempo.Slow },
        { limit: 10 }
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].canonicalKey).toBe('calm-soft-slow');
    });
  });
});
