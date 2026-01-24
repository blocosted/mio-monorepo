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

/**
 * SFX Cache Service Interface
 */
export interface ISfxCacheService {
  /**
   * Generate deterministic cache key from all SFX parameters
   * @param params - All parameters that affect SFX output
   * @returns Deterministic cache key string
   */
  generateCacheKey(params: SfxCacheKeyParams): string;

  /**
   * Get cached SFX by all parameters
   * @param params - Cache key parameters
   * @returns Cached SFX or null if not found
   */
  get(params: SfxCacheKeyParams): Promise<CachedSfx | null>;

  /**
   * Cache SFX metadata
   * @param params - Cache key parameters
   * @param sfx - SFX metadata to cache (cachedAt will be added automatically)
   */
  set(params: SfxCacheKeyParams, sfx: Omit<CachedSfx, 'cachedAt'>): Promise<void>;

  /**
   * Check if SFX is cached
   * @param params - Cache key parameters
   * @returns True if cached
   */
  exists(params: SfxCacheKeyParams): Promise<boolean>;

  /**
   * Increment usage counter for a cached SFX
   * @param params - Cache key parameters
   * @returns New usage count
   */
  incrementUsage(params: SfxCacheKeyParams): Promise<number>;

  /**
   * Get usage count for a cached SFX
   * @param params - Cache key parameters
   * @returns Usage count or 0 if not tracked
   */
  getUsageCount(params: SfxCacheKeyParams): Promise<number>;
}
