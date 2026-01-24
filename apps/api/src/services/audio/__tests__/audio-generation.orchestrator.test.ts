/**
 * Audio Generation Orchestrator Tests
 *
 * Tests for SFX, Music, and Ambiance generation orchestration
 * with mocked audio services.
 */

import type { Logger } from '@mio/shared/server/logger';
import type { AudioTrack, ScriptMetadata, StoryScript, TimelineSegment } from '@mio/shared/types';
import { AudioAssetType, Language, VocabularyLevel } from '@mio/shared/types';

import type { AmbianceGenerateResult } from '../../ambiance/ambiance-generator.service.types';
import type { AmbianceGeneratorService } from '../../ambiance/ambiance-generator.service';
import type { MusicGenerateResult } from '../../music/music-generator.service.types';
import type { MusicGeneratorService } from '../../music/music-generator.service';
import type { GenerateSfxResult, SfxAudioFormat } from '../../sound-design/sfx.service.types';
import type { SfxService } from '../../sound-design/sfx.service';
import type { AudioAssetRow, AudioAssetsStore } from '../../stories/audio-assets.store';
import { AudioGenerationOrchestrator } from '../audio-generation.orchestrator';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

/**
 * Create a testable AudioGenerationOrchestrator with mocked dependencies
 */
class TestableAudioGenerationOrchestrator extends AudioGenerationOrchestrator {
  private _mockLogger: Partial<Logger>;

  constructor(
    sfxService: SfxService,
    musicService: MusicGeneratorService,
    ambianceService: AmbianceGeneratorService,
    audioAssetsStore: AudioAssetsStore,
    mockLogger: Partial<Logger>
  ) {
    super(sfxService, musicService, ambianceService, audioAssetsStore);
    this._mockLogger = mockLogger;
  }

  protected override get logger(): Logger {
    return this._mockLogger as Logger;
  }
}

