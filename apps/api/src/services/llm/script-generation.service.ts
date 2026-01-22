/**
 * Script Generation Service
 *
 * Business logic layer for story script generation.
 * Handles:
 * - Duration budget calculation
 * - Script validation
 * - Retry logic with feedback
 * - Provider abstraction
 */

import 'reflect-metadata';
import { injectable } from 'inversify';

import {
  AppError,
  ErrorCodes,
  type StoryScript,
  type DurationBudget,
  type NarrativeStructure,
  type ScriptGenerationConstraints,
  type VoiceSegmentContent,
} from '@mio/shared';

import { AbstractService } from '../service.abstract';
import type { ILLMRepository } from '../../repositories/llm/llm-repository.types';
import { getVocabularyLevel } from './llm.service.types';
import type {
  IScriptGenerationService,
  ScriptValidationResult,
  ScriptGenerationInput,
  ScriptGenerationResult,
  ScriptGenerationContext,
} from './script-generation.service.types';
import {
  buildScriptGenerationSystemPrompt,
  buildScriptGenerationUserPrompt,
} from './prompts/scriptGeneration.prompts';

/**
 * Constants for duration calculation
 *
 * Note: 120 WPM is more realistic for expressive TTS (ElevenLabs with emotions,
 * pauses, and prosody). The previous 150 WPM was too optimistic and caused
 * stories to exceed their target duration significantly.
 */
const WORDS_PER_MINUTE = 120;
const WORDS_PER_SECOND = WORDS_PER_MINUTE / 60; // 2.0

/**
 * Default duration allocation percentages
 */
const DURATION_ALLOCATION = {
  voice: 0.72,      // 72% for narration/dialogue
  sfx: 0.12,        // 12% for sound effects
  music: 0.06,      // 6% for music transitions
  pauses: 0.10,     // 10% for natural pauses
};

/**
 * Narrative structure percentages
 */
const NARRATIVE_STRUCTURE = {
  act1: { percentage: 20, description: 'Introduce characters, setting, and initial situation' },
  act2: { percentage: 60, description: 'Main conflict, challenges, character development' },
  act3: { percentage: 20, description: 'Climax, resolution, and satisfying conclusion' },
};

/**
 * Minimum segment requirements by duration
 *
 * Note: These are relatively low to allow for longer content per segment.
 * We validate primarily on word count, not segment count.
 */
const SEGMENT_REQUIREMENTS = {
  short: { // ≤5 min
    minNarration: 5,
    minDialogue: 4,
    minSfx: 3,
    maxConsecutive: 4,
  },
  medium: { // 5-10 min
    minNarration: 10,
    minDialogue: 8,
    minSfx: 5,
    maxConsecutive: 4,
  },
  long: { // >10 min
    minNarration: 18,
    minDialogue: 14,
    minSfx: 8,
    maxConsecutive: 5,
  },
};

@injectable()
export class ScriptGenerationService extends AbstractService implements IScriptGenerationService {
  private readonly maxAttempts = 3;

  /**
   * Calculate duration budget for given target duration
   */
  calculateDurationBudget(targetMinutes: number): DurationBudget {
    const totalSeconds = targetMinutes * 60;

    const voiceSeconds = Math.round(totalSeconds * DURATION_ALLOCATION.voice);
    const sfxSeconds = Math.round(totalSeconds * DURATION_ALLOCATION.sfx);
    const musicSeconds = Math.round(totalSeconds * DURATION_ALLOCATION.music);
    const pauseSeconds = Math.round(totalSeconds * DURATION_ALLOCATION.pauses);

    const targetWordCount = Math.round(voiceSeconds * WORDS_PER_SECOND);

    return {
      totalSeconds,
      voiceSeconds,
      sfxSeconds,
      musicSeconds,
      pauseSeconds,
      targetWordCount,
    };
  }

