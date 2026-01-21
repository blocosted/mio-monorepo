/**
 * LLM Service Types
 *
 * Defines interfaces and types for the LLM service layer.
 * Follows the architecture pattern: each layer owns its interfaces.
 */

import {
  type EnrichedConcept,
  VocabularyLevel,
  Tone,
  Ambiance,
} from '@mio/shared';
import type { Gender, Language } from '@mio/shared/types';

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
  /** Target language for the story content (default: 'fr') */
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
 * LLM Provider configuration
 */
export type LLMProvider = 'openai' | 'anthropic';

/**
 * LLM completion options
 */
export interface LLMCompletionOptions {
  /** Model to use (e.g., 'gpt-4o', 'claude-3-5-sonnet') */
  model?: string;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * LLM Service Interface
 *
 * Abstraction layer for LLM operations, allowing different providers.
 * Note: Script generation uses the new ILLMProvider + ScriptGenerationService architecture.
 */
export interface ILLMService {
  /**
   * Enrich a story prompt into a full concept with characters, setting, etc.
   *
   * @param input - Story and profile data
   * @param options - Optional completion settings
   * @returns Enriched story concept with vocabulary level
   */
  enrichStory(
    input: EnrichStoryInput,
    options?: LLMCompletionOptions,
  ): Promise<EnrichStoryResult>;
}

/**
 * Vocabulary level mapping based on child age
 */
export const AGE_TO_VOCABULARY: Record<number, VocabularyLevel> = {
  3: VocabularyLevel.VerySimple,
  4: VocabularyLevel.VerySimple,
  5: VocabularyLevel.Simple,
  6: VocabularyLevel.Simple,
  7: VocabularyLevel.Medium,
  8: VocabularyLevel.Medium,
  9: VocabularyLevel.Medium,
  10: VocabularyLevel.Advanced,
  11: VocabularyLevel.Advanced,
  12: VocabularyLevel.Advanced,
};

/**
 * Get vocabulary level for a given age
 */
export function getVocabularyLevel(age: number): VocabularyLevel {
  if (age <= 4) return VocabularyLevel.VerySimple;
  if (age <= 6) return VocabularyLevel.Simple;
  if (age <= 9) return VocabularyLevel.Medium;
  return VocabularyLevel.Advanced;
}

/**
 * Available tones for mapping
 */
export const AVAILABLE_TONES: Tone[] = [
  Tone.Adventurous,
  Tone.Funny,
  Tone.Mysterious,
  Tone.Heartwarming,
  Tone.Exciting,
  Tone.Calm,
  Tone.Educational,
];

/**
 * Available ambiances for mapping
 */
export const AVAILABLE_AMBIANCES: Ambiance[] = [
  Ambiance.Forest,
  Ambiance.Ocean,
  Ambiance.Space,
  Ambiance.Castle,
  Ambiance.City,
  Ambiance.MagicalRealm,
  Ambiance.Underwater,
  Ambiance.Mountain,
];
