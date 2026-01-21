/**
 * Voice Registry Service Implementation
 *
 * Manages ElevenLabs voice data in the database to avoid repeated API calls.
 * Voices are synced manually via CLI or on a schedule.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq, desc } from 'drizzle-orm';

import { elevenLabsVoices } from '@mio/db/schema';
import { Logger } from '@mio/shared/server/logger';

import { getInstance, IocInfrastructure, IocService } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { IElevenLabsProvider } from './elevenLabs.provider.types';
import type {
    IVoiceRegistryService,
    StoredVoice,
    SyncResult,
} from './voice-registry.service.types';

/**
 * Voice Registry Service
 *
 * Provides database-backed voice validation to eliminate
 * repeated ElevenLabs API calls for `listVoices()`.
 */
@injectable()
export class VoiceRegistryService implements IVoiceRegistryService {
    constructor(
        @inject(IocInfrastructure.DATABASE_CLIENT)
        private readonly db: DatabaseConnection,
        @inject(IocInfrastructure.LOGGER)
        private readonly logger: Logger,
    ) { }

    /**
     * Lazily get the ElevenLabs provider to avoid circular dependencies
     */
    private _provider: IElevenLabsProvider | null = null;
    private getProvider(): IElevenLabsProvider {
        if (!this._provider) {
            // Import dynamically to avoid circular dependency
            this._provider = getInstance<IElevenLabsProvider>(IocService.ELEVENLABS_PROVIDER);
        }
        return this._provider;
    }

    /**
     * Get all voices from the database (no API call)
     */
    async getAllVoices(): Promise<StoredVoice[]> {
        const rows = await this.db
            .select()
            .from(elevenLabsVoices)
            .orderBy(elevenLabsVoices.name);

        return rows.map(row => ({
            id: row.id,
            voiceId: row.voiceId,
            name: row.name,
            category: row.category,
            labels: row.labels,
            description: row.description,
            previewUrl: row.previewUrl,
            lastSyncedAt: row.lastSyncedAt,
            createdAt: row.createdAt,
        }));
    }

    /**
     * Get a voice by its ElevenLabs voice ID
     */
    async getVoice(voiceId: string): Promise<StoredVoice | null> {
        const [row] = await this.db
            .select()
            .from(elevenLabsVoices)
            .where(eq(elevenLabsVoices.voiceId, voiceId))
            .limit(1);

        if (!row) {
            return null;
        }

        return {
            id: row.id,
            voiceId: row.voiceId,
            name: row.name,
            category: row.category,
            labels: row.labels,
            description: row.description,
            previewUrl: row.previewUrl,
            lastSyncedAt: row.lastSyncedAt,
            createdAt: row.createdAt,
        };
    }

    /**
     * Check if a voice ID exists in the database (no API call)
     */
    async isValidVoice(voiceId: string): Promise<boolean> {
        const [row] = await this.db
            .select({ id: elevenLabsVoices.id })
            .from(elevenLabsVoices)
            .where(eq(elevenLabsVoices.voiceId, voiceId))
            .limit(1);

        return !!row;
    }

    /**
     * Synchronize voices from ElevenLabs API to database
     */
    async syncFromApi(): Promise<SyncResult> {
        const provider = this.getProvider();

        this.logger.info('Starting voice sync from ElevenLabs API');

        // Fetch voices from API
        const apiVoices = await provider.listVoices();

        this.logger.debug('Fetched voices from API', { count: apiVoices.length });

        // Get existing voices from DB
        const existingVoices = await this.db
            .select({ voiceId: elevenLabsVoices.voiceId })
            .from(elevenLabsVoices);

        const existingVoiceIds = new Set(existingVoices.map(v => v.voiceId));
        const apiVoiceIds = new Set(apiVoices.map(v => v.voiceId));

        let added = 0;
        let updated = 0;
        let removed = 0;

        // Upsert voices from API
        for (const voice of apiVoices) {
            if (existingVoiceIds.has(voice.voiceId)) {
                // Update existing voice
                await this.db
                    .update(elevenLabsVoices)
                    .set({
                        name: voice.name,
                        labels: voice.labels,
                        lastSyncedAt: new Date(),
                    })
                    .where(eq(elevenLabsVoices.voiceId, voice.voiceId));
                updated++;
            } else {
                // Insert new voice
                await this.db.insert(elevenLabsVoices).values({
                    voiceId: voice.voiceId,
                    name: voice.name,
                    labels: voice.labels,
                    lastSyncedAt: new Date(),
                });
                added++;
            }
        }

        // Remove voices no longer in API (optional: you may want to keep them)
        for (const existing of existingVoices) {
            if (!apiVoiceIds.has(existing.voiceId)) {
                await this.db
                    .delete(elevenLabsVoices)
                    .where(eq(elevenLabsVoices.voiceId, existing.voiceId));
                removed++;
            }
        }

        const result: SyncResult = {
            added,
            updated,
            removed,
            total: apiVoices.length,
        };

        this.logger.info('Voice sync complete', result);

        return result;
    }

    /**
     * Get the timestamp of the last sync
     */
    async getLastSyncTime(): Promise<Date | null> {
        const [row] = await this.db
            .select({ lastSyncedAt: elevenLabsVoices.lastSyncedAt })
            .from(elevenLabsVoices)
            .orderBy(desc(elevenLabsVoices.lastSyncedAt))
            .limit(1);

        return row?.lastSyncedAt ?? null;
    }
}
