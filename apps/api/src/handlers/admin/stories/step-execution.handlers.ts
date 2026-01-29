/**
 * Step Execution Handlers
 *
 * API endpoints for manual phase execution in the admin workflow.
 */

import { Elysia, t } from 'elysia';

import type { StoriesStore, StepExecutionService, WorkflowPhase } from '../../../services/stories';
import { getInstance, IocService, IocStore } from '../../../ioc';
import {
  ExecutePhaseBodySchema,
  PhaseParamSchema,
  StoryIdParamSchema,
  UpdateStorySettingsBodySchema
} from './step-execution.handlers.types';

export const stepExecutionHandlers = new Elysia({ tags: ['admin'] })
  /**
   * Get all phase states for a story
   */
  .get(
    '/stories/:id/phases',
    async ({ params, set }) => {
      const stepExecution = getInstance<StepExecutionService>(IocService.STEP_EXECUTION);

      try {
        const states = await stepExecution.getPhaseStates(params.id);
        return { data: states };
      } catch (error) {
        if (error instanceof Error && error.message.includes('NotFound')) {
          set.status = 404;
          return { error: 'Story not found' };
        }
        throw error;
      }
    },
    {
      params: StoryIdParamSchema
    }
  )
  /**
   * Execute a specific phase
   */
  .post(
    '/stories/:id/phases/:phase/execute',
    async ({ params, body, set }) => {
      const stepExecution = getInstance<StepExecutionService>(IocService.STEP_EXECUTION);

      try {
        const result = await stepExecution.executePhase({
          storyId: params.id,
          phase: params.phase as WorkflowPhase,
          targetDurationMinutes: body?.targetDurationMinutes
        });

        if (!result.success) {
          set.status = 500;
          return {
            error: result.error ?? 'Phase execution failed',
            phase: result.phase
          };
        }

        set.status = 202;
        return {
          success: true,
          phase: result.phase,
          nextPhase: result.nextPhase,
          stepsCompleted: result.stepsCompleted,
          output: result.output
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('NotFound')) {
          set.status = 404;
          return { error: 'Story not found' };
        }
        if (error instanceof Error && error.message.includes('PhaseCannotExecute')) {
          set.status = 400;
          return { error: 'Previous phases must be completed first' };
        }
        throw error;
      }
    },
    {
      params: PhaseParamSchema,
      body: ExecutePhaseBodySchema
    }
  )
  /**
   * Reset story to a specific phase
   */
  .post(
    '/stories/:id/phases/:phase/reset',
    async ({ params, set }) => {
      const stepExecution = getInstance<StepExecutionService>(IocService.STEP_EXECUTION);

      try {
        const result = await stepExecution.resetToPhase({
          storyId: params.id,
          phase: params.phase as WorkflowPhase
        });

        return {
          success: true,
          phase: result.phase,
          phasesReset: result.phasesReset
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('NotFound')) {
          set.status = 404;
          return { error: 'Story not found' };
        }
        throw error;
      }
    },
    {
      params: PhaseParamSchema
    }
  )
  /**
   * Update story settings (targetDurationMinutes, etc.)
   */
  .patch(
    '/stories/:id/settings',
    async ({ params, body, set }) => {
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

      try {
        const story = await storiesStore.findById(params.id);
        if (!story) {
          set.status = 404;
          return { error: 'Story not found' };
        }

        if (body.targetDurationMinutes !== undefined) {
          await storiesStore.updateTargetDuration(params.id, body.targetDurationMinutes);
        }

        const updatedStory = await storiesStore.findById(params.id);

        return {
          success: true,
          targetDurationMinutes: updatedStory?.targetDurationMinutes
        };
      } catch (error) {
        throw error;
      }
    },
    {
      params: StoryIdParamSchema,
      body: UpdateStorySettingsBodySchema
    }
  );
