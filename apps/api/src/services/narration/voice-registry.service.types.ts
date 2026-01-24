/**
 * Voice Registry Service Types
 *
 * Type definitions for the voice registry service that manages
 * ElevenLabs voice data in the database to avoid repeated API calls.
 */

import type { VoiceAge, VoiceGender, VoiceUseCase } from '@mio/shared/types';

/**
 * Voice data as stored in the database
 */
export interface StoredVoice {
  id: string;
  voiceId: string;
  name: string;

  // Typed columns
  gender?: VoiceGender | null;
  age?: VoiceAge | null;
  accent?: string | null;
  language?: string | null;
  locale?: string | null;
  useCase?: VoiceUseCase | null;

  // Metadata
  category?: string | null;
  description?: string | null;
  previewUrl?: string | null;
  isHighQuality?: boolean | null;

  // Legacy (for migration)
  labels?: Record<string, string> | null;

  // Timestamps
  lastSyncedAt: Date;
  createdAt: Date;
}

/**
 * Voice data from ElevenLabs API (with parsed labels)
 */
export interface ApiVoice {
  voiceId: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  previewUrl?: string;
  highQualityBaseModelIds?: string[];
}

/**
 * Parsed voice data ready for database insert
 */
export interface ParsedVoice {
  voiceId: string;
  name: string;

  // Typed columns (parsed from labels)
  gender?: VoiceGender | null;
  age?: VoiceAge | null;
  accent?: string | null;
  language?: string | null;
  locale?: string | null;
  useCase?: VoiceUseCase | null;

  // Metadata
  category?: string;
  description?: string;
  previewUrl?: string;
  isHighQuality?: boolean;

  // Legacy (original labels)
  labels?: Record<string, string>;
}

/**
 * Voice filter options
 */
export interface VoiceFilterOptions {
  gender?: VoiceGender;
  age?: VoiceAge;
  language?: string;
  useCase?: VoiceUseCase;
  isHighQuality?: boolean;
}

/**
 * Result from sync operation
 */
export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  total: number;
  filtered?: number;
}

/**
 * Options for voice sync
 */
export interface SyncOptions {
  /** Page size for API pagination (default: 100) */
  pageSize?: number;
  /** Maximum pages to fetch (default: unlimited) */
  maxPages?: number;
  /** Filter by use case (default: narrative_story) */
  filterByUseCase?: VoiceUseCase;
  /** Languages to sync (default: ['fr', 'en']) */
  languages?: string[];
  /** Use shared library instead of user voices (default: true) */
  useSharedLibrary?: boolean;
  /** Include detailed logging */
  verbose?: boolean;
}

