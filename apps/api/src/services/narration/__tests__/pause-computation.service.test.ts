/**
 * Pause Computation Service Tests
 *
 * Tests for contextual pause computation between voice segments.
 */

import { describe, expect, test } from 'bun:test';

import { PauseComputationService } from '../pause-computation.service';
import { PAUSE_CONTEXT_TYPE, type VoiceSegmentInfo } from '../pause-computation.service.types';

describe('PauseComputationService', () => {
  const service = new PauseComputationService();

  describe('computePause', () => {
    describe('punctuation-based pauses', () => {
      test('returns longer pause after question mark', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'Where did the dragon go?'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'narration',
            text: 'Nobody knew the answer.'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.QUESTION);
        expect(result.durationSeconds).toBe(0.8);
        expect(result.isExplicit).toBe(false);
      });

      test('returns suspense pause after ellipsis', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'And then, suddenly...'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: null });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.SUSPENSE);
        expect(result.durationSeconds).toBe(1.5);
      });

      test('handles unicode ellipsis character', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'The door creaked open\u2026'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: null });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.SUSPENSE);
        expect(result.durationSeconds).toBe(1.5);
      });

      test('returns exclamation pause after exclamation mark', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'dialogue',
            text: 'Watch out!',
            characterName: 'Hero'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: null });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.EXCLAMATION);
        expect(result.durationSeconds).toBe(0.4);
      });
    });

    describe('character change pauses', () => {
      test('returns character change pause when speaker changes with longer dialogue', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'dialogue',
            text: 'Hello there my friend, it is so wonderful to finally meet you after all these years.',
            characterName: 'Alice'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'dialogue',
            text: 'Indeed, the pleasure is all mine. I have been looking forward to this moment.',
            characterName: 'Bob'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.CHARACTER_CHANGE);
        expect(result.durationSeconds).toBe(0.6);
      });

      test('returns default pause when same character continues', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'dialogue',
            text: 'Well, you see.',
            characterName: 'Alice'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'dialogue',
            text: 'It all started long ago.',
            characterName: 'Alice'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.DEFAULT);
        expect(result.durationSeconds).toBe(0.3);
      });
    });

    describe('rapid dialogue detection', () => {
      test('returns rapid dialogue pause for short exchanges', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'dialogue',
            text: 'Ready?',
            characterName: 'Alice'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'dialogue',
            text: 'Ready!',
            characterName: 'Bob'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        // Should be rapid dialogue since both lines are short
        // But question takes precedence over rapid dialogue
        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.QUESTION);
      });

      test('returns rapid dialogue for short non-question exchanges', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'dialogue',
            text: 'Yes.',
            characterName: 'Alice'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'dialogue',
            text: 'Good.',
            characterName: 'Bob'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.RAPID_DIALOGUE);
        expect(result.durationSeconds).toBe(0.15);
      });
    });

    describe('scene transition detection', () => {
      test('returns scene change pause when explicitly marked', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'They finally reached the castle.'
          }
        };

        const result = service.computePause({
          currentSegment: current,
          nextSegment: null,
          isSceneTransition: true
        });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.SCENE_CHANGE);
        expect(result.durationSeconds).toBe(2.0);
        expect(result.isExplicit).toBe(true);
      });

      test('detects scene transition from keywords', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'The day was finally over.'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'narration',
            text: 'Meanwhile, in the forest, the animals were preparing for winter.'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.SCENE_CHANGE);
        expect(result.durationSeconds).toBe(2.0);
      });

      test('detects French scene transition keywords', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'Il ferma les yeux.'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'narration',
            text: 'Pendant ce temps, dans la foret...'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.SCENE_CHANGE);
      });
    });

    describe('default pause', () => {
      test('returns default pause for regular narration', () => {
        const current: VoiceSegmentInfo = {
          id: 'seg-1',
          content: {
            type: 'narration',
            text: 'The sun was setting over the mountains.'
          }
        };
        const next: VoiceSegmentInfo = {
          id: 'seg-2',
          content: {
            type: 'narration',
            text: 'Birds flew across the orange sky.'
          }
        };

        const result = service.computePause({ currentSegment: current, nextSegment: next });

        expect(result.contextType).toBe(PAUSE_CONTEXT_TYPE.DEFAULT);
        expect(result.durationSeconds).toBe(0.3);
      });
    });
  });

  describe('computePausesForSegments', () => {
    test('computes pauses for a list of segments', () => {
      const segments: VoiceSegmentInfo[] = [
        { id: 'seg-1', content: { type: 'narration', text: 'Once upon a time.' } },
        { id: 'seg-2', content: { type: 'narration', text: 'There lived a princess...' } },
        { id: 'seg-3', content: { type: 'dialogue', text: 'Who are you?', characterName: 'Princess' } }
      ];

      const pauses = service.computePausesForSegments(segments);

      expect(pauses.size).toBe(3);
      expect(pauses.get(0)).toBe(0.3); // Default after regular narration
      expect(pauses.get(1)).toBe(1.5); // Suspense after ellipsis
      expect(pauses.get(2)).toBe(0.8); // Question
    });

    test('handles empty segment list', () => {
      const pauses = service.computePausesForSegments([]);
      expect(pauses.size).toBe(0);
    });
  });

  describe('custom configuration', () => {
    test('uses custom pause durations', () => {
      const customService = new PauseComputationService({
        questionPauseSeconds: 1.2,
        defaultPauseSeconds: 0.5
      });

      const current: VoiceSegmentInfo = {
        id: 'seg-1',
        content: { type: 'narration', text: 'What happened?' }
      };

      const result = customService.computePause({ currentSegment: current, nextSegment: null });

      expect(result.durationSeconds).toBe(1.2);
    });
  });
});
