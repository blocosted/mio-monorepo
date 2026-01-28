/**
 * Voice Assignment Service Types
 *
 * Types for assigning voices to story characters based on their descriptions.
 */

import type { Emotion, Language, StoryScript, VoiceAge, VoiceGender } from '@mio/shared/types';

/**
 * Voice tone characteristic
 */
export const VoiceToneValues = ['warm', 'cold', 'mysterious', 'energetic', 'calm', 'authoritative', 'playful', 'gentle'] as const;
export type VoiceTone = (typeof VoiceToneValues)[number];
export const VoiceTone = {
  Warm: 'warm',
  Cold: 'cold',
  Mysterious: 'mysterious',
  Energetic: 'energetic',
  Calm: 'calm',
  Authoritative: 'authoritative',
  Playful: 'playful',
  Gentle: 'gentle'
} as const satisfies Record<string, VoiceTone>;

/**
 * Voice specialization roles
 */
export const VoiceSpecializationValues = ['narrator', 'child', 'elder', 'villain', 'hero', 'sidekick', 'animal', 'magical'] as const;
export type VoiceSpecialization = (typeof VoiceSpecializationValues)[number];
export const VoiceSpecialization = {
  Narrator: 'narrator',
  Child: 'child',
  Elder: 'elder',
  Villain: 'villain',
  Hero: 'hero',
  Sidekick: 'sidekick',
  Animal: 'animal',
  Magical: 'magical'
} as const satisfies Record<string, VoiceSpecialization>;

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
 * Enhanced voice profile with semantic characteristics
 */
export interface VoiceProfile {
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Voice name */
  name: string;
  /** Gender classification */
  gender: VoiceGender;
  /** Age range [min, max] in years */
  ageRange: [number, number];
  /** Primary tone characteristic */
  tone: VoiceTone;
  /** Secondary tone (optional) */
  secondaryTone?: VoiceTone;
  /** Language/accent */
  language?: string;
  /** Accent description */
  accent?: string;
  /** Emotions this voice handles well */
  emotionalRange: Emotion[];
  /** Character types this voice is suited for */
  specializations: VoiceSpecialization[];
  /** Description for matching */
  description?: string;
}

/**
 * Voice match score breakdown
 */
export interface VoiceMatchScore {
  /** Total match score (0-100) */
  total: number;
  /** Gender match score contribution */
  genderScore: number;
  /** Age match score contribution */
  ageScore: number;
  /** Tone match score contribution */
  toneScore: number;
  /** Specialization match score contribution */
  specializationScore: number;
  /** Language match score contribution */
  languageScore: number;
}

/**
 * Voice match result with scoring details
 */
export interface VoiceMatchResult {
  /** The matched voice profile */
  profile: VoiceProfile;
  /** Match score breakdown */
  score: VoiceMatchScore;
  /** Overall confidence level */
  confidence: 'high' | 'medium' | 'low';
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

