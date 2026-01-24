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

/**
 * Workflow Orchestrator Service Interface
 */
export interface IWorkflowOrchestratorService {
  /**
   * Trigger the story generation workflow
   *
   * @param input - Workflow input context
   * @returns Workflow run ID and job ID
   */
  triggerStoryGeneration(input: StoryGenerationWorkflowContext): Promise<TriggerWorkflowResult>;

  /**
   * Cancel a running workflow
   *
   * @param workflowRunId - QStash workflow run ID
   */
  cancelWorkflow(workflowRunId: string): Promise<void>;
}
