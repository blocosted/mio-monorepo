/**
 * SFX Cache Service Unit Tests
 *
 * Tests for the sound effects caching service.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';

import { SfxCacheService } from '../sfx-cache.service';
import type { SfxCacheKeyParams, CachedSfx } from '../sfx-cache.service.types';
import { SfxCategory } from '../../audio/soundEffects.provider.types';

// Mock Cache Service
const createMockCache = () => ({
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    incr: mock(() => Promise.resolve(1)),
    expire: mock(() => Promise.resolve(true)),
    exists: mock(() => Promise.resolve(false)),
});

describe('SfxCacheService', () => {
    let service: SfxCacheService;
    let mockCache: ReturnType<typeof createMockCache>;

    beforeEach(() => {
        mockCache = createMockCache();
        // @ts-expect-error - bypassing private constructor for testing
        service = new SfxCacheService(mockCache);
    });

    describe('generateCacheKey', () => {
        it('should generate deterministic cache key for same parameters', () => {
            const params: SfxCacheKeyParams = {
                text: 'heavy rain',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const key1 = service.generateCacheKey(params);
            const key2 = service.generateCacheKey(params);

            expect(key1).toBe(key2);
            expect(key1).toMatch(/^sfx:audio:/);
        });

        it('should generate different keys for different text', () => {
            const params1: SfxCacheKeyParams = {
                text: 'heavy rain',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const params2: SfxCacheKeyParams = {
                text: 'light rain',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const key1 = service.generateCacheKey(params1);
            const key2 = service.generateCacheKey(params2);

            expect(key1).not.toBe(key2);
        });

        it('should generate different keys for different prompt influence', () => {
            const params1: SfxCacheKeyParams = {
                text: 'thunder',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const params2: SfxCacheKeyParams = {
                text: 'thunder',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.8,
            };

            const key1 = service.generateCacheKey(params1);
            const key2 = service.generateCacheKey(params2);

            expect(key1).not.toBe(key2);
        });

        it('should generate different keys for different duration', () => {
            const params1: SfxCacheKeyParams = {
                text: 'wind',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
                durationSeconds: 5,
            };

            const params2: SfxCacheKeyParams = {
                text: 'wind',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
                durationSeconds: 10,
            };

            const key1 = service.generateCacheKey(params1);
            const key2 = service.generateCacheKey(params2);

            expect(key1).not.toBe(key2);
        });

        it('should treat undefined duration as null for consistent hashing', () => {
            const params1: SfxCacheKeyParams = {
                text: 'wind',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
                durationSeconds: undefined,
            };

            const params2: SfxCacheKeyParams = {
                text: 'wind',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const key1 = service.generateCacheKey(params1);
            const key2 = service.generateCacheKey(params2);

            expect(key1).toBe(key2);
        });
    });

    describe('get', () => {
        it('should return cached SFX when found', async () => {
            const cachedSfx: CachedSfx = {
                url: 'sfx/ambient/rain.mp3',
                durationSeconds: 10,
                category: SfxCategory.Ambient,
                cachedAt: Date.now(),
            };

            mockCache.get.mockImplementationOnce(() => Promise.resolve(cachedSfx));

            const params: SfxCacheKeyParams = {
                text: 'rain',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const result = await service.get(params);

            expect(result).toEqual(cachedSfx);
            expect(mockCache.get).toHaveBeenCalledWith(expect.stringMatching(/^sfx:audio:/));
        });

        it('should return null when not found', async () => {
            const params: SfxCacheKeyParams = {
                text: 'nonexistent',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const result = await service.get(params);

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should cache SFX with 30-day TTL', async () => {
            const params: SfxCacheKeyParams = {
                text: 'thunder',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.5,
            };

            const sfx: Omit<CachedSfx, 'cachedAt'> = {
                url: 'sfx/effects/thunder.mp3',
                durationSeconds: 3,
                category: SfxCategory.Effects,
            };

            await service.set(params, sfx);

            expect(mockCache.set).toHaveBeenCalledWith(
                expect.stringMatching(/^sfx:audio:/),
                expect.objectContaining({
                    url: sfx.url,
                    durationSeconds: sfx.durationSeconds,
                    category: sfx.category,
                    cachedAt: expect.any(Number),
                }),
                { ex: 30 * 24 * 60 * 60 } // 30 days in seconds
            );
        });
    });

    describe('exists', () => {
        it('should return true when SFX is cached', async () => {
            mockCache.exists.mockImplementationOnce(() => Promise.resolve(true));

            const params: SfxCacheKeyParams = {
                text: 'footsteps',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.6,
            };

            const result = await service.exists(params);

            expect(result).toBe(true);
        });

        it('should return false when SFX is not cached', async () => {
            const params: SfxCacheKeyParams = {
                text: 'nonexistent',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const result = await service.exists(params);

            expect(result).toBe(false);
        });
    });

    describe('incrementUsage', () => {
        it('should increment usage counter', async () => {
            mockCache.incr.mockImplementationOnce(() => Promise.resolve(5));

            const params: SfxCacheKeyParams = {
                text: 'bell',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.4,
            };

            const count = await service.incrementUsage(params);

            expect(count).toBe(5);
            expect(mockCache.incr).toHaveBeenCalledWith(expect.stringMatching(/^sfx:usage:/));
        });
    });

    describe('getUsageCount', () => {
        it('should return usage count when tracked', async () => {
            mockCache.get.mockImplementationOnce(() => Promise.resolve(10));

            const params: SfxCacheKeyParams = {
                text: 'chime',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const count = await service.getUsageCount(params);

            expect(count).toBe(10);
        });

        it('should return 0 when not tracked', async () => {
            const params: SfxCacheKeyParams = {
                text: 'untracked',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
            };

            const count = await service.getUsageCount(params);

            expect(count).toBe(0);
        });
    });
});
