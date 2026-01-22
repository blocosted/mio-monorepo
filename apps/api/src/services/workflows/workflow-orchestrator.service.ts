/**
 * Workflow Orchestrator Service
 *
 * Orchestrates workflow execution by triggering QStash workflows via HTTP.
 */

import { injectable, inject } from 'inversify';
import type { Logger } from '@mio/shared/server/logger/Logger';
import { environment } from '@mio/shared/constants/environment.constants';
import type {
    IWorkflowOrchestratorService,
    TriggerWorkflowResult,
} from './workflow-orchestrator.service.types';
import type { StoryGenerationWorkflowContext } from '../../workflows/story-generation/story-generation.workflow.types';
import { getWorkflowClient } from '../../workflows/workflow.client';
import { IocConnection } from '../../ioc';

@injectable()
export class WorkflowOrchestratorService implements IWorkflowOrchestratorService {
    private readonly logger: Logger;
    private readonly workflowBaseUrl: string;

    constructor(@inject(IocConnection.LOGGER) logger: Logger) {
        this.logger = logger;
        this.workflowBaseUrl = environment.WORKFLOW_BASE_URL ?? 'http://localhost:3001';
    }

    /**
     * Trigger the story generation workflow
     */
    async triggerStoryGeneration(
        input: StoryGenerationWorkflowContext
    ): Promise<TriggerWorkflowResult> {
        const workflowUrl = `${this.workflowBaseUrl}/workflows/story-generation`;

        this.logger.info('Triggering story generation workflow', {
            jobId: input.jobId,
            storyId: input.storyId,
            workflowUrl,
        });

        try {
            const client = getWorkflowClient();

            // Trigger workflow via QStash HTTP call
            const result = await client.trigger({
                url: workflowUrl,
                body: input,
            });

            const workflowRunId = result.workflowRunId;

            this.logger.info('Workflow triggered successfully', {
                jobId: input.jobId,
                workflowRunId,
            });

            return {
                workflowRunId,
                jobId: input.jobId,
            };
        } catch (error) {
            this.logger.error('Failed to trigger workflow', {
                jobId: input.jobId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Cancel a running workflow
     */
    async cancelWorkflow(workflowRunId: string): Promise<void> {
        this.logger.info('Cancelling workflow', { workflowRunId });

        try {
            const client = getWorkflowClient();

            await client.cancel({
                ids: workflowRunId,
            });

            this.logger.info('Workflow cancelled successfully', { workflowRunId });
        } catch (error) {
            this.logger.error('Failed to cancel workflow', {
                workflowRunId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
