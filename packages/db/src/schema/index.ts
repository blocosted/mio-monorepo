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
import type {
    ChildPreferences,
    EnrichedConcept,
    StoryScript,
    StoryAnswer,
    JobStepProgress,
} from '@mio/shared';

/**
 * Child Profiles Table
 */
export const childProfiles = pgTable('child_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    age: integer('age').notNull(),
    gender: text('gender', { enum: ['boy', 'girl', 'neutral'] }).notNull(),
    preferences: jsonb('preferences').$type<ChildPreferences>().default({}),
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
        enum: ['draft', 'generating', 'ready', 'failed'],
    })
        .default('draft')
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
        enum: ['narration', 'dialogue', 'pause', 'sound_effect', 'music_change'],
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
        enum: ['voice', 'sfx', 'music', 'ambiance', 'final_mix'],
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
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    })
        .default('pending')
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
