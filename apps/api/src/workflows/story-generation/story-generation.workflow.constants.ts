/**
 * Story Generation Workflow Constants
 *
 * Configuration for each workflow step including timeouts, retries, and progress ranges.
 */

import type { WorkflowStepConfig } from './story-generation.workflow.types';
import { WORKFLOW_STEPS } from './story-generation.workflow.types';

/**
 * Workflow step configurations
 * Based on estimated duration and criticality of each step
 */
export const STEP_CONFIGS: Record<string, WorkflowStepConfig> = {
  [WORKFLOW_STEPS.ENRICHMENT]: {
    name: WORKFLOW_STEPS.ENRICHMENT,
    retries: 3,
    timeout: 120_000, // 2 minutes
    startProgress: 0,
    endProgress: 10
  },
  [WORKFLOW_STEPS.SCRIPT_GENERATION]: {
    name: WORKFLOW_STEPS.SCRIPT_GENERATION,
    retries: 3,
    timeout: 180_000, // 3 minutes
    startProgress: 10,
    endProgress: 18
  },
  [WORKFLOW_STEPS.VOICE_ASSIGNMENT]: {
    name: WORKFLOW_STEPS.VOICE_ASSIGNMENT,
    retries: 2,
    timeout: 30_000, // 30 seconds (DB lookup only)
    startProgress: 18,
    endProgress: 20
  },
  [WORKFLOW_STEPS.VOICE_GENERATION]: {
    name: WORKFLOW_STEPS.VOICE_GENERATION,
    retries: 3,
    timeout: 900_000, // 15 minutes (can be long)
    startProgress: 20,
    endProgress: 60
  },
  [WORKFLOW_STEPS.SFX_GENERATION]: {
    name: WORKFLOW_STEPS.SFX_GENERATION,
    retries: 2,
    timeout: 300_000, // 5 minutes
    startProgress: 60,
    endProgress: 70
  },
  [WORKFLOW_STEPS.MUSIC_GENERATION]: {
    name: WORKFLOW_STEPS.MUSIC_GENERATION,
    retries: 2,
    timeout: 180_000, // 3 minutes
    startProgress: 70,
    endProgress: 80
  },
  [WORKFLOW_STEPS.AMBIANCE_GENERATION]: {
    name: WORKFLOW_STEPS.AMBIANCE_GENERATION,
    retries: 2,
    timeout: 180_000, // 3 minutes
    startProgress: 80,
    endProgress: 85
  },
  [WORKFLOW_STEPS.MIXING]: {
    name: WORKFLOW_STEPS.MIXING,
    retries: 2,
    timeout: 300_000, // 5 minutes
    startProgress: 85,
    endProgress: 95
  },
  [WORKFLOW_STEPS.UPLOAD]: {
    name: WORKFLOW_STEPS.UPLOAD,
    retries: 3,
    timeout: 60_000, // 1 minute
    startProgress: 95,
    endProgress: 98
  },
  [WORKFLOW_STEPS.FINALIZATION]: {
    name: WORKFLOW_STEPS.FINALIZATION,
    retries: 3,
    timeout: 30_000, // 30 seconds
    startProgress: 98,
    endProgress: 100
  }
} as const;

/**
 * Voice generation concurrency limit
 * Limit concurrent ElevenLabs API calls to avoid rate limits
 */
export const VOICE_GENERATION_CONCURRENCY = 3;

/**
 * Maximum allowed story duration (seconds)
 * Prevents excessively large files and long processing times
 */
export const MAX_STORY_DURATION_SECONDS = 30 * 60; // 30 minutes

/**
 * S3 temp file paths
 */
export const S3_TEMP_PATHS = {
  getMixedAudioPath: (storyId: string) => `stories/${storyId}/temp/mixed.mp3`,
  getFinalAudioPath: (storyId: string) => `stories/${storyId}/final.mp3`
} as const;

/**
 * Get step config with assertion
 */
export function getStepConfig(stepName: string): WorkflowStepConfig {
  const config = STEP_CONFIGS[stepName];
  if (!config) {
    throw new Error(`Step config not found for step: ${stepName}`);
  }
  return config;
}
