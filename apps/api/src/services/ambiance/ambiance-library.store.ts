/**
 * Ambiance Library Store
 *
 * Data access layer for audioLibraryAmbiance table.
 * Handles CRUD operations and caching for ambiance library.
 */

import 'reflect-metadata';

import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { AmbianceEnvironment, AudioMood, TimeOfDay, WeatherCondition } from '@mio/shared/types';
import { audioLibraryAmbiance } from '@mio/db/schema';

import type { ICacheService } from '../cache/cache.service.types';
import { IocConnection, IocService } from '../../ioc/ioc.types';

/** Redis cache TTL for ambiance lookups (1 hour) */
const CACHE_TTL_SECONDS = 3600;

/** Cache key prefix */
const CACHE_PREFIX = 'audio-library:ambiance';

/**
 * Stored Ambiance from database
 */
export interface StoredAmbiance {
  id: string;
  canonicalKey: string;
  environment: AmbianceEnvironment;
  subEnvironment: string | null;
  timeOfDay: TimeOfDay | null;
  weather: WeatherCondition | null;
  mood: AudioMood | null;
  prompt: string;
  promptInfluence: number | null;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags: string[];
  storyUniverses: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Parameters for finding Ambiance
 */
export interface FindAmbianceParams {
  description: string;
  environment?: AmbianceEnvironment;
  subEnvironment?: string;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  mood?: AudioMood;
}

/**
 * Parameters for querying Ambiance
 */
export interface AmbianceQueryParams {
  environment?: AmbianceEnvironment;
  subEnvironment?: string;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  mood?: AudioMood;
  limit?: number;
}

/**
 * Parameters for storing Ambiance
 */
export interface StoreAmbianceParams {
  canonicalKey: string;
  environment: AmbianceEnvironment;
  subEnvironment?: string;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  mood?: AudioMood;
  prompt: string;
  promptInfluence?: number;
  s3Url: string;
  sourceDurationSeconds: number;
  format: string;
  isLoopable: boolean;
  tags?: string[];
  storyUniverses?: string[];
}

/**
 * Ambiance lookup result
 */
export interface AmbianceLookupResult {
  ambiance: StoredAmbiance | null;
  fromCache: boolean;
}

/**
 * Ambiance Library Stats
 */
export interface AmbianceLibraryStats {
  total: number;
  byEnvironment: Record<string, number>;
  byMood: Record<string, number>;
  topUsed: StoredAmbiance[];
}

/**
 * Ambiance Library Store
 *
 * Provides data access methods for ambiance library.
 */
@injectable()
export class AmbianceLibraryStore {
  constructor(
    @inject(IocConnection.DATABASE)
    private readonly db: DatabaseConnection,
    @inject(IocService.CACHE)
    private readonly cache: ICacheService
  ) {}

  /**
   * Find Ambiance with cache check
   */
  async findWithCache(params: FindAmbianceParams): Promise<AmbianceLookupResult> {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cache.get<StoredAmbiance>(cacheKey);

    if (cached) {
      return { ambiance: cached, fromCache: true };
    }

    return { ambiance: null, fromCache: false };
  }

