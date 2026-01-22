/**
 * Generation Jobs Store
 *
 * Data access layer for generation jobs table.
 * Handles CRUD operations for story generation job tracking.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { eq, desc } from 'drizzle-orm';

import { generationJobs } from '@mio/db/schema';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { IocConnection } from '../../ioc';
import { JobStatus, type JobStepProgress } from '@mio/shared';

/**
 * Generation job row from database
 */
export type GenerationJobRow = typeof generationJobs.$inferSelect;

/**
 * Input for creating a generation job
 */
export interface CreateGenerationJobInput {
    storyId: string;
    status?: JobStatus;
    currentStep?: string;
    steps?: JobStepProgress[];
}

/**
 * Input for updating a generation job
 */
export interface UpdateGenerationJobInput {
    status?: JobStatus;
    progress?: number;
    currentStep?: string;
    steps?: JobStepProgress[];
    result?: { audioUrl: string; duration: number };
    error?: string;
}

/**
 * Generation Jobs Store
 *
 * Provides data access methods for generation job tracking.
 */
@injectable()
export class GenerationJobsStore {
    constructor(
        @inject(IocConnection.DATABASE)
        private readonly db: DatabaseConnection,
    ) {}

    /**
     * Create a new generation job
     */
    async create(input: CreateGenerationJobInput): Promise<GenerationJobRow> {
        const [job] = await this.db
            .insert(generationJobs)
            .values({
                storyId: input.storyId,
                status: input.status ?? JobStatus.Pending,
                currentStep: input.currentStep,
                steps: input.steps ?? [],
            })
            .returning();

        if (!job) {
            throw new Error('Failed to create generation job');
        }

        return job;
    }

    /**
     * Find a generation job by ID
     */
    async findById(id: string): Promise<GenerationJobRow | null> {
        const [job] = await this.db
            .select()
            .from(generationJobs)
            .where(eq(generationJobs.id, id))
            .limit(1);

        return job || null;
    }

    /**
     * Find a generation job by story ID
     */
    async findByStoryId(storyId: string): Promise<GenerationJobRow | null> {
        const [job] = await this.db
            .select()
            .from(generationJobs)
            .where(eq(generationJobs.storyId, storyId))
            .limit(1);

        return job || null;
    }

    /**
     * Find all jobs with a specific status
     */
    async findByStatus(status: JobStatus): Promise<GenerationJobRow[]> {
        return this.db
            .select()
            .from(generationJobs)
            .where(eq(generationJobs.status, status))
            .orderBy(desc(generationJobs.createdAt));
    }

    /**
     * Find all pending jobs
     */
    async findPending(): Promise<GenerationJobRow[]> {
        return this.findByStatus(JobStatus.Pending);
    }

    /**
     * Find all processing jobs
     */
    async findProcessing(): Promise<GenerationJobRow[]> {
        return this.findByStatus(JobStatus.Processing);
    }

    /**
     * Update a generation job
     */
    async update(id: string, input: UpdateGenerationJobInput): Promise<GenerationJobRow | null> {
        const [job] = await this.db
            .update(generationJobs)
            .set({
                status: input.status,
                progress: input.progress,
                currentStep: input.currentStep,
                steps: input.steps,
                result: input.result,
                error: input.error,
                updatedAt: new Date(),
            })
            .where(eq(generationJobs.id, id))
            .returning();

        return job || null;
    }

    /**
     * Update job status
     */
    async updateStatus(id: string, status: JobStatus, error?: string): Promise<GenerationJobRow | null> {
        return this.update(id, { status, error });
    }

    /**
     * Update job progress
     */
    async updateProgress(
        id: string,
        progress: number,
        currentStep?: string,
        steps?: JobStepProgress[]
    ): Promise<GenerationJobRow | null> {
        return this.update(id, { progress, currentStep, steps });
    }

    /**
     * Mark job as completed with result
     */
    async complete(
        id: string,
        result: { audioUrl: string; duration: number }
    ): Promise<GenerationJobRow | null> {
        return this.update(id, {
            status: JobStatus.Completed,
            progress: 100,
            result,
        });
    }

    /**
     * Mark job as failed with error
     */
    async fail(id: string, error: string): Promise<GenerationJobRow | null> {
        return this.update(id, {
            status: JobStatus.Failed,
            error,
        });
    }

    /**
     * Cancel a job
     */
    async cancel(id: string): Promise<GenerationJobRow | null> {
        return this.updateStatus(id, JobStatus.Cancelled);
    }

    /**
     * Delete a generation job
     */
    async delete(id: string): Promise<void> {
        await this.db
            .delete(generationJobs)
            .where(eq(generationJobs.id, id));
    }

    /**
     * Delete job by story ID
     */
    async deleteByStoryId(storyId: string): Promise<void> {
        await this.db
            .delete(generationJobs)
            .where(eq(generationJobs.storyId, storyId));
    }

    /**
     * Count jobs by status
     */
    async countByStatus(status: JobStatus): Promise<number> {
        const jobs = await this.findByStatus(status);
        return jobs.length;
    }
}
