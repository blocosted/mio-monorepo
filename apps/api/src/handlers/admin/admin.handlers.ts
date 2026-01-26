/**
 * Admin Handlers
 *
 * API endpoints for backoffice admin operations.
 * All endpoints support cursor-based pagination.
 */

import { Elysia } from 'elysia';

import type { VoiceAge, VoiceGender, VoiceUseCase, SfxLibraryCategory, SfxEnvironment, AudioIntensity, AmbianceEnvironment, TimeOfDay, WeatherCondition, AudioMood, MusicMood, MusicIntensity, MusicTempo, StoryStatus, Gender } from '@mio/shared/types';

import { IocStore } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';
import type { VoiceRegistryStore } from '../../services/narration/voice-registry.store';
import type { SfxLibraryStore } from '../../services/sound-design/sfx-library.store';
import type { AmbianceLibraryStore } from '../../services/ambiance/ambiance-library.store';
import type { MusicLibraryStore } from '../../services/music/music-library.store';
import type { StoriesStore } from '../../services/stories/stories.service.store';
import type { ProfilesStore } from '../../services/profiles/profiles.service.store';
import type { AudioAssetsStore } from '../../services/stories/audio-assets.store';
import type { StorySegmentsStore } from '../../services/stories/story-segments.store';
import {
  VoiceFilterQuerySchema,
  SfxFilterQuerySchema,
  AmbianceFilterQuerySchema,
  MusicFilterQuerySchema,
  StoryFilterQuerySchema,
  ProfileFilterQuerySchema,
  StoryIdParamSchema,
  UpdateStoryPromptBodySchema
} from './admin.handlers.types';

export const adminHandlers = new Elysia({ prefix: '/admin', tags: ['admin'] })
  .get(
    '/voices',
    async ({ query }) => {
      const voiceStore = getInstance<VoiceRegistryStore>(IocStore.VOICE_REGISTRY_STORE);

      const result = await voiceStore.findPaginated(
        {
          gender: query.gender as VoiceGender | undefined,
          age: query.age as VoiceAge | undefined,
          language: query.language,
          useCase: query.useCase as VoiceUseCase | undefined,
          isHighQuality: query.isHighQuality,
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
      query: VoiceFilterQuerySchema
    }
  )
  .get(
    '/audio-library/sfx',
    async ({ query }) => {
      const sfxStore = getInstance<SfxLibraryStore>(IocStore.SFX_LIBRARY_STORE);

      const result = await sfxStore.findPaginated(
        {
          category: query.category as SfxLibraryCategory | undefined,
          subcategory: query.subcategory,
          environment: query.environment as SfxEnvironment | undefined,
          intensity: query.intensity as AudioIntensity | undefined,
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
      query: SfxFilterQuerySchema
    }
  )
  .get(
    '/audio-library/ambiance',
    async ({ query }) => {
      const ambianceStore = getInstance<AmbianceLibraryStore>(IocStore.AMBIANCE_LIBRARY_STORE);

      const result = await ambianceStore.findPaginated(
        {
          environment: query.environment as AmbianceEnvironment | undefined,
          subEnvironment: query.subEnvironment,
          timeOfDay: query.timeOfDay as TimeOfDay | undefined,
          weather: query.weather as WeatherCondition | undefined,
          mood: query.mood as AudioMood | undefined,
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
      query: AmbianceFilterQuerySchema
    }
  )
  .get(
    '/audio-library/music',
    async ({ query }) => {
      const musicStore = getInstance<MusicLibraryStore>(IocStore.MUSIC_LIBRARY_STORE);

      const result = await musicStore.findPaginated(
        {
          mood: query.mood as MusicMood | undefined,
          intensity: query.intensity as MusicIntensity | undefined,
          tempo: query.tempo as MusicTempo | undefined,
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
      query: MusicFilterQuerySchema
    }
  )
  .get(
    '/stories',
    async ({ query }) => {
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

      const result = await storiesStore.findPaginated(
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
    '/profiles',
    async ({ query }) => {
      const profilesStore = getInstance<ProfilesStore>(IocStore.PROFILES_STORE);

      const result = await profilesStore.findPaginated(
        {
          gender: query.gender as Gender | undefined,
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
      query: ProfileFilterQuerySchema
    }
  )
  // Get a single story with full details
  .get(
    '/stories/:id',
    async ({ params, set }) => {
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);
      const story = await storiesStore.findById(params.id);

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
  // Get story segments
  .get(
    '/stories/:id/segments',
    async ({ params }) => {
      const segmentsStore = getInstance<StorySegmentsStore>(IocStore.STORY_SEGMENTS_STORE);
      const segments = await segmentsStore.findByStoryId(params.id);

      return { data: segments };
    },
    {
      params: StoryIdParamSchema
    }
  )
  // Get story audio assets
  .get(
    '/stories/:id/audio-assets',
    async ({ params }) => {
      const audioAssetsStore = getInstance<AudioAssetsStore>(IocStore.AUDIO_ASSETS_STORE);
      const assets = await audioAssetsStore.findByStoryId(params.id);

      return { data: assets };
    },
    {
      params: StoryIdParamSchema
    }
  )
  // Update story prompt
  .patch(
    '/stories/:id',
    async ({ params, body, set }) => {
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

      const story = await storiesStore.findById(params.id);
      if (!story) {
        set.status = 404;
        return { error: 'Story not found' };
      }

      if (story.status !== 'draft') {
        set.status = 400;
        return { error: 'Can only edit prompt for draft stories' };
      }

      await storiesStore.updatePrompt(params.id, body.prompt);

      return { id: params.id, prompt: body.prompt };
    },
    {
      params: StoryIdParamSchema,
      body: UpdateStoryPromptBodySchema
    }
  );
