import { Elysia } from 'elysia';

import {
  CreateProfileBodySchema,
  ProfileIdParamsSchema,
  UpdateProfileBodySchema,
} from './profiles.handlers.types';

export const profilesHandlers = new Elysia({
  prefix: '/profiles',
  tags: ['profiles'],
})
  // List all profiles
  .get('/', async () => {
    // TODO: Implement with database
    return [];
  })

  // Create a new profile
  .post(
    '/',
    async ({ body }) => {
      // TODO: Implement with database
      return {
        id: crypto.randomUUID(),
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    {
      body: CreateProfileBodySchema,
    }
  )

  // Get a profile by ID
  .get(
    '/:id',
    async ({ params }) => {
      // TODO: Implement with database
      return {
        id: params.id,
        firstName: 'Emma',
        age: 7,
        gender: 'girl',
        preferences: {},
        stories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    {
      params: ProfileIdParamsSchema,
    }
  )

  // Update a profile
  .patch(
    '/:id',
    async ({ params, body }) => {
      // TODO: Implement with database
      return {
        id: params.id,
        ...body,
        updatedAt: new Date().toISOString(),
      };
    },
    {
      params: ProfileIdParamsSchema,
      body: UpdateProfileBodySchema,
    }
  );

