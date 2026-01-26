/**
 * Profiles Service Types
 *
 * Defines interfaces and types for the profiles service layer.
 * Uses only primitive/shared types (enum-like literals) from @mio/shared/types.
 */

import type { Gender, HeroGender, Language, NarratorVoice, StoryDuration } from '@mio/shared/types';

/**
 * Service-layer preferences model (service owns this interface)
 */
export interface ChildPreferences {
  favoriteThemes?: string[];
  avoidThemes?: string[];
  includeChildAsCharacter?: boolean;
  preferredHeroGender?: HeroGender;
  preferredStoryDuration?: StoryDuration;
  narratorVoicePreference?: NarratorVoice;
  language?: Language;
}

/**
 * Service-layer profile model (service owns this interface)
 */
export interface ChildProfile {
  id: string;
  firstName: string;
  age: number;
  gender: Gender;
  preferences: ChildPreferences;
  isTest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service-layer input for creation
 */
export interface CreateChildProfileInput {
  firstName: string;
  age: number;
  gender: Gender;
  preferences?: ChildPreferences;
  isTest?: boolean;
}

/**
 * Service-layer input for update
 */
export interface UpdateChildProfileInput {
  firstName?: string;
  age?: number;
  gender?: Gender;
  preferences?: ChildPreferences;
}

/**
 * Database row representation
 */
export interface ProfileRow {
  id: string;
  firstName: string;
  age: number;
  gender: Gender;
  preferences: ChildPreferences;
  isTest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Pagination Types
// =============================================================================

/**
 * Cursor pagination options for Profiles
 */
export interface ProfilePaginationOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Filter options for Profiles pagination
 */
export interface ProfileFilterOptions {
  gender?: Gender;
  search?: string;
  isTest?: boolean;
}

/**
 * Paginated result for Profiles
 */
export interface PaginatedProfilesResult {
  rows: ProfileRow[];
  nextCursor: string | null;
  hasMore: boolean;
}
