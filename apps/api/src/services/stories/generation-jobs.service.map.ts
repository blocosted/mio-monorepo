/**
 * Generation Jobs Service Mappers
 *
 * Maps between database rows and service-level domain models.
 */

import type { JobStep, JobStatus } from '@mio/shared/types';

import type { GenerationJobRow } from './generation-jobs.store';
import type { GenerationJob, JobStepProgress } from './stories.service.types';

/**
 * Map a database step to JobStepProgress domain model
 */
function mapDbStepToStepProgress(step: {
  name: string;
  status: string;
  progress?: number;
  completedAt?: string;
  error?: string;
}): JobStepProgress {
  return {
    name: step.name as JobStep,
    status: step.status as JobStatus,
    progress: step.progress,
    completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
    error: step.error
  };
}

/**
 * Map a database row to a GenerationJob domain model
 */
export function mapRowToGenerationJob(row: GenerationJobRow): GenerationJob {
  const steps = Array.isArray(row.steps) ? row.steps : [];

  return {
    id: row.id,
    storyId: row.storyId,
    status: row.status,
    progress: row.progress,
    currentStep: row.currentStep as JobStep | null,
    steps: steps.map(mapDbStepToStepProgress),
    workflowRunId: row.workflowRunId ?? undefined,
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/**
 * Map multiple database rows to GenerationJob domain models
 */
export function mapRowsToGenerationJobs(rows: GenerationJobRow[]): GenerationJob[] {
  return rows.map(mapRowToGenerationJob);
}
