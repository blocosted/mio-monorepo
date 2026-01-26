/**
 * Admin Client Contract (schemas + inferred types)
 *
 * Typebox schemas for admin API endpoints.
 * Types are inferred from schemas for type safety.
 * This module is safe to import from anywhere.
 */

import { t } from 'elysia';

import {
  GenderValues,
  VoiceGenderValues,
  VoiceAgeValues,
  VoiceUseCaseValues,
  StoryStatusValues,
  AudioAssetTypeValues
} from '../../../types';

/**
 * Typebox enum helper - creates a strict union from a literal tuple
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

// =============================================================================
// Pagination
// =============================================================================

export const CursorPaginationSchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
});

export type CursorPagination = typeof CursorPaginationSchema.static;

// =============================================================================
// Voice Filters
// =============================================================================

export const VoiceFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  gender: t.Optional(t.String()),
  age: t.Optional(t.String()),
  language: t.Optional(t.String()),
  useCase: t.Optional(t.String()),
  isHighQuality: t.Optional(t.Boolean())
});

export type VoiceFilters = typeof VoiceFiltersSchema.static;

export const VoiceSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  voiceId: t.String(),
  name: t.String(),
  gender: enumValues(VoiceGenderValues),
  age: enumValues(VoiceAgeValues),
  language: t.String(),
  locale: t.String(),
  accent: t.String(),
  useCase: enumValues(VoiceUseCaseValues),
  category: t.String(),
  description: t.String(),
  previewUrl: t.String(),
  isHighQuality: t.Boolean(),
  labels: t.Record(t.String(), t.String()),
  lastSyncedAt: t.String(),
  createdAt: t.String()
});

export type Voice = typeof VoiceSchema.static;

// =============================================================================
// SFX Filters
// =============================================================================

export const SfxFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  category: t.Optional(t.String()),
  subcategory: t.Optional(t.String()),
  environment: t.Optional(t.String()),
  intensity: t.Optional(t.String())
});

export type SfxFilters = typeof SfxFiltersSchema.static;

export const SfxTrackSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  canonicalKey: t.String(),
  category: t.String(),
  subcategory: t.String(),
  environment: t.Nullable(t.String()),
  intensity: t.Nullable(t.String()),
  prompt: t.String(),
  promptInfluence: t.Number(),
  s3Url: t.String(),
  durationSeconds: t.Number(),
  format: t.String(),
  tags: t.Array(t.String()),
  storyUniverses: t.Array(t.String()),
  usageCount: t.Number(),
  lastUsedAt: t.Nullable(t.String()),
  createdAt: t.String()
});

export type SfxTrack = typeof SfxTrackSchema.static;

// =============================================================================
// Ambiance Filters
// =============================================================================

export const AmbianceFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  environment: t.Optional(t.String()),
  subEnvironment: t.Optional(t.String()),
  timeOfDay: t.Optional(t.String()),
  weather: t.Optional(t.String()),
  mood: t.Optional(t.String())
});

export type AmbianceFilters = typeof AmbianceFiltersSchema.static;

export const AmbianceTrackSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  canonicalKey: t.String(),
  environment: t.String(),
  subEnvironment: t.Nullable(t.String()),
  timeOfDay: t.Nullable(t.String()),
  weather: t.Nullable(t.String()),
  mood: t.Nullable(t.String()),
  prompt: t.String(),
  promptInfluence: t.Number(),
  s3Url: t.String(),
  sourceDurationSeconds: t.Number(),
  format: t.String(),
  isLoopable: t.Boolean(),
  tags: t.Array(t.String()),
  storyUniverses: t.Array(t.String()),
  usageCount: t.Number(),
  lastUsedAt: t.Nullable(t.String()),
  createdAt: t.String()
});

export type AmbianceTrack = typeof AmbianceTrackSchema.static;

// =============================================================================
// Music Filters
// =============================================================================

export const MusicFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  mood: t.Optional(t.String()),
  intensity: t.Optional(t.String()),
  tempo: t.Optional(t.String())
});

export type MusicFilters = typeof MusicFiltersSchema.static;

export const MusicTrackSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  canonicalKey: t.String(),
  mood: t.String(),
  intensity: t.Nullable(t.String()),
  tempo: t.Nullable(t.String()),
  variationIndex: t.Number(),
  prompt: t.String(),
  promptInfluence: t.Nullable(t.Number()),
  s3Url: t.String(),
  sourceDurationSeconds: t.Number(),
  format: t.String(),
  isLoopable: t.Boolean(),
  tags: t.Array(t.String()),
  storyUniverses: t.Array(t.String()),
  usageCount: t.Number(),
  lastUsedAt: t.Nullable(t.String()),
  createdAt: t.String()
});

export type MusicTrack = typeof MusicTrackSchema.static;

// =============================================================================
// Story Filters
// =============================================================================

export const StoryFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  status: t.Optional(t.String()),
  childProfileId: t.Optional(t.String())
});

export type StoryFilters = typeof StoryFiltersSchema.static;

export const AdminStorySchema = t.Object({
  id: t.String({ format: 'uuid' }),
  childProfileId: t.String({ format: 'uuid' }),
  initialPrompt: t.String(),
  enrichedConcept: t.Nullable(t.Unknown()),
  script: t.Nullable(t.Unknown()),
  answers: t.Nullable(t.Unknown()),
  finalAudioUrl: t.Nullable(t.String()),
  duration: t.Nullable(t.Number()),
  status: enumValues(StoryStatusValues),
  createdAt: t.String(),
  updatedAt: t.String()
});

export type AdminStory = typeof AdminStorySchema.static;

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
// Profile Filters
// =============================================================================

export const ProfileFiltersSchema = t.Object({
  search: t.Optional(t.String()),
  gender: t.Optional(t.String())
});

export type ProfileFilters = typeof ProfileFiltersSchema.static;

export const AdminProfileSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  firstName: t.String(),
  age: t.Number(),
  gender: enumValues(GenderValues),
  preferences: t.Nullable(t.Unknown()),
  createdAt: t.String(),
  updatedAt: t.String()
});

export type AdminProfile = typeof AdminProfileSchema.static;

// =============================================================================
// Paginated Response
// =============================================================================

export const PaginatedResponseSchema = <T extends ReturnType<typeof t.Object>>(itemSchema: T) =>
  t.Object({
    data: t.Array(itemSchema),
    nextCursor: t.Nullable(t.String()),
    prevCursor: t.Nullable(t.String()),
    hasMore: t.Boolean()
  });

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

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
