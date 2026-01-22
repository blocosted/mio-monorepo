/**
 * Audio Library Store
 *
 * Database operations for the audio library tables.
 */

import { eq, desc, sql, and, or, type SQL } from 'drizzle-orm';
import {
    audioLibrarySfx,
    audioLibraryAmbiance,
    audioLibraryMusic,
} from '@mio/db/schema';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type {
    SfxLibraryCategory,
    SfxEnvironment,
    AudioIntensity,
    AmbianceEnvironment,
    TimeOfDay,
    WeatherCondition,
    AudioMood,
    MusicMood,
    MusicIntensity,
    MusicTempo,
} from '@mio/shared/types';
import type {
    StoredSfx,
    StoredAmbiance,
    StoredMusic,
    StoreSfxParams,
    StoreAmbianceParams,
    StoreMusicParams,
} from './audio-library.service.types';

// =============================================================================
// Type Mappers
// =============================================================================

function mapSfxRow(row: typeof audioLibrarySfx.$inferSelect): StoredSfx {
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
        tags: row.tags,
        storyUniverses: row.storyUniverses,
        usageCount: row.usageCount,
        lastUsedAt: row.lastUsedAt,
        createdAt: row.createdAt,
    };
}

function mapAmbianceRow(row: typeof audioLibraryAmbiance.$inferSelect): StoredAmbiance {
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
        isLoopable: row.isLoopable,
        tags: row.tags,
        storyUniverses: row.storyUniverses,
        usageCount: row.usageCount,
        lastUsedAt: row.lastUsedAt,
        createdAt: row.createdAt,
    };
}

function mapMusicRow(row: typeof audioLibraryMusic.$inferSelect): StoredMusic {
    return {
        id: row.id,
        canonicalKey: row.canonicalKey,
        mood: row.mood as MusicMood,
        intensity: row.intensity as MusicIntensity | null,
        tempo: row.tempo as MusicTempo | null,
        variationIndex: row.variationIndex,
        prompt: row.prompt,
        promptInfluence: row.promptInfluence,
        s3Url: row.s3Url,
        sourceDurationSeconds: row.sourceDurationSeconds,
        format: row.format,
        isLoopable: row.isLoopable,
        tags: row.tags,
        storyUniverses: row.storyUniverses,
        usageCount: row.usageCount,
        lastUsedAt: row.lastUsedAt,
        createdAt: row.createdAt,
    };
}

// =============================================================================
// Canonical Key Generators
// =============================================================================

export function generateSfxCanonicalKey(params: StoreSfxParams): string {
    const parts = [
        params.category,
        params.subcategory,
        params.environment ?? 'any',
        params.intensity ?? 'medium',
        // Add a hash of the prompt for uniqueness
        Bun.hash(params.prompt).toString(36),
    ];
    return parts.join(':');
}

export function generateAmbianceCanonicalKey(params: StoreAmbianceParams): string {
    const parts = [
        params.environment,
        params.subEnvironment ?? 'default',
        params.timeOfDay ?? 'any',
        params.weather ?? 'any',
        params.mood ?? 'neutral',
        // Add a hash of the prompt for uniqueness
        Bun.hash(params.prompt).toString(36),
    ];
    return parts.join(':');
}

export function generateMusicCanonicalKey(params: StoreMusicParams): string {
    const parts = [
        params.mood,
        params.intensity ?? 'medium',
        params.tempo ?? 'medium',
        `v${params.variationIndex ?? 0}`,
        // Add a hash of the prompt for uniqueness
        Bun.hash(params.prompt).toString(36),
    ];
    return parts.join(':');
}

// =============================================================================
// SFX Store Operations
// =============================================================================

export interface SfxQueryParams {
    category?: SfxLibraryCategory;
    subcategory?: string;
    environment?: SfxEnvironment;
    intensity?: AudioIntensity;
    tags?: string[];
    limit?: number;
}

