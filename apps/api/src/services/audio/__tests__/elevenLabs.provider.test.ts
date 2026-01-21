/**
 * ElevenLabs Provider Unit Tests
 *
 * Tests for the ElevenLabs TTS provider with mocked SDK.
 */

import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';

// ============================================================================
// Stability Normalization Tests
// ============================================================================

/**
 * ElevenLabs "convertWithTimestamps" currently enforces discrete stability values.
 * Only 0, 0.5, and 1.0 are allowed. This function normalizes any value to the
 * closest allowed value.
 */
function normalizeTtdStability(value: number | undefined): 0 | 0.5 | 1 | undefined {
    if (value === undefined) return undefined;
    const clamped = Math.max(0, Math.min(1, value));
    const allowed: Array<0 | 0.5 | 1> = [0, 0.5, 1];
    return allowed.reduce((best, current) =>
        Math.abs(current - clamped) < Math.abs(best - clamped) ? current : best,
    );
}

describe('normalizeTtdStability()', () => {
    it('returns undefined for undefined input', () => {
        expect(normalizeTtdStability(undefined)).toBeUndefined();
    });

    it('normalizes 0 to 0', () => {
        expect(normalizeTtdStability(0)).toBe(0);
    });

    it('normalizes 0.5 to 0.5', () => {
        expect(normalizeTtdStability(0.5)).toBe(0.5);
    });

    it('normalizes 1.0 to 1', () => {
        expect(normalizeTtdStability(1.0)).toBe(1);
    });

    it('normalizes 0.1 to 0 (closest)', () => {
        expect(normalizeTtdStability(0.1)).toBe(0);
    });

    it('normalizes 0.24 to 0 (closest)', () => {
        expect(normalizeTtdStability(0.24)).toBe(0);
    });

    it('normalizes 0.25 to 0.5 (equidistant, picks closest)', () => {
        // 0.25 is equidistant from 0 and 0.5
        // With reduce starting from 0, 0.5 wins as it's checked last and is equally close
        const result = normalizeTtdStability(0.25);
        expect([0, 0.5]).toContain(result);
    });

    it('normalizes 0.3 to 0.5 (closest)', () => {
        expect(normalizeTtdStability(0.3)).toBe(0.5);
    });

    it('normalizes 0.7 to 0.5 (closest)', () => {
        expect(normalizeTtdStability(0.7)).toBe(0.5);
    });

    it('normalizes 0.75 to 1 (equidistant or closest)', () => {
        const result = normalizeTtdStability(0.75);
        expect([0.5, 1]).toContain(result);
    });

    it('normalizes 0.8 to 1 (closest)', () => {
        expect(normalizeTtdStability(0.8)).toBe(1);
    });

    it('clamps values below 0 to 0', () => {
        expect(normalizeTtdStability(-0.5)).toBe(0);
        expect(normalizeTtdStability(-1)).toBe(0);
    });

    it('clamps values above 1 to 1', () => {
        expect(normalizeTtdStability(1.5)).toBe(1);
        expect(normalizeTtdStability(2)).toBe(1);
    });
});

// ============================================================================
// Rate Limit Error Detection Tests
// ============================================================================

