/**
 * Story Mixing Orchestrator Tests
 *
 * Tests for mixing orchestration with mocked FFmpeg mixer and storage services.
 */

import type { Logger } from '@mio/shared/server/logger';
import type { AudioTrack, ScriptMetadata, StoryScript, TimelineSegment } from '@mio/shared/types';
import { AudioAssetType, Emotion, Language, VocabularyLevel } from '@mio/shared/types';

import type { IStorageService } from '../../storage';
import type { AudioAssetRow, AudioAssetsStore } from '../../stories/audio-assets.store';
import type { IFFmpegMixerService, MixStoryResult } from '../ffmpeg-mixer.service.types';
import { StoryMixingOrchestrator } from '../story-mixing.orchestrator';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

/**
 * Create a testable StoryMixingOrchestrator with mocked dependencies
 */
class TestableStoryMixingOrchestrator extends StoryMixingOrchestrator {
  private _mockLogger: Partial<Logger>;
  private _mockStorage: Partial<IStorageService>;

  constructor(mixerService: IFFmpegMixerService, audioAssetsStore: AudioAssetsStore, mockLogger: Partial<Logger>, mockStorage: Partial<IStorageService>) {
    super(mixerService, audioAssetsStore);
    this._mockLogger = mockLogger;
    this._mockStorage = mockStorage;
  }

  protected override get logger(): Logger {
    return this._mockLogger as Logger;
  }

  protected override get storageService(): IStorageService {
    return this._mockStorage as IStorageService;
  }
}