export async function querySfx(
    db: DatabaseConnection,
    params: SfxQueryParams
): Promise<StoredSfx[]> {
    const conditions: SQL[] = [];

    if (params.category) {
        conditions.push(eq(audioLibrarySfx.category, params.category));
    }
    if (params.subcategory) {
        conditions.push(eq(audioLibrarySfx.subcategory, params.subcategory));
    }
    if (params.environment) {
        // Match exact environment or 'any' environments
        conditions.push(
            or(
                eq(audioLibrarySfx.environment, params.environment),
                sql`${audioLibrarySfx.environment} IS NULL`
            ) as SQL
        );
    }
    if (params.intensity) {
        conditions.push(
            or(
                eq(audioLibrarySfx.intensity, params.intensity),
                eq(audioLibrarySfx.intensity, 'medium')
            ) as SQL
        );
    }
    if (params.tags && params.tags.length > 0) {
        // Match any of the provided tags
        conditions.push(
            sql`${audioLibrarySfx.tags} && ARRAY[${sql.join(params.tags.map(t => sql`${t}`), sql`, `)}]::text[]`
        );
    }

    const limit = params.limit ?? 10;

    const query = db
        .select()
        .from(audioLibrarySfx)
        .orderBy(desc(audioLibrarySfx.usageCount))
        .limit(limit);

    const rows = conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return rows.map(mapSfxRow);
}

export async function insertSfx(
    db: DatabaseConnection,
    params: StoreSfxParams
): Promise<StoredSfx> {
    const canonicalKey = generateSfxCanonicalKey(params);

    const [row] = await db
        .insert(audioLibrarySfx)
        .values({
            canonicalKey,
            category: params.category,
            subcategory: params.subcategory,
            environment: params.environment,
            intensity: params.intensity,
            prompt: params.prompt,
            promptInfluence: params.promptInfluence,
            s3Url: params.s3Url,
            durationSeconds: params.durationSeconds,
            format: 'mp3',
            tags: params.tags,
            storyUniverses: params.storyUniverses,
            usageCount: 1,
            lastUsedAt: new Date(),
        })
        .returning();

    if (!row) {
        throw new Error('Failed to insert SFX');
    }

    return mapSfxRow(row);
}

export async function incrementSfxUsageById(
    db: DatabaseConnection,
    id: string
): Promise<void> {
    await db
        .update(audioLibrarySfx)
        .set({
            usageCount: sql`COALESCE(${audioLibrarySfx.usageCount}, 0) + 1`,
            lastUsedAt: new Date(),
        })
        .where(eq(audioLibrarySfx.id, id));
}

// =============================================================================
// Ambiance Store Operations
// =============================================================================

export interface AmbianceQueryParams {
    environment?: AmbianceEnvironment;
    subEnvironment?: string;
    timeOfDay?: TimeOfDay;
    weather?: WeatherCondition;
    mood?: AudioMood;
    tags?: string[];
    limit?: number;
}

export async function queryAmbiance(
    db: DatabaseConnection,
    params: AmbianceQueryParams
): Promise<StoredAmbiance[]> {
    const conditions: SQL[] = [];

    if (params.environment) {
        conditions.push(eq(audioLibraryAmbiance.environment, params.environment));
    }
    if (params.subEnvironment) {
        conditions.push(eq(audioLibraryAmbiance.subEnvironment, params.subEnvironment));
    }
    if (params.timeOfDay) {
        // Match exact time or 'any'
        conditions.push(
            or(
                eq(audioLibraryAmbiance.timeOfDay, params.timeOfDay),
                eq(audioLibraryAmbiance.timeOfDay, 'any')
            ) as SQL
        );
    }
    if (params.weather) {
        // Match exact weather or 'any'
        conditions.push(
            or(
                eq(audioLibraryAmbiance.weather, params.weather),
                eq(audioLibraryAmbiance.weather, 'any')
            ) as SQL
        );
    }
    if (params.mood) {
        conditions.push(eq(audioLibraryAmbiance.mood, params.mood));
    }
    if (params.tags && params.tags.length > 0) {
        conditions.push(
            sql`${audioLibraryAmbiance.tags} && ARRAY[${sql.join(params.tags.map(t => sql`${t}`), sql`, `)}]::text[]`
        );
    }

    const limit = params.limit ?? 10;

    const query = db
        .select()
        .from(audioLibraryAmbiance)
        .orderBy(desc(audioLibraryAmbiance.usageCount))
        .limit(limit);

    const rows = conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    return rows.map(mapAmbianceRow);
}

