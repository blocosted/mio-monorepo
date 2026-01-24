/**
 * Enrichment Service Types
 *
 * Defines interfaces and types for story enrichment service.
 */

import type { Gender, Language, VocabularyLevel } from '@mio/shared/types';

import type { EnrichedConcept } from '../stories/stories.service.types';

/**
 * Child profile data needed for story enrichment
 */
export interface EnrichmentProfile {
  firstName: string;
  age: number;
  gender: Gender;
  favoriteThemes?: string[];
  avoidThemes?: string[];
  includeChildAsCharacter?: boolean;
  preferredHeroGender?: 'same' | 'any';
  language?: Language;
}

/**
 * Story data needed for enrichment
 */
export interface EnrichmentStory {
  id: string;
  initialPrompt: string;
}

/**
 * Input for story enrichment
 */
export interface EnrichStoryInput {
  story: EnrichmentStory;
  profile: EnrichmentProfile;
}

/**
 * Result of story enrichment
 */
export interface EnrichStoryResult {
  enrichedConcept: EnrichedConcept;
  vocabularyLevel: VocabularyLevel;
}

/**
 * LLM completion options
 */
export interface LLMCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

