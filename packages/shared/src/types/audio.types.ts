/**
 * Audio Primitive Types (shared)
 *
 * Only primitive/shared types live here (enum-like constants + literal unions).
 * Each layer (handlers/services/store) defines its own interfaces.
 */

// =============================================================================
// Voice Types
// =============================================================================

/**
 * Voice gender from ElevenLabs
 */
export const VoiceGenderValues = ['male', 'female', 'neutral'] as const;
export type VoiceGender = (typeof VoiceGenderValues)[number];
export const VoiceGender = {
    Male: 'male',
    Female: 'female',
    Neutral: 'neutral',
} as const satisfies Record<'Male' | 'Female' | 'Neutral', VoiceGender>;

/**
 * Voice age from ElevenLabs
 */
export const VoiceAgeValues = ['young', 'middle_aged', 'old'] as const;
export type VoiceAge = (typeof VoiceAgeValues)[number];
export const VoiceAge = {
    Young: 'young',
    MiddleAged: 'middle_aged',
    Old: 'old',
} as const satisfies Record<'Young' | 'MiddleAged' | 'Old', VoiceAge>;

/**
 * Voice use case from ElevenLabs
 */
export const VoiceUseCaseValues = [
    'narrative_story',
    'conversational',
    'characters',
    'advertisement',
    'informative',
] as const;
export type VoiceUseCase = (typeof VoiceUseCaseValues)[number];
export const VoiceUseCase = {
    NarrativeStory: 'narrative_story',
    Conversational: 'conversational',
    Characters: 'characters',
    Advertisement: 'advertisement',
    Informative: 'informative',
} as const satisfies Record<string, VoiceUseCase>;

// =============================================================================
// SFX Library Types
// =============================================================================

/**
 * SFX category for organization and search
 */
export const SfxLibraryCategoryValues = [
    'ambient',
    'effects',
    'transitions',
    'foley',
    'creatures',
] as const;
export type SfxLibraryCategory = (typeof SfxLibraryCategoryValues)[number];
export const SfxLibraryCategory = {
    Ambient: 'ambient',
    Effects: 'effects',
    Transitions: 'transitions',
    Foley: 'foley',
    Creatures: 'creatures',
} as const satisfies Record<string, SfxLibraryCategory>;

/**
 * SFX environment for context
 */
export const SfxEnvironmentValues = [
    'indoor',
    'outdoor',
    'fantasy',
    'urban',
    'nature',
] as const;
export type SfxEnvironment = (typeof SfxEnvironmentValues)[number];
export const SfxEnvironment = {
    Indoor: 'indoor',
    Outdoor: 'outdoor',
    Fantasy: 'fantasy',
    Urban: 'urban',
    Nature: 'nature',
} as const satisfies Record<string, SfxEnvironment>;

/**
 * Audio intensity level
 */
export const AudioIntensityValues = ['subtle', 'medium', 'intense'] as const;
export type AudioIntensity = (typeof AudioIntensityValues)[number];
export const AudioIntensity = {
    Subtle: 'subtle',
    Medium: 'medium',
    Intense: 'intense',
} as const satisfies Record<string, AudioIntensity>;

// =============================================================================
// Ambiance Library Types
// =============================================================================

/**
 * Ambiance environment for categorization
 */
export const AmbianceEnvironmentValues = [
    'forest',
    'ocean',
    'city',
    'village',
    'castle',
    'cave',
    'mountain',
    'meadow',
    'space',
    'underwater',
] as const;
export type AmbianceEnvironment = (typeof AmbianceEnvironmentValues)[number];
export const AmbianceEnvironment = {
    Forest: 'forest',
    Ocean: 'ocean',
    City: 'city',
    Village: 'village',
    Castle: 'castle',
    Cave: 'cave',
    Mountain: 'mountain',
    Meadow: 'meadow',
    Space: 'space',
    Underwater: 'underwater',
} as const satisfies Record<string, AmbianceEnvironment>;

/**
 * Time of day for ambiance
 */
export const TimeOfDayValues = ['day', 'night', 'dawn', 'dusk', 'any'] as const;
export type TimeOfDay = (typeof TimeOfDayValues)[number];
export const TimeOfDay = {
    Day: 'day',
    Night: 'night',
    Dawn: 'dawn',
    Dusk: 'dusk',
    Any: 'any',
} as const satisfies Record<string, TimeOfDay>;

/**
 * Weather condition for ambiance
 */
export const WeatherConditionValues = [
    'clear',
    'rainy',
    'stormy',
    'snowy',
    'foggy',
    'any',
] as const;
export type WeatherCondition = (typeof WeatherConditionValues)[number];
export const WeatherCondition = {
    Clear: 'clear',
    Rainy: 'rainy',
    Stormy: 'stormy',
    Snowy: 'snowy',
    Foggy: 'foggy',
    Any: 'any',
} as const satisfies Record<string, WeatherCondition>;

/**
 * Mood for audio (ambiance and music)
 */
export const AudioMoodValues = [
    'peaceful',
    'mysterious',
    'tense',
    'magical',
    'adventurous',
] as const;
export type AudioMood = (typeof AudioMoodValues)[number];
export const AudioMood = {
    Peaceful: 'peaceful',
    Mysterious: 'mysterious',
    Tense: 'tense',
    Magical: 'magical',
    Adventurous: 'adventurous',
} as const satisfies Record<string, AudioMood>;

// =============================================================================
// Music Library Types
// =============================================================================

/**
 * Music mood (extended from AudioMood)
 */
export const MusicMoodValues = [
    'calm',
    'mysterious',
    'adventurous',
    'tense',
    'joyful',
    'sad',
    'magical',
    'serene',
] as const;
export type MusicMood = (typeof MusicMoodValues)[number];
export const MusicMood = {
    Calm: 'calm',
    Mysterious: 'mysterious',
    Adventurous: 'adventurous',
    Tense: 'tense',
    Joyful: 'joyful',
    Sad: 'sad',
    Magical: 'magical',
    Serene: 'serene',
} as const satisfies Record<string, MusicMood>;

/**
 * Music intensity level
 */
export const MusicIntensityValues = ['soft', 'medium', 'epic'] as const;
export type MusicIntensity = (typeof MusicIntensityValues)[number];
export const MusicIntensity = {
    Soft: 'soft',
    Medium: 'medium',
    Epic: 'epic',
} as const satisfies Record<string, MusicIntensity>;

/**
 * Music tempo
 */
export const MusicTempoValues = ['slow', 'medium', 'fast'] as const;
export type MusicTempo = (typeof MusicTempoValues)[number];
export const MusicTempo = {
    Slow: 'slow',
    Medium: 'medium',
    Fast: 'fast',
} as const satisfies Record<string, MusicTempo>;
