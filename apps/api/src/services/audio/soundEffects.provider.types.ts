/**
 * Sound Effects Provider Types
 *
 * Type definitions for the ElevenLabs Sound Effects API wrapper.
 */

import type { ElevenLabsOutputFormat } from './elevenLabs.provider.types';

/**
 * Sound effect category for organization
 */
export const SfxCategory = {
    /** Background ambient sounds (rain, wind, forest) */
    Ambient: 'ambient',
    /** Short sound effects (door slam, footsteps) */
    Effects: 'effects',
    /** Transition sounds (whoosh, ding) */
    Transitions: 'transitions',
    /** Foley sounds (cloth rustling, paper) */
    Foley: 'foley',
    /** Creature/animal sounds */
    Creatures: 'creatures',
    /** Background music */
    Music: 'music',
} as const;

export type SfxCategory = (typeof SfxCategory)[keyof typeof SfxCategory];

/**
 * Input for ElevenLabs sound effects conversion
 */
export interface SoundEffectsConvertInput {
    /** Text description of the sound effect (e.g., "heavy rain with distant thunder") */
    text: string;
    /** Output format (default: mp3_44100_128) */
    outputFormat?: ElevenLabsOutputFormat;
    /** Duration in seconds (0.5-22, optional - ElevenLabs auto-detects if not provided) */
    durationSeconds?: number;
    /** How closely to follow the prompt (0-1, default: 0.3) */
    promptInfluence?: number;
}

/**
 * Result from ElevenLabs sound effects conversion
 */
export interface SoundEffectsConvertResult {
    /** Audio buffer */
    audio: Buffer;
    /** Estimated duration in seconds */
    durationSeconds: number;
}

/**
 * Sound Effects Provider Interface
 */
export interface ISoundEffectsProvider {
    /**
     * Convert text description to sound effect audio
     */
    convert(input: SoundEffectsConvertInput): Promise<SoundEffectsConvertResult>;
}
