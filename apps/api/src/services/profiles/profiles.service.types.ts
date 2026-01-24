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
 * Profiles Service Interface
 */
export interface IProfilesService {
  /**
   * Create a new child profile
   */
  create(input: CreateChildProfileInput): Promise<ChildProfile>;

  /**
   * Get a profile by ID
   */
  getById(id: string): Promise<ChildProfile | null>;

  /**
   * Get all profiles
   */
  getAll(): Promise<ChildProfile[]>;

  /**
   * Update a profile
   */
  update(id: string, input: UpdateChildProfileInput): Promise<ChildProfile | null>;

  /**
   * Delete a profile
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Profiles Store Interface (data access layer)
 */
export interface IProfilesStore {
  /**
   * Insert a new profile
   */
  insert(input: CreateChildProfileInput): Promise<ProfileRow>;

  /**
   * Find a profile by ID
   */
  findById(id: string): Promise<ProfileRow | null>;

  /**
   * Find all profiles
   */
  findAll(): Promise<ProfileRow[]>;

  /**
   * Update a profile
   */
  update(id: string, input: UpdateChildProfileInput): Promise<ProfileRow | null>;

  /**
   * Delete a profile
   */
  delete(id: string): Promise<boolean>;
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
  createdAt: Date;
  updatedAt: Date;
}
