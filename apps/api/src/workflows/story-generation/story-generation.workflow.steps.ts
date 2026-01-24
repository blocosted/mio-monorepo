/**
 * Story Generation Workflow Steps
 *
 * Implements all 9 steps of the story generation workflow:
 * 1. Enrichment
 * 2. Script Generation
 * 3. Voice Assignment
 * 4. Voice Generation
 * 5. SFX Generation
 * 6. Music Generation
 * 7. Ambiance Generation
 * 8. Audio Mixing
 * 9. Upload + Finalization
 *
 * Each step is a thin wrapper that:
 * 1. Checks cancellation
 * 2. Updates progress (start)
 * 3. Delegates to orchestration service
 * 4. Persists results
 * 5. Updates progress (end)
 */

import type { Logger } from '@mio/shared/server/logger/Logger';

import type { ILLMRepository } from '../../repositories/llm/llm-repository.types';
import type { AudioGenerationOrchestrator } from '../../services/audio/audio-generation.orchestrator';
import type { StoryMixingOrchestrator } from '../../services/audio-mixing/story-mixing.orchestrator';
// LLM Services
import type { EnrichmentService } from '../../services/llm/enrichment.service';
import type { ScriptGenerationService } from '../../services/llm/script-generation.service';
import type { VoiceAssignmentService } from '../../services/narration/voice-assignment.service';
import type { VoiceGenerationOrchestrator } from '../../services/narration/voice-generation.orchestrator';
// Stores
import type { StoriesStore } from '../../services/stories/stories.store';
// Orchestration Services
import type { StoryContextService } from '../../services/stories/story-context.service';
import type { StoryFinalizationService } from '../../services/stories/story-finalization.service';
import { IocConnection, IocRepository, IocService, IocStore } from '../../ioc/ioc.types';
import { getInstance } from '../../ioc/ioc.config';
import { getStepConfig } from './story-generation.workflow.constants';
import { WorkflowStepHelper } from './story-generation.workflow.helper';
import { type StoryGenerationWorkflowContext, WORKFLOW_STEPS } from './story-generation.workflow.types';

const getLogger = () => getInstance<Logger>(IocConnection.LOGGER);

/**
 * Step 1: Enrichment
 * Enriches the story prompt with child profile information
 */
export async function enrichmentStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.ENRICHMENT);
  const helper = new WorkflowStepHelper();

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      // Load services
      const storyContext = getInstance<StoryContextService>(IocService.STORY_CONTEXT);
      const enrichmentService = getInstance<EnrichmentService>(IocService.ENRICHMENT);
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use StoryContextService to load context
      const ctx = await storyContext.loadContext(context.storyId);

      // Enrich story using profile data
      const { enrichedConcept } = await enrichmentService.enrichStory({
        story: {
          id: context.storyId,
          initialPrompt: ctx.story.initialPrompt
        },
        profile: ctx.enrichmentProfile
      });

      // Persist enriched concept
      await storiesStore.updateEnrichedConcept(context.storyId, enrichedConcept);

      await helper.updateProgress(context.jobId, config.endProgress, config.name, { enrichedConcept });

      return {
        ...context,
        enrichedConcept
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 2: Script Generation
 * Generates the story script from enriched concept
 */
export async function scriptGenerationStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.SCRIPT_GENERATION);
  const helper = new WorkflowStepHelper();

  if (!context.enrichedConcept) {
    throw new Error('Enriched concept not found in context');
  }

  const enrichedConcept = context.enrichedConcept;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const storyContext = getInstance<StoryContextService>(IocService.STORY_CONTEXT);
      const scriptService = getInstance<ScriptGenerationService>(IocService.SCRIPT_GENERATION);
      const llmRepository = getInstance<ILLMRepository>(IocRepository.LLM_REPOSITORY);
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use StoryContextService to load context (reuses cached profile data)
      const ctx = await storyContext.loadContext(context.storyId);

      // Generate script
      const result = await scriptService.generateScript(
        {
          enrichedConcept,
          profile: ctx.enrichmentProfile,
          answers: ctx.story.answers ?? [],
          targetDurationMinutes: context.targetDurationMinutes
        },
        llmRepository
      );

      // Persist script
      await storiesStore.updateScript(context.storyId, result.script);

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        script: result.script
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 3: Voice Assignment
 * Assigns voice IDs to characters from the database
 */
