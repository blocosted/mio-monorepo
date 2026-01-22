/**
 * Database Schema
 *
 * Drizzle ORM schema definitions for all tables.
 * Uses centralized types from @mio/shared/types for enums.
 */

import { relations } from 'drizzle-orm';
import {
    pgTable,
    uuid,
    text,
    timestamp,
    jsonb,
    integer,
    real,
    boolean,
    index,
} from 'drizzle-orm/pg-core';

import {
    Gender,
    StoryDuration,
    NarratorVoice,
    Language,
    HeroGender,
    VoiceGenderValues,
    VoiceAgeValues,
    VoiceUseCaseValues,
    SfxLibraryCategoryValues,
    SfxEnvironmentValues,
    AudioIntensityValues,
    AmbianceEnvironmentValues,
    TimeOfDayValues,
    WeatherConditionValues,
    AudioMoodValues,
    MusicMoodValues,
    MusicIntensityValues,
    MusicTempoValues,
    StoryStatus,
    SegmentType,
    AudioAssetType,
    JobStatus,
    type StoryScript,
} from '@mio/shared/types';

/**
 * JSONB Column Types (inlined to avoid circular dependencies)
 */

/** Story Character for enriched concepts */
interface StoryCharacterDb {
    name: string;
    description: string;
    voiceType?: string;
}

/** Story Setting for enriched concepts */
interface StorySettingDb {
    location: string;
    era: string;
    ambiance: string;
}

/** Enriched Concept JSONB structure */
interface EnrichedConceptDb {
    title: string;
    mainCharacter: StoryCharacterDb;
    secondaryCharacters?: StoryCharacterDb[];
    setting: StorySettingDb;
    tone: string;
    themes: string[];
    synopsis?: string;
}

/** Story Answer JSONB structure */
interface StoryAnswerDb {
    questionId: string;
    value: string;
}

/** Job Step Progress JSONB structure */
interface JobStepProgressDb {
    name: string;
    status: string;
    progress?: number;
    completedAt?: string;
    error?: string;
}

/**
 * Child Profiles Table
 */
export interface ChildPreferencesDb {
    favoriteThemes?: string[];
    avoidThemes?: string[];
    includeChildAsCharacter?: boolean;
    preferredHeroGender?: HeroGender;
    preferredStoryDuration?: StoryDuration;
    narratorVoicePreference?: NarratorVoice;
    language?: Language;
}

