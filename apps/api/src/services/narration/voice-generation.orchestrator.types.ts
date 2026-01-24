/**
 * Voice Generation Orchestrator Types
 *
 * Types for orchestrating voice generation with caching and concurrency control.
 */

import type { StoryScript } from '@mio/shared/types';

/**
 * Input for generating all voice segments
 */
export interface VoiceGenerationInput {
  /** Story ID for asset storage */
  storyId: string;
  /** Script containing voice segments and character mappings */
  script: StoryScript;
  /** Maximum concurrent TTS requests (default: 3) */
  concurrency?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Result of voice generation for a single segment
 */
export interface VoiceSegmentGenerationResult {
  /** Segment ID */
  segmentId: string;
  /** Audio asset ID (stored in audio_assets table) */
  assetId: string;
  /** Whether the asset was from cache */
  fromCache: boolean;
  /** Duration in seconds */
  durationSeconds: number;
}

/**
 * Result of generating all voice segments
 */
export interface VoiceGenerationResult {
  /** IDs of created audio assets */
  assetIds: string[];
  /** Individual segment results */
  segments: VoiceSegmentGenerationResult[];
  /** Number of successfully generated segments */
  successCount: number;
  /** Number of failed segments */
  failedCount: number;
  /** Number of cached segments */
  cachedCount: number;
  /** Total duration in seconds */
  totalDurationSeconds: number;
}

