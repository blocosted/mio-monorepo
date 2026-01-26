/**
 * Audio Library Admin Handler Types
 *
 * Typebox schemas for SFX, Ambiance, and Music admin endpoints.
 */

import { t } from 'elysia';

/**
 * SFX filter parameters
 */
export const SfxFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  category: t.Optional(t.String()),
  subcategory: t.Optional(t.String()),
  environment: t.Optional(t.String()),
  intensity: t.Optional(t.String()),
  search: t.Optional(t.String())
});

/**
 * Ambiance filter parameters
 */
export const AmbianceFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  environment: t.Optional(t.String()),
  subEnvironment: t.Optional(t.String()),
  timeOfDay: t.Optional(t.String()),
  weather: t.Optional(t.String()),
  mood: t.Optional(t.String()),
  search: t.Optional(t.String())
});

/**
 * Music filter parameters
 */
export const MusicFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  mood: t.Optional(t.String()),
  intensity: t.Optional(t.String()),
  tempo: t.Optional(t.String()),
  search: t.Optional(t.String())
});
