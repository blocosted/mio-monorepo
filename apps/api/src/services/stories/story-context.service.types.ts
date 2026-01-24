/**
 * Story Context Service Types
 *
 * Types for the story context service that loads story/profile data
 * and prepares context for pipeline steps.
 */

import type { Gender, HeroGender, Language, StoryScript } from '@mio/shared/types';

/**
 * Enrichment profile used by enrichment and script generation services
 */
export interface EnrichmentProfile {
  firstName: string;
  age: number;
  gender: Gender;
  favoriteThemes: string[];
  avoidThemes: string[];
  includeChildAsCharacter: boolean;
  preferredHeroGender: HeroGender;
  language: Language;
}

/**
 * Story data loaded from database
 */
export interface StoryData {
  id: string;
  childProfileId: string;
  initialPrompt: string;
  enrichedConcept: unknown | null;
  script: StoryScript | null;
  answers: Array<{ questionId: string; value: string }> | null;
}

/**
 * Child profile data loaded from database
 */
export interface ChildProfileData {
  id: string;
  firstName: string;
  age: number;
  gender: Gender;
  preferences: {
    favoriteThemes?: string[];
    avoidThemes?: string[];
    includeChildAsCharacter?: boolean;
    preferredHeroGender?: HeroGender;
    language?: Language;
  };
}

/**
 * Full story context with all required data for pipeline steps
 */
export interface StoryContext {
  storyId: string;
  story: StoryData;
  childProfile: ChildProfileData;
  enrichmentProfile: EnrichmentProfile;
  language: Language;
}

/**
 * Story Context Service Interface
 */
export interface IStoryContextService {
  /**
   * Load complete context for a story including profile data
   * @throws Error if story or profile not found
   */
  loadContext(storyId: string): Promise<StoryContext>;

  /**
   * Build enrichment profile from child profile data
   */
  buildEnrichmentProfile(childProfile: ChildProfileData): EnrichmentProfile;
}
