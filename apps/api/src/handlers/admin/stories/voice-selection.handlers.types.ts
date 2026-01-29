/**
 * Voice Selection Handlers Types
 *
 * Typebox schemas for voice selection API endpoints.
 */

import { t } from 'elysia';

/**
 * Story ID parameter schema
 */
export const VoiceSelectionStoryIdParamSchema = t.Object({
  id: t.String({ format: 'uuid' })
});

/**
 * Voice assignment entry schema
 */
export const VoiceAssignmentEntrySchema = t.Object({
  characterName: t.String({ minLength: 1, maxLength: 100 }),
  voiceId: t.String({ minLength: 1, maxLength: 100 })
});

/**
 * Update voice assignments body schema
 */
export const UpdateVoiceAssignmentsBodySchema = t.Object({
  voiceAssignments: t.Array(VoiceAssignmentEntrySchema, { minItems: 1 })
});

/**
 * Type exports inferred from schemas
 */
export type VoiceSelectionStoryIdParam = typeof VoiceSelectionStoryIdParamSchema.static;
export type VoiceAssignmentEntry = typeof VoiceAssignmentEntrySchema.static;
export type UpdateVoiceAssignmentsBody = typeof UpdateVoiceAssignmentsBodySchema.static;
