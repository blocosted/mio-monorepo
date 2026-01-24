/**
 * Timeline Sync Service
 *
 * Recalculates SFX and music timings based on actual TTS durations.
 * Uses proportional scaling to maintain relative positioning of
 * non-voice segments within the story timeline.
 */

import type { Logger } from '@mio/shared/server/logger';
import type { StoryScript, TimelineSegment } from '@mio/shared/types';

import type { SyncedStoryScript, TimelineSyncOptions, TTSSegmentResult, VoiceSegmentTiming } from './timeline-sync.service.types';

/** Default pause between voice segments (seconds) */
const DEFAULT_PAUSE_BETWEEN_SEGMENTS = 0.5;

/**
 * Timeline Sync Service Implementation
 *
 * This service is designed to be used standalone (without IoC) in CLI scripts,
 * so it doesn't use @injectable decorator.
 */
export class TimelineSyncService {
  constructor(private readonly logger?: Logger) {}

  /**
   * Build a timeline map from TTS results
   */
  buildVoiceTimeline(ttsResults: TTSSegmentResult[], pauseBetweenSegments: number = DEFAULT_PAUSE_BETWEEN_SEGMENTS): Map<string, VoiceSegmentTiming> {
    const timeline = new Map<string, VoiceSegmentTiming>();
    let currentTime = 0;

    for (const result of ttsResults) {
      const timing: VoiceSegmentTiming = {
        segmentId: result.segmentId,
        startTime: currentTime,
        endTime: currentTime + result.actualDurationSeconds,
        duration: result.actualDurationSeconds
      };

      timeline.set(result.segmentId, timing);
      currentTime += result.actualDurationSeconds + pauseBetweenSegments;
    }

    return timeline;
  }

  /**
   * Calculate the total duration from a voice timeline
   */
  calculateTotalDuration(voiceTimeline: Map<string, VoiceSegmentTiming>): number {
    let maxEnd = 0;
    for (const timing of voiceTimeline.values()) {
      if (timing.endTime > maxEnd) {
        maxEnd = timing.endTime;
      }
    }
    return maxEnd;
  }

  /**
   * Recalculate SFX and music timings based on actual TTS durations
   */
  syncTimings(script: StoryScript, ttsResults: TTSSegmentResult[], options: TimelineSyncOptions = {}): SyncedStoryScript {
    const pauseBetweenSegments = options.pauseBetweenSegments ?? DEFAULT_PAUSE_BETWEEN_SEGMENTS;
    const preserveRelative = options.preserveRelativePositioning ?? true;

    // Build voice timeline with actual TTS durations
    const voiceTimeline = this.buildVoiceTimeline(ttsResults, pauseBetweenSegments);
    const actualTotalDuration = this.calculateTotalDuration(voiceTimeline);
    const originalTotalDuration = script.metadata.actualDuration ?? this.getOriginalTotalDuration(script);

    // Calculate drift
    const driftPercentage = originalTotalDuration > 0 ? Math.round(((actualTotalDuration - originalTotalDuration) / originalTotalDuration) * 100) : 0;

    this.logger?.info('Syncing timeline', {
      originalDuration: originalTotalDuration,
      actualDuration: actualTotalDuration,
      driftPercentage,
      segmentCount: ttsResults.length
    });

    // Process each track
    const syncedTracks = script.tracks.map((track) => {
      if (track.type === 'voice') {
        // Update voice segments with actual durations
        return {
          ...track,
          segments: track.segments.map((segment) => {
            const timing = voiceTimeline.get(segment.id);
            if (timing) {
              return {
                ...segment,
                startTime: timing.startTime,
                duration: timing.duration
              };
            }
            return segment;
          })
        };
      }

      if (track.type === 'sfx' || track.type === 'music') {
        // Recalculate non-voice segment timings
        return {
          ...track,
          segments: track.segments.map((segment) =>
            this.syncNonVoiceSegment(segment, script, voiceTimeline, originalTotalDuration, actualTotalDuration, preserveRelative)
          )
        };
      }

      return track;
    });

    return {
      ...script,
      tracks: syncedTracks,
      metadata: {
        ...script.metadata,
        actualDuration: actualTotalDuration
      },
      syncMetadata: {
        originalTotalDuration,
        actualTotalDuration,
        driftPercentage,
        syncedAt: new Date().toISOString(),
        pauseBetweenSegments
      }
    };
  }