export async function insertAmbiance(
    db: DatabaseConnection,
    params: StoreAmbianceParams
): Promise<StoredAmbiance> {
    const canonicalKey = generateAmbianceCanonicalKey(params);

    const [row] = await db
        .insert(audioLibraryAmbiance)
        .values({
            canonicalKey,
            environment: params.environment,
            subEnvironment: params.subEnvironment,
            timeOfDay: params.timeOfDay,
            weather: params.weather,
            mood: params.mood,
            prompt: params.prompt,
            promptInfluence: params.promptInfluence,
            s3Url: params.s3Url,
            sourceDurationSeconds: params.sourceDurationSeconds,
            format: 'mp3',
            isLoopable: params.isLoopable ?? true,
            tags: params.tags,
            storyUniverses: params.storyUniverses,
            usageCount: 1,
            lastUsedAt: new Date(),
        })
        .returning();

    if (!row) {
        throw new Error('Failed to insert Ambiance');
    }

    return mapAmbianceRow(row);
}

export async function incrementAmbianceUsageById(
    db: DatabaseConnection,
    id: string
): Promise<void> {
    await db
        .update(audioLibraryAmbiance)
        .set({
            usageCount: sql`COALESCE(${audioLibraryAmbiance.usageCount}, 0) + 1`,
            lastUsedAt: new Date(),
        })
        .where(eq(audioLibraryAmbiance.id, id));
}

// =============================================================================
// Music Store Operations
// =============================================================================

export interface MusicQueryParams {
    mood: MusicMood;
    intensity?: MusicIntensity;
    tempo?: MusicTempo;
    tags?: string[];
    limit?: number;
}

export async function queryMusic(
    db: DatabaseConnection,
    params: MusicQueryParams
): Promise<StoredMusic[]> {
    const conditions: SQL[] = [eq(audioLibraryMusic.mood, params.mood)];

    if (params.intensity) {
        conditions.push(
            or(
                eq(audioLibraryMusic.intensity, params.intensity),
                eq(audioLibraryMusic.intensity, 'medium')
            ) as SQL
        );
    }
    if (params.tempo) {
        conditions.push(
            or(
                eq(audioLibraryMusic.tempo, params.tempo),
                eq(audioLibraryMusic.tempo, 'medium')
            ) as SQL
        );
    }
    if (params.tags && params.tags.length > 0) {
        conditions.push(
            sql`${audioLibraryMusic.tags} && ARRAY[${sql.join(params.tags.map(t => sql`${t}`), sql`, `)}]::text[]`
        );
    }

    const limit = params.limit ?? 10;

    const rows = await db
        .select()
        .from(audioLibraryMusic)
        .where(and(...conditions))
        .orderBy(desc(audioLibraryMusic.usageCount))
        .limit(limit);

    return rows.map(mapMusicRow);
}

export async function insertMusic(
    db: DatabaseConnection,
    params: StoreMusicParams
): Promise<StoredMusic> {
    const canonicalKey = generateMusicCanonicalKey(params);

    const [row] = await db
        .insert(audioLibraryMusic)
        .values({
            canonicalKey,
            mood: params.mood,
            intensity: params.intensity,
            tempo: params.tempo,
            variationIndex: params.variationIndex ?? 0,
            prompt: params.prompt,
            promptInfluence: params.promptInfluence,
            s3Url: params.s3Url,
            sourceDurationSeconds: params.sourceDurationSeconds,
            format: 'mp3',
            isLoopable: params.isLoopable ?? true,
            tags: params.tags,
            storyUniverses: params.storyUniverses,
            usageCount: 1,
            lastUsedAt: new Date(),
        })
        .returning();

    if (!row) {
        throw new Error('Failed to insert Music');
    }

    return mapMusicRow(row);
}

export async function incrementMusicUsageById(
    db: DatabaseConnection,
    id: string
): Promise<void> {
    await db
        .update(audioLibraryMusic)
        .set({
            usageCount: sql`COALESCE(${audioLibraryMusic.usageCount}, 0) + 1`,
            lastUsedAt: new Date(),
        })
        .where(eq(audioLibraryMusic.id, id));
}

// =============================================================================
// Stats Operations
// =============================================================================

