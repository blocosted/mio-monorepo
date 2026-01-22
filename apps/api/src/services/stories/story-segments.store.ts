/**
 * Story Segments Store
 *
 * Data access layer for story segments table.
 * Handles CRUD operations for story segments (narration, dialogue, sfx, etc.).
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq, and, asc } from 'drizzle-orm';

import { storySegments } from '@mio/db/schema';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { IocConnection } from '../../ioc';
import { SegmentType } from '@mio/shared';

/**
 * Story segment row from database
 */
export type StorySegmentRow = typeof storySegments.$inferSelect;

/**
 * Input for creating a story segment
 */
export interface CreateStorySegmentInput {
    storyId: string;
    order: number;
    type: SegmentType;
    content: Record<string, unknown>;
    audioUrl?: string;
    duration?: number;
}

/**
 * Input for updating a story segment
 */
export interface UpdateStorySegmentInput {
    audioUrl?: string;
    duration?: number;
    content?: Record<string, unknown>;
}

/**
 * Story Segments Store
 *
 * Provides data access methods for story segments.
 */
@injectable()
export class StorySegmentsStore {
    constructor(
        @inject(IocConnection.DATABASE)
        private readonly db: DatabaseConnection,
    ) {}

    /**
     * Create a new story segment
     */
    async create(input: CreateStorySegmentInput): Promise<StorySegmentRow> {
        const [segment] = await this.db
            .insert(storySegments)
            .values({
                storyId: input.storyId,
                order: input.order,
                type: input.type,
                content: input.content,
                audioUrl: input.audioUrl,
                duration: input.duration,
            })
            .returning();

        if (!segment) {
            throw new Error('Failed to create story segment');
        }

        return segment;
    }

    /**
     * Find all segments for a story, ordered by sequence
     */
    async findByStoryId(storyId: string): Promise<StorySegmentRow[]> {
        return this.db
            .select()
            .from(storySegments)
            .where(eq(storySegments.storyId, storyId))
            .orderBy(asc(storySegments.order));
    }

    /**
     * Find a specific segment by ID
     */
    async findById(id: string): Promise<StorySegmentRow | null> {
        const [segment] = await this.db
            .select()
            .from(storySegments)
            .where(eq(storySegments.id, id))
            .limit(1);

        return segment || null;
    }

    /**
     * Update a story segment
     */
    async update(id: string, input: UpdateStorySegmentInput): Promise<StorySegmentRow | null> {
        const [segment] = await this.db
            .update(storySegments)
            .set({
                audioUrl: input.audioUrl,
                duration: input.duration,
                content: input.content,
            })
            .where(eq(storySegments.id, id))
            .returning();

        return segment || null;
    }

    /**
     * Delete a story segment
     */
    async delete(id: string): Promise<void> {
        await this.db
            .delete(storySegments)
            .where(eq(storySegments.id, id));
    }

    /**
     * Delete all segments for a story
     */
    async deleteByStoryId(storyId: string): Promise<void> {
        await this.db
            .delete(storySegments)
            .where(eq(storySegments.storyId, storyId));
    }

    /**
     * Count segments for a story
     */
    async countByStoryId(storyId: string): Promise<number> {
        const segments = await this.findByStoryId(storyId);
        return segments.length;
    }

    /**
     * Find segments by type for a story
     */
    async findByStoryIdAndType(storyId: string, type: SegmentType): Promise<StorySegmentRow[]> {
        return this.db
            .select()
            .from(storySegments)
            .where(
                and(
                    eq(storySegments.storyId, storyId),
                    eq(storySegments.type, type)
                )
            )
            .orderBy(asc(storySegments.order));
    }
}
