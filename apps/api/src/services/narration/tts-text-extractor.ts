/**
 * TTS Text Extractor
 *
 * Extracts spoken text from script segments for ElevenLabs TTS.
 *
 * For dialogue segments, only the text between quotes is vocalized.
 * Narrative descriptions (e.g., "s'ecria-t-il, les yeux ecarquilles") are
 * preserved in the script for context but NOT sent to TTS.
 *
 * ElevenLabs v3 audio tags (e.g., [excited], [whispers]) are preserved
 * and prepended to the extracted dialogue.
 *
 * @example
 * // Input (dialogue): `[excited] "REGARDE!" s'ecria-t-il, les yeux ecarquilles`
 * // Output TTS: `[excited] REGARDE!`
 *
 * // Input (narration): `La foret etait silencieuse.`
 * // Output TTS: `La foret etait silencieuse.`
 */

/**
 * Result of TTS text extraction
 */
export interface TTSTextExtractionResult {
  /** Text to send to TTS (dialogue extracted + emotion tag) */
  ttsText: string;
  /** Emotion tag extracted from text (e.g., [excited], [sad]) */
  emotionTag: string | null;
  /** Number of words that will actually be spoken (for duration estimation) */
  spokenWordCount: number;
  /** Sections between quotes that were extracted (for debugging) */
  quotedSections: string[];
  /** Original text before extraction (for reference) */
  originalText: string;
}

/**
 * Segment type for extraction rules
 */
export type TTSSegmentType = 'narration' | 'dialogue';

/**
 * Regex to match ElevenLabs v3 audio tags at the start of text
 * Examples: [excited], [whispers], [laughs], [sighs], [sad]
 */
const AUDIO_TAG_REGEX = /^\s*(\[[a-z]+\])\s*/i;

/**
 * Regex to match quoted sections (double quotes)
 * Captures text between "..." including nested punctuation
 */
const QUOTED_TEXT_REGEX = /"([^"]+)"/g;

/**
 * Count words in a text string
 * Excludes audio tags from count
 */
function countWords(text: string): number {
  // Remove audio tags before counting
  const cleanText = text.replace(/\[[a-z]+\]/gi, '').trim();
  if (!cleanText) return 0;

  // Split on whitespace and filter empty strings
  return cleanText.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract audio tag from the beginning of text
 */
function extractAudioTag(text: string): { tag: string | null; textWithoutTag: string } {
  const match = text.match(AUDIO_TAG_REGEX);
  if (match && match[1]) {
    return {
      tag: match[1],
      textWithoutTag: text.slice(match[0].length)
    };
  }
  return { tag: null, textWithoutTag: text };
}

/**
 * Extract all quoted sections from text
 */
function extractQuotedSections(text: string): string[] {
  const sections: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  QUOTED_TEXT_REGEX.lastIndex = 0;

  while ((match = QUOTED_TEXT_REGEX.exec(text)) !== null) {
    if (match[1]) {
      sections.push(match[1]);
    }
  }

  return sections;
}

/**
 * Extract text for TTS from a script segment
 *
 * For narration segments: returns the full text (with audio tag if present)
 * For dialogue segments: extracts only text between quotes, joins with ellipsis
 *
 * @param text - The original segment text
 * @param segmentType - Whether this is narration or dialogue
 * @returns Extraction result with TTS text and metadata
 *
 * @example
 * // Dialogue with emotion tag
 * extractTTSText('[excited] "REGARDE!" s\'ecria-t-il', 'dialogue')
 * // Returns: { ttsText: '[excited] REGARDE!', emotionTag: '[excited]', spokenWordCount: 1, ... }
 *
 * // Dialogue with multiple quotes
 * extractTTSText('"Attends!" cria-t-elle, "Je viens!"', 'dialogue')
 * // Returns: { ttsText: 'Attends! ... Je viens!', emotionTag: null, spokenWordCount: 3, ... }
 *
 * // Narration (unchanged)
 * extractTTSText('La foret etait silencieuse.', 'narration')
 * // Returns: { ttsText: 'La foret etait silencieuse.', emotionTag: null, spokenWordCount: 4, ... }
 */
export function extractTTSText(text: string, segmentType: TTSSegmentType): TTSTextExtractionResult {
  const { tag: emotionTag, textWithoutTag } = extractAudioTag(text);

  // For narration, return full text (preserving audio tag)
  if (segmentType === 'narration') {
    return {
      ttsText: text.trim(),
      emotionTag,
      spokenWordCount: countWords(text),
      quotedSections: [],
      originalText: text
    };
  }

  // For dialogue, extract only quoted sections
  const quotedSections = extractQuotedSections(textWithoutTag);

  // If no quotes found, return the text as-is (fallback for malformed input)
  if (quotedSections.length === 0) {
    return {
      ttsText: text.trim(),
      emotionTag,
      spokenWordCount: countWords(text),
      quotedSections: [],
      originalText: text
    };
  }

  // Join multiple quoted sections with ellipsis for natural pause
  const joinedDialogue = quotedSections.join(' ... ');

  // Prepend audio tag if present
  const ttsText = emotionTag ? `${emotionTag} ${joinedDialogue}` : joinedDialogue;

  return {
    ttsText: ttsText.trim(),
    emotionTag,
    spokenWordCount: countWords(joinedDialogue),
    quotedSections,
    originalText: text
  };
}

/**
 * Batch extract TTS text from multiple segments
 *
 * @param segments - Array of segments with text and type
 * @returns Array of extraction results
 */
export function extractTTSTextBatch(
  segments: Array<{ text: string; segmentType: TTSSegmentType }>
): TTSTextExtractionResult[] {
  return segments.map((segment) => extractTTSText(segment.text, segment.segmentType));
}
