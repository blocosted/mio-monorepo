/**
 * ElevenLabs Provider Types
 *
 * Type definitions for the ElevenLabs TTS API wrapper.
 */

import type { ElevenLabsVoiceSettings } from '@mio/shared/models';

/**
 * ElevenLabs supported output formats
 */
export type ElevenLabsOutputFormat =
    | 'mp3_22050_32'
    | 'mp3_44100_32'
    | 'mp3_44100_64'
    | 'mp3_44100_96'
    | 'mp3_44100_128'
    | 'mp3_44100_192'
    | 'pcm_16000'
    | 'pcm_22050'
    | 'pcm_24000'
    | 'pcm_44100'
    | 'ulaw_8000';

/**
 * ElevenLabs model IDs
 */
export type ElevenLabsModel =
    | 'eleven_v3'
    | 'eleven_multilingual_v2'
    | 'eleven_monolingual_v1'
    | 'eleven_turbo_v2'
    | 'eleven_turbo_v2_5';

/**
 * Input for ElevenLabs TTS conversion
 */
export interface ElevenLabsConvertInput {
    /** Text to convert to speech */
    text: string;
    /** Voice ID to use */
    voiceId: string;
    /** Model to use (default: eleven_v3) */
    modelId?: ElevenLabsModel;
    /** Output format (default: mp3_44100_128) */
    outputFormat?: ElevenLabsOutputFormat;
    /** Voice settings override */
    voiceSettings?: ElevenLabsVoiceSettings;
}

/**
 * Alignment data from ElevenLabs (for accurate duration)
 */
export interface ElevenLabsAlignment {
    /** Characters in the input text */
    characters: string[];
    /** Start time of each character in seconds */
    characterStartTimesSeconds: number[];
    /** End time of each character in seconds */
    characterEndTimesSeconds: number[];
}

/**
 * Result from ElevenLabs TTS conversion
 */
export interface ElevenLabsConvertResult {
    /** Audio buffer */
    audio: Buffer;
    /** Duration in seconds (calculated from alignment) */
    durationSeconds: number;
    /** Alignment data for precise timing */
    alignment?: ElevenLabsAlignment;
}

/**
 * ElevenLabs Provider Interface
 */
export interface IElevenLabsProvider {
    /**
     * Convert text to speech with timestamps for duration accuracy
     */
    convertWithTimestamps(input: ElevenLabsConvertInput): Promise<ElevenLabsConvertResult>;

    /**
     * List available voices
     */
    listVoices(): Promise<Array<{ voiceId: string; name: string; labels?: Record<string, string> }>>;

    /**
     * Check if a voice ID is valid
     */
    isValidVoice(voiceId: string): Promise<boolean>;
}
