/**
 * Script Generation Service Types
 *
 * Type definitions for the script generation service.
 */

import type { DurationBudget, Language, NarrativeStructure, ScriptGenerationConstraints, StoryScript, VocabularyLevel } from '@mio/shared/types';

import type { ILLMRepository } from '../../repositories/llm/llm-repository.types';
import type { EnrichedConcept, StoryAnswer } from '../stories/stories.service.types';
import type { EnrichmentProfile } from './llm.service.types';

/**
 * Context for script generation (internal use by service)
 */
export interface ScriptGenerationContext {
  enrichedConcept: EnrichedConcept;
  childName: string;
  childAge: number;
  language: Language;
  vocabularyLevel: VocabularyLevel;
  constraints: ScriptGenerationConstraints;
  answers: StoryAnswer[];
  previousAttemptFeedback?: string;
}

/**
 * Validation result for a generated script
 */
export interface ScriptValidationResult {
  isValid: boolean;
  wordCount: number;
  estimatedDuration: number;
  errors: string[];
  warnings: string[];
}

/**
 * Script generation input (timeline-based)
 */
export interface ScriptGenerationInput {
  enrichedConcept: EnrichedConcept;
  profile: EnrichmentProfile;
  answers: StoryAnswer[];
  targetDurationMinutes?: number;
}

/**
 * Script generation result (timeline-based)
 */
export interface ScriptGenerationResult {
  script: StoryScript;
  validation: ScriptValidationResult;
  attempts: number;
}

