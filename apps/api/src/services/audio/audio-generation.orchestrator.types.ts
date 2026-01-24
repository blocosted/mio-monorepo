/**
 * Audio Generation Orchestrator Types
 *
 * Types for orchestrating SFX, Music, and Ambiance generation with caching.
 */

import type { AudioAssetType, StoryScript } from '@mio/shared/types';

/**
 * Base input for audio generation
 */
export interface AudioGenerationBaseInput {
  /** Story ID for asset storage */
  storyId: string;
  /** Script containing audio segments */
  script: StoryScript;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Input for SFX generation
 */
export interface SfxGenerationInput extends AudioGenerationBaseInput {
  /** Story duration for cache key (optional) */
  storyDuration?: number;
}

/**
 * Input for Music generation
 */
export interface MusicGenerationInput extends AudioGenerationBaseInput {
  /** Default volume for music (0-1, default: 0.3) */
  defaultVolume?: number;
}

/**
 * Input for Ambiance generation
 */
export interface AmbianceGenerationInput extends AudioGenerationBaseInput {
  /** Default volume for ambiance (0-1, default: 0.2) */
  defaultVolume?: number;
}

/**
 * Result of generating a single audio segment
 */
export interface AudioSegmentGenerationResult {
  /** Segment ID */
  segmentId: string;
  /** Audio asset ID (stored in audio_assets table) */
  assetId: string;
  /** Whether the asset was from cache */
  fromCache: boolean;
  /** Duration in seconds */
  durationSeconds: number;
  /** Asset type */
  type: AudioAssetType;
}

/**
 * Result of generating all audio segments of a type
 */
export interface AudioGenerationResult {
  /** IDs of created audio assets */
  assetIds: string[];
  /** Individual segment results */
  segments: AudioSegmentGenerationResult[];
  /** Number of successfully generated segments */
  successCount: number;
  /** Number of failed segments */
  failedCount: number;
  /** Number of cached segments */
  cachedCount: number;
  /** Total duration in seconds */
  totalDurationSeconds: number;
}

