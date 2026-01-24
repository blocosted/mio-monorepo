/**
 * Jobs contract (schemas + inferred types)
 *
 * This module is safe to import from the API handlers.
 * It MUST NOT import the HTTP client implementation.
 */

import { t } from 'elysia';

export const JobIdParamsSchema = t.Object({
  id: t.String({ format: 'uuid' })
});

export const JobStepStatusSchema = t.Union([
  t.Literal('pending'),
  t.Literal('processing'),
  t.Literal('completed'),
  t.Literal('failed'),
  t.Literal('cancelled')
]);

export const JobStepSchema = t.Object({
  name: t.String(),
  status: JobStepStatusSchema,
  progress: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  completedAt: t.Optional(t.String())
});

export const JobStatusResponseSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  storyId: t.String({ format: 'uuid' }),
  status: JobStepStatusSchema,
  progress: t.Number({ minimum: 0, maximum: 100 }),
  currentStep: t.String(),
  steps: t.Array(JobStepSchema),
  createdAt: t.String(),
  updatedAt: t.String()
});

export const CancelJobResponseSchema = t.Object({
  message: t.String(),
  jobId: t.String({ format: 'uuid' })
});

// Inferred types
export type JobIdParams = typeof JobIdParamsSchema.static;
export type JobStepStatus = typeof JobStepStatusSchema.static;
export type JobStep = typeof JobStepSchema.static;
export type JobStatusResponse = typeof JobStatusResponseSchema.static;
export type CancelJobResponse = typeof CancelJobResponseSchema.static;