  /**
   * Query Ambiance from database
   */
  async query(params: AmbianceQueryParams): Promise<StoredAmbiance[]> {
    const conditions: SQL[] = [];

    if (params.environment) {
      conditions.push(eq(audioLibraryAmbiance.environment, params.environment));
    }

    if (params.subEnvironment) {
      conditions.push(eq(audioLibraryAmbiance.subEnvironment, params.subEnvironment));
    }

    if (params.timeOfDay) {
      conditions.push(eq(audioLibraryAmbiance.timeOfDay, params.timeOfDay));
    }

    if (params.weather) {
      conditions.push(eq(audioLibraryAmbiance.weather, params.weather));
    }

    if (params.mood) {
      conditions.push(eq(audioLibraryAmbiance.mood, params.mood));
    }

    let query = this.db.select().from(audioLibraryAmbiance).orderBy(desc(audioLibraryAmbiance.usageCount)).$dynamic();

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
   * Cache an Ambiance entry
   */
  async cacheAmbiance(params: FindAmbianceParams, ambiance: StoredAmbiance): Promise<void> {
    const cacheKey = this.buildCacheKey(params);
    await this.cache.set(cacheKey, ambiance, { ex: CACHE_TTL_SECONDS });
  }

  /**
   * Insert new Ambiance into library
   */
  async insert(params: StoreAmbianceParams): Promise<StoredAmbiance> {
    const [row] = await this.db
      .insert(audioLibraryAmbiance)
      .values({
        canonicalKey: params.canonicalKey,
        environment: params.environment,
        subEnvironment: params.subEnvironment,
        timeOfDay: params.timeOfDay,
        weather: params.weather,
        mood: params.mood,
        prompt: params.prompt,
        promptInfluence: params.promptInfluence ?? 0.3,
        s3Url: params.s3Url,
        sourceDurationSeconds: params.sourceDurationSeconds,
        format: params.format,
        isLoopable: params.isLoopable,
        tags: params.tags ?? [],
        storyUniverses: params.storyUniverses ?? []
      })
      .returning();

    if (!row) {
      throw new Error('Failed to insert ambiance into library');
    }

    return this.mapRow(row);
  }

  /**
   * Increment usage count for Ambiance
   */
  async incrementUsage(id: string): Promise<void> {
    await this.db
      .update(audioLibraryAmbiance)
      .set({
        usageCount: sql`${audioLibraryAmbiance.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(audioLibraryAmbiance.id, id));
  }

  /**
   * Get Ambiance library statistics
   */
  async getStats(): Promise<AmbianceLibraryStats> {
    // Total count
    const [totalResult] = await this.db.select({ count: sql<number>`count(*)::int` }).from(audioLibraryAmbiance);

    // By environment
    const environmentResults = await this.db
      .select({
        environment: audioLibraryAmbiance.environment,
        count: sql<number>`count(*)::int`
      })
      .from(audioLibraryAmbiance)
      .groupBy(audioLibraryAmbiance.environment);

    const byEnvironment = Object.fromEntries(environmentResults.map((r) => [r.environment, r.count]));

    // By mood
    const moodResults = await this.db
      .select({
        mood: audioLibraryAmbiance.mood,
        count: sql<number>`count(*)::int`
      })
      .from(audioLibraryAmbiance)
      .where(sql`${audioLibraryAmbiance.mood} IS NOT NULL`)
      .groupBy(audioLibraryAmbiance.mood);

    const byMood = Object.fromEntries(moodResults.map((r) => [r.mood!, r.count]));

    // Top used
    const topUsedRows = await this.db.select().from(audioLibraryAmbiance).orderBy(desc(audioLibraryAmbiance.usageCount)).limit(10);

    const topUsed = topUsedRows.map(this.mapRow);

    return {
      total: totalResult?.count ?? 0,
      byEnvironment,
      byMood,
      topUsed
    };
  }

  /**
   * Map database row to StoredAmbiance
   */
  private mapRow(row: typeof audioLibraryAmbiance.$inferSelect): StoredAmbiance {
    return {
      id: row.id,
      canonicalKey: row.canonicalKey,
      environment: row.environment as AmbianceEnvironment,
      subEnvironment: row.subEnvironment,
      timeOfDay: row.timeOfDay as TimeOfDay | null,
      weather: row.weather as WeatherCondition | null,
      mood: row.mood as AudioMood | null,
      prompt: row.prompt,
      promptInfluence: row.promptInfluence,
      s3Url: row.s3Url,
      sourceDurationSeconds: row.sourceDurationSeconds,
      format: row.format,
      isLoopable: row.isLoopable ?? false,
      tags: row.tags ?? [],
      storyUniverses: row.storyUniverses ?? [],
      usageCount: row.usageCount ?? 0,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt
    };
  }

  /**
   * Build cache key for Ambiance lookup
   */
  private buildCacheKey(params: FindAmbianceParams): string {
    const parts = [
      CACHE_PREFIX,
      params.environment ?? 'any',
      params.subEnvironment ?? 'any',
      params.timeOfDay ?? 'any',
      params.weather ?? 'any',
      params.mood ?? 'any',
      Bun.hash(params.description).toString(36)
    ];
    return parts.join(':');
  }
}