export const childProfiles = pgTable('child_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    age: integer('age').notNull(),
    gender: text('gender', {
        enum: [Gender.Boy, Gender.Girl, Gender.Neutral],
    }).notNull(),
    preferences: jsonb('preferences').$type<ChildPreferencesDb>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Stories Table
 */
export const stories = pgTable('stories', {
    id: uuid('id').primaryKey().defaultRandom(),
    childProfileId: uuid('child_profile_id')
        .notNull()
        .references(() => childProfiles.id, { onDelete: 'cascade' }),
    initialPrompt: text('initial_prompt').notNull(),
    enrichedConcept: jsonb('enriched_concept').$type<EnrichedConceptDb>(),
    script: jsonb('script').$type<StoryScript>(),
    answers: jsonb('answers').$type<StoryAnswerDb[]>(),
    finalAudioUrl: text('final_audio_url'),
    duration: integer('duration'),
    status: text('status', {
        enum: [StoryStatus.Draft, StoryStatus.Generating, StoryStatus.Ready, StoryStatus.Failed],
    })
        .default(StoryStatus.Draft)
        .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Story Segments Table (for audio assets tracking)
 */
export const storySegments = pgTable('story_segments', {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
        .notNull()
        .references(() => stories.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    type: text('type', {
        enum: [
            SegmentType.Narration,
            SegmentType.Dialogue,
            SegmentType.Pause,
            SegmentType.SoundEffect,
            SegmentType.MusicChange,
        ],
    }).notNull(),
    content: jsonb('content').notNull(),
    audioUrl: text('audio_url'),
    duration: real('duration'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Audio Assets Table (for caching)
 */
export const audioAssets = pgTable('audio_assets', {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id').references(() => stories.id, { onDelete: 'cascade' }),
    segmentId: uuid('segment_id').references(() => storySegments.id, {
        onDelete: 'cascade',
    }),
    type: text('type', {
        enum: [
            AudioAssetType.Voice,
            AudioAssetType.Sfx,
            AudioAssetType.Music,
            AudioAssetType.Ambiance,
            AudioAssetType.FinalMix,
        ],
    }).notNull(),
    url: text('url').notNull(),
    duration: real('duration').notNull(),
    cacheKey: text('cache_key'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Generation Jobs Table
 */
export const generationJobs = pgTable('generation_jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
        .notNull()
        .references(() => stories.id, { onDelete: 'cascade' })
        .unique(),
    workflowRunId: text('workflow_run_id'),
    status: text('status', {
        enum: [
            JobStatus.Pending,
            JobStatus.Processing,
            JobStatus.Completed,
            JobStatus.Failed,
            JobStatus.Cancelled,
        ],
    })
        .default(JobStatus.Pending)
        .notNull(),
    progress: integer('progress').default(0).notNull(),
    currentStep: text('current_step'),
    steps: jsonb('steps').$type<JobStepProgressDb[]>().default([]),
    result: jsonb('result').$type<{ audioUrl: string; duration: number }>(),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Relations
 */
export const childProfilesRelations = relations(childProfiles, ({ many }) => ({
    stories: many(stories),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
    childProfile: one(childProfiles, {
        fields: [stories.childProfileId],
        references: [childProfiles.id],
    }),
    segments: many(storySegments),
    audioAssets: many(audioAssets),
    generationJob: one(generationJobs, {
        fields: [stories.id],
        references: [generationJobs.storyId],
    }),
}));

export const storySegmentsRelations = relations(storySegments, ({ one, many }) => ({
    story: one(stories, {
        fields: [storySegments.storyId],
        references: [stories.id],
    }),
    audioAssets: many(audioAssets),
}));

export const audioAssetsRelations = relations(audioAssets, ({ one }) => ({
    story: one(stories, {
        fields: [audioAssets.storyId],
        references: [stories.id],
    }),
    segment: one(storySegments, {
        fields: [audioAssets.segmentId],
        references: [storySegments.id],
    }),
}));

export const generationJobsRelations = relations(generationJobs, ({ one }) => ({
    story: one(stories, {
        fields: [generationJobs.storyId],
        references: [stories.id],
    }),
}));

/**
 * ElevenLabs Voices Table
 *
 * Cache local des voix disponibles pour eviter les appels API repetes.
 * Synchronise via le script `sync-voices`.
 *
 * Updated: Using typed columns instead of JSONB labels for efficient queries.
 */
export const elevenLabsVoices = pgTable(
    'elevenlabs_voices',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        voiceId: text('voice_id').notNull().unique(),
        name: text('name').notNull(),

        // Typed columns (replacing labels JSONB)
        gender: text('gender', { enum: [...VoiceGenderValues] }),
        age: text('age', { enum: [...VoiceAgeValues] }),
        accent: text('accent'),
        language: text('language'),
        locale: text('locale'),
        useCase: text('use_case', { enum: [...VoiceUseCaseValues] }),

        // Metadata
        category: text('category'),
        description: text('description'),
        previewUrl: text('preview_url'),
        isHighQuality: boolean('is_high_quality').default(false),

        // Legacy column (for migration - will be removed)
        labels: jsonb('labels').$type<Record<string, string>>(),

        // Timestamps
        lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        index('idx_voices_gender').on(table.gender),
        index('idx_voices_age').on(table.age),
        index('idx_voices_language').on(table.language),
        index('idx_voices_use_case').on(table.useCase),
    ]
);

// =============================================================================
// Audio Library Tables
// =============================================================================

/**
 * Audio Library SFX Table
 *
 * Persistent library of sound effects for reuse across stories.
 * Supports semantic lookup by category, subcategory, environment, and tags.
 */
export const audioLibrarySfx = pgTable(
    'audio_library_sfx',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        canonicalKey: text('canonical_key').notNull().unique(),

        // Taxonomy
        category: text('category', { enum: [...SfxLibraryCategoryValues] }).notNull(),
        subcategory: text('subcategory').notNull(),
        environment: text('environment', { enum: [...SfxEnvironmentValues] }),
        intensity: text('intensity', { enum: [...AudioIntensityValues] }).default('medium'),

        // Generation
        prompt: text('prompt').notNull(),
        promptInfluence: real('prompt_influence').notNull(),

        // Audio
        s3Url: text('s3_url').notNull(),
        durationSeconds: real('duration_seconds').notNull(),
        format: text('format').default('mp3').notNull(),

        // Search
        tags: text('tags').array(),
        storyUniverses: text('story_universes').array(),

        // Stats
        usageCount: integer('usage_count').default(0),
        lastUsedAt: timestamp('last_used_at'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        index('idx_sfx_category').on(table.category),
        index('idx_sfx_subcategory').on(table.subcategory),
        index('idx_sfx_environment').on(table.environment),
        index('idx_sfx_intensity').on(table.intensity),
        index('idx_sfx_tags').using('gin', table.tags),
        index('idx_sfx_universes').using('gin', table.storyUniverses),
    ]
);

/**
 * Audio Library Ambiance Table
 *
 * Persistent library of ambient sounds for reuse across stories.
 * Supports semantic lookup by environment, time of day, weather, and mood.
 */
export const audioLibraryAmbiance = pgTable(
    'audio_library_ambiance',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        canonicalKey: text('canonical_key').notNull().unique(),

        // Taxonomy
        environment: text('environment', { enum: [...AmbianceEnvironmentValues] }).notNull(),
        subEnvironment: text('sub_environment'),
        timeOfDay: text('time_of_day', { enum: [...TimeOfDayValues] }).default('any'),
        weather: text('weather', { enum: [...WeatherConditionValues] }).default('any'),
        mood: text('mood', { enum: [...AudioMoodValues] }),

        // Generation
        prompt: text('prompt').notNull(),
        promptInfluence: real('prompt_influence').notNull(),

        // Audio
        s3Url: text('s3_url').notNull(),
        sourceDurationSeconds: real('source_duration_seconds').notNull(),
        format: text('format').default('mp3').notNull(),
        isLoopable: boolean('is_loopable').default(true),

        // Search
        tags: text('tags').array(),
        storyUniverses: text('story_universes').array(),

        // Stats
        usageCount: integer('usage_count').default(0),
        lastUsedAt: timestamp('last_used_at'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        index('idx_ambiance_environment').on(table.environment),
        index('idx_ambiance_time_of_day').on(table.timeOfDay),
        index('idx_ambiance_weather').on(table.weather),
        index('idx_ambiance_mood').on(table.mood),
        index('idx_ambiance_tags').using('gin', table.tags),
        index('idx_ambiance_universes').using('gin', table.storyUniverses),
    ]
);

/**
 * Audio Library Music Table
 *
 * Persistent library of background music for reuse across stories.
 * Supports semantic lookup by mood, intensity, and tempo.
 */
export const audioLibraryMusic = pgTable(
    'audio_library_music',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        canonicalKey: text('canonical_key').notNull().unique(),

        // Taxonomy
        mood: text('mood', { enum: [...MusicMoodValues] }).notNull(),
        intensity: text('intensity', { enum: [...MusicIntensityValues] }).default('medium'),
        tempo: text('tempo', { enum: [...MusicTempoValues] }).default('medium'),
        variationIndex: integer('variation_index').default(0),

        // Generation
        prompt: text('prompt').notNull(),
        promptInfluence: real('prompt_influence').notNull(),

        // Audio
        s3Url: text('s3_url').notNull(),
        sourceDurationSeconds: real('source_duration_seconds').notNull(),
        format: text('format').default('mp3').notNull(),
        isLoopable: boolean('is_loopable').default(true),

        // Search
        tags: text('tags').array(),
        storyUniverses: text('story_universes').array(),

        // Stats
        usageCount: integer('usage_count').default(0),
        lastUsedAt: timestamp('last_used_at'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [
        index('idx_music_mood').on(table.mood),
        index('idx_music_intensity').on(table.intensity),
        index('idx_music_tempo').on(table.tempo),
        index('idx_music_tags').using('gin', table.tags),
        index('idx_music_universes').using('gin', table.storyUniverses),
    ]
);
