/**
 * Sound Effects Service Types
 *
 * Type definitions for the Sound Effects service.
 * Designed for FFmpeg compatibility with the same audio format as TTS.
 */

import type { SfxCategory } from './soundEffects.provider.types';

/**
 * Audio format metadata for FFmpeg compatibility
 */
export interface SfxAudioFormat {
    /** Audio container format */
    format: 'mp3';
    /** Sample rate in Hz */
    sampleRate: 44100;
    /** Bitrate in kbps */
    bitrate: 128;
    /** Number of audio channels */
    channels: 2;
}

/**
 * Input for single sound effect generation
 */
export interface GenerateSfxInput {
    /** Text description of the sound effect (e.g., "heavy rain with distant thunder") */
    text: string;
    /** Category for organization and caching */
    category?: SfxCategory;
    /** Duration in seconds (0.5-22, optional - ElevenLabs auto-detects if not provided) */
    durationSeconds?: number;
    /** How closely to follow the prompt (0-1, default: 0.3) */
    promptInfluence?: number;
}

/**
 * Result from single sound effect generation
 */
export interface GenerateSfxResult {
    /** Audio buffer (MP3) */
    audio: Buffer;
    /** Duration in seconds */
    durationSeconds: number;
    /** Audio format metadata */
    format: SfxAudioFormat;
    /** Whether result came from cache */
    fromCache?: boolean;
    /** Cache key used (for debugging) */
    cacheKey?: string;
}

/**
 * Segment for batch SFX generation
 */
export interface BatchSfxSegment extends GenerateSfxInput {
    /** Unique segment identifier */
    id: string;
}

/**
 * Input for batch SFX generation
 */
export interface BatchGenerateSfxInput {
    /** SFX segments to generate */
    segments: BatchSfxSegment[];
}

/**
 * Result for a single segment in batch
 */
export interface BatchSfxSegmentResult {
    /** Segment identifier */
    id: string;
    /** Generation result (if successful) */
    result?: GenerateSfxResult;
    /** Error (if failed) */
    error?: Error;
}

/**
 * Result from batch SFX generation
 */
export interface BatchGenerateSfxResult {
    /** Results for each segment */
    results: BatchSfxSegmentResult[];
    /** Number of successful generations */
    successCount: number;
    /** Number of failed generations */
    failureCount: number;
    /** Total duration of successful generations */
    totalDurationSeconds: number;
}

/**
 * Sound Effects Service Interface
 */
export interface ISoundEffectsService {
    /**
     * Generate a sound effect from text description
     *
     * Uses caching with deterministic keys based on all input parameters.
     *
     * @param input - Generation parameters
     * @returns Audio buffer with duration and format metadata
     */
    generateSfx(input: GenerateSfxInput): Promise<GenerateSfxResult>;

    /**
     * Generate multiple sound effects with controlled concurrency
     *
     * @param input - Batch generation parameters
     * @returns Results for all segments
     */
    generateBatch(input: BatchGenerateSfxInput): Promise<BatchGenerateSfxResult>;

    /**
     * Get cache statistics for sound effects
     */
    getCacheStats(): Promise<{ hits: number; misses: number; size: number }>;
}
