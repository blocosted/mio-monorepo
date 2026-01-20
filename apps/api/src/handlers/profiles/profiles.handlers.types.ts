import { t } from 'elysia';

export const ProfileIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
});

export const CreateProfileBodySchema = t.Object({
  firstName: t.String({ minLength: 1, maxLength: 50 }),
  age: t.Number({ minimum: 3, maximum: 12 }),
  gender: t.Union([t.Literal('boy'), t.Literal('girl'), t.Literal('neutral')]),
  preferences: t.Optional(
    t.Object({
      favoriteThemes: t.Optional(t.Array(t.String())),
      avoidThemes: t.Optional(t.Array(t.String())),
      includeChildAsCharacter: t.Optional(t.Boolean()),
      preferredHeroGender: t.Optional(
        t.Union([t.Literal('same'), t.Literal('any')])
      ),
      preferredStoryDuration: t.Optional(
        t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')])
      ),
      narratorVoicePreference: t.Optional(
        t.Union([t.Literal('male'), t.Literal('female'), t.Literal('any')])
      ),
      language: t.Optional(t.Union([t.Literal('fr'), t.Literal('en')])),
    })
  ),
});

export const UpdateProfileBodySchema = t.Partial(
  t.Object({
    firstName: t.String({ minLength: 1, maxLength: 50 }),
    age: t.Number({ minimum: 3, maximum: 12 }),
    gender: t.Union([t.Literal('boy'), t.Literal('girl'), t.Literal('neutral')]),
    preferences: t.Object({
      favoriteThemes: t.Optional(t.Array(t.String())),
      avoidThemes: t.Optional(t.Array(t.String())),
      includeChildAsCharacter: t.Optional(t.Boolean()),
      preferredHeroGender: t.Optional(t.Union([t.Literal('same'), t.Literal('any')])),
      preferredStoryDuration: t.Optional(
        t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')])
      ),
      narratorVoicePreference: t.Optional(
        t.Union([t.Literal('male'), t.Literal('female'), t.Literal('any')])
      ),
      language: t.Optional(t.Union([t.Literal('fr'), t.Literal('en')])),
    }),
  })
);

