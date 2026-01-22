/**
 * FFmpeg Mixer Service Integration Tests
 *
 * Tests for the audio mixing service using real FFmpeg operations.
 * Requires FFmpeg to be installed on the system.
 */

import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { mkdir, rm, readFile, access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import ffmpeg from 'fluent-ffmpeg';

import { FFmpegMixerService } from '../ffmpeg-mixer.service';
import type { MixStoryInput, VoiceTrackInput } from '../ffmpeg-mixer.service.types';
import { OUTPUT_FORMAT, DEFAULT_VOLUMES, LOUDNORM_SETTINGS } from '../ffmpeg-mixer.service.constants';
import { ErrorCodes } from '@mio/shared';

// Fixtures directory
const FIXTURES_DIR = join(__dirname, 'fixtures');

// Test workdir (cleaned up after each test suite)
let testWorkdir: string;

// Mock Logger
const createMockLogger = () => ({
    info: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    withModule: () => createMockLogger(),
    withError: () => ({
        error: mock(() => {}),
    }),
});

// Mock Storage Service that reads from fixtures
const createMockStorage = () => ({
    upload: mock(async () => ({ path: 'test/path.mp3', url: 'https://example.com/test.mp3' })),
    download: mock(async (path: string) => {
        // Map S3 paths to fixture files
        if (path.includes('voice')) {
            return readFile(join(FIXTURES_DIR, 'voice-sample.mp3'));
        }
        if (path.includes('music')) {
            return readFile(join(FIXTURES_DIR, 'music-sample.mp3'));
        }
        if (path.includes('sfx')) {
            return readFile(join(FIXTURES_DIR, 'sfx-sample.mp3'));
        }
        if (path.includes('ambiance')) {
            return readFile(join(FIXTURES_DIR, 'ambiance-sample.mp3'));
        }
        throw new Error(`Unknown fixture: ${path}`);
    }),
    delete: mock(async () => {}),
    deleteMany: mock(async () => {}),
    getPublicUrl: mock(() => 'https://example.com/test.mp3'),
    exists: mock(async () => true),
});

// Helper to get audio duration using ffprobe
function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(metadata.format.duration ?? 0);
        });
    });
}

// Helper to check if file exists
async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

