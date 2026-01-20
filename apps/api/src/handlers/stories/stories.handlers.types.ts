import { t } from 'elysia';

export const StoryIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }),
});

export const ProfileIdParamsSchema = t.Object({
  profileId: t.String({ format: 'uuid' }),
});

export const CreateStoryBodySchema = t.Object({
  childProfileId: t.String({ format: 'uuid' }),
  prompt: t.String({ minLength: 3, maxLength: 500 }),
});

export const EnrichStoryBodySchema = t.Object({
  duration: t.Optional(t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')])),
});

export const GenerateStoryBodySchema = t.Object({
  answers: t.Array(
    t.Object({
      questionId: t.String(),
      value: t.String(),
    })
  ),
});

