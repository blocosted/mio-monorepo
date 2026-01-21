/**
 * Voice Registry Service Types
 *
 * Type definitions for the voice registry service that manages
 * ElevenLabs voice data in the database to avoid repeated API calls.
 */

/**
 * Voice data as stored in the database
 */
export interface StoredVoice {
    id: string;
    voiceId: string;
    name: string;
    category?: string | null;
    labels?: Record<string, string> | null;
    description?: string | null;
    previewUrl?: string | null;
    lastSyncedAt: Date;
    createdAt: Date;
}

/**
 * Voice data from ElevenLabs API (simplified)
 */
export interface ApiVoice {
    voiceId: string;
    name: string;
    category?: string;
    labels?: Record<string, string>;
    description?: string;
    previewUrl?: string;
}

/**
 * Result from sync operation
 */
export interface SyncResult {
    added: number;
    updated: number;
    removed: number;
    total: number;
}

/**
 * Voice Registry Service Interface
 */
export interface IVoiceRegistryService {
    /**
     * Get all voices from the database (no API call)
     */
    getAllVoices(): Promise<StoredVoice[]>;

    /**
     * Get a voice by its ElevenLabs voice ID
     */
    getVoice(voiceId: string): Promise<StoredVoice | null>;

    /**
     * Check if a voice ID exists in the database (no API call)
     */
    isValidVoice(voiceId: string): Promise<boolean>;

    /**
     * Synchronize voices from ElevenLabs API to database
     * Should be called manually via CLI or on a schedule
     */
    syncFromApi(): Promise<SyncResult>;

    /**
     * Get the timestamp of the last sync
     */
    getLastSyncTime(): Promise<Date | null>;
}
