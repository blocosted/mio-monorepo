/**
 * Stories contract (schemas + inferred types)
 *
 * This module is safe to import from the API handlers.
 * It MUST NOT import the HTTP client implementation.
 */

import { t } from 'elysia';

export const StoryIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' })
});

export const StoryProfileIdParamsSchema = t.Object({
  profileId: t.String({ format: 'uuid' })
});

export const CreateStoryBodySchema = t.Object({
  childProfileId: t.String({ format: 'uuid' }),
  prompt: t.String({ minLength: 3, maxLength: 500 })
});

export const EnrichStoryBodySchema = t.Object({
  duration: t.Optional(t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')]))
});

export const GenerateStoryBodySchema = t.Object({
  answers: t.Array(
    t.Object({
      questionId: t.String(),
      value: t.String()
    })
  ),
  targetDurationMinutes: t.Optional(t.Number({ minimum: 2, maximum: 30 }))
});

export const StoryResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  childProfileId: t.String({ format: 'uuid' }),
  initialPrompt: t.String(),
  status: t.String(),
  finalAudioUrl: t.Optional(t.Nullable(t.String())),
  duration: t.Optional(t.Nullable(t.Number())),
  createdAt: t.String(),
  updatedAt: t.String()
});

export type StoryIdParams = typeof StoryIdParamsSchema.static;
export type StoryProfileIdParams = typeof StoryProfileIdParamsSchema.static;
export type CreateStoryBody = typeof CreateStoryBodySchema.static;
export type EnrichStoryBody = typeof EnrichStoryBodySchema.static;
export type GenerateStoryBody = typeof GenerateStoryBodySchema.static;
export type StoryResponse = typeof StoryResponseSchema.static;
