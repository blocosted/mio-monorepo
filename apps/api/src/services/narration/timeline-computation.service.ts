/**
 * Timeline Computation Service
 *
 * Computes absolute timeline from V3 scripts with relative timing hints.
 * Uses real audio durations from TTS generation to resolve timing hints.
 *
 * Flow:
 * 1. Load V3 script with relative timing
 * 2. Build voice timeline sequentially (with contextual pauses)
 * 3. Resolve relative timing hints to absolute times
 * 4. Persist ComputedTimeline to DB
 */

import 'reflect-metadata';

import { inject, injectable } from 'inversify';
import { eq } from 'drizzle-orm';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import type {
  AudioAssetWithDuration,
  ComputedSegment,
  ComputedTimeline,
  ComputedTrack,
  ComputeTimelineInput
} from '@mio/shared/types';
import type {
  AudioTrack,
  RelativeTimingHint,
  ScriptSegment,
  StoryScript,
  TimingAnchorType,
  VoiceSegmentContent
} from '@mio/shared/types';
import { computedTimelines } from '@mio/db/schema';

import { IocConnection } from '../../ioc/ioc.types';
import { AbstractService } from '../service.abstract';
import { PauseComputationService } from './pause-computation.service';
import type { VoiceSegmentInfo } from './pause-computation.service.types';

/** Default pause between voice segments (seconds) - fallback only */
const DEFAULT_VOICE_PAUSE_SECONDS = 0.3;

/** Voice segment timing (computed) */
interface VoiceSegmentTiming {
  segmentId: string;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Timeline Computation Service
 *
 * Converts V3 scripts with relative timing to computed timelines
 * with absolute times based on real audio durations.
 */
@injectable()
export class TimelineComputationService extends AbstractService {
  private readonly database: DatabaseConnection;
  private readonly pauseService: PauseComputationService;

  constructor(
    @inject(IocConnection.DATABASE) database: DatabaseConnection
  ) {
    super();
    this.database = database;
    this.pauseService = new PauseComputationService();
  }

  /**
   * Compute timeline from V3 script and audio assets
   */
  async computeTimeline(
    input: ComputeTimelineInput & { script: StoryScript }
  ): Promise<ComputedTimeline> {
    const { storyId, script, voiceAssets } = input;
    const pauseSeconds =
      input.voiceSegmentPauseSeconds ??
      script.metadata.voiceSegmentPauseSeconds ??
      DEFAULT_VOICE_PAUSE_SECONDS;

    this.logger.info('Computing timeline', {
      storyId,
      voiceAssetCount: voiceAssets.length,
      pauseSeconds
    });

    // Step 1: Build voice timeline with real durations
    const voiceTimingMap = this.buildVoiceTimeline(script, voiceAssets, pauseSeconds);
    const voiceTotalDuration = this.calculateVoiceTotalDuration(voiceTimingMap);

    // Step 2: Compute all tracks (pass voiceTotalDuration to cap music/ambiance)
    const computedTracks = this.computeAllTracks(script, voiceTimingMap, voiceTotalDuration, {
      voiceAssets,
      sfxAssets: input.sfxAssets,
      musicAssets: input.musicAssets,
      ambianceAssets: input.ambianceAssets
    });

    // Step 3: Calculate total duration (max end time across all tracks)
    const totalDuration = this.calculateTotalDuration(computedTracks, voiceTotalDuration);

    // Step 4: Build computed timeline
    const computedTimeline: ComputedTimeline = {
      storyId,
      metadata: {
        totalDuration,
        computedAt: new Date().toISOString(),
        voiceSegmentPauseSeconds: pauseSeconds,
        voiceSegmentCount: voiceAssets.length,
        nonVoiceSegmentCount: this.countNonVoiceSegments(computedTracks)
      },
      tracks: computedTracks
    };

    this.logger.info('Timeline computed', {
      storyId,
      totalDuration,
      trackCount: computedTracks.length,
      voiceSegmentCount: voiceAssets.length
    });

    return computedTimeline;
  }

  /**
   * Compute and persist timeline to database
   */
  async computeAndPersist(
    input: ComputeTimelineInput & { script: StoryScript }
  ): Promise<ComputedTimeline> {
    const timeline = await this.computeTimeline(input);
    await this.persistTimeline(timeline);
    return timeline;
  }

  /**
   * Persist computed timeline to database
   */
  async persistTimeline(timeline: ComputedTimeline): Promise<void> {
    const { storyId } = timeline;

    // Upsert: delete existing + insert new (atomic)
    await this.database.transaction(async (trx) => {
      await trx.delete(computedTimelines).where(eq(computedTimelines.storyId, storyId));

      await trx.insert(computedTimelines).values({
        storyId,
        timeline,
        totalDuration: timeline.metadata.totalDuration,
        computedAt: new Date(timeline.metadata.computedAt)
      });
    });

    this.logger.info('Timeline persisted', {
      storyId,
      totalDuration: timeline.metadata.totalDuration
    });
  }

