/**
 * TTS Service Store
 *
 * Handles all persistence operations for TTS service:
 * - Audio cache lookups
 * - Storage uploads/downloads
 * - Cache management
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { RedisClient } from '@mio/shared/server/connections/redis';

import type { AudioCacheKeyParams, CachedAudio, IAudioCacheService } from '../cache/audio-cache.service.types';
import type { IStorageService } from '../storage';
import { IocConnection, IocService } from '../../ioc';

/**
 * Cached audio metadata with full details
 */
export interface CachedAudioMetadata extends CachedAudio {
  audio: Buffer;
}

/**
 * TTSStore - Repository for TTS audio persistence
 *
 * Isolates all cache and storage operations from business logic.
 */
@injectable()
export class TTSStore {
  constructor(
    @inject(IocConnection.DATABASE) protected readonly db: DatabaseConnection,
    @inject(IocConnection.REDIS) protected readonly redis: RedisClient,
    @inject(IocService.AUDIO_CACHE) private readonly audioCache: IAudioCacheService,
    @inject(IocService.STORAGE) private readonly storage: IStorageService
  ) { }

  /**
   * Get cached audio from cache and storage
   *
   * @returns Cached audio with blob and metadata, or null if not found
   */
  async getCachedAudio(cacheParams: AudioCacheKeyParams): Promise<CachedAudioMetadata | null> {
    // Check cache metadata
    const cached = await this.audioCache.get(cacheParams);
    if (!cached) {
      return null;
    }

    try {
      // Download audio from storage
      const audio = await this.storage.download(cached.url);

      // Increment usage counter
      await this.audioCache.incrementUsage(cacheParams);

      return {
        ...cached,
        audio
      };
    } catch {
      // Cache entry exists but file not found in storage
      // Return null to trigger regeneration
      return null;
    }
  }

  /**
   * Persist generated audio to storage and cache
   *
   * @param cacheParams - Cache key parameters
   * @param audio - Audio buffer to persist
   * @param metadata - Audio metadata (duration, voiceId, etc.)
   */
  async persistAudio(
    cacheParams: AudioCacheKeyParams,
    audio: Buffer,
    metadata: {
      voiceId: string;
      durationSeconds: number;
      emotion?: string;
      characterName?: string;
    }
  ): Promise<{ url: string }> {
    // Generate storage path
    const storagePath = `tts/${metadata.voiceId}/${Date.now()}-${Bun.hash(cacheParams.text)}.mp3`;

    // Upload to storage
    await this.storage.upload(audio, storagePath, {
      contentType: 'audio/mpeg'
    });

    // Store in cache
    await this.audioCache.set(cacheParams, {
      url: storagePath,
      duration: metadata.durationSeconds * 1000, // Convert to ms
      voiceId: metadata.voiceId,
      metadata: {
        emotion: metadata.emotion,
        characterName: metadata.characterName
      }
    });

    return { url: storagePath };
  }

  /**
   * Generate cache key for logging/debugging
   */
  generateCacheKey(cacheParams: AudioCacheKeyParams): string {
    return this.audioCache.generateCacheKey(cacheParams);
  }
}
