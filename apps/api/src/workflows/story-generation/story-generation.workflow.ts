/**
 * Story Generation Workflow Definition
 *
 * Orchestrates the 9-step story generation workflow using Upstash Workflow.
 * This workflow is HTTP-triggered and can run for 5-30+ minutes.
 */

import { serve } from '@upstash/workflow';

import type { StoryGenerationWorkflowContext } from './story-generation.workflow.types';
import {
  ambianceGenerationStep,
  enrichmentStep,
  finalizationStep,
  mixingStep,
  musicGenerationStep,
  scriptGenerationStep,
  sfxGenerationStep,
  uploadStep,
  voiceAssignmentStep,
  voiceGenerationStep
} from './story-generation.workflow.steps';

/**
 * Story Generation Workflow
 *
 * HTTP-triggered workflow that generates a complete audio story in 9 steps:
 * 1. Enrichment
 * 2. Script Generation
 * 3. Voice Generation
 * 4. SFX Generation
 * 5. Music Generation
 * 6. Ambiance Generation
 * 7. Audio Mixing
 * 8. Upload Final
 * 9. Finalization
 *
 * @param context - Workflow context containing job, story, and profile IDs
 * @returns Final workflow context with audio URL and duration
 */
export const storyGenerationWorkflow = serve<StoryGenerationWorkflowContext>(async (context) => {
  // Step 1: Enrichment
  const enrichedContext = await context.run('enrichment', async () => {
    return enrichmentStep(context.requestPayload);
  });

  // Step 2: Script Generation
  const scriptContext = await context.run('script-generation', async () => {
    return scriptGenerationStep(enrichedContext);
  });

  // Step 2.5: Voice Assignment (assign voiceIds from database)
  const voiceAssignedContext = await context.run('voice-assignment', async () => {
    return voiceAssignmentStep(scriptContext);
  });

  // Step 3: Voice Generation
  const voiceContext = await context.run('voice-generation', async () => {
    return voiceGenerationStep(voiceAssignedContext);
  });

  // Step 4: SFX Generation
  const sfxContext = await context.run('sfx-generation', async () => {
    return sfxGenerationStep(voiceContext);
  });

  // Step 5: Music Generation
  const musicContext = await context.run('music-generation', async () => {
    return musicGenerationStep(sfxContext);
  });

  // Step 6: Ambiance Generation
  const ambianceContext = await context.run('ambiance-generation', async () => {
    return ambianceGenerationStep(musicContext);
  });

  // Step 7: Audio Mixing
  const mixedContext = await context.run('mixing', async () => {
    return mixingStep(ambianceContext);
  });

  // Step 8: Upload Final
  const uploadedContext = await context.run('upload', async () => {
    return uploadStep(mixedContext);
  });

  // Step 9: Finalization
  const finalContext = await context.run('finalization', async () => {
    return finalizationStep(uploadedContext);
  });

  return finalContext;
});

export type StoryGenerationWorkflow = typeof storyGenerationWorkflow;
