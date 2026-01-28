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

import type { ComputedSegment, ComputedTimeline } from '@mio/shared/types';

import type { AudioFile, MixStoryInput } from './ffmpeg-mixer.service.types';
import type { FFmpegMixerService } from './ffmpeg-mixer.service';
import type { StoryMixingInputV3, StoryMixingResult, VolumeSettings } from './story-mixing.orchestrator.types';
import { IocService } from '../../ioc/ioc.types';
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
 * Coordinates building mixer input from computed timeline, invoking FFmpeg mixer,
 * and uploading results to S3.
 */
@injectable()
export class StoryMixingOrchestrator extends AbstractService {
  constructor(@inject(IocService.FFMPEG_MIXER) private readonly mixerService: FFmpegMixerService) {
    super();
  }

  /**
   * Mix a story using ComputedTimeline (V3)
   *
   * This method uses absolute times from ComputedTimeline which are based on
   * real TTS durations, resulting in accurate timing for the final mix.
   */
  async mixStoryV3(input: StoryMixingInputV3): Promise<StoryMixingResult> {
    const { storyId, computedTimeline, volumeSettings } = input;

    this.logger.info('Starting story mixing (V3)', {
      storyId,
      totalDuration: computedTimeline.metadata.totalDuration,
      trackCount: computedTimeline.tracks.length
    });

    // Build mixer input directly from computed timeline
    const mixInput = this.buildMixInputFromTimeline(storyId, computedTimeline, volumeSettings);

    // Mix audio
    const result = await this.mixerService.mixStory(mixInput);

    // Upload to S3 temp location
    const tempPath = getTempMixPath(storyId);
    const uploadResult = await this.storageService.upload(result.audio, tempPath, { contentType: 'audio/mpeg' });

    this.logger.info('Story mixed (V3) and uploaded to temp location', {
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
   * Build MixStoryInput from ComputedTimeline
   *
   * All times are already absolute and based on real durations.
   */
  buildMixInputFromTimeline(
    storyId: string,
    timeline: ComputedTimeline,
    volumeSettings?: VolumeSettings
  ): MixStoryInput {
    const volumes = { ...DEFAULT_VOLUMES, ...volumeSettings };

    // Get tracks by type
    const voiceTrack = timeline.tracks.find((t) => t.type === 'voice');
    const sfxTrack = timeline.tracks.find((t) => t.type === 'sfx');
    const musicTrack = timeline.tracks.find((t) => t.type === 'music');
    const ambianceTrack = timeline.tracks.find((t) => t.type === 'ambiance');

    // Build voice audio files (sorted by startTime)
    const voiceSegments = [...(voiceTrack?.segments ?? [])].sort(
      (a, b) => a.startTime - b.startTime
    );
    const voiceAudioFiles = this.buildAudioFilesFromComputedSegments(
      voiceSegments,
      volumes.voice
    );

    // Build pauses map from voice segment timing gaps
    // Each pause entry is: index i -> pause duration after segment i
    const voicePauses = new Map<number, number>();
    for (let i = 0; i < voiceSegments.length - 1; i++) {
      const currentSegment = voiceSegments[i];
      const nextSegment = voiceSegments[i + 1];
      if (currentSegment && nextSegment) {
        const currentEndTime = currentSegment.startTime + currentSegment.duration;
        const pauseDuration = nextSegment.startTime - currentEndTime;
        if (pauseDuration > 0) {
          voicePauses.set(i, pauseDuration);
        }
      }
    }

    this.logger.debug('Built voice pauses from timeline', {
      segmentCount: voiceSegments.length,
      pauseCount: voicePauses.size,
      pauses: Array.from(voicePauses.entries())
    });

    // Build SFX audio files
    const sfxAudioFiles = this.buildAudioFilesFromComputedSegments(
      sfxTrack?.segments ?? [],
      volumes.sfx
    );

    const mixInput: MixStoryInput = {
      storyId,
      voice: {
        segments: voiceAudioFiles,
        pauses: voicePauses
      }
    };

    // Add music if available (all segments)
    const musicAudioFiles = this.buildAudioFilesFromComputedSegments(
      musicTrack?.segments ?? [],
      volumes.music
    );
    if (musicAudioFiles.length > 0) {
      mixInput.music = {
        files: musicAudioFiles,
        volume: volumes.music,
        enableDucking: true
      };
    }

    // Add ambiance if available (all segments)
    const ambianceAudioFiles = this.buildAudioFilesFromComputedSegments(
      ambianceTrack?.segments ?? [],
      volumes.ambiance
    );
    if (ambianceAudioFiles.length > 0) {
      mixInput.ambiance = {
        files: ambianceAudioFiles,
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
   * Build AudioFile array from ComputedSegments
   */
  private buildAudioFilesFromComputedSegments(
    segments: ComputedSegment[],
    volume: number
  ): AudioFile[] {
    const audioFiles: AudioFile[] = [];

    for (const segment of segments) {
      if (!segment.audioUrl) {
        this.logger.warn('Missing audio URL for computed segment', { segmentId: segment.id });
        continue;
      }

      audioFiles.push({
        path: segment.audioUrl,
        duration: segment.duration,
        startTime: segment.startTime,
        volume
      });
    }

    return audioFiles;
  }

}
