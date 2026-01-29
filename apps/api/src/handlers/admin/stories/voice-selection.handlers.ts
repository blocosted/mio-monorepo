/**
 * Voice Selection Handlers
 *
 * API endpoints for manual voice selection in the admin workflow.
 */

import { Elysia } from 'elysia';

import type { VoiceSelectionService } from '../../../services/narration/voice-selection.service';
import { getInstance, IocService } from '../../../ioc';
import {
  UpdateVoiceAssignmentsBodySchema,
  VoiceSelectionStoryIdParamSchema
} from './voice-selection.handlers.types';

export const voiceSelectionHandlers = new Elysia({ tags: ['admin'] })
  /**
   * Get characters with current voice assignments and recommendations
   *
   * Returns all characters from the story script with:
   * - Current voice assignment (if any)
   * - Recommended voices based on character description
   */
  .get(
    '/stories/:id/characters',
    async ({ params, set }) => {
      const voiceSelection = getInstance<VoiceSelectionService>(IocService.VOICE_SELECTION);

      try {
        const result = await voiceSelection.getCharactersWithRecommendations({
          storyId: params.id
        });

        return {
          data: result.characters,
          storyLanguage: result.storyLanguage
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('NotFound')) {
          set.status = 404;
          return { error: 'Story not found' };
        }
        if (error instanceof Error && error.message.includes('ScriptNotGenerated')) {
          set.status = 400;
          return { error: 'Story script must be generated before voice selection' };
        }
        throw error;
      }
    },
    {
      params: VoiceSelectionStoryIdParamSchema
    }
  )
  /**
   * Update voice assignments for characters
   *
   * Allows manual selection of voices for story characters.
   * Partial updates are supported - only specified characters are updated.
   */
  .patch(
    '/stories/:id/voices',
    async ({ params, body, set }) => {
      const voiceSelection = getInstance<VoiceSelectionService>(IocService.VOICE_SELECTION);

      try {
        const result = await voiceSelection.updateVoiceAssignments({
          storyId: params.id,
          voiceAssignments: body.voiceAssignments
        });

        return {
          success: result.success,
          updatedCount: result.updatedCount,
          characters: result.characters
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('StoryNotFound')) {
          set.status = 404;
          return { error: 'Story not found' };
        }
        if (error instanceof Error && error.message.includes('VoiceNotFound')) {
          set.status = 404;
          return { error: 'Voice not found' };
        }
        if (error instanceof Error && error.message.includes('ScriptNotGenerated')) {
          set.status = 400;
          return { error: 'Story script must be generated before voice assignment' };
        }
        if (error instanceof Error && error.message.includes('CharacterNotFound')) {
          set.status = 400;
          return { error: 'Character not found in story' };
        }
        throw error;
      }
    },
    {
      params: VoiceSelectionStoryIdParamSchema,
      body: UpdateVoiceAssignmentsBodySchema
    }
  );
