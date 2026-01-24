/**
 * Job-related Types and Enums
 *
 * Shared primitive types (enum-like literals) for generation jobs.
 * Uses const assertion pattern for Typebox compatibility.
 */

/**
 * Job Status
 */
export const JobStatusValues = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
export type JobStatus = (typeof JobStatusValues)[number];
export const JobStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
  Cancelled: 'cancelled'
} as const satisfies Record<string, JobStatus>;

/**
 * Job Step
 */
export const JobStepValues = [
  'enrichment',
  'script_generation',
  'generating_voice',
  'generating_sfx',
  'generating_music',
  'generating_ambiance',
  'mixing',
  'finalizing'
] as const;
export type JobStep = (typeof JobStepValues)[number];
export const JobStep = {
  Enrichment: 'enrichment',
  ScriptGeneration: 'script_generation',
  GeneratingVoice: 'generating_voice',
  GeneratingSfx: 'generating_sfx',
  GeneratingMusic: 'generating_music',
  GeneratingAmbiance: 'generating_ambiance',
  Mixing: 'mixing',
  Finalizing: 'finalizing'
} as const satisfies Record<string, JobStep>;
