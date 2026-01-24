/**
 * API Server Factory
 *
 * Exposes a function to create the Elysia app without side effects (no listen, no logs).
 * This enables reuse for:
 * - production entrypoint (`src/index.ts`)
 * - handler tests via `treaty(app)` (Eden)
 */

// Reflect-metadata must be imported first for Inversify decorators
import 'reflect-metadata';

import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';

import { ENV_DEFAULTS, environment } from '@mio/shared/constants/environment.constants';

import { jobsHandlers, profilesHandlers, storiesHandlers } from './handlers';
import { workflowsHandlers } from './handlers/workflows';
import { errorHandler } from './plugins/errorHandler';

export function createApiApp() {
  return new Elysia()
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Mio API',
            version: '1.0.0',
            description: 'API for generating personalized audio stories for children'
          },
          tags: [
            { name: 'profiles', description: 'Child profile management' },
            { name: 'stories', description: 'Story generation and management' },
            { name: 'jobs', description: 'Generation job tracking' },
            { name: 'workflows', description: 'Upstash Workflow execution (QStash callbacks)' }
          ]
        }
      })
    )
    .use(
      cors({
        origin: environment.CORS_ORIGIN ?? ENV_DEFAULTS.CORS_ORIGIN,
        credentials: true
      })
    )
    .use(errorHandler)
    .use(profilesHandlers)
    .use(storiesHandlers)
    .use(jobsHandlers)
    .use(workflowsHandlers)
    .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));
}

export type MioApi = ReturnType<typeof createApiApp>;
