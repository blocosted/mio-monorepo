/**
 * Voice Assignment Service Types
 *
 * Types for assigning voices to story characters based on their descriptions.
 */

import type { Language, StoryScript } from '@mio/shared/types';

/**
 * Voice data for selection (subset of StoredVoice)
 */
export interface VoiceCandidate {
  voiceId: string;
  name: string;
  gender?: string | null;
  age?: string | null;
  language?: string | null;
}

/**
 * Result of selecting a voice for a character
 */
export interface VoiceSelection {
  voiceId: string;
  matchedGender: string | null;
  matchedAge: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Input for assigning voices to all characters in a script
 */
export interface VoiceAssignmentInput {
  /** The story script with characters needing voice assignment */
  script: StoryScript;
  /** Preferred language for voice selection */
  language: Language;
}

/**
 * Result of voice assignment for all characters
 */
export interface VoiceAssignmentResult {
  /** Updated script with voiceIds assigned to characters */
  script: StoryScript;
  /** Voice selections for each character */
  assignments: CharacterVoiceAssignment[];
}

/**
 * Voice assignment for a single character
 */
export interface CharacterVoiceAssignment {
  characterName: string;
  voiceDescription: string;
  selection: VoiceSelection;
}

