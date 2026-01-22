/**
 * Ambiance Generator Service Tests
 *
 * Unit tests for the ambient sound generation service.
 * These tests focus on the pure logic parts without FFmpeg operations.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AmbianceGeneratorService } from '../ambiance-generator.service';
import type { ISoundEffectsProvider, SoundEffectsConvertResult } from '../soundEffects.provider.types';
import type { Logger } from '@mio/shared/server/logger';

describe('AmbianceGeneratorService', () => {
    let mockSfxProvider: ISoundEffectsProvider;
    let mockLogger: Logger;

    beforeEach(() => {
        // Create mock SFX provider
        mockSfxProvider = {
            convert: mock(async (): Promise<SoundEffectsConvertResult> => ({
                audio: Buffer.from('mock audio data'),
                durationSeconds: 10,
            })),
        };

        // Create mock logger
        mockLogger = {
            info: mock(() => {}),
            debug: mock(() => {}),
            warn: mock(() => {}),
            error: mock(() => {}),
        } as unknown as Logger;
    });

    describe('input validation', () => {
        it('should throw error for duration below minimum', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            await expect(
                service.generate({
                    description: 'test',
                    targetDurationSeconds: 0.1, // Below minimum (0.5)
                })
            ).rejects.toThrow();
        });

        it('should accept valid duration at minimum', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            // This will fail at FFmpeg but should pass validation
            try {
                await service.generate({
                    description: 'test',
                    targetDurationSeconds: 0.5, // Exactly at minimum
                });
            } catch (e) {
                // FFmpeg error is expected in tests, but we passed validation
                expect((e as Error).message).not.toContain('must be at least');
            }
        });
    });

    describe('prompt building', () => {
        it('should call SFX provider with enhanced prompt for plain descriptions', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    description: 'birds chirping',
                    targetDurationSeconds: 5,
                });
            } catch {
                // FFmpeg error expected
            }

            expect(mockSfxProvider.convert).toHaveBeenCalled();
            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].text).toContain('ambient');
            expect(convertCall[0].text).toContain('birds chirping');
        });

        it('should preserve prompt when already has ambient hints', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    description: 'ambient background forest sounds',
                    targetDurationSeconds: 5,
                });
            } catch {
                // FFmpeg error expected
            }

            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].text).toBe('ambient background forest sounds');
        });

        it('should pass through prompt influence parameter', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    description: 'test',
                    targetDurationSeconds: 5,
                    promptInfluence: 0.7,
                });
            } catch {
                // FFmpeg error expected
            }

            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].promptInfluence).toBe(0.7);
        });
    });

    describe('generateForSegment', () => {
        it('should handle SFX provider failure gracefully', async () => {
            mockSfxProvider.convert = mock(async () => {
                throw new Error('API error');
            });

            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            const result = await service.generateForSegment({
                id: 'amb-fail',
                description: 'test',
                startTime: 5,
                duration: 10,
            });

            expect(result.id).toBe('amb-fail');
            expect(result.success).toBe(false);
            expect(result.error).toContain('API error');
            expect(result.startTime).toBe(5);
        });

        it('should pass segment parameters correctly', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generateForSegment({
                    id: 'amb-001',
                    description: 'cafe sounds',
                    startTime: 10,
                    duration: 15,
                    volume: 0.4,
                    fadeInDuration: 2,
                });
            } catch {
                // FFmpeg error expected
            }

            expect(mockSfxProvider.convert).toHaveBeenCalled();
            const convertCall = (mockSfxProvider.convert as any).mock.calls[0];
            expect(convertCall[0].text).toContain('cafe sounds');
        });
    });

    describe('logging', () => {
        it('should log generation start with correct parameters', async () => {
            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            try {
                await service.generate({
                    description: 'rain sounds',
                    targetDurationSeconds: 20,
                    volume: 0.5,
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

            const service = new AmbianceGeneratorService(mockLogger, mockSfxProvider);

            await service.generateForSegment({
                id: 'amb-error',
                description: 'test',
                startTime: 0,
                duration: 5,
            });

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
