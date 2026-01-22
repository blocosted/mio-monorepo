/**
 * Script Generation Service Types
 *
 * Type definitions for the script generation service.
 */

import type {
    StoryScript,
    DurationBudget,
    NarrativeStructure,
    ScriptGenerationConstraints,
    EnrichedConcept,
    StoryAnswer,
    VocabularyLevel,
} from '@mio/shared';
import type { Language } from '@mio/shared/types';
import type { EnrichmentProfile } from './llm.service.types';
import type { ILLMRepository } from '../../repositories/llm/llm-repository.types';

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

/**
 * Script Generation Service Interface
 *
 * Business logic for story script generation:
 * - Duration budget calculation
 * - Script validation
 * - Retry logic with feedback
 * - Provider abstraction
 */
export interface IScriptGenerationService {
    /**
     * Calculate duration budget for given target duration
     */
    calculateDurationBudget(targetMinutes: number): DurationBudget;

    /**
     * Calculate narrative structure with word budgets
     */
    calculateNarrativeStructure(targetWordCount: number): NarrativeStructure;

    /**
     * Get segment requirements based on duration
     */
    getSegmentRequirements(targetMinutes: number): {
        minNarration: number;
        minDialogue: number;
        minSfx: number;
        maxConsecutive: number;
    };

    /**
     * Build complete generation constraints
     */
    buildConstraints(
        targetMinutes: number,
        providerType?: 'openai' | 'anthropic'
    ): ScriptGenerationConstraints;

    /**
     * Count words in a text (handles French and English)
     */
    countWords(text: string): number;

    /**
     * Calculate total word count from script
     */
    calculateScriptWordCount(script: StoryScript): number;

    /**
     * Calculate estimated duration from word count
     */
    calculateEstimatedDuration(wordCount: number, sfxCount: number): number;

    /**
     * Validate a generated script
     */
    validateScript(
        script: StoryScript,
        constraints: ScriptGenerationConstraints
    ): ScriptValidationResult;

    /**
     * Build feedback message from validation result
     */
    buildFeedbackFromValidation(validation: ScriptValidationResult): string;

    /**
     * Parse raw LLM response into StoryScript
     */
    parseScriptResponse(jsonString: string): StoryScript;

    /**
     * Generate script with validation and retry
     */
    generateScript(
        input: ScriptGenerationInput,
        provider: ILLMRepository
    ): Promise<ScriptGenerationResult>;
}
