/**
 * Stories Store Implementation
 *
 * Data access layer for stories using Drizzle ORM.
 */

import 'reflect-metadata';

import { desc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { stories } from '@mio/db/schema';
import { StoryStatus } from '@mio/shared/types';

import type { CreateStoryRowInput, EnrichedConcept, IStoriesStore, StoryRow } from './stories.service.types';
import { IocConnection } from '../../ioc/ioc.types';

@injectable()
export class StoriesStore implements IStoriesStore {
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
}
