/**
 * Story Mixing Orchestrator Types
 *
 * Types for orchestrating audio mixing with computed timeline.
 */

import type { ComputedTimeline } from '@mio/shared/types';

/**
 * Volume settings for mixing
 */
export interface VolumeSettings {
  voice?: number;
  sfx?: number;
  music?: number;
  ambiance?: number;
}

/**
 * Input for mixing a story using ComputedTimeline
 *
 * Uses absolute times from ComputedTimeline which are based on real TTS durations.
 */
export interface StoryMixingInputV3 {
  /** Story ID */
  storyId: string;
  /** Computed timeline with real durations and absolute times */
  computedTimeline: ComputedTimeline;
  /** Volume settings overrides */
  volumeSettings?: VolumeSettings;
}

/**
 * Result of story mixing
 */
export interface StoryMixingResult {
  /** Mixed audio buffer */
  audio: Buffer;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Temporary S3 URL for the mixed audio */
  tempUrl: string;
}

