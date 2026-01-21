/**
 * Domain Models
 *
 * Re-exports types from @mio/shared/types and defines story-related models.
 */

import type { StoryScript } from './script.models';

// Re-export profile primitive types (shared)
export {
    Gender,
    HeroGender,
    StoryDuration,
    NarratorVoice,
    Language,
} from '../types/profiles.types';

// Re-export common primitive types (shared)
export {
    SortDirection,
} from '../types/common.types';

// Re-export script models (timeline-based)
export type {
    AudioTrackType,
    ElevenLabsVoiceSettings,
    CharacterVoiceMap,
    VoiceSegmentContent,
    SfxSegmentContent,
    MusicSegmentContent,
    AmbianceSegmentContent,
    SegmentContent,
    TimelineSegment,
    AudioTrack,
    ScriptMetadata,
    StoryScript,
    DurationBudget,
    NarrativeStructure,
    ScriptGenerationConstraints,
} from './script.models';

/**
 * Story Status
 */
export enum StoryStatus {
    Draft = 'draft',
    Generating = 'generating',
    Ready = 'ready',
    Failed = 'failed',
}

/**
 * Vocabulary Level
 */
export enum VocabularyLevel {
    VerySimple = 'very_simple',
    Simple = 'simple',
    Medium = 'medium',
    Advanced = 'advanced',
}

/**
 * Emotion for story segments
 */
export enum Emotion {
    Neutral = 'neutral',
    Happy = 'happy',
    Sad = 'sad',
    Excited = 'excited',
    Scared = 'scared',
    Angry = 'angry',
    Surprised = 'surprised',
    Curious = 'curious',
    Calm = 'calm',
}

/**
 * Segment Type
 */
export enum SegmentType {
    Narration = 'narration',
    Dialogue = 'dialogue',
    Pause = 'pause',
    SoundEffect = 'sound_effect',
    MusicChange = 'music_change',
}

/**
 * Story Ambiance
 */
export enum Ambiance {
    Forest = 'forest',
    Ocean = 'ocean',
    Space = 'space',
    Castle = 'castle',
    City = 'city',
    MagicalRealm = 'magical_realm',
    Underwater = 'underwater',
    Mountain = 'mountain',
}

/**
 * Story Tone
 */
export enum Tone {
    Adventurous = 'adventurous',
    Funny = 'funny',
    Mysterious = 'mysterious',
    Heartwarming = 'heartwarming',
    Exciting = 'exciting',
    Calm = 'calm',
    Educational = 'educational',
}

/**
 * Job Status
 */
export enum JobStatus {
    Pending = 'pending',
    Processing = 'processing',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled',
}

/**
 * Job Step
 */
export enum JobStep {
    ScriptGeneration = 'script_generation',
    GeneratingVoice = 'generating_voice',
    GeneratingSfx = 'generating_sfx',
    GeneratingMusic = 'generating_music',
    GeneratingAmbiance = 'generating_ambiance',
    Mixing = 'mixing',
    Finalizing = 'finalizing',
}

/**
 * Audio Asset Type
 */
export enum AudioAssetType {
    Voice = 'voice',
    Sfx = 'sfx',
    Music = 'music',
    Ambiance = 'ambiance',
    FinalMix = 'final_mix',
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
 * Job Step Progress
 */
export interface JobStepProgress {
    name: JobStep;
    status: JobStatus;
    progress?: number;
    completedAt?: Date;
    error?: string;
}

/**
 * Generation Job
 */
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
