/**
 * Pause Computation Service Types
 *
 * Types for contextual pause computation between voice segments.
 */

import type { VoiceSegmentContent } from '@mio/shared/types';

/**
 * Pause context type - determines the pause duration
 */
export const PAUSE_CONTEXT_TYPE = {
  /** Question ending (? punctuation) */
  QUESTION: 'question',
  /** Suspense or trailing off (... punctuation) */
  SUSPENSE: 'suspense',
  /** Exclamation (! punctuation) */
  EXCLAMATION: 'exclamation',
  /** Change of scene or setting */
  SCENE_CHANGE: 'scene_change',
  /** Change of speaking character */
  CHARACTER_CHANGE: 'character_change',
  /** Rapid dialogue exchange */
  RAPID_DIALOGUE: 'rapid_dialogue',
  /** Default pause */
  DEFAULT: 'default'
} as const;

export type PauseContextType = (typeof PAUSE_CONTEXT_TYPE)[keyof typeof PAUSE_CONTEXT_TYPE];

/**
 * Pause hint from script segment
 */
export interface PauseHint {
  type: PauseContextType;
  durationMs: number;
}

/**
 * Voice segment info for pause computation
 */
export interface VoiceSegmentInfo {
  id: string;
  content: VoiceSegmentContent;
}

/**
 * Context for pause computation between two segments
 */
export interface PauseComputationContext {
  /** The current segment */
  currentSegment: VoiceSegmentInfo;
  /** The next segment (null if current is last) */
  nextSegment: VoiceSegmentInfo | null;
  /** Whether this is a scene transition (e.g., act change) */
  isSceneTransition?: boolean;
}

/**
 * Computed pause result
 */
export interface ComputedPause {
  /** Duration in seconds */
  durationSeconds: number;
  /** The context type that determined the pause */
  contextType: PauseContextType;
  /** Whether the pause was explicitly specified in the script */
  isExplicit: boolean;
}

/**
 * Pause computation configuration
 */
export interface PauseComputationConfig {
  /** Default pause duration in seconds */
  defaultPauseSeconds: number;
  /** Pause after question in seconds */
  questionPauseSeconds: number;
  /** Pause for suspense (...) in seconds */
  suspensePauseSeconds: number;
  /** Pause after exclamation in seconds */
  exclamationPauseSeconds: number;
  /** Pause for scene change in seconds */
  sceneChangePauseSeconds: number;
  /** Pause for character change in seconds */
  characterChangePauseSeconds: number;
  /** Pause for rapid dialogue in seconds */
  rapidDialoguePauseSeconds: number;
}
