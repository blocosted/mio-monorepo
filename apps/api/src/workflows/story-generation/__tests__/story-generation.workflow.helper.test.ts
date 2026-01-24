/**
 * Workflow Step Helper Tests
 *
 * Tests for the helper class that handles retry logic, rollback, and progress tracking.
 */

import { JobStatus, JobStep } from '@mio/shared/types';

// Mock the IoC module
import { IocConnection, IocService, IocStore } from '../../../ioc/ioc.types';
import * as iocConfig from '../../../ioc/ioc.config';
import { WorkflowStepHelper } from '../story-generation.workflow.helper';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

describe('WorkflowStepHelper', () => {
  // Spy reference for cleanup
  let getInstanceSpy: ReturnType<typeof spyOn>;

  let helper: WorkflowStepHelper;
  let mockLogger: any;
  let mockJobProgress: any;
  let mockJobsStore: any;

  const jobId = 'job-123';

  beforeEach(() => {
    mockLogger = {
      info: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {})
    };

    mockJobProgress = {
      update: mock(() => Promise.resolve())
    };

    mockJobsStore = {
      findById: mock(() => Promise.resolve({ status: JobStatus.Processing })),
      updateProgress: mock(() => Promise.resolve()),
      fail: mock(() => Promise.resolve())
    };

    // Mock getInstance to return our mocks
    getInstanceSpy = spyOn(iocConfig, 'getInstance').mockImplementation((identifier: any) => {
      const mocks: Record<string, any> = {
        [IocConnection.LOGGER]: mockLogger,
        [IocService.JOB_PROGRESS]: mockJobProgress,
        [IocStore.GENERATION_JOBS_STORE]: mockJobsStore
      };
      return mocks[identifier];
    });

    helper = new WorkflowStepHelper();
  });

  afterEach(() => {
    // Restore the spy to avoid affecting other tests
    getInstanceSpy.mockRestore();
  });

  describe('executeStepWithRollback()', () => {
    it('executes step function successfully', async () => {
      const stepFn = mock(() => Promise.resolve('success'));

      const result = await helper.executeStepWithRollback(jobId, 'test_step', stepFn);

      expect(result).toBe('success');
      expect(stepFn).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting step: test_step', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Step completed successfully: test_step', expect.any(Object));
    });

    it('retries on failure with exponential backoff', async () => {
      let attempts = 0;
      const stepFn = mock(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve('success after retry');
      });

      const result = await helper.executeStepWithRollback(jobId, 'test_step', stepFn, undefined, { retries: 3, timeout: 10000 });

      expect(result).toBe('success after retry');
      expect(attempts).toBe(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2); // Two failed attempts before success
    }, 15000); // Increase timeout for retry delays

    it('calls rollback function after all retries fail', async () => {
      const stepFn = mock(() => Promise.reject(new Error('Persistent failure')));
      const rollbackFn = mock(() => Promise.resolve());

      await expect(helper.executeStepWithRollback(jobId, 'test_step', stepFn, rollbackFn, { retries: 1, timeout: 10000 })).rejects.toThrow(
        'Persistent failure'
      );

      expect(rollbackFn).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Executing rollback for step test_step', { jobId });
    });

    it('marks job as failed after all retries exhausted', async () => {
      const stepFn = mock(() => Promise.reject(new Error('Fatal error')));

      await expect(helper.executeStepWithRollback(jobId, 'test_step', stepFn, undefined, { retries: 1, timeout: 10000 })).rejects.toThrow('Fatal error');

      expect(mockJobsStore.fail).toHaveBeenCalledWith(jobId, 'Step test_step failed: Fatal error');
      expect(mockJobProgress.update).toHaveBeenCalledWith(jobId, {
        status: 'failed',
        error: 'Fatal error',
        currentStep: 'test_step'
      });
    });

    it('handles rollback errors gracefully', async () => {
      const stepFn = mock(() => Promise.reject(new Error('Step failed')));
      const rollbackFn = mock(() => Promise.reject(new Error('Rollback also failed')));

      await expect(helper.executeStepWithRollback(jobId, 'test_step', stepFn, rollbackFn, { retries: 1, timeout: 10000 })).rejects.toThrow('Step failed');

      // Rollback was attempted
      expect(rollbackFn).toHaveBeenCalled();
      // Rollback error was logged
      expect(mockLogger.error).toHaveBeenCalledWith('Rollback failed for step test_step', expect.objectContaining({ error: 'Rollback also failed' }));
    });

    it('times out if step takes too long', async () => {
      const stepFn = mock(() => new Promise((resolve) => setTimeout(() => resolve('too late'), 200)));

      await expect(helper.executeStepWithRollback(jobId, 'test_step', stepFn, undefined, { retries: 1, timeout: 50 })).rejects.toThrow(
        'Step test_step timeout after 50ms'
      );
    });
  });

  describe('updateProgress()', () => {
    it('updates progress in DB and Redis', async () => {
      await helper.updateProgress(jobId, 50, 'voice_generation', { extraData: 'test' });

      expect(mockJobsStore.updateProgress).toHaveBeenCalledWith(jobId, {
        progress: 50,
        currentStep: JobStep.GeneratingVoice
      });

      expect(mockJobProgress.update).toHaveBeenCalledWith(jobId, {
        progress: 50,
        status: 'processing',
        currentStep: 'voice_generation',
        metadata: { extraData: 'test' }
      });
    });

    it('logs progress update', async () => {
      await helper.updateProgress(jobId, 75, 'mixing');

      expect(mockLogger.debug).toHaveBeenCalledWith('Progress updated', {
        jobId,
        progress: 75,
        currentStep: 'mixing'
      });
    });

    it('handles progress update errors gracefully', async () => {
      mockJobsStore.updateProgress = mock(() => Promise.reject(new Error('DB error')));

      // Should not throw, just log the error
      await helper.updateProgress(jobId, 50, 'test_step');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update progress', expect.objectContaining({ error: 'DB error' }));
    });
  });

  describe('isJobCancelled()', () => {
    it('returns true when job status is Cancelled', async () => {
      mockJobsStore.findById = mock(() => Promise.resolve({ status: JobStatus.Cancelled }));

      const result = await helper.isJobCancelled(jobId);

      expect(result).toBe(true);
    });

    it('returns false when job status is Processing', async () => {
      mockJobsStore.findById = mock(() => Promise.resolve({ status: JobStatus.Processing }));

      const result = await helper.isJobCancelled(jobId);

      expect(result).toBe(false);
    });

    it('returns false when job status is Pending', async () => {
      mockJobsStore.findById = mock(() => Promise.resolve({ status: JobStatus.Pending }));

      const result = await helper.isJobCancelled(jobId);

      expect(result).toBe(false);
    });

    it('returns false when job not found', async () => {
      mockJobsStore.findById = mock(() => Promise.resolve(null));

      const result = await helper.isJobCancelled(jobId);

      expect(result).toBe(false);
    });
  });

  describe('step name to JobStep mapping', () => {
    const stepMappings = [
      ['enrichment', JobStep.ScriptGeneration],
      ['script_generation', JobStep.ScriptGeneration],
      ['voice_generation', JobStep.GeneratingVoice],
      ['sfx_generation', JobStep.GeneratingSfx],
      ['music_generation', JobStep.GeneratingMusic],
      ['ambiance_generation', JobStep.GeneratingAmbiance],
      ['mixing', JobStep.Mixing],
      ['upload', JobStep.Finalizing],
      ['finalization', JobStep.Finalizing]
    ];

    it.each(stepMappings)('maps %s to correct JobStep', async (stepName, expectedJobStep) => {
      await helper.updateProgress(jobId, 50, stepName as string);

      expect(mockJobsStore.updateProgress).toHaveBeenCalledWith(jobId, {
        progress: 50,
        currentStep: expectedJobStep
      });
    });
  });
});