describe('AudioGenerationOrchestrator', () => {
  let orchestrator: TestableAudioGenerationOrchestrator;
  let mockSfxService: Partial<SfxService>;
  let mockMusicService: Partial<MusicGeneratorService>;
  let mockAmbianceService: Partial<AmbianceGeneratorService>;
  let mockAudioAssetsStore: Partial<AudioAssetsStore>;
  let mockLogger: Partial<Logger>;

  const storyId = 'story-123';

  const defaultSfxFormat: SfxAudioFormat = {
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

  // Helper to create a base script
  const createBaseScript = (tracks: AudioTrack[] = []): StoryScript => ({
    version: 2,
    metadata: defaultMetadata,
    characters: [],
    tracks
  });

  // Helper to create audio track
  const createAudioTrack = (type: 'sfx' | 'music' | 'ambiance', segments: TimelineSegment[]): AudioTrack => ({
    id: `track-${type}`,
    type,
    name: `${type} track`,
    segments
  });

  // Helper to create SFX segment
  const createSfxSegment = (id: string, description: string, duration: number = 3): TimelineSegment => ({
    id,
    trackId: 'track-sfx',
    startTime: 0,
    duration,
    content: {
      type: 'sfx',
      description
    }
  });

  // Helper to create music segment
  const createMusicSegment = (id: string, mood: string, duration: number = 30): TimelineSegment => ({
    id,
    trackId: 'track-music',
    startTime: 0,
    duration,
    content: {
      type: 'music',
      mood
    }
  });

  // Helper to create ambiance segment
  const createAmbianceSegment = (id: string, description: string, duration: number = 60): TimelineSegment => ({
    id,
    trackId: 'track-ambiance',
    startTime: 0,
    duration,
    content: {
      type: 'ambiance',
      description
    }
  });

  // Helper to create mock audio asset row
  const createMockAssetRow = (overrides: Partial<AudioAssetRow> = {}): AudioAssetRow => ({
    id: `asset-${Date.now()}`,
    storyId,
    segmentId: null,
    type: AudioAssetType.Sfx,
    url: 'https://storage/test.mp3',
    duration: 3,
    cacheKey: null,
    createdAt: new Date(),
    ...overrides
  });

  beforeEach(() => {
    mockSfxService = {
      generateSfx: mock(
        (): Promise<GenerateSfxResult> =>
          Promise.resolve({
            audio: Buffer.from('sfx audio'),
            durationSeconds: 2.5,
            format: defaultSfxFormat,
            url: 'https://storage/sfx.mp3'
          })
      )
    };

    mockMusicService = {
      generate: mock(
        (): Promise<MusicGenerateResult> =>
          Promise.resolve({
            audio: Buffer.from('music audio'),
            durationSeconds: 30,
            mood: 'calm',
            looped: true,
            sourceClipDurationSeconds: 20,
            promptUsed: 'calm ambient music',
            url: 'https://storage/music.mp3',
            fromLibrary: false
          })
      )
    };

    mockAmbianceService = {
      generate: mock(
        (): Promise<AmbianceGenerateResult> =>
          Promise.resolve({
            audio: Buffer.from('ambiance audio'),
            durationSeconds: 60,
            description: 'forest ambiance',
            url: 'https://storage/ambiance.mp3',
            looped: true,
            sourceClipDurationSeconds: 22
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

    orchestrator = new TestableAudioGenerationOrchestrator(
      mockSfxService as SfxService,
      mockMusicService as MusicGeneratorService,
      mockAmbianceService as AmbianceGeneratorService,
      mockAudioAssetsStore as AudioAssetsStore,
      mockLogger
    );
  });

  describe('generateSfx()', () => {
    it('generates SFX for all segments', async () => {
      const script = createBaseScript([createAudioTrack('sfx', [createSfxSegment('sfx-1', 'door opening'), createSfxSegment('sfx-2', 'footsteps')])]);

      const result = await orchestrator.generateSfx({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.assetIds).toHaveLength(2);
      expect(mockSfxService.generateSfx).toHaveBeenCalledTimes(2);
    });

    it('returns empty result when no SFX segments', async () => {
      const script = createBaseScript([]);

      const result = await orchestrator.generateSfx({ storyId, script });

      expect(result.successCount).toBe(0);
      expect(result.assetIds).toHaveLength(0);
      expect(mockSfxService.generateSfx).not.toHaveBeenCalled();
    });

    it('uses cached assets when available', async () => {
      const cachedAsset = createMockAssetRow({
        id: 'cached-sfx',
        type: AudioAssetType.Sfx,
        url: 'https://storage/cached.mp3',
        duration: 2.5,
        cacheKey: 'sfx_abc123_3'
      });

      mockAudioAssetsStore.findByCacheKey = mock(() => Promise.resolve(cachedAsset));

      const script = createBaseScript([createAudioTrack('sfx', [createSfxSegment('sfx-1', 'door')])]);

      const result = await orchestrator.generateSfx({ storyId, script });

      expect(result.cachedCount).toBe(1);
      expect(result.segments?.[0]?.fromCache).toBe(true);
      expect(mockSfxService.generateSfx).not.toHaveBeenCalled();
    });

    it('reports progress correctly', async () => {
      const script = createBaseScript([createAudioTrack('sfx', [createSfxSegment('sfx-1', 'sound 1'), createSfxSegment('sfx-2', 'sound 2')])]);

      const progressCalls: [number, number][] = [];
      const onProgress = mock((completed: number, total: number) => {
        progressCalls.push([completed, total]);
      });

      await orchestrator.generateSfx({ storyId, script, onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(progressCalls[0]).toEqual([1, 2]);
      expect(progressCalls[1]).toEqual([2, 2]);
    });

    it('handles generation failures gracefully', async () => {
      mockSfxService.generateSfx = mock(() => Promise.reject(new Error('SFX generation failed')));

      const script = createBaseScript([createAudioTrack('sfx', [createSfxSegment('sfx-1', 'failing sound')])]);

      const result = await orchestrator.generateSfx({ storyId, script });

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('stores assets with content-based cache key', async () => {
      const script = createBaseScript([createAudioTrack('sfx', [createSfxSegment('sfx-1', 'door opening', 3)])]);

      await orchestrator.generateSfx({ storyId, script });

      expect(mockAudioAssetsStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId,
          type: AudioAssetType.Sfx,
          cacheKey: expect.stringMatching(/^sfx_\w+_3$/)
        })
      );
    });
  });

  describe('generateMusic()', () => {
    it('generates music for all segments', async () => {
      const script = createBaseScript([
        createAudioTrack('music', [createMusicSegment('music-1', 'calm', 30), createMusicSegment('music-2', 'adventurous', 45)])
      ]);

      const result = await orchestrator.generateMusic({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(mockMusicService.generate).toHaveBeenCalledTimes(2);
    });

    it('returns empty result when no music segments', async () => {
      const script = createBaseScript([]);

      const result = await orchestrator.generateMusic({ storyId, script });

      expect(result.successCount).toBe(0);
      expect(mockMusicService.generate).not.toHaveBeenCalled();
    });

    it('uses cached music when available', async () => {
      const cachedAsset = createMockAssetRow({
        id: 'cached-music',
        type: AudioAssetType.Music,
        url: 'https://storage/cached-music.mp3',
        duration: 30,
        cacheKey: 'music_calm_30'
      });

      mockAudioAssetsStore.findByCacheKey = mock((key: string) => (key === 'music_calm_30' ? Promise.resolve(cachedAsset) : Promise.resolve(null)));

      const script = createBaseScript([createAudioTrack('music', [createMusicSegment('music-1', 'calm', 30)])]);

      const result = await orchestrator.generateMusic({ storyId, script });

      expect(result.cachedCount).toBe(1);
      expect(mockMusicService.generate).not.toHaveBeenCalled();
    });

    it('applies default volume when generating', async () => {
      const script = createBaseScript([createAudioTrack('music', [createMusicSegment('music-1', 'calm')])]);

      await orchestrator.generateMusic({ storyId, script, defaultVolume: 0.5 });

      expect(mockMusicService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          volume: 0.5
        })
      );
    });

    it('handles generation failures gracefully', async () => {
      mockMusicService.generate = mock(() => Promise.reject(new Error('Music generation failed')));

      const script = createBaseScript([createAudioTrack('music', [createMusicSegment('music-1', 'calm')])]);

      const result = await orchestrator.generateMusic({ storyId, script });

      expect(result.failedCount).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('generateAmbiance()', () => {
    it('generates ambiance for all segments', async () => {
      const script = createBaseScript([
        createAudioTrack('ambiance', [createAmbianceSegment('amb-1', 'forest sounds', 60), createAmbianceSegment('amb-2', 'rain on window', 45)])
      ]);

      const result = await orchestrator.generateAmbiance({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(mockAmbianceService.generate).toHaveBeenCalledTimes(2);
    });

    it('returns empty result when no ambiance segments', async () => {
      const script = createBaseScript([]);

      const result = await orchestrator.generateAmbiance({ storyId, script });

      expect(result.successCount).toBe(0);
      expect(mockAmbianceService.generate).not.toHaveBeenCalled();
    });

    it('uses story duration when segment duration not specified', async () => {
      const segment: TimelineSegment = {
        id: 'amb-1',
        trackId: 'track-ambiance',
        startTime: 0,
        duration: 0, // No explicit duration
        content: {
          type: 'ambiance',
          description: 'forest'
        }
      };

      const script = createBaseScript([createAudioTrack('ambiance', [segment])]);

      await orchestrator.generateAmbiance({ storyId, script });

      expect(mockAmbianceService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDurationSeconds: 115 // From script metadata
        })
      );
    });

    it('uses cached ambiance when available', async () => {
      const cachedAsset = createMockAssetRow({
        id: 'cached-ambiance',
        type: AudioAssetType.Ambiance,
        url: 'https://storage/cached-ambiance.mp3',
        duration: 60,
        cacheKey: 'ambiance_abc123_60'
      });

      mockAudioAssetsStore.findByCacheKey = mock(() => Promise.resolve(cachedAsset));

      const script = createBaseScript([createAudioTrack('ambiance', [createAmbianceSegment('amb-1', 'forest', 60)])]);

      const result = await orchestrator.generateAmbiance({ storyId, script });

      expect(result.cachedCount).toBe(1);
      expect(mockAmbianceService.generate).not.toHaveBeenCalled();
    });

    it('handles generation failures gracefully', async () => {
      mockAmbianceService.generate = mock(() => Promise.reject(new Error('Ambiance generation failed')));

      const script = createBaseScript([createAudioTrack('ambiance', [createAmbianceSegment('amb-1', 'forest')])]);

      const result = await orchestrator.generateAmbiance({ storyId, script });

      expect(result.failedCount).toBe(1);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('uses segment volume when provided', async () => {
      const segment: TimelineSegment = {
        id: 'amb-1',
        trackId: 'track-ambiance',
        startTime: 0,
        duration: 60,
        content: {
          type: 'ambiance',
          description: 'rain',
          volume: 0.15
        }
      };

      const script = createBaseScript([createAudioTrack('ambiance', [segment])]);

      await orchestrator.generateAmbiance({ storyId, script });

      expect(mockAmbianceService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          volume: 0.15
        })
      );
    });
  });

  describe('mixed scenarios', () => {
    it('calculates total duration correctly', async () => {
      mockSfxService.generateSfx = mock(
        (): Promise<GenerateSfxResult> =>
          Promise.resolve({
            audio: Buffer.from('sfx'),
            durationSeconds: 2.5,
            format: defaultSfxFormat,
            url: 'https://storage/sfx.mp3'
          })
      );

      const script = createBaseScript([
        createAudioTrack('sfx', [createSfxSegment('sfx-1', 'sound 1'), createSfxSegment('sfx-2', 'sound 2'), createSfxSegment('sfx-3', 'sound 3')])
      ]);

      const result = await orchestrator.generateSfx({ storyId, script });

      expect(result.totalDurationSeconds).toBe(7.5); // 2.5 * 3
    });

    it('handles partial failures in multiple segments', async () => {
      let callCount = 0;
      mockSfxService.generateSfx = mock((): Promise<GenerateSfxResult> => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Middle segment failed'));
        }
        return Promise.resolve({
          audio: Buffer.from('sfx'),
          durationSeconds: 2,
          format: defaultSfxFormat,
          url: 'https://storage/sfx.mp3'
        });
      });

      const script = createBaseScript([
        createAudioTrack('sfx', [
          createSfxSegment('sfx-1', 'sound 1'),
          createSfxSegment('sfx-2', 'sound 2'), // This will fail
          createSfxSegment('sfx-3', 'sound 3')
        ])
      ]);

      const result = await orchestrator.generateSfx({ storyId, script });

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.totalDurationSeconds).toBe(4); // 2 + 2
    });
  });
});
