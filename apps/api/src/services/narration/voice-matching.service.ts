/**
 * Voice Matching Service
 *
 * Provides semantic voice selection using scored matching instead of simple keywords.
 * Matches character descriptions to voice profiles based on:
 * - Gender
 * - Age
 * - Tone
 * - Specializations
 * - Language
 */

import 'reflect-metadata';

import { injectable } from 'inversify';

import { type Language, VoiceAge, VoiceGender } from '@mio/shared/types';

import type { VoiceMatchResult, VoiceMatchScore, VoiceProfile } from './voice-assignment.service.types';
import { VoiceSpecialization, VoiceTone } from './voice-assignment.service.types';
import { AbstractService } from '../service.abstract';

/**
 * Score weights for matching criteria
 */
const SCORE_WEIGHTS = {
  gender: 30,
  age: 25,
  tone: 20,
  specialization: 15,
  language: 10
} as const;

/**
 * Gender detection keywords (English and French)
 */
const GENDER_KEYWORDS: Record<VoiceGender, string[]> = {
  female: [
    'female', 'woman', 'girl', 'feminine', 'mother', 'princess', 'queen',
    'grandmother', 'sister', 'daughter', 'aunt', 'lady', 'miss', 'mrs',
    'femme', 'fille', 'maman', 'mere', 'princesse', 'reine', 'grand-mere',
    'soeur', 'tante', 'madame', 'mademoiselle', 'she', 'her', 'elle'
  ],
  male: [
    'male', 'man', 'boy', 'masculine', 'father', 'prince', 'king',
    'grandfather', 'brother', 'son', 'uncle', 'gentleman', 'mister', 'mr',
    'homme', 'garcon', 'papa', 'pere', 'prince', 'roi', 'grand-pere',
    'frere', 'oncle', 'monsieur', 'he', 'him', 'il', 'lui'
  ],
  neutral: ['creature', 'being', 'spirit', 'entity', 'robot', 'ai']
};

/**
 * Age detection patterns with estimated ranges
 */
const AGE_PATTERNS: Array<{ keywords: string[]; ageRange: [number, number] }> = [
  { keywords: ['baby', 'infant', 'toddler', 'bebe'], ageRange: [0, 3] },
  { keywords: ['child', 'kid', 'little', 'young', 'enfant', 'petit', 'petite'], ageRange: [4, 12] },
  { keywords: ['teenager', 'teen', 'adolescent', 'youth', 'ado'], ageRange: [13, 19] },
  { keywords: ['young adult', 'young man', 'young woman'], ageRange: [20, 30] },
  { keywords: ['adult', 'adulte'], ageRange: [25, 50] },
  { keywords: ['middle-aged', 'mature'], ageRange: [40, 60] },
  { keywords: ['old', 'elder', 'elderly', 'ancient', 'wise', 'aged', 'vieux', 'vieille', 'ancien', 'sage'], ageRange: [60, 100] },
  { keywords: ['grandfather', 'grandmother', 'grand-pere', 'grand-mere'], ageRange: [55, 90] }
];

/**
 * Tone detection keywords
 */
const TONE_KEYWORDS: Record<VoiceTone, string[]> = {
  warm: ['warm', 'kind', 'loving', 'caring', 'gentle', 'soft', 'tender', 'chaleureux', 'doux'],
  cold: ['cold', 'stern', 'harsh', 'icy', 'distant', 'froid', 'severe'],
  mysterious: ['mysterious', 'enigmatic', 'dark', 'shadowy', 'cryptic', 'mysterieux', 'sombre'],
  energetic: ['energetic', 'excited', 'lively', 'dynamic', 'enthusiastic', 'energique', 'vif'],
  calm: ['calm', 'serene', 'peaceful', 'tranquil', 'soothing', 'calme', 'paisible'],
  authoritative: ['authoritative', 'commanding', 'powerful', 'strong', 'leader', 'autoritaire', 'puissant'],
  playful: ['playful', 'mischievous', 'fun', 'silly', 'joyful', 'joueur', 'espiegle'],
  gentle: ['gentle', 'sweet', 'delicate', 'soft-spoken', 'doux', 'delicat']
};

/**
 * Specialization detection keywords
 */
