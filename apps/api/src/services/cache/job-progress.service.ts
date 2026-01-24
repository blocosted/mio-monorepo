/**
 * Job Progress Service Implementation
 *
 * Tracks generation job progress in Redis with 1-hour TTL.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { RedisClient } from '@mio/shared/server/connections/redis';

import type { ICacheService } from './cache.service.types';
import type { IJobProgressService, JobProgress } from './job-progress.service.types';
import { IocConnection, IocService } from '../../ioc/ioc.types';

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
    @inject(IocService.CACHE) private readonly cache: ICacheService,
    @inject(IocConnection.REDIS) private readonly redis: RedisClient
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
      updatedAt: Date.now()
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
        ...update
      };
      await this.set(newProgress);
      // Publish event
      await this.publishProgressEvent(jobId, newProgress);
      return;
    }

    const updated: JobProgress = {
      ...existing,
      ...update,
      jobId,
      updatedAt: Date.now()
    };
    await this.set(updated);
    // Publish event
    await this.publishProgressEvent(jobId, updated);
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

  /**
   * Generate Pub/Sub channel name for job progress events
   */
  private generateChannelName(jobId: string): string {
    return `${JOB_PROGRESS_PREFIX}:events:${jobId}`;
  }

  /**
   * Publish progress event to Redis Pub/Sub
   */
  async publishProgressEvent(jobId: string, progress: JobProgress): Promise<void> {
    const channel = this.generateChannelName(jobId);
    const message = JSON.stringify(progress);
    await this.redis.publish(channel, message);
  }

  /**
   * Subscribe to job progress events via Redis Pub/Sub
   */
  async subscribe(jobId: string, callback: (progress: JobProgress) => void): Promise<() => Promise<void>> {
    const channel = this.generateChannelName(jobId);

    // Create a duplicate connection for subscribing
    // (Redis pub/sub requires a dedicated connection)
    const subscriber = this.redis.duplicate();

    await subscriber.subscribe(channel, (message) => {
      try {
        const progress = JSON.parse(message) as JobProgress;
        callback(progress);
      } catch (error) {
        console.error('Failed to parse progress event', {
          jobId,
          message,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Return unsubscribe function
    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    };
  }
}
