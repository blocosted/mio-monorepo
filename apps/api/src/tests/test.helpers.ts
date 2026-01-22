/**
 * Test Helpers
 *
 * Provides helper functions for creating test fixtures and mocks.
 */

import { randomUUID } from 'node:crypto';
import { mock, expect } from 'bun:test';

import type { ICacheService } from '../services/cache';
import type { IStorageService } from '../services/storage';
import { DEFAULT_TEST_CONFIG } from './test-utils';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { RedisClient } from '@mio/shared/server/connections/redis';

/**
 * Generate a random test ID
 */
export function generateTestId(prefix = 'test'): string {
    return `${prefix}-${randomUUID().slice(0, 8)}`;
}

/**
 * Generate a random email for testing
 */
export function generateEmail(suffix = ''): string {
    const randomString = Math.random().toString(36).substring(2, 11);
    return `${randomString}${suffix ? `+${suffix}` : ''}@test.local`;
}

/**
 * Mock cache service factory
 */
export interface MockCacheService {
    get: ReturnType<typeof mock<() => Promise<unknown>>>;
    set: ReturnType<typeof mock<() => Promise<void>>>;
    delete: ReturnType<typeof mock<() => Promise<void>>>;
    exists: ReturnType<typeof mock<() => Promise<boolean>>>;
    incr: ReturnType<typeof mock<() => Promise<number>>>;
    getOrSet: ReturnType<typeof mock<() => Promise<unknown>>>;
    invalidate: ReturnType<typeof mock<() => Promise<void>>>;
}

/**
 * Create a mock cache service
 */
export function createMockCacheService(): MockCacheService {
    return {
        get: mock(() => Promise.resolve(null)),
        set: mock(() => Promise.resolve()),
        delete: mock(() => Promise.resolve()),
        exists: mock(() => Promise.resolve(false)),
        incr: mock(() => Promise.resolve(1)),
        getOrSet: mock(() => Promise.resolve(null)),
        invalidate: mock(() => Promise.resolve()),
    };
}

/**
 * Cast mock cache service to interface
 */
export function asCacheService(mockService: MockCacheService): ICacheService {
    return mockService as unknown as ICacheService;
}

/**
 * Mock storage service factory
 */
export interface MockStorageService {
    upload: ReturnType<typeof mock<() => Promise<{ path: string; url: string }>>>;
    download: ReturnType<typeof mock<() => Promise<Blob>>>;
    delete: ReturnType<typeof mock<() => Promise<void>>>;
    getPublicUrl: ReturnType<typeof mock<() => string>>;
    exists: ReturnType<typeof mock<() => Promise<boolean>>>;
    list: ReturnType<typeof mock<() => Promise<string[]>>>;
}

/**
 * Create a mock storage service
 */
export function createMockStorageService(): MockStorageService {
    return {
        upload: mock(() =>
            Promise.resolve({
                path: 'test/audio.mp3',
                url: 'https://storage.test/test/audio.mp3',
            })
        ),
        download: mock(() => Promise.resolve(new Blob())),
        delete: mock(() => Promise.resolve()),
        getPublicUrl: mock(() => 'https://storage.test/test/audio.mp3'),
        exists: mock(() => Promise.resolve(true)),
        list: mock(() => Promise.resolve([])),
    };
}

/**
 * Cast mock storage service to interface
 */
export function asStorageService(mockService: MockStorageService): IStorageService {
    return mockService as unknown as IStorageService;
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a test audio buffer (minimal WAV file)
 */
export function createTestAudioBuffer(): Buffer {
    // Minimal valid WAV header (44 bytes) + some audio data
    const header = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size - 8
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6d, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16 for PCM)
        0x01, 0x00,             // AudioFormat (1 = PCM)
        0x01, 0x00,             // NumChannels (1 = mono)
        0x44, 0xac, 0x00, 0x00, // SampleRate (44100)
        0x88, 0x58, 0x01, 0x00, // ByteRate
        0x02, 0x00,             // BlockAlign
        0x10, 0x00,             // BitsPerSample (16)
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00, // Subchunk2Size
    ]);

    return header;
}

/**
 * Helper to get mock calls in a type-safe way
 */
type MockCalls<T> = { calls: T[] };

export function getMockCalls<T>(mockFn: unknown): T[] {
    return (mockFn as { mock: MockCalls<T> }).mock.calls;
}

/**
 * Helper to safely get a specific call by index (throws if not found)
 */
