/**
 * Audio Repository Types
 *
 * Type definitions for audio API wrappers (ElevenLabs TTS and Sound Effects).
 */

import type { ElevenLabsVoiceSettings } from '@mio/shared/types';

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
export type ElevenLabsModel = 'eleven_v3' | 'eleven_multilingual_v2' | 'eleven_monolingual_v1' | 'eleven_turbo_v2' | 'eleven_turbo_v2_5';

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
  Music: 'music'
} as const;

export type SfxCategory = (typeof SfxCategory)[keyof typeof SfxCategory];

// ===== Voices Repository Types (ElevenLabs TTS) =====

/**
 * Input for ElevenLabs TTS conversion
 */
export interface VoicesConvertInput {
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
export interface VoicesAlignment {
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
export interface VoicesConvertResult {
  /** Audio buffer */
  audio: Buffer;
  /** Duration in seconds (calculated from alignment) */
  durationSeconds: number;
  /** Alignment data for precise timing */
  alignment?: VoicesAlignment;
}

/**
 * Voices Repository Interface (ElevenLabs TTS)
 */
export interface IAudioRepository {
  /**
   * Convert text to speech with timestamps for duration accuracy
   */
  convertTextToSpeech(input: VoicesConvertInput): Promise<VoicesConvertResult>;
  /**
   * Create a sound effect audio
   */
  createSoundEffect(input: SoundEffectsConvertInput): Promise<SoundEffectsConvertResult>;
  /**
   * List available voices
   */
  listVoices(): Promise<Array<{ voiceId: string; name: string; labels?: Record<string, string> }>>;

  /**
   * Check if a voice ID is valid
   */
  isValidVoice(voiceId: string): Promise<boolean>;
}

// ===== Sound Effects Repository Types =====

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
 * Sound Effects Repository Interface
 */
export interface ISoundEffectsRepository {
  /**
   * Convert text description to sound effect audio
   */
  createSoundEffect(input: SoundEffectsConvertInput): Promise<SoundEffectsConvertResult>;
}