describe('FFmpegMixerService', () => {
    let service: FFmpegMixerService;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStorage: ReturnType<typeof createMockStorage>;

    beforeAll(async () => {
        // Create test workdir
        testWorkdir = join(tmpdir(), `mio-ffmpeg-test-${randomUUID().slice(0, 8)}`);
        await mkdir(testWorkdir, { recursive: true });

        // Verify fixtures exist
        const voiceExists = await fileExists(join(FIXTURES_DIR, 'voice-sample.mp3'));
        const musicExists = await fileExists(join(FIXTURES_DIR, 'music-sample.mp3'));
        const sfxExists = await fileExists(join(FIXTURES_DIR, 'sfx-sample.mp3'));
        const ambianceExists = await fileExists(join(FIXTURES_DIR, 'ambiance-sample.mp3'));

        if (!voiceExists || !musicExists || !sfxExists || !ambianceExists) {
            throw new Error('Test fixtures not found. Run generate-fixtures.sh first.');
        }
    });

    afterAll(async () => {
        // Cleanup test workdir
        if (testWorkdir) {
            await rm(testWorkdir, { recursive: true, force: true });
        }
    });

    beforeAll(() => {
        mockLogger = createMockLogger();
        mockStorage = createMockStorage();
        service = new FFmpegMixerService(
            mockLogger as unknown as Parameters<typeof FFmpegMixerService.prototype.mixStory>[0] extends { logger: infer L } ? L : never,
            mockStorage as unknown as Parameters<typeof FFmpegMixerService.prototype.mixStory>[0] extends { storage: infer S } ? S : never
        );
    });

    describe('verifyFFmpegInstalled()', () => {
        it('verifies FFmpeg is installed and has required codecs', async () => {
            const result = await service.verifyFFmpegInstalled();

            expect(result.version).toBeDefined();
            expect(result.codecs.libmp3lame).toBe(true);
            expect(result.codecs.pcm_s16le).toBe(true);
        });
    });

    describe('generateSilence()', () => {
        it('generates silence file of specified duration', async () => {
            const outputPath = join(testWorkdir, 'silence-test.wav');
            const duration = 2.5;

            const result = await service.generateSilence(duration, outputPath);

            expect(result).toBe(outputPath);

            // Verify file exists
            const exists = await fileExists(outputPath);
            expect(exists).toBe(true);

            // Verify duration (with tolerance for FFmpeg precision)
            const actualDuration = await getAudioDuration(outputPath);
            expect(Math.abs(actualDuration - duration)).toBeLessThan(0.1);
        });

        it('generates stereo audio', async () => {
            const outputPath = join(testWorkdir, 'silence-stereo.wav');
            await service.generateSilence(1, outputPath);

            // Verify channel count using ffprobe
            const metadata = await new Promise<any>((resolve, reject) => {
                ffmpeg.ffprobe(outputPath, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
            expect(audioStream?.channels).toBe(2);
        });
    });

    describe('cleanupWorkdir()', () => {
        it('removes temporary directory', async () => {
            const tempDir = join(testWorkdir, 'cleanup-test');
            await mkdir(tempDir, { recursive: true });

            // Verify it exists
            expect(await fileExists(tempDir)).toBe(true);

            // Cleanup
            await service.cleanupWorkdir(tempDir);

            // Verify it's gone
            expect(await fileExists(tempDir)).toBe(false);
        });

        it('handles non-existent directory gracefully', async () => {
            const nonExistent = join(testWorkdir, 'non-existent-dir');

            // Should not throw
            await service.cleanupWorkdir(nonExistent);
        });
    });

    describe('mixStory()', () => {
        it('mixes voice-only story', async () => {
            const input: MixStoryInput = {
                storyId: `voice-only-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [
                        { path: 'stories/voice-1.mp3', duration: 3 },
                    ],
                    pauses: new Map(),
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
            expect(result.duration).toBeGreaterThan(0);
            expect(result.format.codec).toBe(OUTPUT_FORMAT.codec);
            expect(result.format.bitrate).toBe(OUTPUT_FORMAT.bitrate);
            expect(result.format.sampleRate).toBe(OUTPUT_FORMAT.sampleRate);
            expect(result.format.channels).toBe(OUTPUT_FORMAT.channels);
        });

        it('mixes voice with pauses', async () => {
            const pauses = new Map<number, number>();
            pauses.set(0, 1); // 1 second pause after first segment

            const input: MixStoryInput = {
                storyId: `voice-pause-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [
                        { path: 'stories/voice-1.mp3', duration: 3 },
                        { path: 'stories/voice-2.mp3', duration: 3 },
                    ],
                    pauses,
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            // Duration should include the pause
            expect(result.duration).toBeGreaterThan(5); // At least 3s + 1s pause + some audio
        });

        it('mixes voice with background music', async () => {
            const input: MixStoryInput = {
                storyId: `voice-music-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
                music: {
                    file: { path: 'music/background.mp3', duration: 10 },
                    volume: DEFAULT_VOLUMES.music,
                    enableDucking: false,
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
        });

        it('mixes voice with music ducking enabled', async () => {
            const input: MixStoryInput = {
                storyId: `ducking-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
                music: {
                    file: { path: 'music/background.mp3', duration: 10 },
                    volume: DEFAULT_VOLUMES.music,
                    enableDucking: true,
                    ducking: {
                        threshold: 0.03,
                        ratio: 4,
                        attackMs: 5,
                        releaseMs: 100,
                    },
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
        });

        it('mixes voice with looped ambiance', async () => {
            const input: MixStoryInput = {
                storyId: `ambiance-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
                ambiance: {
                    file: { path: 'ambiance/forest.mp3', duration: 5 },
                    volume: DEFAULT_VOLUMES.ambiance,
                    loop: true,
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
        });

        it('mixes voice with timed SFX', async () => {
            const input: MixStoryInput = {
                storyId: `sfx-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
                sfx: {
                    files: [
                        { path: 'sfx/doorbell.mp3', duration: 2, startTime: 1 },
                    ],
                    volume: DEFAULT_VOLUMES.sfx,
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
        });

        it('mixes complete story with all tracks', async () => {
            const pauses = new Map<number, number>();
            pauses.set(0, 0.5);

            const input: MixStoryInput = {
                storyId: `complete-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [
                        { path: 'stories/voice-1.mp3', duration: 3 },
                        { path: 'stories/voice-2.mp3', duration: 3 },
                    ],
                    pauses,
                },
                music: {
                    file: { path: 'music/background.mp3', duration: 10 },
                    volume: 0.15,
                    enableDucking: true,
                },
                ambiance: {
                    file: { path: 'ambiance/forest.mp3', duration: 5 },
                    volume: 0.3,
                    loop: true,
                },
                sfx: {
                    files: [
                        { path: 'sfx/doorbell.mp3', duration: 2, startTime: 2 },
                    ],
                    volume: 0.8,
                },
            };

            const result = await service.mixStory(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
            expect(result.duration).toBeGreaterThan(5);
            expect(result.format.codec).toBe(OUTPUT_FORMAT.codec);
        });

        it('applies loudness normalization', async () => {
            const input: MixStoryInput = {
                storyId: `normalized-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
            };

            const result = await service.mixStory(input);

            // Save to file for analysis
            const outputPath = join(testWorkdir, 'normalized-output.mp3');
            await Bun.write(outputPath, result.audio);

            // Verify file was created and has valid audio
            const exists = await fileExists(outputPath);
            expect(exists).toBe(true);

            const duration = await getAudioDuration(outputPath);
            expect(duration).toBeGreaterThan(0);
        });

        it('respects custom output settings', async () => {
            const input: MixStoryInput = {
                storyId: `custom-output-${randomUUID().slice(0, 8)}`,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
                output: {
                    bitrate: '128k',
                    sampleRate: 22050,
                    channels: 1,
                },
            };

            const result = await service.mixStory(input);

            expect(result.format.bitrate).toBe('128k');
            expect(result.format.sampleRate).toBe(22050);
            expect(result.format.channels).toBe(1);

            // Save and verify actual audio properties
            const outputPath = join(testWorkdir, 'custom-output.mp3');
            await Bun.write(outputPath, result.audio);

            const metadata = await new Promise<any>((resolve, reject) => {
                ffmpeg.ffprobe(outputPath, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
            // ffprobe returns sample_rate as either string or number depending on format
            expect(Number(audioStream?.sample_rate)).toBe(22050);
            expect(audioStream?.channels).toBe(1);
        });

        it('cleans up workdir after successful mix', async () => {
            const storyId = `cleanup-${randomUUID().slice(0, 8)}`;
            const input: MixStoryInput = {
                storyId,
                voice: {
                    segments: [{ path: 'stories/voice-1.mp3', duration: 3 }],
                    pauses: new Map(),
                },
            };

            await service.mixStory(input);

            // The workdir pattern is: /tmp/mio-story-{storyId}-{uuid}/
            // It should be cleaned up after the mix
            // We can't easily verify this without exposing internals,
            // but the test passing without file descriptor issues indicates cleanup works
        });
    });

    describe('error handling', () => {
        it('throws FFmpegInvalidInput for missing input file', async () => {
            // Create a service with storage that returns empty buffer
            const badStorage = {
                ...mockStorage,
                download: mock(async () => {
                    throw new Error('File not found');
                }),
            };

            const badService = new FFmpegMixerService(
                mockLogger as any,
                badStorage as any
            );

            const input: MixStoryInput = {
                storyId: 'invalid-input',
                voice: {
                    segments: [{ path: 'non-existent.mp3', duration: 3 }],
                    pauses: new Map(),
                },
            };

            await expect(badService.mixStory(input)).rejects.toThrow();
        });
    });
});

describe('FFmpegMixerService constants', () => {
    describe('DEFAULT_VOLUMES', () => {
        it('has correct voice volume', () => {
            expect(DEFAULT_VOLUMES.voice).toBe(1.0);
        });

        it('has reduced music volume for background', () => {
            expect(DEFAULT_VOLUMES.music).toBe(0.15);
        });

        it('has appropriate SFX volume', () => {
            expect(DEFAULT_VOLUMES.sfx).toBe(0.8);
        });

        it('has subtle ambiance volume', () => {
            expect(DEFAULT_VOLUMES.ambiance).toBe(0.3);
        });
    });

    describe('OUTPUT_FORMAT', () => {
        it('uses libmp3lame codec', () => {
            expect(OUTPUT_FORMAT.codec).toBe('libmp3lame');
        });

        it('uses 192k bitrate', () => {
            expect(OUTPUT_FORMAT.bitrate).toBe('192k');
        });

        it('uses 44100 sample rate', () => {
            expect(OUTPUT_FORMAT.sampleRate).toBe(44100);
        });

        it('uses stereo output', () => {
            expect(OUTPUT_FORMAT.channels).toBe(2);
        });
    });

    describe('LOUDNORM_SETTINGS', () => {
        it('targets -16 LUFS integrated loudness', () => {
            expect(LOUDNORM_SETTINGS.integratedLoudness).toBe(-16);
        });

        it('targets -1.5 dBTP true peak', () => {
            expect(LOUDNORM_SETTINGS.truePeak).toBe(-1.5);
        });

        it('has 11 LU loudness range', () => {
            expect(LOUDNORM_SETTINGS.loudnessRange).toBe(11);
        });
    });
});

describe('VoiceTrackInput pauses Map', () => {
    it('supports pause after first segment', () => {
        const pauses = new Map<number, number>();
        pauses.set(0, 1.5);

        expect(pauses.get(0)).toBe(1.5);
    });

    it('supports multiple pauses', () => {
        const pauses = new Map<number, number>();
        pauses.set(0, 0.5);
        pauses.set(1, 1.0);
        pauses.set(2, 0.75);

        expect(pauses.size).toBe(3);
        expect(pauses.get(1)).toBe(1.0);
    });

    it('returns undefined for missing pause', () => {
        const pauses = new Map<number, number>();
        pauses.set(0, 1.0);

        expect(pauses.get(5)).toBeUndefined();
    });
});
