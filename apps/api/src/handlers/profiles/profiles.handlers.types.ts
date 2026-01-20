/**
 * Profile Handler Validation Schemas
 *
 * Typebox schemas for Elysia request/response validation.
 * Uses shared primitive types (enum-like literals) from @mio/shared/types.
 */

import { t } from 'elysia';
import {
  GenderValues,
  HeroGenderValues,
  StoryDurationValues,
  NarratorVoiceValues,
  LanguageValues,
} from '@mio/shared/types';

/**
 * Typebox enum helper - creates a strict union from a literal tuple
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

/**
 * Profile ID params schema
 */
export const ProfileIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
});

/**
 * Preferences schema (reusable)
 */
export const ProfilePreferencesSchema = t.Object({
  favoriteThemes: t.Optional(t.Array(t.String())),
  avoidThemes: t.Optional(t.Array(t.String())),
  includeChildAsCharacter: t.Optional(t.Boolean()),
  preferredHeroGender: t.Optional(enumValues(HeroGenderValues)),
  preferredStoryDuration: t.Optional(enumValues(StoryDurationValues)),
  narratorVoicePreference: t.Optional(enumValues(NarratorVoiceValues)),
  language: t.Optional(enumValues(LanguageValues)),
});

/**
 * Create profile body schema
 */
export const CreateProfileBodySchema = t.Object({
  firstName: t.String({ minLength: 1, maxLength: 50 }),
  age: t.Number({ minimum: 3, maximum: 12 }),
  gender: enumValues(GenderValues),
  preferences: t.Optional(ProfilePreferencesSchema),
});

/**
 * Update profile body schema
 */
export const UpdateProfileBodySchema = t.Partial(
  t.Object({
    firstName: t.String({ minLength: 1, maxLength: 50 }),
    age: t.Number({ minimum: 3, maximum: 12 }),
    gender: enumValues(GenderValues),
    preferences: ProfilePreferencesSchema,
  })
);

export type ProfileIdParams = typeof ProfileIdParamsSchema.static;
export type CreateProfileBody = typeof CreateProfileBodySchema.static;
export type UpdateProfileBody = typeof UpdateProfileBodySchema.static;
export type ProfilePreferences = typeof ProfilePreferencesSchema.static;
