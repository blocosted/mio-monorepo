/**
 * Voice Selection Service Types
 *
 * Types for manual voice selection for narrator and characters.
 * Enables users to choose voices before voice generation.
 */

import type { Language, VoiceAge, VoiceGender } from '@mio/shared/types';

/**
 * Voice information for display
 */
export interface VoiceInfo {
  voiceId: string;
  name: string;
  previewUrl?: string | null;
  gender?: VoiceGender | null;
  age?: VoiceAge | null;
  language?: string | null;
  description?: string | null;
}

/**
 * Voice recommendation with match score
 */
export interface VoiceRecommendation {
  voiceId: string;
  name: string;
  previewUrl?: string | null;
  gender?: VoiceGender | null;
  age?: VoiceAge | null;
  language?: string | null;
  matchScore: number;
}

/**
 * Character with current voice and recommendations
 */
export interface CharacterWithVoiceRecommendations {
  characterName: string;
  voiceDescription: string;
  currentVoiceId?: string;
  currentVoice?: VoiceInfo;
  recommendedVoices: VoiceRecommendation[];
}

/**
 * Result of getting characters with recommendations
 */
export interface GetCharactersResult {
  characters: CharacterWithVoiceRecommendations[];
  storyLanguage: Language;
}

/**
 * Input for getting characters with voice recommendations
 */
export interface GetCharactersInput {
  storyId: string;
}

/**
 * Single voice assignment for a character
 */
export interface VoiceAssignmentEntry {
  characterName: string;
  voiceId: string;
}

/**
 * Input for updating voice assignments
 */
export interface UpdateVoiceAssignmentsInput {
  storyId: string;
  voiceAssignments: VoiceAssignmentEntry[];
}

/**
 * Result of updating voice assignments
 */
export interface UpdateVoiceAssignmentsResult {
  success: boolean;
  updatedCount: number;
  characters: Array<{
    characterName: string;
    voiceId: string;
    voiceName: string;
  }>;
}

/**
 * Options for getting recommended voices
 */
export interface GetRecommendedVoicesOptions {
  description: string;
  language: Language;
  limit?: number;
}
