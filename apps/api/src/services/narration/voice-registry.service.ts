/**
 * Voice Registry Service Implementation
 *
 * Manages ElevenLabs voice data in the database to avoid repeated API calls.
 * Voices are synced manually via CLI or on a schedule.
 *
 * Updated: Now supports typed columns, pagination, and filtering by use_case.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq, desc, and, type SQL } from 'drizzle-orm';

import { elevenLabsVoices } from '@mio/db/schema';
import { Logger } from '@mio/shared/server/logger';
import {
    VoiceGender,
    VoiceAge,
    VoiceUseCase,
    VoiceGenderValues,
    VoiceAgeValues,
    VoiceUseCaseValues,
} from '@mio/shared/types';

import { getInstance, IocInfrastructure, IocRepository } from '../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { IVoicesRepository } from '../../repositories/audio/audio-repository.types';
import type {
    IVoiceRegistryService,
    StoredVoice,
    SyncResult,
    SyncOptions,
    VoiceFilterOptions,
    ParsedVoice,
    ApiVoice,
} from './voice-registry.service.types';

/** Default sync options */
const DEFAULT_SYNC_OPTIONS: Required<SyncOptions> = {
    pageSize: 100,
    maxPages: Infinity,
    filterByUseCase: undefined as unknown as VoiceUseCase,
    verbose: false,
};

/**
 * Maps ElevenLabs category to our VoiceUseCase
 */
function mapCategoryToUseCase(category: string | undefined): VoiceUseCase | undefined {
    if (!category) return undefined;

    const categoryLower = category.toLowerCase();

    // Map ElevenLabs category names to our use cases
    if (categoryLower.includes('narrative') || categoryLower.includes('story')) {
        return VoiceUseCase.NarrativeStory;
    }
    if (categoryLower.includes('conversation')) {
        return VoiceUseCase.Conversational;
    }
    if (categoryLower.includes('character')) {
        return VoiceUseCase.Characters;
    }
    if (categoryLower.includes('advertisement') || categoryLower.includes('commercial')) {
        return VoiceUseCase.Advertisement;
    }
    if (categoryLower.includes('informative') || categoryLower.includes('documentary')) {
        return VoiceUseCase.Informative;
    }

    return undefined;
}

/**
 * Parse labels from ElevenLabs API into typed columns
 */
function parseLabelsToTypedColumns(labels: Record<string, string> | undefined): {
    gender?: VoiceGender;
    age?: VoiceAge;
    accent?: string;
    language?: string;
    locale?: string;
    useCase?: VoiceUseCase;
} {
    if (!labels) return {};

    const result: ReturnType<typeof parseLabelsToTypedColumns> = {};

    // Parse gender
    const genderLabel = labels['gender']?.toLowerCase();
    if (genderLabel && VoiceGenderValues.includes(genderLabel as VoiceGender)) {
        result.gender = genderLabel as VoiceGender;
    }

    // Parse age
    const ageLabel = labels['age']?.toLowerCase().replace(' ', '_');
    if (ageLabel && VoiceAgeValues.includes(ageLabel as VoiceAge)) {
        result.age = ageLabel as VoiceAge;
    }

    // Parse accent
    if (labels['accent']) {
        result.accent = labels['accent'];
    }

    // Parse language
    if (labels['language']) {
        result.language = labels['language'];
    }

    // Parse locale
    if (labels['locale']) {
        result.locale = labels['locale'];
    }

    // Parse use_case
    const useCaseLabel = labels['use_case'] || labels['use case'] || labels['usecase'];
    if (useCaseLabel) {
        const normalizedUseCase = useCaseLabel.toLowerCase().replace(/[^a-z_]/g, '_');
        if (VoiceUseCaseValues.includes(normalizedUseCase as VoiceUseCase)) {
            result.useCase = normalizedUseCase as VoiceUseCase;
        }
    }

    return result;
}

/**
 * Parse API voice to parsed voice with typed columns
 */
function parseApiVoice(apiVoice: ApiVoice): ParsedVoice {
    const parsedLabels = parseLabelsToTypedColumns(apiVoice.labels);
    const useCaseFromCategory = mapCategoryToUseCase(apiVoice.category);

    return {
        voiceId: apiVoice.voiceId,
        name: apiVoice.name,
        gender: parsedLabels.gender,
        age: parsedLabels.age,
        accent: parsedLabels.accent,
        language: parsedLabels.language,
        locale: parsedLabels.locale,
        useCase: parsedLabels.useCase ?? useCaseFromCategory,
        category: apiVoice.category,
        description: apiVoice.description,
        previewUrl: apiVoice.previewUrl,
        isHighQuality: apiVoice.highQualityBaseModelIds
            ? apiVoice.highQualityBaseModelIds.length > 0
            : false,
        labels: apiVoice.labels,
    };
}

/**
 * Map database row to StoredVoice
 */
