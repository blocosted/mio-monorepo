/**
 * Stories Service Types
 *
 * Defines interfaces and types for the stories service layer.
 * Uses only primitive/shared types (enum-like literals) from @mio/shared/types.
 */

import type { Ambiance, AudioAssetType, JobStatus, JobStep, StoryScript, StoryStatus, Tone } from '@mio/shared/types';

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
  targetDurationMinutes: number;
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
  targetDurationMinutes?: number;
}

/**
 * Store-layer input for story insert
 */
export interface CreateStoryRowInput {
  childProfileId: string;
  initialPrompt: string;
  targetDurationMinutes?: number;
}

/**
 * Database row representation
 */
export interface StoryRow {
  id: string;
  childProfileId: string;
  initialPrompt: string;
  targetDurationMinutes: number;
  enrichedConcept: EnrichedConcept | null;
  script: StoryScript | null;
  answers: StoryAnswer[] | null;
  finalAudioUrl: string | null;
  duration: number | null;
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
  workflowRunId?: string;
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

// =============================================================================
// Pagination Types
// =============================================================================

/**
 * Cursor pagination options for Stories
 */
export interface StoryPaginationOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Filter options for Stories pagination
 */
export interface StoryFilterOptions {
  status?: StoryStatus;
  childProfileId?: string;
  search?: string;
}

/**
 * Paginated result for Stories
 */
export interface PaginatedStoriesResult {
  rows: StoryRow[];
  nextCursor: string | null;
  hasMore: boolean;
}
