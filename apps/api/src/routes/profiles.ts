import { Elysia, t } from 'elysia';

export const profilesRoutes = new Elysia({ prefix: '/profiles', tags: ['profiles'] })
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
      body: t.Object({
        firstName: t.String({ minLength: 1, maxLength: 50 }),
        age: t.Number({ minimum: 3, maximum: 12 }),
        gender: t.Union([t.Literal('boy'), t.Literal('girl'), t.Literal('neutral')]),
        preferences: t.Optional(
          t.Object({
            favoriteThemes: t.Optional(t.Array(t.String())),
            avoidThemes: t.Optional(t.Array(t.String())),
            includeChildAsCharacter: t.Optional(t.Boolean()),
            preferredHeroGender: t.Optional(t.Union([t.Literal('same'), t.Literal('any')])),
            preferredStoryDuration: t.Optional(
              t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')])
            ),
            narratorVoicePreference: t.Optional(
              t.Union([t.Literal('male'), t.Literal('female'), t.Literal('any')])
            ),
            language: t.Optional(t.Union([t.Literal('fr'), t.Literal('en')])),
          })
        ),
      }),
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Partial(
        t.Object({
          firstName: t.String({ minLength: 1, maxLength: 50 }),
          age: t.Number({ minimum: 3, maximum: 12 }),
          gender: t.Union([t.Literal('boy'), t.Literal('girl'), t.Literal('neutral')]),
          preferences: t.Object({
            favoriteThemes: t.Optional(t.Array(t.String())),
            avoidThemes: t.Optional(t.Array(t.String())),
            includeChildAsCharacter: t.Optional(t.Boolean()),
            preferredHeroGender: t.Optional(t.Union([t.Literal('same'), t.Literal('any')])),
            preferredStoryDuration: t.Optional(
              t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')])
            ),
            narratorVoicePreference: t.Optional(
              t.Union([t.Literal('male'), t.Literal('female'), t.Literal('any')])
            ),
            language: t.Optional(t.Union([t.Literal('fr'), t.Literal('en')])),
          }),
        })
      ),
    }
  );
