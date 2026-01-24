/**
 * Story Context Service Tests
 *
 * Tests for loading story and profile context with mocked dependencies.
 */

import { Gender, HeroGender, Language } from '@mio/shared/types';

import type { ProfilesStore } from '../../profiles/profiles.service.store';
import type { StoriesStore } from '../stories.service.store';
import type { ChildProfileData } from '../story-context.service.types';
import { StoryContextService } from '../story-context.service';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

describe('StoryContextService', () => {
  let service: StoryContextService;
  let mockStoriesStore: Partial<StoriesStore>;
  let mockProfilesStore: Partial<ProfilesStore>;

  const storyId = 'story-123';
  const profileId = 'profile-456';

  const mockStoryRecord = {
    id: storyId,
    childProfileId: profileId,
    initialPrompt: 'Un dragon qui a peur du noir',
    enrichedConcept: { title: 'Le dragon timide' } as any,
    script: null,
    answers: [{ questionId: 'q1', value: 'magique' }],
    finalAudioUrl: null,
    duration: null,
    status: 'draft' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProfileRecord = {
    id: profileId,
    firstName: 'Emma',
    age: 7,
    gender: Gender.Girl,
    preferences: {
      favoriteThemes: ['dragons', 'magic'],
      avoidThemes: ['scary'],
      includeChildAsCharacter: true,
      preferredHeroGender: HeroGender.Same,
      language: Language.French
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockStoriesStore = {
      findById: mock(() => Promise.resolve(mockStoryRecord))
    };

    mockProfilesStore = {
      findById: mock(() => Promise.resolve(mockProfileRecord))
    };

    // Create service with mocked dependencies
    service = new StoryContextService(mockStoriesStore as StoriesStore, mockProfilesStore as ProfilesStore);
  });

  describe('loadContext()', () => {
    it('loads complete context for a story', async () => {
      const context = await service.loadContext(storyId);

      expect(context.storyId).toBe(storyId);
      expect(context.story.id).toBe(storyId);
      expect(context.story.childProfileId).toBe(profileId);
      expect(context.story.initialPrompt).toBe('Un dragon qui a peur du noir');
      expect(context.childProfile.id).toBe(profileId);
      expect(context.childProfile.firstName).toBe('Emma');
      expect(context.childProfile.age).toBe(7);
      expect(context.language).toBe(Language.French);
    });

    it('includes enrichment profile with correct values', async () => {
      const context = await service.loadContext(storyId);

      expect(context.enrichmentProfile.firstName).toBe('Emma');
      expect(context.enrichmentProfile.age).toBe(7);
      expect(context.enrichmentProfile.gender).toBe(Gender.Girl);
      expect(context.enrichmentProfile.favoriteThemes).toEqual(['dragons', 'magic']);
      expect(context.enrichmentProfile.avoidThemes).toEqual(['scary']);
      expect(context.enrichmentProfile.includeChildAsCharacter).toBe(true);
      expect(context.enrichmentProfile.preferredHeroGender).toBe(HeroGender.Same);
      expect(context.enrichmentProfile.language).toBe(Language.French);
    });

    it('throws error when story not found', async () => {
      mockStoriesStore.findById = mock(() => Promise.resolve(null));

      await expect(service.loadContext('non-existent')).rejects.toThrow('Story not found: non-existent');
    });

    it('throws error when profile not found', async () => {
      mockProfilesStore.findById = mock(() => Promise.resolve(null));

      await expect(service.loadContext(storyId)).rejects.toThrow(`Child profile not found: ${profileId}`);
    });

    it('handles story with null enrichedConcept and script', async () => {
      mockStoriesStore.findById = mock(() =>
        Promise.resolve({
          ...mockStoryRecord,
          enrichedConcept: null,
          script: null,
          answers: null
        } as any)
      );

      const context = await service.loadContext(storyId);

      expect(context.story.enrichedConcept).toBeNull();
      expect(context.story.script).toBeNull();
      expect(context.story.answers).toBeNull();
    });

    it('uses default language when not specified in preferences', async () => {
      mockProfilesStore.findById = mock(() =>
        Promise.resolve({
          ...mockProfileRecord,
          preferences: {}
        })
      );

      const context = await service.loadContext(storyId);

      expect(context.language).toBe(Language.French);
    });

    it('handles profile with null preferences', async () => {
      mockProfilesStore.findById = mock(() =>
        Promise.resolve({
          ...mockProfileRecord,
          preferences: {} as any
        })
      );

      const context = await service.loadContext(storyId);

      expect(context.childProfile.preferences).toEqual({});
      expect(context.enrichmentProfile.favoriteThemes).toEqual([]);
      expect(context.enrichmentProfile.avoidThemes).toEqual([]);
    });
  });

  describe('buildEnrichmentProfile()', () => {
    it('builds profile with all preferences', () => {
      const childProfile: ChildProfileData = {
        id: 'p1',
        firstName: 'Lucas',
        age: 8,
        gender: Gender.Boy,
        preferences: {
          favoriteThemes: ['space', 'robots'],
          avoidThemes: ['insects'],
          includeChildAsCharacter: false,
          preferredHeroGender: HeroGender.Any,
          language: Language.English
        }
      };

      const enrichment = service.buildEnrichmentProfile(childProfile);

      expect(enrichment.firstName).toBe('Lucas');
      expect(enrichment.age).toBe(8);
      expect(enrichment.gender).toBe(Gender.Boy);
      expect(enrichment.favoriteThemes).toEqual(['space', 'robots']);
      expect(enrichment.avoidThemes).toEqual(['insects']);
      expect(enrichment.includeChildAsCharacter).toBe(false);
      expect(enrichment.preferredHeroGender).toBe(HeroGender.Any);
      expect(enrichment.language).toBe(Language.English);
    });

    it('uses default values when preferences are missing', () => {
      const childProfile: ChildProfileData = {
        id: 'p2',
        firstName: 'Sophie',
        age: 6,
        gender: Gender.Girl,
        preferences: {}
      };

      const enrichment = service.buildEnrichmentProfile(childProfile);

      expect(enrichment.firstName).toBe('Sophie');
      expect(enrichment.age).toBe(6);
      expect(enrichment.gender).toBe(Gender.Girl);
      expect(enrichment.favoriteThemes).toEqual([]);
      expect(enrichment.avoidThemes).toEqual([]);
      expect(enrichment.includeChildAsCharacter).toBe(true);
      expect(enrichment.preferredHeroGender).toBe(HeroGender.Same);
      expect(enrichment.language).toBe(Language.French);
    });

    it('handles partial preferences', () => {
      const childProfile: ChildProfileData = {
        id: 'p3',
        firstName: 'Alex',
        age: 9,
        gender: Gender.Neutral,
        preferences: {
          favoriteThemes: ['animals'],
          language: Language.English
        }
      };

      const enrichment = service.buildEnrichmentProfile(childProfile);

      expect(enrichment.favoriteThemes).toEqual(['animals']);
      expect(enrichment.avoidThemes).toEqual([]);
      expect(enrichment.includeChildAsCharacter).toBe(true);
      expect(enrichment.preferredHeroGender).toBe(HeroGender.Same);
      expect(enrichment.language).toBe(Language.English);
    });

    it('preserves undefined avoidThemes as empty array', () => {
      const childProfile: ChildProfileData = {
        id: 'p4',
        firstName: 'Tom',
        age: 5,
        gender: Gender.Boy,
        preferences: {
          favoriteThemes: ['dinosaurs']
        }
      };

      const enrichment = service.buildEnrichmentProfile(childProfile);

      expect(enrichment.avoidThemes).toEqual([]);
    });
  });
});
