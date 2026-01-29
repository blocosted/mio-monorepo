/**
 * Stories Service Mappers
 *
 * Maps between store layer rows and service layer models.
 */

import type { Story, StoryRow } from './stories.service.types';

/**
 * Map a database StoryRow to a service Story
 */
export function mapRowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    childProfileId: row.childProfileId,
    initialPrompt: row.initialPrompt,
    targetDurationMinutes: row.targetDurationMinutes,
    enrichedConcept: row.enrichedConcept,
    script: row.script,
    answers: row.answers,
    finalAudioUrl: row.finalAudioUrl,
    duration: row.duration,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