describe('StoryMixingOrchestrator', () => {
  let orchestrator: TestableStoryMixingOrchestrator;
  let mockMixerService: Partial<IFFmpegMixerService>;
  let mockAudioAssetsStore: Partial<AudioAssetsStore>;
  let mockLogger: Partial<Logger>;
  let mockStorage: Partial<IStorageService>;

  const storyId = 'story-123';

  const defaultMetadata: ScriptMetadata = {
    title: 'Test Story',
    targetDuration: 120,
    actualDuration: 120,
    vocabularyLevel: VocabularyLevel.Simple,
    language: Language.French,
    wordCount: 500,
    voiceSegmentCount: 10,
    sfxSegmentCount: 3
  };

  // Helper to create script with proper v2 structure
  const createScript = (tracks: AudioTrack[]): StoryScript => ({
    version: 2,
    metadata: defaultMetadata,
    characters: [{ characterName: 'Narrator', voiceId: 'voice-narrator', voiceDescription: 'Narrator voice' }],
    tracks
  });

  // Helper to create an audio track
  const createAudioTrack = (type: 'voice' | 'sfx' | 'music' | 'ambiance', segments: TimelineSegment[]): AudioTrack => ({
    id: `track-${type}`,
    type,
    name: `${type} track`,
    segments
  });

  // Helper to create voice segment
  const createVoiceSegment = (id: string, startTime: number, duration: number): TimelineSegment => ({
    id,
    trackId: 'track-voice',
    startTime,
    duration,
    content: {
      type: 'narration',
      text: 'Sample text',
      characterName: 'Narrator',
      emotion: Emotion.Neutral
    }
  });

  // Helper to create SFX segment
  const createSfxSegment = (id: string, startTime: number, duration: number): TimelineSegment => ({
    id,
    trackId: 'track-sfx',
    startTime,
    duration,
    content: {
      type: 'sfx',
      description: 'Sound effect'
    }
  });

  // Helper to create music segment
  const createMusicSegment = (id: string, startTime: number, duration: number): TimelineSegment => ({
    id,
    trackId: 'track-music',
    startTime,
    duration,
    content: {
      type: 'music',
      mood: 'calm'
    }
  });

  // Helper to create ambiance segment
  const createAmbianceSegment = (id: string, startTime: number, duration: number): TimelineSegment => ({
    id,
    trackId: 'track-ambiance',
    startTime,
    duration,
    content: {
      type: 'ambiance',
      description: 'Ambient sound'
    }
  });

  // Helper to create mock audio asset row
  const createMockAssetRow = (overrides: Partial<AudioAssetRow> = {}): AudioAssetRow => ({
    id: `asset-${Date.now()}`,
    storyId,
    segmentId: null,
    type: AudioAssetType.Voice,
    url: 'https://storage/test.mp3',
    duration: 10,
    cacheKey: null,
    createdAt: new Date(),
    ...overrides
  });

  beforeEach(() => {
    mockMixerService = {
      mixStory: mock(() =>
        Promise.resolve({
          audio: Buffer.from('mixed audio'),
          duration: 120.5,
          format: {
            codec: 'mp3',
            bitrate: '192k',
            sampleRate: 44100,
            channels: 2
          }
        } as MixStoryResult)
      )
    };

    mockAudioAssetsStore = {
      findById: mock((id: string) =>
        Promise.resolve(
          createMockAssetRow({
            id,
            url: `https://storage.example.com/${id}.mp3`,
            cacheKey: `voice_${storyId}_${id}`
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

    orchestrator = new TestableStoryMixingOrchestrator(
      mockMixerService as IFFmpegMixerService,
      mockAudioAssetsStore as AudioAssetsStore,
      mockLogger,
      mockStorage
    );
  });

  describe('mixStory()', () => {
    it('mixes a story with voice assets only', async () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5), createVoiceSegment('seg-2', 5, 7)])]);

      const result = await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['seg-1', 'seg-2']
      });

      expect(result.durationSeconds).toBe(120.5);
      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.tempUrl).toContain(`stories/${storyId}/temp/mixed.mp3`);

      // Verify mixer was called
      expect(mockMixerService.mixStory).toHaveBeenCalledTimes(1);

      // Verify upload was called
      expect(mockStorage.upload).toHaveBeenCalledWith(expect.any(Buffer), `stories/${storyId}/temp/mixed.mp3`, { contentType: 'audio/mpeg' });
    });

    it('mixes a story with all audio types', async () => {
      const script = createScript([
        createAudioTrack('voice', [createVoiceSegment('voice-1', 0, 10)]),
        createAudioTrack('sfx', [createSfxSegment('sfx-1', 2, 3)]),
        createAudioTrack('music', [createMusicSegment('music-1', 0, 120)]),
        createAudioTrack('ambiance', [createAmbianceSegment('amb-1', 0, 120)])
      ]);

      // Set up different cache keys for different asset types
      mockAudioAssetsStore.findById = mock((id: string) => {
        const typePrefix = id.split('-')[0];
        return Promise.resolve(
          createMockAssetRow({
            id,
            type:
              typePrefix === 'voice'
                ? AudioAssetType.Voice
                : typePrefix === 'sfx'
                  ? AudioAssetType.Sfx
                  : typePrefix === 'music'
                    ? AudioAssetType.Music
                    : AudioAssetType.Ambiance,
            url: `https://storage.example.com/${id}.mp3`,
            cacheKey: `${typePrefix}_${storyId}_${id}`
          })
        );
      });

      const result = await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['voice-1'],
        sfxAssetIds: ['sfx-1'],
        musicAssetIds: ['music-1'],
        ambianceAssetIds: ['amb-1']
      });

      expect(result.durationSeconds).toBe(120.5);
      expect(mockMixerService.mixStory).toHaveBeenCalledTimes(1);

      // Check the mix input includes all tracks
      const mixCall = (mockMixerService.mixStory as any).mock.calls[0][0];
      expect(mixCall.voice.segments).toHaveLength(1);
      expect(mixCall.sfx.files).toHaveLength(1);
      expect(mixCall.music).toBeDefined();
      expect(mixCall.ambiance).toBeDefined();
    });

    it('handles empty optional asset arrays', async () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5)])]);

      const result = await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['seg-1'],
        sfxAssetIds: [],
        musicAssetIds: [],
        ambianceAssetIds: []
      });

      expect(result.durationSeconds).toBe(120.5);

      const mixCall = (mockMixerService.mixStory as any).mock.calls[0][0];
      expect(mixCall.sfx).toBeUndefined();
      expect(mixCall.music).toBeUndefined();
      expect(mixCall.ambiance).toBeUndefined();
    });

    it('applies custom volume settings', async () => {
      const script = createScript([
        createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5)]),
        createAudioTrack('music', [createMusicSegment('music-1', 0, 60)])
      ]);

      mockAudioAssetsStore.findById = mock((id: string) =>
        Promise.resolve(
          createMockAssetRow({
            id,
            type: id.includes('music') ? AudioAssetType.Music : AudioAssetType.Voice,
            url: `https://storage.example.com/${id}.mp3`,
            cacheKey: `type_${storyId}_${id}`
          })
        )
      );

      await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['seg-1'],
        musicAssetIds: ['music-1'],
        volumeSettings: {
          voice: 0.9,
          music: 0.5
        }
      });

      const mixCall = (mockMixerService.mixStory as any).mock.calls[0][0];
      expect(mixCall.voice.segments[0].volume).toBe(0.9);
      expect(mixCall.music.volume).toBe(0.5);
    });

    it('logs mixing progress', async () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5)])]);

      await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['seg-1']
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Starting story mixing', {
        storyId,
        voiceAssets: 1,
        sfxAssets: 0,
        musicAssets: 0,
        ambianceAssets: 0
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Story mixed and uploaded to temp location', {
        storyId,
        tempUrl: expect.stringContaining('temp/mixed.mp3'),
        durationSeconds: 120.5
      });
    });

    it('handles missing assets gracefully', async () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5), createVoiceSegment('seg-2', 5, 7)])]);

      // First asset exists, second doesn't
      mockAudioAssetsStore.findById = mock((id: string) =>
        id === 'seg-1'
          ? Promise.resolve(
              createMockAssetRow({
                id,
                url: 'https://storage.example.com/seg-1.mp3',
                duration: 5,
                cacheKey: `voice_${storyId}_seg-1`
              })
            )
          : Promise.resolve(null)
      );

      await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['seg-1', 'seg-2']
      });

      // Warning should be logged for missing segment
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing voice asset for segment', {
        segmentId: 'seg-2'
      });
    });

    it('loads assets in parallel', async () => {
      const loadOrder: string[] = [];

      mockAudioAssetsStore.findById = mock(async (id: string) => {
        loadOrder.push(id);
        await new Promise((resolve) => setTimeout(resolve, 5));
        return createMockAssetRow({
          id,
          url: `https://storage.example.com/${id}.mp3`,
          duration: 5,
          cacheKey: `voice_${storyId}_${id}`
        });
      });

      const script = createScript([
        createAudioTrack('voice', [createVoiceSegment('v1', 0, 5), createVoiceSegment('v2', 5, 5)]),
        createAudioTrack('sfx', [createSfxSegment('s1', 2, 3)])
      ]);

      await orchestrator.mixStory({
        storyId,
        script,
        voiceAssetIds: ['v1', 'v2'],
        sfxAssetIds: ['s1']
      });

      // All assets should have been loaded (3 total)
      expect(loadOrder).toHaveLength(3);
    });
  });

  describe('buildMixInput()', () => {
    it('builds correct input with voice segments', () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5), createVoiceSegment('seg-2', 5, 7)])]);

      const voiceAssets = [
        { id: 'a1', url: 'https://storage/v1.mp3', duration: 5, cacheKey: `voice_${storyId}_seg-1` },
        { id: 'a2', url: 'https://storage/v2.mp3', duration: 7, cacheKey: `voice_${storyId}_seg-2` }
      ];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, [], [], []);

      expect(result.storyId).toBe(storyId);
      expect(result.voice.segments).toHaveLength(2);
      expect(result.voice.segments[0]!.path).toBe('https://storage/v1.mp3');
      expect(result.voice.segments[0]!.startTime).toBe(0);
      expect(result.voice.segments[0]!.duration).toBe(5);
      expect(result.voice.segments[1]!.path).toBe('https://storage/v2.mp3');
      expect(result.voice.segments[1]!.startTime).toBe(5);
    });

    it('builds correct input with SFX', () => {
      const script = createScript([
        createAudioTrack('voice', [createVoiceSegment('v1', 0, 10)]),
        createAudioTrack('sfx', [createSfxSegment('sfx-1', 2, 3), createSfxSegment('sfx-2', 7, 2)])
      ]);

      const voiceAssets = [{ id: 'a1', url: 'https://storage/v1.mp3', duration: 10, cacheKey: `voice_${storyId}_v1` }];
      const sfxAssets = [
        { id: 's1', url: 'https://storage/sfx1.mp3', duration: 3, cacheKey: `sfx_${storyId}_sfx-1` },
        { id: 's2', url: 'https://storage/sfx2.mp3', duration: 2, cacheKey: `sfx_${storyId}_sfx-2` }
      ];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, sfxAssets, [], []);

      expect(result.sfx).toBeDefined();
      expect(result.sfx!.files).toHaveLength(2);
      expect(result.sfx!.files[0]!.startTime).toBe(2);
      expect(result.sfx!.files[1]!.startTime).toBe(7);
    });

    it('builds correct input with music (ducking enabled)', () => {
      const script = createScript([
        createAudioTrack('voice', [createVoiceSegment('v1', 0, 10)]),
        createAudioTrack('music', [createMusicSegment('m1', 0, 120)])
      ]);

      const voiceAssets = [{ id: 'a1', url: 'https://storage/v1.mp3', duration: 10, cacheKey: `voice_${storyId}_v1` }];
      const musicAssets = [{ id: 'm1', url: 'https://storage/music.mp3', duration: 120, cacheKey: `music_${storyId}_m1` }];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, [], musicAssets, []);

      expect(result.music).toBeDefined();
      expect(result.music!.file.path).toBe('https://storage/music.mp3');
      expect(result.music!.enableDucking).toBe(true);
      expect(result.music!.volume).toBe(0.3); // Default music volume
    });

    it('builds correct input with ambiance (loop enabled)', () => {
      const script = createScript([
        createAudioTrack('voice', [createVoiceSegment('v1', 0, 10)]),
        createAudioTrack('ambiance', [createAmbianceSegment('amb1', 0, 300)])
      ]);

      const voiceAssets = [{ id: 'a1', url: 'https://storage/v1.mp3', duration: 10, cacheKey: `voice_${storyId}_v1` }];
      const ambianceAssets = [{ id: 'amb1', url: 'https://storage/amb.mp3', duration: 60, cacheKey: `ambiance_${storyId}_amb1` }];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, [], [], ambianceAssets);

      expect(result.ambiance).toBeDefined();
      expect(result.ambiance!.file.path).toBe('https://storage/amb.mp3');
      expect(result.ambiance!.loop).toBe(true);
      expect(result.ambiance!.volume).toBe(0.2); // Default ambiance volume
    });

    it('uses default volumes when no settings provided', () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('v1', 0, 10)])]);

      const voiceAssets = [{ id: 'a1', url: 'https://storage/v1.mp3', duration: 10, cacheKey: `voice_${storyId}_v1` }];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, [], [], []);

      expect(result.voice.segments[0]!.volume).toBe(1.0); // Default voice volume
    });

    it('overrides default volumes with custom settings', () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('v1', 0, 10)]), createAudioTrack('sfx', [createSfxSegment('sfx1', 2, 3)])]);

      const voiceAssets = [{ id: 'a1', url: 'https://storage/v1.mp3', duration: 10, cacheKey: `voice_${storyId}_v1` }];
      const sfxAssets = [{ id: 's1', url: 'https://storage/sfx.mp3', duration: 3, cacheKey: `sfx_${storyId}_sfx1` }];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, sfxAssets, [], [], { voice: 0.8, sfx: 0.6 });

      expect(result.voice.segments[0]!.volume).toBe(0.8);
      expect(result.sfx!.volume).toBe(0.6);
    });

    it('handles empty voice track gracefully', () => {
      const script = createScript([]);

      const result = orchestrator.buildMixInput(storyId, script, [], [], [], []);

      expect(result.voice.segments).toHaveLength(0);
      expect(result.voice.pauses).toBeInstanceOf(Map);
    });

    it('skips assets without matching cache key', () => {
      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5), createVoiceSegment('seg-2', 5, 7)])]);

      const voiceAssets = [
        { id: 'a1', url: 'https://storage/v1.mp3', duration: 5, cacheKey: `voice_${storyId}_seg-1` },
        { id: 'a2', url: 'https://storage/v2.mp3', duration: 7, cacheKey: null } // No cache key
      ];

      const result = orchestrator.buildMixInput(storyId, script, voiceAssets, [], [], []);

      // Only first segment should be included
      expect(result.voice.segments).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing voice asset for segment', {
        segmentId: 'seg-2'
      });
    });
  });

  describe('error handling', () => {
    it('propagates mixer errors', async () => {
      mockMixerService.mixStory = mock(() => Promise.reject(new Error('FFmpeg mixing failed')));

      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5)])]);

      await expect(
        orchestrator.mixStory({
          storyId,
          script,
          voiceAssetIds: ['seg-1']
        })
      ).rejects.toThrow('FFmpeg mixing failed');
    });

    it('propagates storage upload errors', async () => {
      mockStorage.upload = mock(() => Promise.reject(new Error('S3 upload failed')));

      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5)])]);

      await expect(
        orchestrator.mixStory({
          storyId,
          script,
          voiceAssetIds: ['seg-1']
        })
      ).rejects.toThrow('S3 upload failed');
    });

    it('propagates asset loading errors', async () => {
      mockAudioAssetsStore.findById = mock(() => Promise.reject(new Error('Database connection failed')));

      const script = createScript([createAudioTrack('voice', [createVoiceSegment('seg-1', 0, 5)])]);

      await expect(
        orchestrator.mixStory({
          storyId,
          script,
          voiceAssetIds: ['seg-1']
        })
      ).rejects.toThrow('Database connection failed');
    });
  });
});
