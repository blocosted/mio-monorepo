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
 * Audio cache key parameters
 */
export interface AudioCacheKeyParams {
    /** Text prompt used for generation */
    prompt: string;
    /** Voice ID */
    voiceId: string;
}

/**
 * Audio Cache Service Interface
 */
export interface IAudioCacheService {
    /**
     * Get cached audio by prompt and voice
     * @param params - Cache key parameters
     * @returns Cached audio or null if not found
     */
    get(params: AudioCacheKeyParams): Promise<CachedAudio | null>;

    /**
     * Cache audio metadata
     * @param params - Cache key parameters
     * @param audio - Audio metadata to cache (cachedAt will be added automatically)
     */
    set(params: AudioCacheKeyParams, audio: Omit<CachedAudio, 'cachedAt'>): Promise<void>;

    /**
     * Check if audio is cached
     * @param params - Cache key parameters
     * @returns True if cached
     */
    exists(params: AudioCacheKeyParams): Promise<boolean>;

    /**
     * Increment usage counter for a cached audio
     * @param params - Cache key parameters
     * @returns New usage count
     */
    incrementUsage(params: AudioCacheKeyParams): Promise<number>;

    /**
     * Get usage count for a cached audio
     * @param params - Cache key parameters
     * @returns Usage count or 0 if not tracked
     */
    getUsageCount(params: AudioCacheKeyParams): Promise<number>;
}
