/**
 * Ambiance Library Service Integration Tests
 *
 * Tests the AmbianceLibraryService findPaginated() method with a real PostgreSQL database.
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { AmbianceEnvironment, AudioMood, TimeOfDay, WeatherCondition } from '@mio/shared/types';

import type { AmbianceLibraryService } from '../ambiance-library.service';
import type { AmbianceLibraryStore } from '../ambiance-library.store';
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('AmbianceLibraryService', () => {
  let db: DatabaseConnection;
  let store: AmbianceLibraryStore;
  let service: AmbianceLibraryService;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    store = getInstance<AmbianceLibraryStore>(IocStore.AMBIANCE_LIBRARY_STORE);
    service = getInstance<AmbianceLibraryService>(IocService.AMBIANCE_LIBRARY);
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  afterEach(async () => {
    await cleanTestPostgresData(db);
  });

  describe('findPaginated()', () => {
    it('returns empty result when no ambiance', async () => {
      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('returns paginated ambiance', async () => {
      await store.insert({
        canonicalKey: 'ambiance-1',
        environment: AmbianceEnvironment.Forest,
        prompt: 'Peaceful forest',
        s3Url: 'https://storage.test/ambiance-1.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'ambiance-2',
        environment: AmbianceEnvironment.City,
        prompt: 'Urban city',
        s3Url: 'https://storage.test/ambiance-2.mp3',
        sourceDurationSeconds: 120,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows.length).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('filters by environment', async () => {
      await store.insert({
        canonicalKey: 'forest-ambiance',
        environment: AmbianceEnvironment.Forest,
        prompt: 'Forest sounds',
        s3Url: 'https://storage.test/forest.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'city-ambiance',
        environment: AmbianceEnvironment.City,
        prompt: 'City sounds',
        s3Url: 'https://storage.test/city.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ environment: AmbianceEnvironment.Forest }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].environment).toBe(AmbianceEnvironment.Forest);
    });

    it('filters by timeOfDay', async () => {
      await store.insert({
        canonicalKey: 'day-forest',
        environment: AmbianceEnvironment.Forest,
        timeOfDay: TimeOfDay.Day,
        prompt: 'Daytime forest birds',
        s3Url: 'https://storage.test/day.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'night-forest',
        environment: AmbianceEnvironment.Forest,
        timeOfDay: TimeOfDay.Night,
        prompt: 'Night forest crickets',
        s3Url: 'https://storage.test/night.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ timeOfDay: TimeOfDay.Day }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].timeOfDay).toBe(TimeOfDay.Day);
    });

    it('filters by weather', async () => {
      await store.insert({
        canonicalKey: 'rainy-forest',
        environment: AmbianceEnvironment.Forest,
        weather: WeatherCondition.Rainy,
        prompt: 'Rain in forest',
        s3Url: 'https://storage.test/rainy.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'clear-forest',
        environment: AmbianceEnvironment.Forest,
        weather: WeatherCondition.Clear,
        prompt: 'Clear forest',
        s3Url: 'https://storage.test/clear.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ weather: WeatherCondition.Rainy }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].weather).toBe(WeatherCondition.Rainy);
    });

    it('filters by mood', async () => {
      await store.insert({
        canonicalKey: 'peaceful-ambiance',
        environment: AmbianceEnvironment.Forest,
        mood: AudioMood.Peaceful,
        prompt: 'Peaceful atmosphere',
        s3Url: 'https://storage.test/peaceful.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'tense-ambiance',
        environment: AmbianceEnvironment.Forest,
        mood: AudioMood.Tense,
        prompt: 'Tense atmosphere',
        s3Url: 'https://storage.test/tense.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ mood: AudioMood.Peaceful }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].mood).toBe(AudioMood.Peaceful);
    });

    it('filters by search term', async () => {
      await store.insert({
        canonicalKey: 'enchanted-forest',
        environment: AmbianceEnvironment.Forest,
        prompt: 'Enchanted magical forest',
        s3Url: 'https://storage.test/enchanted.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'bustling-market',
        environment: AmbianceEnvironment.Village,
        prompt: 'Busy marketplace',
        s3Url: 'https://storage.test/market.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated({ search: 'enchanted' }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].canonicalKey).toBe('enchanted-forest');
    });

    it('paginates with cursor', async () => {
      await store.insert({
        canonicalKey: 'ambiance-1',
        environment: AmbianceEnvironment.Forest,
        prompt: 'Ambiance 1',
        s3Url: 'https://storage.test/1.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'ambiance-2',
        environment: AmbianceEnvironment.Forest,
        prompt: 'Ambiance 2',
        s3Url: 'https://storage.test/2.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'ambiance-3',
        environment: AmbianceEnvironment.Forest,
        prompt: 'Ambiance 3',
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
        canonicalKey: 'forest-day-peaceful',
        environment: AmbianceEnvironment.Forest,
        timeOfDay: TimeOfDay.Day,
        mood: AudioMood.Peaceful,
        prompt: 'Peaceful daytime forest',
        s3Url: 'https://storage.test/forest-day-peaceful.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'forest-night-tense',
        environment: AmbianceEnvironment.Forest,
        timeOfDay: TimeOfDay.Night,
        mood: AudioMood.Tense,
        prompt: 'Tense night forest',
        s3Url: 'https://storage.test/forest-night-tense.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });
      await store.insert({
        canonicalKey: 'city-day-peaceful',
        environment: AmbianceEnvironment.City,
        timeOfDay: TimeOfDay.Day,
        mood: AudioMood.Peaceful,
        prompt: 'Peaceful daytime city',
        s3Url: 'https://storage.test/city-day-peaceful.mp3',
        sourceDurationSeconds: 60,
        format: 'mp3',
        isLoopable: true
      });

      const result = await service.findPaginated(
        { environment: AmbianceEnvironment.Forest, timeOfDay: TimeOfDay.Day, mood: AudioMood.Peaceful },
        { limit: 10 }
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].canonicalKey).toBe('forest-day-peaceful');
    });
  });
});
