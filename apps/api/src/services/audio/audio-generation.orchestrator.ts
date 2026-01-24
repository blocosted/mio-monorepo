/**
 * Audio Generation Orchestrator Implementation
 *
 * Orchestrates SFX, Music, and Ambiance generation for story scripts.
 * Extracts common caching and generation patterns from workflow steps.
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';

import { AudioAssetType, type MusicMood, type TimelineSegment } from '@mio/shared/types';

import type { AmbianceGeneratorService } from '../ambiance/ambiance-generator.service';
import type { MusicGeneratorService } from '../music/music-generator.service';
import type { SfxService } from '../sound-design/sfx.service';
import type { AudioAssetsService } from '../stories/audio-assets.service';
import type {
  AmbianceGenerationInput,
  AudioGenerationResult,
  AudioSegmentGenerationResult,
  MusicGenerationInput,
  SfxGenerationInput
} from './audio-generation.orchestrator.types';
import { IocService } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';

/**
 * Audio Generation Orchestrator
 *
 * Provides unified interface for generating SFX, Music, and Ambiance audio.
 * Handles caching via audio_assets table and provides progress reporting.
 */
@injectable()
export class AudioGenerationOrchestrator extends AbstractService {
  constructor(
    @inject(IocService.SFX) private readonly sfxService: SfxService,
    @inject(IocService.MUSIC_GENERATOR) private readonly musicService: MusicGeneratorService,
    @inject(IocService.AMBIANCE_GENERATOR) private readonly ambianceService: AmbianceGeneratorService,
    @inject(IocService.AUDIO_ASSETS) private readonly audioAssetsService: AudioAssetsService
  ) {
    super();
  }

  /**
   * Generate SFX audio for all SFX segments in a script
   */
  async generateSfx(input: SfxGenerationInput): Promise<AudioGenerationResult> {
    const { storyId, script, onProgress } = input;

    // Extract SFX segments from script
    const sfxTrack = script.tracks.find((t) => t.type === 'sfx');
    const sfxSegments = sfxTrack?.segments ?? [];

    this.logger.info('Starting SFX generation', {
      storyId,
      segmentCount: sfxSegments.length
    });

    if (sfxSegments.length === 0) {
      return this.emptyResult();
    }

    const results: (AudioSegmentGenerationResult | null)[] = [];
    let completedCount = 0;

    for (const segment of sfxSegments) {
      const result = await this.generateSfxSegment(storyId, segment);
      results.push(result);
      completedCount++;
      onProgress?.(completedCount, sfxSegments.length);
    }

    return this.buildResult(results, AudioAssetType.Sfx);
  }

  /**
   * Generate Music audio for all music segments in a script
   */
  async generateMusic(input: MusicGenerationInput): Promise<AudioGenerationResult> {
    const { storyId, script, onProgress, defaultVolume = 0.3 } = input;

    // Extract music segments from script
    const musicTrack = script.tracks.find((t) => t.type === 'music');
    const musicSegments = musicTrack?.segments ?? [];

    this.logger.info('Starting music generation', {
      storyId,
      segmentCount: musicSegments.length
    });

    if (musicSegments.length === 0) {
      return this.emptyResult();
    }

    const results: (AudioSegmentGenerationResult | null)[] = [];
    let completedCount = 0;

    for (const segment of musicSegments) {
      const result = await this.generateMusicSegment(storyId, segment, defaultVolume);
      results.push(result);
      completedCount++;
      onProgress?.(completedCount, musicSegments.length);
    }

    return this.buildResult(results, AudioAssetType.Music);
  }

  /**
   * Generate Ambiance audio for all ambiance segments in a script
   */
  async generateAmbiance(input: AmbianceGenerationInput): Promise<AudioGenerationResult> {
    const { storyId, script, onProgress, defaultVolume = 0.2 } = input;

    // Extract ambiance segments from script
    const ambianceTrack = script.tracks.find((t) => t.type === 'ambiance');
    const ambianceSegments = ambianceTrack?.segments ?? [];

    this.logger.info('Starting ambiance generation', {
      storyId,
      segmentCount: ambianceSegments.length
    });

    if (ambianceSegments.length === 0) {
      return this.emptyResult();
    }

    const results: (AudioSegmentGenerationResult | null)[] = [];
    let completedCount = 0;

    for (const segment of ambianceSegments) {
      const result = await this.generateAmbianceSegment(storyId, segment, script.metadata.actualDuration, defaultVolume);
      results.push(result);
      completedCount++;
      onProgress?.(completedCount, ambianceSegments.length);
    }

    return this.buildResult(results, AudioAssetType.Ambiance);
  }

