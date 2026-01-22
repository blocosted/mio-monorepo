/**
 * Music Generator Service Types
 *
 * Service for generating background music using ElevenLabs SFX API.
 * Maps moods to descriptive prompts and supports looping for longer durations.
 */

import type { MusicMood } from './music-strategy.service.types';

/**
 * Input for generating music
 */
export interface MusicGenerateInput {
    /** Mood of the music (mapped to descriptive prompt) */
    mood: MusicMood;
    /** Target duration in seconds (will loop if source is shorter) */
    targetDurationSeconds: number;
    /** Fade in duration in seconds (default: 2.0) */
    fadeInDuration?: number;
    /** Fade out duration in seconds (default: 3.0) */
    fadeOutDuration?: number;
    /** Volume level 0-1 (default: 0.15) */
    volume?: number;
    /** Prompt influence for ElevenLabs (0-1, default: 0.5) */
    promptInfluence?: number;
    /** Custom prompt override (ignores mood mapping) */
    customPrompt?: string;
}

/**
 * Result of music generation
 */
export interface MusicGenerateResult {
    /** Generated audio buffer */
    audio: Buffer;
    /** Actual duration in seconds */
    durationSeconds: number;
    /** Mood used for generation */
    mood: MusicMood;
    /** Whether the audio was looped to reach target duration */
    looped: boolean;
    /** Source clip duration before looping */
    sourceClipDurationSeconds: number;
    /** Prompt used for generation */
    promptUsed: string;
}

/**
 * Input for generating music from a script segment
 */
export interface MusicSegmentInput {
    /** Segment ID from the script */
    id: string;
    /** Mood for generation */
    mood: MusicMood;
    /** Start time in the story (seconds) */
    startTime: number;
    /** Duration in seconds */
    duration: number;
    /** Volume level 0-1 */
    volume?: number;
    /** Fade in duration in seconds */
    fadeInDuration?: number;
    /** Fade out duration in seconds */
    fadeOutDuration?: number;
}

/**
 * Result of generating music for a script segment
 */
export interface MusicSegmentResult {
    /** Segment ID */
    id: string;
    /** Whether generation succeeded */
    success: boolean;
    /** Generated audio buffer (if success) */
    audio?: Buffer;
    /** Actual duration in seconds */
    durationSeconds?: number;
    /** Start time from script */
    startTime: number;
    /** Error message (if failed) */
    error?: string;
    /** Output filename */
    outputFile?: string;
    /** Whether audio was looped */
    looped?: boolean;
}

/**
 * Mood to prompt mapping configuration
 */
export interface MoodPromptMapping {
    /** Primary prompt for this mood */
    prompt: string;
    /** Variations for more diversity */
    variations?: string[];
    /** Recommended duration (seconds) - ElevenLabs works best within certain ranges */
    recommendedDuration?: number;
}

/**
 * Music Generator Service Interface
 */
export interface IMusicGeneratorService {
    /**
     * Generate music audio for a mood
     *
     * @param input - Generation parameters
     * @returns Generated music audio
     */
    generate(input: MusicGenerateInput): Promise<MusicGenerateResult>;

    /**
     * Generate music for a script segment
     *
     * @param segment - Segment from script
     * @returns Generation result
     */
    generateForSegment(segment: MusicSegmentInput): Promise<MusicSegmentResult>;

    /**
     * Get the prompt for a mood (for debugging/preview)
     *
     * @param mood - Music mood
     * @returns Prompt that will be used
     */
    getPromptForMood(mood: MusicMood): string;
}
