/**
 * SFX Cache Service Implementation
 *
 * Specialized caching for sound effects with 30-day TTL.
 * Uses deterministic hashing of all SFX parameters for cache keys.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { CacheService } from './cache.service';
import type { CachedSfx, SfxCacheKeyParams } from './sfx-cache.service.types';
import { IocService } from '../../ioc/ioc.types';

/** 30 days in seconds */
const SFX_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Cache key prefixes */
const SFX_CACHE_PREFIX = 'sfx:audio';
const SFX_USAGE_PREFIX = 'sfx:usage';

/**
 * Generate deterministic cache key from all SFX parameters.
 * Uses sorted keys to ensure consistent hashing regardless of parameter order.
 */
function generateDeterministicHash(params: SfxCacheKeyParams): string {
  const normalized = {
    duration_seconds: params.durationSeconds ?? null,
    output_format: params.outputFormat,
    prompt_influence: params.promptInfluence,
    text: params.text
  };

  // JSON.stringify with sorted keys for deterministic output
  const sortedJson = JSON.stringify(normalized);
  return String(Bun.hash(sortedJson));
}

/**
 * SFX Cache Service
 *
 * Caches SFX metadata with 30-day TTL.
 * Uses deterministic hashing of all SFX parameters for cache keys.
 */
@injectable()
export class SfxCacheService {
  constructor(@inject(IocService.CACHE) private readonly cache: CacheService) {}

  /**
   * Generate deterministic cache key from all SFX parameters
   */
  generateCacheKey(params: SfxCacheKeyParams): string {
    const hash = generateDeterministicHash(params);
    return `${SFX_CACHE_PREFIX}:${hash}`;
  }

  /**
   * Generate cache key from all SFX parameters
   */
  private generateKey(params: SfxCacheKeyParams): string {
    return this.generateCacheKey(params);
  }

  /**
   * Generate usage key from all SFX parameters
   */
  private generateUsageKey(params: SfxCacheKeyParams): string {
    const hash = generateDeterministicHash(params);
    return `${SFX_USAGE_PREFIX}:${hash}`;
  }

  /**
   * Get cached SFX by all parameters
   */
  async get(params: SfxCacheKeyParams): Promise<CachedSfx | null> {
    const key = this.generateKey(params);
    return this.cache.get<CachedSfx>(key);
  }

  /**
   * Cache SFX metadata
   */
  async set(params: SfxCacheKeyParams, sfx: Omit<CachedSfx, 'cachedAt'>): Promise<void> {
    const key = this.generateKey(params);
    const sfxWithTimestamp: CachedSfx = {
      ...sfx,
      cachedAt: Date.now()
    };
    await this.cache.set(key, sfxWithTimestamp, { ex: SFX_CACHE_TTL_SECONDS });
  }

  /**
   * Check if SFX is cached
   */
  async exists(params: SfxCacheKeyParams): Promise<boolean> {
    const key = this.generateKey(params);
    return this.cache.exists(key);
  }

  /**
   * Increment usage counter for a cached SFX
   */
  async incrementUsage(params: SfxCacheKeyParams): Promise<number> {
    const key = this.generateUsageKey(params);
    return this.cache.incr(key);
  }

  /**
   * Get usage count for a cached SFX
   */
  async getUsageCount(params: SfxCacheKeyParams): Promise<number> {
    const key = this.generateUsageKey(params);
    const count = await this.cache.get<number>(key);
    return count ?? 0;
  }
}