  /**
   * Calculate narrative structure with word budgets
   */
  calculateNarrativeStructure(targetWordCount: number): NarrativeStructure {
    return {
      act1: {
        wordBudget: Math.round(targetWordCount * (NARRATIVE_STRUCTURE.act1.percentage / 100)),
        percentage: NARRATIVE_STRUCTURE.act1.percentage,
        description: NARRATIVE_STRUCTURE.act1.description,
      },
      act2: {
        wordBudget: Math.round(targetWordCount * (NARRATIVE_STRUCTURE.act2.percentage / 100)),
        percentage: NARRATIVE_STRUCTURE.act2.percentage,
        description: NARRATIVE_STRUCTURE.act2.description,
      },
      act3: {
        wordBudget: Math.round(targetWordCount * (NARRATIVE_STRUCTURE.act3.percentage / 100)),
        percentage: NARRATIVE_STRUCTURE.act3.percentage,
        description: NARRATIVE_STRUCTURE.act3.description,
      },
    };
  }

  /**
   * Get segment requirements based on duration
   */
  getSegmentRequirements(targetMinutes: number): typeof SEGMENT_REQUIREMENTS.short {
    if (targetMinutes <= 5) return SEGMENT_REQUIREMENTS.short;
    if (targetMinutes <= 10) return SEGMENT_REQUIREMENTS.medium;
    return SEGMENT_REQUIREMENTS.long;
  }

  /**
   * Build complete generation constraints
   *
   * @param targetMinutes - Target story duration in minutes
   * @param providerType - LLM provider type (affects word count inflation)
   */
  buildConstraints(
    targetMinutes: number,
    providerType: 'openai' | 'anthropic' = 'openai',
  ): ScriptGenerationConstraints {
    const durationBudget = this.calculateDurationBudget(targetMinutes);
    const narrativeStructure = this.calculateNarrativeStructure(durationBudget.targetWordCount);
    const requirements = this.getSegmentRequirements(targetMinutes);

    // Word count inflation varies by provider:
    // - Claude tends to overshoot (generates ~115-130% of asked) → no inflation
    // - OpenAI tends to undershoot (generates ~55% of asked) → high inflation
    const wordCountInflation = providerType === 'anthropic' ? 0.0 : 0.80;

    return {
      durationBudget,
      narrativeStructure,
      minNarrationSegments: requirements.minNarration,
      minDialogueSegments: requirements.minDialogue,
      minSfxSegments: requirements.minSfx,
      maxConsecutiveSameType: requirements.maxConsecutive,
      wordCountInflation,
    };
  }

