import { Elysia } from 'elysia';

import { JobIdParamsSchema } from '@mio/shared/clients/mio/jobs';
import { JobStatus } from '@mio/shared/types';

import type { JobProgressService } from '../../services/cache';
import type { GenerationJobsService } from '../../services/stories/generation-jobs.service';
import type { WorkflowOrchestratorService } from '../../services/workflows';
import { IocService } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';

export const jobsHandlers = new Elysia({ prefix: '/jobs', tags: ['jobs'] })
  // Get job status
  .get(
    '/:id',
    async ({ params, set }) => {
      const jobProgress = getInstance<JobProgressService>(IocService.JOB_PROGRESS);
      const jobsService = getInstance<GenerationJobsService>(IocService.GENERATION_JOBS);

      // Get job from DB via service
      const job = await jobsService.findById(params.id);
      if (!job) {
        set.status = 404;
        return { error: 'Job not found' };
      }

      // Get current progress from Redis
      const progress = await jobProgress.get(params.id);

      return {
        id: job.id,
        storyId: job.storyId,
        status: job.status,
        progress: progress?.progress ?? job.progress,
        currentStep: progress?.currentStep ?? job.currentStep,
        steps: job.steps,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      };
    },
    {
      params: JobIdParamsSchema
    }
  )

  // SSE endpoint for real-time progress
  .get(
    '/:id/stream',
    async function* ({ params, set }) {
      const jobProgress = getInstance<JobProgressService>(IocService.JOB_PROGRESS);
      const jobsService = getInstance<GenerationJobsService>(IocService.GENERATION_JOBS);

      // Verify job exists
      const job = await jobsService.findById(params.id);
      if (!job) {
        set.status = 404;
        yield { event: 'error', data: JSON.stringify({ error: 'Job not found' }) };
        return;
      }

      // Send initial state
      const initialProgress = await jobProgress.get(params.id);
      if (initialProgress) {
        yield {
          event: 'progress',
          data: JSON.stringify(initialProgress)
        };
      }

      // Simple polling implementation for SSE
      // (Redis Pub/Sub to SSE generator bridging requires complex async queue pattern)
      let done = false;
      let lastProgress = initialProgress?.progress ?? 0;
      let lastUpdatedAt = initialProgress?.updatedAt ?? 0;

      while (!done && lastProgress < 100) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const progress = await jobProgress.get(params.id);
        if (progress && progress.updatedAt !== lastUpdatedAt) {
          lastProgress = progress.progress;
          lastUpdatedAt = progress.updatedAt;

          yield {
            event: 'progress',
            data: JSON.stringify(progress)
          };

          if (progress.status === 'completed' || progress.status === 'failed') {
            done = true;
          }
        }

        // Check if job was cancelled
        const currentJob = await jobsService.findById(params.id);
        if (currentJob && currentJob.status === JobStatus.Cancelled) {
          yield {
            event: 'cancelled',
            data: JSON.stringify({ jobId: params.id, message: 'Job was cancelled' })
          };
          done = true;
        }
      }
    },
    {
      params: JobIdParamsSchema
    }
  )

  // Cancel a job
  .delete(
    '/:id',
    async ({ params, set }) => {
      const jobsService = getInstance<GenerationJobsService>(IocService.GENERATION_JOBS);
      const orchestrator = getInstance<WorkflowOrchestratorService>(IocService.WORKFLOW_ORCHESTRATOR);
      const jobProgress = getInstance<JobProgressService>(IocService.JOB_PROGRESS);

      const job = await jobsService.findById(params.id);
      if (!job) {
        set.status = 404;
        return { error: 'Job not found' };
      }

      // Check if job is cancellable
      if (job.status === JobStatus.Completed || job.status === JobStatus.Failed) {
        set.status = 400;
        return { error: `Cannot cancel job with status: ${job.status}` };
      }

      // Mark job as cancelled in DB
      await jobsService.cancel(params.id);

      // Update Redis cache
      await jobProgress.update(params.id, { status: 'failed' });

      // Cancel workflow in QStash (if workflowRunId exists)
      if (job.workflowRunId) {
        try {
          await orchestrator.cancelWorkflow(job.workflowRunId);
        } catch (err) {
          // Log but don't fail - job is already marked cancelled
          console.warn('Failed to cancel workflow in QStash', {
            jobId: params.id,
            workflowRunId: job.workflowRunId,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }

      set.status = 202;
      return {
        message: 'Job cancellation requested',
        jobId: params.id
      };
    },
    {
      params: JobIdParamsSchema
    }
  );
