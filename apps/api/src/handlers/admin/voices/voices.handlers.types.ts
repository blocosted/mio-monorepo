/**
 * Voices Admin Handler Types
 *
 * Typebox schemas for voice admin endpoints.
 */

import { t } from 'elysia';

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
