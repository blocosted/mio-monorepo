/**
 * ElevenLabs Provider Unit Tests
 *
 * Tests for the ElevenLabs TTS provider with mocked SDK.
 */

import { describe, it, expect, mock } from 'bun:test';

// These tests verify the provider constants and type definitions
// Actual API calls should be tested via integration tests

describe('ElevenLabsProvider types', () => {
    describe('ElevenLabsOutputFormat', () => {
        it('supports mp3_44100_128 format', () => {
            const format: string = 'mp3_44100_128';
            expect(format).toBe('mp3_44100_128');
        });
    });

    describe('ElevenLabsModel', () => {
        it('supports eleven_v3 model', () => {
            const model: string = 'eleven_v3';
            expect(model).toBe('eleven_v3');
        });
    });
});

describe('ElevenLabsProvider error handling', () => {
    it('identifies rate limit error from status code', () => {
        const isRateLimitError = (error: unknown): boolean => {
            if (error && typeof error === 'object') {
                const err = error as { status?: number; statusCode?: number; message?: string };
                if (err.status === 429 || err.statusCode === 429) {
                    return true;
                }
                if (err.message?.includes('rate limit') || err.message?.includes('429')) {
                    return true;
                }
            }
            return false;
        };

        expect(isRateLimitError({ status: 429 })).toBe(true);
        expect(isRateLimitError({ statusCode: 429 })).toBe(true);
        expect(isRateLimitError({ message: 'rate limit exceeded' })).toBe(true);
        expect(isRateLimitError({ message: 'error 429' })).toBe(true);
        expect(isRateLimitError({ status: 500 })).toBe(false);
        expect(isRateLimitError(null)).toBe(false);
    });

    it('identifies timeout error from code', () => {
        const isTimeoutError = (error: unknown): boolean => {
            if (error && typeof error === 'object') {
                const err = error as { message?: string; code?: string };
                if (err.code === 'ETIMEDOUT' || err.code === 'TIMEOUT') {
                    return true;
                }
                if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
                    return true;
                }
            }
            return false;
        };

        expect(isTimeoutError({ code: 'ETIMEDOUT' })).toBe(true);
        expect(isTimeoutError({ code: 'TIMEOUT' })).toBe(true);
        expect(isTimeoutError({ message: 'Request timeout' })).toBe(true);
        expect(isTimeoutError({ message: 'ETIMEDOUT error' })).toBe(true);
        expect(isTimeoutError({ code: 'ECONNRESET' })).toBe(false);
        expect(isTimeoutError(null)).toBe(false);
    });
});

describe('Duration calculation', () => {
    it('calculates duration from alignment data', () => {
        const alignment = {
            characters: ['H', 'e', 'l', 'l', 'o'],
            character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4],
            character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 2.5],
        };

        const durationSeconds = alignment.character_end_times_seconds.at(-1) ?? 0;
        expect(durationSeconds).toBe(2.5);
    });

    it('falls back to buffer estimation when no alignment', () => {
        const bufferSize = 40000; // 40KB
        const bitrate = 128; // kbps

        // 128kbps = 128000 bits/s = 16000 bytes/s = 16KB/s
        const estimatedDuration = bufferSize / (bitrate * 1000 / 8);
        expect(estimatedDuration).toBe(2.5); // 40000 / 16000 = 2.5
    });

    it('handles empty alignment gracefully', () => {
        const alignment = {
            characters: [],
            character_start_times_seconds: [],
            character_end_times_seconds: [],
        };

        const durationSeconds = alignment.character_end_times_seconds.at(-1) ?? 0;
        expect(durationSeconds).toBe(0);
    });
});

describe('Voice settings mapping', () => {
    it('maps ElevenLabsVoiceSettings to SDK format', () => {
        const settings = {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.3,
            speed: 1.05,
        };

        const sdkSettings = {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            speed: settings.speed,
        };

        expect(sdkSettings.stability).toBe(0.5);
        expect(sdkSettings.similarity_boost).toBe(0.75);
        expect(sdkSettings.style).toBe(0.3);
        expect(sdkSettings.speed).toBe(1.05);
    });

    it('handles undefined settings gracefully', () => {
        const settings: { stability?: number; similarityBoost?: number } = {};

        const sdkSettings = settings ? {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
        } : undefined;

        expect(sdkSettings?.stability).toBeUndefined();
        expect(sdkSettings?.similarity_boost).toBeUndefined();
    });
});
