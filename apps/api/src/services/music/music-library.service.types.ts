/**
 * Music Library Service Types
 *
 * Service for managing the persistent Music library.
 */

import type { MusicIntensity, MusicMood, MusicTempo } from '@mio/shared/types';

/**
 * Parameters for finding Music in library
 */
export interface FindMusicParams {
  mood: MusicMood;
  intensity?: MusicIntensity;
  tempo?: MusicTempo;
}

/**
 * Parameters for storing Music in library
 */
export interface StoreMusicParams {
  canonicalKey: string;
  mood: MusicMood;
  intensity?: MusicIntensity;
  tempo?: MusicTempo;
  variationIndex: number;
  prompt: string;
  promptInfluence?: number;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags?: string[];
  storyUniverses?: string[];
}

/**
 * Stored Music from library
 */
export interface StoredMusic {
  id: string;
  canonicalKey: string;
  mood: MusicMood;
  intensity: MusicIntensity | null;
  tempo: MusicTempo | null;
  variationIndex: number;
  prompt: string;
  promptInfluence: number | null;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Music lookup result
 */
export interface MusicLookupResult {
  music: StoredMusic | null;
  fromCache: boolean;
}