function mapRowToStoredVoice(row: typeof elevenLabsVoices.$inferSelect): StoredVoice {
    return {
        id: row.id,
        voiceId: row.voiceId,
        name: row.name,
        gender: row.gender as VoiceGender | null,
        age: row.age as VoiceAge | null,
        accent: row.accent,
        language: row.language,
        locale: row.locale,
        useCase: row.useCase as VoiceUseCase | null,
        category: row.category,
        description: row.description,
        previewUrl: row.previewUrl,
        isHighQuality: row.isHighQuality,
        labels: row.labels,
        lastSyncedAt: row.lastSyncedAt,
        createdAt: row.createdAt,
    };
}

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
    ) {}

    /**
     * Lazily get the Voices repository to avoid circular dependencies
     */
    private _repository: IVoicesRepository | null = null;
    private getRepository(): IVoicesRepository {
        if (!this._repository) {
            // Import dynamically to avoid circular dependency
            this._repository = getInstance<IVoicesRepository>(IocRepository.VOICES);
        }
        return this._repository;
    }

    /**
     * Get all voices from the database (no API call)
     */
    async getAllVoices(): Promise<StoredVoice[]> {
        const rows = await this.db
            .select()
            .from(elevenLabsVoices)
            .orderBy(elevenLabsVoices.name);

        return rows.map(mapRowToStoredVoice);
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

        return mapRowToStoredVoice(row);
    }

    /**
     * Get voices matching filter criteria
     */
    async getVoicesByFilter(filter: VoiceFilterOptions): Promise<StoredVoice[]> {
        const conditions: SQL[] = [];

        if (filter.gender) {
            conditions.push(eq(elevenLabsVoices.gender, filter.gender));
        }
        if (filter.age) {
            conditions.push(eq(elevenLabsVoices.age, filter.age));
        }
        if (filter.language) {
            conditions.push(eq(elevenLabsVoices.language, filter.language));
        }
        if (filter.useCase) {
            conditions.push(eq(elevenLabsVoices.useCase, filter.useCase));
        }
        if (filter.isHighQuality !== undefined) {
            conditions.push(eq(elevenLabsVoices.isHighQuality, filter.isHighQuality));
        }

        const query = this.db
            .select()
            .from(elevenLabsVoices)
            .orderBy(elevenLabsVoices.name);

        const rows = conditions.length > 0
            ? await query.where(and(...conditions))
            : await query;

        return rows.map(mapRowToStoredVoice);
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
    async syncFromApi(options?: SyncOptions): Promise<SyncResult> {
        const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };
        const repository = this.getRepository();

        this.logger.info('Starting voice sync from ElevenLabs API', {
            pageSize: opts.pageSize,
            maxPages: opts.maxPages,
            filterByUseCase: opts.filterByUseCase,
        });

        // Fetch voices from API
        const apiVoices = await repository.listVoices();

        this.logger.debug('Fetched voices from API', { count: apiVoices.length });

        // Parse and optionally filter voices
        let parsedVoices = apiVoices.map((voice) =>
            parseApiVoice({
                voiceId: voice.voiceId,
                name: voice.name,
                labels: voice.labels,
            })
        );

        let filtered = 0;
        if (opts.filterByUseCase) {
            const beforeCount = parsedVoices.length;
            parsedVoices = parsedVoices.filter(
                (voice) => voice.useCase === opts.filterByUseCase
            );
            filtered = beforeCount - parsedVoices.length;

            this.logger.info('Filtered voices by use case', {
                useCase: opts.filterByUseCase,
                before: beforeCount,
                after: parsedVoices.length,
                filtered,
            });
        }

        // Get existing voices from DB
        const existingVoices = await this.db
            .select({ voiceId: elevenLabsVoices.voiceId })
            .from(elevenLabsVoices);

        const existingVoiceIds = new Set(existingVoices.map((v) => v.voiceId));
        const apiVoiceIds = new Set(parsedVoices.map((v) => v.voiceId));

        let added = 0;
        let updated = 0;
        let removed = 0;

        // Upsert voices from API
        for (const voice of parsedVoices) {
            if (existingVoiceIds.has(voice.voiceId)) {
                // Update existing voice
                await this.db
                    .update(elevenLabsVoices)
                    .set({
                        name: voice.name,
                        gender: voice.gender,
                        age: voice.age,
                        accent: voice.accent,
                        language: voice.language,
                        locale: voice.locale,
                        useCase: voice.useCase,
                        category: voice.category,
                        description: voice.description,
                        previewUrl: voice.previewUrl,
                        isHighQuality: voice.isHighQuality,
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
                    gender: voice.gender,
                    age: voice.age,
                    accent: voice.accent,
                    language: voice.language,
                    locale: voice.locale,
                    useCase: voice.useCase,
                    category: voice.category,
                    description: voice.description,
                    previewUrl: voice.previewUrl,
                    isHighQuality: voice.isHighQuality,
                    labels: voice.labels,
                    lastSyncedAt: new Date(),
                });
                added++;
            }

            if (opts.verbose && (added + updated) % 10 === 0) {
                this.logger.debug('Sync progress', { added, updated });
            }
        }

        // Remove voices no longer in API (only if not filtering)
        if (!opts.filterByUseCase) {
            for (const existing of existingVoices) {
                if (!apiVoiceIds.has(existing.voiceId)) {
                    await this.db
                        .delete(elevenLabsVoices)
                        .where(eq(elevenLabsVoices.voiceId, existing.voiceId));
                    removed++;
                }
            }
        }

        const result: SyncResult = {
            added,
            updated,
            removed,
            total: parsedVoices.length,
            filtered,
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
