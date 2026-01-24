import { Elysia } from 'elysia';

import {
  CreateStoryBodySchema,
  EnrichStoryBodySchema,
  GenerateStoryBodySchema,
  StoryIdParamsSchema,
  StoryProfileIdParamsSchema
} from '@mio/shared/clients/mio/stories';

import { AppError, ErrorCodes } from '@mio/shared';

import type { StoriesService } from '../../services/stories';
import type { WorkflowOrchestratorService } from '../../services/workflows';
import { IocService, getInstance } from '../../ioc';
import { mapCreateStoryBodyToInput, mapStoryToResponse } from './stories.handlers.map';

export const storiesHandlers = new Elysia({ prefix: '/stories', tags: ['stories'] })
  // Create a new story
  .post(
    '/',
    async ({ body, set }) => {
      const service = getInstance<StoriesService>(IocService.STORIES);
      const input = mapCreateStoryBodyToInput(body);
      const story = await service.create(input);

      set.status = 201;
      return mapStoryToResponse(story);
    },
    {
      body: CreateStoryBodySchema
    }
  )

  // Get a story by ID
  .get(
    '/:id',
    async ({ params }) => {
      const service = getInstance<StoriesService>(IocService.STORIES);
      const story = await service.findById(params.id);

      if (!story) {
        throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
      }

      return mapStoryToResponse(story);
    },
    {
      params: StoryIdParamsSchema
    }
  )

  // List stories for a profile
  .get(
    '/profile/:profileId',
    async ({ params }) => {
      const service = getInstance<StoriesService>(IocService.STORIES);
      const stories = await service.findByProfileId(params.profileId);

      return stories.map(mapStoryToResponse);
    },
    {
      params: StoryProfileIdParamsSchema
    }
  )

  // Enrich a story
  .post(
    '/:id/enrich',
    async ({ params }) => {
      const service = getInstance<StoriesService>(IocService.STORIES);
      return service.enrichStory(params.id);
    },
    {
      params: StoryIdParamsSchema,
      body: EnrichStoryBodySchema
    }
  )

  // Generate a story (launch workflow)
  .post(
    '/:id/generate',
    async ({ params, body, set }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);
      const orchestrator = getInstance<WorkflowOrchestratorService>(IocService.WORKFLOW_ORCHESTRATOR);

      // Verify story exists
      const story = await storiesService.findById(params.id);
      if (!story) {
        throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
      }

      // Create generation job
      const job = await storiesService.createGenerationJob(params.id);

      // Trigger workflow
      const result = await orchestrator.triggerStoryGeneration({
        jobId: job.id,
        storyId: params.id,
        childProfileId: story.childProfileId,
        targetDurationMinutes: body.targetDurationMinutes ?? 5 // Default to 5 minutes
      });

      // Update job with workflowRunId
      await storiesService.updateJobWorkflowRunId(job.id, result.workflowRunId);

      set.status = 202;
      return {
        jobId: result.jobId,
        workflowRunId: result.workflowRunId,
        message: 'Story generation started'
      };
    },
    {
      params: StoryIdParamsSchema,
      body: GenerateStoryBodySchema
    }
  )

  // Delete a story
  .delete(
    '/:id',
    async ({ params, set }) => {
      const service = getInstance<StoriesService>(IocService.STORIES);
      const deleted = await service.delete(params.id);

      if (!deleted) {
        throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
      }

      set.status = 204;
      return null;
    },
    {
      params: StoryIdParamsSchema
    }
  );
