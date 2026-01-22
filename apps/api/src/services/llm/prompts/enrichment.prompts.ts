/**
 * Story Enrichment Prompts
 *
 * System and user prompts for transforming an initial story idea
 * into a rich, structured concept.
 *
 * Note: Prompts are in English but the story content language is configurable.
 */

import { VocabularyLevel, type Language } from '@mio/shared/types';
import type { EnrichmentProfile } from '../llm.service.types';

/** Default language for story content */
const DEFAULT_LANGUAGE: Language = 'fr';

/**
 * Language display names
 */
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'French',
  en: 'English',
};

/**
 * Vocabulary level descriptions for the LLM
 */
const VOCABULARY_DESCRIPTIONS: Record<VocabularyLevel, string> = {
  [VocabularyLevel.VerySimple]:
    'Use only the most basic words a 3-4 year old would understand. Very short sentences (3-5 words max). Avoid any complex concepts. Focus on concrete, familiar objects and simple emotions (happy, sad, scared).',
  [VocabularyLevel.Simple]:
    'Use simple vocabulary for 5-6 year olds. Short sentences (5-8 words). Can include basic fantasy elements. Simple cause-and-effect. Emotions can be slightly more varied.',
  [VocabularyLevel.Medium]:
    'Appropriate vocabulary for 7-9 year olds. Can use more descriptive language. Sentences can be longer with some complexity. Can include mild suspense and more nuanced emotions.',
  [VocabularyLevel.Advanced]:
    'Rich vocabulary for 10-12 year olds. Can use more sophisticated storytelling techniques. Complex sentences are fine. Can include subtle themes, irony, and character development.',
};

/**
 * Gender-specific articles by language
 */
const GENDER_ARTICLES: Record<
  Language,
  Record<string, { article: string; childWord: string }>
> = {
  fr: {
    boy: { article: 'un', childWord: 'garcon' },
    girl: { article: 'une', childWord: 'fille' },
    neutral: { article: 'un(e)', childWord: 'enfant' },
  },
  en: {
    boy: { article: 'a', childWord: 'boy' },
    girl: { article: 'a', childWord: 'girl' },
    neutral: { article: 'a', childWord: 'child' },
  },
};

/**
 * Build context string for the child's profile
 */
function buildProfileContext(
  profile: EnrichmentProfile,
  language: Language,
): string {
  const genderInfo = GENDER_ARTICLES[language][profile.gender];
  const parts: string[] = [];

  parts.push(
    `The story is for ${profile.firstName}, ${genderInfo?.article} ${profile.age}-year-old ${genderInfo?.childWord}.`,
  );

  if (profile.includeChildAsCharacter) {
    parts.push(
      `The main character MUST be named ${profile.firstName} and match the child's profile.`,
    );
  }

  if (profile.favoriteThemes && profile.favoriteThemes.length > 0) {
    parts.push(
      `Favorite themes to incorporate: ${profile.favoriteThemes.join(', ')}.`,
    );
  }

  if (profile.avoidThemes && profile.avoidThemes.length > 0) {
    parts.push(
      `IMPORTANT - Themes to ABSOLUTELY AVOID: ${profile.avoidThemes.join(', ')}. NEVER mention these themes.`,
    );
  }

  if (profile.preferredHeroGender === 'same') {
    const heroGender =
      profile.gender === 'boy'
        ? 'a boy'
        : profile.gender === 'girl'
          ? 'a girl'
          : 'gender-neutral';
    parts.push(`The main hero should be ${heroGender}.`);
  }

  return parts.join('\n');
}

/**
 * Build the system prompt for story enrichment
 */
export function buildEnrichmentSystemPrompt(
  profile: EnrichmentProfile,
  vocabularyLevel: VocabularyLevel,
): string {
  const language = profile.language ?? DEFAULT_LANGUAGE;
  const languageName = LANGUAGE_NAMES[language];
  const profileContext = buildProfileContext(profile, language);
  const vocabularyGuidance = VOCABULARY_DESCRIPTIONS[vocabularyLevel];

  return `You are a professional children's storyteller. You must transform a simple idea into a rich, structured story concept.

## Child Context
${profileContext}

## Required Vocabulary Level (${vocabularyLevel})
${vocabularyGuidance}

## Output Language
All story content (title, character names, descriptions, synopsis) MUST be written in ${languageName}.

## Instructions
1. Create a catchy, age-appropriate title
2. Develop an engaging main character with physical description and personality
3. Add 1-3 interesting secondary characters if relevant
4. Define a setting (location, era, ambiance) that stimulates imagination
5. Choose an appropriate tone (adventurous, funny, mysterious, heartwarming, etc.)
6. Identify 2-4 themes the story will explore
7. Write a short synopsis (2-3 sentences)

## Response Format
You must respond ONLY with a valid JSON object, no text before or after.

Required JSON schema:
{
  "title": "string - story title in ${languageName}",
  "mainCharacter": {
    "name": "string - character name",
    "description": "string - physical and personality description in ${languageName}",
    "voiceType": "string optional - voice type (childlike, deep, melodious, etc.)"
  },
  "secondaryCharacters": [
    {
      "name": "string",
      "description": "string in ${languageName}",
      "voiceType": "string optional"
    }
  ],
  "setting": {
    "location": "string - location description in ${languageName}",
    "era": "string - era (present, medieval, future, etc.)",
    "ambiance": "forest|ocean|space|castle|city|magical_realm|underwater|mountain"
  },
  "tone": "adventurous|funny|mysterious|heartwarming|exciting|calm|educational",
  "themes": ["string - theme 1 in ${languageName}", "string - theme 2 in ${languageName}"],
  "synopsis": "string - 2-3 sentence summary in ${languageName}"
}

CRITICAL REQUIREMENTS:
- Respond ONLY with JSON, no additional text
- ALL text content must be in ${languageName}
- Adapt content to the specified vocabulary level
- Strictly respect themes to avoid`;
}

/**
 * Build the user prompt for story enrichment
 */
export function buildEnrichmentUserPrompt(initialPrompt: string): string {
  return `Transform this idea into a complete story concept:\n\n"${initialPrompt}"`;
}