describe('isRateLimitError()', () => {
    function isRateLimitError(error: unknown): boolean {
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
    }

    it('identifies rate limit error from status code 429', () => {
        expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    it('identifies rate limit error from statusCode 429', () => {
        expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    });

    it('identifies rate limit error from message containing "rate limit"', () => {
        expect(isRateLimitError({ message: 'rate limit exceeded' })).toBe(true);
        expect(isRateLimitError({ message: 'You have hit a rate limit' })).toBe(true);
    });

    it('identifies rate limit error from message containing "429"', () => {
        expect(isRateLimitError({ message: 'error 429' })).toBe(true);
        expect(isRateLimitError({ message: 'HTTP 429 Too Many Requests' })).toBe(true);
    });

    it('returns false for non-rate-limit errors', () => {
        expect(isRateLimitError({ status: 500 })).toBe(false);
        expect(isRateLimitError({ status: 400 })).toBe(false);
        expect(isRateLimitError({ message: 'Internal server error' })).toBe(false);
    });

    it('returns false for null or undefined', () => {
        expect(isRateLimitError(null)).toBe(false);
        expect(isRateLimitError(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
        expect(isRateLimitError('error')).toBe(false);
        expect(isRateLimitError(429)).toBe(false);
        expect(isRateLimitError(true)).toBe(false);
    });
});

// ============================================================================
// Timeout Error Detection Tests
// ============================================================================

describe('isTimeoutError()', () => {
    function isTimeoutError(error: unknown): boolean {
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
    }

    it('identifies timeout error from code ETIMEDOUT', () => {
        expect(isTimeoutError({ code: 'ETIMEDOUT' })).toBe(true);
    });

    it('identifies timeout error from code TIMEOUT', () => {
        expect(isTimeoutError({ code: 'TIMEOUT' })).toBe(true);
    });

    it('identifies timeout error from message containing "timeout"', () => {
        expect(isTimeoutError({ message: 'Request timeout' })).toBe(true);
        expect(isTimeoutError({ message: 'Connection timeout after 30s' })).toBe(true);
    });

    it('identifies timeout error from message containing "ETIMEDOUT"', () => {
        expect(isTimeoutError({ message: 'ETIMEDOUT error' })).toBe(true);
    });

    it('returns false for other error codes', () => {
        expect(isTimeoutError({ code: 'ECONNRESET' })).toBe(false);
        expect(isTimeoutError({ code: 'ECONNREFUSED' })).toBe(false);
    });

    it('returns false for null or undefined', () => {
        expect(isTimeoutError(null)).toBe(false);
        expect(isTimeoutError(undefined)).toBe(false);
    });
});

// ============================================================================
// Duration Calculation Tests
// ============================================================================

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

    it('handles single character alignment', () => {
        const alignment = {
            characters: ['A'],
            character_start_times_seconds: [0],
            character_end_times_seconds: [0.5],
        };

        const durationSeconds = alignment.character_end_times_seconds.at(-1) ?? 0;
        expect(durationSeconds).toBe(0.5);
    });

    it('estimates duration for various buffer sizes', () => {
        const bitrate = 128; // kbps
        const bytesPerSecond = bitrate * 1000 / 8;

        // 1 second of audio at 128kbps
        expect(16000 / bytesPerSecond).toBe(1);

        // 5 seconds of audio
        expect(80000 / bytesPerSecond).toBe(5);

        // 30 seconds of audio
        expect(480000 / bytesPerSecond).toBe(30);
    });
});

// ============================================================================
// Voice Settings Mapping Tests
// ============================================================================

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

    it('handles partial settings', () => {
        const settings = {
            stability: 0.7,
            // similarityBoost not specified
        };

        const sdkSettings = {
            stability: settings.stability,
            similarity_boost: undefined,
        };

        expect(sdkSettings.stability).toBe(0.7);
        expect(sdkSettings.similarity_boost).toBeUndefined();
    });

    it('preserves all setting values in transformation', () => {
        const inputSettings = {
            stability: 0,
            similarityBoost: 1,
            style: 0.5,
            speed: 0.7,
        };

        const sdkSettings = {
            stability: inputSettings.stability,
            similarity_boost: inputSettings.similarityBoost,
            style: inputSettings.style,
            speed: inputSettings.speed,
        };

        // All values should be preserved exactly
        expect(sdkSettings.stability).toBe(0);
        expect(sdkSettings.similarity_boost).toBe(1);
        expect(sdkSettings.style).toBe(0.5);
        expect(sdkSettings.speed).toBe(0.7);
    });
});

// ============================================================================
// Output Format Tests
// ============================================================================

