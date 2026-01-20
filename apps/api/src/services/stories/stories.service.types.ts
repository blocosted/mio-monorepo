/**
 * Stories Service Types
 *
 * Defines interfaces and types for the stories service layer.
 * Uses only primitive/shared types (enum-like literals) from @mio/shared.
 */

import type { StoryStatus } from '@mio/shared';

/**
 * Service-layer story model (service owns this interface)
 */
export interface Story {
    id: string;
    childProfileId: string;
    initialPrompt: string;
    status: StoryStatus;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Service-layer input for story creation
 */
export interface CreateStoryInput {
    childProfileId: string;
    prompt: string;
}

/**
 * Store-layer input for story insert
 */
export interface CreateStoryRowInput {
    childProfileId: string;
    initialPrompt: string;
}

/**
 * Stories Service Interface
 */
export interface IStoriesService {
    /**
     * Create a new story from an initial prompt
     */
    create(input: CreateStoryInput): Promise<Story>;
}

/**
 * Stories Store Interface (data access layer)
 */
export interface IStoriesStore {
    /**
     * Insert a new story row
     */
    insert(input: CreateStoryRowInput): Promise<StoryRow>;
}

/**
 * Database row representation
 */
export interface StoryRow {
    id: string;
    childProfileId: string;
    initialPrompt: string;
    status: StoryStatus;
    createdAt: Date;
    updatedAt: Date;
}