export function getCallAt<T>(mockFn: unknown, index: number): T {
    const calls = getMockCalls<T>(mockFn);
    const call = calls[index];
    if (!call) {
        throw new Error(`Expected call at index ${index} but found ${calls.length} calls`);
    }
    return call;
}

/**
 * Assert a nullable value is not null (and narrow the type).
 */
export function assertNotNull<T>(
    value: T | null,
    message = 'Expected value not to be null'
): asserts value is T {
    expect(value).not.toBeNull();
    if (value === null) throw new Error(message);
}

/**
 * Create a real Redis client for testing (connects to Docker Redis container)
 */
export async function createTestRedisClient(): Promise<{ redis: RedisClient; close: () => Promise<void> }> {
    const config = DEFAULT_TEST_CONFIG;

    const url = `redis://:${encodeURIComponent(config.redisPassword)}@${config.redisHost}:${config.redisPort}`;
    const redis = new RedisClient({ url });
    await redis.connect();

    return {
        redis,
        close: async () => {
            redis.close();
        },
    };
}

/**
 * Clean up Redis keys by pattern (useful for test isolation)
 */
export async function cleanupRedisKeys(redis: RedisClient, pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}

/**
 * Clean all test data using IoC container instances
 */
export async function cleanTestData(): Promise<void> {
    const { getInstance } = await import('../ioc/ioc.config');
    const { IocConnection } = await import('../ioc/ioc.types');
    const { cleanTestPostgresData } = await import('./test-utils');

    // Get DB and Redis from IoC container
    const db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
    const redis = getInstance<RedisClient>(IocConnection.REDIS);

    // Clean PostgreSQL
    await cleanTestPostgresData(db);

    // Clean Redis (FLUSHALL)
    await redis.del(...(await redis.keys('*')));
}

// =============================================================================
// External API Mock Helpers
// =============================================================================

/**
 * Mock ElevenLabs Provider
 *
 * Returns a mocked provider instance that can be injected into services.
 * Use this to avoid calling the real ElevenLabs API during tests.
 */
export function mockElevenLabsProvider() {
    return {
        convert: mock(async (params: { text: string; voiceId: string; outputFormat: string }) => {
            return {
                audio: createTestAudioBuffer(),
                durationSeconds: 3.5,
                format: params.outputFormat,
            };
        }),
        getVoices: mock(async () => {
            return [
                {
                    voiceId: 'test-voice-1',
                    name: 'Test Voice 1',
                    category: 'premade',
                    labels: { accent: 'american', age: 'young' },
                },
            ];
        }),
    };
}

/**
 * Mock OpenAI Provider
 *
 * Returns a mocked provider instance that can be injected into services.
 * Use this to avoid calling the real OpenAI API during tests.
 */
export function mockOpenAIProvider() {
    return {
        generateCompletion: mock(async (params: { prompt: string; model: string }) => {
            return {
                content: JSON.stringify({
                    title: 'Test Story',
                    scenes: [
                        {
                            id: 'scene-1',
                            narration: 'Once upon a time...',
                            dialogue: [],
                            soundEffects: [],
                        },
                    ],
                }),
                model: params.model,
                usage: {
                    prompt_tokens: 100,
                    completion_tokens: 50,
                    total_tokens: 150,
                },
            };
        }),
    };
}

/**
 * Mock Anthropic Provider
 *
 * Returns a mocked provider instance that can be injected into services.
 * Use this to avoid calling the real Anthropic API during tests.
 */
export function mockAnthropicProvider() {
    return {
        generateCompletion: mock(async (params: { prompt: string; model: string }) => {
            return {
                content: JSON.stringify({
                    title: 'Test Story',
                    scenes: [
                        {
                            id: 'scene-1',
                            narration: 'Once upon a time...',
                            dialogue: [],
                            soundEffects: [],
                        },
                    ],
                }),
                model: params.model,
                usage: {
                    input_tokens: 100,
                    output_tokens: 50,
                },
            };
        }),
    };
}

/**
 * Mock SoundEffects Provider
 *
 * Returns a mocked provider instance that can be injected into services.
 * Use this to avoid calling the real sound effects API during tests.
 */
export function mockSoundEffectsProvider() {
    return {
        generate: mock(async (params: { prompt: string; duration: number }) => {
            return {
                audio: createTestAudioBuffer(),
                durationSeconds: params.duration,
                format: 'mp3',
            };
        }),
    };
}
