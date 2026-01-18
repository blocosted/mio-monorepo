import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { errorHandler } from './plugins/errorHandler';
import { profilesRoutes } from './routes/profiles';
import { storiesRoutes } from './routes/stories';
import { jobsRoutes } from './routes/jobs';

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'StoryForge Kids API',
          version: '1.0.0',
          description: 'API for generating personalized audio stories for children',
        },
        tags: [
          { name: 'profiles', description: 'Child profile management' },
          { name: 'stories', description: 'Story generation and management' },
          { name: 'jobs', description: 'Generation job tracking' },
        ],
      },
    })
  )
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  )
  .use(errorHandler)
  .use(profilesRoutes)
  .use(storiesRoutes)
  .use(jobsRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(process.env.PORT || 3001);

console.log(`🦊 StoryForge API running at ${app.server?.hostname}:${app.server?.port}`);
console.log(`📚 Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export type App = typeof app;
