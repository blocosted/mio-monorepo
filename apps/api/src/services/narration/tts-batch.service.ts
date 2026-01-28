/**
 * TTS Batch Service
 *
 * Batches short text segments together to meet ElevenLabs minimum character
 * recommendation (250 chars) for optimal TTS quality.
 *
 * Short prompts (<250 chars) can cause:
 * - Unexpected pauses
 * - Cut-off words
 * - Reduced expressiveness
 *
 * This service combines consecutive segments while preserving:
 * - Character/speaker boundaries
 * - Emotion transitions
 * - Segment order for later splitting
 *
 * @see https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */

import 'reflect-metadata';

import { injectable } from 'inversify';

import type { Emotion, SpeechAct } from '@mio/shared/types';

import { AbstractService } from '../service.abstract';

/**
 * Minimum character count for optimal TTS quality
 * ElevenLabs recommends at least 250 characters for best results
 */
export const MIN_TTS_CHARACTERS = 250;

/**
 * Maximum characters to batch together
 * Prevents overly long batches that could exceed API limits
 */
export const MAX_BATCH_CHARACTERS = 1500;

/**
 * Separator used to join segments in a batch
 * Using a period and space to create natural pause
 */
export const BATCH_SEPARATOR = '. ';

/**
 * Input segment for batching
 */
export interface TTSSegmentInput {
  /** Unique segment identifier */
  id: string;
  /** Text content to be spoken */
  text: string;
  /** Voice ID for this segment */
  voiceId: string;
  /** Character name (for grouping) */
  characterName?: string;
  /** Emotion for this segment */
  emotion?: Emotion;
  /** Speech act modifier */
  speechAct?: SpeechAct;
}

/**
 * Batched segment ready for TTS generation
 */
export interface TTSBatchedSegment {
  /** Original segment IDs in this batch (ordered) */
  segmentIds: string[];
  /** Combined text for TTS */
  text: string;
  /** Voice ID (same for all segments in batch) */
  voiceId: string;
  /** Character name (same for all segments in batch) */
  characterName?: string;
  /** Dominant emotion for the batch */
  emotion?: Emotion;
  /** Speech act modifier */
  speechAct?: SpeechAct;
  /** Character offsets for splitting the result back */
  splitOffsets: number[];
  /** Whether this batch was created from multiple segments */
  isBatched: boolean;
}

/**
 * Result of splitting a batched audio back to segments
 */
export interface TTSSplitResult {
  /** Segment ID */
  segmentId: string;
  /** Estimated duration for this segment in seconds */
  durationSeconds: number;
  /** Start offset in the combined audio (seconds) */
  startOffsetSeconds: number;
}

/**
 * TTS Batch Service
 *
 * Combines short segments for optimal TTS quality while preserving
 * segment boundaries for post-processing.
 */
@injectable()
export class TTSBatchService extends AbstractService {
  /**
   * Batch segments that share the same voice and character
   *
   * Rules:
   * 1. Only batch segments with same voiceId and characterName
   * 2. Stop batching when emotion changes significantly
   * 3. Respect max batch size limit
   * 4. Single long segments pass through unchanged
   */
  batchSegments(segments: TTSSegmentInput[]): TTSBatchedSegment[] {
    if (segments.length === 0) {
      return [];
    }

    const batches: TTSBatchedSegment[] = [];
    let currentBatch: TTSSegmentInput[] = [];
    let currentLength = 0;

    for (const segment of segments) {
      const shouldStartNewBatch = this.shouldStartNewBatch(
        currentBatch,
        segment,
        currentLength
      );

      if (shouldStartNewBatch && currentBatch.length > 0) {
        // Finalize current batch
        batches.push(this.createBatch(currentBatch));
        currentBatch = [];
        currentLength = 0;
      }

      currentBatch.push(segment);
      currentLength += segment.text.length + BATCH_SEPARATOR.length;
    }

    // Finalize last batch
    if (currentBatch.length > 0) {
      batches.push(this.createBatch(currentBatch));
    }

    this.logger.debug('Segments batched', {
      inputCount: segments.length,
      outputCount: batches.length,
      batchedCount: batches.filter((b) => b.isBatched).length
    });

    return batches;
  }

