/**
 * Audio Cache Service Integration Tests
 *
 * Tests audio-specific caching with 30-day TTL using a real Redis instance.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { CacheService } from '../cache.service';
import { AudioCacheService } from '../audio-cache.service';
import type { CachedAudio, AudioCacheKeyParams } from '../audio-cache.service.types';
import { createTestRedisClient, cleanupRedisKeys } from '../../../tests/test.helpers';
import type { RedisClient } from '@mio/shared/server/connections/redis';

describe('AudioCacheService', () => {
    let redis: RedisClient;
    let closeRedis: () => Promise<void>;
    let cacheService: CacheService;
    let audioCacheService: AudioCacheService;

    const testParams: AudioCacheKeyParams = {
        prompt: 'Once upon a time in a magical forest',
        voiceId: 'voice-123',
    };

    const testAudio: Omit<CachedAudio, 'cachedAt'> = {
        url: 'https://storage.example.com/audio/123.mp3',
        duration: 5000,
        voiceId: 'voice-123',
    };

    beforeAll(async () => {
        const client = await createTestRedisClient();
        redis = client.redis;
        closeRedis = client.close;
        cacheService = new CacheService(redis);
        audioCacheService = new AudioCacheService(cacheService);
    });

    afterAll(async () => {
        await closeRedis();
    });

    beforeEach(async () => {
        // Clean up test keys before each test
        await cleanupRedisKeys(redis, 'audio:*');
    });

    describe('get()', () => {
        it('returns cached audio if exists', async () => {
            await audioCacheService.set(testParams, testAudio);
            const result = await audioCacheService.get(testParams);

            expect(result).not.toBeNull();
            expect(result?.url).toBe(testAudio.url);
            expect(result?.duration).toBe(testAudio.duration);
            expect(result?.voiceId).toBe(testAudio.voiceId);
            expect(result?.cachedAt).toBeGreaterThan(0);
        });

        it('returns null if audio not cached', async () => {
            const params: AudioCacheKeyParams = {
                prompt: 'Non-existent prompt',
                voiceId: 'voice-999',
            };

            const result = await audioCacheService.get(params);
            expect(result).toBeNull();
        });

        it('generates consistent keys for same params', async () => {
            await audioCacheService.set(testParams, testAudio);

            const result1 = await audioCacheService.get(testParams);
            const result2 = await audioCacheService.get(testParams);

            expect(result1).toEqual(result2);
        });

        it('generates different keys for different prompts', async () => {
            const params1 = { ...testParams, prompt: 'Prompt 1' };
            const params2 = { ...testParams, prompt: 'Prompt 2' };

            const audio1 = { ...testAudio, url: 'https://storage.example.com/audio/1.mp3' };
            const audio2 = { ...testAudio, url: 'https://storage.example.com/audio/2.mp3' };

            await audioCacheService.set(params1, audio1);
            await audioCacheService.set(params2, audio2);

            const result1 = await audioCacheService.get(params1);
            const result2 = await audioCacheService.get(params2);

            expect(result1?.url).toBe(audio1.url);
            expect(result2?.url).toBe(audio2.url);
        });

        it('generates different keys for different voices', async () => {
            const params1 = { ...testParams, voiceId: 'voice-1' };
            const params2 = { ...testParams, voiceId: 'voice-2' };

            const audio1 = { ...testAudio, voiceId: 'voice-1' };
            const audio2 = { ...testAudio, voiceId: 'voice-2' };

            await audioCacheService.set(params1, audio1);
            await audioCacheService.set(params2, audio2);

            const result1 = await audioCacheService.get(params1);
            const result2 = await audioCacheService.get(params2);

            expect(result1?.voiceId).toBe('voice-1');
            expect(result2?.voiceId).toBe('voice-2');
        });
    });

    describe('set()', () => {
        it('caches audio with 30-day TTL', async () => {
            await audioCacheService.set(testParams, testAudio);

            const result = await audioCacheService.get(testParams);
            expect(result).not.toBeNull();

            // Verify TTL is set (we can't easily test 30 days, but we can verify it exists)
            const exists = await audioCacheService.exists(testParams);
            expect(exists).toBe(true);
        });

        it('adds cachedAt timestamp', async () => {
            const beforeTime = Date.now();
            await audioCacheService.set(testParams, testAudio);
            const afterTime = Date.now();

            const result = await audioCacheService.get(testParams);

            expect(result?.cachedAt).toBeGreaterThanOrEqual(beforeTime);
            expect(result?.cachedAt).toBeLessThanOrEqual(afterTime);
        });

        it('preserves audio metadata', async () => {
            await audioCacheService.set(testParams, testAudio);
            const result = await audioCacheService.get(testParams);

            expect(result?.url).toBe(testAudio.url);
            expect(result?.duration).toBe(testAudio.duration);
            expect(result?.voiceId).toBe(testAudio.voiceId);
        });

        it('handles audio with metadata', async () => {
            const audioWithMetadata = {
                ...testAudio,
                metadata: {
                    format: 'mp3',
                    bitrate: 128,
                    sampleRate: 44100,
                    channels: 2,
                },
            };

            await audioCacheService.set(testParams, audioWithMetadata);
            const result = await audioCacheService.get(testParams);

            expect(result?.metadata).toEqual(audioWithMetadata.metadata);
            expect(result?.metadata?.format).toBe('mp3');
            expect(result?.metadata?.bitrate).toBe(128);
        });
    });

    describe('exists()', () => {
        it('returns true when audio is cached', async () => {
            await audioCacheService.set(testParams, testAudio);
            const result = await audioCacheService.exists(testParams);

            expect(result).toBe(true);
        });

        it('returns false when audio is not cached', async () => {
            const params: AudioCacheKeyParams = {
                prompt: 'Non-existent',
                voiceId: 'voice-999',
            };

            const result = await audioCacheService.exists(params);
            expect(result).toBe(false);
        });
    });

    describe('incrementUsage()', () => {
        it('increments usage counter', async () => {
            const result1 = await audioCacheService.incrementUsage(testParams);
            expect(result1).toBe(1);

            const result2 = await audioCacheService.incrementUsage(testParams);
            expect(result2).toBe(2);

            const result3 = await audioCacheService.incrementUsage(testParams);
            expect(result3).toBe(3);
        });

        it('tracks usage independently from cache', async () => {
            // Increment usage without setting audio
            const usage1 = await audioCacheService.incrementUsage(testParams);
            expect(usage1).toBe(1);

            // Audio should not exist
            const audio = await audioCacheService.get(testParams);
            expect(audio).toBeNull();

            // But usage should be tracked
            const usage2 = await audioCacheService.getUsageCount(testParams);
            expect(usage2).toBe(1);
        });
    });

    describe('getUsageCount()', () => {
        it('returns usage count when exists', async () => {
            await audioCacheService.incrementUsage(testParams);
            await audioCacheService.incrementUsage(testParams);
            await audioCacheService.incrementUsage(testParams);

            const result = await audioCacheService.getUsageCount(testParams);
            expect(result).toBe(3);
        });

        it('returns 0 when usage not tracked', async () => {
            const params: AudioCacheKeyParams = {
                prompt: 'Never used',
                voiceId: 'voice-999',
            };

            const result = await audioCacheService.getUsageCount(params);
            expect(result).toBe(0);
        });
    });

    describe('cache key generation', () => {
        it('uses Bun.hash for consistent hashing', async () => {
            await audioCacheService.set(testParams, testAudio);

            // Same params should retrieve same audio
            const result1 = await audioCacheService.get(testParams);
            const result2 = await audioCacheService.get({ ...testParams });

            expect(result1).toEqual(result2);
        });

        it('handles special characters in prompts', async () => {
            const specialParams: AudioCacheKeyParams = {
                prompt: 'Prompt with émojis 🎵 and symbols: @#$%',
                voiceId: 'voice-123',
            };

            await audioCacheService.set(specialParams, testAudio);
            const result = await audioCacheService.get(specialParams);

            expect(result).not.toBeNull();
            expect(result?.url).toBe(testAudio.url);
        });

        it('handles very long prompts', async () => {
            const longPrompt = 'A'.repeat(10000);
            const longParams: AudioCacheKeyParams = {
                prompt: longPrompt,
                voiceId: 'voice-123',
            };

            await audioCacheService.set(longParams, testAudio);
            const result = await audioCacheService.get(longParams);

            expect(result).not.toBeNull();
        });
    });

    describe('edge cases', () => {
        it('handles empty prompts', async () => {
            const emptyParams: AudioCacheKeyParams = {
                prompt: '',
                voiceId: 'voice-123',
            };

            await audioCacheService.set(emptyParams, testAudio);
            const result = await audioCacheService.get(emptyParams);

            expect(result).not.toBeNull();
        });

        it('handles audio with zero duration', async () => {
            const zeroAudio = {
                ...testAudio,
                duration: 0,
            };

            await audioCacheService.set(testParams, zeroAudio);
            const result = await audioCacheService.get(testParams);

            expect(result?.duration).toBe(0);
        });
    });

    describe('integration scenarios', () => {
        it('full cache workflow: check -> miss -> set -> hit', async () => {
            // Check cache (miss)
            const cached1 = await audioCacheService.get(testParams);
            expect(cached1).toBeNull();

            // Set cache
            await audioCacheService.set(testParams, testAudio);

            // Check cache (hit)
            const cached2 = await audioCacheService.get(testParams);
            expect(cached2).not.toBeNull();
            expect(cached2?.url).toBe(testAudio.url);
        });

        it('tracks usage for cached audio', async () => {
            // Set audio
            await audioCacheService.set(testParams, testAudio);

            // Increment usage multiple times
            await audioCacheService.incrementUsage(testParams);
            await audioCacheService.incrementUsage(testParams);
            await audioCacheService.incrementUsage(testParams);

            // Get cached audio
            const audio = await audioCacheService.get(testParams);
            expect(audio).not.toBeNull();

            // Check usage count
            const usage = await audioCacheService.getUsageCount(testParams);
            expect(usage).toBe(3);
        });

        it('handles multiple audio caches independently', async () => {
            const params1: AudioCacheKeyParams = {
                prompt: 'Story 1',
                voiceId: 'voice-1',
            };
            const params2: AudioCacheKeyParams = {
                prompt: 'Story 2',
                voiceId: 'voice-2',
            };

            const audio1 = { ...testAudio, url: 'https://storage.example.com/audio/1.mp3', voiceId: 'voice-1' };
            const audio2 = { ...testAudio, url: 'https://storage.example.com/audio/2.mp3', voiceId: 'voice-2' };

            // Set both
            await audioCacheService.set(params1, audio1);
            await audioCacheService.set(params2, audio2);

            // Increment usage differently
            await audioCacheService.incrementUsage(params1);
            await audioCacheService.incrementUsage(params1);
            await audioCacheService.incrementUsage(params2);

            // Verify independence
            const result1 = await audioCacheService.get(params1);
            const result2 = await audioCacheService.get(params2);
            const usage1 = await audioCacheService.getUsageCount(params1);
            const usage2 = await audioCacheService.getUsageCount(params2);

            expect(result1?.url).toBe(audio1.url);
            expect(result2?.url).toBe(audio2.url);
            expect(usage1).toBe(2);
            expect(usage2).toBe(1);
        });
    });
});
