/**
 * Stories Service Types
 *
 * Defines interfaces and types for the stories service layer.
 * Uses only primitive/shared types (enum-like literals) from @mio/shared/types.
 */

import type {
    StoryStatus,
    StoryScript,
    Tone,
    Ambiance,
    JobStatus,
    JobStep,
    AudioAssetType,
} from '@mio/shared/types';

/**
 * Story Character (domain model)
 */
export interface StoryCharacter {
    name: string;
    description: string;
    voiceType?: string;
}

/**
 * Story Setting (domain model)
 */
export interface StorySetting {
    location: string;
    era: string;
    ambiance: Ambiance;
}

/**
 * Enriched Concept - Result of LLM enrichment (domain model)
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
 * Story Answer (domain model)
 */
export interface StoryAnswer {
    questionId: string;
    value: string;
}

/**
 * Story Question (domain model)
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
 * Service-layer story model (service owns this interface)
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

/**
 * Service-layer input for story creation
 */
export interface CreateStoryInput {
    childProfileId: string;
    prompt: string;
}

/**
 * Store-layer input for story insert
 */
export interface CreateStoryRowInput {
    childProfileId: string;
    initialPrompt: string;
}

/**
 * Stories Service Interface
 */
export interface IStoriesService {
    /**
     * Create a new story from an initial prompt
     */
    create(input: CreateStoryInput): Promise<Story>;

    /**
     * Find a story by ID
     */
    findById(id: string): Promise<any>;

    /**
     * Create a generation job for a story
     */
    createGenerationJob(storyId: string): Promise<any>;

    /**
     * Update workflow run ID for a job
     */
    updateJobWorkflowRunId(jobId: string, workflowRunId: string): Promise<void>;
}

/**
 * Stories Store Interface (data access layer)
 */
export interface IStoriesStore {
    /**
     * Insert a new story row
     */
    insert(input: CreateStoryRowInput): Promise<StoryRow>;

    /**
     * Find a story by ID
     */
    findById(id: string): Promise<StoryRow | null>;
}

/**
 * Database row representation
 */
export interface StoryRow {
    id: string;
    childProfileId: string;
    initialPrompt: string;
    status: StoryStatus;
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// Generation Jobs (domain models)
// =============================================================================

/**
 * Job Step Progress (domain model)
 */
export interface JobStepProgress {
    name: JobStep;
    status: JobStatus;
    progress?: number;
    completedAt?: Date;
    error?: string;
}

/**
 * Generation Job (domain model)
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
 * Create Generation Job Input
 */
export interface CreateGenerationJobInput {
    storyId: string;
    status?: JobStatus;
    currentStep?: JobStep;
}

/**
 * Update Generation Job Input
 */
export interface UpdateGenerationJobInput {
    status?: JobStatus;
    progress?: number;
    currentStep?: JobStep;
    steps?: JobStepProgress[];
    result?: { audioUrl: string; duration: number };
    error?: string;
}

// =============================================================================
// Audio Assets (domain models)
// =============================================================================

/**
 * Audio Asset (domain model)
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

/**
 * Create Audio Asset Input
 */
export interface CreateAudioAssetInput {
    storyId: string;
    segmentId?: string;
    type: AudioAssetType;
    url: string;
    duration: number;
    cacheKey?: string;
}
