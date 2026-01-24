/**
 * Workflows Handlers
 *
 * HTTP endpoints for Upstash Workflow callbacks.
 * These endpoints are called by QStash to execute workflow steps.
 */

import { Elysia } from 'elysia';

import { storyGenerationWorkflow } from '../../workflows/story-generation/story-generation.workflow';

/**
 * Workflows HTTP handlers
 *
 * IMPORTANT: These endpoints are called by QStash, not by frontend clients.
 * They serve the workflow definitions to be executed by Upstash Workflow.
 */
export const workflowsHandlers = new Elysia({ prefix: '/workflows', tags: ['workflows'] })
  /**
   * Story Generation Workflow Endpoint
   *
   * This endpoint is called by QStash to execute the story generation workflow.
   * It receives the workflow context and orchestrates the 9-step generation process.
   */
  .post('/story-generation', async ({ request }) => {
    return await storyGenerationWorkflow.handler(request);
  });