  /**
   * Generate SFX for a single segment
   */
  private async generateSfxSegment(storyId: string, segment: TimelineSegment): Promise<AudioSegmentGenerationResult | null> {
    try {
      if (segment.content.type !== 'sfx') {
        return null;
      }

      // Content-based cache key for deduplication across stories
      const descriptionHash = Bun.hash(segment.content.description).toString(36);
      const cacheKey = `sfx_${descriptionHash}_${Math.round(segment.duration)}`;

      // Check for existing asset
      const existing = await this.audioAssetsService.findByCacheKey(cacheKey);
      if (existing) {
        this.logger.debug('Using cached SFX asset', { cacheKey, segmentId: segment.id });
        return {
          segmentId: segment.id,
          assetId: existing.id,
          fromCache: true,
          durationSeconds: existing.duration,
          type: AudioAssetType.Sfx
        };
      }

      // Generate SFX audio (service handles storage)
      const result = await this.sfxService.generateSfx({
        text: segment.content.description,
        durationSeconds: segment.duration
      });

      // Store in audio_assets table (URL from service)
      const asset = await this.audioAssetsService.create({
        storyId,
        type: AudioAssetType.Sfx,
        url: result.url,
        duration: result.durationSeconds,
        cacheKey
      });

      return {
        segmentId: segment.id,
        assetId: asset.id,
        fromCache: false,
        durationSeconds: result.durationSeconds,
        type: AudioAssetType.Sfx
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate SFX segment', {
        segmentId: segment.id,
        storyId,
        error: errorMessage
      });
      return null;
    }
  }

  /**
   * Generate Music for a single segment
   */
  private async generateMusicSegment(storyId: string, segment: TimelineSegment, defaultVolume: number): Promise<AudioSegmentGenerationResult | null> {
    try {
      if (segment.content.type !== 'music') {
        return null;
      }

      // Content-based cache key
      const cacheKey = `music_${segment.content.mood}_${Math.round(segment.duration)}`;

      // Check for existing asset
      const existing = await this.audioAssetsService.findByCacheKey(cacheKey);
      if (existing) {
        this.logger.debug('Using cached music asset', { cacheKey, segmentId: segment.id });
        return {
          segmentId: segment.id,
          assetId: existing.id,
          fromCache: true,
          durationSeconds: existing.duration,
          type: AudioAssetType.Music
        };
      }

      // Generate music audio (service handles storage)
      const result = await this.musicService.generate({
        mood: segment.content.mood as MusicMood,
        targetDurationSeconds: segment.duration,
        volume: defaultVolume
      });

      // Store in audio_assets table (URL from service)
      const asset = await this.audioAssetsService.create({
        storyId,
        type: AudioAssetType.Music,
        url: result.url,
        duration: result.durationSeconds,
        cacheKey
      });

      return {
        segmentId: segment.id,
        assetId: asset.id,
        fromCache: false,
        durationSeconds: result.durationSeconds,
        type: AudioAssetType.Music
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate music segment', {
        segmentId: segment.id,
        storyId,
        error: errorMessage
      });
      return null;
    }
  }

  /**
   * Generate Ambiance for a single segment
   */
  private async generateAmbianceSegment(
    storyId: string,
    segment: TimelineSegment,
    storyDuration: number,
    defaultVolume: number
  ): Promise<AudioSegmentGenerationResult | null> {
    try {
      if (segment.content.type !== 'ambiance') {
        return null;
      }

      // Content-based cache key
      const descriptionHash = Bun.hash(segment.content.description).toString(36);
      const targetDuration = segment.duration || storyDuration;
      const cacheKey = `ambiance_${descriptionHash}_${Math.round(targetDuration)}`;

      // Check for existing asset
      const existing = await this.audioAssetsService.findByCacheKey(cacheKey);
      if (existing) {
        this.logger.debug('Using cached ambiance asset', { cacheKey, segmentId: segment.id });
        return {
          segmentId: segment.id,
          assetId: existing.id,
          fromCache: true,
          durationSeconds: existing.duration,
          type: AudioAssetType.Ambiance
        };
      }

      // Generate ambiance audio (service handles storage)
      const result = await this.ambianceService.generate({
        description: segment.content.description,
        targetDurationSeconds: targetDuration,
        volume: segment.content.volume ?? defaultVolume
      });

      // Store in audio_assets table (URL from service)
      const asset = await this.audioAssetsService.create({
        storyId,
        type: AudioAssetType.Ambiance,
        url: result.url,
        duration: result.durationSeconds,
        cacheKey
      });

      return {
        segmentId: segment.id,
        assetId: asset.id,
        fromCache: false,
        durationSeconds: result.durationSeconds,
        type: AudioAssetType.Ambiance
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate ambiance segment', {
        segmentId: segment.id,
        storyId,
        error: errorMessage
      });
      return null;
    }
  }

  /**
   * Build result from individual segment results
   */
  private buildResult(results: (AudioSegmentGenerationResult | null)[], type: AudioAssetType): AudioGenerationResult {
    const successfulResults = results.filter((r): r is AudioSegmentGenerationResult => r !== null);
    const failedCount = results.length - successfulResults.length;
    const cachedCount = successfulResults.filter((r) => r.fromCache).length;
    const totalDurationSeconds = successfulResults.reduce((sum, r) => sum + r.durationSeconds, 0);

    this.logger.info(`${type} generation complete`, {
      successCount: successfulResults.length,
      failedCount,
      cachedCount,
      totalDurationSeconds
    });

    return {
      assetIds: successfulResults.map((r) => r.assetId),
      segments: successfulResults,
      successCount: successfulResults.length,
      failedCount,
      cachedCount,
      totalDurationSeconds
    };
  }

  /**
   * Return empty result for when there are no segments
   */
  private emptyResult(): AudioGenerationResult {
    return {
      assetIds: [],
      segments: [],
      successCount: 0,
      failedCount: 0,
      cachedCount: 0,
      totalDurationSeconds: 0
    };
  }
}
