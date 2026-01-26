/**
 * Stories Admin Handler Types
 *
 * Typebox schemas for stories admin endpoints.
 */

import { t } from 'elysia';

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
 * Story ID parameter
 */
export const StoryIdParamSchema = t.Object({
  id: t.String({ format: 'uuid' })
});

/**
 * Update story prompt body
 */
export const UpdateStoryPromptBodySchema = t.Object({
  prompt: t.String({ minLength: 3, maxLength: 500 })
});
