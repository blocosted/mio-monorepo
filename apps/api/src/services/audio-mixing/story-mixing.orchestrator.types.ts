/**
 * Story Mixing Orchestrator Types
 *
 * Types for orchestrating audio mixing including asset loading and input building.
 */

import type { StoryScript } from '@mio/shared/types';

import type { MixStoryInput } from './ffmpeg-mixer.service.types';

/**
 * Input for mixing a story
 */
export interface StoryMixingInput {
  /** Story ID */
  storyId: string;
  /** Story script for segment timings */
  script: StoryScript;
  /** Voice asset IDs from generation */
  voiceAssetIds: string[];
  /** SFX asset IDs from generation */
  sfxAssetIds?: string[];
  /** Music asset IDs from generation */
  musicAssetIds?: string[];
  /** Ambiance asset IDs from generation */
  ambianceAssetIds?: string[];
  /** Volume settings overrides */
  volumeSettings?: {
    voice?: number;
    sfx?: number;
    music?: number;
    ambiance?: number;
  };
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

/**
 * Audio asset loaded from database
 */
export interface LoadedAudioAsset {
  id: string;
  url: string;
  duration: number;
  cacheKey?: string | null;
}

