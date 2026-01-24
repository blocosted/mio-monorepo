/**
 * Ambiance Library Service Types
 *
 * Service for managing the persistent Ambiance library.
 */

import type { AmbianceEnvironment, AudioMood, TimeOfDay, WeatherCondition } from '@mio/shared/types';

/**
 * Parameters for finding Ambiance in library
 */
export interface FindAmbianceParams {
  description: string;
  environment?: AmbianceEnvironment;
  subEnvironment?: string;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  mood?: AudioMood;
}

/**
 * Parameters for storing Ambiance in library
 */
export interface StoreAmbianceParams {
  canonicalKey: string;
  environment: AmbianceEnvironment;
  subEnvironment?: string;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  mood?: AudioMood;
  prompt: string;
  promptInfluence?: number;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags?: string[];
  storyUniverses?: string[];
}

/**
 * Stored Ambiance from library
 */
export interface StoredAmbiance {
  id: string;
  canonicalKey: string;
  environment: AmbianceEnvironment;
  subEnvironment: string | null;
  timeOfDay: TimeOfDay | null;
  weather: WeatherCondition | null;
  mood: AudioMood | null;
  prompt: string;
  promptInfluence: number | null;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Ambiance lookup result
 */
export interface AmbianceLookupResult {
  ambiance: StoredAmbiance | null;
  fromCache: boolean;
}

/**
 * Ambiance Library Service Interface
 */
export interface IAmbianceLibraryService {
  /**
   * Find Ambiance in library
   */
  findAmbiance(params: FindAmbianceParams): Promise<AmbianceLookupResult>;

  /**
   * Store new Ambiance in library
   */
  storeAmbiance(params: StoreAmbianceParams): Promise<StoredAmbiance>;

  /**
   * Increment Ambiance usage counter
   */
  incrementAmbianceUsage(id: string): Promise<void>;
}
