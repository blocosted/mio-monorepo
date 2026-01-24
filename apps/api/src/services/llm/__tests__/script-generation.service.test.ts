/**
 * Script Generation Service Tests
 *
 * Tests for duration calculation, validation, and script generation.
 */

import type { ScriptGenerationConstraints, StoryScript } from '@mio/shared/types';
import { Emotion, VocabularyLevel } from '@mio/shared/types';

import type { ScriptValidationResult } from '../index';
import { ScriptGenerationService } from '../script-generation.service';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

// Mock logger
const _mockLogger = {
  info: mock(() => undefined),
  warn: mock(() => undefined),
  error: mock(() => undefined),
  debug: mock(() => undefined)
};

describe('ScriptGenerationService', () => {
  let service: ScriptGenerationService;

  beforeEach(() => {
    service = new ScriptGenerationService();
  });

  describe('calculateDurationBudget', () => {
    it('calculates correct budget for 5 minute story', () => {
      const budget = service.calculateDurationBudget(5);

      expect(budget.totalSeconds).toBe(300);
      expect(budget.voiceSeconds).toBe(216); // 72% of 300
      expect(budget.sfxSeconds).toBe(36); // 12% of 300
      expect(budget.musicSeconds).toBe(18); // 6% of 300
      expect(budget.pauseSeconds).toBe(30); // 10% of 300
      expect(budget.targetWordCount).toBe(432); // 216 * 2.0 (120 WPM = 2 WPS)
    });

    it('calculates correct budget for 10 minute story', () => {
      const budget = service.calculateDurationBudget(10);

      expect(budget.totalSeconds).toBe(600);
      expect(budget.voiceSeconds).toBe(432);
      expect(budget.targetWordCount).toBe(864); // 432 * 2.0 (120 WPM = 2 WPS)
    });

    it('calculates correct budget for 3 minute story', () => {
      const budget = service.calculateDurationBudget(3);

      expect(budget.totalSeconds).toBe(180);
      // 180 * 0.72 = 129.6 → 130 voice seconds
      // 130 * 2.0 = 260 words
      expect(budget.voiceSeconds).toBe(130);
      expect(budget.targetWordCount).toBe(260);
    });
  });

  describe('calculateNarrativeStructure', () => {
    it('distributes words across 3 acts correctly', () => {
      const structure = service.calculateNarrativeStructure(500);

      expect(structure.act1.wordBudget).toBe(100); // 20%
      expect(structure.act1.percentage).toBe(20);
      expect(structure.act2.wordBudget).toBe(300); // 60%
      expect(structure.act2.percentage).toBe(60);
      expect(structure.act3.wordBudget).toBe(100); // 20%
      expect(structure.act3.percentage).toBe(20);
    });

    it('has correct descriptions for each act', () => {
      const structure = service.calculateNarrativeStructure(100);

      expect(structure.act1.description).toContain('characters');
      expect(structure.act2.description).toContain('conflict');
      expect(structure.act3.description).toContain('resolution');
    });
  });

  describe('getSegmentRequirements', () => {
    it('returns short requirements for ≤5 min', () => {
      const req = service.getSegmentRequirements(5);

      expect(req.minNarration).toBe(5);
      expect(req.minDialogue).toBe(4);
      expect(req.minSfx).toBe(3);
    });

    it('returns medium requirements for 5-10 min', () => {
      const req = service.getSegmentRequirements(7);

      expect(req.minNarration).toBe(10);
      expect(req.minDialogue).toBe(8);
      expect(req.minSfx).toBe(5);
    });

    it('returns long requirements for >10 min', () => {
      const req = service.getSegmentRequirements(15);

      expect(req.minNarration).toBe(18);
      expect(req.minDialogue).toBe(14);
      expect(req.minSfx).toBe(8);
    });
  });

  describe('buildConstraints', () => {
    it('combines all constraint components for OpenAI (default)', () => {
      const constraints = service.buildConstraints(5);

      expect(constraints.durationBudget).toBeDefined();
      expect(constraints.narrativeStructure).toBeDefined();
      expect(constraints.minNarrationSegments).toBe(5);
      expect(constraints.minDialogueSegments).toBe(4);
      expect(constraints.minSfxSegments).toBe(3);
      expect(constraints.maxConsecutiveSameType).toBe(4);
      expect(constraints.wordCountInflation).toBe(0.8); // OpenAI needs high inflation
    });

    it('uses no inflation for Anthropic', () => {
      const constraints = service.buildConstraints(5, 'anthropic');

      expect(constraints.wordCountInflation).toBe(0.0); // Claude overshoots, no inflation needed
    });
  });

  describe('countWords', () => {
    it('counts words in simple text', () => {
      expect(service.countWords('Hello world')).toBe(2);
      expect(service.countWords('One two three four five')).toBe(5);
    });

    it('ignores audio tags in word count', () => {
      expect(service.countWords('[laughs] Hello world [excited]')).toBe(2);
      expect(service.countWords('[whispering][nervous] I am scared [gasps]')).toBe(3);
    });

    it('handles French text', () => {
      expect(service.countWords("C'est une belle journée")).toBe(4);
      expect(service.countWords("L'enfant court dans la forêt")).toBe(5);
    });

    it('handles empty and whitespace', () => {
      expect(service.countWords('')).toBe(0);
      expect(service.countWords('   ')).toBe(0);
      expect(service.countWords('  word  ')).toBe(1);
    });
  });

  describe('calculateEstimatedDuration', () => {
    it('calculates duration from word count', () => {
      // 150 words at 2.0 WPS = 75 seconds of voice
      const duration = service.calculateEstimatedDuration(150, 0);
      // 150/2.0 = 75s voice + 10% pause (7.5) = 82.5 → 83s
      expect(duration).toBe(83);
    });

    it('adds SFX time', () => {
      // 3s per SFX
      const duration = service.calculateEstimatedDuration(0, 5);
      expect(duration).toBe(15);
    });

    it('combines voice, SFX, and pauses', () => {
      // 300 words at 2.0 WPS = 150s voice + 10% pause (15s) + 3 SFX (9s)
      const duration = service.calculateEstimatedDuration(300, 3);
      expect(duration).toBe(174); // 150 + 9 + 15
    });
  });

  describe('validateScript', () => {
    // Generate text with exact word count
    const generateText = (wordCount: number): string => {
      const words = [];
      for (let i = 0; i < wordCount; i++) {
        words.push(`word${i}`);
      }
      return words.join(' ');
    };

    const createValidScript = (): StoryScript => ({
      version: 2,
      metadata: {
        title: 'Test Story',
        targetDuration: 300,
        actualDuration: 300,
        vocabularyLevel: VocabularyLevel.Medium,
        language: 'fr',
        wordCount: 432,
        voiceSegmentCount: 9,
        sfxSegmentCount: 3
      },
      characters: [{ characterName: 'Hero', voiceDescription: 'Young and brave' }],
      tracks: [
        {
          id: 'voice-main',
          type: 'voice',
          name: 'Voice Track',
          segments: [
            // 5 narration segments with 48 words each = 240 words
            ...Array.from({ length: 5 }, (_, i) => ({
              id: `narr-${i}`,
              trackId: 'voice-main',
              startTime: i * 24,
              duration: 24,
              content: {
                type: 'narration' as const,
                text: generateText(48),
                emotion: Emotion.Neutral
              }
            })),
            // 4 dialogue segments with 48 words each = 192 words
            // Total: 432 words (matches target for 5 min at 2.0 WPS)
            ...Array.from({ length: 4 }, (_, i) => ({
              id: `dial-${i}`,
              trackId: 'voice-main',
              startTime: 120 + i * 24,
              duration: 24,
              content: {
                type: 'dialogue' as const,
                text: generateText(48),
                characterName: 'Hero',
                emotion: Emotion.Happy
              }
            }))
          ]
        },
        {
          id: 'sfx-main',
          type: 'sfx',
          name: 'SFX Track',
          segments: Array.from({ length: 3 }, (_, i) => ({
            id: `sfx-${i}`,
            trackId: 'sfx-main',
            startTime: i * 80,
            duration: 3,
            content: {
              type: 'sfx' as const,
              description: 'Test sound effect'
            }
          }))
        },
        {
          id: 'music-main',
          type: 'music',
          name: 'Music Track',
          segments: [
            { id: 'music-1', trackId: 'music-main', startTime: 0, duration: 100, content: { type: 'music' as const, mood: 'mysterious' } },
            { id: 'music-2', trackId: 'music-main', startTime: 100, duration: 100, content: { type: 'music' as const, mood: 'adventurous' } },
            { id: 'music-3', trackId: 'music-main', startTime: 200, duration: 100, content: { type: 'music' as const, mood: 'calm' } }
          ]
        }
      ]
    });

    const createConstraints = (): ScriptGenerationConstraints => service.buildConstraints(5);

    it('validates a correct script', () => {
      const script = createValidScript();
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation when word count is too low', () => {
      const script = createValidScript();
      // Make text shorter
      for (const track of script.tracks) {
        if (track.type === 'voice') {
          for (const seg of track.segments) {
            if ('text' in seg.content) {
              seg.content.text = 'Short text.';
            }
          }
        }
      }
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Word count too low'))).toBe(true);
    });

    it('fails validation when not enough narration segments', () => {
      const script = createValidScript();
      // Remove narration segments
      const voiceTrack = script.tracks.find((t) => t.type === 'voice')!;
      voiceTrack.segments = voiceTrack.segments.filter((s) => (s.content as any).type !== 'narration');
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Not enough narration'))).toBe(true);
    });

    it('fails validation when not enough dialogue segments', () => {
      const script = createValidScript();
      // Remove dialogue segments
      const voiceTrack = script.tracks.find((t) => t.type === 'voice')!;
      voiceTrack.segments = voiceTrack.segments.filter((s) => (s.content as any).type !== 'dialogue');
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Not enough dialogue'))).toBe(true);
    });

    it('warns when few sound effects', () => {
      const script = createValidScript();
      // Remove SFX track
      script.tracks = script.tracks.filter((t) => t.type !== 'sfx');
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.warnings.some((w) => w.includes('sound effects'))).toBe(true);
    });

    it('warns when few music changes', () => {
      const script = createValidScript();
      // Remove music track
      script.tracks = script.tracks.filter((t) => t.type !== 'music');
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.warnings.some((w) => w.includes('music changes'))).toBe(true);
    });

    it('detects timeline overlaps', () => {
      const script = createValidScript();
      const voiceTrack = script.tracks.find((t) => t.type === 'voice')!;
      // Create overlap
      if (voiceTrack.segments.length >= 2) {
        voiceTrack.segments[1]!.startTime = 0; // Overlap with first segment
      }
      const constraints = createConstraints();

      const result = service.validateScript(script, constraints);

      expect(result.errors.some((e) => e.includes('Timeline overlap'))).toBe(true);
    });
  });

  describe('buildFeedbackFromValidation', () => {
    it('formats errors and warnings', () => {
      const validation: ScriptValidationResult = {
        isValid: false,
        wordCount: 200,
        estimatedDuration: 100,
        errors: ['Word count too low: 200 words'],
        warnings: ['Few sound effects']
      };

      const feedback = service.buildFeedbackFromValidation(validation);

      expect(feedback).toContain('ERRORS');
      expect(feedback).toContain('Word count too low');
      expect(feedback).toContain('WARNINGS');
      expect(feedback).toContain('sound effects');
      expect(feedback).toContain('Word count: 200');
    });
  });

  describe('parseScriptResponse', () => {
    it('parses valid JSON response', () => {
      const json = JSON.stringify({
        metadata: {
          title: 'Test',
          targetDuration: 300,
          actualDuration: 300,
          vocabularyLevel: 'medium',
          language: 'fr',
          wordCount: 500,
          voiceSegmentCount: 10,
          sfxSegmentCount: 5
        },
        characters: [{ characterName: 'Hero', voiceDescription: 'Brave' }],
        tracks: []
      });

      const script = service.parseScriptResponse(json);

      expect(script.version).toBe(2);
      expect(script.metadata.title).toBe('Test');
    });

    it('throws on invalid JSON', () => {
      expect(() => service.parseScriptResponse('not json')).toThrow();
    });

    it('throws on missing metadata', () => {
      const json = JSON.stringify({ tracks: [], characters: [] });
      expect(() => service.parseScriptResponse(json)).toThrow();
    });

    it('throws on missing tracks', () => {
      const json = JSON.stringify({ metadata: {}, characters: [] });
      expect(() => service.parseScriptResponse(json)).toThrow();
    });

    it('throws on missing characters', () => {
      const json = JSON.stringify({ metadata: {}, tracks: [] });
      expect(() => service.parseScriptResponse(json)).toThrow();
    });
  });
});
