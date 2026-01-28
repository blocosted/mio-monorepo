/**
 * TTS Service Constants
 *
 * Emotion-to-voice-settings mappings for ElevenLabs TTS generation.
 * Voice IDs are now managed dynamically from the database via VoiceRegistryService.
 */

import type { ElevenLabsVoiceSettings } from '@mio/shared/types';
import { Emotion, SpeechAct } from '@mio/shared/types';

/**
 * Audio tags for emotional expression (eleven_v3)
 *
 * These tags are prepended to text to guide emotional delivery.
 * @see https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
export const EMOTION_AUDIO_TAGS: Record<Emotion, string | null> = {
  [Emotion.Neutral]: null,
  [Emotion.Happy]: '[happy]',
  [Emotion.Sad]: '[sad]',
  [Emotion.Excited]: '[excited]',
  [Emotion.Scared]: '[scared]',
  [Emotion.Angry]: '[angry]',
  [Emotion.Surprised]: '[gasp]',
  [Emotion.Curious]: null, // No specific tag, use intonation via punctuation
  [Emotion.Calm]: '[softly]'
};

/**
 * Audio tags for speech act modifiers (eleven_v3)
 *
 * These tags modify how text is spoken, independent of or in addition to emotion.
 * Can be combined with emotion tags for nuanced delivery.
 *
 * @example
 * // Whispering while scared:
 * '[whispers] [scared] Be very quiet...'
 *
 * @see https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
export const SPEECH_ACT_AUDIO_TAGS: Record<SpeechAct, string | null> = {
  [SpeechAct.Normal]: null,
  [SpeechAct.Whisper]: '[whispers]',
  [SpeechAct.Shout]: null, // Use emphasis + speed, not a specific tag
  [SpeechAct.Laugh]: '[laughs]',
  [SpeechAct.Sigh]: '[sighs]',
  [SpeechAct.Cry]: '[crying]',
  [SpeechAct.Sing]: '[sings]',
  [SpeechAct.Sarcastic]: '[sarcastic]'
};

/**
 * Emotion to voice settings mapping
 *
 * These settings adjust the voice delivery based on emotion:
 * - stability: Creative(0)=expressive, Natural(0.5)=balanced, Robust(1)=stable
 *   NOTE: convertWithTimestamps only supports 0, 0.5, 1.0 (values are auto-normalized)
 * - similarityBoost: How closely to match the original voice
 * - style: Amplifies the voice's natural style (0-1)
 * - speed: 0.7 (slowest) to 1.2 (fastest), 1.0 default
 *
 * Primary emotional control should use EMOTION_AUDIO_TAGS with eleven_v3.
 * These settings provide secondary modulation.
 */
export const EMOTION_VOICE_SETTINGS: Record<Emotion, ElevenLabsVoiceSettings> = {
  [Emotion.Neutral]: {
    stability: 0.5, // Natural
    similarityBoost: 0.75,
    style: 0.0,
    speed: 1.0
  },
  [Emotion.Happy]: {
    stability: 0, // Creative - more expressive
    similarityBoost: 0.7,
    style: 0.5,
    speed: 1.05
  },
  [Emotion.Sad]: {
    stability: 0.5, // Natural - let the tag do the work
    similarityBoost: 0.8,
    style: 0.3,
    speed: 0.9 // Slower
  },
  [Emotion.Excited]: {
    stability: 0.25, // Low stability for expressiveness, but not 0 to prevent artifacts
    similarityBoost: 0.65,
    style: 0.6,
    speed: 1.08 // Slightly faster (was 1.1, reduced to avoid rushing)
  },
  [Emotion.Scared]: {
    stability: 0.25, // Low stability for varied delivery, but not 0 to prevent artifacts
    similarityBoost: 0.7,
    style: 0.4,
    speed: 1.05
  },
  [Emotion.Angry]: {
    stability: 0, // Creative - intense
    similarityBoost: 0.75,
    style: 0.7,
    speed: 1.0
  },
  [Emotion.Surprised]: {
    stability: 0, // Creative - spontaneous
    similarityBoost: 0.65,
    style: 0.5,
    speed: 1.08
  },
  [Emotion.Curious]: {
    stability: 0.5, // Natural
    similarityBoost: 0.75,
    style: 0.25,
    speed: 0.95
  },
  [Emotion.Calm]: {
    stability: 1, // Robust - very stable
    similarityBoost: 0.85,
    style: 0.1,
    speed: 0.9
  }
};

/**
 * Default voice settings (used when no emotion specified)
 */
export const DEFAULT_VOICE_SETTINGS: ElevenLabsVoiceSettings = EMOTION_VOICE_SETTINGS[Emotion.Neutral];

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  /** Redis key prefix for rate limiting */
  keyPrefix: 'tts:ratelimit:requests',
  /** Maximum requests per minute (ElevenLabs tier limit) */
  maxRequestsPerMinute: 50,
  /** Maximum wait time for rate limit slot (ms) */
  maxWaitMs: 30000,
  /** Initial backoff delay (ms) */
  initialBackoffMs: 500,
  /** Maximum backoff delay (ms) */
  maxBackoffMs: 5000,
  /** TTL for rate limit keys (seconds) */
  keyTtlSeconds: 120
};

/**
 * Local concurrency configuration
 */
export const CONCURRENCY_CONFIG = {
  /** Maximum concurrent requests per instance */
  maxLocalConcurrency: 3
};

/**
 * Audio format configuration (FFmpeg compatible)
 */
export const AUDIO_FORMAT = {
  format: 'mp3' as const,
  sampleRate: 44100 as const,
  bitrate: 128 as const,
  channels: 2 as const
};

/**
 * Default ElevenLabs model (v3 for better expressivity and audio tags)
 */
export const DEFAULT_TTS_MODEL = 'eleven_v3' as const;

/**
 * Default output format (FFmpeg compatible: 44.1kHz stereo)
 */
export const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128' as const;
