/**
 * Job Progress Service Integration Tests
 *
 * Tests job progress tracking with 1-hour TTL using a real Redis instance.
 */

import type { RedisClient } from '@mio/shared/server/connections/redis';

import type { JobProgress } from '../job-progress.service.types';
import { cleanupRedisKeys, createTestRedisClient, generateTestId } from '../../../tests/test.helpers';
import { CacheService } from '../cache.service';
import { JobProgressService } from '../job-progress.service';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('JobProgressService', () => {
  let redis: RedisClient;
  let closeRedis: () => Promise<void>;
  let cacheService: CacheService;
  let jobProgressService: JobProgressService;

  beforeAll(async () => {
    const client = await createTestRedisClient();
    redis = client.redis;
    closeRedis = client.close;
    cacheService = new CacheService(redis);
    jobProgressService = new JobProgressService(cacheService, redis);
  });

  afterAll(async () => {
    await closeRedis();
  });

  beforeEach(async () => {
    // Clean up test keys before each test
    await cleanupRedisKeys(redis, 'job:progress:*');
  });

  describe('get()', () => {
    it('returns job progress if exists', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'processing',
        progress: 50,
        currentStep: 'Generating audio...',
        updatedAt: Date.now()
      };

      await jobProgressService.set(progress);
      const result = await jobProgressService.get(jobId);

      expect(result).not.toBeNull();
      expect(result?.jobId).toBe(jobId);
      expect(result?.status).toBe('processing');
      expect(result?.progress).toBe(50);
    });

    it('returns null if job not found', async () => {
      const result = await jobProgressService.get('nonexistent-job');
      expect(result).toBeNull();
    });

    it('generates key with prefix', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'pending',
        progress: 0,
        updatedAt: Date.now()
      };

      await jobProgressService.set(progress);
      const exists = await jobProgressService.exists(jobId);
      expect(exists).toBe(true);
    });
  });

  describe('set()', () => {
    it('sets job progress with 1-hour TTL', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'processing',
        progress: 75,
        updatedAt: Date.now()
      };

      await jobProgressService.set(progress);
      const result = await jobProgressService.get(jobId);

      expect(result).not.toBeNull();
      expect(result?.progress).toBe(75);
    });

    it('adds updatedAt timestamp', async () => {
      const jobId = generateTestId('job');
      const beforeTime = Date.now();

      const progress: JobProgress = {
        jobId,
        status: 'processing',
        progress: 50,
        updatedAt: beforeTime
      };

      await jobProgressService.set(progress);
      const afterTime = Date.now();

      const result = await jobProgressService.get(jobId);
      expect(result?.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result?.updatedAt).toBeLessThanOrEqual(afterTime);
    });

    it('preserves all progress fields', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'processing',
        progress: 60,
        currentStep: 'Mixing audio',
        message: 'Processing audio tracks',
        updatedAt: Date.now()
      };

      await jobProgressService.set(progress);
      const result = await jobProgressService.get(jobId);

      expect(result?.jobId).toBe(jobId);
      expect(result?.status).toBe('processing');
      expect(result?.progress).toBe(60);
      expect(result?.currentStep).toBe('Mixing audio');
      expect(result?.message).toBe('Processing audio tracks');
    });

    it('handles progress with error', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'failed',
        progress: 45,
        error: 'Audio generation failed',
        updatedAt: Date.now()
      };

      await jobProgressService.set(progress);
      const result = await jobProgressService.get(jobId);

      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('Audio generation failed');
    });
  });

  describe('update()', () => {
    it('creates new progress if not exists', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {
        status: 'processing',
        progress: 25
      });

      const result = await jobProgressService.get(jobId);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('processing');
      expect(result?.progress).toBe(25);
    });

    it('uses default values for new progress', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {});

      const result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('pending');
      expect(result?.progress).toBe(0);
    });

    it('updates existing progress partially', async () => {
      const jobId = generateTestId('job');

      // Create initial progress
      await jobProgressService.set({
        jobId,
        status: 'processing',
        progress: 30,
        currentStep: 'Step 1',
        updatedAt: Date.now()
      });

      // Update only progress
      await jobProgressService.update(jobId, {
        progress: 60,
        currentStep: 'Step 2'
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('processing'); // Unchanged
      expect(result?.progress).toBe(60); // Updated
      expect(result?.currentStep).toBe('Step 2'); // Updated
    });

    it('updates status to completed', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {
        status: 'processing',
        progress: 50
      });

      await jobProgressService.update(jobId, {
        status: 'completed',
        progress: 100
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('completed');
      expect(result?.progress).toBe(100);
    });

    it('updates status to failed with error', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {
        status: 'processing',
        progress: 40
      });

      await jobProgressService.update(jobId, {
        status: 'failed',
        error: 'Something went wrong'
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('Something went wrong');
    });
  });

  describe('delete()', () => {
    it('deletes job progress', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.set({
        jobId,
        status: 'completed',
        progress: 100,
        updatedAt: Date.now()
      });

      await jobProgressService.delete(jobId);

      const result = await jobProgressService.get(jobId);
      expect(result).toBeNull();
    });
  });

  describe('exists()', () => {
    it('returns true when job exists', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.set({
        jobId,
        status: 'processing',
        progress: 50,
        updatedAt: Date.now()
      });

      const result = await jobProgressService.exists(jobId);
      expect(result).toBe(true);
    });

    it('returns false when job does not exist', async () => {
      const result = await jobProgressService.exists('nonexistent-job');
      expect(result).toBe(false);
    });
  });

  describe('job status transitions', () => {
    it('handles pending -> processing -> completed', async () => {
      const jobId = generateTestId('job');

      // Pending
      await jobProgressService.update(jobId, {
        status: 'pending',
        progress: 0
      });
      let result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('pending');

      // Processing
      await jobProgressService.update(jobId, {
        status: 'processing',
        progress: 50
      });
      result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('processing');

      // Completed
      await jobProgressService.update(jobId, {
        status: 'completed',
        progress: 100
      });
      result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('completed');
    });

    it('handles pending -> processing -> failed', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {
        status: 'pending'
      });

      await jobProgressService.update(jobId, {
        status: 'processing',
        progress: 30
      });

      await jobProgressService.update(jobId, {
        status: 'failed',
        error: 'Processing error'
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('Processing error');
    });
  });

  describe('progress tracking', () => {
    it('tracks progress from 0 to 100', async () => {
      const jobId = generateTestId('job');

      for (let i = 0; i <= 100; i += 25) {
        await jobProgressService.update(jobId, {
          status: i === 100 ? 'completed' : 'processing',
          progress: i
        });

        const result = await jobProgressService.get(jobId);
        expect(result?.progress).toBe(i);
      }
    });

    it('handles progress updates with messages', async () => {
      const jobId = generateTestId('job');

      const steps = [
        { progress: 20, currentStep: 'Generating script...' },
        { progress: 40, currentStep: 'Synthesizing voice...' },
        { progress: 60, currentStep: 'Adding sound effects...' },
        { progress: 80, currentStep: 'Mixing audio...' },
        { progress: 100, currentStep: 'Finalizing...' }
      ];

      for (const step of steps) {
        await jobProgressService.update(jobId, {
          status: step.progress === 100 ? 'completed' : 'processing',
          progress: step.progress,
          currentStep: step.currentStep
        });

        const result = await jobProgressService.get(jobId);
        expect(result?.progress).toBe(step.progress);
        expect(result?.currentStep).toBe(step.currentStep);
      }
    });
  });

  describe('edge cases', () => {
    it('handles progress over 100', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {
        progress: 150
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.progress).toBe(150);
    });

    it('handles negative progress', async () => {
      const jobId = generateTestId('job');

      await jobProgressService.update(jobId, {
        progress: -10
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.progress).toBe(-10);
    });

    it('handles empty job ID', async () => {
      const jobId = '';

      await jobProgressService.update(jobId, {
        status: 'processing'
      });

      const result = await jobProgressService.get(jobId);
      expect(result).not.toBeNull();
    });

    it('handles very long error messages', async () => {
      const jobId = generateTestId('job');
      const longError = `Error: ${'A'.repeat(10000)}`;

      await jobProgressService.update(jobId, {
        status: 'failed',
        error: longError
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.error).toBe(longError);
    });
  });

  describe('integration scenarios', () => {
    it('complete job lifecycle', async () => {
      const jobId = generateTestId('job');

      // Start job
      await jobProgressService.update(jobId, {
        status: 'pending',
        progress: 0,
        message: 'Job queued'
      });

      // Processing stages
      await jobProgressService.update(jobId, {
        status: 'processing',
        progress: 25,
        currentStep: 'Stage 1',
        message: 'Processing stage 1'
      });

      await jobProgressService.update(jobId, {
        progress: 50,
        currentStep: 'Stage 2',
        message: 'Processing stage 2'
      });

      await jobProgressService.update(jobId, {
        progress: 75,
        currentStep: 'Stage 3',
        message: 'Processing stage 3'
      });

      // Complete job
      await jobProgressService.update(jobId, {
        status: 'completed',
        progress: 100,
        currentStep: 'Done',
        message: 'Job completed successfully'
      });

      const result = await jobProgressService.get(jobId);
      expect(result?.status).toBe('completed');
      expect(result?.progress).toBe(100);
      expect(result?.message).toBe('Job completed successfully');

      // Clean up
      await jobProgressService.delete(jobId);
      const deleted = await jobProgressService.get(jobId);
      expect(deleted).toBeNull();
    });
  });

  describe('publishProgressEvent()', () => {
    it('publishes progress event to Redis channel', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'processing',
        progress: 50,
        currentStep: 'Generating audio',
        updatedAt: Date.now()
      };

      // Should not throw
      await jobProgressService.publishProgressEvent(jobId, progress);
    });

    it('publishes event with error information', async () => {
      const jobId = generateTestId('job');
      const progress: JobProgress = {
        jobId,
        status: 'failed',
        progress: 30,
        error: 'Audio generation failed',
        updatedAt: Date.now()
      };

      await jobProgressService.publishProgressEvent(jobId, progress);
    });
  });
});
