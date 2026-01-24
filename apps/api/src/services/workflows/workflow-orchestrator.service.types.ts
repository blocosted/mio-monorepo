/**
 * Workflow Orchestrator Service Types
 *
 * Defines interfaces for triggering and managing workflows.
 */

import type { StoryGenerationWorkflowContext } from '../../workflows/story-generation/story-generation.workflow.types';

/**
 * Result of triggering a workflow
 */
export interface TriggerWorkflowResult {
  /** Workflow run ID from QStash */
  workflowRunId: string;

  /** Job ID for progress tracking */
  jobId: string;
}

