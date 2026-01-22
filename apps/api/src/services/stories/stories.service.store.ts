/**
 * Stories Store Implementation
 *
 * Data access layer for stories using Drizzle ORM.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { stories } from '@mio/db/schema';

import { IocConnection } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type {
    CreateStoryRowInput,
    IStoriesStore,
    StoryRow,
} from './stories.service.types';

@injectable()
export class StoriesStore implements IStoriesStore {
    constructor(
        @inject(IocConnection.DATABASE)
        private readonly db: DatabaseConnection
    ) { }

    /**
     * Insert a new story
     */
    async insert(input: CreateStoryRowInput): Promise<StoryRow> {
        const result = await this.db
            .insert(stories)
            .values({
                childProfileId: input.childProfileId,
                initialPrompt: input.initialPrompt,
            })
            .returning();

        const row = result[0];
        if (!row) {
            throw new Error('Failed to insert story');
        }

        return {
            id: row.id,
            childProfileId: row.childProfileId,
            initialPrompt: row.initialPrompt,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}
