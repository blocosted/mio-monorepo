/**
 * LLM Enrichment Service Tests
 *
 * Unit tests for the LLM service's story enrichment functionality.
 * Tests parsing, vocabulary adaptation, theme handling, profile integration,
 * and language configuration.
 */

import { describe, it, expect } from 'bun:test';
import { VocabularyLevel, Tone, Ambiance } from '@mio/shared';
import { Gender } from '@mio/shared/types';

import { parseEnrichedConcept } from '../llm.service.parser';
import { getVocabularyLevel, AGE_TO_VOCABULARY } from '../llm.service.types';
import {
  buildEnrichmentSystemPrompt,
  buildEnrichmentUserPrompt,
} from '../prompts/enrichment.prompts';
import type { EnrichmentProfile } from '../llm.service.types';

describe('LLM Service - Enrichment', () => {
  describe('parseEnrichedConcept()', () => {
    it('parses valid JSON response correctly', () => {
      const validResponse = JSON.stringify({
        title: 'Le Dragon Timide',
        mainCharacter: {
          name: 'Flamme',
          description: 'Un petit dragon rouge avec des ecailles brillantes',
          voiceType: 'enfantin',
        },
        secondaryCharacters: [
          {
            name: 'Luna',
            description: 'Une fee lumineuse et gentille',
            voiceType: 'melodieux',
          },
        ],
        setting: {
          location: 'Une foret enchantee',
          era: 'present',
          ambiance: 'forest',
        },
        tone: 'adventurous',
        themes: ['amitie', 'courage'],
        synopsis: "Flamme le dragon decouvre qu'il a peur du noir.",
      });

      const result = parseEnrichedConcept(validResponse);

      expect(result.title).toBe('Le Dragon Timide');
      expect(result.mainCharacter.name).toBe('Flamme');
      expect(result.mainCharacter.description).toContain('dragon rouge');
      expect(result.mainCharacter.voiceType).toBe('enfantin');
      expect(result.secondaryCharacters).toHaveLength(1);
      expect(result.secondaryCharacters?.[0]?.name).toBe('Luna');
      expect(result.setting.location).toBe('Une foret enchantee');
      expect(result.setting.era).toBe('present');
      expect(result.setting.ambiance).toBe(Ambiance.Forest);
      expect(result.tone).toBe(Tone.Adventurous);
      expect(result.themes).toEqual(['amitie', 'courage']);
      expect(result.synopsis).toContain('Flamme');
    });

    it('throws ValidationError for invalid JSON', () => {
      expect(() => parseEnrichedConcept('not valid json')).toThrowError();
    });

    it('throws ValidationError for missing required fields', () => {
      const missingTitle = JSON.stringify({
        mainCharacter: { name: 'Test', description: 'Test' },
        setting: { location: 'Test', era: 'Test', ambiance: 'forest' },
        tone: 'funny',
        themes: ['test'],
      });

      expect(() => parseEnrichedConcept(missingTitle)).toThrowError();
    });

    it('handles missing optional secondaryCharacters', () => {
      const noSecondaryChars = JSON.stringify({
        title: 'Test Story',
        mainCharacter: { name: 'Hero', description: 'A brave hero' },
        setting: { location: 'Castle', era: 'medieval', ambiance: 'castle' },
        tone: 'adventurous',
        themes: ['courage'],
      });

      const result = parseEnrichedConcept(noSecondaryChars);

      expect(result.secondaryCharacters).toBeUndefined();
    });

    it('handles missing optional synopsis', () => {
      const noSynopsis = JSON.stringify({
        title: 'Test Story',
        mainCharacter: { name: 'Hero', description: 'A brave hero' },
        setting: { location: 'Castle', era: 'medieval', ambiance: 'castle' },
        tone: 'adventurous',
        themes: ['courage'],
      });

      const result = parseEnrichedConcept(noSynopsis);

      expect(result.synopsis).toBeUndefined();
    });

    it('defaults to valid tone if invalid tone provided', () => {
      const invalidTone = JSON.stringify({
        title: 'Test Story',
        mainCharacter: { name: 'Hero', description: 'A brave hero' },
        setting: { location: 'Castle', era: 'medieval', ambiance: 'castle' },
        tone: 'invalid_tone',
        themes: ['courage'],
      });

      const result = parseEnrichedConcept(invalidTone);

      expect(result.tone).toBe(Tone.Adventurous); // Default fallback
    });

    it('defaults to valid ambiance if invalid ambiance provided', () => {
      const invalidAmbiance = JSON.stringify({
        title: 'Test Story',
        mainCharacter: { name: 'Hero', description: 'A brave hero' },
        setting: {
          location: 'Castle',
          era: 'medieval',
          ambiance: 'invalid_ambiance',
        },
        tone: 'adventurous',
        themes: ['courage'],
      });

      const result = parseEnrichedConcept(invalidAmbiance);

      expect(result.setting.ambiance).toBe(Ambiance.Forest); // Default fallback
    });

    it('throws for empty themes array', () => {
      const emptyThemes = JSON.stringify({
        title: 'Test Story',
        mainCharacter: { name: 'Hero', description: 'A brave hero' },
        setting: { location: 'Castle', era: 'medieval', ambiance: 'castle' },
        tone: 'adventurous',
        themes: [],
      });

      expect(() => parseEnrichedConcept(emptyThemes)).toThrowError();
    });

    it('filters out non-string themes', () => {
      const mixedThemes = JSON.stringify({
        title: 'Test Story',
        mainCharacter: { name: 'Hero', description: 'A brave hero' },
        setting: { location: 'Castle', era: 'medieval', ambiance: 'castle' },
        tone: 'adventurous',
        themes: ['courage', 123, null, 'friendship', ''],
      });

      const result = parseEnrichedConcept(mixedThemes);

      expect(result.themes).toEqual(['courage', 'friendship']);
    });
  });

  describe('getVocabularyLevel()', () => {
    it('returns very_simple for ages 3-4', () => {
      expect(getVocabularyLevel(3)).toBe(VocabularyLevel.VerySimple);
      expect(getVocabularyLevel(4)).toBe(VocabularyLevel.VerySimple);
    });

    it('returns simple for ages 5-6', () => {
      expect(getVocabularyLevel(5)).toBe(VocabularyLevel.Simple);
      expect(getVocabularyLevel(6)).toBe(VocabularyLevel.Simple);
    });

    it('returns medium for ages 7-9', () => {
      expect(getVocabularyLevel(7)).toBe(VocabularyLevel.Medium);
      expect(getVocabularyLevel(8)).toBe(VocabularyLevel.Medium);
      expect(getVocabularyLevel(9)).toBe(VocabularyLevel.Medium);
    });

    it('returns advanced for ages 10-12', () => {
      expect(getVocabularyLevel(10)).toBe(VocabularyLevel.Advanced);
      expect(getVocabularyLevel(11)).toBe(VocabularyLevel.Advanced);
      expect(getVocabularyLevel(12)).toBe(VocabularyLevel.Advanced);
    });

    it('returns very_simple for ages below 3', () => {
      expect(getVocabularyLevel(2)).toBe(VocabularyLevel.VerySimple);
      expect(getVocabularyLevel(1)).toBe(VocabularyLevel.VerySimple);
    });

    it('returns advanced for ages above 12', () => {
      expect(getVocabularyLevel(13)).toBe(VocabularyLevel.Advanced);
      expect(getVocabularyLevel(15)).toBe(VocabularyLevel.Advanced);
    });
  });

  describe('AGE_TO_VOCABULARY mapping', () => {
    it('has correct mapping for all supported ages', () => {
      expect(AGE_TO_VOCABULARY[3]).toBe(VocabularyLevel.VerySimple);
      expect(AGE_TO_VOCABULARY[4]).toBe(VocabularyLevel.VerySimple);
      expect(AGE_TO_VOCABULARY[5]).toBe(VocabularyLevel.Simple);
      expect(AGE_TO_VOCABULARY[6]).toBe(VocabularyLevel.Simple);
      expect(AGE_TO_VOCABULARY[7]).toBe(VocabularyLevel.Medium);
      expect(AGE_TO_VOCABULARY[8]).toBe(VocabularyLevel.Medium);
      expect(AGE_TO_VOCABULARY[9]).toBe(VocabularyLevel.Medium);
      expect(AGE_TO_VOCABULARY[10]).toBe(VocabularyLevel.Advanced);
      expect(AGE_TO_VOCABULARY[11]).toBe(VocabularyLevel.Advanced);
      expect(AGE_TO_VOCABULARY[12]).toBe(VocabularyLevel.Advanced);
    });
  });

  describe('buildEnrichmentSystemPrompt()', () => {
    const baseProfile: EnrichmentProfile = {
      firstName: 'Emma',
      age: 7,
      gender: Gender.Girl,
    };

    describe('basic profile integration', () => {
      it('includes child name in the prompt', () => {
        const prompt = buildEnrichmentSystemPrompt(
          baseProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('Emma');
      });

      it('includes child age in the prompt', () => {
        const prompt = buildEnrichmentSystemPrompt(
          baseProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('7-year-old');
      });

      it('includes gender-appropriate word for girl (default French)', () => {
        const prompt = buildEnrichmentSystemPrompt(
          { ...baseProfile, gender: Gender.Girl },
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('a 7-year-old fille');
      });

      it('includes gender-appropriate word for boy (default French)', () => {
        const prompt = buildEnrichmentSystemPrompt(
          { ...baseProfile, gender: Gender.Boy },
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('a 7-year-old garcon');
      });
    });

    describe('theme integration', () => {
      it('includes favorite themes when provided', () => {
        const profileWithFavorites: EnrichmentProfile = {
          ...baseProfile,
          favoriteThemes: ['dragons', 'princesses'],
        };

        const prompt = buildEnrichmentSystemPrompt(
          profileWithFavorites,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('dragons');
        expect(prompt).toContain('princesses');
        expect(prompt).toContain('Favorite themes to incorporate');
      });

      it('includes avoided themes with strong emphasis', () => {
        const profileWithAvoided: EnrichmentProfile = {
          ...baseProfile,
          avoidThemes: ['monsters', 'violence'],
        };

        const prompt = buildEnrichmentSystemPrompt(
          profileWithAvoided,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('monsters');
        expect(prompt).toContain('violence');
        expect(prompt).toContain('ABSOLUTELY AVOID');
      });
    });

    describe('character preferences', () => {
      it('includes child as character instruction when requested', () => {
        const profileAsCharacter: EnrichmentProfile = {
          ...baseProfile,
          includeChildAsCharacter: true,
        };

        const prompt = buildEnrichmentSystemPrompt(
          profileAsCharacter,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('main character MUST be named Emma');
      });

      it('includes hero gender preference when same (girl)', () => {
        const profileSameGender: EnrichmentProfile = {
          ...baseProfile,
          preferredHeroGender: 'same',
        };

        const prompt = buildEnrichmentSystemPrompt(
          profileSameGender,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('main hero should be a girl');
      });

      it('includes hero gender preference when same (boy)', () => {
        const profileSameGenderBoy: EnrichmentProfile = {
          ...baseProfile,
          gender: Gender.Boy,
          preferredHeroGender: 'same',
        };

        const prompt = buildEnrichmentSystemPrompt(
          profileSameGenderBoy,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('main hero should be a boy');
      });
    });

    describe('vocabulary level', () => {
      it('includes vocabulary level in the prompt', () => {
        const prompt = buildEnrichmentSystemPrompt(
          baseProfile,
          VocabularyLevel.VerySimple,
        );

        expect(prompt).toContain('very_simple');
        expect(prompt).toContain('3-4 year old');
      });
    });

    describe('JSON schema', () => {
      it('includes JSON schema requirements', () => {
        const prompt = buildEnrichmentSystemPrompt(
          baseProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('"title"');
        expect(prompt).toContain('"mainCharacter"');
        expect(prompt).toContain('"setting"');
        expect(prompt).toContain('"tone"');
        expect(prompt).toContain('"themes"');
      });
    });

    describe('language configuration', () => {
      it('defaults to French output language', () => {
        const prompt = buildEnrichmentSystemPrompt(
          baseProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('MUST be written in French');
        expect(prompt).toContain('in French');
      });

      it('uses French when explicitly set', () => {
        const frenchProfile: EnrichmentProfile = {
          ...baseProfile,
          language: 'fr',
        };

        const prompt = buildEnrichmentSystemPrompt(
          frenchProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('MUST be written in French');
      });

      it('uses English when language is en', () => {
        const englishProfile: EnrichmentProfile = {
          ...baseProfile,
          language: 'en',
        };

        const prompt = buildEnrichmentSystemPrompt(
          englishProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('MUST be written in English');
        expect(prompt).toContain('in English');
      });

      it('uses English gender words when language is en', () => {
        const englishProfile: EnrichmentProfile = {
          ...baseProfile,
          gender: Gender.Girl,
          language: 'en',
        };

        const prompt = buildEnrichmentSystemPrompt(
          englishProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('a 7-year-old girl');
      });

      it('uses English gender words for boy when language is en', () => {
        const englishProfile: EnrichmentProfile = {
          ...baseProfile,
          gender: Gender.Boy,
          language: 'en',
        };

        const prompt = buildEnrichmentSystemPrompt(
          englishProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain('a 7-year-old boy');
      });
    });

    describe('prompt is in English', () => {
      it('system prompt instructions are in English', () => {
        const prompt = buildEnrichmentSystemPrompt(
          baseProfile,
          VocabularyLevel.Medium,
        );

        expect(prompt).toContain(
          "You are a professional children's storyteller",
        );
        expect(prompt).toContain('Child Context');
        expect(prompt).toContain('Required Vocabulary Level');
        expect(prompt).toContain('Output Language');
        expect(prompt).toContain('Instructions');
        expect(prompt).toContain('Response Format');
        expect(prompt).toContain('CRITICAL REQUIREMENTS');
      });
    });
  });

  describe('buildEnrichmentUserPrompt()', () => {
    it('wraps the initial prompt in quotes', () => {
      const userPrompt = buildEnrichmentUserPrompt(
        'A dragon who is afraid of the dark',
      );

      expect(userPrompt).toContain('"A dragon who is afraid of the dark"');
    });

    it('includes the transformation instruction in English', () => {
      const userPrompt = buildEnrichmentUserPrompt('Test prompt');

      expect(userPrompt).toContain('Transform this idea');
    });
  });
});
