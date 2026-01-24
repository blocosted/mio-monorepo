/**
 * Profiles contract (schemas + inferred types)
 *
 * This module is safe to import from the API handlers.
 * It MUST NOT import the HTTP client implementation.
 */

import { t } from 'elysia';

import { GenderValues, HeroGenderValues, LanguageValues, NarratorVoiceValues, StoryDurationValues } from '../../../types';

/**
 * Typebox enum helper - creates a strict union from a literal tuple
 */
function enumValues<const T extends readonly [string, ...string[]]>(values: T) {
  return t.UnionEnum(values);
}

export const ProfileIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' })
});

export const ProfilePreferencesSchema = t.Object({
  favoriteThemes: t.Optional(t.Array(t.String())),
  avoidThemes: t.Optional(t.Array(t.String())),
  includeChildAsCharacter: t.Optional(t.Boolean()),
  preferredHeroGender: t.Optional(enumValues(HeroGenderValues)),
  preferredStoryDuration: t.Optional(enumValues(StoryDurationValues)),
  narratorVoicePreference: t.Optional(enumValues(NarratorVoiceValues)),
  language: t.Optional(enumValues(LanguageValues))
});

export const CreateProfileBodySchema = t.Object({
  firstName: t.String({ minLength: 1, maxLength: 50 }),
  age: t.Number({ minimum: 3, maximum: 12 }),
  gender: enumValues(GenderValues),
  preferences: t.Optional(ProfilePreferencesSchema)
});

export const UpdateProfileBodySchema = t.Partial(
  t.Object({
    firstName: t.String({ minLength: 1, maxLength: 50 }),
    age: t.Number({ minimum: 3, maximum: 12 }),
    gender: enumValues(GenderValues),
    preferences: ProfilePreferencesSchema
  })
);

export const ProfileResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  firstName: t.String(),
  age: t.Number(),
  gender: enumValues(GenderValues),
  preferences: ProfilePreferencesSchema,
  createdAt: t.String(),
  updatedAt: t.String()
});

// Inferred types
export type ProfileIdParams = typeof ProfileIdParamsSchema.static;
export type CreateProfileBody = typeof CreateProfileBodySchema.static;
export type UpdateProfileBody = typeof UpdateProfileBodySchema.static;
export type ProfilePreferences = typeof ProfilePreferencesSchema.static;
export type ProfileResponse = typeof ProfileResponseSchema.static;
