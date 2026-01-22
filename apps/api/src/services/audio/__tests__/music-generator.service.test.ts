/**
 * Music Generator Service Tests
 *
 * Unit tests for the background music generation service.
 * These tests focus on the pure logic parts without FFmpeg operations.
 */

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { MusicGeneratorService } from '../music-generator.service';
import type { ISoundEffectsProvider, SoundEffectsConvertResult } from '../soundEffects.provider.types';
import type { Logger } from '@mio/shared/server/logger';
import * as ioc from '../../../ioc';

describe('MusicGeneratorService', () => {
    let mockSfxProvider: ISoundEffectsProvider;
    let mockLogger: Logger;

    beforeEach(() => {
        // Create mock SFX provider
        mockSfxProvider = {
            convert: mock(async (): Promise<SoundEffectsConvertResult> => ({
                audio: Buffer.from('mock audio data'),
                durationSeconds: 15,
            })),
        };

        // Create mock logger
        mockLogger = {
            info: mock(() => {}),
            debug: mock(() => {}),
            warn: mock(() => {}),
            error: mock(() => {}),
        } as unknown as Logger;

        // Mock getInstance to return mock audio library service
        spyOn(ioc, 'getInstance').mockImplementation(() => ({
            findMusic: mock(async () => ({ music: null, fromCache: false })),
            storeMusic: mock(async () => {}),
            incrementMusicUsage: mock(async () => {}),
        }));
    });

    describe('getPromptForMood', () => {
        it('should return prompt for calm mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('calm');
            expect(prompt).toContain('piano');
        });

        it('should return prompt for adventurous mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('adventurous');
            // All adventurous prompts (including variations) contain 'adventure'
            expect(prompt.toLowerCase()).toContain('adventure');
        });

        it('should return prompt for mysterious mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('mysterious');
            expect(prompt).toContain('mysterious');
        });

        it('should return prompt for magical mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('magical');
            expect(prompt).toContain('magical');
        });

        it('should return prompt for tense mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('tense');
            // All tense prompts contain either 'suspens' or 'tense' or 'tension'
            expect(prompt.toLowerCase()).toMatch(/tense|suspens|tension/);
        });

        it('should return prompt for joyful mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('joyful');
            expect(prompt.toLowerCase()).toContain('happy');
        });

        it('should return prompt for sad mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('sad');
            expect(prompt.toLowerCase()).toContain('sad');
        });

        it('should return prompt for serene mood', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const prompt = service.getPromptForMood('serene');
            expect(prompt).toContain('serene');
        });

        it('should return non-empty prompt for all defined moods', () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const moods = ['calm', 'mysterious', 'adventurous', 'tense', 'joyful', 'sad', 'magical', 'serene'] as const;

            for (const mood of moods) {
                const prompt = service.getPromptForMood(mood);
                expect(prompt).toBeTruthy();
                expect(prompt.length).toBeGreaterThan(20);
            }
        });
    });

    describe('input validation', () => {
        it('should throw error for duration below minimum', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            await expect(
                service.generate({
                    mood: 'calm',
                    targetDurationSeconds: 0.1, // Below minimum (0.5)
                })
            ).rejects.toThrow();
        });

        it('should accept valid duration at minimum', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            // This will fail at FFmpeg but should pass validation
            try {
                await service.generate({
                    mood: 'calm',
                    targetDurationSeconds: 0.5, // Exactly at minimum
                });
            } catch (e) {
                // FFmpeg error is expected in tests, but we passed validation
                expect((e as Error).message).not.toContain('must be at least');
            }
        });
    });

    describe('SFX provider integration', () => {
        it('should call SFX provider with mood-based prompt', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    mood: 'adventurous',
                    targetDurationSeconds: 10,
                });
            } catch {
                // FFmpeg error expected
            }

            expect(mockSfxProvider.convert).toHaveBeenCalled();
            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            // All adventurous prompts (including variations) contain 'adventure'
            expect(convertCall[0].text.toLowerCase()).toContain('adventure');
        });

        it('should use custom prompt when provided', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);
            const customPrompt = 'epic battle music with drums';

            try {
                await service.generate({
                    mood: 'calm',
                    targetDurationSeconds: 10,
                    customPrompt,
                });
            } catch {
                // FFmpeg error expected
            }

            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].text).toBe(customPrompt);
        });

        it('should pass through prompt influence parameter', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    mood: 'calm',
                    targetDurationSeconds: 10,
                    promptInfluence: 0.8,
                });
            } catch {
                // FFmpeg error expected
            }

            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].promptInfluence).toBe(0.8);
        });
    });

    describe('generateForSegment', () => {
        it('should handle SFX provider failure gracefully', async () => {
            mockSfxProvider.convert = mock(async () => {
                throw new Error('API error');
            });

            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            const result = await service.generateForSegment({
                id: 'music-fail',
                mood: 'calm',
                startTime: 5,
                duration: 10,
            });

            expect(result.id).toBe('music-fail');
            expect(result.success).toBe(false);
            expect(result.error).toContain('API error');
            expect(result.startTime).toBe(5);
        });

        it('should pass segment parameters correctly', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generateForSegment({
                    id: 'music-001',
                    mood: 'mysterious',
                    startTime: 10,
                    duration: 20,
                    volume: 0.2,
                    fadeInDuration: 2,
                    fadeOutDuration: 3,
                });
            } catch {
                // FFmpeg error expected
            }

            expect(mockSfxProvider.convert).toHaveBeenCalled();
            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].text).toContain('mysterious');
        });
    });

    describe('logging', () => {
        it('should log generation start with correct parameters', async () => {
            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    mood: 'magical',
                    targetDurationSeconds: 30,
                    volume: 0.2,
                });
            } catch {
                // FFmpeg error expected
            }

            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should log error on segment failure', async () => {
            mockSfxProvider.convert = mock(async () => {
                throw new Error('Network error');
            });

            const service = new MusicGeneratorService(mockLogger, mockSfxProvider);

            await service.generateForSegment({
                id: 'music-error',
                mood: 'calm',
                startTime: 0,
                duration: 10,
            });

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
