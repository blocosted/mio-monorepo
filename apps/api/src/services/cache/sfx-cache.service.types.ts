/**
 * SFX Cache Service Types
 *
 * Type definitions for sound effects caching.
 */

import type { SfxCategory } from '../../repositories/audio/audio-repository.types';

/**
 * Cached SFX metadata
 */
export interface CachedSfx {
  /** Storage URL of the audio file */
  url: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Category of the sound effect */
  category?: SfxCategory;
  /** Timestamp when cached */
  cachedAt: number;
  /** Optional audio metadata (format, bitrate, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * SFX cache key parameters (all params that affect SFX output)
 */
export interface SfxCacheKeyParams {
  /** Text description of the sound effect */
  text: string;
  /** Output format (e.g., 'mp3_44100_128') */
  outputFormat: string;
  /** Duration in seconds (undefined = auto) */
  durationSeconds?: number;
  /** Prompt influence (0-1) */
  promptInfluence: number;
}

