/**
 * Timeline Sync Service Types
 *
 * Service to recalculate SFX and music timings based on actual TTS durations.
 * This is necessary because LLM-generated timing estimates differ significantly
 * from actual TTS output durations.
 */

import type { StoryScript } from '@mio/shared/types';

/**
 * TTS result with actual duration for a single segment
 */
export interface TTSSegmentResult {
  /** Segment ID matching the script segment */
  segmentId: string;
  /** Actual duration from TTS generation (seconds) */
  actualDurationSeconds: number;
  /** Original estimated duration from LLM (seconds) - optional for comparison */
  estimatedDurationSeconds?: number;
}

/**
 * Voice segment timing information
 */
export interface VoiceSegmentTiming {
  /** Segment ID */
  segmentId: string;
  /** Start time in the final timeline (seconds) */
  startTime: number;
  /** End time in the final timeline (seconds) */
  endTime: number;
  /** Actual duration (seconds) */
  duration: number;
}

/**
 * Metadata about the synchronization process
 */
export interface SyncMetadata {
  /** Original total duration from LLM estimates (seconds) */
  originalTotalDuration: number;
  /** Actual total duration after TTS (seconds) */
  actualTotalDuration: number;
  /** Percentage drift from original (positive = longer, negative = shorter) */
  driftPercentage: number;
  /** ISO timestamp when sync was performed */
  syncedAt: string;
  /** Pause duration between segments (seconds) */
  pauseBetweenSegments: number;
}

/**
 * Synchronized script with recalculated timings
 */
export interface SyncedStoryScript extends StoryScript {
  /** Metadata about the synchronization */
  syncMetadata: SyncMetadata;
}

/**
 * Options for timeline synchronization
 */
export interface TimelineSyncOptions {
  /** Pause duration between voice segments (default: 0.5s) */
  pauseBetweenSegments?: number;
  /** Whether to preserve relative SFX positioning within segments (default: true) */
  preserveRelativePositioning?: boolean;
}