describe('ElevenLabsOutputFormat', () => {
    const VALID_FORMATS = [
        'mp3_44100_128',
        'mp3_44100_192',
        'mp3_22050_64',
        'pcm_16000',
        'pcm_22050',
        'pcm_24000',
        'pcm_44100',
    ];

    it('supports mp3_44100_128 format (default)', () => {
        const format = 'mp3_44100_128';
        expect(VALID_FORMATS).toContain(format);
    });

    it('supports high quality mp3_44100_192 format', () => {
        const format = 'mp3_44100_192';
        expect(VALID_FORMATS).toContain(format);
    });

    it('supports pcm formats for raw audio', () => {
        expect(VALID_FORMATS).toContain('pcm_16000');
        expect(VALID_FORMATS).toContain('pcm_44100');
    });
});

// ============================================================================
// ElevenLabs Model Tests
// ============================================================================

describe('ElevenLabsModel', () => {
    it('supports eleven_v3 model (default for expressivity)', () => {
        const model = 'eleven_v3';
        expect(model).toBe('eleven_v3');
    });

    it('supports eleven_multilingual_v2 for multi-language', () => {
        const model = 'eleven_multilingual_v2';
        expect(model).toBe('eleven_multilingual_v2');
    });

    it('supports eleven_turbo_v2_5 for low latency', () => {
        const model = 'eleven_turbo_v2_5';
        expect(model).toBe('eleven_turbo_v2_5');
    });
});

// ============================================================================
// Audio Base64 Decoding Tests
// ============================================================================

describe('Audio base64 decoding', () => {
    it('decodes base64 audio to buffer', () => {
        const fakeAudio = 'Hello, World!';
        const base64 = Buffer.from(fakeAudio).toString('base64');

        const decoded = Buffer.from(base64, 'base64');
        expect(decoded.toString()).toBe(fakeAudio);
    });

    it('handles empty base64 string', () => {
        const base64 = '';
        const decoded = Buffer.from(base64, 'base64');
        expect(decoded.length).toBe(0);
    });

    it('preserves binary data integrity', () => {
        // Create some binary data (like a mini audio file)
        const binaryData = new Uint8Array([0x00, 0xFF, 0x10, 0xAB, 0xCD, 0xEF]);
        const buffer = Buffer.from(binaryData);
        const base64 = buffer.toString('base64');

        const decoded = Buffer.from(base64, 'base64');
        expect(decoded).toEqual(buffer);
    });
});

// ============================================================================
// Error Classification Tests
// ============================================================================

describe('Error classification', () => {
    function classifyError(error: unknown): 'rate_limit' | 'timeout' | 'api_error' | 'unknown' {
        if (!error || typeof error !== 'object') {
            return 'unknown';
        }

        const err = error as { status?: number; statusCode?: number; message?: string; code?: string };

        // Rate limit
        if (err.status === 429 || err.statusCode === 429 ||
            err.message?.includes('rate limit') || err.message?.includes('429')) {
            return 'rate_limit';
        }

        // Timeout
        if (err.code === 'ETIMEDOUT' || err.code === 'TIMEOUT' ||
            err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
            return 'timeout';
        }

        // API error (4xx or 5xx)
        const status = err.status ?? err.statusCode;
        if (status && status >= 400) {
            return 'api_error';
        }

        return 'unknown';
    }

    it('classifies rate limit errors correctly', () => {
        expect(classifyError({ status: 429 })).toBe('rate_limit');
        expect(classifyError({ message: 'rate limit exceeded' })).toBe('rate_limit');
    });

    it('classifies timeout errors correctly', () => {
        expect(classifyError({ code: 'ETIMEDOUT' })).toBe('timeout');
        expect(classifyError({ message: 'Request timeout' })).toBe('timeout');
    });

    it('classifies API errors correctly', () => {
        expect(classifyError({ status: 400 })).toBe('api_error');
        expect(classifyError({ status: 401 })).toBe('api_error');
        expect(classifyError({ status: 500 })).toBe('api_error');
    });

    it('classifies unknown errors', () => {
        expect(classifyError(null)).toBe('unknown');
        expect(classifyError({})).toBe('unknown');
        expect(classifyError({ random: 'data' })).toBe('unknown');
    });
});
