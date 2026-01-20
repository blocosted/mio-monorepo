/**
 * Stories Handler Mappers
 *
 * Maps between API request/response DTOs and service layer models.
 * Keep handlers thin: map request/response here.
 */

import type { StoryStatus } from '@mio/shared';
import type { CreateStoryInput, Story } from '../../services/stories';
import type { CreateStoryBody } from './stories.handlers.types';

/**
 * API Response DTO for a story (minimal)
 */
export interface StoryResponseDto {
  id: string;
  childProfileId: string;
  initialPrompt: string;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Map API request body to service input for creation
 */
export function mapCreateBodyToInput(body: CreateStoryBody): CreateStoryInput {
  return {
    childProfileId: body.childProfileId,
    prompt: body.prompt,
  };
}

/**
 * Map a service Story to API response DTO
 */
export function mapStoryToResponse(story: Story): StoryResponseDto {
  return {
    id: story.id,
    childProfileId: story.childProfileId,
    initialPrompt: story.initialPrompt,
    status: story.status,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

