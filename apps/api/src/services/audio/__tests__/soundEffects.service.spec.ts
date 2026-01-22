/**
 * Sound Effects Service Unit Tests
 *
 * Tests for the SoundEffects service with caching and rate limiting.
 * Uses mocked dependencies.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';

import { SoundEffectsService } from '../soundEffects.service';
import { SfxCategory } from '../soundEffects.provider.types';
import { SFX_AUDIO_FORMAT } from '../soundEffects.service.constants';

// Mock Logger
const createMockLogger = () => ({
    info: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    withModule: () => createMockLogger(),
});

// Mock Cache Service
const createMockCache = () => ({
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    incr: mock(() => Promise.resolve(1)),
    expire: mock(() => Promise.resolve(true)),
    exists: mock(() => Promise.resolve(false)),
});

// Mock SFX Cache Service
const createMockSfxCache = () => ({
    generateCacheKey: mock((params: unknown) => `sfx:audio:${Bun.hash(JSON.stringify(params))}`),
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    exists: mock(() => Promise.resolve(false)),
    incrementUsage: mock(() => Promise.resolve(1)),
    getUsageCount: mock(() => Promise.resolve(0)),
});

// Mock Storage Service
const createMockStorage = () => ({
    upload: mock(() => Promise.resolve({ path: 'sfx/general/test.mp3', url: 'https://example.com/test.mp3' })),
    download: mock(() => Promise.resolve(Buffer.from('cached audio'))),
    delete: mock(() => Promise.resolve()),
    getPublicUrl: mock(() => 'https://example.com/test.mp3'),
    exists: mock(() => Promise.resolve(true)),
});

// Mock SoundEffects Provider
const createMockProvider = () => ({
    convert: mock(() => Promise.resolve({
        audio: Buffer.from('generated audio'),
        durationSeconds: 3.5,
    })),
});

describe('SoundEffectsService', () => {
    let service: SoundEffectsService;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockCache: ReturnType<typeof createMockCache>;
    let mockSfxCache: ReturnType<typeof createMockSfxCache>;
    let mockStorage: ReturnType<typeof createMockStorage>;
    let mockProvider: ReturnType<typeof createMockProvider>;

    beforeEach(() => {
        mockLogger = createMockLogger();
        mockCache = createMockCache();
        mockSfxCache = createMockSfxCache();
        mockStorage = createMockStorage();
        mockProvider = createMockProvider();

        // @ts-expect-error - bypassing private constructor for testing
        service = new SoundEffectsService(mockLogger, mockCache, mockSfxCache, mockStorage);
        // @ts-expect-error - setting private provider
        service._provider = mockProvider;
    });

    describe('generateSfx', () => {
        it('should generate a sound effect and cache it', async () => {
            const input = {
                text: 'heavy rain with thunder',
                category: SfxCategory.Ambient,
            };

            const result = await service.generateSfx(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.durationSeconds).toBe(3.5);
            expect(result.format).toEqual(SFX_AUDIO_FORMAT);
            expect(result.fromCache).toBe(false);
            expect(mockProvider.convert).toHaveBeenCalled();
            expect(mockStorage.upload).toHaveBeenCalled();
            expect(mockSfxCache.set).toHaveBeenCalled();
        });

        it('should return cached SFX on cache hit', async () => {
            mockSfxCache.get.mockImplementationOnce(() => Promise.resolve({
                url: 'sfx/ambient/cached.mp3',
                durationSeconds: 5.0,
                category: SfxCategory.Ambient,
                cachedAt: Date.now(),
            }));

            const input = {
                text: 'forest ambiance',
                category: SfxCategory.Ambient,
            };

            const result = await service.generateSfx(input);

            expect(result.fromCache).toBe(true);
            expect(result.durationSeconds).toBe(5.0);
            expect(mockProvider.convert).not.toHaveBeenCalled();
            expect(mockStorage.download).toHaveBeenCalled();
            expect(mockSfxCache.incrementUsage).toHaveBeenCalled();
        });

        it('should regenerate if cached file is missing', async () => {
            mockSfxCache.get.mockImplementationOnce(() => Promise.resolve({
                url: 'sfx/ambient/missing.mp3',
                durationSeconds: 5.0,
                category: SfxCategory.Ambient,
                cachedAt: Date.now(),
            }));
            mockStorage.download.mockImplementationOnce(() =>
                Promise.reject(new Error('File not found'))
            );

            const input = {
                text: 'ocean waves',
            };

            const result = await service.generateSfx(input);

            expect(result.fromCache).toBe(false);
            expect(mockProvider.convert).toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should apply category-specific prompt influence', async () => {
            const input = {
                text: 'door slam',
                category: SfxCategory.Effects,
            };

            await service.generateSfx(input);

            expect(mockProvider.convert).toHaveBeenCalledWith(
                expect.objectContaining({
                    promptInfluence: 0.5, // CATEGORY_PROMPT_INFLUENCE[Effects]
                })
            );
        });

        it('should use explicit prompt influence over category default', async () => {
            const input = {
                text: 'custom sound',
                category: SfxCategory.Effects,
                promptInfluence: 0.9,
            };

            await service.generateSfx(input);

            expect(mockProvider.convert).toHaveBeenCalledWith(
                expect.objectContaining({
                    promptInfluence: 0.9,
                })
            );
        });

        it('should pass duration to provider', async () => {
            const input = {
                text: 'whoosh transition',
                durationSeconds: 2,
            };

            await service.generateSfx(input);

            expect(mockProvider.convert).toHaveBeenCalledWith(
                expect.objectContaining({
                    durationSeconds: 2,
                })
            );
        });

        it('should include cache key in result', async () => {
            const input = {
                text: 'test sound',
            };

            const result = await service.generateSfx(input);

            expect(result.cacheKey).toBeDefined();
            expect(result.cacheKey).toMatch(/^sfx:audio:/);
        });
    });

    describe('generateBatch', () => {
        it('should generate multiple sound effects', async () => {
            const input = {
                segments: [
                    { id: 'sfx-1', text: 'footsteps on gravel', category: SfxCategory.Foley },
                    { id: 'sfx-2', text: 'door opening', category: SfxCategory.Effects },
                    { id: 'sfx-3', text: 'birds chirping', category: SfxCategory.Ambient },
                ],
            };

            const result = await service.generateBatch(input);

            expect(result.successCount).toBe(3);
            expect(result.failureCount).toBe(0);
            expect(result.results).toHaveLength(3);
            expect(result.totalDurationSeconds).toBe(3.5 * 3);
        });

        it('should handle partial failures in batch', async () => {
            mockProvider.convert
                .mockImplementationOnce(() => Promise.resolve({
                    audio: Buffer.from('audio 1'),
                    durationSeconds: 2,
                }))
                .mockImplementationOnce(() => Promise.reject(new Error('API error')))
                .mockImplementationOnce(() => Promise.resolve({
                    audio: Buffer.from('audio 3'),
                    durationSeconds: 3,
                }));

            const input = {
                segments: [
                    { id: 'sfx-1', text: 'sound 1' },
                    { id: 'sfx-2', text: 'sound 2' },
                    { id: 'sfx-3', text: 'sound 3' },
                ],
            };

            const result = await service.generateBatch(input);

            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(1);
            expect(result.results[1]?.error).toBeDefined();
        });
    });

    describe('getCacheStats', () => {
        it('should return cache statistics', async () => {
            // Generate some SFX to populate stats
            await service.generateSfx({ text: 'test 1' });
            await service.generateSfx({ text: 'test 2' });

            const stats = await service.getCacheStats();

            expect(stats).toHaveProperty('hits');
            expect(stats).toHaveProperty('misses');
            expect(stats).toHaveProperty('size');
            expect(stats.misses).toBe(2);
        });
    });

    describe('rate limiting', () => {
        it('should wait for rate limit slot', async () => {
            // First call sets counter to 1
            mockCache.incr.mockImplementationOnce(() => Promise.resolve(1));

            const input = { text: 'test sound' };
            const result = await service.generateSfx(input);

            expect(result.audio).toBeDefined();
            expect(mockCache.incr).toHaveBeenCalled();
        });
    });
});
