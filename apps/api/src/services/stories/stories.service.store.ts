/**
 * Stories Store Implementation
 *
 * Data access layer for stories using Drizzle ORM.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq } from 'drizzle-orm';

import { stories } from '@mio/db/schema';

import { IocConnection } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type {
    CreateStoryRowInput,
    IStoriesStore,
    StoryRow,
    EnrichedConcept,
} from './stories.service.types';
import { StoryStatus, type StoryScript } from '@mio/shared/types';

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

    /**
     * Find a story by ID
     */
    async findById(id: string): Promise<typeof stories.$inferSelect | null> {
        const [story] = await this.db
            .select()
            .from(stories)
            .where(eq(stories.id, id))
            .limit(1);

        return story || null;
    }

    /**
     * Update enriched concept for a story
     */
    async updateEnrichedConcept(id: string, enrichedConcept: EnrichedConcept): Promise<void> {
        await this.db
            .update(stories)
            .set({
                enrichedConcept,
                updatedAt: new Date(),
            })
            .where(eq(stories.id, id));
    }

    /**
     * Update script for a story
     * Note: Accepts any script structure (old or new) as it's stored as JSONB
     */
    async updateScript(id: string, script: any): Promise<void> {
        await this.db
            .update(stories)
            .set({
                script,
                status: StoryStatus.Generating,
                updatedAt: new Date(),
            })
            .where(eq(stories.id, id));
    }

    /**
     * Finalize a story with final audio URL and duration
     */
    async finalize(id: string, input: { finalAudioUrl: string; duration: number }): Promise<void> {
        await this.db
            .update(stories)
            .set({
                finalAudioUrl: input.finalAudioUrl,
                duration: Math.round(input.duration),
                status: StoryStatus.Ready,
                updatedAt: new Date(),
            })
            .where(eq(stories.id, id));
    }
}
