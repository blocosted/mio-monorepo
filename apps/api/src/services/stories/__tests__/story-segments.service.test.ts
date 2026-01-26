/**
 * Story Segments Service Integration Tests
 *
 * Tests the StorySegmentsService and StorySegmentsStore with a real PostgreSQL database.
 */

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { Gender, SegmentType } from '@mio/shared/types';

import type { ProfilesStore } from '../../profiles/profiles.store';
import type { StoriesStore } from '../stories.service.store';
import type { StorySegmentsService } from '../story-segments.service';
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import { cleanTestPostgresData } from '../../../tests/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('StorySegmentsService', () => {
  let db: DatabaseConnection;
  let profilesStore: ProfilesStore;
  let storiesStore: StoriesStore;
  let service: StorySegmentsService;
  let testStoryId: string;

  beforeAll(() => {
    db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    profilesStore = getInstance<ProfilesStore>(IocStore.PROFILES_STORE);
    storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);
    service = getInstance<StorySegmentsService>(IocService.STORY_SEGMENTS);
  });

  beforeEach(async () => {
    await cleanTestPostgresData(db);

    // Create a test profile and story for segments
    const profile = await profilesStore.insert({
      firstName: 'Emma',
      age: 7,
      gender: Gender.Girl
    });

    const story = await storiesStore.insert({
      childProfileId: profile.id,
      initialPrompt: 'A dragon adventure'
    });

    testStoryId = story.id;
  });

  afterEach(async () => {
    await cleanTestPostgresData(db);
  });

  describe('create()', () => {
    it('creates a segment with valid data', async () => {
      const segment = await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Once upon a time...' }
      });

      expect(segment.id).toBeDefined();
      expect(segment.storyId).toBe(testStoryId);
      expect(segment.order).toBe(1);
      expect(segment.type).toBe(SegmentType.Narration);
      expect(segment.content).toEqual({ text: 'Once upon a time...' });
    });

    it('creates a segment with audio URL and duration', async () => {
      const segment = await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Dialogue,
        content: { speaker: 'Dragon', text: 'Hello!' },
        audioUrl: 'https://storage.test/audio.mp3',
        duration: 2.5
      });

      expect(segment.audioUrl).toBe('https://storage.test/audio.mp3');
      expect(segment.duration).toBe(2.5);
    });
  });

  describe('findByStoryId()', () => {
    it('returns empty array when no segments', async () => {
      const segments = await service.findByStoryId(testStoryId);

      expect(segments).toEqual([]);
    });

    it('returns all segments for a story ordered by sequence', async () => {
      await service.create({
        storyId: testStoryId,
        order: 2,
        type: SegmentType.Narration,
        content: { text: 'Second segment' }
      });
      await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'First segment' }
      });
      await service.create({
        storyId: testStoryId,
        order: 3,
        type: SegmentType.Narration,
        content: { text: 'Third segment' }
      });

      const segments = await service.findByStoryId(testStoryId);

      expect(segments.length).toBe(3);
      expect(segments[0].order).toBe(1);
      expect(segments[1].order).toBe(2);
      expect(segments[2].order).toBe(3);
    });

    it('only returns segments for the specified story', async () => {
      // Create another story
      const profile = await profilesStore.insert({
        firstName: 'Lucas',
        age: 5,
        gender: Gender.Boy
      });
      const otherStory = await storiesStore.insert({
        childProfileId: profile.id,
        initialPrompt: 'A pirate adventure'
      });

      await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Test story segment' }
      });
      await service.create({
        storyId: otherStory.id,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Other story segment' }
      });

      const segments = await service.findByStoryId(testStoryId);

      expect(segments.length).toBe(1);
      expect(segments[0].storyId).toBe(testStoryId);
    });
  });

  describe('findById()', () => {
    it('returns segment when found', async () => {
      const created = await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Test segment' }
      });

      const found = await service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns null when segment not found', async () => {
      const found = await service.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('update()', () => {
    it('updates audio URL', async () => {
      const created = await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Test segment' }
      });

      const updated = await service.update(created.id, {
        audioUrl: 'https://storage.test/updated-audio.mp3'
      });

      expect(updated).not.toBeNull();
      expect(updated!.audioUrl).toBe('https://storage.test/updated-audio.mp3');
    });

    it('updates duration', async () => {
      const created = await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Test segment' }
      });

      const updated = await service.update(created.id, { duration: 5.5 });

      expect(updated).not.toBeNull();
      expect(updated!.duration).toBe(5.5);
    });

    it('returns null when segment not found', async () => {
      const updated = await service.update('00000000-0000-0000-0000-000000000000', {
        audioUrl: 'https://test.com'
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete()', () => {
    it('deletes segment successfully', async () => {
      const created = await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Test segment' }
      });

      await service.delete(created.id);

      const found = await service.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('deleteByStoryId()', () => {
    it('deletes all segments for a story', async () => {
      await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Segment 1' }
      });
      await service.create({
        storyId: testStoryId,
        order: 2,
        type: SegmentType.Dialogue,
        content: { text: 'Segment 2' }
      });

      await service.deleteByStoryId(testStoryId);

      const segments = await service.findByStoryId(testStoryId);
      expect(segments).toEqual([]);
    });
  });

  describe('countByStoryId()', () => {
    it('returns 0 when no segments', async () => {
      const count = await service.countByStoryId(testStoryId);

      expect(count).toBe(0);
    });

    it('returns correct count', async () => {
      await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Segment 1' }
      });
      await service.create({
        storyId: testStoryId,
        order: 2,
        type: SegmentType.Dialogue,
        content: { text: 'Segment 2' }
      });

      const count = await service.countByStoryId(testStoryId);

      expect(count).toBe(2);
    });
  });

  describe('findByStoryIdAndType()', () => {
    it('returns only segments of specified type', async () => {
      await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'Narration 1' }
      });
      await service.create({
        storyId: testStoryId,
        order: 2,
        type: SegmentType.Dialogue,
        content: { text: 'Dialogue 1' }
      });
      await service.create({
        storyId: testStoryId,
        order: 3,
        type: SegmentType.Narration,
        content: { text: 'Narration 2' }
      });

      const narrationSegments = await service.findByStoryIdAndType(testStoryId, SegmentType.Narration);

      expect(narrationSegments.length).toBe(2);
      expect(narrationSegments.every((s) => s.type === SegmentType.Narration)).toBe(true);
    });

    it('returns segments ordered by sequence', async () => {
      await service.create({
        storyId: testStoryId,
        order: 3,
        type: SegmentType.Narration,
        content: { text: 'Third' }
      });
      await service.create({
        storyId: testStoryId,
        order: 1,
        type: SegmentType.Narration,
        content: { text: 'First' }
      });

      const segments = await service.findByStoryIdAndType(testStoryId, SegmentType.Narration);

      expect(segments[0].order).toBe(1);
      expect(segments[1].order).toBe(3);
    });
  });
});
