/**
 * Music Library Store
 *
 * Data access layer for audioLibraryMusic table.
 * Handles CRUD operations and caching for music library.
 */

import 'reflect-metadata';

import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { MusicIntensity, MusicMood, MusicTempo } from '@mio/shared/types';
import { audioLibraryMusic } from '@mio/db/schema';

import type { ICacheService } from '../cache/cache.service.types';
import { IocConnection, IocService } from '../../ioc/ioc.types';

/** Redis cache TTL for music lookups (1 hour) */
const CACHE_TTL_SECONDS = 3600;

/** Cache key prefix */
const CACHE_PREFIX = 'audio-library:music';

/**
 * Stored Music from database
 */
export interface StoredMusic {
  id: string;
  canonicalKey: string;
  mood: MusicMood;
  intensity: MusicIntensity | null;
  tempo: MusicTempo | null;
  variationIndex: number;
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
 * Parameters for finding Music
 */
export interface FindMusicParams {
  mood: MusicMood;
  intensity?: MusicIntensity;
  tempo?: MusicTempo;
}

/**
 * Parameters for querying Music
 */
export interface MusicQueryParams {
  mood?: MusicMood;
  intensity?: MusicIntensity;
  tempo?: MusicTempo;
  limit?: number;
}

/**
 * Parameters for storing Music
 */
export interface StoreMusicParams {
  canonicalKey: string;
  mood: MusicMood;
  intensity?: MusicIntensity;
  tempo?: MusicTempo;
  variationIndex: number;
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
 * Music lookup result
 */
export interface MusicLookupResult {
  music: StoredMusic | null;
  fromCache: boolean;
}

/**
 * Music Library Stats
 */
export interface MusicLibraryStats {
  total: number;
  byMood: Record<string, number>;
  byIntensity: Record<string, number>;
  topUsed: StoredMusic[];
}

/**
 * Music Library Store
 *
 * Provides data access methods for music library.
 */
@injectable()
export class MusicLibraryStore {
  constructor(
    @inject(IocConnection.DATABASE)
    private readonly db: DatabaseConnection,
    @inject(IocService.CACHE)
    private readonly cache: ICacheService
  ) {}

  /**
   * Find Music with cache check
   */
  async findWithCache(params: FindMusicParams): Promise<MusicLookupResult> {
    const cacheKey = this.buildCacheKey(params);
    const cached = await this.cache.get<StoredMusic>(cacheKey);

    if (cached) {
      return { music: cached, fromCache: true };
    }

    return { music: null, fromCache: false };
  }

  /**
   * Query Music from database
   */
  async query(params: MusicQueryParams): Promise<StoredMusic[]> {
    const conditions: SQL[] = [];

    if (params.mood) {
      conditions.push(eq(audioLibraryMusic.mood, params.mood));
    }

    if (params.intensity) {
      conditions.push(eq(audioLibraryMusic.intensity, params.intensity));
    }

    if (params.tempo) {
      conditions.push(eq(audioLibraryMusic.tempo, params.tempo));
    }

    let query = this.db.select().from(audioLibraryMusic).orderBy(desc(audioLibraryMusic.usageCount)).$dynamic();

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
   * Cache a Music entry
   */
  async cacheMusic(params: FindMusicParams, music: StoredMusic): Promise<void> {
    const cacheKey = this.buildCacheKey(params);
    await this.cache.set(cacheKey, music, { ex: CACHE_TTL_SECONDS });
  }

  /**
   * Insert new Music into library
   */
  async insert(params: StoreMusicParams): Promise<StoredMusic> {
    const [row] = await this.db
      .insert(audioLibraryMusic)
      .values({
        canonicalKey: params.canonicalKey,
        mood: params.mood,
        intensity: params.intensity,
        tempo: params.tempo,
        variationIndex: params.variationIndex ?? 0,
        prompt: params.prompt,
        promptInfluence: params.promptInfluence ?? 0.5,
        s3Url: params.s3Url,
        sourceDurationSeconds: params.sourceDurationSeconds,
        format: params.format,
        isLoopable: params.isLoopable,
        tags: params.tags ?? [],
        storyUniverses: params.storyUniverses ?? []
      })
      .returning();

    if (!row) {
      throw new Error('Failed to insert music into library');
    }

    return this.mapRow(row);
  }

  /**
   * Increment usage count for Music
   */
  async incrementUsage(id: string): Promise<void> {
    await this.db
      .update(audioLibraryMusic)
      .set({
        usageCount: sql`${audioLibraryMusic.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(audioLibraryMusic.id, id));
  }

  /**
   * Get Music library statistics
   */
  async getStats(): Promise<MusicLibraryStats> {
    // Total count
    const [totalResult] = await this.db.select({ count: sql<number>`count(*)::int` }).from(audioLibraryMusic);

    // By mood
    const moodResults = await this.db
      .select({
        mood: audioLibraryMusic.mood,
        count: sql<number>`count(*)::int`
      })
      .from(audioLibraryMusic)
      .groupBy(audioLibraryMusic.mood);

    const byMood = Object.fromEntries(moodResults.map((r) => [r.mood, r.count]));

    // By intensity
    const intensityResults = await this.db
      .select({
        intensity: audioLibraryMusic.intensity,
        count: sql<number>`count(*)::int`
      })
      .from(audioLibraryMusic)
      .where(sql`${audioLibraryMusic.intensity} IS NOT NULL`)
      .groupBy(audioLibraryMusic.intensity);

    const byIntensity = Object.fromEntries(intensityResults.map((r) => [r.intensity!, r.count]));

    // Top used
    const topUsedRows = await this.db.select().from(audioLibraryMusic).orderBy(desc(audioLibraryMusic.usageCount)).limit(10);

    const topUsed = topUsedRows.map(this.mapRow);

    return {
      total: totalResult?.count ?? 0,
      byMood,
      byIntensity,
      topUsed
    };
  }

  /**
   * Map database row to StoredMusic
   */
  private mapRow(row: typeof audioLibraryMusic.$inferSelect): StoredMusic {
    return {
      id: row.id,
      canonicalKey: row.canonicalKey,
      mood: row.mood as MusicMood,
      intensity: row.intensity as MusicIntensity | null,
      tempo: row.tempo as MusicTempo | null,
      variationIndex: row.variationIndex ?? 0,
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
   * Build cache key for Music lookup
   */
  private buildCacheKey(params: FindMusicParams): string {
    const parts = [CACHE_PREFIX, params.mood, params.intensity ?? 'any', params.tempo ?? 'any'];
    return parts.join(':');
  }
}
