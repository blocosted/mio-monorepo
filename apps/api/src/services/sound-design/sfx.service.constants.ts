/**
 * Sound Effects Service Constants
 *
 * Configuration for ElevenLabs sound effects generation.
 */

import { SfxCategory } from '../../repositories/audio/audio-repository.types';

/**
 * Audio format configuration (FFmpeg compatible, same as TTS)
 */
export const SFX_AUDIO_FORMAT = {
    format: 'mp3' as const,
    sampleRate: 44100 as const,
    bitrate: 128 as const,
    channels: 2 as const,
};

/**
 * Default output format for ElevenLabs SFX API
 */
export const DEFAULT_SFX_OUTPUT_FORMAT = 'mp3_44100_128' as const;

/**
 * Default prompt influence (how closely to follow the prompt, 0-1)
 */
export const DEFAULT_PROMPT_INFLUENCE = 0.3;

/**
 * Rate limiting configuration for SFX API
 */
export const SFX_RATE_LIMIT_CONFIG = {
    /** Redis key prefix for rate limiting */
    keyPrefix: 'sfx:ratelimit:requests',
    /** Maximum requests per minute (ElevenLabs tier limit) */
    maxRequestsPerMinute: 20,
    /** Maximum wait time for rate limit slot (ms) */
    maxWaitMs: 30000,
    /** Initial backoff delay (ms) */
    initialBackoffMs: 500,
    /** Maximum backoff delay (ms) */
    maxBackoffMs: 5000,
    /** TTL for rate limit keys (seconds) */
    keyTtlSeconds: 120,
};

/**
 * Local concurrency configuration for SFX generation
 */
export const SFX_CONCURRENCY_CONFIG = {
    /** Maximum concurrent requests per instance */
    maxLocalConcurrency: 2,
};

/**
 * SFX duration limits (ElevenLabs API constraints)
 */
export const SFX_DURATION_LIMITS = {
    /** Minimum duration in seconds */
    min: 0.5,
    /** Maximum duration in seconds */
    max: 22,
};

/**
 * Recommended durations by category
 */
export const RECOMMENDED_DURATIONS: Record<SfxCategory, number> = {
    [SfxCategory.Ambient]: 10,      // Background sounds loop well at 10s
    [SfxCategory.Effects]: 3,       // Short sound effects
    [SfxCategory.Transitions]: 2,   // Quick transitions
    [SfxCategory.Foley]: 3,         // Foley sounds
    [SfxCategory.Creatures]: 5,     // Animal/creature sounds
    [SfxCategory.Music]: 15,        // Music snippets
};

/**
 * Prompt influence by category
 * Higher values = more literal interpretation of the prompt
 */
export const CATEGORY_PROMPT_INFLUENCE: Record<SfxCategory, number> = {
    [SfxCategory.Ambient]: 0.2,     // More creative for ambiance
    [SfxCategory.Effects]: 0.5,     // More precise for effects
    [SfxCategory.Transitions]: 0.4, // Balanced for transitions
    [SfxCategory.Foley]: 0.6,       // More precise for foley
    [SfxCategory.Creatures]: 0.3,   // Creative for creatures
    [SfxCategory.Music]: 0.2,       // Creative for music
};
