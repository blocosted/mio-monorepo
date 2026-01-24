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

/**
 * Enrichment Service Interface
 */
export interface IEnrichmentService {
  /**
   * Enrich a story prompt into a full concept with characters, setting, etc.
   *
   * @param input - Story and profile data
   * @param options - Optional completion settings
   * @returns Enriched story concept with vocabulary level
   */
  enrichStory(input: EnrichStoryInput, options?: LLMCompletionOptions): Promise<EnrichStoryResult>;
}
