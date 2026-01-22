/**
 * Audio Assets Store
 *
 * Data access layer for audio assets table.
 * Handles CRUD operations for cached audio files (voice, sfx, music, ambiance, final mix).
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq, and } from 'drizzle-orm';

import { audioAssets } from '@mio/db/schema';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { IocConnection } from '../../ioc';
import { AudioAssetType } from '@mio/shared';

/**
 * Audio asset row from database
 */
export type AudioAssetRow = typeof audioAssets.$inferSelect;

/**
 * Input for creating an audio asset
 */
export interface CreateAudioAssetInput {
    storyId?: string;
    segmentId?: string;
    type: AudioAssetType;
    url: string;
    duration: number;
    cacheKey?: string;
}

/**
 * Audio Assets Store
 *
 * Provides data access methods for audio assets caching.
 */
@injectable()
export class AudioAssetsStore {
    constructor(
        @inject(IocConnection.DATABASE)
        private readonly db: DatabaseConnection,
    ) {}

    /**
     * Create a new audio asset
     */
    async create(input: CreateAudioAssetInput): Promise<AudioAssetRow> {
        const [asset] = await this.db
            .insert(audioAssets)
            .values({
                storyId: input.storyId,
                segmentId: input.segmentId,
                type: input.type,
                url: input.url,
                duration: input.duration,
                cacheKey: input.cacheKey,
            })
            .returning();

        return asset;
    }

    /**
     * Find an audio asset by ID
     */
    async findById(id: string): Promise<AudioAssetRow | null> {
        const [asset] = await this.db
            .select()
            .from(audioAssets)
            .where(eq(audioAssets.id, id))
            .limit(1);

        return asset || null;
    }

    /**
     * Find all audio assets for a story
     */
    async findByStoryId(storyId: string): Promise<AudioAssetRow[]> {
        return this.db
            .select()
            .from(audioAssets)
            .where(eq(audioAssets.storyId, storyId));
    }

    /**
     * Find audio assets by segment ID
     */
    async findBySegmentId(segmentId: string): Promise<AudioAssetRow[]> {
        return this.db
            .select()
            .from(audioAssets)
            .where(eq(audioAssets.segmentId, segmentId));
    }

    /**
     * Find audio asset by cache key
     */
    async findByCacheKey(cacheKey: string): Promise<AudioAssetRow | null> {
        const [asset] = await this.db
            .select()
            .from(audioAssets)
            .where(eq(audioAssets.cacheKey, cacheKey))
            .limit(1);

        return asset || null;
    }

    /**
     * Find audio assets by story and type
     */
    async findByStoryIdAndType(storyId: string, type: AudioAssetType): Promise<AudioAssetRow[]> {
        return this.db
            .select()
            .from(audioAssets)
            .where(
                and(
                    eq(audioAssets.storyId, storyId),
                    eq(audioAssets.type, type)
                )
            );
    }

    /**
     * Find final mix asset for a story
     */
    async findFinalMixByStoryId(storyId: string): Promise<AudioAssetRow | null> {
        const [asset] = await this.db
            .select()
            .from(audioAssets)
            .where(
                and(
                    eq(audioAssets.storyId, storyId),
                    eq(audioAssets.type, AudioAssetType.FinalMix)
                )
            )
            .limit(1);

        return asset || null;
    }

    /**
     * Delete an audio asset
     */
    async delete(id: string): Promise<void> {
        await this.db
            .delete(audioAssets)
            .where(eq(audioAssets.id, id));
    }

    /**
     * Delete all audio assets for a story
     */
    async deleteByStoryId(storyId: string): Promise<void> {
        await this.db
            .delete(audioAssets)
            .where(eq(audioAssets.storyId, storyId));
    }

    /**
     * Delete all audio assets for a segment
     */
    async deleteBySegmentId(segmentId: string): Promise<void> {
        await this.db
            .delete(audioAssets)
            .where(eq(audioAssets.segmentId, segmentId));
    }

    /**
     * Count audio assets for a story
     */
    async countByStoryId(storyId: string): Promise<number> {
        const assets = await this.findByStoryId(storyId);
        return assets.length;
    }

    /**
     * Count audio assets by type for a story
     */
    async countByStoryIdAndType(storyId: string, type: AudioAssetType): Promise<number> {
        const assets = await this.findByStoryIdAndType(storyId, type);
        return assets.length;
    }
}
