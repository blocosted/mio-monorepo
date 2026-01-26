/**
 * Profiles Admin Handlers
 *
 * API endpoints for profiles admin operations.
 */

import { Elysia } from 'elysia';

import type { Gender } from '@mio/shared/types';

import { IocService } from '../../../ioc/ioc.types';
import { getInstance } from '../../../ioc/ioc.config';
import type { ProfilesService } from '../../../services/profiles/profiles.service';
import { CreateAdminProfileBodySchema, ProfileFilterQuerySchema } from './profiles.handlers.types';

export const profilesHandlers = new Elysia({ tags: ['admin'] })
  .get(
    '/profiles',
    async ({ query }) => {
      const profilesService = getInstance<ProfilesService>(IocService.PROFILES);

      const result = await profilesService.findPaginated(
        {
          gender: query.gender as Gender | undefined,
          search: query.search,
          isTest: query.isTest
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
  .post(
    '/profiles',
    async ({ body }) => {
      const profilesService = getInstance<ProfilesService>(IocService.PROFILES);

      const profile = await profilesService.create({
        firstName: body.firstName,
        age: body.age,
        gender: body.gender,
        isTest: true
      });

      return profile;
    },
    {
      body: CreateAdminProfileBodySchema
    }
  );
