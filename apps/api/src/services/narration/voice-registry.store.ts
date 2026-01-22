/**
 * Voice Registry Store
 *
 * Data access layer for ElevenLabs voices table.
 * Handles CRUD operations for voice registry (cached voice metadata from ElevenLabs API).
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq, and, or, ilike, desc, sql, SQL } from 'drizzle-orm';

import { elevenLabsVoices } from '@mio/db/schema';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { IocConnection } from '../../ioc';
import type {
    VoiceGender,
    VoiceAge,
    VoiceUseCase,
} from '@mio/shared/types';

/**
 * Voice registry row from database
 */
export type VoiceRow = typeof elevenLabsVoices.$inferSelect;

/**
 * Input for upserting a voice
 */
export interface UpsertVoiceInput {
    voiceId: string;
    name: string;
    gender?: VoiceGender;
    age?: VoiceAge;
    accent?: string;
    language?: string;
    locale?: string;
    useCase?: VoiceUseCase;
    category?: string;
    description?: string;
    previewUrl?: string;
    isHighQuality?: boolean;
    labels?: Record<string, string>;
}

/**
 * Filter options for voice search
 */
export interface VoiceFilterOptions {
    gender?: VoiceGender;
    age?: VoiceAge;
    useCase?: VoiceUseCase;
    language?: string;
    accent?: string;
    isHighQuality?: boolean;
    search?: string;
}

/**
 * Voice Registry Store
 *
 * Provides data access methods for voice registry.
 */
@injectable()
export class VoiceRegistryStore {
    constructor(
        @inject(IocConnection.DATABASE)
        private readonly db: DatabaseConnection,
    ) {}

    /**
     * Upsert a voice (insert or update if exists)
     */
    async upsert(input: UpsertVoiceInput): Promise<VoiceRow> {
        const [voice] = await this.db
            .insert(elevenLabsVoices)
            .values({
                voiceId: input.voiceId,
                name: input.name,
                gender: input.gender,
                age: input.age,
                accent: input.accent,
                language: input.language,
                locale: input.locale,
                useCase: input.useCase,
                category: input.category,
                description: input.description,
                previewUrl: input.previewUrl,
                isHighQuality: input.isHighQuality,
                labels: input.labels,
                lastSyncedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: elevenLabsVoices.voiceId,
                set: {
                    name: input.name,
                    gender: input.gender,
                    age: input.age,
                    accent: input.accent,
                    language: input.language,
                    locale: input.locale,
                    useCase: input.useCase,
                    category: input.category,
                    description: input.description,
                    previewUrl: input.previewUrl,
                    isHighQuality: input.isHighQuality,
                    labels: input.labels,
                    lastSyncedAt: new Date(),
                },
            })
            .returning();

        return voice;
    }

    /**
     * Find a voice by ID
     */
    async findById(id: string): Promise<VoiceRow | null> {
        const [voice] = await this.db
            .select()
            .from(elevenLabsVoices)
            .where(eq(elevenLabsVoices.id, id))
            .limit(1);

        return voice || null;
    }

    /**
     * Find a voice by voice ID (ElevenLabs voice ID)
     */
    async findByVoiceId(voiceId: string): Promise<VoiceRow | null> {
        const [voice] = await this.db
            .select()
            .from(elevenLabsVoices)
            .where(eq(elevenLabsVoices.voiceId, voiceId))
            .limit(1);

        return voice || null;
    }

    /**
     * Search voices with filters
     */
    async search(filters: VoiceFilterOptions): Promise<VoiceRow[]> {
        const conditions: SQL[] = [];

        if (filters.gender) {
            conditions.push(eq(elevenLabsVoices.gender, filters.gender));
        }

        if (filters.age) {
            conditions.push(eq(elevenLabsVoices.age, filters.age));
        }

        if (filters.useCase) {
            conditions.push(eq(elevenLabsVoices.useCase, filters.useCase));
        }

        if (filters.language) {
            conditions.push(eq(elevenLabsVoices.language, filters.language));
        }

        if (filters.accent) {
            conditions.push(eq(elevenLabsVoices.accent, filters.accent));
        }

        if (filters.isHighQuality !== undefined) {
            conditions.push(eq(elevenLabsVoices.isHighQuality, filters.isHighQuality));
        }

        if (filters.search) {
            conditions.push(
                or(
                    ilike(elevenLabsVoices.name, `%${filters.search}%`),
                    ilike(elevenLabsVoices.description, `%${filters.search}%`)
                )!
            );
        }

        const query = this.db
            .select()
            .from(elevenLabsVoices);

        if (conditions.length > 0) {
            return query.where(and(...conditions));
        }

        return query;
    }

    /**
     * Get all voices
     */
    async findAll(): Promise<VoiceRow[]> {
        return this.db
            .select()
            .from(elevenLabsVoices)
            .orderBy(desc(elevenLabsVoices.lastSyncedAt));
    }

    /**
     * Get all voices for a specific use case
     */
    async findByUseCase(useCase: VoiceUseCase): Promise<VoiceRow[]> {
        return this.db
            .select()
            .from(elevenLabsVoices)
            .where(eq(elevenLabsVoices.useCase, useCase))
            .orderBy(desc(elevenLabsVoices.isHighQuality));
    }

    /**
     * Check if a voice exists by voice ID
     */
    async exists(voiceId: string): Promise<boolean> {
        const voice = await this.findByVoiceId(voiceId);
        return voice !== null;
    }

    /**
     * Delete a voice
     */
    async delete(id: string): Promise<void> {
        await this.db
            .delete(elevenLabsVoices)
            .where(eq(elevenLabsVoices.id, id));
    }

    /**
     * Delete a voice by voice ID
     */
    async deleteByVoiceId(voiceId: string): Promise<void> {
        await this.db
            .delete(elevenLabsVoices)
            .where(eq(elevenLabsVoices.voiceId, voiceId));
    }

    /**
     * Delete all voices (for full re-sync)
     */
    async deleteAll(): Promise<void> {
        await this.db.delete(elevenLabsVoices);
    }

    /**
     * Count all voices
     */
    async count(): Promise<number> {
        const result = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(elevenLabsVoices);

        return result[0]?.count ?? 0;
    }

    /**
     * Count voices by use case
     */
    async countByUseCase(useCase: VoiceUseCase): Promise<number> {
        const voices = await this.findByUseCase(useCase);
        return voices.length;
    }
}
