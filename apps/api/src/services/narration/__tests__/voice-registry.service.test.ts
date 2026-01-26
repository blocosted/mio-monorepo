/**
 * Voice Registry Service Integration Tests
 *
 * Tests the VoiceRegistryService findPaginated() method with a real PostgreSQL database.
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { VoiceAge, VoiceGender, VoiceUseCase } from '@mio/shared/types';

import type { VoiceRegistryService } from '../voice-registry.service';
import type { VoiceRegistryStore } from '../voice-registry.store';
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('VoiceRegistryService', () => {
  let db: DatabaseConnection;
  let store: VoiceRegistryStore;
  let service: VoiceRegistryService;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    store = getInstance<VoiceRegistryStore>(IocStore.VOICE_REGISTRY_STORE);
    service = getInstance<VoiceRegistryService>(IocService.VOICE_REGISTRY);
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);
  });

  afterEach(async () => {
    await cleanTestPostgresData(db);
  });

  describe('findPaginated()', () => {
    it('returns empty result when no voices', async () => {
      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('returns paginated voices', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'Voice 1',
        gender: VoiceGender.Male,
        age: VoiceAge.Young,
        useCase: VoiceUseCase.NarrativeStory
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'Voice 2',
        gender: VoiceGender.Female,
        age: VoiceAge.MiddleAged,
        useCase: VoiceUseCase.NarrativeStory
      });
      await store.upsert({
        voiceId: 'voice-3',
        name: 'Voice 3',
        gender: VoiceGender.Male,
        age: VoiceAge.Old,
        useCase: VoiceUseCase.Characters
      });

      const result = await service.findPaginated({}, { limit: 10 });

      expect(result.rows.length).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('filters by gender', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'Male Voice 1',
        gender: VoiceGender.Male
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'Female Voice',
        gender: VoiceGender.Female
      });
      await store.upsert({
        voiceId: 'voice-3',
        name: 'Male Voice 2',
        gender: VoiceGender.Male
      });

      const result = await service.findPaginated({ gender: VoiceGender.Male }, { limit: 10 });

      expect(result.rows.length).toBe(2);
      expect(result.rows.every((v) => v.gender === VoiceGender.Male)).toBe(true);
    });

    it('filters by age', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'Young Voice',
        age: VoiceAge.Young
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'Old Voice',
        age: VoiceAge.Old
      });

      const result = await service.findPaginated({ age: VoiceAge.Young }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].age).toBe(VoiceAge.Young);
    });

    it('filters by useCase', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'Narrative Voice',
        useCase: VoiceUseCase.NarrativeStory
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'Character Voice',
        useCase: VoiceUseCase.Characters
      });

      const result = await service.findPaginated({ useCase: VoiceUseCase.NarrativeStory }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].useCase).toBe(VoiceUseCase.NarrativeStory);
    });

    it('filters by isHighQuality', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'HQ Voice',
        isHighQuality: true
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'Standard Voice',
        isHighQuality: false
      });

      const result = await service.findPaginated({ isHighQuality: true }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].isHighQuality).toBe(true);
    });

    it('filters by search term', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'French Narrator',
        description: 'A warm French voice'
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'English Speaker',
        description: 'British accent'
      });

      const result = await service.findPaginated({ search: 'French' }, { limit: 10 });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('French Narrator');
    });

    it('paginates with cursor', async () => {
      await store.upsert({ voiceId: 'voice-1', name: 'Voice A' });
      await store.upsert({ voiceId: 'voice-2', name: 'Voice B' });
      await store.upsert({ voiceId: 'voice-3', name: 'Voice C' });

      const firstPage = await service.findPaginated({}, { limit: 2 });

      expect(firstPage.rows.length).toBe(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      const secondPage = await service.findPaginated({}, { limit: 2, cursor: firstPage.nextCursor! });

      expect(secondPage.rows.length).toBe(1);
      expect(secondPage.hasMore).toBe(false);
    });

    it('combines multiple filters', async () => {
      await store.upsert({
        voiceId: 'voice-1',
        name: 'Young Male HQ',
        gender: VoiceGender.Male,
        age: VoiceAge.Young,
        isHighQuality: true
      });
      await store.upsert({
        voiceId: 'voice-2',
        name: 'Old Male HQ',
        gender: VoiceGender.Male,
        age: VoiceAge.Old,
        isHighQuality: true
      });
      await store.upsert({
        voiceId: 'voice-3',
        name: 'Young Female HQ',
        gender: VoiceGender.Female,
        age: VoiceAge.Young,
        isHighQuality: true
      });

      const result = await service.findPaginated(
        { gender: VoiceGender.Male, age: VoiceAge.Young, isHighQuality: true },
        { limit: 10 }
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('Young Male HQ');
    });
  });
});
