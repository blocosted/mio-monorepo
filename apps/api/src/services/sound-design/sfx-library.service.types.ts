/**
 * SFX Library Service Types
 *
 * Service for managing the persistent SFX library.
 */

import type { AudioIntensity, SfxEnvironment, SfxLibraryCategory } from '@mio/shared/types';

/**
 * Parameters for finding SFX in library
 */
export interface FindSfxParams {
  text: string;
  category?: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
}

/**
 * Parameters for storing SFX in library
 */
export interface StoreSfxParams {
  canonicalKey: string;
  category: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
  prompt: string;
  promptInfluence?: number;
  s3Url: string;
  durationSeconds: number;
  format: string;
  tags?: string[];
  storyUniverses?: string[];
}

/**
 * Stored SFX from library
 */
export interface StoredSfx {
  id: string;
  canonicalKey: string;
  category: SfxLibraryCategory;
  subcategory: string | null;
  environment: SfxEnvironment | null;
  intensity: AudioIntensity | null;
  prompt: string;
  promptInfluence: number | null;
  s3Url: string;
  durationSeconds: number;
  format: string;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * SFX lookup result
 */
export interface SfxLookupResult {
  sfx: StoredSfx | null;
  fromCache: boolean;
}

/**
 * SFX Library Service Interface
 */
export interface ISfxLibraryService {
  /**
   * Find SFX in library
   */
  findSfx(params: FindSfxParams): Promise<SfxLookupResult>;

  /**
   * Store new SFX in library
   */
  storeSfx(params: StoreSfxParams): Promise<StoredSfx>;

  /**
   * Increment SFX usage counter
   */
  incrementSfxUsage(id: string): Promise<void>;
}
