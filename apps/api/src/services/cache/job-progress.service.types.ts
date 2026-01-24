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

