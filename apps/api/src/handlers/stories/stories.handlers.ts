import { Elysia } from 'elysia';

import { IocService, getInstance } from '../../ioc';
import type { IStoriesService } from '../../services/stories';
import type { IWorkflowOrchestratorService } from '../../services/workflows/workflow-orchestrator.service.types';

import {
  CreateStoryBodySchema,
  EnrichStoryBodySchema,
  GenerateStoryBodySchema,
  StoryProfileIdParamsSchema,
  StoryIdParamsSchema,
} from '@mio/shared/clients/mio/stories';
import { mapCreateBodyToInput, mapStoryToResponse } from './stories.handlers.map';

export const storiesHandlers = new Elysia({ prefix: '/stories', tags: ['stories'] })
  // Create a new story
  .post(
    '/',
    async ({ body, set }) => {
      const service = getInstance<IStoriesService>(IocService.STORIES);
      const input = mapCreateBodyToInput(body);
      const story = await service.create(input);

      set.status = 201;
      return mapStoryToResponse(story);
    },
    {
      body: CreateStoryBodySchema,
    }
  )

  // Get a story by ID
  .get(
    '/:id',
    async ({ params }) => {
      // TODO: Implement with database
      return {
        id: params.id,
        childProfileId: crypto.randomUUID(),
        initialPrompt: 'Un dragon qui a peur du noir',
        enrichedConcept: null,
        script: null,
        finalAudioUrl: null,
        duration: null,
        status: 'draft',
        segments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    {
      params: StoryIdParamsSchema,
    }
  )

  // List stories for a profile
  .get(
    '/profile/:profileId',
    async () => {
      // TODO: Implement with database
      return [];
    },
    {
      params: StoryProfileIdParamsSchema,
    }
  )

  // Enrich a story
  .post(
    '/:id/enrich',
    async () => {
      // TODO: Implement with LLM service
      return {
        title: 'Le Dragon Timide',
        mainCharacter: {
          name: 'Flamme',
          description: 'Un petit dragon rouge qui a peur du noir',
        },
        setting: {
          location: 'Une grotte enchantée',
          era: 'Il y a très longtemps',
          ambiance: 'magical_realm',
        },
        tone: 'heartwarming',
        themes: ['courage', 'friendship'],
      };
    },
    {
      params: StoryIdParamsSchema,
      body: EnrichStoryBodySchema,
    }
  )

  // Generate a story (launch workflow)
  .post(
    '/:id/generate',
    async ({ params, body, set }) => {
      const storiesService = getInstance<IStoriesService>(IocService.STORIES);
      const orchestrator = getInstance<IWorkflowOrchestratorService>(IocService.WORKFLOW_ORCHESTRATOR);

      // Verify story exists
      const story = await storiesService.findById(params.id);
      if (!story) {
        set.status = 404;
        return { error: 'Story not found' };
      }

      // Create generation job
      const job = await storiesService.createGenerationJob(params.id);

      // Trigger workflow
      const result = await orchestrator.triggerStoryGeneration({
        jobId: job.id,
        storyId: params.id,
        childProfileId: story.childProfileId,
        targetDurationMinutes: body.targetDurationMinutes ?? 5, // Default to 5 minutes
      });

      // Update job with workflowRunId
      await storiesService.updateJobWorkflowRunId(job.id, result.workflowRunId);

      set.status = 202;
      return {
        jobId: result.jobId,
        workflowRunId: result.workflowRunId,
        message: 'Story generation started',
      };
    },
    {
      params: StoryIdParamsSchema,
      body: GenerateStoryBodySchema,
    }
  )

  // Delete a story
  .delete(
    '/:id',
    async ({ set }) => {
      // TODO: Implement with database and storage cleanup
      set.status = 204;
      return null;
    },
    {
      params: StoryIdParamsSchema,
    }
  );

