/**
 * Audio Library Admin Handlers
 *
 * API endpoints for SFX, Ambiance, and Music admin operations.
 */

import { Elysia } from 'elysia';

import type {
  SfxLibraryCategory,
  SfxEnvironment,
  AudioIntensity,
  AmbianceEnvironment,
  TimeOfDay,
  WeatherCondition,
  AudioMood,
  MusicMood,
  MusicIntensity,
  MusicTempo
} from '@mio/shared/types';

import { IocService } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import type { SfxLibraryService } from '../../../services/sound-design/sfx-library.service';
import type { AmbianceLibraryService } from '../../../services/ambiance/ambiance-library.service';
import type { MusicLibraryService } from '../../../services/music/music-library.service';
import { SfxFilterQuerySchema, AmbianceFilterQuerySchema, MusicFilterQuerySchema } from './audio-library.handlers.types';

export const audioLibraryHandlers = new Elysia({ prefix: '/audio-library', tags: ['admin'] })
  .get(
    '/sfx',
    async ({ query }) => {
      const sfxService = getInstance<SfxLibraryService>(IocService.SFX_LIBRARY);

      const result = await sfxService.findPaginated(
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
    '/ambiance',
    async ({ query }) => {
      const ambianceService = getInstance<AmbianceLibraryService>(IocService.AMBIANCE_LIBRARY);

      const result = await ambianceService.findPaginated(
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
    '/music',
    async ({ query }) => {
      const musicService = getInstance<MusicLibraryService>(IocService.MUSIC_LIBRARY);

      const result = await musicService.findPaginated(
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
  );
