/**
 * Story Mixing Orchestrator Implementation
 *
 * Orchestrates the audio mixing process for stories:
 * - Loads audio assets from database
 * - Builds FFmpeg mixer input from script and assets
 * - Invokes the mixer service
 * - Uploads result to S3 temp location
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import type { StoryScript, TimelineSegment } from '@mio/shared/types';

import type { AudioAssetsStore } from '../stories/audio-assets.store';
import type { AudioFile, MixStoryInput } from './ffmpeg-mixer.service.types';
import type { FFmpegMixerService } from './ffmpeg-mixer.service';
import type { LoadedAudioAsset, StoryMixingInput, StoryMixingResult } from './story-mixing.orchestrator.types';
import { IocService, IocStore } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/** S3 temp path for mixed audio */
const getTempMixPath = (storyId: string) => `stories/${storyId}/temp/mixed.mp3`;

/** Default volume settings */
const DEFAULT_VOLUMES = {
  voice: 1.0,
  sfx: 0.7,
  music: 0.3,
  ambiance: 0.2
} as const;

/**
 * Story Mixing Orchestrator
 *
 * Coordinates loading assets from DB, building mixer input, and uploading results.
 */
@injectable()
export class StoryMixingOrchestrator extends AbstractService {
  constructor(
    @inject(IocService.FFMPEG_MIXER) private readonly mixerService: FFmpegMixerService,
    @inject(IocStore.AUDIO_ASSETS_STORE) private readonly audioAssetsStore: AudioAssetsStore
  ) {
    super();
  }

  /**
   * Mix a story by loading assets and invoking the FFmpeg mixer
   */
  async mixStory(input: StoryMixingInput): Promise<StoryMixingResult> {
    const { storyId, script, voiceAssetIds, sfxAssetIds = [], musicAssetIds = [], ambianceAssetIds = [], volumeSettings } = input;

    this.logger.info('Starting story mixing', {
      storyId,
      voiceAssets: voiceAssetIds.length,
      sfxAssets: sfxAssetIds.length,
      musicAssets: musicAssetIds.length,
      ambianceAssets: ambianceAssetIds.length
    });

    // Load all audio assets from DB
    const [voiceAssets, sfxAssets, musicAssets, ambianceAssets] = await Promise.all([
      this.loadAssets(voiceAssetIds),
      this.loadAssets(sfxAssetIds),
      this.loadAssets(musicAssetIds),
      this.loadAssets(ambianceAssetIds)
    ]);

    // Build mixer input
    const mixInput = this.buildMixInput(storyId, script, voiceAssets, sfxAssets, musicAssets, ambianceAssets, volumeSettings);

    // Mix audio
    const result = await this.mixerService.mixStory(mixInput);

    // Upload to S3 temp location
    const tempPath = getTempMixPath(storyId);
    const uploadResult = await this.storageService.upload(result.audio, tempPath, { contentType: 'audio/mpeg' });

    this.logger.info('Story mixed and uploaded to temp location', {
      storyId,
      tempUrl: uploadResult.url,
      durationSeconds: result.duration
    });

    return {
      audio: result.audio,
      durationSeconds: result.duration,
      tempUrl: uploadResult.url
    };
  }

