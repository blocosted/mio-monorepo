/**
 * TTS Batch Service Tests
 *
 * Tests for batching short TTS segments together for optimal quality.
 */

import { describe, expect, it, beforeEach } from 'bun:test';

import {
  TTSBatchService,
  MIN_TTS_CHARACTERS,
  MAX_BATCH_CHARACTERS,
  BATCH_SEPARATOR
} from '../tts-batch.service';
import type { TTSSegmentInput } from '../tts-batch.service';

describe('TTSBatchService', () => {
  let service: TTSBatchService;

  beforeEach(() => {
    service = new TTSBatchService();
  });

  describe('batchSegments', () => {
    it('should pass through single long segment unchanged', () => {
      const longText = 'A'.repeat(MIN_TTS_CHARACTERS + 100);
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: longText,
          voiceId: 'voice-1',
          characterName: 'Narrator'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]?.isBatched).toBe(false);
      expect(result[0]?.segmentIds).toEqual(['seg-1']);
      expect(result[0]?.text).toBe(longText);
    });

    it('should batch multiple short segments from same character', () => {
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: 'Hello there!',
          voiceId: 'voice-1',
          characterName: 'Alice'
        },
        {
          id: 'seg-2',
          text: 'How are you?',
          voiceId: 'voice-1',
          characterName: 'Alice'
        },
        {
          id: 'seg-3',
          text: 'Nice weather today.',
          voiceId: 'voice-1',
          characterName: 'Alice'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]?.isBatched).toBe(true);
      expect(result[0]?.segmentIds).toEqual(['seg-1', 'seg-2', 'seg-3']);
      expect(result[0]?.text).toBe(`Hello there!${BATCH_SEPARATOR}How are you?${BATCH_SEPARATOR}Nice weather today.`);
    });

    it('should start new batch when character changes', () => {
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: 'Hello there!',
          voiceId: 'voice-1',
          characterName: 'Alice'
        },
        {
          id: 'seg-2',
          text: 'Hi Alice!',
          voiceId: 'voice-2',
          characterName: 'Bob'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(2);
      expect(result[0]?.characterName).toBe('Alice');
      expect(result[1]?.characterName).toBe('Bob');
    });

    it('should start new batch when voice ID changes', () => {
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: 'First voice segment.',
          voiceId: 'voice-1',
          characterName: 'Narrator'
        },
        {
          id: 'seg-2',
          text: 'Second voice segment.',
          voiceId: 'voice-2',
          characterName: 'Narrator'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(2);
      expect(result[0]?.voiceId).toBe('voice-1');
      expect(result[1]?.voiceId).toBe('voice-2');
    });

    it('should start new batch when emotion changes and min length met', () => {
      const longText = 'A'.repeat(MIN_TTS_CHARACTERS + 10);
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: longText,
          voiceId: 'voice-1',
          emotion: 'happy'
        },
        {
          id: 'seg-2',
          text: 'Short sad text.',
          voiceId: 'voice-1',
          emotion: 'sad'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(2);
      expect(result[0]?.emotion).toBe('happy');
      expect(result[1]?.emotion).toBe('sad');
    });

    it('should keep same emotion segments together even if short', () => {
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: 'Happy text one!',
          voiceId: 'voice-1',
          emotion: 'happy'
        },
        {
          id: 'seg-2',
          text: 'Happy text two!',
          voiceId: 'voice-1',
          emotion: 'happy'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]?.isBatched).toBe(true);
    });

    it('should respect max batch size', () => {
      const mediumText = 'A'.repeat(MAX_BATCH_CHARACTERS / 2);
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: mediumText,
          voiceId: 'voice-1'
        },
        {
          id: 'seg-2',
          text: mediumText,
          voiceId: 'voice-1'
        },
        {
          id: 'seg-3',
          text: mediumText,
          voiceId: 'voice-1'
        }
      ];

      const result = service.batchSegments(segments);

      // Should create multiple batches since combined would exceed max
      expect(result.length).toBeGreaterThan(1);
    });

    it('should start new batch when speech act changes', () => {
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: 'Normal speech here.',
          voiceId: 'voice-1',
          speechAct: 'normal'
        },
        {
          id: 'seg-2',
          text: 'Whispering now...',
          voiceId: 'voice-1',
          speechAct: 'whisper'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(2);
      expect(result[0]?.speechAct).toBe('normal');
      expect(result[1]?.speechAct).toBe('whisper');
    });

    it('should return empty array for empty input', () => {
      const result = service.batchSegments([]);
      expect(result).toHaveLength(0);
    });

    it('should track split offsets correctly', () => {
      const segments: TTSSegmentInput[] = [
        {
          id: 'seg-1',
          text: 'First segment.',
          voiceId: 'voice-1'
        },
        {
          id: 'seg-2',
          text: 'Second segment.',
          voiceId: 'voice-1'
        }
      ];

      const result = service.batchSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]?.splitOffsets).toEqual([0, 14 + BATCH_SEPARATOR.length]); // "First segment." = 14 chars
    });
  });

  describe('estimateDurationSplits', () => {
    it('should allocate all duration to single segment batch', () => {
      const batch = {
        segmentIds: ['seg-1'],
        text: 'Single segment text.',
        voiceId: 'voice-1',
        splitOffsets: [0],
        isBatched: false
      };

      const result = service.estimateDurationSplits(batch, 5.0);

      expect(result).toHaveLength(1);
      expect(result[0]?.segmentId).toBe('seg-1');
      expect(result[0]?.durationSeconds).toBe(5.0);
      expect(result[0]?.startOffsetSeconds).toBe(0);
    });

    it('should proportionally split duration for multi-segment batch', () => {
      // "Short." = 6 chars, "Longer segment here." = 20 chars
      // Total = 28 chars (including separator)
      const batch = {
        segmentIds: ['seg-1', 'seg-2'],
        text: `Short.${BATCH_SEPARATOR}Longer segment here.`,
        voiceId: 'voice-1',
        splitOffsets: [0, 6 + BATCH_SEPARATOR.length],
        isBatched: true
      };

      const totalDuration = 10.0;
      const result = service.estimateDurationSplits(batch, totalDuration);

      expect(result).toHaveLength(2);

      // First segment proportion: (6 + 2) / 28 = ~28.6%
      // Second segment proportion: ~71.4%
      const firstDuration = result[0]?.durationSeconds ?? 0;
      const secondDuration = result[1]?.durationSeconds ?? 0;

      expect(firstDuration).toBeGreaterThan(0);
      expect(secondDuration).toBeGreaterThan(0);
      expect(firstDuration + secondDuration).toBeCloseTo(totalDuration, 2);

      // Second segment should have more duration (more chars)
      expect(secondDuration).toBeGreaterThan(firstDuration);
    });

    it('should track start offsets correctly', () => {
      const batch = {
        segmentIds: ['seg-1', 'seg-2', 'seg-3'],
        text: 'AAA. BBB. CCC.',
        voiceId: 'voice-1',
        splitOffsets: [0, 5, 10],
        isBatched: true
      };

      const result = service.estimateDurationSplits(batch, 9.0);

      expect(result).toHaveLength(3);
      expect(result[0]?.startOffsetSeconds).toBe(0);
      expect(result[1]?.startOffsetSeconds).toBeGreaterThan(0);
      expect(result[2]?.startOffsetSeconds).toBeGreaterThan(result[1]?.startOffsetSeconds ?? 0);
    });
  });

  describe('isSegmentShort', () => {
    it('should return true for segments below minimum', () => {
      const shortText = 'A'.repeat(MIN_TTS_CHARACTERS - 1);
      expect(service.isSegmentShort(shortText)).toBe(true);
    });

    it('should return false for segments at or above minimum', () => {
      const longText = 'A'.repeat(MIN_TTS_CHARACTERS);
      expect(service.isSegmentShort(longText)).toBe(false);
    });
  });

  describe('getBatchStats', () => {
    it('should calculate correct statistics', () => {
      const batches = [
        {
          segmentIds: ['seg-1'],
          text: 'Single',
          voiceId: 'v1',
          splitOffsets: [0],
          isBatched: false
        },
        {
          segmentIds: ['seg-2', 'seg-3', 'seg-4'],
          text: 'Multi',
          voiceId: 'v1',
          splitOffsets: [0, 5, 10],
          isBatched: true
        }
      ];

      const stats = service.getBatchStats(batches);

      expect(stats.totalBatches).toBe(2);
      expect(stats.singleSegmentBatches).toBe(1);
      expect(stats.multiSegmentBatches).toBe(1);
      expect(stats.averageSegmentsPerBatch).toBe(2); // 4 segments / 2 batches
      expect(stats.shortSegmentsSaved).toBe(2); // 3 segments in one batch = 2 API calls saved
    });
  });
});
