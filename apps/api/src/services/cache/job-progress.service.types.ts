/**
 * Job Progress Service Types
 */

import type { JobStatus } from '@mio/shared/types';

/**
 * Job progress data
 */
export interface JobProgress {
  /** Job ID */
  jobId: string;
  /** Current status */
  status: JobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step description */
  currentStep?: string;
  /** Optional human-readable message (more detailed than currentStep) */
  message?: string;
  /** Total number of steps */
  totalSteps?: number;
  /** Current step number */
  currentStepNumber?: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp of last update */
  updatedAt: number;
}

/**
 * Job Progress Service Interface
 */
export interface IJobProgressService {
  /**
   * Get job progress
   * @param jobId - Job ID
   * @returns Job progress or null if not found
   */
  get(jobId: string): Promise<JobProgress | null>;

  /**
   * Set job progress
   * @param progress - Job progress data
   */
  set(progress: JobProgress): Promise<void>;

  /**
   * Update job progress partially
   * @param jobId - Job ID
   * @param update - Partial progress update
   */
  update(jobId: string, update: Partial<Omit<JobProgress, 'jobId'>>): Promise<void>;

  /**
   * Delete job progress
   * @param jobId - Job ID
   */
  delete(jobId: string): Promise<void>;

  /**
   * Check if job progress exists
   * @param jobId - Job ID
   * @returns True if exists
   */
  exists(jobId: string): Promise<boolean>;

  /**
   * Subscribe to job progress events via Redis Pub/Sub
   * @param jobId - Job ID
   * @param callback - Callback function invoked on progress updates
   * @returns Unsubscribe function
   */
  subscribe(jobId: string, callback: (progress: JobProgress) => void): Promise<() => Promise<void>>;

  /**
   * Publish progress event to Redis Pub/Sub channel
   * @param jobId - Job ID
   * @param progress - Job progress data
   */
  publishProgressEvent(jobId: string, progress: JobProgress): Promise<void>;
}
