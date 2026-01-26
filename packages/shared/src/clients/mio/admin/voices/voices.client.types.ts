/**
 * Voices Admin Client Types
 *
 * Typebox schemas for voice admin endpoints.
 */

import { t } from 'elysia';

import { VoiceGenderValues, VoiceAgeValues, VoiceUseCaseValues } from '../../../../types';

/**
 * Typebox enum helper
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

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