  /**
   * Get original total duration from script
   */
  private getOriginalTotalDuration(script: StoryScript): number {
    const voiceTrack = script.tracks.find((t) => t.type === 'voice');
    if (!voiceTrack || voiceTrack.segments.length === 0) {
      return 0;
    }

    const lastSegment = voiceTrack.segments[voiceTrack.segments.length - 1];
    return lastSegment ? lastSegment.startTime + lastSegment.duration : 0;
  }

  /**
   * Sync a non-voice segment (SFX or music) by finding its anchor voice segment
   */
  private syncNonVoiceSegment(
    segment: TimelineSegment,
    script: StoryScript,
    voiceTimeline: Map<string, VoiceSegmentTiming>,
    originalTotalDuration: number,
    actualTotalDuration: number,
    preserveRelative: boolean
  ): TimelineSegment {
    const voiceTrack = script.tracks.find((t) => t.type === 'voice');
    if (!voiceTrack) {
      // No voice track - use simple proportional scaling
      const scaleFactor = originalTotalDuration > 0 ? actualTotalDuration / originalTotalDuration : 1;
      return {
        ...segment,
        startTime: segment.startTime * scaleFactor
      };
    }

    const originalStartTime = segment.startTime;

    if (preserveRelative) {
      // Find the voice segment that contains or is closest to this startTime
      const anchorResult = this.findAnchorVoiceSegment(originalStartTime, voiceTrack.segments);

      if (anchorResult) {
        const { anchorSegment, offsetInAnchor } = anchorResult;
        const anchorTiming = voiceTimeline.get(anchorSegment.id);

        if (anchorTiming) {
          // Calculate proportional offset within the anchor segment
          const originalAnchorDuration = anchorSegment.duration;
          const actualAnchorDuration = anchorTiming.duration;
          const offsetRatio = originalAnchorDuration > 0 ? offsetInAnchor / originalAnchorDuration : 0;

          const newStartTime = anchorTiming.startTime + offsetRatio * actualAnchorDuration;

          this.logger?.debug('Synced non-voice segment', {
            segmentId: segment.id,
            originalStart: originalStartTime,
            newStart: newStartTime,
            anchorId: anchorSegment.id
          });

          return {
            ...segment,
            startTime: Math.max(0, newStartTime)
          };
        }
      }
    }

    // Fallback: simple proportional scaling
    const scaleFactor = originalTotalDuration > 0 ? actualTotalDuration / originalTotalDuration : 1;

    return {
      ...segment,
      startTime: Math.max(0, originalStartTime * scaleFactor)
    };
  }

  /**
   * Find the voice segment that should anchor this non-voice segment
   */
  private findAnchorVoiceSegment(targetTime: number, voiceSegments: TimelineSegment[]): { anchorSegment: TimelineSegment; offsetInAnchor: number } | null {
    // First, try to find a segment that contains this time
    for (const voiceSeg of voiceSegments) {
      const segEnd = voiceSeg.startTime + voiceSeg.duration;
      if (targetTime >= voiceSeg.startTime && targetTime <= segEnd) {
        return {
          anchorSegment: voiceSeg,
          offsetInAnchor: targetTime - voiceSeg.startTime
        };
      }
    }

    // If not contained, find the closest segment
    let closestSegment: TimelineSegment | null = null;
    let minDistance = Infinity;

    for (const voiceSeg of voiceSegments) {
      const segMidpoint = voiceSeg.startTime + voiceSeg.duration / 2;
      const distance = Math.abs(segMidpoint - targetTime);

      if (distance < minDistance) {
        minDistance = distance;
        closestSegment = voiceSeg;
      }
    }

    if (closestSegment) {
      // If target is before the segment, offset is 0
      // If target is after, offset is segment duration
      const offset =
        targetTime < closestSegment.startTime
          ? 0
          : targetTime > closestSegment.startTime + closestSegment.duration
            ? closestSegment.duration
            : targetTime - closestSegment.startTime;

      return {
        anchorSegment: closestSegment,
        offsetInAnchor: offset
      };
    }

    return null;
  }
}