  /**
   * Load computed timeline from database
   */
  async loadTimeline(storyId: string): Promise<ComputedTimeline | null> {
    const result = await this.database
      .select({ timeline: computedTimelines.timeline })
      .from(computedTimelines)
      .where(eq(computedTimelines.storyId, storyId))
      .limit(1);

    const row = result[0];
    return row?.timeline ?? null;
  }

  /**
   * Build voice timeline with real durations (sequential)
   *
   * Uses contextual pause computation for natural rhythm.
   */
  private buildVoiceTimeline(
    script: StoryScript,
    voiceAssets: AudioAssetWithDuration[],
    fallbackPauseSeconds: number
  ): Map<string, VoiceSegmentTiming> {
    const voiceTrack = script.tracks.find((t) => t.type === 'voice');
    if (!voiceTrack) {
      return new Map();
    }

    // Create a map of segment ID to asset duration
    const assetDurationMap = new Map(voiceAssets.map((a) => [a.segmentId, a]));

    // Sort segments by order
    const sortedSegments = [...voiceTrack.segments].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    // Convert segments to VoiceSegmentInfo for pause computation
    const voiceSegmentInfos: VoiceSegmentInfo[] = sortedSegments
      .filter((s) => s.content.type === 'narration' || s.content.type === 'dialogue')
      .map((s) => ({
        id: s.id,
        content: s.content as VoiceSegmentContent
      }));

    // Compute contextual pauses for all segments
    const computedPauses = this.pauseService.computePausesForSegments(voiceSegmentInfos);

    const timeline = new Map<string, VoiceSegmentTiming>();
    let currentTime = 0;
    let segmentIndex = 0;

    for (const segment of sortedSegments) {
      const asset = assetDurationMap.get(segment.id);
      if (!asset) {
        this.logger.warn('No audio asset found for voice segment', {
          segmentId: segment.id
        });
        continue;
      }

      const timing: VoiceSegmentTiming = {
        segmentId: segment.id,
        startTime: currentTime,
        endTime: currentTime + asset.durationSeconds,
        duration: asset.durationSeconds
      };

      timeline.set(segment.id, timing);

      // Use contextual pause if available, otherwise fallback
      const pauseSeconds = computedPauses.get(segmentIndex) ?? fallbackPauseSeconds;
      currentTime += asset.durationSeconds + pauseSeconds;
      segmentIndex++;
    }

    return timeline;
  }

  /**
   * Calculate total voice duration
   */
  private calculateVoiceTotalDuration(voiceTimingMap: Map<string, VoiceSegmentTiming>): number {
    let maxEnd = 0;
    for (const timing of voiceTimingMap.values()) {
      if (timing.endTime > maxEnd) {
        maxEnd = timing.endTime;
      }
    }
    return maxEnd;
  }

  /**
   * Compute all tracks with absolute times
   */
  private computeAllTracks(
    script: StoryScript,
    voiceTimingMap: Map<string, VoiceSegmentTiming>,
    voiceTotalDuration: number,
    assets: {
      voiceAssets: AudioAssetWithDuration[];
      sfxAssets?: AudioAssetWithDuration[];
      musicAssets?: AudioAssetWithDuration[];
      ambianceAssets?: AudioAssetWithDuration[];
    }
  ): ComputedTrack[] {
    return script.tracks.map((track) => {
      return this.computeTrack(track, voiceTimingMap, voiceTotalDuration, assets);
    });
  }

  /**
   * Compute a single track
   */
  private computeTrack(
    track: AudioTrack,
    voiceTimingMap: Map<string, VoiceSegmentTiming>,
    voiceTotalDuration: number,
    assets: {
      voiceAssets: AudioAssetWithDuration[];
      sfxAssets?: AudioAssetWithDuration[];
      musicAssets?: AudioAssetWithDuration[];
      ambianceAssets?: AudioAssetWithDuration[];
    }
  ): ComputedTrack {
    // Get relevant assets for this track type
    const trackAssets = this.getAssetsForTrack(track.type, assets);
    const assetMap = new Map(trackAssets.map((a) => [a.segmentId, a]));

    const computedSegments = track.segments.map((segment) => {
      if (track.type === 'voice') {
        // Voice segments use the pre-computed timing
        return this.computeVoiceSegment(segment, voiceTimingMap, assetMap);
      } else {
        // Non-voice segments resolve their timing hints
        return this.computeNonVoiceSegment(segment, voiceTimingMap, assetMap, voiceTotalDuration);
      }
    });

    // Sort by startTime for consistent ordering
    computedSegments.sort((a, b) => a.startTime - b.startTime);

    return {
      id: track.id,
      type: track.type,
      name: track.name,
      segments: computedSegments
    };
  }

