/**
 * Step Execution Service Types
 *
 * Types for the phase-based workflow execution system.
 * Phases group multiple workflow steps for admin control.
 */

import type { ComputedTimeline, StoryScript } from '@mio/shared/types';

import type { EnrichedConcept } from './stories.service.types';

/**
 * Workflow phases grouping multiple steps
 */
export const WORKFLOW_PHASES = {
  CONCEPT: 'concept',
  VOICES: 'voices',
  AUDIO: 'audio',
  MIX: 'mix',
  FINAL: 'final'
} as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[keyof typeof WORKFLOW_PHASES];

/**
 * All phases in order
 */
export const PHASE_ORDER: readonly WorkflowPhase[] = [
  WORKFLOW_PHASES.CONCEPT,
  WORKFLOW_PHASES.VOICES,
  WORKFLOW_PHASES.AUDIO,
  WORKFLOW_PHASES.MIX,
  WORKFLOW_PHASES.FINAL
] as const;

/**
 * Phase metadata for display
 */
export interface PhaseMetadata {
  readonly phase: WorkflowPhase;
  readonly label: string;
  readonly description: string;
  readonly steps: readonly string[];
}

/**
 * Phase configurations with their included steps
 */
export const PHASE_CONFIGS: Record<WorkflowPhase, PhaseMetadata> = {
  [WORKFLOW_PHASES.CONCEPT]: {
    phase: WORKFLOW_PHASES.CONCEPT,
    label: 'Concept',
    description: 'Create enriched concept and generate script',
    steps: ['enrichment', 'script_generation']
  },
  [WORKFLOW_PHASES.VOICES]: {
    phase: WORKFLOW_PHASES.VOICES,
    label: 'Voices',
    description: 'Select voices, assign to characters, and generate voice audio',
    steps: ['voice_selection', 'voice_assignment', 'voice_generation']
  },
  [WORKFLOW_PHASES.AUDIO]: {
    phase: WORKFLOW_PHASES.AUDIO,
    label: 'Audio',
    description: 'Generate SFX, music, and ambiance',
    steps: ['sfx_generation', 'music_generation', 'ambiance_generation']
  },
  [WORKFLOW_PHASES.MIX]: {
    phase: WORKFLOW_PHASES.MIX,
    label: 'Mix',
    description: 'Compute timeline, mix audio, and upload',
    steps: ['timeline_computation', 'mixing', 'upload']
  },
  [WORKFLOW_PHASES.FINAL]: {
    phase: WORKFLOW_PHASES.FINAL,
    label: 'Final',
    description: 'Finalize story status and metadata',
    steps: ['finalization']
  }
} as const;

/**
 * Phase execution status
 */
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Step progress within a phase
 */
export interface StepProgress {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  completedAt?: string;
  error?: string;
}

/**
 * Phase state for UI display
 */
export interface PhaseState {
  phase: WorkflowPhase;
  label: string;
  description: string;
  status: PhaseStatus;
  progress?: number;
  completedAt?: string;
  error?: string;
  canExecute: boolean;
  steps: StepProgress[];
  output?: PhaseOutput;
}

/**
 * Phase-specific outputs
 */
export interface ConceptPhaseOutput {
  enrichedConcept: EnrichedConcept;
  script: StoryScript;
}

export interface VoicesPhaseOutput {
  characters: Array<{
    characterName: string;
    voiceId?: string;
    voiceDescription: string;
  }>;
  voiceAssetIds: string[];
  voiceAssetCount: number;
}

export interface AudioPhaseOutput {
  sfxAssetIds: string[];
  musicAssetIds: string[];
  ambianceAssetIds: string[];
  totalAssetCount: number;
}

export interface MixPhaseOutput {
  computedTimeline: ComputedTimeline;
  finalAudioUrl: string;
  durationSeconds: number;
}

export interface FinalPhaseOutput {
  status: string;
  finalAudioUrl: string;
  durationSeconds: number;
  completedAt: string;
}

export type PhaseOutput =
  | ConceptPhaseOutput
  | VoicesPhaseOutput
  | AudioPhaseOutput
  | MixPhaseOutput
  | FinalPhaseOutput;

/**
 * Input for executing a phase
 */
export interface ExecutePhaseInput {
  storyId: string;
  phase: WorkflowPhase;
  targetDurationMinutes?: number;
}

/**
 * Result of phase execution
 */
export interface PhaseExecutionResult {
  success: boolean;
  phase: WorkflowPhase;
  nextPhase?: WorkflowPhase;
  stepsCompleted: string[];
  output?: PhaseOutput;
  error?: string;
}

/**
 * Input for resetting to a phase
 */
export interface ResetToPhaseInput {
  storyId: string;
  phase: WorkflowPhase;
}

/**
 * Result of reset operation
 */
export interface ResetToPhaseResult {
  success: boolean;
  phase: WorkflowPhase;
  phasesReset: WorkflowPhase[];
}

/**
 * Context rebuilt from DB for phase execution
 */
export interface PhaseExecutionContext {
  storyId: string;
  jobId: string;
  childProfileId: string;
  targetDurationMinutes: number;
  enrichedConcept?: EnrichedConcept;
  script?: StoryScript;
  voiceAssetIds?: string[];
  sfxAssetIds?: string[];
  musicAssetIds?: string[];
  ambianceAssetIds?: string[];
  computedTimeline?: ComputedTimeline;
  tempMixedAudioUrl?: string;
  finalAudioUrl?: string;
  duration?: number;
}
