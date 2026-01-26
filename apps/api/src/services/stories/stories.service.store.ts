/**
 * Stories Store Implementation
 *
 * Data access layer for stories using Drizzle ORM.
 */

import 'reflect-metadata';

import { and, desc, eq, gt, ilike, type SQL } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { stories } from '@mio/db/schema';
import { clampLimit, StoryStatus } from '@mio/shared/types';

import type { CreateStoryRowInput, EnrichedConcept, PaginatedStoriesResult, StoryFilterOptions, StoryPaginationOptions, StoryRow } from './stories.service.types';
import { IocConnection } from '../../ioc/ioc.types';

@injectable()
export class StoriesStore {
  constructor(
    @inject(IocConnection.DATABASE)
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Insert a new story
   */
  async insert(input: CreateStoryRowInput): Promise<StoryRow> {
    const result = await this.db
      .insert(stories)
      .values({
        childProfileId: input.childProfileId,
        initialPrompt: input.initialPrompt
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
      finalAudioUrl: row.finalAudioUrl,
      duration: row.duration,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Find a story by ID
   */
  async findById(id: string): Promise<typeof stories.$inferSelect | null> {
    const [story] = await this.db.select().from(stories).where(eq(stories.id, id)).limit(1);

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
        updatedAt: new Date()
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
        updatedAt: new Date()
      })
      .where(eq(stories.id, id));
  }

  /**
   * Update the initial prompt for a story (only for draft stories)
   */
  async updatePrompt(id: string, prompt: string): Promise<void> {
    await this.db
      .update(stories)
      .set({
        initialPrompt: prompt,
        updatedAt: new Date()
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
        updatedAt: new Date()
      })
      .where(eq(stories.id, id));
  }

  /**
   * Find all stories for a child profile
   */
  async findByChildProfileId(childProfileId: string): Promise<StoryRow[]> {
    const rows = await this.db
      .select()
      .from(stories)
      .where(eq(stories.childProfileId, childProfileId))
      .orderBy(desc(stories.createdAt));

    return rows.map((row) => ({
      id: row.id,
      childProfileId: row.childProfileId,
      initialPrompt: row.initialPrompt,
      finalAudioUrl: row.finalAudioUrl,
      duration: row.duration,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  /**
   * Delete a story by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(stories).where(eq(stories.id, id)).returning({ id: stories.id });

    return result.length > 0;
  }

  /**
   * Find stories with cursor-based pagination
   */
  async findPaginated(filters: StoryFilterOptions, pagination: StoryPaginationOptions): Promise<PaginatedStoriesResult> {
    const limit = clampLimit(pagination.limit);
    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(stories.status, filters.status));
    }

    if (filters.childProfileId) {
      conditions.push(eq(stories.childProfileId, filters.childProfileId));
    }

    if (filters.search) {
      conditions.push(ilike(stories.initialPrompt, `%${filters.search}%`));
    }

    // Add cursor condition
    if (pagination.cursor) {
      conditions.push(gt(stories.id, pagination.cursor));
    }

    let query = this.db
      .select()
      .from(stories)
      .orderBy(stories.id)
      .limit(limit + 1)
      .$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query;
    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = resultRows[resultRows.length - 1];

    return {
      rows: resultRows.map((row) => ({
        id: row.id,
        childProfileId: row.childProfileId,
        initialPrompt: row.initialPrompt,
        finalAudioUrl: row.finalAudioUrl,
        duration: row.duration,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })),
      nextCursor: hasMore && lastRow ? lastRow.id : null,
      hasMore
    };
  }
}