const SPECIALIZATION_KEYWORDS: Record<VoiceSpecialization, string[]> = {
  narrator: ['narrator', 'storyteller', 'narration', 'narrateur', 'conteur'],
  child: ['child', 'kid', 'boy', 'girl', 'enfant', 'garcon', 'fille'],
  elder: ['elder', 'old', 'wise', 'ancient', 'grandfather', 'grandmother', 'sage', 'vieux'],
  villain: ['villain', 'evil', 'wicked', 'dark', 'sinister', 'antagonist', 'mechant', 'mauvais'],
  hero: ['hero', 'brave', 'noble', 'courageous', 'heroic', 'heros', 'brave', 'noble'],
  sidekick: ['sidekick', 'companion', 'friend', 'helper', 'assistant', 'ami', 'compagnon'],
  animal: ['animal', 'creature', 'beast', 'pet', 'cat', 'dog', 'bird', 'animal', 'bete'],
  magical: ['magical', 'fairy', 'wizard', 'witch', 'enchanted', 'mystical', 'magique', 'fee', 'sorcier']
};

/**
 * Voice Matching Service
 *
 * Provides scored matching for voice selection based on character descriptions.
 */
@injectable()
export class VoiceMatchingService extends AbstractService {
  /**
   * Find the best matching voice profile for a character description
   */
  findBestMatch(description: string, availableProfiles: VoiceProfile[], preferredLanguage?: Language): VoiceMatchResult | null {
    if (availableProfiles.length === 0) {
      return null;
    }

    const lowerDesc = description.toLowerCase();

    // Score each profile
    const scoredProfiles = availableProfiles.map((profile) => ({
      profile,
      score: this.scoreMatch(lowerDesc, profile, preferredLanguage)
    }));

    // Sort by total score descending
    scoredProfiles.sort((a, b) => b.score.total - a.score.total);

    const best = scoredProfiles[0];
    if (!best) {
      return null;
    }

    // Determine confidence based on score
    const confidence = this.determineConfidence(best.score.total);

    return {
      profile: best.profile,
      score: best.score,
      confidence
    };
  }

  /**
   * Find top N matching voice profiles
   */
  findTopMatches(description: string, availableProfiles: VoiceProfile[], count: number, preferredLanguage?: Language): VoiceMatchResult[] {
    if (availableProfiles.length === 0) {
      return [];
    }

    const lowerDesc = description.toLowerCase();

    const scoredProfiles = availableProfiles.map((profile) => ({
      profile,
      score: this.scoreMatch(lowerDesc, profile, preferredLanguage)
    }));

    scoredProfiles.sort((a, b) => b.score.total - a.score.total);

    return scoredProfiles.slice(0, count).map((sp) => ({
      profile: sp.profile,
      score: sp.score,
      confidence: this.determineConfidence(sp.score.total)
    }));
  }

  /**
   * Score how well a profile matches a description
   */
  scoreMatch(description: string, profile: VoiceProfile, preferredLanguage?: Language): VoiceMatchScore {
    const genderScore = this.scoreGender(description, profile);
    const ageScore = this.scoreAge(description, profile);
    const toneScore = this.scoreTone(description, profile);
    const specializationScore = this.scoreSpecialization(description, profile);
    const languageScore = this.scoreLanguage(profile, preferredLanguage);

    const total = genderScore + ageScore + toneScore + specializationScore + languageScore;

    return {
      total,
      genderScore,
      ageScore,
      toneScore,
      specializationScore,
      languageScore
    };
  }

  /**
   * Score gender match
   */
  private scoreGender(description: string, profile: VoiceProfile): number {
    const detectedGender = this.detectGender(description);

    if (!detectedGender) {
      // No gender preference detected - give partial score
      return SCORE_WEIGHTS.gender * 0.5;
    }

    if (profile.gender === detectedGender) {
      return SCORE_WEIGHTS.gender;
    }

    // Neutral voice can match any gender
    if (profile.gender === VoiceGender.Neutral) {
      return SCORE_WEIGHTS.gender * 0.7;
    }

    return 0;
  }

  /**
   * Score age match
   */
  private scoreAge(description: string, profile: VoiceProfile): number {
    const detectedAgeRange = this.detectAgeRange(description);

    if (!detectedAgeRange) {
      // No age preference detected - give partial score
      return SCORE_WEIGHTS.age * 0.5;
    }

    const [descMin, descMax] = detectedAgeRange;
    const [profMin, profMax] = profile.ageRange;

    // Calculate overlap between ranges
    const overlapStart = Math.max(descMin, profMin);
    const overlapEnd = Math.min(descMax, profMax);

    if (overlapStart <= overlapEnd) {
      // Ranges overlap
      const overlapSize = overlapEnd - overlapStart;
      const descSize = descMax - descMin;
      const overlapRatio = descSize > 0 ? overlapSize / descSize : 1;
      return SCORE_WEIGHTS.age * Math.min(1, overlapRatio + 0.3);
    }

    // No overlap - calculate proximity penalty
    const distance = Math.min(Math.abs(descMin - profMax), Math.abs(descMax - profMin));
    const proximityScore = Math.max(0, 1 - distance / 20);
    return SCORE_WEIGHTS.age * proximityScore * 0.5;
  }

