/**
 * Stories Admin Client Types
 *
 * Typebox schemas for stories admin endpoints.
 */

import { t } from 'elysia';

import { StoryStatusValues, AudioAssetTypeValues } from '../../../../types';

/**
 * Typebox enum helper
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

// =============================================================================
// Story Filters
// =============================================================================

export const StoryFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  status: t.Optional(t.String()),
  childProfileId: t.Optional(t.String())
});

export type StoryFilters = typeof StoryFiltersSchema.static;

// =============================================================================
// Enriched Concept Schema
// =============================================================================

export const StoryCharacterSchema = t.Object({
  name: t.String(),
  description: t.String(),
  voiceType: t.Optional(t.String())
});

export const StorySettingSchema = t.Object({
  location: t.String(),
  era: t.String(),
  ambiance: t.String()
});

export const EnrichedConceptSchema = t.Object({
  title: t.String(),
  mainCharacter: StoryCharacterSchema,
  secondaryCharacters: t.Optional(t.Array(StoryCharacterSchema)),
  setting: StorySettingSchema,
  tone: t.String(),
  themes: t.Array(t.String()),
  synopsis: t.Optional(t.String())
});

export type EnrichedConcept = typeof EnrichedConceptSchema.static;

export const AdminStorySchema = t.Object({
  id: t.String({ format: 'uuid' }),
  childProfileId: t.String({ format: 'uuid' }),
  initialPrompt: t.String(),
  enrichedConcept: t.Nullable(EnrichedConceptSchema),
  script: t.Nullable(t.Unknown()),
  answers: t.Nullable(t.Unknown()),
  finalAudioUrl: t.Nullable(t.String()),
  duration: t.Nullable(t.Number()),
  status: enumValues(StoryStatusValues),
  createdAt: t.String(),
  updatedAt: t.String()
});

export type AdminStory = typeof AdminStorySchema.static;

// =============================================================================
// Story Segments
// =============================================================================

export const StorySegmentSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  storyId: t.String({ format: 'uuid' }),
  order: t.Number(),
  type: t.String(),
  content: t.Record(t.String(), t.Unknown()),
  audioUrl: t.Nullable(t.String()),
  duration: t.Nullable(t.Number()),
  createdAt: t.String()
});

export type StorySegment = typeof StorySegmentSchema.static;

// =============================================================================
// Audio Assets
// =============================================================================

export const AudioAssetSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  storyId: t.Nullable(t.String({ format: 'uuid' })),
  segmentId: t.Nullable(t.String({ format: 'uuid' })),
  type: enumValues(AudioAssetTypeValues),
  url: t.String(),
  duration: t.Number(),
  cacheKey: t.Nullable(t.String()),
  createdAt: t.String()
});

export type AudioAsset = typeof AudioAssetSchema.static;

// =============================================================================
// Update Story Prompt
// =============================================================================

export const UpdateStoryPromptBodySchema = t.Object({
  prompt: t.String({ minLength: 3, maxLength: 500 })
});

export type UpdateStoryPromptBody = typeof UpdateStoryPromptBodySchema.static;

export const UpdateStoryPromptResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  prompt: t.String()
});

export type UpdateStoryPromptResponse = typeof UpdateStoryPromptResponseSchema.static;

// =============================================================================
// Create and Generate Story
// =============================================================================

export const CreateAndGenerateStoryBodySchema = t.Object({
  childProfileId: t.String({ format: 'uuid' }),
  prompt: t.String({ minLength: 3, maxLength: 500 }),
  targetDurationMinutes: t.Optional(t.Number({ minimum: 0.1, maximum: 30 }))
});

export type CreateAndGenerateStoryBody = typeof CreateAndGenerateStoryBodySchema.static;

export const CreateAndGenerateStoryResponseSchema = t.Object({
  story: t.Object({
    id: t.String({ format: 'uuid' }),
    childProfileId: t.String({ format: 'uuid' }),
    initialPrompt: t.String(),
    status: t.String()
  }),
  job: t.Object({
    jobId: t.String({ format: 'uuid' }),
    workflowRunId: t.String()
  }),
  message: t.String()
});

export type CreateAndGenerateStoryResponse = typeof CreateAndGenerateStoryResponseSchema.static;

// =============================================================================
// Regenerate Story
// =============================================================================

export const RegenerateStoryBodySchema = t.Object({
  targetDurationMinutes: t.Optional(t.Number({ minimum: 0.1, maximum: 30 }))
});

export type RegenerateStoryBody = typeof RegenerateStoryBodySchema.static;

export const RegenerateStoryResponseSchema = t.Object({
  storyId: t.String({ format: 'uuid' }),
  job: t.Object({
    jobId: t.String({ format: 'uuid' }),
    workflowRunId: t.String()
  }),
  message: t.String()
});

export type RegenerateStoryResponse = typeof RegenerateStoryResponseSchema.static;

// =============================================================================
// Computed Timeline
// =============================================================================

export const ComputedSegmentSchema = t.Object({
  id: t.String(),
  trackId: t.String(),
  startTime: t.Number(),
  duration: t.Number(),
  endTime: t.Number(),
  audioAssetId: t.Optional(t.String()),
  audioUrl: t.Optional(t.String()),
  content: t.Record(t.String(), t.Unknown())
});

export type ComputedSegmentClient = typeof ComputedSegmentSchema.static;

export const ComputedTrackSchema = t.Object({
  id: t.String(),
  type: t.String(),
  name: t.String(),
  segments: t.Array(ComputedSegmentSchema)
});

export type ComputedTrackClient = typeof ComputedTrackSchema.static;

export const ComputedTimelineMetadataSchema = t.Object({
  totalDuration: t.Number(),
  computedAt: t.String(),
  voiceSegmentPauseSeconds: t.Number(),
  voiceSegmentCount: t.Number(),
  nonVoiceSegmentCount: t.Number()
});

export type ComputedTimelineMetadataClient = typeof ComputedTimelineMetadataSchema.static;

export const ComputedTimelineSchema = t.Object({
  storyId: t.String({ format: 'uuid' }),
  metadata: ComputedTimelineMetadataSchema,
  tracks: t.Array(ComputedTrackSchema)
});

export type ComputedTimelineClient = typeof ComputedTimelineSchema.static;

export const ComputedTimelineResponseSchema = t.Object({
  data: t.Optional(ComputedTimelineSchema),
  computed: t.Boolean(),
  error: t.Optional(t.String())
});

export type ComputedTimelineResponse = typeof ComputedTimelineResponseSchema.static;

// =============================================================================
// Remix Story
// =============================================================================

export const RemixStoryResponseSchema = t.Object({
  storyId: t.String({ format: 'uuid' }),
  finalAudioUrl: t.String(),
  duration: t.Number(),
  message: t.String()
});

export type RemixStoryResponse = typeof RemixStoryResponseSchema.static;
