/**
 * Stories Admin Handlers
 *
 * API endpoints for stories admin operations.
 */

import { Elysia, t } from 'elysia';

import type { StoryStatus } from '@mio/shared/types';

import { IocService } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import type { AudioAssetWithDuration, StoryScript } from '@mio/shared/types';

import type { StoriesService } from '../../../services/stories/stories.service';
import type { AudioAssetsService } from '../../../services/stories/audio-assets.service';
import type { StorySegmentsService } from '../../../services/stories/story-segments.service';
import type { WorkflowOrchestratorService } from '../../../services/workflows/workflow-orchestrator.service';
import type { TimelineComputationService } from '../../../services/narration/timeline-computation.service';
import type { StoryMixingOrchestrator } from '../../../services/audio-mixing/story-mixing.orchestrator';
import type { StoryFinalizationService } from '../../../services/stories/story-finalization.service';
import {
  StoryFilterQuerySchema,
  StoryIdParamSchema,
  UpdateStoryPromptBodySchema,
  CreateAndGenerateStoryBodySchema
} from './stories.handlers.types';

export const storiesHandlers = new Elysia({ tags: ['admin'] })
  .get(
    '/stories',
    async ({ query }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);

      const result = await storiesService.findPaginated(
        {
          status: query.status as StoryStatus | undefined,
          childProfileId: query.childProfileId,
          search: query.search
        },
        {
          cursor: query.cursor,
          limit: query.limit
        }
      );

      return {
        data: result.rows,
        nextCursor: result.nextCursor,
        prevCursor: null,
        hasMore: result.hasMore
      };
    },
    {
      query: StoryFilterQuerySchema
    }
  )
  .post(
    '/stories/generate',
    async ({ body, set }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);
      const orchestrator = getInstance<WorkflowOrchestratorService>(IocService.WORKFLOW_ORCHESTRATOR);

      // 1. Create story
      const story = await storiesService.create({
        childProfileId: body.childProfileId,
        prompt: body.prompt
      });

      // 2. Create generation job
      const job = await storiesService.createGenerationJob(story.id);

      // 3. Trigger workflow
      const result = await orchestrator.triggerStoryGeneration({
        jobId: job.id,
        storyId: story.id,
        childProfileId: story.childProfileId,
        targetDurationMinutes: body.targetDurationMinutes ?? 5
      });

      // 4. Link job to workflow
      await storiesService.updateJobWorkflowRunId(job.id, result.workflowRunId);

      set.status = 202;
      return {
        story: {
          id: story.id,
          childProfileId: story.childProfileId,
          initialPrompt: story.initialPrompt,
          status: story.status
        },
        job: {
          jobId: result.jobId,
          workflowRunId: result.workflowRunId
        },
        message: 'Story created and generation started'
      };
    },
    {
      body: CreateAndGenerateStoryBodySchema
    }
  )
  .post(
    '/stories/:id/regenerate',
    async ({ params, body, set }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);
      const audioAssetsService = getInstance<AudioAssetsService>(IocService.AUDIO_ASSETS);
      const segmentsService = getInstance<StorySegmentsService>(IocService.STORY_SEGMENTS);
      const orchestrator = getInstance<WorkflowOrchestratorService>(IocService.WORKFLOW_ORCHESTRATOR);

      // Verify story exists
      const story = await storiesService.findById(params.id);
      if (!story) {
        set.status = 404;
        return { error: 'Story not found' };
      }

      // Clean up existing data for fresh regeneration
      await audioAssetsService.deleteByStoryId(params.id);
      await segmentsService.deleteByStoryId(params.id);
      await storiesService.deleteGenerationJobByStoryId(params.id);

      // Create new generation job
      const job = await storiesService.createGenerationJob(params.id);

      // Trigger workflow
      const result = await orchestrator.triggerStoryGeneration({
        jobId: job.id,
        storyId: params.id,
        childProfileId: story.childProfileId,
        targetDurationMinutes: body?.targetDurationMinutes ?? 0.33
      });

      // Link job to workflow
      await storiesService.updateJobWorkflowRunId(job.id, result.workflowRunId);

      set.status = 202;
      return {
        storyId: params.id,
        job: {
          jobId: result.jobId,
          workflowRunId: result.workflowRunId
        },
        message: 'Story regeneration started'
      };
    },
    {
      params: StoryIdParamSchema,
      body: t.Optional(t.Object({
        targetDurationMinutes: t.Optional(t.Number({ minimum: 0.1, maximum: 30 }))
      }))
    }
  )
  .get(
    '/stories/:id',
    async ({ params, set }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);
      const story = await storiesService.findById(params.id);

      if (!story) {
        set.status = 404;
        return { error: 'Story not found' };
      }

      return story;
    },
    {
      params: StoryIdParamSchema
    }
  )
  .get(
    '/stories/:id/segments',
    async ({ params }) => {
      const segmentsService = getInstance<StorySegmentsService>(IocService.STORY_SEGMENTS);
      const segments = await segmentsService.findByStoryId(params.id);

      return { data: segments };
    },
    {
      params: StoryIdParamSchema
    }
  )
  .get(
    '/stories/:id/audio-assets',
    async ({ params }) => {
      const audioAssetsService = getInstance<AudioAssetsService>(IocService.AUDIO_ASSETS);
      const assets = await audioAssetsService.findByStoryId(params.id);

      return { data: assets };
    },
    {
      params: StoryIdParamSchema
    }
  )
  .patch(
    '/stories/:id',
    async ({ params, body, set }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);

      try {
        await storiesService.updatePrompt(params.id, body.prompt);
        return { id: params.id, prompt: body.prompt };
      } catch (error) {
        if (error instanceof Error && error.message.includes('NotFound')) {
          set.status = 404;
          return { error: 'Story not found' };
        }
        if (error instanceof Error && error.message.includes('NotDraft')) {
          set.status = 400;
          return { error: 'Can only edit prompt for draft stories' };
        }
        throw error;
      }
    },
    {
      params: StoryIdParamSchema,
      body: UpdateStoryPromptBodySchema
    }
  )
  .get(
    '/stories/:id/computed-timeline',
    async ({ params, set }) => {
      const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
      const timeline = await timelineService.loadTimeline(params.id);

      if (!timeline) {
        set.status = 404;
        return { error: 'Computed timeline not found', computed: false };
      }

      return { data: timeline, computed: true };
    },
    {
      params: StoryIdParamSchema
    }
  )
  .post(
    '/stories/:id/remix',
    async ({ params, set }) => {
      const storiesService = getInstance<StoriesService>(IocService.STORIES);
      const audioAssetsService = getInstance<AudioAssetsService>(IocService.AUDIO_ASSETS);
      const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
      const mixingOrchestrator = getInstance<StoryMixingOrchestrator>(IocService.STORY_MIXING_ORCHESTRATOR);
      const finalizationService = getInstance<StoryFinalizationService>(IocService.STORY_FINALIZATION);

      // Verify story exists and has a script
      const story = await storiesService.findById(params.id);
      if (!story) {
        set.status = 404;
        return { error: 'Story not found' };
      }

      if (!story.script) {
        set.status = 400;
        return { error: 'Story has no script - cannot remix without a script' };
      }

      // Load all audio assets for this story
      const allAssets = await audioAssetsService.findByStoryId(params.id);

      // Group assets by type
      const voiceAssets: AudioAssetWithDuration[] = [];
      const sfxAssets: AudioAssetWithDuration[] = [];
      const musicAssets: AudioAssetWithDuration[] = [];
      const ambianceAssets: AudioAssetWithDuration[] = [];

      for (const asset of allAssets) {
        // Extract segment ID from cache key (format: voice_{storyId}_{segmentId})
        const segmentId = asset.cacheKey?.split('_').pop() ?? asset.id;
        const assetWithDuration: AudioAssetWithDuration = {
          id: asset.id,
          segmentId,
          durationSeconds: asset.duration,
          url: asset.url
        };

        switch (asset.type) {
          case 'voice':
            voiceAssets.push(assetWithDuration);
            break;
          case 'sfx':
            sfxAssets.push(assetWithDuration);
            break;
          case 'music':
            musicAssets.push(assetWithDuration);
            break;
          case 'ambiance':
            ambianceAssets.push(assetWithDuration);
            break;
        }
      }

      if (voiceAssets.length === 0) {
        set.status = 400;
        return { error: 'Story has no voice assets - cannot remix without voice audio' };
      }

      // Recompute timeline with existing assets
      const computedTimeline = await timelineService.computeAndPersist({
        storyId: params.id,
        scriptVersion: 3,
        script: story.script as unknown as StoryScript,
        voiceAssets,
        sfxAssets,
        musicAssets,
        ambianceAssets
      });

      // Mix the audio
      const mixResult = await mixingOrchestrator.mixStoryV3({
        storyId: params.id,
        computedTimeline
      });

      // Upload final audio and update story
      const uploadResult = await finalizationService.uploadFinalAudio({
        storyId: params.id,
        tempMixedAudioUrl: mixResult.tempUrl,
        durationSeconds: mixResult.durationSeconds
      });

      // Finalize story (update DB status)
      await finalizationService.finalizeStoryRemix({
        storyId: params.id,
        finalAudioUrl: uploadResult.finalAudioUrl,
        durationSeconds: mixResult.durationSeconds
      });

      return {
        storyId: params.id,
        finalAudioUrl: uploadResult.finalAudioUrl,
        duration: mixResult.durationSeconds,
        message: 'Story remixed successfully'
      };
    },
    {
      params: StoryIdParamSchema
    }
  );
