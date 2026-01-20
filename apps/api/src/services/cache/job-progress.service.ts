/**
 * Job Progress Service Implementation
 *
 * Tracks generation job progress in Redis with 1-hour TTL.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';

import { IocService } from '../../ioc';
import type { ICacheService } from './cache.service.types';
import type {
    IJobProgressService,
    JobProgress,
} from './job-progress.service.types';

/** 1 hour in seconds */
const JOB_PROGRESS_TTL_SECONDS = 60 * 60;

/** Cache key prefix */
const JOB_PROGRESS_PREFIX = 'job:progress';

/**
 * Job Progress Service
 *
 * Tracks job progress for SSE/polling endpoints.
 */
@injectable()
export class JobProgressService implements IJobProgressService {
    constructor(
        @inject(IocService.CACHE) private readonly cache: ICacheService
    ) {}

    /**
     * Generate cache key for job progress
     */
    private generateKey(jobId: string): string {
        return `${JOB_PROGRESS_PREFIX}:${jobId}`;
    }

    /**
     * Get job progress
     */
    async get(jobId: string): Promise<JobProgress | null> {
        const key = this.generateKey(jobId);
        return this.cache.get<JobProgress>(key);
    }

    /**
     * Set job progress
     */
    async set(progress: JobProgress): Promise<void> {
        const key = this.generateKey(progress.jobId);
        const progressWithTimestamp: JobProgress = {
            ...progress,
            updatedAt: Date.now(),
        };
        await this.cache.set(key, progressWithTimestamp, { ex: JOB_PROGRESS_TTL_SECONDS });
    }

    /**
     * Update job progress partially
     */
    async update(jobId: string, update: Partial<Omit<JobProgress, 'jobId'>>): Promise<void> {
        const existing = await this.get(jobId);
        if (!existing) {
            const newProgress: JobProgress = {
                jobId,
                status: 'pending',
                progress: 0,
                updatedAt: Date.now(),
                ...update,
            };
            await this.set(newProgress);
            return;
        }

        const updated: JobProgress = {
            ...existing,
            ...update,
            jobId,
            updatedAt: Date.now(),
        };
        await this.set(updated);
    }

    /**
     * Delete job progress
     */
    async delete(jobId: string): Promise<void> {
        const key = this.generateKey(jobId);
        await this.cache.delete(key);
    }

    /**
     * Check if job progress exists
     */
    async exists(jobId: string): Promise<boolean> {
        const key = this.generateKey(jobId);
        return this.cache.exists(key);
    }
}
