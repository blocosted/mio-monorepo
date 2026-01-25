/**
 * Admin Handlers Types
 *
 * Typebox schemas for admin API endpoints.
 */

import { t } from 'elysia';

/**
 * Cursor pagination query parameters
 */
export const CursorPaginationQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
});

/**
 * Voice filter parameters
 */
export const VoiceFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  gender: t.Optional(t.String()),
  age: t.Optional(t.String()),
  language: t.Optional(t.String()),
  useCase: t.Optional(t.String()),
  isHighQuality: t.Optional(t.Boolean()),
  search: t.Optional(t.String())
});

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

/**
 * Story filter parameters
 */
export const StoryFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  status: t.Optional(t.String()),
  childProfileId: t.Optional(t.String()),
  search: t.Optional(t.String())
});

/**
 * Profile filter parameters
 */
export const ProfileFilterQuerySchema = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  gender: t.Optional(t.String()),
  search: t.Optional(t.String())
});
