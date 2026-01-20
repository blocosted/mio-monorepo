import type { VocabularyLevel } from '../models';

// Re-export all constants
export * from './environment.constants';
export * from './public-environment.constants';
export * from './error.constants';
export * from './http.types';

/**
 * Available story themes
 */
export const THEMES = [
    'animals',
    'dinosaurs',
    'space',
    'ocean',
    'princesses',
    'knights',
    'pirates',
    'superheroes',
    'nature',
    'vehicles',
    'magic',
    'friendship',
] as const;

export type Theme = (typeof THEMES)[number];

/**
 * Age to vocabulary level mapping
 */
export const AGE_TO_VOCABULARY: Record<number, VocabularyLevel> = {
    3: 'very_simple',
    4: 'very_simple',
    5: 'simple',
    6: 'simple',
    7: 'medium',
    8: 'medium',
    9: 'advanced',
    10: 'advanced',
    11: 'advanced',
    12: 'advanced',
};

/**
 * Story duration in seconds
 */
export const STORY_DURATION_SECONDS: Record<string, number> = {
    '2min': 120,
    '5min': 300,
    '10min': 600,
};

/**
 * Default values
 */
export const DEFAULTS = {
    language: 'fr' as const,
    storyDuration: '5min' as const,
    narratorVoice: 'female' as const,
    includeChildAsCharacter: true,
    preferredHeroGender: 'same' as const,
} as const;

/**
 * Limits and constraints
 */
export const LIMITS = {
    prompt: {
        minLength: 3,
        maxLength: 500,
    },
    firstName: {
        minLength: 1,
        maxLength: 50,
    },
    age: {
        min: 3,
        max: 12,
    },
} as const;

/**
 * Voice IDs mapping for ElevenLabs
 */
export const VOICE_IDS = {
    narrator: {
        male: 'narrator_male_id',
        female: 'narrator_female_id',
    },
    characters: {
        childHero: 'child_hero_id',
        wiseCharacter: 'wise_character_id',
        funnyCharacter: 'funny_character_id',
        villain: 'villain_id',
    },
} as const;

/**
 * Audio settings
 */
export const AUDIO_SETTINGS = {
    format: 'mp3' as const,
    bitrate: 192,
    sampleRate: 44100,
    channels: 2,
    normalization: {
        integratedLoudness: -16,
        truePeak: -1.5,
    },
} as const;

/**
 * Cache TTLs in seconds
 */
export const CACHE_TTL = {
    audioAsset: 30 * 24 * 60 * 60, // 30 days
    jobProgress: 60 * 60, // 1 hour
    enrichedConcept: 24 * 60 * 60, // 24 hours
} as const;