  /**
   * Count words in a text (handles French and English)
   */
  countWords(text: string): number {
    // Remove audio tags for word count
    const cleanText = text.replace(/\[[^\]]+\]/g, '');
    // Split on whitespace and filter empty
    const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
    return words.length;
  }

  /**
   * Calculate total word count from script
   */
  calculateScriptWordCount(script: StoryScript): number {
    let totalWords = 0;

    for (const track of script.tracks) {
      if (track.type === 'voice') {
        for (const segment of track.segments) {
          const content = segment.content as VoiceSegmentContent;
          if (content.text) {
            totalWords += this.countWords(content.text);
          }
        }
      }
    }

    return totalWords;
  }

  /**
   * Calculate estimated duration from word count
   */
  calculateEstimatedDuration(wordCount: number, sfxCount: number): number {
    const voiceDuration = wordCount / WORDS_PER_SECOND;
    const sfxDuration = sfxCount * 3; // Average 3s per SFX
    const pauseDuration = voiceDuration * 0.1; // 10% for pauses

    return Math.round(voiceDuration + sfxDuration + pauseDuration);
  }

  /**
   * Validate a generated script
   */
  validateScript(
    script: StoryScript,
    constraints: ScriptGenerationConstraints,
  ): ScriptValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Count segments by type
    let narrationCount = 0;
    let dialogueCount = 0;
    let sfxCount = 0;
    let musicCount = 0;

    for (const track of script.tracks) {
      for (const segment of track.segments) {
        if (track.type === 'voice') {
          const content = segment.content as VoiceSegmentContent;
          if (content.type === 'narration') narrationCount++;
          else if (content.type === 'dialogue') dialogueCount++;
        } else if (track.type === 'sfx') {
          sfxCount++;
        } else if (track.type === 'music') {
          musicCount++;
        }
      }
    }

    // Calculate word count
    const wordCount = this.calculateScriptWordCount(script);
    const targetWordCount = constraints.durationBudget.targetWordCount;
    // 15% tolerance for stricter word count control
    // With WPM=120 and proper prompt instructions, LLMs should hit the target more accurately
    const tolerance = 0.15;
    const minWords = Math.round(targetWordCount * (1 - tolerance));
    const maxWords = Math.round(targetWordCount * (1 + tolerance));

    // Validate word count
    if (wordCount < minWords) {
      errors.push(
        `Word count too low: ${wordCount} words (minimum: ${minWords}, target: ${targetWordCount}). ` +
        `Add ${minWords - wordCount} more words of narrative content.`
      );
    } else if (wordCount > maxWords) {
      warnings.push(
        `Word count slightly high: ${wordCount} words (maximum: ${maxWords}). Consider trimming.`
      );
    }

    // Validate segment counts
    if (narrationCount < constraints.minNarrationSegments) {
      errors.push(
        `Not enough narration: ${narrationCount} segments (minimum: ${constraints.minNarrationSegments})`
      );
    }

    if (dialogueCount < constraints.minDialogueSegments) {
      errors.push(
        `Not enough dialogue: ${dialogueCount} segments (minimum: ${constraints.minDialogueSegments})`
      );
    }

    if (sfxCount < constraints.minSfxSegments) {
      warnings.push(
        `Few sound effects: ${sfxCount} segments (recommended: ${constraints.minSfxSegments}+)`
      );
    }

    if (musicCount < 3) {
      warnings.push('Story should have at least 3 music changes (opening, climax, closing)');
    }

    // Validate timeline continuity
    const voiceTrack = script.tracks.find((t) => t.type === 'voice');
    if (voiceTrack && voiceTrack.segments.length > 1) {
      const segments = [...voiceTrack.segments].sort((a, b) => a.startTime - b.startTime);
      for (let i = 1; i < segments.length; i++) {
        const prev = segments[i - 1];
        const curr = segments[i];
        const expectedStart = prev ? prev.startTime + prev.duration : 0;

        if (curr && curr.startTime < expectedStart - 0.1) {
          errors.push(
            `Timeline overlap: segment ${curr.id} starts at ${curr.startTime}s but previous segment ends at ${expectedStart}s`
          );
        }
      }
    }

    // Calculate estimated duration from word count (informational only, not validated)
    // Duration is a consequence of word count, not a separate validation target
    const estimatedDuration = this.calculateEstimatedDuration(wordCount, sfxCount);

    return {
      isValid: errors.length === 0,
      wordCount,
      estimatedDuration,
      errors,
      warnings,
    };
  }

  /**
   * Build feedback message from validation result
   */
  buildFeedbackFromValidation(validation: ScriptValidationResult): string {
    const parts: string[] = [];

    if (validation.errors.length > 0) {
      parts.push('**ERRORS (must fix):**');
      for (const error of validation.errors) {
        parts.push(`- ${error}`);
      }
    }

    if (validation.warnings.length > 0) {
      parts.push('\n**WARNINGS (should address):**');
      for (const warning of validation.warnings) {
        parts.push(`- ${warning}`);
      }
    }

    parts.push(`\n**Current metrics:**`);
    parts.push(`- Word count: ${validation.wordCount}`);
    parts.push(`- Estimated duration: ${validation.estimatedDuration}s`);

    return parts.join('\n');
  }

  /**
   * Parse raw LLM response into StoryScript
   */
  parseScriptResponse(jsonString: string): StoryScript {
    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'LLMInvalidJSON',
      });
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'LLMResponseNotObject',
      });
    }

    const obj = parsed as Record<string, unknown>;

    // Validate required fields
    if (!obj.metadata || typeof obj.metadata !== 'object') {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'LLMMissingMetadata',
      });
    }

    if (!obj.tracks || !Array.isArray(obj.tracks)) {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'LLMMissingTracks',
      });
    }

    if (!obj.characters || !Array.isArray(obj.characters)) {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'LLMMissingCharacters',
      });
    }

    // Type assertion after validation
    return {
      version: 2,
      metadata: obj.metadata as StoryScript['metadata'],
      characters: obj.characters as StoryScript['characters'],
      tracks: obj.tracks as StoryScript['tracks'],
    };
  }

  /**
   * Generate script with validation and retry
   */
  async generateScript(
    input: ScriptGenerationInput,
    provider: ILLMRepository,
  ): Promise<ScriptGenerationResult> {
    const targetMinutes = input.targetDurationMinutes ?? 5;
    const providerType = provider.repositoryType === 'anthropic' ? 'anthropic' : 'openai';
    const constraints = this.buildConstraints(targetMinutes, providerType);
    const vocabularyLevel = getVocabularyLevel(input.profile.age);

    this.logger.info(
      `Generating script: ${input.enrichedConcept.title}, target=${targetMinutes}min (${constraints.durationBudget.targetWordCount} words), vocabulary=${vocabularyLevel}`,
    );

    let lastValidation: ScriptValidationResult | null = null;
    let previousFeedback: string | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      this.logger.info(`Script generation attempt ${attempt}/${this.maxAttempts}`);

      const context: ScriptGenerationContext = {
        enrichedConcept: input.enrichedConcept,
        childName: input.profile.firstName,
        childAge: input.profile.age,
        language: input.profile.language ?? 'fr',
        vocabularyLevel,
        constraints,
        answers: input.answers,
        previousAttemptFeedback: previousFeedback,
      };

      try {
        // Build prompts for LLM
        const systemPrompt = buildScriptGenerationSystemPrompt(
          {
            firstName: context.childName,
            age: context.childAge,
            gender: 'neutral',
            language: context.language,
          },
          context.enrichedConcept,
          context.vocabularyLevel,
          context.constraints,
        );

        const userPrompt = buildScriptGenerationUserPrompt(
          context.enrichedConcept,
          context.answers,
          context.previousAttemptFeedback,
        );

        // Call repository
        const response = await provider.completeWithRetry(systemPrompt, userPrompt);
        const script = this.parseScriptResponse(response.content);
        const validation = this.validateScript(script, constraints);

        lastValidation = validation;

        this.logger.info(
          `Script validation attempt ${attempt}: isValid=${validation.isValid}, wordCount=${validation.wordCount}/${constraints.durationBudget.targetWordCount}, errors=${validation.errors.length}`,
        );
        if (validation.errors.length > 0) {
          this.logger.warn(`Validation errors: ${validation.errors.join(' | ')}`);
        }
        if (validation.warnings.length > 0) {
          this.logger.info(`Validation warnings: ${validation.warnings.join(' | ')}`);
        }

        if (validation.isValid) {
          // Update metadata with calculated values
          script.metadata.wordCount = validation.wordCount;
          script.metadata.actualDuration = validation.estimatedDuration;

          return {
            script,
            validation,
            attempts: attempt,
          };
        }

        // Build feedback for retry
        previousFeedback = this.buildFeedbackFromValidation(validation);
      } catch (error) {
        this.logger.error(`Script generation attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt === this.maxAttempts) {
          throw error;
        }
      }
    }

    // If we get here, all attempts failed validation
    const errorDetails = lastValidation
      ? `Validation errors: ${lastValidation.errors.join('; ')}`
      : 'Unknown validation failure';

    this.logger.error('Script validation failed after all attempts', {
      attempts: this.maxAttempts,
      lastValidation,
      errorDetails,
    });
    throw new AppError(ErrorCodes.InternalError, {
      name: 'ScriptValidationFailed',
      errors: lastValidation?.errors,
      warnings: lastValidation?.warnings,
      wordCount: lastValidation?.wordCount,
      estimatedDuration: lastValidation?.estimatedDuration,
    } as Record<string, unknown>);
  }
}
