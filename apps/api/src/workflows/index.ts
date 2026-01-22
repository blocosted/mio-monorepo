/**
 * Workflows Module
 *
 * Exports workflow client and workflow definitions.
 */

export { getWorkflowClient, resetWorkflowClient } from './workflow.client';

// Workflow definitions
export { storyGenerationWorkflow } from './story-generation/story-generation.workflow';
export type { StoryGenerationWorkflowContext } from './story-generation/story-generation.workflow.types';