  /**
   * Score tone match
   */
  private scoreTone(description: string, profile: VoiceProfile): number {
    const detectedTones = this.detectTones(description);

    if (detectedTones.length === 0) {
      // No tone preference - give partial score
      return SCORE_WEIGHTS.tone * 0.5;
    }

    // Check primary tone match
    if (detectedTones.includes(profile.tone)) {
      return SCORE_WEIGHTS.tone;
    }

    // Check secondary tone match
    if (profile.secondaryTone && detectedTones.includes(profile.secondaryTone)) {
      return SCORE_WEIGHTS.tone * 0.7;
    }

    return 0;
  }

  /**
   * Score specialization match
   */
  private scoreSpecialization(description: string, profile: VoiceProfile): number {
    const detectedSpecs = this.detectSpecializations(description);

    if (detectedSpecs.length === 0) {
      return SCORE_WEIGHTS.specialization * 0.5;
    }

    // Count matching specializations
    const matchCount = detectedSpecs.filter((spec) => profile.specializations.includes(spec)).length;

    if (matchCount === 0) {
      return 0;
    }

    // Full score for any match, bonus for multiple
    return SCORE_WEIGHTS.specialization * Math.min(1, 0.7 + matchCount * 0.15);
  }

  /**
   * Score language match
   */
  private scoreLanguage(profile: VoiceProfile, preferredLanguage?: Language): number {
    if (!preferredLanguage || !profile.language) {
      return SCORE_WEIGHTS.language * 0.5;
    }

    if (profile.language.toLowerCase().includes(preferredLanguage.toLowerCase())) {
      return SCORE_WEIGHTS.language;
    }

    return 0;
  }

  /**
   * Detect gender from description
   *
   * Returns the gender with more keyword matches, or null if tied/none.
   * Uses word boundary matching to avoid substring false positives.
   */
  private detectGender(description: string): VoiceGender | null {
    const scores: Record<VoiceGender, number> = {
      female: 0,
      male: 0,
      neutral: 0
    };

    for (const [gender, keywords] of Object.entries(GENDER_KEYWORDS)) {
      for (const kw of keywords) {
        // Use word boundary regex to match whole words only
        const regex = new RegExp(`\\b${this.escapeRegex(kw)}\\b`, 'i');
        if (regex.test(description)) {
          scores[gender as VoiceGender]++;
        }
      }
    }

    const maxScore = Math.max(scores.female, scores.male, scores.neutral);
    if (maxScore === 0) {
      return null;
    }

    // Check if there's a clear winner
    const winners = Object.entries(scores).filter(([_, score]) => score === maxScore);
    if (winners.length === 1) {
      return winners[0]![0] as VoiceGender;
    }

    // Prefer male/female over neutral in case of tie
    if (scores.female === maxScore && scores.male !== maxScore) {
      return VoiceGender.Female;
    }
    if (scores.male === maxScore && scores.female !== maxScore) {
      return VoiceGender.Male;
    }

    return null; // Tie between male and female
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Detect age range from description
   */
  private detectAgeRange(description: string): [number, number] | null {
    for (const pattern of AGE_PATTERNS) {
      if (pattern.keywords.some((kw) => description.includes(kw))) {
        return pattern.ageRange;
      }
    }
    return null;
  }

  /**
   * Detect tones from description
   */
  private detectTones(description: string): VoiceTone[] {
    const detected: VoiceTone[] = [];

    for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
      if (keywords.some((kw) => description.includes(kw))) {
        detected.push(tone as VoiceTone);
      }
    }

    return detected;
  }

  /**
   * Detect specializations from description
   */
  private detectSpecializations(description: string): VoiceSpecialization[] {
    const detected: VoiceSpecialization[] = [];

    for (const [spec, keywords] of Object.entries(SPECIALIZATION_KEYWORDS)) {
      if (keywords.some((kw) => description.includes(kw))) {
        detected.push(spec as VoiceSpecialization);
      }
    }

    return detected;
  }

  /**
   * Determine confidence level from score
   */
  private determineConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) {
      return 'high';
    }
    if (score >= 45) {
      return 'medium';
    }
    return 'low';
  }
}
