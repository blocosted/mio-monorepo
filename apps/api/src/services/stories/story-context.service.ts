/**
 * Story Context Service Implementation
 *
 * Centralizes the loading of story and profile data for workflow steps.
 * Eliminates duplicated context loading between enrichmentStep and scriptGenerationStep.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { HeroGender, Language } from '@mio/shared/types';

import type { ProfilesStore } from '../profiles/profiles.service.store';
import type { StoriesStore } from './stories.service.store';
import type { ChildProfileData, EnrichmentProfile, StoryContext, StoryData } from './story-context.service.types';
import { IocStore } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/**
 * Story Context Service
 *
 * Provides centralized story/profile context loading for pipeline steps.
 * Ensures consistent data access patterns across all workflow steps.
 */
@injectable()
export class StoryContextService extends AbstractService {
  constructor(
    @inject(IocStore.STORIES_STORE) private readonly storiesStore: StoriesStore,
    @inject(IocStore.PROFILES_STORE) private readonly profilesStore: ProfilesStore
  ) {
    super();
  }

  /**
   * Load complete context for a story including profile data
   */
  async loadContext(storyId: string): Promise<StoryContext> {
    this.logger.debug('Loading story context', { storyId });

    // Load story from DB
    const storyRecord = await this.storiesStore.findById(storyId);
    if (!storyRecord) {
      throw new Error(`Story not found: ${storyId}`);
    }

    // Map DB record to StoryData
    const story: StoryData = {
      id: storyRecord.id,
      childProfileId: storyRecord.childProfileId,
      initialPrompt: storyRecord.initialPrompt,
      enrichedConcept: storyRecord.enrichedConcept,
      script: storyRecord.script,
      answers: storyRecord.answers
    };

    // Load child profile
    const profileRecord = await this.profilesStore.findById(story.childProfileId);
    if (!profileRecord) {
      throw new Error(`Child profile not found: ${story.childProfileId}`);
    }

    // Map DB record to ChildProfileData
    const childProfile: ChildProfileData = {
      id: profileRecord.id,
      firstName: profileRecord.firstName,
      age: profileRecord.age,
      gender: profileRecord.gender,
      preferences: profileRecord.preferences ?? {}
    };

    // Build enrichment profile
    const enrichmentProfile = this.buildEnrichmentProfile(childProfile);
    const language = childProfile.preferences.language ?? Language.French;

    this.logger.debug('Story context loaded', {
      storyId,
      childProfileId: childProfile.id,
      language
    });

    return {
      storyId,
      story,
      childProfile,
      enrichmentProfile,
      language
    };
  }

  /**
   * Build enrichment profile from child profile data
   *
   * Extracts the fields needed by enrichment and script generation services
   * with sensible defaults for missing preferences.
   */
  buildEnrichmentProfile(childProfile: ChildProfileData): EnrichmentProfile {
    const prefs = childProfile.preferences;

    return {
      firstName: childProfile.firstName,
      age: childProfile.age,
      gender: childProfile.gender,
      favoriteThemes: prefs.favoriteThemes ?? [],
      avoidThemes: prefs.avoidThemes ?? [],
      includeChildAsCharacter: prefs.includeChildAsCharacter ?? true,
      preferredHeroGender: prefs.preferredHeroGender ?? HeroGender.Same,
      language: prefs.language ?? Language.French
    };
  }
}
