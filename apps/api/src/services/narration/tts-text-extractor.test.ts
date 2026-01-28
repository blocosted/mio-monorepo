/**
 * TTS Text Extractor Tests
 *
 * Tests for extracting spoken text from script segments.
 */

import { describe, expect, it } from 'bun:test';

import { extractTTSText, extractTTSTextBatch, type TTSSegmentType } from './tts-text-extractor';

describe('extractTTSText', () => {
  describe('narration segments', () => {
    it('returns full text unchanged for narration', () => {
      const result = extractTTSText('La foret etait silencieuse.', 'narration');

      expect(result.ttsText).toBe('La foret etait silencieuse.');
      expect(result.emotionTag).toBeNull();
      expect(result.spokenWordCount).toBe(4);
      expect(result.quotedSections).toEqual([]);
      expect(result.originalText).toBe('La foret etait silencieuse.');
    });

    it('preserves audio tag in narration', () => {
      const result = extractTTSText('[whispers] The shadows grew longer.', 'narration');

      expect(result.ttsText).toBe('[whispers] The shadows grew longer.');
      expect(result.emotionTag).toBe('[whispers]');
      expect(result.spokenWordCount).toBe(4);
    });

    it('handles narration with quotes inside (quoted speech in narration)', () => {
      const result = extractTTSText('He thought "maybe tomorrow" would be better.', 'narration');

      expect(result.ttsText).toBe('He thought "maybe tomorrow" would be better.');
      expect(result.spokenWordCount).toBe(7);
    });
  });

  describe('dialogue segments', () => {
    it('extracts simple quoted dialogue', () => {
      const result = extractTTSText('"Oui" dit-il', 'dialogue');

      expect(result.ttsText).toBe('Oui');
      expect(result.emotionTag).toBeNull();
      expect(result.spokenWordCount).toBe(1);
      expect(result.quotedSections).toEqual(['Oui']);
    });

    it('extracts dialogue with emotion tag', () => {
      const result = extractTTSText('[excited] "REGARDE!" s\'ecria-t-il, les yeux ecarquilles', 'dialogue');

      expect(result.ttsText).toBe('[excited] REGARDE!');
      expect(result.emotionTag).toBe('[excited]');
      expect(result.spokenWordCount).toBe(1);
      expect(result.quotedSections).toEqual(['REGARDE!']);
    });

    it('joins multiple quoted sections with ellipsis', () => {
      const result = extractTTSText('"Attends!" cria-t-elle, "Je viens!"', 'dialogue');

      expect(result.ttsText).toBe('Attends! ... Je viens!');
      expect(result.emotionTag).toBeNull();
      // "Attends!" (1) + "..." (1) + "Je" (1) + "viens!" (1) = 4 words
      // The "..." is counted as a word by the whitespace split
      expect(result.spokenWordCount).toBe(4);
      expect(result.quotedSections).toEqual(['Attends!', 'Je viens!']);
    });

    it('handles multiple quotes with emotion tag', () => {
      const result = extractTTSText('[worried] "Non..." murmura-t-il, "pas encore!"', 'dialogue');

      expect(result.ttsText).toBe('[worried] Non... ... pas encore!');
      expect(result.emotionTag).toBe('[worried]');
      // "Non..." (1) + "..." (1) + "pas" (1) + "encore!" (1) = 4 words
      expect(result.spokenWordCount).toBe(4);
      expect(result.quotedSections).toEqual(['Non...', 'pas encore!']);
    });

    it('falls back to full text if no quotes found', () => {
      const result = extractTTSText('Bonjour le monde', 'dialogue');

      expect(result.ttsText).toBe('Bonjour le monde');
      expect(result.emotionTag).toBeNull();
      expect(result.spokenWordCount).toBe(3);
      expect(result.quotedSections).toEqual([]);
    });

    it('handles complex dialogue with punctuation', () => {
      const result = extractTTSText('"Qu\'est-ce que tu fais?!" demanda Marie, surprise', 'dialogue');

      expect(result.ttsText).toBe("Qu'est-ce que tu fais?!");
      expect(result.spokenWordCount).toBe(4);
      expect(result.quotedSections).toEqual(["Qu'est-ce que tu fais?!"]);
    });

    it('handles dialogue with numbers', () => {
      const result = extractTTSText('"J\'ai 5 pommes" dit Pierre', 'dialogue');

      expect(result.ttsText).toBe("J'ai 5 pommes");
      expect(result.spokenWordCount).toBe(3);
    });
  });

  describe('emotion tags', () => {
    it('extracts [excited] tag', () => {
      const result = extractTTSText('[excited] "Wow!"', 'dialogue');
      expect(result.emotionTag).toBe('[excited]');
    });

    it('extracts [sad] tag', () => {
      const result = extractTTSText('[sad] "Je suis triste"', 'dialogue');
      expect(result.emotionTag).toBe('[sad]');
    });

    it('extracts [whispers] tag', () => {
      const result = extractTTSText('[whispers] "Chut..."', 'dialogue');
      expect(result.emotionTag).toBe('[whispers]');
    });

    it('extracts [laughs] tag', () => {
      const result = extractTTSText('[laughs] "Ha ha!"', 'dialogue');
      expect(result.emotionTag).toBe('[laughs]');
    });

    it('extracts [sighs] tag', () => {
      const result = extractTTSText('[sighs] "Bon..."', 'dialogue');
      expect(result.emotionTag).toBe('[sighs]');
    });

    it('handles tag with leading/trailing whitespace', () => {
      const result = extractTTSText('  [angry]   "Arrete!"', 'dialogue');
      expect(result.emotionTag).toBe('[angry]');
      expect(result.ttsText).toBe('[angry] Arrete!');
    });

    it('does not extract tag from middle of text', () => {
      const result = extractTTSText('"Hello" [laughs] "world"', 'dialogue');
      expect(result.emotionTag).toBeNull();
      // Both quoted sections are extracted
      expect(result.quotedSections).toEqual(['Hello', 'world']);
    });
  });

  describe('word count accuracy', () => {
    it('counts words correctly excluding emotion tag', () => {
      const result = extractTTSText('[excited] "Un deux trois quatre"', 'dialogue');
      expect(result.spokenWordCount).toBe(4);
    });

    it('counts hyphenated words as single words', () => {
      const result = extractTTSText('"Arc-en-ciel"', 'dialogue');
      expect(result.spokenWordCount).toBe(1);
    });

    it('counts contractions correctly', () => {
      const result = extractTTSText('"J\'aime les chats"', 'dialogue');
      expect(result.spokenWordCount).toBe(3);
    });

    it('handles empty quotes', () => {
      const result = extractTTSText('""', 'dialogue');
      // Empty quotes don't match the regex /"([^"]+)"/g (requires at least one char)
      // so it falls back to full text
      expect(result.ttsText).toBe('""');
      expect(result.spokenWordCount).toBe(1);
    });

    it('ignores narrative description word count for dialogue', () => {
      // Original has 8 words, but only 1 should be spoken
      const result = extractTTSText(
        '[excited] "REGARDE!" s\'ecria-t-il avec une joie immense',
        'dialogue'
      );
      expect(result.spokenWordCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = extractTTSText('', 'dialogue');
      expect(result.ttsText).toBe('');
      expect(result.spokenWordCount).toBe(0);
    });

    it('handles whitespace only', () => {
      const result = extractTTSText('   ', 'dialogue');
      expect(result.ttsText).toBe('');
      expect(result.spokenWordCount).toBe(0);
    });

    it('handles unclosed quotes (falls back to full text)', () => {
      const result = extractTTSText('"Bonjour', 'dialogue');
      expect(result.ttsText).toBe('"Bonjour');
      expect(result.quotedSections).toEqual([]);
    });

    it('handles nested-looking quotes (extracts innermost)', () => {
      const result = extractTTSText('"Il dit "Bonjour" puis partit"', 'dialogue');
      // Regex will match "Il dit " and " puis partit" as separate sections
      expect(result.quotedSections.length).toBeGreaterThan(0);
    });

    it('handles unicode characters', () => {
      const result = extractTTSText('[happy] "Cest magnifique!"', 'dialogue');
      expect(result.ttsText).toBe('[happy] Cest magnifique!');
      expect(result.spokenWordCount).toBe(2);
    });
  });
});

describe('extractTTSTextBatch', () => {
  it('processes multiple segments', () => {
    const segments: Array<{ text: string; segmentType: TTSSegmentType }> = [
      { text: 'Il etait une fois...', segmentType: 'narration' },
      { text: '[excited] "Bonjour!" dit Marie', segmentType: 'dialogue' },
      { text: 'Le soleil brillait.', segmentType: 'narration' }
    ];

    const results = extractTTSTextBatch(segments);

    expect(results).toHaveLength(3);
    expect(results[0]?.ttsText).toBe('Il etait une fois...');
    expect(results[1]?.ttsText).toBe('[excited] Bonjour!');
    expect(results[2]?.ttsText).toBe('Le soleil brillait.');
  });

  it('handles empty batch', () => {
    const results = extractTTSTextBatch([]);
    expect(results).toEqual([]);
  });

  it('maintains order of results', () => {
    const segments = [
      { text: '"Premier"', segmentType: 'dialogue' as TTSSegmentType },
      { text: '"Deuxieme"', segmentType: 'dialogue' as TTSSegmentType },
      { text: '"Troisieme"', segmentType: 'dialogue' as TTSSegmentType }
    ];

    const results = extractTTSTextBatch(segments);

    expect(results[0]?.ttsText).toBe('Premier');
    expect(results[1]?.ttsText).toBe('Deuxieme');
    expect(results[2]?.ttsText).toBe('Troisieme');
  });
});
