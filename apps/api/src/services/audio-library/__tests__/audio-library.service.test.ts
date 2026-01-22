/**
 * Audio Library Service Unit Tests
 *
 * Tests for the audio library service with semantic matching and caching.
 * Uses mocked dependencies.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Logger } from '@mio/shared/server/logger';

// Mock the store module BEFORE importing the service
const mockQuerySfx = mock(() => Promise.resolve([]));
const mockQueryAmbiance = mock(() => Promise.resolve([]));
const mockQueryMusic = mock(() => Promise.resolve([]));
const mockInsertSfx = mock(() => Promise.resolve());
const mockInsertAmbiance = mock(() => Promise.resolve());
const mockInsertMusic = mock(() => Promise.resolve());
const mockIncrementSfxUsageById = mock(() => Promise.resolve());
const mockIncrementAmbianceUsageById = mock(() => Promise.resolve());
const mockIncrementMusicUsageById = mock(() => Promise.resolve());
const mockGetSfxStats = mock(() => Promise.resolve({ byCategory: [], total: 0 }));
const mockGetAmbianceStats = mock(() => Promise.resolve({ byEnvironment: [], total: 0 }));
const mockGetMusicStats = mock(() => Promise.resolve({ byMood: [], total: 0 }));

mock.module('../audio-library.service.store', () => ({
    querySfx: mockQuerySfx,
    queryAmbiance: mockQueryAmbiance,
    queryMusic: mockQueryMusic,
    insertSfx: mockInsertSfx,
    insertAmbiance: mockInsertAmbiance,
    insertMusic: mockInsertMusic,
    incrementSfxUsageById: mockIncrementSfxUsageById,
    incrementAmbianceUsageById: mockIncrementAmbianceUsageById,
    incrementMusicUsageById: mockIncrementMusicUsageById,
    getSfxStats: mockGetSfxStats,
    getAmbianceStats: mockGetAmbianceStats,
    getMusicStats: mockGetMusicStats,
}));

// Import service AFTER mocking
import { AudioLibraryService } from '../audio-library.service';
import { SfxCategory } from '../../audio/soundEffects.provider.types';

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
    del: mock(() => Promise.resolve(1)),
    exists: mock(() => Promise.resolve(0)),
    expire: mock(() => Promise.resolve(1)),
});

// Mock Database (minimal, not used directly)
const createMockDb = () => ({} as any);

describe('AudioLibraryService', () => {
    let service: AudioLibraryService;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockCache: ReturnType<typeof createMockCache>;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockLogger = createMockLogger();
        mockCache = createMockCache();
        mockDb = createMockDb();

        // Reset all store mocks
        mockQuerySfx.mockClear();
        mockQueryAmbiance.mockClear();
        mockQueryMusic.mockClear();
        mockInsertSfx.mockClear();
        mockInsertAmbiance.mockClear();
        mockInsertMusic.mockClear();
        mockIncrementSfxUsageById.mockClear();
        mockIncrementAmbianceUsageById.mockClear();
        mockIncrementMusicUsageById.mockClear();
        mockGetSfxStats.mockClear();
        mockGetAmbianceStats.mockClear();
        mockGetMusicStats.mockClear();

        // Set default implementations
        mockQuerySfx.mockImplementation(() => Promise.resolve([]));
        mockQueryAmbiance.mockImplementation(() => Promise.resolve([]));
        mockQueryMusic.mockImplementation(() => Promise.resolve([]));
        mockInsertSfx.mockImplementation(() => Promise.resolve({ id: 'sfx-new' }));
        mockInsertAmbiance.mockImplementation(() => Promise.resolve({ id: 'amb-new' }));
        mockInsertMusic.mockImplementation(() => Promise.resolve({ id: 'music-new' }));
        mockGetSfxStats.mockImplementation(() => Promise.resolve({ byCategory: [], total: 0 }));
        mockGetAmbianceStats.mockImplementation(() => Promise.resolve({ byEnvironment: [], total: 0 }));
        mockGetMusicStats.mockImplementation(() => Promise.resolve({ byMood: [], total: 0 }));

        // @ts-expect-error - bypassing private constructor for testing
        service = new AudioLibraryService(mockDb, mockLogger, mockCache);
    });

    describe('SFX Operations', () => {
        describe('findSfx', () => {
            it('should return cache hit when available', async () => {
                const cachedResult = {
                    id: 'sfx-123',
                    canonicalKey: 'ambient:weather:outdoor:rain',
                    category: SfxCategory.Ambient,
                    subcategory: 'weather',
                    prompt: 'heavy rain',
                    s3Url: 'sfx/ambient/rain.mp3',
                    durationSeconds: 5.0,
                    format: 'mp3',
                    promptInfluence: 0.3,
                    createdAt: new Date(),
                };

                mockCache.get.mockResolvedValueOnce(cachedResult);

                const result = await service.findSfx({
                    text: 'heavy rain sounds',
                });

                expect(result.sfx).toEqual(cachedResult);
                expect(result.fromCache).toBe(true);
            });

            it('should query database on cache miss', async () => {
                mockCache.get.mockResolvedValueOnce(null);
                mockQuerySfx.mockResolvedValueOnce([
                    {
                        id: 'sfx-456',
                        category: 'effects',
                        subcategory: 'door',
                        s3Url: 'sfx/effects/door.mp3',
                        durationSeconds: 2.0,
                        format: 'mp3',
                        prompt: 'door slam',
                        promptInfluence: 0.3,
                        createdAt: new Date(),
                    },
                ]);

                const result = await service.findSfx({
                    text: 'door slam sound effect',
                });

                expect(result.sfx).toBeDefined();
                expect(result.fromCache).toBe(false);
                expect(mockQuerySfx).toHaveBeenCalled();
            });

            it('should return null when no match found', async () => {
                mockCache.get.mockResolvedValueOnce(null);
                mockQuerySfx.mockResolvedValueOnce([]);

                const result = await service.findSfx({
                    text: 'nonexistent sound',
                });

                expect(result.sfx).toBeNull();
                expect(result.fromCache).toBe(false);
            });
        });

        describe('storeSfx', () => {
            it('should store new SFX', async () => {
                await service.storeSfx({
                    category: SfxCategory.Ambient,
                    subcategory: 'weather',
                    prompt: 'gentle rain',
                    promptInfluence: 0.3,
                    s3Url: 'sfx/ambient/gentle-rain.mp3',
                    durationSeconds: 8.0,
                });

                expect(mockInsertSfx).toHaveBeenCalled();
            });
        });

        describe('incrementSfxUsage', () => {
            it('should increment usage count', async () => {
                await service.incrementSfxUsage('sfx-123');

                expect(mockIncrementSfxUsageById).toHaveBeenCalledWith(expect.anything(), 'sfx-123');
            });
        });
    });

    describe('Ambiance Operations', () => {
        describe('findAmbiance', () => {
            it('should return cache hit when available', async () => {
                const cachedResult = {
                    id: 'amb-123',
                    environment: 'forest',
                    s3Url: 'ambiance/forest/clearing.mp3',
                    sourceDurationSeconds: 15.0,
                    format: 'mp3',
                    prompt: 'forest clearing',
                    promptInfluence: 0.3,
                    createdAt: new Date(),
                };

                mockCache.get.mockResolvedValueOnce(cachedResult);

                const result = await service.findAmbiance({
                    description: 'peaceful forest',
                });

                expect(result.ambiance).toEqual(cachedResult);
                expect(result.fromCache).toBe(true);
            });

            it('should query database on cache miss', async () => {
                mockCache.get.mockResolvedValueOnce(null);
                mockQueryAmbiance.mockResolvedValueOnce([
                    {
                        id: 'amb-456',
                        environment: 'ocean',
                        s3Url: 'ambiance/ocean/beach.mp3',
                        sourceDurationSeconds: 12.0,
                        format: 'mp3',
                        prompt: 'ocean waves',
                        promptInfluence: 0.3,
                        createdAt: new Date(),
                    },
                ]);

                const result = await service.findAmbiance({
                    description: 'ocean waves',
                });

                expect(result.ambiance).toBeDefined();
                expect(result.fromCache).toBe(false);
                expect(mockQueryAmbiance).toHaveBeenCalled();
            });
        });

        describe('storeAmbiance', () => {
            it('should store new ambiance', async () => {
                await service.storeAmbiance({
                    environment: 'forest',
                    prompt: 'forest sounds',
                    promptInfluence: 0.3,
                    s3Url: 'ambiance/forest/test.mp3',
                    sourceDurationSeconds: 20.0,
                });

                expect(mockInsertAmbiance).toHaveBeenCalled();
            });
        });

        describe('incrementAmbianceUsage', () => {
            it('should increment usage count', async () => {
                await service.incrementAmbianceUsage('amb-123');

                expect(mockIncrementAmbianceUsageById).toHaveBeenCalledWith(expect.anything(), 'amb-123');
            });
        });
    });

    describe('Music Operations', () => {
        describe('findMusic', () => {
            it('should return cache hit when available', async () => {
                const cachedResult = {
                    id: 'music-123',
                    mood: 'calm',
                    s3Url: 'music/calm/soft.mp3',
                    sourceDurationSeconds: 25.0,
                    format: 'mp3',
                    prompt: 'calm music',
                    promptInfluence: 0.3,
                    createdAt: new Date(),
                };

                mockCache.get.mockResolvedValueOnce(cachedResult);

                const result = await service.findMusic({
                    mood: 'calm',
                });

                expect(result.music).toEqual(cachedResult);
                expect(result.fromCache).toBe(true);
            });

            it('should query database on cache miss', async () => {
                mockCache.get.mockResolvedValueOnce(null);
                mockQueryMusic.mockResolvedValueOnce([
                    {
                        id: 'music-456',
                        mood: 'adventurous',
                        s3Url: 'music/adventurous/epic.mp3',
                        sourceDurationSeconds: 30.0,
                        format: 'mp3',
                        prompt: 'epic adventure',
                        promptInfluence: 0.3,
                        createdAt: new Date(),
                    },
                ]);

                const result = await service.findMusic({
                    mood: 'adventurous',
                });

                expect(result.music).toBeDefined();
                expect(result.fromCache).toBe(false);
                expect(mockQueryMusic).toHaveBeenCalled();
            });
        });

        describe('storeMusic', () => {
            it('should store new music', async () => {
                await service.storeMusic({
                    mood: 'calm',
                    prompt: 'calm piano',
                    promptInfluence: 0.3,
                    s3Url: 'music/calm/piano.mp3',
                    sourceDurationSeconds: 25.0,
                });

                expect(mockInsertMusic).toHaveBeenCalled();
            });
        });

        describe('incrementMusicUsage', () => {
            it('should increment usage count', async () => {
                await service.incrementMusicUsage('music-123');

                expect(mockIncrementMusicUsageById).toHaveBeenCalledWith(expect.anything(), 'music-123');
            });
        });
    });

    describe('Stats Operations', () => {
        describe('getStats', () => {
            it('should aggregate stats from all libraries', async () => {
                mockGetSfxStats.mockResolvedValueOnce({
                    byCategory: [{ category: 'ambient', count: 25 }],
                    total: 55,
                });
                mockGetAmbianceStats.mockResolvedValueOnce({
                    byEnvironment: [{ environment: 'forest', count: 15 }],
                    total: 25,
                });
                mockGetMusicStats.mockResolvedValueOnce({
                    byMood: [{ mood: 'calm', count: 8 }],
                    total: 20,
                });

                const stats = await service.getStats();

                expect(stats.sfx.total).toBe(55);
                expect(stats.ambiance.total).toBe(25);
                expect(stats.music.total).toBe(20);
            });

            it('should handle empty libraries', async () => {
                mockGetSfxStats.mockResolvedValueOnce({ byCategory: [], total: 0 });
                mockGetAmbianceStats.mockResolvedValueOnce({ byEnvironment: [], total: 0 });
                mockGetMusicStats.mockResolvedValueOnce({ byMood: [], total: 0 });

                const stats = await service.getStats();

                expect(stats.sfx.total).toBe(0);
                expect(stats.ambiance.total).toBe(0);
                expect(stats.music.total).toBe(0);
            });
        });
    });

    describe('Cache Operations', () => {
        it('should set cache after database lookup', async () => {
            mockCache.get.mockResolvedValueOnce(null);
            mockQuerySfx.mockResolvedValueOnce([
                {
                    id: 'sfx-789',
                    s3Url: 'sfx/test.mp3',
                    format: 'mp3',
                    prompt: 'test',
                    promptInfluence: 0.3,
                    durationSeconds: 3.0,
                    createdAt: new Date(),
                },
            ]);

            await service.findSfx({
                text: 'test sound effect',
            });

            expect(mockCache.set).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should propagate cache errors in findSfx', async () => {
            mockCache.get.mockRejectedValueOnce(new Error('Cache connection failed'));

            await expect(
                service.findSfx({
                    text: 'test sound effect',
                })
            ).rejects.toThrow('Cache connection failed');
        });

        it('should propagate database errors in storeSfx', async () => {
            mockInsertSfx.mockRejectedValueOnce(new Error('Database error'));

            await expect(
                service.storeSfx({
                    category: SfxCategory.Ambient,
                    subcategory: 'test',
                    prompt: 'test',
                    promptInfluence: 0.3,
                    s3Url: 'test.mp3',
                    durationSeconds: 5.0,
                })
            ).rejects.toThrow('Database error');
        });
    });
});
