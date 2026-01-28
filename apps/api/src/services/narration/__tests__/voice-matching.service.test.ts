/**
 * Voice Matching Service Tests
 *
 * Tests for semantic voice matching based on character descriptions.
 */

import { describe, expect, test } from 'bun:test';

import { Emotion, VoiceAge, VoiceGender } from '@mio/shared/types';

import type { VoiceProfile } from '../voice-assignment.service.types';
import { VoiceSpecialization, VoiceTone } from '../voice-assignment.service.types';
import { VoiceMatchingService } from '../voice-matching.service';

describe('VoiceMatchingService', () => {
  const service = new VoiceMatchingService();

  // Sample voice profiles for testing
  const profiles: VoiceProfile[] = [
    {
      voiceId: 'voice-1',
      name: 'Sophia',
      gender: VoiceGender.Female,
      ageRange: [25, 35],
      tone: VoiceTone.Warm,
      secondaryTone: VoiceTone.Gentle,
      language: 'en-US',
      emotionalRange: [Emotion.Happy, Emotion.Calm, Emotion.Sad],
      specializations: [VoiceSpecialization.Narrator, VoiceSpecialization.Hero]
    },
    {
      voiceId: 'voice-2',
      name: 'Elder Marcus',
      gender: VoiceGender.Male,
      ageRange: [60, 80],
      tone: VoiceTone.Authoritative,
      secondaryTone: VoiceTone.Calm,
      language: 'en-US',
      emotionalRange: [Emotion.Calm, Emotion.Neutral],
      specializations: [VoiceSpecialization.Elder, VoiceSpecialization.Narrator]
    },
    {
      voiceId: 'voice-3',
      name: 'Little Pip',
      gender: VoiceGender.Neutral,
      ageRange: [6, 10],
      tone: VoiceTone.Playful,
      secondaryTone: VoiceTone.Energetic,
      language: 'en-US',
      emotionalRange: [Emotion.Happy, Emotion.Excited, Emotion.Curious],
      specializations: [VoiceSpecialization.Child, VoiceSpecialization.Sidekick]
    },
    {
      voiceId: 'voice-4',
      name: 'Dark Sorcerer',
      gender: VoiceGender.Male,
      ageRange: [40, 60],
      tone: VoiceTone.Mysterious,
      secondaryTone: VoiceTone.Cold,
      language: 'en-US',
      emotionalRange: [Emotion.Angry, Emotion.Neutral],
      specializations: [VoiceSpecialization.Villain, VoiceSpecialization.Magical]
    },
    {
      voiceId: 'voice-5',
      name: 'Marie',
      gender: VoiceGender.Female,
      ageRange: [30, 45],
      tone: VoiceTone.Warm,
      language: 'fr-FR',
      emotionalRange: [Emotion.Happy, Emotion.Calm],
      specializations: [VoiceSpecialization.Narrator]
    }
  ];

  describe('findBestMatch', () => {
    test('matches female character correctly', () => {
      const result = service.findBestMatch('A kind young woman with a warm voice', profiles);

      expect(result).not.toBeNull();
      expect(result?.profile.voiceId).toBe('voice-1'); // Sophia
      expect(result?.score.genderScore).toBe(30); // Full gender score
      expect(result?.score.toneScore).toBeGreaterThan(0); // Should match warm tone
    });

    test('matches elderly male character', () => {
      // Include male gender keyword to ensure gender match
      const result = service.findBestMatch('An old wise man, grandfather figure with authoritative commanding voice', profiles);

      expect(result).not.toBeNull();
      expect(result?.profile.voiceId).toBe('voice-2'); // Elder Marcus
      expect(result?.score.ageScore).toBeGreaterThan(0);
      expect(result?.score.genderScore).toBe(30); // Male gender match
      expect(result?.score.specializationScore).toBeGreaterThan(0); // Elder specialization
    });

    test('matches child character', () => {
      const result = service.findBestMatch('A playful young child, energetic and fun', profiles);

      expect(result).not.toBeNull();
      expect(result?.profile.voiceId).toBe('voice-3'); // Little Pip
      expect(result?.score.toneScore).toBeGreaterThan(0); // Playful tone
    });

    test('matches villain character', () => {
      const result = service.findBestMatch('A mysterious evil sorcerer with a dark presence', profiles);

      expect(result).not.toBeNull();
      expect(result?.profile.voiceId).toBe('voice-4'); // Dark Sorcerer
      expect(result?.score.toneScore).toBeGreaterThan(0); // Mysterious tone
      expect(result?.score.specializationScore).toBeGreaterThan(0); // Villain + Magical
    });

    test('prefers language match', () => {
      const result = service.findBestMatch('Une femme douce et chaleureuse', profiles, 'fr');

      expect(result).not.toBeNull();
      expect(result?.profile.voiceId).toBe('voice-5'); // Marie (French)
      expect(result?.score.languageScore).toBe(10); // Full language score
    });

    test('returns null for empty profiles', () => {
      const result = service.findBestMatch('Any character', []);
      expect(result).toBeNull();
    });
  });

  describe('findTopMatches', () => {
    test('returns top N matches sorted by score', () => {
      const results = service.findTopMatches('A warm narrator voice', profiles, 3);

      expect(results.length).toBe(3);
      // Scores should be in descending order
      expect(results[0]!.score.total).toBeGreaterThanOrEqual(results[1]!.score.total);
      expect(results[1]!.score.total).toBeGreaterThanOrEqual(results[2]!.score.total);
    });

    test('limits results to requested count', () => {
      const results = service.findTopMatches('Any character', profiles, 2);
      expect(results.length).toBe(2);
    });
  });

  describe('scoreMatch', () => {
    test('gives full gender score for exact match', () => {
      const femaleProfile = profiles[0]!; // Sophia
      const score = service.scoreMatch('a woman character', femaleProfile);

      expect(score.genderScore).toBe(30); // Full weight
    });

    test('gives partial gender score for neutral voice', () => {
      const neutralProfile = profiles[2]!; // Little Pip (neutral)
      const score = service.scoreMatch('a woman character', neutralProfile);

      expect(score.genderScore).toBe(21); // 30 * 0.7
    });

    test('gives zero gender score for mismatch', () => {
      const maleProfile = profiles[1]!; // Elder Marcus
      const score = service.scoreMatch('a woman character', maleProfile);

      expect(score.genderScore).toBe(0);
    });

    test('calculates age overlap correctly', () => {
      const elderProfile = profiles[1]!; // Elder Marcus (60-80)
      const score = service.scoreMatch('an old grandfather', elderProfile);

      // Should have good overlap with "old" detection (60-100)
      expect(score.ageScore).toBeGreaterThan(15);
    });

    test('gives partial score when no age detected', () => {
      const profile = profiles[0]!; // Sophia
      const score = service.scoreMatch('a character', profile);

      expect(score.ageScore).toBe(12.5); // 25 * 0.5
    });

    test('matches multiple tones', () => {
      const warmProfile = profiles[0]!; // Sophia (warm, gentle)
      const score = service.scoreMatch('a warm gentle voice', warmProfile);

      expect(score.toneScore).toBe(20); // Full score for primary tone match
    });

    test('gives secondary tone match score', () => {
      // Use a profile where secondary tone is distinct from primary
      // Elder Marcus has authoritative (primary) and calm (secondary)
      const profile = profiles[1]!; // Elder Marcus
      const score = service.scoreMatch('a calm soothing voice', profile);

      expect(score.toneScore).toBe(14); // 20 * 0.7 for secondary match
    });

    test('accumulates specialization matches', () => {
      const villainProfile = profiles[3]!; // Dark Sorcerer (villain, magical)
      const score = service.scoreMatch('an evil magical wizard', villainProfile);

      // Should match both villain and magical
      expect(score.specializationScore).toBeGreaterThan(10);
    });
  });

  describe('confidence levels', () => {
    test('returns high confidence for strong matches', () => {
      const result = service.findBestMatch('A warm young woman narrator', profiles);

      expect(result?.confidence).toBe('high');
    });

    test('returns medium confidence for partial matches', () => {
      const result = service.findBestMatch('a voice', profiles);

      expect(result?.confidence).toBe('medium'); // Partial scores from no detection
    });

    test('returns low confidence for weak matches', () => {
      // Create a profile that doesn't match well
      const weakProfiles: VoiceProfile[] = [
        {
          voiceId: 'voice-weak',
          name: 'Mismatch',
          gender: VoiceGender.Male,
          ageRange: [20, 30],
          tone: VoiceTone.Cold,
          emotionalRange: [],
          specializations: []
        }
      ];

      const result = service.findBestMatch('a warm elderly woman hero', weakProfiles);

      // Gender mismatch (0), age mismatch, tone mismatch, no specialization match
      expect(result?.confidence).toBe('low');
    });
  });

  describe('French language detection', () => {
    test('detects French gender keywords', () => {
      const result = service.findBestMatch('une femme mysterieuse', profiles);

      expect(result).not.toBeNull();
      expect(result?.profile.gender).toBe(VoiceGender.Female);
    });

    test('detects French age keywords', () => {
      const result = service.findBestMatch('un vieux sage', profiles);

      expect(result).not.toBeNull();
      expect(result?.profile.voiceId).toBe('voice-2'); // Elder Marcus
    });
  });
});
