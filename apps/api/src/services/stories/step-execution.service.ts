/**
 * Step Execution Service
 *
 * Provides manual phase execution for admin workflow control.
 * Each phase groups multiple workflow steps and can be executed independently.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { Logger } from '@mio/shared/server/logger/Logger';
import { AppError, ErrorCodes } from '@mio/shared';
import { AudioAssetType, JobStatus, JobStep, StoryStatus, type AudioAssetWithDuration, type ComputedTimeline, type StoryScript } from '@mio/shared/types';

import type { AudioAssetsStore } from './audio-assets.store';
import type { GenerationJobsStore } from './generation-jobs.store';
import type { StoriesStore } from './stories.service.store';
import type { StoryFinalizationService } from './story-finalization.service';
import type { ProfilesService } from '../profiles';
import type { TimelineComputationService } from '../narration/timeline-computation.service';
import {
  type AudioPhaseOutput,
  type ConceptPhaseOutput,
  type ExecutePhaseInput,
  type FinalPhaseOutput,
  type MixPhaseOutput,
  PHASE_CONFIGS,
  PHASE_ORDER,
  type PhaseExecutionContext,
  type PhaseExecutionResult,
  type PhaseOutput,
  type PhaseState,
  type PhaseStatus,
  type ResetToPhaseInput,
  type ResetToPhaseResult,
  type StepProgress,
  type VoicesPhaseOutput,
  WORKFLOW_PHASES,
  type WorkflowPhase
} from './step-execution.service.types';
import { IocConnection, IocService, IocStore } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';
import {
  ambianceGenerationStep,
  enrichmentStep,
  mixingStep,
  musicGenerationStep,
  scriptGenerationStep,
  sfxGenerationStep,
  timelineComputationStep,
  uploadStep,
  voiceAssignmentStep,
  voiceGenerationStep
} from '../../workflows/story-generation/story-generation.workflow.steps';
import type { StoryGenerationWorkflowContext } from '../../workflows/story-generation/story-generation.workflow.types';

@injectable()
export class StepExecutionService {
  constructor(
    @inject(IocStore.STORIES_STORE)
    private readonly storiesStore: StoriesStore,
    @inject(IocStore.GENERATION_JOBS_STORE)
    private readonly jobsStore: GenerationJobsStore,
    @inject(IocStore.AUDIO_ASSETS_STORE)
    private readonly audioAssetsStore: AudioAssetsStore,
    @inject(IocService.PROFILES)
    private readonly profilesService: ProfilesService,
    @inject(IocConnection.LOGGER)
    private readonly logger: Logger
  ) {}

  /**
   * Get all phase states for a story
   *
   * Derives phase completion state from actual data:
   * - Concept: enrichedConcept + script exist
   * - Voices: voice assets exist
   * - Audio: sfx/music/ambiance assets exist
   * - Mix: computed timeline + finalAudioUrl exist
   * - Final: story status is 'ready'
   */
  async getPhaseStates(storyId: string): Promise<PhaseState[]> {
    const story = await this.storiesStore.findById(storyId);
    if (!story) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }

    const job = await this.jobsStore.findByStoryId(storyId);

    // Load all audio assets to determine phase completion
    const voiceAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Voice);
    const sfxAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Sfx);
    const musicAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Music);
    const ambianceAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Ambiance);

    // Load computed timeline
    const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
    const computedTimeline = await timelineService.loadTimeline(storyId);

    // Load final mix asset to check Mix phase completion
    const finalMixAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.FinalMix);

    // Determine phase completion based on actual data
    const phaseCompletionStatus = {
      [WORKFLOW_PHASES.CONCEPT]: !!(story.enrichedConcept && story.script),
      [WORKFLOW_PHASES.VOICES]: voiceAssets.length > 0,
      [WORKFLOW_PHASES.AUDIO]: sfxAssets.length > 0 || musicAssets.length > 0 || ambianceAssets.length > 0,
      // Mix is complete when we have timeline AND final mix asset (finalAudioUrl is only set in Final phase)
      [WORKFLOW_PHASES.MIX]: !!(computedTimeline && finalMixAssets.length > 0),
      [WORKFLOW_PHASES.FINAL]: story.status === 'ready'
    };

    // Check if job is currently running
    const isJobRunning = job?.status === JobStatus.Processing;
    const currentJobStep = job?.currentStep;

    const states: PhaseState[] = [];

    for (let i = 0; i < PHASE_ORDER.length; i++) {
      const phase = PHASE_ORDER[i]!;
      const config = PHASE_CONFIGS[phase];

      // Determine phase status
      let phaseStatus: PhaseStatus;
      const isCompleted = phaseCompletionStatus[phase];
      const isInProgress = isJobRunning && this.isPhaseInProgress(phase, currentJobStep);

      if (isCompleted) {
        phaseStatus = 'completed';
      } else if (isInProgress) {
        phaseStatus = 'in_progress';
      } else if (job?.status === JobStatus.Failed && this.isPhaseInProgress(phase, currentJobStep)) {
        phaseStatus = 'failed';
      } else {
        phaseStatus = 'pending';
      }

      // Build step progress from phase status
      const errorMessage = phaseStatus === 'failed' && job?.error ? job.error : undefined;
      const phaseSteps = config.steps.map((stepName: string) => ({
        name: stepName,
        status: phaseStatus as StepProgress['status'],
        progress: isInProgress ? (job?.progress ?? 0) : (isCompleted ? 100 : 0),
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        error: errorMessage
      }));

      const previousPhase = i > 0 ? PHASE_ORDER[i - 1] : undefined;
      const previousPhaseCompleted = previousPhase ? phaseCompletionStatus[previousPhase] : true;

      const output = await this.getPhaseOutput(storyId, phase, story, phaseStatus);

      states.push({
        phase,
        label: config.label,
        description: config.description,
        status: phaseStatus,
        progress: isCompleted ? 100 : (isInProgress ? (job?.progress ?? 0) : 0),
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        error: errorMessage,
        canExecute: previousPhaseCompleted && phaseStatus !== 'in_progress',
        steps: phaseSteps,
        output
      });
    }

    return states;
  }

  /**
   * Check if a phase is currently in progress based on the job's current step
   */
  private isPhaseInProgress(phase: WorkflowPhase, currentJobStep?: string | null): boolean {
    if (!currentJobStep) return false;

    // Map JobStep enum values to phases
    const stepToPhase: Record<string, WorkflowPhase> = {
      script_generation: WORKFLOW_PHASES.CONCEPT,
      generating_voice: WORKFLOW_PHASES.VOICES,
      generating_sfx: WORKFLOW_PHASES.AUDIO,
      generating_music: WORKFLOW_PHASES.AUDIO,
      generating_ambiance: WORKFLOW_PHASES.AUDIO,
      mixing: WORKFLOW_PHASES.MIX,
      finalizing: WORKFLOW_PHASES.FINAL
    };

    return stepToPhase[currentJobStep] === phase;
  }

  /**
   * Map a workflow phase to its corresponding job step
   */
  private phaseToJobStep(phase: WorkflowPhase): JobStep {
    const phaseToStep: Record<WorkflowPhase, JobStep> = {
      [WORKFLOW_PHASES.CONCEPT]: JobStep.Enrichment,
      [WORKFLOW_PHASES.VOICES]: JobStep.GeneratingVoice,
      [WORKFLOW_PHASES.AUDIO]: JobStep.GeneratingSfx,
      [WORKFLOW_PHASES.MIX]: JobStep.Mixing,
      [WORKFLOW_PHASES.FINAL]: JobStep.Finalizing
    };
    return phaseToStep[phase];
  }

  /**
   * Execute a specific phase
   */
  async executePhase(input: ExecutePhaseInput): Promise<PhaseExecutionResult> {
    const { storyId, phase, targetDurationMinutes } = input;

    this.logger.info('Executing phase', { storyId, phase });

    // Load story to get targetDurationMinutes
    const story = await this.storiesStore.findById(storyId);
    if (!story) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }

    // Use story's targetDurationMinutes, or override from input, fallback to 5
    const effectiveDuration = targetDurationMinutes ?? story.targetDurationMinutes ?? 5;

    // Validate prerequisites
    const states = await this.getPhaseStates(storyId);
    const phaseState = states.find((s) => s.phase === phase);

    if (!phaseState) {
      throw new AppError(ErrorCodes.NotFound, { name: 'PhaseNotFound' });
    }

    if (!phaseState.canExecute) {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'PhaseCannotExecute'
      });
    }

    // Reset subsequent phases before executing (clean up data from later phases)
    await this.resetSubsequentPhases(storyId, phase);

    // Ensure we have a job for this story
    let job = await this.jobsStore.findByStoryId(storyId);
    if (!job) {
      job = await this.jobsStore.create({ storyId, status: JobStatus.Pending });
    }

    // Set job to processing before execution
    await this.jobsStore.update(job.id, {
      status: JobStatus.Processing,
      currentStep: this.phaseToJobStep(phase),
      error: null
    });

    // Build execution context from DB
    const context = await this.buildExecutionContext(storyId, job.id, effectiveDuration);

    try {
      // Execute all steps in the phase
      const stepsCompleted: string[] = [];
      let updatedContext = context;

      switch (phase) {
        case WORKFLOW_PHASES.CONCEPT:
          updatedContext = await this.executeConceptPhase(updatedContext);
          stepsCompleted.push('enrichment', 'script_generation');
          break;

        case WORKFLOW_PHASES.VOICES:
          updatedContext = await this.executeVoicesPhase(updatedContext);
          stepsCompleted.push('voice_assignment', 'voice_generation');
          break;

        case WORKFLOW_PHASES.AUDIO:
          updatedContext = await this.executeAudioPhase(updatedContext);
          stepsCompleted.push('sfx_generation', 'music_generation', 'ambiance_generation');
          break;

        case WORKFLOW_PHASES.MIX:
          updatedContext = await this.executeMixPhase(updatedContext);
          stepsCompleted.push('timeline_computation', 'mixing', 'upload');
          break;

        case WORKFLOW_PHASES.FINAL:
          updatedContext = await this.executeFinalPhase(updatedContext);
          stepsCompleted.push('finalization');
          break;
      }

      // Get next phase
      const phaseIndex = PHASE_ORDER.indexOf(phase);
      const nextPhase = phaseIndex < PHASE_ORDER.length - 1 ? PHASE_ORDER[phaseIndex + 1] : undefined;

      // Get output for the completed phase
      const story = await this.storiesStore.findById(storyId);
      const output = await this.getPhaseOutput(storyId, phase, story, 'completed');

      this.logger.info('Phase completed', { storyId, phase, stepsCompleted });

      return {
        success: true,
        phase,
        nextPhase,
        stepsCompleted,
        output
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Phase execution failed', {
        storyId,
        phase,
        error: errorMessage
      });

      // Reset job to pending so phase can be retried
      await this.jobsStore.update(job.id, {
        status: JobStatus.Pending,
        currentStep: null,
        error: errorMessage
      });

      return {
        success: false,
        phase,
        stepsCompleted: [],
        error: errorMessage
      };
    }
  }

  /**
   * Reset story to a specific phase (clears data from later phases)
   */
  async resetToPhase(input: ResetToPhaseInput): Promise<ResetToPhaseResult> {
    const { storyId, phase } = input;

    this.logger.info('Resetting to phase', { storyId, phase });

    const phaseIndex = PHASE_ORDER.indexOf(phase);
    const phasesToReset = PHASE_ORDER.slice(phaseIndex);

    // Delete data based on which phases we're resetting
    for (const phaseToReset of phasesToReset) {
      switch (phaseToReset) {
        case WORKFLOW_PHASES.CONCEPT:
          // Clear enrichedConcept and script so phase can be re-executed
          await this.storiesStore.clearGeneratedData(storyId, {
            enrichedConcept: true,
            script: true
          });
          break;
        case WORKFLOW_PHASES.VOICES:
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Voice);
          break;
        case WORKFLOW_PHASES.AUDIO:
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Sfx);
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Music);
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Ambiance);
          break;
        case WORKFLOW_PHASES.MIX:
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.FinalMix);
          // Also delete computed timeline
          const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
          await timelineService.deleteTimeline(storyId);
          break;
        case WORKFLOW_PHASES.FINAL:
          // Clear finalAudioUrl and duration from story
          await this.storiesStore.clearGeneratedData(storyId, {
            finalAudioUrl: true
          });
          break;
      }
    }

    // Reset job to pending state so phase can be re-executed
    const job = await this.jobsStore.findByStoryId(storyId);
    if (job) {
      await this.jobsStore.update(job.id, {
        status: JobStatus.Pending,
        currentStep: null,
        progress: 0,
        error: null
      });
    }

    // Update story status back to generating if not resetting to final
    if (phase !== WORKFLOW_PHASES.FINAL) {
      await this.storiesStore.updateStatus(storyId, StoryStatus.Generating);
    }

    this.logger.info('Reset complete', { storyId, phase, phasesReset: phasesToReset });

    return {
      success: true,
      phase,
      phasesReset: phasesToReset
    };
  }

  /**
   * Reset all phases after the specified phase (not including the phase itself)
   * Called before executing a phase to ensure clean state
   */
  private async resetSubsequentPhases(storyId: string, phase: WorkflowPhase): Promise<void> {
    const phaseIndex = PHASE_ORDER.indexOf(phase);
    const phasesToReset = PHASE_ORDER.slice(phaseIndex + 1);

    if (phasesToReset.length === 0) {
      return;
    }

    this.logger.info('Resetting subsequent phases', { storyId, phase, phasesToReset });

    // Also reset the current phase's data if it's not the final phase
    // For concept phase, clear enrichedConcept and script
    if (phase === WORKFLOW_PHASES.CONCEPT) {
      await this.storiesStore.clearGeneratedData(storyId, {
        enrichedConcept: true,
        script: true,
        finalAudioUrl: true
      });
    }

    // Delete audio assets and data for subsequent phases
    for (const phaseToReset of phasesToReset) {
      switch (phaseToReset) {
        case WORKFLOW_PHASES.VOICES:
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Voice);
          break;
        case WORKFLOW_PHASES.AUDIO:
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Sfx);
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Music);
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Ambiance);
          break;
        case WORKFLOW_PHASES.MIX:
          await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.FinalMix);
          const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
          await timelineService.deleteTimeline(storyId);
          await this.storiesStore.clearGeneratedData(storyId, { finalAudioUrl: true });
          break;
        case WORKFLOW_PHASES.FINAL:
          // Reset story status back to generating
          await this.storiesStore.updateStatus(storyId, StoryStatus.Generating);
          break;
      }
    }

    // Also clear data for the current phase based on what it produces
    switch (phase) {
      case WORKFLOW_PHASES.VOICES:
        await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Voice);
        break;
      case WORKFLOW_PHASES.AUDIO:
        await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Sfx);
        await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Music);
        await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.Ambiance);
        break;
      case WORKFLOW_PHASES.MIX:
        await this.audioAssetsStore.deleteByStoryIdAndType(storyId, AudioAssetType.FinalMix);
        const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
        await timelineService.deleteTimeline(storyId);
        await this.storiesStore.clearGeneratedData(storyId, { finalAudioUrl: true });
        break;
    }
  }

  // ============================================================================
  // Phase Execution Methods
  // ============================================================================

  private async executeConceptPhase(context: PhaseExecutionContext): Promise<PhaseExecutionContext> {
    const workflowContext = this.toWorkflowContext(context);

    // Step 1: Enrichment
    const enrichedContext = await enrichmentStep(workflowContext);

    // Step 2: Script Generation
    const scriptContext = await scriptGenerationStep(enrichedContext);

    return {
      ...context,
      enrichedConcept: scriptContext.enrichedConcept,
      script: scriptContext.script
    };
  }

  private async executeVoicesPhase(context: PhaseExecutionContext): Promise<PhaseExecutionContext> {
    const workflowContext = this.toWorkflowContext(context);

    // Step 3: Voice Assignment
    const assignedContext = await voiceAssignmentStep(workflowContext);

    // Step 4: Voice Generation
    const voiceContext = await voiceGenerationStep(assignedContext);

    return {
      ...context,
      script: voiceContext.script,
      voiceAssetIds: voiceContext.voiceAssetIds
    };
  }

  private async executeAudioPhase(context: PhaseExecutionContext): Promise<PhaseExecutionContext> {
    const workflowContext = this.toWorkflowContext(context);

    // Step 5: SFX Generation
    const sfxContext = await sfxGenerationStep(workflowContext);

    // Step 6: Music Generation
    const musicContext = await musicGenerationStep(sfxContext);

    // Step 7: Ambiance Generation
    const ambianceContext = await ambianceGenerationStep(musicContext);

    return {
      ...context,
      sfxAssetIds: ambianceContext.sfxAssetIds,
      musicAssetIds: ambianceContext.musicAssetIds,
      ambianceAssetIds: ambianceContext.ambianceAssetIds
    };
  }

  private async executeMixPhase(context: PhaseExecutionContext): Promise<PhaseExecutionContext> {
    const workflowContext = this.toWorkflowContext(context);

    // Step 8: Timeline Computation
    const timelineContext = await timelineComputationStep(workflowContext);

    // Step 9: Mixing
    const mixedContext = await mixingStep(timelineContext);

    // Step 10: Upload
    const uploadedContext = await uploadStep(mixedContext);

    return {
      ...context,
      computedTimeline: uploadedContext.computedTimeline,
      tempMixedAudioUrl: uploadedContext.tempMixedAudioUrl,
      finalAudioUrl: uploadedContext.finalAudioUrl,
      duration: uploadedContext.duration
    };
  }

  private async executeFinalPhase(context: PhaseExecutionContext): Promise<PhaseExecutionContext> {
    this.logger.info('Starting Final phase execution', {
      storyId: context.storyId,
      jobId: context.jobId,
      hasFinalAudioUrl: !!context.finalAudioUrl,
      finalAudioUrl: context.finalAudioUrl,
      duration: context.duration
    });

    if (!context.finalAudioUrl) {
      throw new AppError(ErrorCodes.ValidationError, {
        name: 'FinalAudioUrlMissing'
      });
    }

    // Get finalization service from IoC container
    const finalizationService = getInstance<StoryFinalizationService>(IocService.STORY_FINALIZATION);

    this.logger.info('Calling finalization service', {
      storyId: context.storyId,
      jobId: context.jobId,
      finalAudioUrl: context.finalAudioUrl,
      duration: context.duration
    });

    await finalizationService.finalizeStory({
      storyId: context.storyId,
      jobId: context.jobId,
      finalAudioUrl: context.finalAudioUrl,
      durationSeconds: context.duration ?? 0
    });

    this.logger.info('Final phase completed', { storyId: context.storyId });

    return context;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async buildExecutionContext(
    storyId: string,
    jobId: string,
    targetDurationMinutes: number
  ): Promise<PhaseExecutionContext> {
    const story = await this.storiesStore.findById(storyId);
    if (!story) {
      throw new AppError(ErrorCodes.NotFound, { name: 'StoryNotFound' });
    }

    // Load audio assets by type
    const voiceAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Voice);
    const sfxAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Sfx);
    const musicAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Music);
    const ambianceAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Ambiance);
    const finalMixAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.FinalMix);

    // Load computed timeline if exists
    const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
    const computedTimeline = await timelineService.loadTimeline(storyId);

    // Get final audio URL from story OR from FinalMix asset (Mix phase creates asset but doesn't update story)
    const finalMixAsset = finalMixAssets[0];
    const finalAudioUrl = story.finalAudioUrl ?? finalMixAsset?.url;
    const duration = story.duration ?? finalMixAsset?.duration;

    this.logger.info('Building execution context', {
      storyId,
      storyFinalAudioUrl: story.finalAudioUrl,
      storyDuration: story.duration,
      finalMixAssetExists: !!finalMixAsset,
      finalMixAssetUrl: finalMixAsset?.url,
      finalMixAssetDuration: finalMixAsset?.duration,
      resolvedFinalAudioUrl: finalAudioUrl,
      resolvedDuration: duration
    });

    return {
      storyId,
      jobId,
      childProfileId: story.childProfileId,
      targetDurationMinutes,
      enrichedConcept: story.enrichedConcept ?? undefined,
      script: story.script ?? undefined,
      voiceAssetIds: voiceAssets.map((a) => a.id),
      sfxAssetIds: sfxAssets.map((a) => a.id),
      musicAssetIds: musicAssets.map((a) => a.id),
      ambianceAssetIds: ambianceAssets.map((a) => a.id),
      computedTimeline: computedTimeline ?? undefined,
      finalAudioUrl,
      duration
    };
  }

  private toWorkflowContext(context: PhaseExecutionContext): StoryGenerationWorkflowContext {
    return {
      jobId: context.jobId,
      storyId: context.storyId,
      childProfileId: context.childProfileId,
      targetDurationMinutes: context.targetDurationMinutes,
      enrichedConcept: context.enrichedConcept,
      script: context.script,
      voiceAssetIds: context.voiceAssetIds,
      sfxAssetIds: context.sfxAssetIds,
      musicAssetIds: context.musicAssetIds,
      ambianceAssetIds: context.ambianceAssetIds,
      computedTimeline: context.computedTimeline,
      tempMixedAudioUrl: context.tempMixedAudioUrl,
      finalAudioUrl: context.finalAudioUrl,
      duration: context.duration
    };
  }

  private async getPhaseOutput(
    storyId: string,
    phase: WorkflowPhase,
    story: { enrichedConcept?: unknown; script?: unknown; finalAudioUrl?: string | null; duration?: number | null } | null,
    status: PhaseStatus
  ): Promise<PhaseOutput | undefined> {
    if (status !== 'completed') {
      return undefined;
    }

    switch (phase) {
      case WORKFLOW_PHASES.CONCEPT: {
        if (!story?.enrichedConcept || !story?.script) return undefined;
        return {
          enrichedConcept: story.enrichedConcept,
          script: story.script as StoryScript
        } as ConceptPhaseOutput;
      }

      case WORKFLOW_PHASES.VOICES: {
        const voiceAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Voice);
        const script = story?.script as StoryScript | undefined;
        return {
          characters: script?.characters ?? [],
          voiceAssetIds: voiceAssets.map((a) => a.id),
          voiceAssetCount: voiceAssets.length
        } as VoicesPhaseOutput;
      }

      case WORKFLOW_PHASES.AUDIO: {
        const sfxAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Sfx);
        const musicAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Music);
        const ambianceAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.Ambiance);
        return {
          sfxAssetIds: sfxAssets.map((a) => a.id),
          musicAssetIds: musicAssets.map((a) => a.id),
          ambianceAssetIds: ambianceAssets.map((a) => a.id),
          totalAssetCount: sfxAssets.length + musicAssets.length + ambianceAssets.length
        } as AudioPhaseOutput;
      }

      case WORKFLOW_PHASES.MIX: {
        const timelineService = getInstance<TimelineComputationService>(IocService.TIMELINE_COMPUTATION);
        const timeline = await timelineService.loadTimeline(storyId);
        // Get final audio from FinalMix asset (story.finalAudioUrl is only set in Final phase)
        const finalMixAssets = await this.audioAssetsStore.findByStoryIdAndType(storyId, AudioAssetType.FinalMix);
        const finalMixAsset = finalMixAssets[0];
        if (!timeline || !finalMixAsset) return undefined;
        return {
          computedTimeline: timeline,
          finalAudioUrl: finalMixAsset.url,
          durationSeconds: finalMixAsset.duration ?? 0
        } as MixPhaseOutput;
      }

      case WORKFLOW_PHASES.FINAL: {
        if (!story?.finalAudioUrl) return undefined;
        return {
          status: 'ready',
          finalAudioUrl: story.finalAudioUrl,
          durationSeconds: story.duration ?? 0,
          completedAt: new Date().toISOString()
        } as FinalPhaseOutput;
      }
    }
  }
}
