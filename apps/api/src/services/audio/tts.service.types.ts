/**
 * TTS Service Types
 *
 * Type definitions for the Text-to-Speech service.
 * Designed for FFmpeg compatibility with precise duration tracking.
 */

import type { Emotion, ElevenLabsVoiceSettings } from '@mio/shared/models';
import type { Language } from '@mio/shared/types';

/**
 * Audio format metadata for FFmpeg compatibility
 */
export interface AudioFormat {
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
 * Input for single speech generation
 */
export interface GenerateSpeechInput {
    /** Text to convert to speech */
    text: string;
    /** ElevenLabs voice ID */
    voiceId: string;
    /** Emotion affecting delivery */
    emotion?: Emotion;
    /** Voice settings override */
    voiceSettings?: ElevenLabsVoiceSettings;
    /** Character name (for logging/debugging) */
    characterName?: string;
}

/**
 * Result from single speech generation
 */
export interface GenerateSpeechResult {
    /** Audio buffer (MP3) */
    audio: Buffer;
    /** Duration in seconds (exact, from alignment) */
    durationSeconds: number;
    /** Voice ID used */
    voiceId: string;
    /** Audio format metadata */
    format: AudioFormat;
    /** Whether result came from cache */
    fromCache?: boolean;
}

/**
 * Segment for batch generation
 */
export interface BatchSegment extends GenerateSpeechInput {
    /** Unique segment identifier */
    id: string;
}

/**
 * Input for batch speech generation
 */
export interface BatchGenerateSpeechInput {
    /** Segments to generate */
    segments: BatchSegment[];
}

/**
 * Result for a single segment in batch
 */
export interface BatchSegmentResult {
    /** Segment identifier */
    id: string;
    /** Generation result (if successful) */
    result?: GenerateSpeechResult;
    /** Error (if failed) */
    error?: Error;
}

/**
 * Result from batch speech generation
 */
export interface BatchGenerateSpeechResult {
    /** Results for each segment */
    results: BatchSegmentResult[];
    /** Number of successful generations */
    successCount: number;
    /** Number of failed generations */
    failureCount: number;
    /** Total duration of successful generations */
    totalDurationSeconds: number;
}

/**
 * Character archetype for voice selection
 */
export type CharacterArchetype =
    | 'narrator'
    | 'childHero'
    | 'wiseCharacter'
    | 'villain'
    | 'comedic'
    | 'parent'
    | 'friend'
    | 'animal'
    | 'magical';

/**
 * Options for voice selection
 */
export interface VoiceSelectionOptions {
    /** Gender preference for the voice */
    gender?: 'male' | 'female';
    /** Language for voice selection (defaults to French) */
    language?: Language;
}

/**
 * TTS Service Interface
 */
export interface ITTSService {
    /**
     * Generate speech from text
     *
     * @param input - Generation parameters
     * @returns Audio buffer with duration and format metadata
     */
    generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechResult>;

    /**
     * Generate speech for multiple segments with controlled concurrency
     *
     * @param input - Batch generation parameters
     * @returns Results for all segments
     */
    generateBatch(input: BatchGenerateSpeechInput): Promise<BatchGenerateSpeechResult>;

    /**
     * Select appropriate voice ID for a character
     *
     * @param description - Character description or archetype
     * @param options - Voice selection options (gender, language)
     * @returns ElevenLabs voice ID
     */
    selectVoiceForCharacter(description: string, options?: VoiceSelectionOptions): string;
}
