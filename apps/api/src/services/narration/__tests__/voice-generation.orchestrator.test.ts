/**
 * Voice Generation Orchestrator Tests
 *
 * Tests for voice generation orchestration with mocked TTS service.
 */

import type { Logger } from '@mio/shared/server/logger';
import type { ScriptMetadata, StoryScript, TimelineSegment } from '@mio/shared/types';
import { AudioAssetType, Emotion, Language, VocabularyLevel } from '@mio/shared/types';

import type { StorageService } from '../../storage';
import type { AudioAssetRow, AudioAssetsStore } from '../../stories/audio-assets.store';
import type { AudioFormat, GenerateSpeechResult } from '../tts.service.types';
import type { TTSService } from '../tts.service';
import { VoiceGenerationOrchestrator } from '../voice-generation.orchestrator';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

/**
 * Create a testable VoiceGenerationOrchestrator with mocked dependencies
 */
class TestableVoiceGenerationOrchestrator extends VoiceGenerationOrchestrator {
  private _mockLogger: Partial<Logger>;
  private _mockStorage: Partial<StorageService>;

  constructor(ttsService: TTSService, audioAssetsStore: AudioAssetsStore, mockLogger: Partial<Logger>, mockStorage: Partial<StorageService>) {
    super(ttsService, audioAssetsStore);
    this._mockLogger = mockLogger;
    this._mockStorage = mockStorage;
  }

  protected override get logger(): Logger {
    return this._mockLogger as Logger;
  }

  protected override get storageService(): StorageService {
    return this._mockStorage as StorageService;
  }
}

