/**
 * Audio Library Admin Client Types
 *
 * Typebox schemas for SFX, Ambiance, and Music admin endpoints.
 */

import { t } from 'elysia';

// =============================================================================
// SFX Types
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
// Ambiance Types
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
// Music Types
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
