/**
 * Pause Computation Service
 *
 * Computes contextual pause durations between voice segments based on:
 * - Punctuation (?, !, ...)
 * - Character changes
 * - Scene transitions
 * - Dialogue rhythm
 */

import 'reflect-metadata';

import { injectable } from 'inversify';

import type {
  ComputedPause,
  PauseComputationConfig,
  PauseComputationContext,
  PauseContextType,
  VoiceSegmentInfo
} from './pause-computation.service.types';
import { PAUSE_CONTEXT_TYPE } from './pause-computation.service.types';
import { AbstractService } from '../service.abstract';

/**
 * Default pause configuration
 */
const DEFAULT_CONFIG: PauseComputationConfig = {
  defaultPauseSeconds: 0.3,
  questionPauseSeconds: 0.8,
  suspensePauseSeconds: 1.5,
  exclamationPauseSeconds: 0.4,
  sceneChangePauseSeconds: 2.0,
  characterChangePauseSeconds: 0.6,
  rapidDialoguePauseSeconds: 0.15
};

/**
 * Scene transition keywords (indicate a change in setting)
 */
const SCENE_TRANSITION_KEYWORDS = [
  // English
  'meanwhile',
  'later',
  'the next day',
  'the following',
  'suddenly',
  'elsewhere',
  'back at',
  'at the',
  'in the',
  // French
  'pendant ce temps',
  'plus tard',
  'le lendemain',
  'soudain',
  'ailleurs',
  'de retour'
];

/**
 * Pause Computation Service
 *
 * Analyzes voice segments to compute appropriate pause durations
 * based on narrative context and dialogue rhythm.
 */
@injectable()
export class PauseComputationService extends AbstractService {
  private readonly config: PauseComputationConfig;

  constructor(config?: Partial<PauseComputationConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute the pause duration after a voice segment
   */
  computePause(context: PauseComputationContext): ComputedPause {
    const { currentSegment, nextSegment, isSceneTransition } = context;
    const text = currentSegment.content.text.trim();

    // Priority 1: Explicit scene transition (highest priority)
    if (isSceneTransition) {
      return this.createPause(
        this.config.sceneChangePauseSeconds,
        PAUSE_CONTEXT_TYPE.SCENE_CHANGE,
        true
      );
    }

    // Priority 2: Check for scene transition keywords at the start of next segment
    if (nextSegment && this.isSceneTransitionSegment(nextSegment)) {
      return this.createPause(
        this.config.sceneChangePauseSeconds,
        PAUSE_CONTEXT_TYPE.SCENE_CHANGE,
        false
      );
    }

    // Priority 3: Punctuation-based pauses
    const punctuationPause = this.computePunctuationPause(text);
    if (punctuationPause) {
      return punctuationPause;
    }

    // Priority 4: Character change (only for dialogue)
    if (this.isCharacterChange(currentSegment, nextSegment)) {
      // Check for rapid dialogue pattern
      if (this.isRapidDialogue(currentSegment, nextSegment)) {
        return this.createPause(
          this.config.rapidDialoguePauseSeconds,
          PAUSE_CONTEXT_TYPE.RAPID_DIALOGUE,
          false
        );
      }
      return this.createPause(
        this.config.characterChangePauseSeconds,
        PAUSE_CONTEXT_TYPE.CHARACTER_CHANGE,
        false
      );
    }

    // Default pause
    return this.createPause(
      this.config.defaultPauseSeconds,
      PAUSE_CONTEXT_TYPE.DEFAULT,
      false
    );
  }

  /**
   * Compute pauses for a list of voice segments
   *
   * @returns Map of segment index to pause duration in seconds
   */
  computePausesForSegments(segments: VoiceSegmentInfo[]): Map<number, number> {
    const pauses = new Map<number, number>();

    for (let i = 0; i < segments.length; i++) {
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1] ?? null;

      if (!currentSegment) continue;

      const context: PauseComputationContext = {
        currentSegment,
        nextSegment
      };

      const computed = this.computePause(context);
      pauses.set(i, computed.durationSeconds);
    }

    return pauses;
  }

  /**
   * Compute pause based on ending punctuation
   */
  private computePunctuationPause(text: string): ComputedPause | null {
    // Check the last non-whitespace characters
    const trimmed = text.trimEnd();

    // Suspense (ellipsis) - must check before single period
    if (trimmed.endsWith('...') || trimmed.endsWith('\u2026')) {
      return this.createPause(
        this.config.suspensePauseSeconds,
        PAUSE_CONTEXT_TYPE.SUSPENSE,
        false
      );
    }

    // Question
    if (trimmed.endsWith('?')) {
      return this.createPause(
        this.config.questionPauseSeconds,
        PAUSE_CONTEXT_TYPE.QUESTION,
        false
      );
    }

    // Exclamation
    if (trimmed.endsWith('!')) {
      return this.createPause(
        this.config.exclamationPauseSeconds,
        PAUSE_CONTEXT_TYPE.EXCLAMATION,
        false
      );
    }

    // No special punctuation
    return null;
  }

  /**
   * Check if there's a character change between segments
   */
  private isCharacterChange(
    current: VoiceSegmentInfo,
    next: VoiceSegmentInfo | null
  ): boolean {
    if (!next) return false;

    // Both must be dialogue
    if (current.content.type !== 'dialogue' || next.content.type !== 'dialogue') {
      return false;
    }

    // Compare character names
    const currentChar = current.content.characterName?.toLowerCase();
    const nextChar = next.content.characterName?.toLowerCase();

    return currentChar !== nextChar;
  }

  /**
   * Check if this is a rapid dialogue exchange
   *
   * Short lines exchanged quickly between characters
   */
  private isRapidDialogue(
    current: VoiceSegmentInfo,
    next: VoiceSegmentInfo | null
  ): boolean {
    if (!next) return false;

    // Both must be dialogue
    if (current.content.type !== 'dialogue' || next.content.type !== 'dialogue') {
      return false;
    }

    // Check if both lines are short (less than 30 characters)
    const currentText = current.content.text.trim();
    const nextText = next.content.text.trim();

    const isCurrentShort = currentText.length < 30;
    const isNextShort = nextText.length < 30;

    return isCurrentShort && isNextShort;
  }

  /**
   * Check if a segment starts with scene transition keywords
   */
  private isSceneTransitionSegment(segment: VoiceSegmentInfo): boolean {
    // Only narration can indicate scene transitions
    if (segment.content.type !== 'narration') {
      return false;
    }

    const text = segment.content.text.toLowerCase().trim();

    return SCENE_TRANSITION_KEYWORDS.some((keyword) => text.startsWith(keyword));
  }

  /**
   * Create a pause result
   */
  private createPause(
    durationSeconds: number,
    contextType: PauseContextType,
    isExplicit: boolean
  ): ComputedPause {
    return {
      durationSeconds,
      contextType,
      isExplicit
    };
  }
}
