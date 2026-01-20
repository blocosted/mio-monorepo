import { Elysia, t } from 'elysia';

export const storiesRoutes = new Elysia({ prefix: '/stories', tags: ['stories'] })
  // Create a new story
  .post(
    '/',
    async ({ body }) => {
      // TODO: Implement with database - verify profile exists
      return {
        id: crypto.randomUUID(),
        childProfileId: body.childProfileId,
        initialPrompt: body.prompt,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        childProfileId: t.String({ format: 'uuid' }),
        prompt: t.String({ minLength: 3, maxLength: 500 }),
      }),
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
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
      params: t.Object({
        profileId: t.String({ format: 'uuid' }),
      }),
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        duration: t.Optional(
          t.Union([t.Literal('2min'), t.Literal('5min'), t.Literal('10min')])
        ),
      }),
    }
  )

  // Generate a story (launch workflow)
  .post(
    '/:id/generate',
    async () => {
      // TODO: Implement with Upstash Workflow
      const jobId = crypto.randomUUID();
      return {
        jobId,
        message: 'Story generation started',
      };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        answers: t.Array(
          t.Object({
            questionId: t.String(),
            value: t.String(),
          })
        ),
      }),
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    }
  );
