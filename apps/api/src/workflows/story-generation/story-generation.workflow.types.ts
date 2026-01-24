/**
 * Story Generation Workflow Types
 *
 * Defines the context and types used throughout the workflow execution.
 */

import type { StoryScript } from '@mio/shared/types';
import type { EnrichedConcept } from '../../services/stories/stories.service.types';

/**
 * Workflow context passed between steps
 * All fields must be JSON-serializable for QStash
 */
export interface StoryGenerationWorkflowContext {
    /** Job ID for progress tracking */
    jobId: string;

    /** Story ID */
    storyId: string;

    /** Child Profile ID */
    childProfileId: string;

    /** Target duration in minutes */
    targetDurationMinutes: number;

    /** Enriched concept (after step 1) */
    enrichedConcept?: EnrichedConcept;

    /** Story script (after step 2) */
    script?: StoryScript;

    /** Voice asset IDs (after step 3) */
    voiceAssetIds?: string[];

    /** SFX asset IDs (after step 4) */
    sfxAssetIds?: string[];

    /** Music asset IDs (after step 5) */
    musicAssetIds?: string[];

    /** Ambiance asset IDs (after step 6) */
    ambianceAssetIds?: string[];

    /** Temp mixed audio URL in S3 (after step 7) */
    tempMixedAudioUrl?: string;

    /** Final audio URL in S3 (after step 8) */
    finalAudioUrl?: string;

    /** Total duration in seconds (after step 7) */
    duration?: number;
}

/**
 * Workflow step names (for logging and progress tracking)
 */
export const WORKFLOW_STEPS = {
    ENRICHMENT: 'enrichment',
    SCRIPT_GENERATION: 'script_generation',
    VOICE_ASSIGNMENT: 'voice_assignment',
    VOICE_GENERATION: 'voice_generation',
    SFX_GENERATION: 'sfx_generation',
    MUSIC_GENERATION: 'music_generation',
    AMBIANCE_GENERATION: 'ambiance_generation',
    MIXING: 'mixing',
    UPLOAD: 'upload',
    FINALIZATION: 'finalization',
} as const;

export type WorkflowStepName = (typeof WORKFLOW_STEPS)[keyof typeof WORKFLOW_STEPS];

/**
 * Workflow step configuration
 */
export interface WorkflowStepConfig {
    name: WorkflowStepName;
    retries: number;
    timeout: number;
    startProgress: number;
    endProgress: number;
}
