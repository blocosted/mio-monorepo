/**
 * Generation Jobs Store Integration Tests
 *
 * Tests CRUD operations for generation jobs with a real PostgreSQL database.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import { JobStatus, JobStep } from '@mio/shared/types';
import { Gender } from '@mio/shared';

import { cleanTestPostgresData } from '../../../tests/test-utils';
import { getInstance, IocConnection, IocStore } from '../../../ioc';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type { IProfilesStore } from '../../profiles/profiles.service.types';
import type { IStoriesStore } from '../stories.service.types';
import type { GenerationJobsStore } from '../generation-jobs.store';
import type { JobStepProgress } from '../stories.service.types';

describe('GenerationJobsStore', () => {
    let db: DatabaseConnection;
    let profilesStore: IProfilesStore;
    let storiesStore: IStoriesStore;
    let jobsStore: GenerationJobsStore;

    beforeAll(() => {
        db = getInstance<DatabaseConnection>(IocConnection.DATABASE);
        profilesStore = getInstance<IProfilesStore>(IocStore.PROFILES_STORE);
        storiesStore = getInstance<IStoriesStore>(IocStore.STORIES_STORE);
        jobsStore = getInstance<GenerationJobsStore>(IocStore.GENERATION_JOBS_STORE);
    });

    beforeEach(async () => {
        await cleanTestPostgresData(db);
    });

    afterEach(async () => {
        await cleanTestPostgresData(db);
    });

    describe('create()', () => {
        it('creates a generation job with minimal input', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Alice',
                age: 7,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            expect(job.id).toBeDefined();
            expect(job.storyId).toBe(story.id);
            expect(job.status).toBe(JobStatus.Pending);
            expect(job.progress).toBe(0);
            expect(job.createdAt).toBeInstanceOf(Date);
        });

        it('creates a job with custom status', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Bob',
                age: 8,
                gender: Gender.Boy,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
                status: JobStatus.Processing,
            });

            expect(job.status).toBe(JobStatus.Processing);
        });

        it('creates a job with steps', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Charlie',
                age: 6,
                gender: Gender.Neutral,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const steps: JobStepProgress[] = [
                {
                    name: JobStep.ScriptGeneration,
                    status: JobStatus.Completed,
                    progress: 100,
                    completedAt: new Date(),
                },
            ];

            const job = await jobsStore.create({
                storyId: story.id,
                steps,
            });

            expect(job.steps).toHaveLength(1);
            expect(job.steps[0].name).toBe(JobStep.ScriptGeneration);
            expect(job.steps[0].status).toBe(JobStatus.Completed);
        });
    });

    describe('findById()', () => {
        it('returns job when found', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Diana',
                age: 9,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const created = await jobsStore.create({
                storyId: story.id,
            });

            const found = await jobsStore.findById(created.id);

            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.storyId).toBe(story.id);
        });

        it('returns null when job not found', async () => {
            const found = await jobsStore.findById('00000000-0000-0000-0000-000000000000');
            expect(found).toBeNull();
        });
    });

    describe('findByStoryId()', () => {
        it('returns job for story', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Eve',
                age: 7,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const created = await jobsStore.create({
                storyId: story.id,
            });

            const found = await jobsStore.findByStoryId(story.id);

            expect(found).not.toBeNull();
            expect(found?.storyId).toBe(story.id);
            expect(found?.id).toBe(created.id);
        });

        it('returns null when no job for story', async () => {
            const found = await jobsStore.findByStoryId('00000000-0000-0000-0000-000000000000');
            expect(found).toBeNull();
        });
    });

    describe('findByStatus()', () => {
        it('returns all jobs with given status', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Frank',
                age: 8,
                gender: Gender.Boy,
            });

            const story1 = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Story 1',
            });

            const story2 = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Story 2',
            });

            // Delete any existing jobs to avoid conflicts
            await jobsStore.deleteByStoryId(story1.id);
            await jobsStore.deleteByStoryId(story2.id);

            await jobsStore.create({
                storyId: story1.id,
                status: JobStatus.Pending,
            });

            await jobsStore.create({
                storyId: story2.id,
                status: JobStatus.Pending,
            });

            const pendingJobs = await jobsStore.findByStatus(JobStatus.Pending);

            expect(pendingJobs.length).toBeGreaterThanOrEqual(2);
            expect(pendingJobs.every(j => j.status === JobStatus.Pending)).toBe(true);
        });

        it('returns empty array when no jobs with status', async () => {
            const jobs = await jobsStore.findByStatus(JobStatus.Cancelled);
            expect(Array.isArray(jobs)).toBe(true);
        });
    });

    describe('findPending()', () => {
        it('returns pending jobs', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Grace',
                age: 6,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            await jobsStore.deleteByStoryId(story.id);

            await jobsStore.create({
                storyId: story.id,
                status: JobStatus.Pending,
            });

            const pending = await jobsStore.findPending();

            expect(pending.length).toBeGreaterThanOrEqual(1);
            expect(pending.every(j => j.status === JobStatus.Pending)).toBe(true);
        });
    });

    describe('findProcessing()', () => {
        it('returns processing jobs', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Henry',
                age: 9,
                gender: Gender.Boy,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            await jobsStore.deleteByStoryId(story.id);

            await jobsStore.create({
                storyId: story.id,
                status: JobStatus.Processing,
            });

            const processing = await jobsStore.findProcessing();

            expect(processing.length).toBeGreaterThanOrEqual(1);
            expect(processing.every(j => j.status === JobStatus.Processing)).toBe(true);
        });
    });

    describe('update()', () => {
        it('updates job fields', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Ivy',
                age: 7,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const updated = await jobsStore.update(job.id, {
                status: JobStatus.Processing,
                progress: 50,
                currentStep: JobStep.GeneratingVoice,
            });

            expect(updated).not.toBeNull();
            expect(updated?.status).toBe(JobStatus.Processing);
            expect(updated?.progress).toBe(50);
            expect(updated?.currentStep).toBe(JobStep.GeneratingVoice);
        });

        it('returns null when job not found', async () => {
            const updated = await jobsStore.update('00000000-0000-0000-0000-000000000000', {
                status: JobStatus.Processing,
            });

            expect(updated).toBeNull();
        });
    });

    describe('updateStatus()', () => {
        it('updates job status', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Jack',
                age: 8,
                gender: Gender.Boy,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const updated = await jobsStore.updateStatus(job.id, JobStatus.Completed);

            expect(updated?.status).toBe(JobStatus.Completed);
        });

        it('updates status with error', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Kate',
                age: 6,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const updated = await jobsStore.updateStatus(job.id, JobStatus.Failed, 'Test error');

            expect(updated?.status).toBe(JobStatus.Failed);
            expect(updated?.error).toBe('Test error');
        });
    });

    describe('updateProgress()', () => {
        it('updates job progress', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Liam',
                age: 9,
                gender: Gender.Boy,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const updated = await jobsStore.updateProgress(job.id, {
                progress: 75,
                currentStep: JobStep.Mixing,
            });

            expect(updated?.progress).toBe(75);
            expect(updated?.currentStep).toBe(JobStep.Mixing);
        });
    });

    describe('updateWorkflowRunId()', () => {
        it('updates workflow run ID', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Mia',
                age: 7,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const workflowRunId = 'wfr_' + crypto.randomUUID();
            const updated = await jobsStore.updateWorkflowRunId(job.id, workflowRunId);

            expect(updated?.workflowRunId).toBe(workflowRunId);
        });
    });

    describe('complete()', () => {
        it('marks job as completed with result', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Noah',
                age: 8,
                gender: Gender.Boy,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const result = {
                audioUrl: 'https://example.com/audio.mp3',
                duration: 120,
            };

            const completed = await jobsStore.complete(job.id, result);

            expect(completed?.status).toBe(JobStatus.Completed);
            expect(completed?.progress).toBe(100);
            expect(completed?.result).toEqual(result);
        });
    });

    describe('fail()', () => {
        it('marks job as failed with error', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Olivia',
                age: 6,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const failed = await jobsStore.fail(job.id, 'Generation failed');

            expect(failed?.status).toBe(JobStatus.Failed);
            expect(failed?.error).toBe('Generation failed');
        });
    });

    describe('cancel()', () => {
        it('marks job as cancelled', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Paul',
                age: 9,
                gender: Gender.Boy,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            const cancelled = await jobsStore.cancel(job.id);

            expect(cancelled?.status).toBe(JobStatus.Cancelled);
        });
    });

    describe('delete()', () => {
        it('deletes a job by ID', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Quinn',
                age: 7,
                gender: Gender.Neutral,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            await jobsStore.delete(job.id);

            const found = await jobsStore.findById(job.id);
            expect(found).toBeNull();
        });
    });

    describe('deleteByStoryId()', () => {
        it('deletes job by story ID', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Rachel',
                age: 8,
                gender: Gender.Girl,
            });

            const story = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Test story',
            });

            const job = await jobsStore.create({
                storyId: story.id,
            });

            await jobsStore.deleteByStoryId(story.id);

            const found = await jobsStore.findById(job.id);
            expect(found).toBeNull();
        });
    });

    describe('countByStatus()', () => {
        it('counts jobs by status', async () => {
            const profile = await profilesStore.insert({
                firstName: 'Sam',
                age: 6,
                gender: Gender.Neutral,
            });

            const story1 = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Story 1',
            });

            const story2 = await storiesStore.insert({
                childProfileId: profile.id,
                initialPrompt: 'Story 2',
            });

            // Clean up first
            await jobsStore.deleteByStoryId(story1.id);
            await jobsStore.deleteByStoryId(story2.id);

            await jobsStore.create({
                storyId: story1.id,
                status: JobStatus.Pending,
            });

            await jobsStore.create({
                storyId: story2.id,
                status: JobStatus.Pending,
            });

            const count = await jobsStore.countByStatus(JobStatus.Pending);

            expect(count).toBeGreaterThanOrEqual(2);
        });
    });
});
