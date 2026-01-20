/**
 * Audio Cache Service Implementation
 *
 * Specialized caching for audio assets with 30-day TTL.
 * Uses prompt hashing for cache keys.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocService } from '../../ioc';
import type { ICacheService } from './cache.service.types';
import type {
    IAudioCacheService,
    CachedAudio,
    AudioCacheKeyParams,
} from './audio-cache.service.types';

/** 30 days in seconds */
const AUDIO_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Cache key prefixes */
const AUDIO_CACHE_PREFIX = 'audio';
const AUDIO_USAGE_PREFIX = 'audio:usage';

/**
 * Audio Cache Service
 *
 * Caches audio metadata with 30-day TTL.
 * Uses content-based hashing for cache keys.
 */
@injectable()
export class AudioCacheService implements IAudioCacheService {
    constructor(
        @inject(IocService.CACHE) private readonly cache: ICacheService
    ) {}

    /**
     * Generate cache key from prompt and voice
     */
    private generateKey(params: AudioCacheKeyParams): string {
        const hash = Bun.hash(`${params.prompt}:${params.voiceId}`);
        return `${AUDIO_CACHE_PREFIX}:${hash}`;
    }

    /**
     * Generate usage key from prompt and voice
     */
    private generateUsageKey(params: AudioCacheKeyParams): string {
        const hash = Bun.hash(`${params.prompt}:${params.voiceId}`);
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
            cachedAt: Date.now(),
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
