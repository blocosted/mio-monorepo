/**
 * TTS Service Types
 *
 * Type definitions for the Text-to-Speech service.
 * Designed for FFmpeg compatibility with precise duration tracking.
 */

import type { ElevenLabsVoiceSettings, Emotion } from '@mio/shared/types';

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
 * Segment type for TTS text extraction
 * - 'narration': Full text is spoken (no extraction)
 * - 'dialogue': Only quoted text is extracted for TTS
 */
export type TTSSegmentType = 'narration' | 'dialogue';

/**
 * Input for single speech generation
 */
export interface GenerateSpeechInput {
  /** Text to convert to speech */
  text: string;
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Segment type for text extraction (defaults to 'narration') */
  segmentType?: TTSSegmentType;
  /** Emotion affecting delivery */
  emotion?: Emotion;
  /** Voice settings override */
  voiceSettings?: ElevenLabsVoiceSettings;
  /** Character name (for logging/debugging) */
  characterName?: string;
  /**
   * Text that comes before this segment (for prosodic continuity)
   * Helps ElevenLabs maintain natural flow between segments.
   * Only the last ~200 characters are used.
   */
  previousText?: string;
  /**
   * Text that comes after this segment (for prosodic anticipation)
   * Helps ElevenLabs prepare for transitions.
   * Only the first ~200 characters are used.
   */
  nextText?: string;
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
  /** Segment type for text extraction */
  segmentType?: TTSSegmentType;
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
export type CharacterArchetype = 'narrator' | 'childHero' | 'wiseCharacter' | 'villain' | 'comedic' | 'parent' | 'friend' | 'animal' | 'magical';

