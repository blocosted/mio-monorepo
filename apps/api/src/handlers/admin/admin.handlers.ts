/**
 * Admin Handlers
 *
 * API endpoints for backoffice admin operations.
 * Combines all admin sub-handlers into a single router.
 */

import { Elysia } from 'elysia';

import { voicesHandlers } from './voices';
import { audioLibraryHandlers } from './audio-library';
import { stepExecutionHandlers, storiesHandlers, voiceSelectionHandlers } from './stories';
import { profilesHandlers } from './profiles';

export const adminHandlers = new Elysia({ prefix: '/admin', tags: ['admin'] })
  .use(voicesHandlers)
  .use(audioLibraryHandlers)
  .use(storiesHandlers)
  .use(stepExecutionHandlers)
  .use(voiceSelectionHandlers)
  .use(profilesHandlers);
