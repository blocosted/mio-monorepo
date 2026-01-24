/**
 * Audio Cache Service Types
 */

/**
 * Cached audio metadata
 */
export interface CachedAudio {
  /** Storage URL of the audio file */
  url: string;
  /** Duration in milliseconds */
  duration: number;
  /** Voice ID used for generation */
  voiceId: string;
  /** Timestamp when cached */
  cachedAt: number;
  /** Optional audio metadata (format, bitrate, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Voice settings for cache key (normalized for deterministic hashing)
 */
export interface CacheVoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
}

/**
 * Audio cache key parameters (all params that affect TTS output)
 */
export interface AudioCacheKeyParams {
  /** Text prompt used for generation */
  text: string;
  /** Voice ID */
  voiceId: string;
  /** Model ID (e.g., 'eleven_v3') */
  modelId: string;
  /** Output format (e.g., 'mp3_44100_128') */
  outputFormat: string;
  /** Voice settings affecting audio output */
  voiceSettings?: CacheVoiceSettings;
}

/**
 * Legacy cache key params (for backward compatibility during migration)
 * @deprecated Use AudioCacheKeyParams instead
 */
export interface LegacyAudioCacheKeyParams {
  /** Text prompt used for generation */
  prompt: string;
  /** Voice ID */
  voiceId: string;
}

