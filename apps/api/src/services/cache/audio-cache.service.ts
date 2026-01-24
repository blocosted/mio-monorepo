/**
 * Audio Cache Service Implementation
 *
 * Specialized caching for audio assets with 30-day TTL.
 * Uses deterministic hashing of all TTS parameters for cache keys.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { AudioCacheKeyParams, CachedAudio, CacheVoiceSettings, IAudioCacheService } from './audio-cache.service.types';
import type { ICacheService } from './cache.service.types';
import { IocService } from '../../ioc/ioc.types';

/** 30 days in seconds */
const AUDIO_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Cache key prefixes */
const AUDIO_CACHE_PREFIX = 'tts:audio';
const AUDIO_USAGE_PREFIX = 'tts:usage';

/**
 * Normalize voice settings for deterministic hashing.
 * Ensures consistent key ordering and handles undefined values.
 */
function normalizeVoiceSettings(settings?: CacheVoiceSettings): Record<string, number | null> {
  return {
    similarity_boost: settings?.similarityBoost ?? null,
    speed: settings?.speed ?? null,
    stability: settings?.stability ?? null,
    style: settings?.style ?? null
  };
}

/**
 * Generate deterministic cache key from all TTS parameters.
 * Uses sorted keys to ensure consistent hashing regardless of parameter order.
 */
function generateDeterministicHash(params: AudioCacheKeyParams): string {
  const normalized = {
    model_id: params.modelId,
    output_format: params.outputFormat,
    text: params.text,
    voice_id: params.voiceId,
    voice_settings: normalizeVoiceSettings(params.voiceSettings)
  };

  // JSON.stringify with sorted keys for deterministic output
  const sortedJson = JSON.stringify(normalized);
  return String(Bun.hash(sortedJson));
}

/**
 * Audio Cache Service
 *
 * Caches audio metadata with 30-day TTL.
 * Uses deterministic hashing of all TTS parameters for cache keys.
 */
@injectable()
export class AudioCacheService implements IAudioCacheService {
  constructor(@inject(IocService.CACHE) private readonly cache: ICacheService) {}

  /**
   * Generate deterministic cache key from all TTS parameters
   */
  generateCacheKey(params: AudioCacheKeyParams): string {
    const hash = generateDeterministicHash(params);
    return `${AUDIO_CACHE_PREFIX}:${hash}`;
  }

  /**
   * Generate cache key from all TTS parameters
   */
  private generateKey(params: AudioCacheKeyParams): string {
    return this.generateCacheKey(params);
  }

  /**
   * Generate usage key from all TTS parameters
   */
  private generateUsageKey(params: AudioCacheKeyParams): string {
    const hash = generateDeterministicHash(params);
    return `${AUDIO_USAGE_PREFIX}:${hash}`;
  }

  /**
   * Get cached audio by prompt and voice
   */
  async get(params: AudioCacheKeyParams): Promise<CachedAudio | null> {
    const key = this.generateKey(params);
    return this.cache.get<CachedAudio>(key);
  }

  /**
   * Cache audio metadata
   */
  async set(params: AudioCacheKeyParams, audio: Omit<CachedAudio, 'cachedAt'>): Promise<void> {
    const key = this.generateKey(params);
    const audioWithTimestamp: CachedAudio = {
      ...audio,
      cachedAt: Date.now()
    };
    await this.cache.set(key, audioWithTimestamp, { ex: AUDIO_CACHE_TTL_SECONDS });
  }

  /**
   * Check if audio is cached
   */
  async exists(params: AudioCacheKeyParams): Promise<boolean> {
    const key = this.generateKey(params);
    return this.cache.exists(key);
  }

  /**
   * Increment usage counter for a cached audio
   */
  async incrementUsage(params: AudioCacheKeyParams): Promise<number> {
    const key = this.generateUsageKey(params);
    return this.cache.incr(key);
  }

  /**
   * Get usage count for a cached audio
   */
  async getUsageCount(params: AudioCacheKeyParams): Promise<number> {
    const key = this.generateUsageKey(params);
    const count = await this.cache.get<number>(key);
    return count ?? 0;
  }
}
