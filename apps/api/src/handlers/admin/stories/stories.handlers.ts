/**
 * Stories Admin Handlers
 *
 * API endpoints for stories admin operations.
 */

import { Elysia } from 'elysia';

import type { StoryStatus } from '@mio/shared/types';

import { IocService } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import type { StoriesService } from '../../../services/stories/stories.service';
import type { AudioAssetsService } from '../../../services/stories/audio-assets.service';
import type { StorySegmentsService } from '../../../services/stories/story-segments.service';
import { StoryFilterQuerySchema, StoryIdParamSchema, UpdateStoryPromptBodySchema } from './stories.handlers.types';

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
  );