export async function getSfxStats(
    db: DatabaseConnection
): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byEnvironment: Record<string, number>;
    topUsed: Array<{ canonicalKey: string; usageCount: number }>;
}> {
    // Total count
    const [totalRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(audioLibrarySfx);
    const total = totalRow?.count ?? 0;

    // By category
    const categoryRows = await db
        .select({
            category: audioLibrarySfx.category,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(audioLibrarySfx)
        .groupBy(audioLibrarySfx.category);
    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
        byCategory[row.category] = row.count;
    }

    // By environment
    const envRows = await db
        .select({
            environment: audioLibrarySfx.environment,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(audioLibrarySfx)
        .groupBy(audioLibrarySfx.environment);
    const byEnvironment: Record<string, number> = {};
    for (const row of envRows) {
        byEnvironment[row.environment ?? 'any'] = row.count;
    }

    // Top used
    const topRows = await db
        .select({
            canonicalKey: audioLibrarySfx.canonicalKey,
            usageCount: audioLibrarySfx.usageCount,
        })
        .from(audioLibrarySfx)
        .orderBy(desc(audioLibrarySfx.usageCount))
        .limit(10);
    const topUsed = topRows.map((row) => ({
        canonicalKey: row.canonicalKey,
        usageCount: row.usageCount ?? 0,
    }));

    return { total, byCategory, byEnvironment, topUsed };
}

export async function getAmbianceStats(
    db: DatabaseConnection
): Promise<{
    total: number;
    byEnvironment: Record<string, number>;
    byMood: Record<string, number>;
    topUsed: Array<{ canonicalKey: string; usageCount: number }>;
}> {
    // Total count
    const [totalRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(audioLibraryAmbiance);
    const total = totalRow?.count ?? 0;

    // By environment
    const envRows = await db
        .select({
            environment: audioLibraryAmbiance.environment,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(audioLibraryAmbiance)
        .groupBy(audioLibraryAmbiance.environment);
    const byEnvironment: Record<string, number> = {};
    for (const row of envRows) {
        byEnvironment[row.environment] = row.count;
    }

    // By mood
    const moodRows = await db
        .select({
            mood: audioLibraryAmbiance.mood,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(audioLibraryAmbiance)
        .groupBy(audioLibraryAmbiance.mood);
    const byMood: Record<string, number> = {};
    for (const row of moodRows) {
        byMood[row.mood ?? 'neutral'] = row.count;
    }

    // Top used
    const topRows = await db
        .select({
            canonicalKey: audioLibraryAmbiance.canonicalKey,
            usageCount: audioLibraryAmbiance.usageCount,
        })
        .from(audioLibraryAmbiance)
        .orderBy(desc(audioLibraryAmbiance.usageCount))
        .limit(10);
    const topUsed = topRows.map((row) => ({
        canonicalKey: row.canonicalKey,
        usageCount: row.usageCount ?? 0,
    }));

    return { total, byEnvironment, byMood, topUsed };
}

export async function getMusicStats(
    db: DatabaseConnection
): Promise<{
    total: number;
    byMood: Record<string, number>;
    byIntensity: Record<string, number>;
    topUsed: Array<{ canonicalKey: string; usageCount: number }>;
}> {
    // Total count
    const [totalRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(audioLibraryMusic);
    const total = totalRow?.count ?? 0;

    // By mood
    const moodRows = await db
        .select({
            mood: audioLibraryMusic.mood,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(audioLibraryMusic)
        .groupBy(audioLibraryMusic.mood);
    const byMood: Record<string, number> = {};
    for (const row of moodRows) {
        byMood[row.mood] = row.count;
    }

    // By intensity
    const intensityRows = await db
        .select({
            intensity: audioLibraryMusic.intensity,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(audioLibraryMusic)
        .groupBy(audioLibraryMusic.intensity);
    const byIntensity: Record<string, number> = {};
    for (const row of intensityRows) {
        byIntensity[row.intensity ?? 'medium'] = row.count;
    }

    // Top used
    const topRows = await db
        .select({
            canonicalKey: audioLibraryMusic.canonicalKey,
            usageCount: audioLibraryMusic.usageCount,
        })
        .from(audioLibraryMusic)
        .orderBy(desc(audioLibraryMusic.usageCount))
        .limit(10);
    const topUsed = topRows.map((row) => ({
        canonicalKey: row.canonicalKey,
        usageCount: row.usageCount ?? 0,
    }));

    return { total, byMood, byIntensity, topUsed };
}
