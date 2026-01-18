/**
 * Story Models
 */

export type StoryStatus = 'draft' | 'generating' | 'ready' | 'failed';

export type Gender = 'boy' | 'girl' | 'neutral';

export type StoryDuration = '2min' | '5min' | '10min';

export type NarratorVoice = 'male' | 'female' | 'any';

export type Language = 'fr' | 'en';

export type VocabularyLevel = 'very_simple' | 'simple' | 'medium' | 'advanced';

export type Emotion =
    | 'neutral'
    | 'happy'
    | 'sad'
    | 'excited'
    | 'scared'
    | 'angry'
    | 'surprised'
    | 'curious'
    | 'calm';

export type SegmentType = 'narration' | 'dialogue' | 'pause' | 'sound_effect' | 'music_change';

export type Ambiance =
    | 'forest'
    | 'ocean'
    | 'space'
    | 'castle'
    | 'city'
    | 'magical_realm'
    | 'underwater'
    | 'mountain';

export type Tone =
    | 'adventurous'
    | 'funny'
    | 'mysterious'
    | 'heartwarming'
    | 'exciting'
    | 'calm'
    | 'educational';

/**
 * Child Profile Preferences
 */
export interface ChildPreferences {
    favoriteThemes?: string[];
    avoidThemes?: string[];
    includeChildAsCharacter?: boolean;
    preferredHeroGender?: 'same' | 'any';
    preferredStoryDuration?: StoryDuration;
    narratorVoicePreference?: NarratorVoice;
    language?: Language;
}

/**
 * Child Profile
 */
export interface ChildProfile {
    id: string;
    firstName: string;
    age: number;
    gender: Gender;
    preferences: ChildPreferences;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateChildProfileInput {
    firstName: string;
    age: number;
    gender: Gender;
    preferences?: ChildPreferences;
}

export interface UpdateChildProfileInput {
    firstName?: string;
    age?: number;
    gender?: Gender;
    preferences?: ChildPreferences;
}

/**
 * Story Character
 */
export interface StoryCharacter {
    name: string;
    description: string;
    voiceType?: string;
}

/**
 * Story Setting
 */
export interface StorySetting {
    location: string;
    era: string;
    ambiance: Ambiance;
}

/**
 * Enriched Concept - Result of LLM enrichment
 */
export interface EnrichedConcept {
    title: string;
    mainCharacter: StoryCharacter;
    secondaryCharacters?: StoryCharacter[];
    setting: StorySetting;
    tone: Tone;
    themes: string[];
    synopsis?: string;
}

/**
 * Story Segment - Part of the script
 */
export interface StorySegment {
    id: string;
    order: number;
    type: SegmentType;
    content: {
        text?: string;
        characterName?: string;
        emotion?: Emotion;
        sfxDescription?: string;
        musicMood?: string;
        pauseDuration?: number;
    };
    timing?: {
        startOffset?: number;
        duration?: number;
        pauseBefore?: number;
        pauseAfter?: number;
    };
}

/**
 * Story Script - Complete script with segments
 */
export interface StoryScript {
    metadata: {
        title: string;
        estimatedDuration: number;
        vocabularyLevel: VocabularyLevel;
    };
    segments: StorySegment[];
}

/**
 * Question for guided story creation
 */
export interface StoryQuestion {
    id: string;
    text: string;
    options: {
        value: string;
        label: string;
        icon?: string;
        imageUrl?: string;
    }[];
}

/**
 * Answer to a story question
 */
export interface StoryAnswer {
    questionId: string;
    value: string;
}

/**
 * Story
 */
export interface Story {
    id: string;
    childProfileId: string;
    initialPrompt: string;
    enrichedConcept: EnrichedConcept | null;
    script: StoryScript | null;
    answers: StoryAnswer[] | null;
    finalAudioUrl: string | null;
    duration: number | null;
    status: StoryStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateStoryInput {
    childProfileId: string;
    initialPrompt: string;
}

/**
 * Generation Job
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type JobStep =
    | 'script_generation'
    | 'generating_voice'
    | 'generating_sfx'
    | 'generating_music'
    | 'generating_ambiance'
    | 'mixing'
    | 'finalizing';

export interface JobStepProgress {
    name: JobStep;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    completedAt?: Date;
    error?: string;
}

export interface GenerationJob {
    id: string;
    storyId: string;
    status: JobStatus;
    progress: number;
    currentStep: JobStep | null;
    steps: JobStepProgress[];
    result?: {
        audioUrl: string;
        duration: number;
    };
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Audio Asset
 */
export type AudioAssetType = 'voice' | 'sfx' | 'music' | 'ambiance' | 'final_mix';

export interface AudioAsset {
    id: string;
    storyId: string;
    segmentId?: string;
    type: AudioAssetType;
    url: string;
    duration: number;
    cacheKey?: string;
    createdAt: Date;
}
