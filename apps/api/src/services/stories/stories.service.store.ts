/**
 * Stories Store Implementation
 *
 * Data access layer for stories using Drizzle ORM.
 */

import 'reflect-metadata';

import { and, desc, eq, ilike, lt, or, type SQL } from 'drizzle-orm';
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
        initialPrompt: input.initialPrompt,
        targetDurationMinutes: input.targetDurationMinutes ?? 5
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
      targetDurationMinutes: row.targetDurationMinutes,
      enrichedConcept: row.enrichedConcept as StoryRow['enrichedConcept'],
      script: row.script as StoryRow['script'],
      answers: row.answers as StoryRow['answers'],
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
  async findById(id: string): Promise<StoryRow | null> {
    const [row] = await this.db.select().from(stories).where(eq(stories.id, id)).limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      childProfileId: row.childProfileId,
      initialPrompt: row.initialPrompt,
      targetDurationMinutes: row.targetDurationMinutes,
      enrichedConcept: row.enrichedConcept as StoryRow['enrichedConcept'],
      script: row.script as StoryRow['script'],
      answers: row.answers as StoryRow['answers'],
      finalAudioUrl: row.finalAudioUrl,
      duration: row.duration,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
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
   * Update story status
   */
  async updateStatus(id: string, status: StoryStatus): Promise<void> {
    await this.db
      .update(stories)
      .set({
        status,
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
      targetDurationMinutes: row.targetDurationMinutes,
      enrichedConcept: row.enrichedConcept as StoryRow['enrichedConcept'],
      script: row.script as StoryRow['script'],
      answers: row.answers as StoryRow['answers'],
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

    // Add cursor condition (cursor is the ID of the last seen row)
    if (pagination.cursor) {
      const cursorRow = await this.db
        .select({ createdAt: stories.createdAt, id: stories.id })
        .from(stories)
        .where(eq(stories.id, pagination.cursor))
        .limit(1);

      const cursor = cursorRow[0];
      if (cursor) {
        // For DESC order: (createdAt < cursor) OR (createdAt = cursor AND id < cursorId)
        conditions.push(
          or(lt(stories.createdAt, cursor.createdAt), and(eq(stories.createdAt, cursor.createdAt), lt(stories.id, cursor.id)))!
        );
      }
    }

    let query = this.db
      .select()
      .from(stories)
      .orderBy(desc(stories.createdAt), desc(stories.id))
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
        targetDurationMinutes: row.targetDurationMinutes,
        enrichedConcept: row.enrichedConcept as StoryRow['enrichedConcept'],
        script: row.script as StoryRow['script'],
        answers: row.answers as StoryRow['answers'],
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

  /**
   * Update target duration for a story
   */
  async updateTargetDuration(id: string, targetDurationMinutes: number): Promise<void> {
    await this.db
      .update(stories)
      .set({
        targetDurationMinutes,
        updatedAt: new Date()
      })
      .where(eq(stories.id, id));
  }

  /**
   * Clear generated data (enrichedConcept, script, finalAudioUrl)
   * Used when resetting phases
   */
  async clearGeneratedData(id: string, fields: { enrichedConcept?: boolean; script?: boolean; finalAudioUrl?: boolean }): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (fields.enrichedConcept) {
      updates.enrichedConcept = null;
    }
    if (fields.script) {
      updates.script = null;
    }
    if (fields.finalAudioUrl) {
      updates.finalAudioUrl = null;
      updates.duration = null;
    }

    await this.db.update(stories).set(updates).where(eq(stories.id, id));
  }
}