  /**
   * Build the MixStoryInput from script and loaded assets
   */
  buildMixInput(
    storyId: string,
    script: StoryScript,
    voiceAssets: LoadedAudioAsset[],
    sfxAssets: LoadedAudioAsset[],
    musicAssets: LoadedAudioAsset[],
    ambianceAssets: LoadedAudioAsset[],
    volumeSettings?: StoryMixingInput['volumeSettings']
  ): MixStoryInput {
    const volumes = { ...DEFAULT_VOLUMES, ...volumeSettings };

    // Build asset maps for efficient lookup by segment ID
    // Cache keys are in format: {type}_{storyId}_{segmentId} or {type}_{hash}_{duration}
    const voiceAssetMap = this.buildAssetMap(voiceAssets);
    const sfxAssetMap = this.buildAssetMap(sfxAssets);

    // Build voice track input
    const voiceTrack = script.tracks.find((t) => t.type === 'voice');
    const voiceSegments = voiceTrack?.segments ?? [];
    const voiceAudioFiles = this.buildVoiceAudioFiles(voiceSegments, voiceAssetMap, volumes.voice);

    // Build SFX track input
    const sfxTrack = script.tracks.find((t) => t.type === 'sfx');
    const sfxSegments = sfxTrack?.segments ?? [];
    const sfxAudioFiles = this.buildSfxAudioFiles(sfxSegments, sfxAssetMap, volumes.sfx);

    // Build music track input (use first asset/segment)
    const musicTrack = script.tracks.find((t) => t.type === 'music');
    const musicSegments = musicTrack?.segments ?? [];
    const firstMusicAsset = musicAssets[0];
    const firstMusicSegment = musicSegments[0];

    // Build ambiance track input (use first asset/segment)
    const ambianceTrack = script.tracks.find((t) => t.type === 'ambiance');
    const ambianceSegments = ambianceTrack?.segments ?? [];
    const firstAmbianceAsset = ambianceAssets[0];
    const firstAmbianceSegment = ambianceSegments[0];

    const mixInput: MixStoryInput = {
      storyId,
      voice: {
        segments: voiceAudioFiles,
        pauses: new Map() // No inter-segment pauses for now
      }
    };

    // Add music if available
    if (firstMusicAsset && firstMusicSegment) {
      mixInput.music = {
        file: {
          path: firstMusicAsset.url,
          duration: firstMusicSegment.duration,
          startTime: firstMusicSegment.startTime
        },
        volume: volumes.music,
        enableDucking: true
      };
    }

    // Add ambiance if available
    if (firstAmbianceAsset && firstAmbianceSegment) {
      mixInput.ambiance = {
        file: {
          path: firstAmbianceAsset.url,
          duration: firstAmbianceSegment.duration,
          startTime: firstAmbianceSegment.startTime
        },
        volume: volumes.ambiance,
        loop: true
      };
    }

    // Add SFX if available
    if (sfxAudioFiles.length > 0) {
      mixInput.sfx = {
        files: sfxAudioFiles,
        volume: volumes.sfx
      };
    }

    return mixInput;
  }

  /**
   * Load assets from database by IDs
   */
  private async loadAssets(assetIds: string[]): Promise<LoadedAudioAsset[]> {
    if (assetIds.length === 0) {
      return [];
    }

    const assets = await Promise.all(assetIds.map((id) => this.audioAssetsStore.findById(id)));

    return assets
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .map((a) => ({
        id: a.id,
        url: a.url,
        duration: a.duration,
        cacheKey: a.cacheKey
      }));
  }

  /**
   * Build a map of segment ID to asset for efficient lookup
   *
   * Cache keys are in format: {type}_{storyId}_{segmentId}
   */
  private buildAssetMap(assets: LoadedAudioAsset[]): Map<string, LoadedAudioAsset> {
    const map = new Map<string, LoadedAudioAsset>();

    for (const asset of assets) {
      if (asset.cacheKey) {
        // Extract segment ID from cache key (last part after underscore)
        const parts = asset.cacheKey.split('_');
        const segmentId = parts[parts.length - 1];
        if (segmentId) {
          map.set(segmentId, asset);
        }
      }
    }

    return map;
  }

  /**
   * Build voice audio files from segments and asset map
   */
  private buildVoiceAudioFiles(segments: TimelineSegment[], assetMap: Map<string, LoadedAudioAsset>, volume: number): AudioFile[] {
    const audioFiles: AudioFile[] = [];

    for (const segment of segments) {
      const asset = assetMap.get(segment.id);
      if (!asset) {
        this.logger.warn('Missing voice asset for segment', { segmentId: segment.id });
        continue;
      }

      audioFiles.push({
        path: asset.url,
        duration: segment.duration,
        startTime: segment.startTime,
        volume
      });
    }

    return audioFiles;
  }

  /**
   * Build SFX audio files from segments and asset map
   */
  private buildSfxAudioFiles(segments: TimelineSegment[], assetMap: Map<string, LoadedAudioAsset>, volume: number): AudioFile[] {
    const audioFiles: AudioFile[] = [];

    for (const segment of segments) {
      const asset = assetMap.get(segment.id);
      if (!asset) {
        this.logger.warn('Missing SFX asset for segment', { segmentId: segment.id });
        continue;
      }

      audioFiles.push({
        path: asset.url,
        duration: segment.duration,
        startTime: segment.startTime,
        volume
      });
    }

    return audioFiles;
  }
}
