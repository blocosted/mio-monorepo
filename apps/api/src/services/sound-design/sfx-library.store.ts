/**
 * SFX Library Store
 *
 * Data access layer for audioLibrarySfx table.
 * Handles CRUD operations for sound effects library.
 * Caching is handled by SfxLibraryService.
 */

import 'reflect-metadata';

import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { AudioIntensity, SfxEnvironment, SfxLibraryCategory } from '@mio/shared/types';
import { audioLibrarySfx } from '@mio/db/schema';

import { IocConnection } from '../../ioc/ioc.types';

/**
 * Stored SFX from database
 */
export interface StoredSfx {
  id: string;
  canonicalKey: string;
  category: SfxLibraryCategory;
  subcategory: string | null;
  environment: SfxEnvironment | null;
  intensity: AudioIntensity | null;
  prompt: string;
  promptInfluence: number | null;
  s3Url: string;
  durationSeconds: number;
  format: string;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Parameters for finding SFX
 */
export interface FindSfxParams {
  text: string;
  category?: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
}

/**
 * Parameters for querying SFX
 */
export interface SfxQueryParams {
  category?: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
  limit?: number;
}

/**
 * Parameters for storing SFX
 */
export interface StoreSfxParams {
  canonicalKey: string;
  category: SfxLibraryCategory;
  subcategory?: string;
  environment?: SfxEnvironment;
  intensity?: AudioIntensity;
  prompt: string;
  promptInfluence?: number;
  s3Url: string;
  durationSeconds: number;
  format: string;
  tags?: string[];
  storyUniverses?: string[];
}

/**
 * SFX lookup result
 */
export interface SfxLookupResult {
  sfx: StoredSfx | null;
  fromCache: boolean;
}

/**
 * SFX Library Stats
 */
export interface SfxLibraryStats {
  total: number;
  byCategory: Record<string, number>;
  byEnvironment: Record<string, number>;
  topUsed: StoredSfx[];
}

/**
 * SFX Library Store
 *
 * Provides data access methods for sound effects library.
 * Pure DB access - no caching logic.
 */
@injectable()
export class SfxLibraryStore {
  constructor(
    @inject(IocConnection.DATABASE)
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Query SFX from database
   */
  async query(params: SfxQueryParams): Promise<StoredSfx[]> {
    const conditions: SQL[] = [];

    if (params.category) {
      conditions.push(eq(audioLibrarySfx.category, params.category));
    }

    if (params.subcategory) {
      conditions.push(eq(audioLibrarySfx.subcategory, params.subcategory));
    }

    if (params.environment) {
      conditions.push(eq(audioLibrarySfx.environment, params.environment));
    }

    if (params.intensity) {
      conditions.push(eq(audioLibrarySfx.intensity, params.intensity));
    }

    let query = this.db.select().from(audioLibrarySfx).orderBy(desc(audioLibrarySfx.usageCount)).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const rows = await query;
    return rows.map(this.mapRow);
  }

  /**
   * Insert new SFX into library
   */
  async insert(params: StoreSfxParams): Promise<StoredSfx> {
    const [row] = await this.db
      .insert(audioLibrarySfx)
      .values({
        canonicalKey: params.canonicalKey,
        category: params.category,
        subcategory: params.subcategory ?? 'general',
        environment: params.environment,
        intensity: params.intensity,
        prompt: params.prompt,
        promptInfluence: params.promptInfluence ?? 0.3,
        s3Url: params.s3Url,
        durationSeconds: params.durationSeconds,
        format: params.format,
        tags: params.tags ?? [],
        storyUniverses: params.storyUniverses ?? []
      })
      .returning();

    if (!row) {
      throw new Error('Failed to insert SFX into library');
    }

    return this.mapRow(row);
  }

  /**
   * Increment usage count for SFX
   */
  async incrementUsage(id: string): Promise<void> {
    await this.db
      .update(audioLibrarySfx)
      .set({
        usageCount: sql`${audioLibrarySfx.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(audioLibrarySfx.id, id));
  }

  /**
   * Get SFX library statistics
   */
  async getStats(): Promise<SfxLibraryStats> {
    // Total count
    const [totalResult] = await this.db.select({ count: sql<number>`count(*)::int` }).from(audioLibrarySfx);

    // By category
    const categoryResults = await this.db
      .select({
        category: audioLibrarySfx.category,
        count: sql<number>`count(*)::int`
      })
      .from(audioLibrarySfx)
      .groupBy(audioLibrarySfx.category);

    const byCategory = Object.fromEntries(categoryResults.map((r) => [r.category, r.count]));

    // By environment
    const environmentResults = await this.db
      .select({
        environment: audioLibrarySfx.environment,
        count: sql<number>`count(*)::int`
      })
      .from(audioLibrarySfx)
      .where(sql`${audioLibrarySfx.environment} IS NOT NULL`)
      .groupBy(audioLibrarySfx.environment);

    const byEnvironment = Object.fromEntries(environmentResults.map((r) => [r.environment!, r.count]));

    // Top used
    const topUsedRows = await this.db.select().from(audioLibrarySfx).orderBy(desc(audioLibrarySfx.usageCount)).limit(10);

    const topUsed = topUsedRows.map(this.mapRow);

    return {
      total: totalResult?.count ?? 0,
      byCategory,
      byEnvironment,
      topUsed
    };
  }

  /**
   * Map database row to StoredSfx
   */
  private mapRow(row: typeof audioLibrarySfx.$inferSelect): StoredSfx {
    return {
      id: row.id,
      canonicalKey: row.canonicalKey,
      category: row.category as SfxLibraryCategory,
      subcategory: row.subcategory,
      environment: row.environment as SfxEnvironment | null,
      intensity: row.intensity as AudioIntensity | null,
      prompt: row.prompt,
      promptInfluence: row.promptInfluence,
      s3Url: row.s3Url,
      durationSeconds: row.durationSeconds,
      format: row.format,
      tags: row.tags ?? [],
      storyUniverses: row.storyUniverses ?? [],
      usageCount: row.usageCount ?? 0,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt
    };
  }

}
