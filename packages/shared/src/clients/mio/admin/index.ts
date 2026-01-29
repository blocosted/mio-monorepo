/**
 * Admin Client Module
 *
 * Re-exports all admin client types and classes.
 */

// Common
export { CursorPaginationSchema, type CursorPagination, PaginatedResponseSchema, type PaginatedResponse } from './common';

// Voices
export { VoicesAdminClient, VoiceFiltersSchema, type VoiceFilters, VoiceSchema, type Voice } from './voices';

// Audio Library
export {
  AudioLibraryAdminClient,
  SfxFiltersSchema,
  type SfxFilters,
  SfxTrackSchema,
  type SfxTrack,
  AmbianceFiltersSchema,
  type AmbianceFilters,
  AmbianceTrackSchema,
  type AmbianceTrack,
  MusicFiltersSchema,
  type MusicFilters,
  MusicTrackSchema,
  type MusicTrack
} from './audio-library';

// Stories
export {
  StoriesAdminClient,
  StoryFiltersSchema,
  type StoryFilters,
  AdminStorySchema,
  type AdminStory,
  StorySegmentSchema,
  type StorySegment,
  AudioAssetSchema,
  type AudioAsset,
  UpdateStoryPromptBodySchema,
  type UpdateStoryPromptBody,
  UpdateStoryPromptResponseSchema,
  type UpdateStoryPromptResponse,
  CreateAndGenerateStoryBodySchema,
  type CreateAndGenerateStoryBody,
  CreateAndGenerateStoryResponseSchema,
  type CreateAndGenerateStoryResponse,
  ComputedTimelineSchema,
  type ComputedTimelineClient,
  ComputedTimelineResponseSchema,
  type ComputedTimelineResponse,
  type ComputedSegmentClient,
  type ComputedTrackClient,
  type ComputedTimelineMetadataClient,
  // Phase execution types
  PhaseStateSchema,
  type PhaseState,
  type StepProgress,
  type WorkflowPhase,
  type PhaseStatus,
  PhaseStatesResponseSchema,
  type PhaseStatesResponse,
  ExecutePhaseBodySchema,
  type ExecutePhaseBody,
  ExecutePhaseResponseSchema,
  type ExecutePhaseResponse,
  ResetToPhaseResponseSchema,
  type ResetToPhaseResponse,
  WorkflowPhaseValues,
  PhaseStatusValues
} from './stories';

// Profiles
export {
  ProfilesAdminClient,
  ProfileFiltersSchema,
  type ProfileFilters,
  AdminProfileSchema,
  type AdminProfile,
  CreateAdminProfileBodySchema,
  type CreateAdminProfileBody
} from './profiles';

// Main Client
export { MioApiAdminClient } from './admin.client';