describe('VoiceGenerationOrchestrator', () => {
  let orchestrator: TestableVoiceGenerationOrchestrator;
  let mockTtsService: Partial<TTSService>;
  let mockAudioAssetsStore: Partial<AudioAssetsStore>;
  let mockLogger: Partial<Logger>;
  let mockStorage: Partial<StorageService>;

  const storyId = 'story-123';

  const defaultAudioFormat: AudioFormat = {
    format: 'mp3',
    sampleRate: 44100,
    bitrate: 128,
    channels: 2
  };

  const defaultMetadata: ScriptMetadata = {
    title: 'Test Story',
    targetDuration: 120,
    actualDuration: 115,
    vocabularyLevel: VocabularyLevel.Simple,
    language: Language.French,
    wordCount: 500,
    voiceSegmentCount: 10,
    sfxSegmentCount: 3
  };

  // Helper to create a script with voice segments
  const createScript = (segments: TimelineSegment[]): StoryScript => ({
    version: 2,
    metadata: defaultMetadata,
    characters: [
      { characterName: 'Narrator', voiceId: 'voice-narrator', voiceDescription: 'Narrator voice' },
      { characterName: 'Hero', voiceId: 'voice-hero', voiceDescription: 'Hero voice' }
    ],
    tracks: [
      {
        id: 'track-voice',
        type: 'voice',
        name: 'Voice track',
        segments
      }
    ]
  });

  // Helper to create voice segment
  const createVoiceSegment = (id: string, text: string, characterName?: string): TimelineSegment => ({
    id,
    trackId: 'track-voice',
    startTime: 0,
    duration: 5,
    content: {
      type: 'narration',
      text,
      characterName: characterName ?? 'Narrator',
      emotion: Emotion.Neutral
    }
  });

  // Helper to create mock audio asset row
  const createMockAssetRow = (overrides: Partial<AudioAssetRow> = {}): AudioAssetRow => ({
    id: `asset-${Date.now()}`,
    storyId,
    segmentId: null,
    type: AudioAssetType.Voice,
    url: 'https://storage/test.mp3',
    duration: 3.5,
    cacheKey: null,
    createdAt: new Date(),
    ...overrides
  });

  beforeEach(() => {
    mockTtsService = {
      generateSpeech: mock(
        (): Promise<GenerateSpeechResult> =>
          Promise.resolve({
            audio: Buffer.from('audio data'),
            durationSeconds: 3.5,
            voiceId: 'voice-narrator',
            format: defaultAudioFormat
          })
      )
    };

    mockAudioAssetsStore = {
      findByCacheKey: mock(() => Promise.resolve(null)),
      create: mock((input) =>
        Promise.resolve(
          createMockAssetRow({
            storyId: input.storyId ?? null,
            type: input.type,
            url: input.url,
            duration: input.duration,
            cacheKey: input.cacheKey ?? null
          })
        )
      )
    };

    mockLogger = {
      info: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {})
    };

    mockStorage = {
      upload: mock((_buffer, path) =>
        Promise.resolve({
          url: `https://storage.example.com/${path}`,
          path
        })
      )
    };

    orchestrator = new TestableVoiceGenerationOrchestrator(mockTtsService as TTSService, mockAudioAssetsStore as AudioAssetsStore, mockLogger, mockStorage);
  });

  describe('generateAll()', () => {
    it('generates voice for all segments', async () => {
      const script = createScript([createVoiceSegment('seg-1', 'Hello world'), createVoiceSegment('seg-2', 'This is a test', 'Hero')]);

      const result = await orchestrator.generateAll({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.assetIds).toHaveLength(2);
      expect(result.segments).toHaveLength(2);
      expect(result.totalDurationSeconds).toBe(7); // 3.5 * 2

      // Verify TTS was called for each segment
      expect(mockTtsService.generateSpeech).toHaveBeenCalledTimes(2);
    });

    it('returns empty result when no voice segments', async () => {
      const script = createScript([]);

      const result = await orchestrator.generateAll({ storyId, script });

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.assetIds).toHaveLength(0);
      expect(result.cachedCount).toBe(0);
      expect(result.totalDurationSeconds).toBe(0);
    });

    it('uses cached assets when available', async () => {
      const cachedAsset = createMockAssetRow({
        id: 'cached-asset-id',
        type: AudioAssetType.Voice,
        url: 'https://storage/cached.mp3',
        duration: 4.2,
        cacheKey: `voice_${storyId}_seg-1`
      });

      mockAudioAssetsStore.findByCacheKey = mock((cacheKey: string) =>
        cacheKey === `voice_${storyId}_seg-1` ? Promise.resolve(cachedAsset) : Promise.resolve(null)
      );

      const script = createScript([createVoiceSegment('seg-1', 'Cached text'), createVoiceSegment('seg-2', 'New text')]);

      const result = await orchestrator.generateAll({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(result.cachedCount).toBe(1);
      expect(result.segments?.[0]?.fromCache).toBe(true);
      expect(result.segments?.[1]?.fromCache).toBe(false);

      // TTS should only be called once (for the non-cached segment)
      expect(mockTtsService.generateSpeech).toHaveBeenCalledTimes(1);
    });

    it('reports progress correctly', async () => {
      const script = createScript([createVoiceSegment('seg-1', 'First'), createVoiceSegment('seg-2', 'Second'), createVoiceSegment('seg-3', 'Third')]);

      const progressCalls: [number, number][] = [];
      const onProgress = mock((completed: number, total: number) => {
        progressCalls.push([completed, total]);
      });

      await orchestrator.generateAll({ storyId, script, onProgress });

      expect(onProgress).toHaveBeenCalled();
      // All progress calls should have correct total
      progressCalls.forEach(([completed, total]) => {
        expect(total).toBe(3);
        expect(completed).toBeGreaterThanOrEqual(1);
        expect(completed).toBeLessThanOrEqual(3);
      });
    });

    it('handles TTS failures gracefully', async () => {
      mockTtsService.generateSpeech = mock((input) => {
        if (input.text === 'Fail this') {
          return Promise.reject(new Error('TTS generation failed'));
        }
        return Promise.resolve({
          audio: Buffer.from('audio'),
          durationSeconds: 2.0,
          voiceId: 'voice-narrator',
          format: defaultAudioFormat
        });
      });

      const script = createScript([
        createVoiceSegment('seg-1', 'Success'),
        createVoiceSegment('seg-2', 'Fail this'),
        createVoiceSegment('seg-3', 'Also success')
      ]);

      const result = await orchestrator.generateAll({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('respects concurrency limit', async () => {
      // Track concurrent calls
      let currentConcurrency = 0;
      let maxConcurrency = 0;

      mockTtsService.generateSpeech = mock(async (): Promise<GenerateSpeechResult> => {
        currentConcurrency++;
        maxConcurrency = Math.max(maxConcurrency, currentConcurrency);
        await new Promise((resolve) => setTimeout(resolve, 10));
        currentConcurrency--;
        return {
          audio: Buffer.from('audio'),
          durationSeconds: 1.0,
          voiceId: 'voice-narrator',
          format: defaultAudioFormat
        };
      });

      const script = createScript([
        createVoiceSegment('seg-1', 'One'),
        createVoiceSegment('seg-2', 'Two'),
        createVoiceSegment('seg-3', 'Three'),
        createVoiceSegment('seg-4', 'Four'),
        createVoiceSegment('seg-5', 'Five')
      ]);

      await orchestrator.generateAll({ storyId, script, concurrency: 2 });

      expect(maxConcurrency).toBeLessThanOrEqual(2);
    });

    it('skips segments without voice ID', async () => {
      const script: StoryScript = {
        version: 2,
        metadata: defaultMetadata,
        characters: [
          { characterName: 'Narrator', voiceId: 'voice-1', voiceDescription: 'narrator' },
          { characterName: 'Unknown', voiceId: '', voiceDescription: 'no voice' } // No voice ID
        ],
        tracks: [
          {
            id: 'track-voice',
            type: 'voice',
            name: 'Voice track',
            segments: [createVoiceSegment('seg-1', 'Has voice', 'Narrator'), createVoiceSegment('seg-2', 'No voice', 'Unknown')]
          }
        ]
      };

      const result = await orchestrator.generateAll({ storyId, script });

      expect(result.successCount).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('stores audio assets in storage and database', async () => {
      const script = createScript([createVoiceSegment('seg-1', 'Test text')]);

      await orchestrator.generateAll({ storyId, script });

      // Verify storage upload
      expect(mockStorage.upload).toHaveBeenCalledWith(expect.any(Buffer), `stories/${storyId}/voice/seg-1.mp3`, { contentType: 'audio/mpeg' });

      // Verify asset creation
      expect(mockAudioAssetsStore.create).toHaveBeenCalledWith({
        storyId,
        type: AudioAssetType.Voice,
        url: expect.stringContaining('seg-1.mp3'),
        duration: 3.5,
        cacheKey: `voice_${storyId}_seg-1`
      });
    });

    it('uses correct voice ID for each character', async () => {
      const script = createScript([createVoiceSegment('seg-1', 'Narrator speaks', 'Narrator'), createVoiceSegment('seg-2', 'Hero speaks', 'Hero')]);

      await orchestrator.generateAll({ storyId, script });

      // Verify TTS calls used correct voice IDs
      const calls = (mockTtsService.generateSpeech as any).mock.calls;
      expect(calls[0][0].voiceId).toBe('voice-narrator');
      expect(calls[1][0].voiceId).toBe('voice-hero');
    });

    it('defaults to first character when no character specified', async () => {
      const segment: TimelineSegment = {
        id: 'seg-1',
        trackId: 'track-voice',
        startTime: 0,
        duration: 5,
        content: {
          type: 'narration',
          text: 'No character name',
          emotion: Emotion.Neutral
          // Note: no characterName
        }
      };

      const script = createScript([segment]);

      await orchestrator.generateAll({ storyId, script });

      const calls = (mockTtsService.generateSpeech as any).mock.calls;
      expect(calls[0][0].voiceId).toBe('voice-narrator'); // First character
    });
  });
});