export async function voiceAssignmentStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.VOICE_ASSIGNMENT);
  const helper = new WorkflowStepHelper();

  if (!context.script) {
    throw new Error('Script not found in context');
  }

  const script = context.script;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const storyContext = getInstance<StoryContextService>(IocService.STORY_CONTEXT);
      const voiceAssignment = getInstance<VoiceAssignmentService>(IocService.VOICE_ASSIGNMENT);
      const storiesStore = getInstance<StoriesStore>(IocStore.STORIES_STORE);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Load context for language preference
      const ctx = await storyContext.loadContext(context.storyId);

      getLogger().info('Assigning voices to characters', {
        jobId: context.jobId,
        characterCount: script.characters.length,
        language: ctx.language
      });

      // Use VoiceAssignmentService
      const result = await voiceAssignment.assignVoices({
        script,
        language: ctx.language
      });

      // Persist updated script with voice assignments
      await storiesStore.updateScript(context.storyId, result.script);

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        script: result.script
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 4: Voice Generation
 * Generates voice audio for all voice segments
 */
export async function voiceGenerationStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.VOICE_GENERATION);
  const helper = new WorkflowStepHelper();

  if (!context.script) {
    throw new Error('Script not found in context');
  }

  const script = context.script;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const voiceOrchestrator = getInstance<VoiceGenerationOrchestrator>(IocService.VOICE_GENERATION_ORCHESTRATOR);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use VoiceGenerationOrchestrator
      const result = await voiceOrchestrator.generateAll({
        storyId: context.storyId,
        script,
        onProgress: async (completed, total) => {
          const progress = config.startProgress + ((config.endProgress - config.startProgress) * completed) / total;
          await helper.updateProgress(context.jobId, Math.floor(progress), config.name, { voiceSegmentsCompleted: completed, totalVoiceSegments: total });
        }
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        voiceAssetIds: result.assetIds
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 5: SFX Generation
 * Generates sound effects audio
 */
export async function sfxGenerationStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.SFX_GENERATION);
  const helper = new WorkflowStepHelper();

  if (!context.script) {
    throw new Error('Script not found in context');
  }

  const script = context.script;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const audioOrchestrator = getInstance<AudioGenerationOrchestrator>(IocService.AUDIO_GENERATION_ORCHESTRATOR);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use AudioGenerationOrchestrator
      const result = await audioOrchestrator.generateSfx({
        storyId: context.storyId,
        script,
        onProgress: async (completed, total) => {
          const progress = config.startProgress + ((config.endProgress - config.startProgress) * completed) / total;
          await helper.updateProgress(context.jobId, Math.floor(progress), config.name);
        }
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        sfxAssetIds: result.assetIds
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 6: Music Generation
 * Generates background music
 */
export async function musicGenerationStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.MUSIC_GENERATION);
  const helper = new WorkflowStepHelper();

  if (!context.script) {
    throw new Error('Script not found in context');
  }

  const script = context.script;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const audioOrchestrator = getInstance<AudioGenerationOrchestrator>(IocService.AUDIO_GENERATION_ORCHESTRATOR);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use AudioGenerationOrchestrator
      const result = await audioOrchestrator.generateMusic({
        storyId: context.storyId,
        script,
        onProgress: async (completed, total) => {
          const progress = config.startProgress + ((config.endProgress - config.startProgress) * completed) / total;
          await helper.updateProgress(context.jobId, Math.floor(progress), config.name);
        }
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        musicAssetIds: result.assetIds
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 7: Ambiance Generation
 * Generates ambient sounds
 */
export async function ambianceGenerationStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.AMBIANCE_GENERATION);
  const helper = new WorkflowStepHelper();

  if (!context.script) {
    throw new Error('Script not found in context');
  }

  const script = context.script;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const audioOrchestrator = getInstance<AudioGenerationOrchestrator>(IocService.AUDIO_GENERATION_ORCHESTRATOR);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use AudioGenerationOrchestrator
      const result = await audioOrchestrator.generateAmbiance({
        storyId: context.storyId,
        script,
        onProgress: async (completed, total) => {
          const progress = config.startProgress + ((config.endProgress - config.startProgress) * completed) / total;
          await helper.updateProgress(context.jobId, Math.floor(progress), config.name);
        }
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        ambianceAssetIds: result.assetIds
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 8: Audio Mixing
 * Mix all audio assets together and upload to S3 temp location
 */
export async function mixingStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.MIXING);
  const helper = new WorkflowStepHelper();

  if (!context.script) {
    throw new Error('Script not found in context');
  }

  const script = context.script;

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const mixingOrchestrator = getInstance<StoryMixingOrchestrator>(IocService.STORY_MIXING_ORCHESTRATOR);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use StoryMixingOrchestrator
      const result = await mixingOrchestrator.mixStory({
        storyId: context.storyId,
        script,
        voiceAssetIds: context.voiceAssetIds ?? [],
        sfxAssetIds: context.sfxAssetIds,
        musicAssetIds: context.musicAssetIds,
        ambianceAssetIds: context.ambianceAssetIds
      });

      getLogger().info('Mixed audio uploaded to temp location', {
        jobId: context.jobId,
        tempUrl: result.tempUrl,
        duration: result.durationSeconds
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        tempMixedAudioUrl: result.tempUrl,
        duration: result.durationSeconds
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 9: Upload Final
 * Move mixed audio from temp to final location and cleanup temp
 */
export async function uploadStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.UPLOAD);
  const helper = new WorkflowStepHelper();

  if (!context.tempMixedAudioUrl) {
    throw new Error('Temp mixed audio URL not found in context');
  }

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const finalizationService = getInstance<StoryFinalizationService>(IocService.STORY_FINALIZATION);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use StoryFinalizationService for upload
      const result = await finalizationService.uploadFinalAudio({
        storyId: context.storyId,
        tempMixedAudioUrl: context.tempMixedAudioUrl!,
        durationSeconds: context.duration ?? 0
      });

      getLogger().info('Final audio uploaded and temp cleaned', {
        jobId: context.jobId,
        finalUrl: result.finalAudioUrl
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return {
        ...context,
        finalAudioUrl: result.finalAudioUrl
      };
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}

/**
 * Step 10: Finalization
 * Update DB with final results
 */
export async function finalizationStep(context: StoryGenerationWorkflowContext): Promise<StoryGenerationWorkflowContext> {
  const config = getStepConfig(WORKFLOW_STEPS.FINALIZATION);
  const helper = new WorkflowStepHelper();

  if (!context.finalAudioUrl) {
    throw new Error('Final audio URL not found in context');
  }

  return helper.executeStepWithRollback(
    context.jobId,
    config.name,
    async () => {
      if (await helper.isJobCancelled(context.jobId)) {
        throw new Error('Job cancelled by user');
      }

      const finalizationService = getInstance<StoryFinalizationService>(IocService.STORY_FINALIZATION);

      await helper.updateProgress(context.jobId, config.startProgress, config.name);

      // Use StoryFinalizationService for DB updates
      await finalizationService.finalizeStory({
        storyId: context.storyId,
        jobId: context.jobId,
        finalAudioUrl: context.finalAudioUrl!,
        durationSeconds: context.duration ?? 0
      });

      getLogger().info('Workflow completed successfully', {
        jobId: context.jobId,
        storyId: context.storyId,
        finalAudioUrl: context.finalAudioUrl
      });

      await helper.updateProgress(context.jobId, config.endProgress, config.name);

      return context;
    },
    undefined,
    { retries: config.retries, timeout: config.timeout }
  );
}
