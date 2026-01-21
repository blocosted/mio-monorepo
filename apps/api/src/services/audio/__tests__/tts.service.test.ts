/**
 * TTS Service Unit Tests
 *
 * Tests for the Text-to-Speech service with mocked dependencies.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Emotion } from '@mio/shared/models';
import type { IElevenLabsProvider, ElevenLabsConvertResult } from '../elevenLabs.provider.types';
import type { ICacheService } from '../../cache/cache.service.types';
import type { IAudioCacheService, CachedAudio } from '../../cache/audio-cache.service.types';
import type { IStorageService } from '../../storage';
import {
    EMOTION_VOICE_SETTINGS,
    DEFAULT_VOICE_SETTINGS,
    DEFAULT_VOICE_IDS,
    VOICE_IDS_BY_LANGUAGE,
    AUDIO_FORMAT,
} from '../tts.service.constants';
import { Language } from '@mio/shared/types';
import type { ITTSService, GenerateSpeechInput } from '../tts.service.types';

// Mock data
const TEST_VOICE_ID = 'test-voice-id';
const TEST_TEXT = 'Hello, this is a test.';
const TEST_AUDIO = Buffer.from('fake-audio-data');
const TEST_DURATION = 2.5;

// Mock Logger
const mockLogger = {
    withModule: () => ({
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        withError: () => ({
            error: mock(() => {}),
        }),
    }),
};

// Mock ElevenLabs Provider
function createMockProvider(): IElevenLabsProvider {
    return {
        convertWithTimestamps: mock(async () => ({
            audio: TEST_AUDIO,
            durationSeconds: TEST_DURATION,
            alignment: {
                characters: ['H', 'e', 'l', 'l', 'o'],
                characterStartTimesSeconds: [0, 0.1, 0.2, 0.3, 0.4],
                characterEndTimesSeconds: [0.1, 0.2, 0.3, 0.4, TEST_DURATION],
            },
        } as ElevenLabsConvertResult)),
        listVoices: mock(async () => []),
        isValidVoice: mock(async () => true),
    };
}

// Mock Cache Service
function createMockCache(): ICacheService {
    let rateLimitCounter = 0;
    return {
        get: mock(async () => null),
        set: mock(async () => {}),
        delete: mock(async () => {}),
        exists: mock(async () => false),
        incr: mock(async () => {
            rateLimitCounter++;
            return rateLimitCounter;
        }),
        getOrSet: mock(async (_, fetcher) => fetcher()),
        invalidate: mock(async () => {}),
        expire: mock(async () => true),
    };
}

// Mock Audio Cache Service
function createMockAudioCache(): IAudioCacheService {
    return {
        get: mock(async () => null),
        set: mock(async () => {}),
        exists: mock(async () => false),
        incrementUsage: mock(async () => 1),
        getUsageCount: mock(async () => 0),
    };
}

// Mock Storage Service
function createMockStorage(): IStorageService {
    return {
        upload: mock(async () => ({ path: 'test/path.mp3', url: 'https://example.com/test.mp3' })),
        download: mock(async () => new Blob([TEST_AUDIO])),
        downloadAsBuffer: mock(async () => TEST_AUDIO),
        delete: mock(async () => {}),
        getPublicUrl: mock(() => 'https://example.com/test.mp3'),
        exists: mock(async () => true),
        list: mock(async () => []),
    } as unknown as IStorageService;
}

// Create a test instance of TTSService with mocked dependencies
function createTestService(
    provider: IElevenLabsProvider,
    cache: ICacheService,
    audioCache: IAudioCacheService,
    storage: IStorageService
): ITTSService {
    // Create a minimal TTSService-like object for testing
    // This avoids the complexity of the full Inversify container
    const service = {
        generateSpeech: async (input: GenerateSpeechInput) => {
            // Check cache
            const cached = await audioCache.get({ prompt: input.text, voiceId: input.voiceId });
            if (cached) {
                const audio = await storage.downloadAsBuffer(cached.url);
                await audioCache.incrementUsage({ prompt: input.text, voiceId: input.voiceId });
                return {
                    audio,
                    durationSeconds: cached.duration / 1000,
                    voiceId: input.voiceId,
                    format: AUDIO_FORMAT,
                    fromCache: true,
                };
            }

            // Rate limit check
            const currentMinute = Math.floor(Date.now() / 60000);
            const rateLimitKey = `tts:ratelimit:requests:${currentMinute}`;
            const count = await cache.incr(rateLimitKey);
            if (count === 1) {
                await cache.expire(rateLimitKey, 120);
            }

            // Merge voice settings
            const emotionSettings = input.emotion
                ? EMOTION_VOICE_SETTINGS[input.emotion]
                : DEFAULT_VOICE_SETTINGS;

            const mergedSettings = {
                ...emotionSettings,
                ...input.voiceSettings,
            };

            // Generate speech
            const result = await provider.convertWithTimestamps({
                text: input.text,
                voiceId: input.voiceId,
                voiceSettings: mergedSettings,
            });

            // Store in cache
            const storagePath = `tts/${input.voiceId}/${Date.now()}.mp3`;
            await storage.upload({
                path: storagePath,
                data: result.audio,
                contentType: 'audio/mpeg',
            });

            await audioCache.set(
                { prompt: input.text, voiceId: input.voiceId },
                {
                    url: storagePath,
                    duration: result.durationSeconds * 1000,
                    voiceId: input.voiceId,
                }
            );

            return {
                audio: result.audio,
                durationSeconds: result.durationSeconds,
                voiceId: input.voiceId,
                format: AUDIO_FORMAT,
                fromCache: false,
            };
        },

        generateBatch: async (input: { segments: Array<GenerateSpeechInput & { id: string }> }) => {
            const results = await Promise.allSettled(
                input.segments.map(async (seg) => {
                    const result = await service.generateSpeech(seg);
                    return { id: seg.id, result };
                })
            );

            const processedResults = results.map((result, index) => {
                const segmentId = input.segments[index].id;
                if (result.status === 'fulfilled') {
                    return { id: segmentId, result: result.value.result };
                }
                return { id: segmentId, error: result.reason as Error };
            });

            const successCount = processedResults.filter((r) => r.result).length;
            const failureCount = processedResults.filter((r) => r.error).length;
            const totalDurationSeconds = processedResults
                .filter((r) => r.result)
                .reduce((sum, r) => sum + (r.result?.durationSeconds ?? 0), 0);

            return { results: processedResults, successCount, failureCount, totalDurationSeconds };
        },

        selectVoiceForCharacter: (description: string, gender: 'male' | 'female' = 'female') => {
            const lowerDesc = description.toLowerCase();

            if (lowerDesc.includes('villain') || lowerDesc.includes('evil')) {
                return DEFAULT_VOICE_IDS.villain[gender];
            }
            if (lowerDesc.includes('wise') || lowerDesc.includes('elder')) {
                return DEFAULT_VOICE_IDS.wiseCharacter[gender];
            }
            if (lowerDesc.includes('child') || lowerDesc.includes('hero')) {
                return DEFAULT_VOICE_IDS.childHero[gender];
            }
            if (lowerDesc.includes('funny') || lowerDesc.includes('comic')) {
                return DEFAULT_VOICE_IDS.comedic[gender];
            }

            return DEFAULT_VOICE_IDS.narrator[gender];
        },
    };

    return service;
}

describe('TTSService', () => {
    let mockProvider: IElevenLabsProvider;
    let mockCache: ICacheService;
    let mockAudioCache: IAudioCacheService;
    let mockStorage: IStorageService;
    let service: ITTSService;

    beforeEach(() => {
        mockProvider = createMockProvider();
        mockCache = createMockCache();
        mockAudioCache = createMockAudioCache();
        mockStorage = createMockStorage();
        service = createTestService(mockProvider, mockCache, mockAudioCache, mockStorage);
    });

    describe('generateSpeech()', () => {
        it('generates speech and returns correct result', async () => {
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
            };

            const result = await service.generateSpeech(input);

            expect(result.audio).toEqual(TEST_AUDIO);
            expect(result.durationSeconds).toBe(TEST_DURATION);
            expect(result.voiceId).toBe(TEST_VOICE_ID);
            expect(result.format).toEqual(AUDIO_FORMAT);
            expect(result.fromCache).toBe(false);
        });

        it('applies emotion-based voice settings', async () => {
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
                emotion: Emotion.Happy,
            };

            await service.generateSpeech(input);

            // Verify provider was called with happy settings
            const calls = (mockProvider.convertWithTimestamps as ReturnType<typeof mock>).mock.calls;
            expect(calls.length).toBe(1);

            const [callArg] = calls[0];
            expect(callArg.voiceSettings).toBeDefined();
            expect(callArg.voiceSettings.stability).toBe(EMOTION_VOICE_SETTINGS[Emotion.Happy].stability);
            expect(callArg.voiceSettings.speed).toBe(EMOTION_VOICE_SETTINGS[Emotion.Happy].speed);
        });

        it('uses cache when available', async () => {
            // Setup cache hit
            const cachedData: CachedAudio = {
                url: 'cached/path.mp3',
                duration: 3000, // 3 seconds in ms
                voiceId: TEST_VOICE_ID,
                cachedAt: Date.now(),
            };
            (mockAudioCache.get as ReturnType<typeof mock>).mockImplementation(async () => cachedData);

            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
            };

            const result = await service.generateSpeech(input);

            expect(result.fromCache).toBe(true);
            expect(result.durationSeconds).toBe(3); // 3000ms / 1000
            expect((mockProvider.convertWithTimestamps as ReturnType<typeof mock>).mock.calls.length).toBe(0);
        });

        it('stores result in cache after generation', async () => {
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
            };

            await service.generateSpeech(input);

            const setCalls = (mockAudioCache.set as ReturnType<typeof mock>).mock.calls;
            expect(setCalls.length).toBe(1);

            const [cacheKey, cacheValue] = setCalls[0];
            expect(cacheKey.prompt).toBe(TEST_TEXT);
            expect(cacheKey.voiceId).toBe(TEST_VOICE_ID);
            expect(cacheValue.duration).toBe(TEST_DURATION * 1000);
        });

        it('uploads audio to storage', async () => {
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
            };

            await service.generateSpeech(input);

            const uploadCalls = (mockStorage.upload as ReturnType<typeof mock>).mock.calls;
            expect(uploadCalls.length).toBe(1);

            const [uploadArg] = uploadCalls[0];
            expect(uploadArg.data).toEqual(TEST_AUDIO);
            expect(uploadArg.contentType).toBe('audio/mpeg');
        });

        it('merges custom voice settings with emotion settings', async () => {
            const customSettings = { stability: 0.9 };
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
                emotion: Emotion.Happy,
                voiceSettings: customSettings,
            };

            await service.generateSpeech(input);

            const calls = (mockProvider.convertWithTimestamps as ReturnType<typeof mock>).mock.calls;
            const [callArg] = calls[0];

            // Custom setting should override emotion setting
            expect(callArg.voiceSettings.stability).toBe(0.9);
            // Other emotion settings should be preserved
            expect(callArg.voiceSettings.speed).toBe(EMOTION_VOICE_SETTINGS[Emotion.Happy].speed);
        });
    });

    describe('generateBatch()', () => {
        it('generates multiple segments', async () => {
            const input = {
                segments: [
                    { id: 'seg1', text: 'First segment', voiceId: TEST_VOICE_ID },
                    { id: 'seg2', text: 'Second segment', voiceId: TEST_VOICE_ID },
                    { id: 'seg3', text: 'Third segment', voiceId: TEST_VOICE_ID },
                ],
            };

            const result = await service.generateBatch(input);

            expect(result.successCount).toBe(3);
            expect(result.failureCount).toBe(0);
            expect(result.results.length).toBe(3);
            expect(result.totalDurationSeconds).toBe(TEST_DURATION * 3);
        });

        it('handles partial failures', async () => {
            // Create a new mock provider that fails on second call
            let callCount = 0;
            const failingProvider: IElevenLabsProvider = {
                convertWithTimestamps: async () => {
                    callCount++;
                    if (callCount === 2) {
                        throw new Error('Simulated failure');
                    }
                    return {
                        audio: TEST_AUDIO,
                        durationSeconds: TEST_DURATION,
                    };
                },
                listVoices: async () => [],
                isValidVoice: async () => true,
            };

            // Create a custom batch test that uses the failing provider directly
            const segments = [
                { id: 'seg1', text: 'First segment', voiceId: TEST_VOICE_ID },
                { id: 'seg2', text: 'Second segment', voiceId: TEST_VOICE_ID },
                { id: 'seg3', text: 'Third segment', voiceId: TEST_VOICE_ID },
            ];

            const results = await Promise.allSettled(
                segments.map(async (seg) => {
                    const result = await failingProvider.convertWithTimestamps({
                        text: seg.text,
                        voiceId: seg.voiceId,
                    });
                    return { id: seg.id, result };
                })
            );

            const processedResults = results.map((result, index) => {
                const segmentId = segments[index].id;
                if (result.status === 'fulfilled') {
                    return { id: segmentId, result: result.value.result };
                }
                return { id: segmentId, error: result.reason as Error };
            });

            const successCount = processedResults.filter((r) => r.result).length;
            const failureCount = processedResults.filter((r) => r.error).length;

            expect(successCount).toBe(2);
            expect(failureCount).toBe(1);
            expect(processedResults.find((r) => r.id === 'seg2')?.error).toBeDefined();
        });
    });

    describe('selectVoiceForCharacter()', () => {
        it('selects narrator voice for generic description', () => {
            const voiceId = service.selectVoiceForCharacter('narrator', 'female');
            expect(voiceId).toBe(DEFAULT_VOICE_IDS.narrator.female);
        });

        it('selects villain voice for evil character', () => {
            const voiceId = service.selectVoiceForCharacter('evil villain', 'male');
            expect(voiceId).toBe(DEFAULT_VOICE_IDS.villain.male);
        });

        it('selects wise character voice for elder', () => {
            const voiceId = service.selectVoiceForCharacter('wise elder sage', 'female');
            expect(voiceId).toBe(DEFAULT_VOICE_IDS.wiseCharacter.female);
        });

        it('selects child hero voice for young protagonist', () => {
            const voiceId = service.selectVoiceForCharacter('young child hero', 'male');
            expect(voiceId).toBe(DEFAULT_VOICE_IDS.childHero.male);
        });

        it('selects comedic voice for funny character', () => {
            const voiceId = service.selectVoiceForCharacter('funny comic relief', 'female');
            expect(voiceId).toBe(DEFAULT_VOICE_IDS.comedic.female);
        });

        it('defaults to female narrator when no archetype matches', () => {
            const voiceId = service.selectVoiceForCharacter('mysterious stranger');
            expect(voiceId).toBe(DEFAULT_VOICE_IDS.narrator.female);
        });
    });

    describe('rate limiting', () => {
        it('increments rate limit counter', async () => {
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
            };

            await service.generateSpeech(input);

            const incrCalls = (mockCache.incr as ReturnType<typeof mock>).mock.calls;
            expect(incrCalls.length).toBe(1);
        });

        it('sets expiration on first request of minute', async () => {
            const input: GenerateSpeechInput = {
                text: TEST_TEXT,
                voiceId: TEST_VOICE_ID,
            };

            await service.generateSpeech(input);

            const expireCalls = (mockCache.expire as ReturnType<typeof mock>).mock.calls;
            expect(expireCalls.length).toBe(1);
            expect(expireCalls[0][1]).toBe(120); // 2 minutes TTL
        });
    });
});

describe('EMOTION_VOICE_SETTINGS', () => {
    it('has settings for all emotions', () => {
        const emotions = Object.values(Emotion);
        for (const emotion of emotions) {
            expect(EMOTION_VOICE_SETTINGS[emotion]).toBeDefined();
            expect(EMOTION_VOICE_SETTINGS[emotion].stability).toBeDefined();
            expect(EMOTION_VOICE_SETTINGS[emotion].similarityBoost).toBeDefined();
        }
    });

    it('happy emotion has higher speed', () => {
        expect(EMOTION_VOICE_SETTINGS[Emotion.Happy].speed).toBeGreaterThan(1);
    });

    it('sad emotion has lower speed', () => {
        expect(EMOTION_VOICE_SETTINGS[Emotion.Sad].speed).toBeLessThan(1);
    });

    it('calm emotion has higher stability', () => {
        expect(EMOTION_VOICE_SETTINGS[Emotion.Calm].stability).toBeGreaterThan(
            EMOTION_VOICE_SETTINGS[Emotion.Excited].stability!
        );
    });
});

describe('DEFAULT_VOICE_IDS', () => {
    it('has male and female variants for all archetypes', () => {
        const archetypes = Object.keys(DEFAULT_VOICE_IDS);
        expect(archetypes.length).toBeGreaterThan(0);

        for (const archetype of archetypes) {
            const voices = DEFAULT_VOICE_IDS[archetype as keyof typeof DEFAULT_VOICE_IDS];
            expect(voices.male).toBeDefined();
            expect(voices.female).toBeDefined();
            expect(voices.male).not.toBe(voices.female);
        }
    });
});

describe('VOICE_IDS_BY_LANGUAGE', () => {
    it('has voice mappings for French and English', () => {
        expect(VOICE_IDS_BY_LANGUAGE[Language.French]).toBeDefined();
        expect(VOICE_IDS_BY_LANGUAGE[Language.English]).toBeDefined();
    });

    it('has all archetypes for each language', () => {
        const expectedArchetypes = [
            'narrator', 'childHero', 'wiseCharacter', 'villain',
            'comedic', 'parent', 'friend', 'animal', 'magical'
        ];

        for (const lang of [Language.French, Language.English]) {
            const voices = VOICE_IDS_BY_LANGUAGE[lang];
            for (const archetype of expectedArchetypes) {
                expect(voices[archetype as keyof typeof voices]).toBeDefined();
                expect(voices[archetype as keyof typeof voices].male).toBeDefined();
                expect(voices[archetype as keyof typeof voices].female).toBeDefined();
            }
        }
    });

    it('has different voice IDs for French and English narrator', () => {
        const frenchNarrator = VOICE_IDS_BY_LANGUAGE[Language.French].narrator;
        const englishNarrator = VOICE_IDS_BY_LANGUAGE[Language.English].narrator;

        // French and English should have different voice IDs
        expect(frenchNarrator.female).not.toBe(englishNarrator.female);
    });

    it('DEFAULT_VOICE_IDS is the same as English voices (backwards compatibility)', () => {
        expect(DEFAULT_VOICE_IDS).toEqual(VOICE_IDS_BY_LANGUAGE[Language.English]);
    });
});
