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
} from 'drizzle-orm/pg-core';

import {
    Gender,
    StoryDuration,
    NarratorVoice,
    Language,
    HeroGender,
} from '@mio/shared/types';
import {
    StoryStatus,
    SegmentType,
    AudioAssetType,
    JobStatus,
    type EnrichedConcept,
    type StoryScript,
    type StoryAnswer,
    type JobStepProgress,
} from '@mio/shared';

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
    enrichedConcept: jsonb('enriched_concept').$type<EnrichedConcept>(),
    script: jsonb('script').$type<StoryScript>(),
    answers: jsonb('answers').$type<StoryAnswer[]>(),
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
    steps: jsonb('steps').$type<JobStepProgress[]>().default([]),
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