  /**
   * Compute a voice segment
   */
  private computeVoiceSegment(
    segment: ScriptSegment,
    voiceTimingMap: Map<string, VoiceSegmentTiming>,
    assetMap: Map<string, AudioAssetWithDuration>
  ): ComputedSegment {
    const timing = voiceTimingMap.get(segment.id);
    const asset = assetMap.get(segment.id);

    const startTime = timing?.startTime ?? 0;
    const duration = timing?.duration ?? segment.estimatedDuration ?? 0;

    return {
      id: segment.id,
      trackId: segment.trackId,
      startTime,
      duration,
      endTime: startTime + duration,
      audioAssetId: asset?.id,
      audioUrl: asset?.url,
      content: segment.content
    };
  }

  /**
   * Compute a non-voice segment by resolving its timing hint
   *
   * @param voiceTotalDuration - Total voice duration to cap music/ambiance
   */
  private computeNonVoiceSegment(
    segment: ScriptSegment,
    voiceTimingMap: Map<string, VoiceSegmentTiming>,
    assetMap: Map<string, AudioAssetWithDuration>,
    voiceTotalDuration: number
  ): ComputedSegment {
    const asset = assetMap.get(segment.id);
    let duration = asset?.durationSeconds ?? segment.estimatedDuration ?? 3; // Default 3s for SFX/music

    let startTime = 0;

    if (segment.timingHint) {
      startTime = this.resolveTimingHint(segment.timingHint, voiceTimingMap);
    } else {
      // No timing hint - place at start (or use estimated position)
      this.logger.debug('Non-voice segment has no timing hint', {
        segmentId: segment.id
      });
    }

    // Clamp start time to valid range
    startTime = Math.max(0, startTime);

    // For music and ambiance, cap duration to not exceed voice track
    // This prevents background audio from extending beyond the story
    if (segment.content.type === 'music' || segment.content.type === 'ambiance') {
      const maxAllowedDuration = Math.max(0, voiceTotalDuration - startTime);
      if (duration > maxAllowedDuration && maxAllowedDuration > 0) {
        this.logger.debug('Capping non-voice segment duration to voice track', {
          segmentId: segment.id,
          type: segment.content.type,
          originalDuration: duration,
          cappedDuration: maxAllowedDuration,
          startTime,
          voiceTotalDuration
        });
        duration = maxAllowedDuration;
      }
    }

    return {
      id: segment.id,
      trackId: segment.trackId,
      startTime,
      duration,
      endTime: startTime + duration,
      audioAssetId: asset?.id,
      audioUrl: asset?.url,
      content: segment.content
    };
  }

  /**
   * Resolve a relative timing hint to an absolute start time
   */
  private resolveTimingHint(
    hint: RelativeTimingHint,
    voiceTimingMap: Map<string, VoiceSegmentTiming>
  ): number {
    const anchorTiming = voiceTimingMap.get(hint.anchorSegmentId);

    if (!anchorTiming) {
      this.logger.warn('Anchor segment not found for timing hint', {
        anchorSegmentId: hint.anchorSegmentId
      });
      return 0;
    }

    const offsetSeconds = hint.offsetMs / 1000;

    switch (hint.anchorType as TimingAnchorType) {
      case 'segment_start':
        return anchorTiming.startTime + offsetSeconds;

      case 'segment_end':
        return anchorTiming.endTime + offsetSeconds;

      case 'segment_percent': {
        const percent = hint.anchorPercent ?? 50;
        const percentPoint =
          anchorTiming.startTime + (anchorTiming.duration * percent) / 100;
        return percentPoint + offsetSeconds;
      }

      default:
        this.logger.warn('Unknown anchor type', { anchorType: hint.anchorType });
        return anchorTiming.startTime + offsetSeconds;
    }
  }

  /**
   * Get assets for a track type
   */
  private getAssetsForTrack(
    trackType: string,
    assets: {
      voiceAssets: AudioAssetWithDuration[];
      sfxAssets?: AudioAssetWithDuration[];
      musicAssets?: AudioAssetWithDuration[];
      ambianceAssets?: AudioAssetWithDuration[];
    }
  ): AudioAssetWithDuration[] {
    switch (trackType) {
      case 'voice':
        return assets.voiceAssets;
      case 'sfx':
        return assets.sfxAssets ?? [];
      case 'music':
        return assets.musicAssets ?? [];
      case 'ambiance':
        return assets.ambianceAssets ?? [];
      default:
        return [];
    }
  }

  /**
   * Calculate total duration across all tracks
   */
  private calculateTotalDuration(
    tracks: ComputedTrack[],
    voiceTotalDuration: number
  ): number {
    let maxEnd = voiceTotalDuration;

    for (const track of tracks) {
      for (const segment of track.segments) {
        if (segment.endTime > maxEnd) {
          maxEnd = segment.endTime;
        }
      }
    }

    return maxEnd;
  }

  /**
   * Count non-voice segments
   */
  private countNonVoiceSegments(tracks: ComputedTrack[]): number {
    return tracks
      .filter((t) => t.type !== 'voice')
      .reduce((sum, track) => sum + track.segments.length, 0);
  }
}
