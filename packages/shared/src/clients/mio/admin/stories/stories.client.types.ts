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
