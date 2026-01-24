/**
 * Generation Jobs Service
 *
 * Business logic for generation job management.
 * Wraps GenerationJobsStore and provides service-level methods.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { JobStatus, JobStep } from '@mio/shared/types';

import type {
  CreateGenerationJobInput,
  GenerationJob,
  JobStepProgress,
  UpdateGenerationJobInput
} from './stories.service.types';
import type { GenerationJobsStore } from './generation-jobs.store';
import { IocStore } from '../../ioc/ioc.types';
import { mapRowToGenerationJob, mapRowsToGenerationJobs } from './generation-jobs.service.map';

@injectable()
export class GenerationJobsService {
  constructor(
    @inject(IocStore.GENERATION_JOBS_STORE)
    private readonly store: GenerationJobsStore
  ) {}

  /**
   * Create a new generation job
   */
  async create(input: CreateGenerationJobInput): Promise<GenerationJob> {
    const row = await this.store.create(input);
    return mapRowToGenerationJob(row);
  }

  /**
   * Find a generation job by ID
   */
  async findById(id: string): Promise<GenerationJob | null> {
    const row = await this.store.findById(id);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Find a generation job by story ID
   */
  async findByStoryId(storyId: string): Promise<GenerationJob | null> {
    const row = await this.store.findByStoryId(storyId);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Find all jobs with a specific status
   */
  async findByStatus(status: JobStatus): Promise<GenerationJob[]> {
    const rows = await this.store.findByStatus(status);
    return mapRowsToGenerationJobs(rows);
  }

  /**
   * Find all pending jobs
   */
  async findPending(): Promise<GenerationJob[]> {
    const rows = await this.store.findPending();
    return mapRowsToGenerationJobs(rows);
  }

  /**
   * Find all processing jobs
   */
  async findProcessing(): Promise<GenerationJob[]> {
    const rows = await this.store.findProcessing();
    return mapRowsToGenerationJobs(rows);
  }

  /**
   * Update a generation job
   */
  async update(id: string, input: UpdateGenerationJobInput): Promise<GenerationJob | null> {
    const row = await this.store.update(id, input);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Update job status
   */
  async updateStatus(id: string, status: JobStatus, error?: string): Promise<GenerationJob | null> {
    const row = await this.store.updateStatus(id, status, error);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Update job progress
   */
  async updateProgress(
    id: string,
    input: { progress: number; currentStep?: JobStep; steps?: JobStepProgress[] }
  ): Promise<GenerationJob | null> {
    const row = await this.store.updateProgress(id, input);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Update workflow run ID
   */
  async updateWorkflowRunId(id: string, workflowRunId: string): Promise<GenerationJob | null> {
    const row = await this.store.updateWorkflowRunId(id, workflowRunId);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Mark job as completed with result
   */
  async complete(id: string, result: { audioUrl: string; duration: number }): Promise<GenerationJob | null> {
    const row = await this.store.complete(id, result);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Mark job as failed with error
   */
  async fail(id: string, error: string): Promise<GenerationJob | null> {
    const row = await this.store.fail(id, error);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<GenerationJob | null> {
    const row = await this.store.cancel(id);
    if (!row) {
      return null;
    }
    return mapRowToGenerationJob(row);
  }

  /**
   * Delete a generation job
   */
  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * Delete job by story ID
   */
  async deleteByStoryId(storyId: string): Promise<void> {
    await this.store.deleteByStoryId(storyId);
  }

  /**
   * Count jobs by status
   */
  async countByStatus(status: JobStatus): Promise<number> {
    return this.store.countByStatus(status);
  }
}
