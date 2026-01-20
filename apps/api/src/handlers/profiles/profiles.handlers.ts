/**
 * Profiles Handlers
 *
 * Elysia routes for child profile management.
 */

import { Elysia } from 'elysia';

import { IocService, getInstance } from '../../ioc';
import type { IProfilesService } from '../../services/profiles';

import {
  CreateProfileBodySchema,
  ProfileIdParamsSchema,
  UpdateProfileBodySchema,
  type CreateProfileBody,
  type UpdateProfileBody,
} from './profiles.handlers.types';
import {
  mapProfileToResponse,
  mapProfilesToResponse,
  mapCreateBodyToInput,
  mapUpdateBodyToInput,
} from './profiles.handlers.map';

export const profilesHandlers = new Elysia({
  prefix: '/profiles',
  tags: ['profiles'],
})
  // List all profiles
  .get('/', async () => {
    const service = getInstance<IProfilesService>(IocService.PROFILES);
    const profiles = await service.getAll();
    return mapProfilesToResponse(profiles);
  })

  // Create a new profile
  .post(
    '/',
    async ({ body, set }) => {
      const service = getInstance<IProfilesService>(IocService.PROFILES);
      const input = mapCreateBodyToInput(body as CreateProfileBody);
      const profile = await service.create(input);
      set.status = 201;
      return mapProfileToResponse(profile);
    },
    {
      body: CreateProfileBodySchema,
    }
  )

  // Get a profile by ID
  .get(
    '/:id',
    async ({ params, set }) => {
      const service = getInstance<IProfilesService>(IocService.PROFILES);
      const profile = await service.getById(params.id);

      if (!profile) {
        set.status = 404;
        return { error: 'Profile not found' };
      }

      return mapProfileToResponse(profile);
    },
    {
      params: ProfileIdParamsSchema,
    }
  )

  // Update a profile
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const service = getInstance<IProfilesService>(IocService.PROFILES);
      const input = mapUpdateBodyToInput(body as UpdateProfileBody);
      const profile = await service.update(params.id, input);

      if (!profile) {
        set.status = 404;
        return { error: 'Profile not found' };
      }

      return mapProfileToResponse(profile);
    },
    {
      params: ProfileIdParamsSchema,
      body: UpdateProfileBodySchema,
    }
  )

  // Delete a profile
  .delete(
    '/:id',
    async ({ params, set }) => {
      const service = getInstance<IProfilesService>(IocService.PROFILES);
      const deleted = await service.delete(params.id);

      if (!deleted) {
        set.status = 404;
        return { error: 'Profile not found' };
      }

      set.status = 204;
      return null;
    },
    {
      params: ProfileIdParamsSchema,
    }
  );
