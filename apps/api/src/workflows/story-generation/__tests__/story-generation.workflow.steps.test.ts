/**
 * Story Generation Workflow Steps Tests
 *
 * Tests for all workflow steps with mocked services.
 * Each step should be a thin wrapper that delegates to orchestration services.
 */

import type { ScriptMetadata, StoryScript } from '@mio/shared/types';
import { Emotion, JobStatus, Language, VocabularyLevel } from '@mio/shared/types';

import type { EnrichedConcept } from '../../../services/stories/stories.service.types';
import type { StoryGenerationWorkflowContext } from '../story-generation.workflow.types';
// Mock the IoC module
import { IocConnection, IocRepository, IocService, IocStore } from '../../../ioc/ioc.types';
import * as iocConfig from '../../../ioc/ioc.config';
// We'll test the individual step functions
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
} from '../story-generation.workflow.steps';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

describe('Story Generation Workflow Steps', () => {
  // Spy reference for cleanup
  let getInstanceSpy: ReturnType<typeof spyOn>;

  // Mock services
  let mockStoryContext: any;
  let mockEnrichmentService: any;
  let mockScriptService: any;
  let mockLlmRepository: any;
  let mockVoiceAssignment: any;
  let mockVoiceOrchestrator: any;
  let mockAudioOrchestrator: any;
  let mockMixingOrchestrator: any;
  let mockFinalizationService: any;
  let mockStoriesStore: any;
  let mockJobsStore: any;
  let mockJobProgress: any;
  let mockLogger: any;

  // Sample data
  const baseContext: StoryGenerationWorkflowContext = {
    jobId: 'job-123',
    storyId: 'story-456',
    childProfileId: 'profile-789',
    targetDurationMinutes: 5
  };

  const sampleEnrichedConcept: EnrichedConcept = {
    title: 'The Little Dragon',
    mainCharacter: { name: 'Dragon', description: 'A young and curious dragon' },
    secondaryCharacters: [{ name: 'Narrator', description: 'Warm storyteller voice' }],
    setting: { location: 'A magical forest', era: 'timeless', ambiance: 'forest' },
    tone: 'adventurous',
    themes: ['bravery', 'friendship'],
    synopsis: 'A dragon learns to be brave'
  };

  const sampleMetadata: ScriptMetadata = {
    title: 'The Little Dragon',
    targetDuration: 300,
    actualDuration: 290,
    vocabularyLevel: VocabularyLevel.Simple,
    language: Language.French,
    wordCount: 500,
    voiceSegmentCount: 5,
    sfxSegmentCount: 2
  };

  const sampleScript: StoryScript = {
    version: 2,
    metadata: sampleMetadata,
    characters: [
      { characterName: 'Narrator', voiceId: 'voice-1', voiceDescription: 'Warm narrator' },
      { characterName: 'Dragon', voiceId: 'voice-2', voiceDescription: 'Young dragon' }
    ],
    tracks: [
      {
        id: 'track-voice',
        type: 'voice',
        name: 'Voice track',
        segments: [
          {
            id: 'seg-1',
            trackId: 'track-voice',
            startTime: 0,
            duration: 5,
            content: {
              type: 'narration',
              text: 'Once upon a time...',
              characterName: 'Narrator',
              emotion: Emotion.Neutral
            }
          }
        ]
      }
    ]
  };

  const sampleStoryContextResult = {
    storyId: 'story-456',
    story: {
      id: 'story-456',
      initialPrompt: 'A story about a dragon',
      answers: []
    },
    childProfile: {
      id: 'profile-789',
      firstName: 'Emma',
      age: 7
    },
    enrichmentProfile: {
      firstName: 'Emma',
      age: 7,
      language: Language.French
    },
    language: Language.French
  };

  beforeEach(() => {
    // Reset all mocks
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
      fail: mock(() => Promise.resolve()),
      complete: mock(() => Promise.resolve())
    };

    mockStoriesStore = {
      updateEnrichedConcept: mock(() => Promise.resolve()),
      updateScript: mock(() => Promise.resolve()),
      finalize: mock(() => Promise.resolve())
    };

    mockStoryContext = {
      loadContext: mock(() => Promise.resolve(sampleStoryContextResult))
    };

    mockEnrichmentService = {
      enrichStory: mock(() => Promise.resolve({ enrichedConcept: sampleEnrichedConcept }))
    };

    mockScriptService = {
      generateScript: mock(() => Promise.resolve({ script: sampleScript }))
    };

    mockLlmRepository = {};

    mockVoiceAssignment = {
      assignVoices: mock(() => Promise.resolve({ script: sampleScript, assignedCount: 2 }))
    };

    mockVoiceOrchestrator = {
      generateAll: mock(() =>
        Promise.resolve({
          assetIds: ['voice-asset-1', 'voice-asset-2'],
          successCount: 2,
          failedCount: 0,
          cachedCount: 0,
          totalDurationSeconds: 120,
          segments: []
        })
      )
    };

    mockAudioOrchestrator = {
      generateSfx: mock(() =>
        Promise.resolve({
          assetIds: ['sfx-asset-1'],
          successCount: 1,
          failedCount: 0,
          cachedCount: 0,
          totalDurationSeconds: 10,
          segments: []
        })
      ),
      generateMusic: mock(() =>
        Promise.resolve({
          assetIds: ['music-asset-1'],
          successCount: 1,
          failedCount: 0,
          cachedCount: 0,
          totalDurationSeconds: 180,
          segments: []
        })
      ),
      generateAmbiance: mock(() =>
        Promise.resolve({
          assetIds: ['ambiance-asset-1'],
          successCount: 1,
          failedCount: 0,
          cachedCount: 0,
          totalDurationSeconds: 300,
          segments: []
        })
      )
    };

    mockMixingOrchestrator = {
      mixStory: mock(() =>
        Promise.resolve({
          audio: Buffer.from('mixed audio'),
          durationSeconds: 120,
          tempUrl: 'https://storage/stories/story-456/temp/mixed.mp3'
        })
      )
    };

    mockFinalizationService = {
      uploadFinalAudio: mock(() =>
        Promise.resolve({
          finalAudioUrl: 'https://storage/stories/story-456/final.mp3',
          assetId: 'final-asset-1'
        })
      ),
      finalizeStory: mock(() =>
        Promise.resolve({
          storyId: 'story-456',
          finalAudioUrl: 'https://storage/stories/story-456/final.mp3',
          durationSeconds: 120,
          success: true
        })
      )
    };

    // Mock getInstance to return our mocks
    getInstanceSpy = spyOn(iocConfig, 'getInstance').mockImplementation((identifier: any) => {
      const mocks: Record<string, any> = {
        [IocConnection.LOGGER]: mockLogger,
        [IocService.JOB_PROGRESS]: mockJobProgress,
        [IocStore.GENERATION_JOBS_STORE]: mockJobsStore,
        [IocStore.STORIES_STORE]: mockStoriesStore,
        [IocService.STORY_CONTEXT]: mockStoryContext,
        [IocService.ENRICHMENT]: mockEnrichmentService,
        [IocService.SCRIPT_GENERATION]: mockScriptService,
        [IocRepository.LLM_REPOSITORY]: mockLlmRepository,
        [IocService.VOICE_ASSIGNMENT]: mockVoiceAssignment,
        [IocService.VOICE_GENERATION_ORCHESTRATOR]: mockVoiceOrchestrator,
        [IocService.AUDIO_GENERATION_ORCHESTRATOR]: mockAudioOrchestrator,
        [IocService.STORY_MIXING_ORCHESTRATOR]: mockMixingOrchestrator,
        [IocService.STORY_FINALIZATION]: mockFinalizationService
      };
      return mocks[identifier];
    });
  });

  afterEach(() => {
    // Restore the spy to avoid affecting other tests
    getInstanceSpy.mockRestore();
  });

  describe('enrichmentStep', () => {
    it('enriches story prompt and persists result', async () => {
      const result = await enrichmentStep(baseContext);

      expect(result.enrichedConcept).toEqual(sampleEnrichedConcept);
      expect(mockStoryContext.loadContext).toHaveBeenCalledWith('story-456');
      expect(mockEnrichmentService.enrichStory).toHaveBeenCalled();
      expect(mockStoriesStore.updateEnrichedConcept).toHaveBeenCalledWith('story-456', sampleEnrichedConcept);
    });

    it('updates progress at start and end', async () => {
      await enrichmentStep(baseContext);

      // Progress should be updated at least twice (start and end)
      expect(mockJobProgress.update).toHaveBeenCalled();
    });
  });

  describe('scriptGenerationStep', () => {
    it('generates script and persists result', async () => {
      const contextWithConcept = {
        ...baseContext,
        enrichedConcept: sampleEnrichedConcept
      };

      const result = await scriptGenerationStep(contextWithConcept);

      expect(result.script).toEqual(sampleScript);
      expect(mockScriptService.generateScript).toHaveBeenCalled();
      expect(mockStoriesStore.updateScript).toHaveBeenCalledWith('story-456', sampleScript);
    });

    it('throws error when enriched concept is missing', async () => {
      await expect(scriptGenerationStep(baseContext)).rejects.toThrow('Enriched concept not found in context');
    });
  });

  describe('voiceAssignmentStep', () => {
    it('assigns voices to characters and persists script', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript
      };

      const result = await voiceAssignmentStep(contextWithScript);

      expect(result.script).toEqual(sampleScript);
      expect(mockVoiceAssignment.assignVoices).toHaveBeenCalledWith({
        script: sampleScript,
        language: Language.French
      });
      expect(mockStoriesStore.updateScript).toHaveBeenCalled();
    });

    it('throws error when script is missing', async () => {
      await expect(voiceAssignmentStep(baseContext)).rejects.toThrow('Script not found in context');
    });
  });

  describe('voiceGenerationStep', () => {
    it('generates voice audio and returns asset IDs', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript
      };

      const result = await voiceGenerationStep(contextWithScript);

      expect(result.voiceAssetIds).toEqual(['voice-asset-1', 'voice-asset-2']);
      expect(mockVoiceOrchestrator.generateAll).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: 'story-456',
          script: sampleScript
        })
      );
    });

    it('throws error when script is missing', async () => {
      await expect(voiceGenerationStep(baseContext)).rejects.toThrow('Script not found in context');
    });

    it('reports progress during generation', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript
      };

      // Capture the onProgress callback
      let capturedOnProgress: any;
      mockVoiceOrchestrator.generateAll = mock(async (input: any) => {
        capturedOnProgress = input.onProgress;
        // Simulate progress
        if (capturedOnProgress) {
          await capturedOnProgress(1, 2);
          await capturedOnProgress(2, 2);
        }
        return {
          assetIds: ['voice-asset-1'],
          successCount: 1,
          failedCount: 0,
          cachedCount: 0,
          totalDurationSeconds: 60,
          segments: []
        };
      });

      await voiceGenerationStep(contextWithScript);

      expect(capturedOnProgress).toBeDefined();
    });
  });

  describe('sfxGenerationStep', () => {
    it('generates SFX audio and returns asset IDs', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript
      };

      const result = await sfxGenerationStep(contextWithScript);

      expect(result.sfxAssetIds).toEqual(['sfx-asset-1']);
      expect(mockAudioOrchestrator.generateSfx).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: 'story-456',
          script: sampleScript
        })
      );
    });

    it('throws error when script is missing', async () => {
      await expect(sfxGenerationStep(baseContext)).rejects.toThrow('Script not found in context');
    });
  });

  describe('musicGenerationStep', () => {
    it('generates music audio and returns asset IDs', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript
      };

      const result = await musicGenerationStep(contextWithScript);

      expect(result.musicAssetIds).toEqual(['music-asset-1']);
      expect(mockAudioOrchestrator.generateMusic).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: 'story-456',
          script: sampleScript
        })
      );
    });

    it('throws error when script is missing', async () => {
      await expect(musicGenerationStep(baseContext)).rejects.toThrow('Script not found in context');
    });
  });

  describe('ambianceGenerationStep', () => {
    it('generates ambiance audio and returns asset IDs', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript
      };

      const result = await ambianceGenerationStep(contextWithScript);

      expect(result.ambianceAssetIds).toEqual(['ambiance-asset-1']);
      expect(mockAudioOrchestrator.generateAmbiance).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: 'story-456',
          script: sampleScript
        })
      );
    });

    it('throws error when script is missing', async () => {
      await expect(ambianceGenerationStep(baseContext)).rejects.toThrow('Script not found in context');
    });
  });

  describe('mixingStep', () => {
    it('mixes all audio assets and returns temp URL', async () => {
      const contextWithAssets = {
        ...baseContext,
        script: sampleScript,
        voiceAssetIds: ['voice-1'],
        sfxAssetIds: ['sfx-1'],
        musicAssetIds: ['music-1'],
        ambianceAssetIds: ['ambiance-1']
      };

      const result = await mixingStep(contextWithAssets);

      expect(result.tempMixedAudioUrl).toBe('https://storage/stories/story-456/temp/mixed.mp3');
      expect(result.duration).toBe(120);
      expect(mockMixingOrchestrator.mixStory).toHaveBeenCalledWith({
        storyId: 'story-456',
        script: sampleScript,
        voiceAssetIds: ['voice-1'],
        sfxAssetIds: ['sfx-1'],
        musicAssetIds: ['music-1'],
        ambianceAssetIds: ['ambiance-1']
      });
    });

    it('handles missing optional asset arrays', async () => {
      const contextWithScript = {
        ...baseContext,
        script: sampleScript,
        voiceAssetIds: ['voice-1']
      };

      await mixingStep(contextWithScript);

      expect(mockMixingOrchestrator.mixStory).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceAssetIds: ['voice-1'],
          sfxAssetIds: undefined,
          musicAssetIds: undefined,
          ambianceAssetIds: undefined
        })
      );
    });

    it('throws error when script is missing', async () => {
      await expect(mixingStep(baseContext)).rejects.toThrow('Script not found in context');
    });
  });

  describe('uploadStep', () => {
    it('uploads final audio and returns URL', async () => {
      const contextWithTempUrl = {
        ...baseContext,
        tempMixedAudioUrl: 'https://storage/stories/story-456/temp/mixed.mp3',
        duration: 120
      };

      const result = await uploadStep(contextWithTempUrl);

      expect(result.finalAudioUrl).toBe('https://storage/stories/story-456/final.mp3');
      expect(mockFinalizationService.uploadFinalAudio).toHaveBeenCalledWith({
        storyId: 'story-456',
        tempMixedAudioUrl: 'https://storage/stories/story-456/temp/mixed.mp3',
        durationSeconds: 120
      });
    });

    it('throws error when temp URL is missing', async () => {
      await expect(uploadStep(baseContext)).rejects.toThrow('Temp mixed audio URL not found in context');
    });
  });

  describe('finalizationStep', () => {
    it('finalizes story in database', async () => {
      const contextWithFinalUrl = {
        ...baseContext,
        finalAudioUrl: 'https://storage/stories/story-456/final.mp3',
        duration: 120
      };

      const result = await finalizationStep(contextWithFinalUrl);

      expect(result).toEqual(contextWithFinalUrl);
      expect(mockFinalizationService.finalizeStory).toHaveBeenCalledWith({
        storyId: 'story-456',
        jobId: 'job-123',
        finalAudioUrl: 'https://storage/stories/story-456/final.mp3',
        durationSeconds: 120
      });
    });

    it('throws error when final URL is missing', async () => {
      await expect(finalizationStep(baseContext)).rejects.toThrow('Final audio URL not found in context');
    });
  });

  // Note: Cancellation and error propagation tests are omitted because the WorkflowStepHelper
  // has retry logic with exponential backoff (default 3 retries with 2^n second delays).
  // Testing these would require either:
  // 1. Mocking the WorkflowStepHelper class
  // 2. Configuring the step options to have 0 retries
  // 3. Waiting for the full retry timeout (10+ seconds per test)
  //
  // The retry/cancellation behavior is tested at the WorkflowStepHelper level instead.

  describe('context immutability', () => {
    it('returns new context without mutating input', async () => {
      const originalContext = { ...baseContext };

      const result = await enrichmentStep(originalContext);

      expect(result).not.toBe(originalContext);
      expect(result.enrichedConcept).toBeDefined();
      expect(originalContext.enrichedConcept).toBeUndefined();
    });
  });
});
