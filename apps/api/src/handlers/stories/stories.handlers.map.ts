/**
 * Stories Handler Mappers
 *
 * Maps between API request/response DTOs and service layer models.
 * Keep handlers thin: map request/response here.
 */

import type { CreateStoryInput, Story } from '../../services/stories';
import type { CreateStoryBody, StoryResponse } from '@mio/shared/clients/mio/stories';

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
export function mapStoryToResponse(story: Story): StoryResponse {
  return {
    id: story.id,
    childProfileId: story.childProfileId,
    initialPrompt: story.initialPrompt,
    status: story.status,
    finalAudioUrl: story.finalAudioUrl,
    duration: story.duration,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

