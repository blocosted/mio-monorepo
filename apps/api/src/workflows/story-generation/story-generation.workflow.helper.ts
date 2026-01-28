/**
 * Workflow Step Helper
 *
 * Provides utilities for executing workflow steps with error handling,
 * retry logic, rollback support, and progress tracking.
 */

import type { Logger } from '@mio/shared/server/logger/Logger';
import { JobStatus, JobStep } from '@mio/shared/types';

import type { JobProgressService } from '../../services/cache/job-progress.service';
import type { GenerationJobsStore } from '../../services/stories/generation-jobs.store';
import { IocConnection, IocService, IocStore } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';

/**
 * Map workflow step names to JobStep enum values
 */
const WORKFLOW_STEP_TO_JOB_STEP: Record<string, JobStep> = {
  enrichment: JobStep.ScriptGeneration, // Enrichment is part of script generation conceptually
  script_generation: JobStep.ScriptGeneration,
  voice_generation: JobStep.GeneratingVoice,
  sfx_generation: JobStep.GeneratingSfx,
  music_generation: JobStep.GeneratingMusic,
  ambiance_generation: JobStep.GeneratingAmbiance,
  mixing: JobStep.Mixing,
  upload: JobStep.Finalizing,
  finalization: JobStep.Finalizing
} as const;

export interface WorkflowStepOptions {
  retries?: number;
  timeout?: number;
  onProgress?: (progress: number) => Promise<void>;
}

export class WorkflowStepHelper {
  private readonly logger: Logger;
  private readonly jobProgress: JobProgressService;
  private readonly jobsStore: GenerationJobsStore;

  constructor() {
    this.logger = getInstance<Logger>(IocConnection.LOGGER);
    this.jobProgress = getInstance<JobProgressService>(IocService.JOB_PROGRESS);
    this.jobsStore = getInstance<GenerationJobsStore>(IocStore.GENERATION_JOBS_STORE);
  }

  /**
   * Execute a workflow step with error handling, retry logic, and rollback support
   */
  async executeStepWithRollback<T>(
    jobId: string,
    stepName: string,
    stepFn: () => Promise<T>,
    rollbackFn?: () => Promise<void>,
    options: WorkflowStepOptions = {}
  ): Promise<T> {
    const { retries = 3, timeout = 120000 } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.info(`Starting step: ${stepName}`, {
          jobId,
          attempt,
          maxRetries: retries
        });

        // Execute with timeout
        const result = await Promise.race([stepFn(), this.createTimeout(timeout, `Step ${stepName} timeout after ${timeout}ms`)]);

        this.logger.info(`Step completed successfully: ${stepName}`, {
          jobId,
          attempt
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Step ${stepName} failed`, {
          jobId,
          attempt,
          maxRetries: retries,
          error: lastError.message,
          stack: lastError.stack
        });

        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          const delayMs = 2 ** attempt * 1000;
          this.logger.info(`Retrying step ${stepName} after ${delayMs}ms`, {
            jobId,
            nextAttempt: attempt + 1
          });
          await this.sleep(delayMs);
        }
      }
    }

    // All retries failed - execute rollback
    this.logger.error(`Step ${stepName} failed after ${retries} attempts`, {
      jobId,
      error: lastError?.message,
      stack: lastError?.stack
    });

    if (rollbackFn) {
      try {
        this.logger.info(`Executing rollback for step ${stepName}`, { jobId });
        await rollbackFn();
        this.logger.info(`Rollback completed for step ${stepName}`, { jobId });
      } catch (rollbackError) {
        this.logger.error(`Rollback failed for step ${stepName}`, {
          jobId,
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          stack: rollbackError instanceof Error ? rollbackError.stack : undefined
        });
      }
    }

    // Mark job as failed
    await this.markFailed(jobId, lastError as Error, stepName);

    throw lastError;
  }

  /**
   * Update job progress (DB + Redis + Pub/Sub)
   *
   * Also ensures DB status is set to Processing when job starts.
   */
  async updateProgress(jobId: string, progress: number, currentStep: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      // Convert workflow step to JobStep enum
      const jobStep = WORKFLOW_STEP_TO_JOB_STEP[currentStep];

      // Update in DB (includes status: Processing to ensure job is marked as running)
      await this.jobsStore.update(jobId, {
        progress,
        currentStep: jobStep,
        status: JobStatus.Processing
      });

      // Update in Redis cache + publish event
      await this.jobProgress.update(jobId, {
        progress,
        status: 'processing',
        currentStep,
        metadata
      });

      this.logger.debug('Progress updated', {
        jobId,
        progress,
        currentStep
      });
    } catch (error) {
      // Log but don't fail the workflow on progress update errors
      this.logger.error('Failed to update progress', {
        jobId,
        progress,
        currentStep,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mark job as failed with retry logic
   *
   * Critical: This method MUST succeed to avoid jobs stuck in "running" state.
   * DB update is retried multiple times, Redis update is best-effort.
   */
  private async markFailed(jobId: string, error: Error, step: string): Promise<void> {
    const errorMessage = `Step ${step} failed: ${error.message}`;
    const maxRetries = 3;

    // 1. Update DB status (critical - retry on failure)
    let dbUpdateSuccess = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.jobsStore.fail(jobId, errorMessage);
        dbUpdateSuccess = true;
        break;
      } catch (dbError) {
        this.logger.error('Failed to update job status in DB', {
          jobId,
          attempt,
          maxRetries,
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });

        if (attempt < maxRetries) {
          // Exponential backoff before retry
          await this.sleep(2 ** attempt * 500);
        }
      }
    }

    if (!dbUpdateSuccess) {
      this.logger.error('CRITICAL: Could not mark job as failed in DB after all retries', {
        jobId,
        step,
        error: error.message
      });
    }

    // 2. Update Redis cache (best-effort for real-time UI)
    try {
      await this.jobProgress.update(jobId, {
        status: 'failed',
        error: error.message,
        currentStep: step
      });
    } catch (redisError) {
      this.logger.warn('Failed to update job status in Redis cache', {
        jobId,
        error: redisError instanceof Error ? redisError.message : String(redisError)
      });
    }

    this.logger.error('Job marked as failed', {
      jobId,
      step,
      error: error.message,
      dbUpdateSuccess
    });
  }

  /**
   * Check if job is cancelled
   */
  async isJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.jobsStore.findById(jobId);
    return job?.status === JobStatus.Cancelled;
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Sleep for the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
