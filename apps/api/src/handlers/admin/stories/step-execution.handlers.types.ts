/**
 * Step Execution Handler Types
 *
 * Typebox schemas for step execution endpoints.
 */

import { t } from 'elysia';

/**
 * Story ID parameter
 */
export const StoryIdParamSchema = t.Object({
  id: t.String({ format: 'uuid' })
});

/**
 * Phase parameter
 */
export const PhaseParamSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  phase: t.Union([
    t.Literal('concept'),
    t.Literal('voices'),
    t.Literal('audio'),
    t.Literal('mix'),
    t.Literal('final')
  ])
});

/**
 * Execute phase body (optional parameters)
 */
export const ExecutePhaseBodySchema = t.Object({
  targetDurationMinutes: t.Optional(t.Number({ minimum: 0.1, maximum: 30 }))
});

export type ExecutePhaseBody = typeof ExecutePhaseBodySchema.static;

/**
 * Update story settings body
 */
export const UpdateStorySettingsBodySchema = t.Object({
  targetDurationMinutes: t.Optional(t.Number({ minimum: 0.1, maximum: 30 }))
});

export type UpdateStorySettingsBody = typeof UpdateStorySettingsBodySchema.static;
