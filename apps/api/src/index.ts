// Reflect-metadata must be imported first for Inversify decorators
import 'reflect-metadata';

import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { errorHandler } from './plugins/errorHandler';
import { profilesRoutes } from './routes/profiles';
import { storiesRoutes } from './routes/stories';
import { jobsRoutes } from './routes/jobs';
import { container } from './ioc';
import { IocInfrastructure } from './ioc/ioc.types';
import type { Logger } from './repositories/Logger';
import { ENV_DEFAULTS, environment } from '@mio/shared/constants/environment.constants';

// Export container for use in routes/handlers
export { container };

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Mio API',
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
      origin: environment.CORS_ORIGIN ?? ENV_DEFAULTS.CORS_ORIGIN,
      credentials: true,
    })
  )
  .use(errorHandler)
  .use(profilesRoutes)
  .use(storiesRoutes)
  .use(jobsRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(parseInt(environment.API_PORT ?? ENV_DEFAULTS.API_PORT, 10));

// Log server startup
const logger = container.get<Logger>(IocInfrastructure.LOGGER);
logger.info(`Mio API running at ${app.server?.hostname}:${app.server?.port}`);
logger.info(`Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export type App = typeof app;
