/**
 * Sound Effects Provider Unit Tests
 *
 * Tests for the ElevenLabs sound effects provider.
 * Uses mocked ElevenLabs client.
 */

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { Readable } from 'stream';

import { SoundEffectsProvider } from '../soundEffects.provider';
import { ErrorCodes } from '@mio/shared';

// Mock Logger
const createMockLogger = () => ({
    info: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    withModule: () => createMockLogger(),
});

// Mock ElevenLabs client
const mockConvert = mock(() => Promise.resolve(Readable.from([Buffer.from('test audio')])));

// Mock the elevenlabs module
mock.module('elevenlabs', () => ({
    ElevenLabsClient: class {
        textToSoundEffects = {
            convert: mockConvert,
        };
    },
}));

describe('SoundEffectsProvider', () => {
    let provider: SoundEffectsProvider;
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        mockLogger = createMockLogger();
        mockConvert.mockClear();
        mockConvert.mockImplementation(() =>
            Promise.resolve(Readable.from([Buffer.from('test audio data')]))
        );

        // @ts-expect-error - bypassing private constructor for testing
        provider = new SoundEffectsProvider(mockLogger);
    });

    describe('convert', () => {
        it('should convert text to sound effect', async () => {
            const input = {
                text: 'heavy rain with thunder',
            };

            const result = await provider.convert(input);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.audio.length).toBeGreaterThan(0);
            expect(result.durationSeconds).toBeGreaterThan(0);
        });

        it('should use default prompt influence when not specified', async () => {
            const input = {
                text: 'footsteps on gravel',
            };

            await provider.convert(input);

            expect(mockConvert).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt_influence: 0.3, // default
                })
            );
        });

        it('should use custom prompt influence when specified', async () => {
            const input = {
                text: 'door slam',
                promptInfluence: 0.8,
            };

            await provider.convert(input);

            expect(mockConvert).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt_influence: 0.8,
                })
            );
        });

        it('should pass duration to API when specified', async () => {
            const input = {
                text: 'wind blowing',
                durationSeconds: 5,
            };

            await provider.convert(input);

            expect(mockConvert).toHaveBeenCalledWith(
                expect.objectContaining({
                    duration_seconds: 5,
                })
            );
        });

        it('should throw SFXInvalidInput for duration below minimum', async () => {
            const input = {
                text: 'short sound',
                durationSeconds: 0.1, // below 0.5 minimum
            };

            await expect(provider.convert(input)).rejects.toMatchObject({
                code: ErrorCodes.SFXInvalidInput,
            });
        });

        it('should throw SFXInvalidInput for duration above maximum', async () => {
            const input = {
                text: 'long sound',
                durationSeconds: 30, // above 22 maximum
            };

            await expect(provider.convert(input)).rejects.toMatchObject({
                code: ErrorCodes.SFXInvalidInput,
            });
        });

        it('should throw SFXInvalidInput for invalid prompt influence', async () => {
            const input = {
                text: 'test sound',
                promptInfluence: 1.5, // above 1 maximum
            };

            await expect(provider.convert(input)).rejects.toMatchObject({
                code: ErrorCodes.SFXInvalidInput,
            });
        });

        it('should throw SFXRateLimited on 429 error', async () => {
            mockConvert.mockImplementationOnce(() =>
                Promise.reject({ status: 429, message: 'rate limit exceeded' })
            );

            const input = {
                text: 'test sound',
            };

            await expect(provider.convert(input)).rejects.toMatchObject({
                code: ErrorCodes.SFXRateLimited,
            });
        });

        it('should throw SFXTimeout on timeout error', async () => {
            mockConvert.mockImplementationOnce(() =>
                Promise.reject({ code: 'ETIMEDOUT', message: 'connection timed out' })
            );

            const input = {
                text: 'test sound',
            };

            await expect(provider.convert(input)).rejects.toMatchObject({
                code: ErrorCodes.SFXTimeout,
            });
        });

        it('should throw SFXGenerationFailed on generic error', async () => {
            mockConvert.mockImplementationOnce(() =>
                Promise.reject(new Error('Unknown API error'))
            );

            const input = {
                text: 'test sound',
            };

            await expect(provider.convert(input)).rejects.toMatchObject({
                code: ErrorCodes.SFXGenerationFailed,
            });
        });
    });
});
