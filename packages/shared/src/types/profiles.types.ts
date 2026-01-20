/**
 * Profile Primitive Types (shared)
 *
 * Only primitive/shared types live here (enum-like constants + literal unions).
 * Each layer (handlers/services/store) defines its own interfaces.
 */

/**
 * Gender for child profiles
 */
export const GenderValues = ['boy', 'girl', 'neutral'] as const;
export type Gender = (typeof GenderValues)[number];
export const Gender = {
    Boy: 'boy',
    Girl: 'girl',
    Neutral: 'neutral',
} as const satisfies Record<'Boy' | 'Girl' | 'Neutral', Gender>;

/**
 * Preferred hero gender for stories
 */
export const HeroGenderValues = ['same', 'any'] as const;
export type HeroGender = (typeof HeroGenderValues)[number];
export const HeroGender = {
    Same: 'same',
    Any: 'any',
} as const satisfies Record<'Same' | 'Any', HeroGender>;

/**
 * Story duration preferences
 */
export const StoryDurationValues = ['2min', '5min', '10min'] as const;
export type StoryDuration = (typeof StoryDurationValues)[number];
export const StoryDuration = {
    Short: '2min',
    Medium: '5min',
    Long: '10min',
} as const satisfies Record<'Short' | 'Medium' | 'Long', StoryDuration>;

/**
 * Narrator voice preference
 */
export const NarratorVoiceValues = ['male', 'female', 'any'] as const;
export type NarratorVoice = (typeof NarratorVoiceValues)[number];
export const NarratorVoice = {
    Male: 'male',
    Female: 'female',
    Any: 'any',
} as const satisfies Record<'Male' | 'Female' | 'Any', NarratorVoice>;

/**
 * Supported languages
 */
export const LanguageValues = ['fr', 'en'] as const;
export type Language = (typeof LanguageValues)[number];
export const Language = {
    French: 'fr',
    English: 'en',
} as const satisfies Record<'French' | 'English', Language>;