  /**
   * Determine if a new batch should start for this segment
   */
  private shouldStartNewBatch(
    currentBatch: TTSSegmentInput[],
    newSegment: TTSSegmentInput,
    currentLength: number
  ): boolean {
    // No current batch - can add
    if (currentBatch.length === 0) {
      return false;
    }

    const lastSegment = currentBatch[currentBatch.length - 1];
    if (!lastSegment) {
      return false;
    }

    // Different voice ID - must start new batch
    if (lastSegment.voiceId !== newSegment.voiceId) {
      return true;
    }

    // Different character - must start new batch
    if (lastSegment.characterName !== newSegment.characterName) {
      return true;
    }

    // Different speech act - start new batch
    if (lastSegment.speechAct !== newSegment.speechAct) {
      return true;
    }

    // Max batch size exceeded
    const newLength = currentLength + newSegment.text.length;
    if (newLength > MAX_BATCH_CHARACTERS) {
      return true;
    }

    // Current batch already meets minimum and new segment has different emotion
    if (
      currentLength >= MIN_TTS_CHARACTERS &&
      lastSegment.emotion !== newSegment.emotion
    ) {
      return true;
    }

    return false;
  }

  /**
   * Create a batched segment from multiple inputs
   */
  private createBatch(segments: TTSSegmentInput[]): TTSBatchedSegment {
    const first = segments[0];
    if (!first) {
      throw new Error('Cannot create batch from empty segments array');
    }

    // Single segment - pass through
    if (segments.length === 1) {
      return {
        segmentIds: [first.id],
        text: first.text,
        voiceId: first.voiceId,
        characterName: first.characterName,
        emotion: first.emotion,
        speechAct: first.speechAct,
        splitOffsets: [0],
        isBatched: false
      };
    }

    // Multiple segments - combine
    const texts: string[] = [];
    const splitOffsets: number[] = [];
    let offset = 0;

    for (const segment of segments) {
      splitOffsets.push(offset);
      texts.push(segment.text);
      offset += segment.text.length + BATCH_SEPARATOR.length;
    }

    // Use first segment's emotion as dominant (could be improved with analysis)
    return {
      segmentIds: segments.map((s) => s.id),
      text: texts.join(BATCH_SEPARATOR),
      voiceId: first.voiceId,
      characterName: first.characterName,
      emotion: first.emotion,
      speechAct: first.speechAct,
      splitOffsets,
      isBatched: true
    };
  }

  /**
   * Estimate duration splits for batched segments
   *
   * Uses character count proportional allocation when actual
   * word-level timing isn't available.
   *
   * @param batch - The batched segment
   * @param totalDurationSeconds - Total duration from TTS
   * @returns Duration estimates for each original segment
   */
  estimateDurationSplits(
    batch: TTSBatchedSegment,
    totalDurationSeconds: number
  ): TTSSplitResult[] {
    const results: TTSSplitResult[] = [];

    if (!batch.isBatched) {
      // Single segment - all duration goes to it
      const segmentId = batch.segmentIds[0];
      if (segmentId) {
        return [
          {
            segmentId,
            durationSeconds: totalDurationSeconds,
            startOffsetSeconds: 0
          }
        ];
      }
      return [];
    }

    // Calculate character lengths for each segment
    const totalChars = batch.text.length;
    let currentTimeOffset = 0;

    for (let i = 0; i < batch.segmentIds.length; i++) {
      const segmentId = batch.segmentIds[i];
      if (!segmentId) continue;

      // Get segment length (from offset to next offset or end)
      const startOffset = batch.splitOffsets[i] ?? 0;
      const endOffset = batch.splitOffsets[i + 1] ?? totalChars;
      const segmentLength = endOffset - startOffset;

      // Proportional duration
      const proportion = segmentLength / totalChars;
      const segmentDuration = totalDurationSeconds * proportion;

      results.push({
        segmentId,
        durationSeconds: segmentDuration,
        startOffsetSeconds: currentTimeOffset
      });

      currentTimeOffset += segmentDuration;
    }

    return results;
  }

  /**
   * Check if a segment is below the recommended minimum length
   */
  isSegmentShort(text: string): boolean {
    return text.length < MIN_TTS_CHARACTERS;
  }

  /**
   * Get statistics about batching results
   */
  getBatchStats(batches: TTSBatchedSegment[]): {
    totalBatches: number;
    singleSegmentBatches: number;
    multiSegmentBatches: number;
    averageSegmentsPerBatch: number;
    shortSegmentsSaved: number;
  } {
    const multiSegment = batches.filter((b) => b.isBatched);
    const totalSegments = batches.reduce((sum, b) => sum + b.segmentIds.length, 0);
    const shortSegmentsSaved = multiSegment.reduce(
      (sum, b) => sum + b.segmentIds.length - 1,
      0
    );

    return {
      totalBatches: batches.length,
      singleSegmentBatches: batches.length - multiSegment.length,
      multiSegmentBatches: multiSegment.length,
      averageSegmentsPerBatch: totalSegments / Math.max(1, batches.length),
      shortSegmentsSaved
    };
  }
}
