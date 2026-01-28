/**
 * Script Generation Prompts
 *
 * Prompts for generating scripts with relative timing.
 * Key features:
 * - Voice segments use `order` instead of absolute startTime
 * - Non-voice segments use `timingHint` for relative positioning
 * - No duration on segments (computed post-TTS from real audio)
 */

import { type Language, type ScriptGenerationConstraints, VocabularyLevel } from '@mio/shared/types';

import type { EnrichedConcept, StoryAnswer } from '../../stories/stories.service.types';

/** Language display names */
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'French',
  en: 'English'
};

/**
 * Vocabulary level guidelines
 */
const VOCABULARY_GUIDELINES: Record<VocabularyLevel, string> = {
  [VocabularyLevel.VerySimple]: `
- Use only basic words a 3-4 year old understands
- Very short sentences (3-5 words maximum)
- Simple emotions: happy, sad, scared, surprised
- Concrete, familiar objects only
- Repetition is encouraged
- Onomatopoeia welcome`,
  [VocabularyLevel.Simple]: `
- Simple vocabulary for 5-6 year olds
- Short sentences (5-8 words)
- Basic fantasy elements allowed
- Simple cause and effect
- Clear, direct dialogue`,
  [VocabularyLevel.Medium]: `
- Vocabulary appropriate for 7-9 year olds
- Descriptive language allowed
- Longer sentences with some complexity
- Mild suspense and tension
- More nuanced emotions
- Character development through dialogue`,
  [VocabularyLevel.Advanced]: `
- Rich vocabulary for 10-12 year olds
- Sophisticated storytelling techniques
- Complex sentences allowed
- Subtle themes and irony permitted
- Full range of emotions
- Character depth through dialogue and action`
};

/**
 * Build character list with voice descriptions
 */
function buildCharacterList(concept: EnrichedConcept): string {
  const parts: string[] = [];

  parts.push(`### Main Character`);
  parts.push(`- Name: ${concept.mainCharacter.name}`);
  parts.push(`- Description: ${concept.mainCharacter.description}`);
  if (concept.mainCharacter.voiceType) {
    parts.push(`- Voice: ${concept.mainCharacter.voiceType}`);
  }

  if (concept.secondaryCharacters && concept.secondaryCharacters.length > 0) {
    parts.push(`\n### Secondary Characters`);
    for (const char of concept.secondaryCharacters) {
      parts.push(`- **${char.name}**: ${char.description}`);
      if (char.voiceType) {
        parts.push(`  Voice: ${char.voiceType}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Build answers context
 */
function buildAnswersContext(answers: StoryAnswer[]): string {
  if (!answers || answers.length === 0) {
    return 'No specific guided choices were made - use your best creative judgment.';
  }

  const parts: string[] = ['The child made these creative choices:'];
  for (const answer of answers) {
    parts.push(`- ${answer.questionId}: ${answer.value}`);
  }
  return parts.join('\n');
}

/**
 * Build the JSON schema documentation for relative timing
 */
function buildJsonSchema(language: Language, vocabularyLevel: VocabularyLevel): string {
  return `
## Response Format (Relative Timing)

Return ONLY valid JSON with this structure:

\`\`\`json
{
  "metadata": {
    "title": "string",
    "targetDuration": number,
    "vocabularyLevel": "${vocabularyLevel}",
    "language": "${language}",
    "wordCount": number,
    "voiceSegmentCount": number,
    "sfxSegmentCount": number,
    "voiceSegmentPauseSeconds": 0.3
  },
  "characters": [
    {
      "characterName": "string",
      "voiceDescription": "string describing ideal voice"
    }
  ],
  "tracks": [
    {
      "id": "voice-main",
      "type": "voice",
      "name": "Main Voice Track",
      "segments": [
        {
          "id": "voice-001",
          "trackId": "voice-main",
          "order": 1,
          "content": {
            "type": "narration",
            "text": "string with [audio tags] embedded",
            "emotion": "neutral|happy|sad|excited|scared|curious|calm"
          }
        },
        {
          "id": "voice-002",
          "trackId": "voice-main",
          "order": 2,
          "content": {
            "type": "dialogue",
            "text": "string with [audio tags]",
            "characterName": "string",
            "emotion": "string"
          }
        }
      ]
    },
    {
      "id": "sfx-main",
      "type": "sfx",
      "name": "Sound Effects Track",
      "segments": [
        {
          "id": "sfx-001",
          "trackId": "sfx-main",
          "timingHint": {
            "anchorType": "segment_start|segment_end|segment_percent",
            "anchorSegmentId": "voice-001",
            "offsetMs": 0,
            "anchorPercent": 50
          },
          "estimatedDuration": 3,
          "content": {
            "type": "sfx",
            "description": "English description for ElevenLabs"
          }
        }
      ]
    },
    {
      "id": "music-main",
      "type": "music",
      "name": "Music Track",
      "segments": [
        {
          "id": "music-001",
          "trackId": "music-main",
          "timingHint": {
            "anchorType": "segment_start",
            "anchorSegmentId": "voice-001",
            "offsetMs": 0
          },
          "estimatedDuration": 30,
          "content": {
            "type": "music",
            "mood": "mysterious|adventurous|calm|tense|joyful"
          }
        }
      ]
    }
  ]
}
\`\`\`

## IMPORTANT: Timing Rules

**Voice segments** use \`order\` (1, 2, 3, ...) - they play SEQUENTIALLY:
- Do NOT include startTime or duration on voice segments
- The order field determines playback sequence
- Actual timing is computed after TTS generation

**Non-voice segments** use \`timingHint\` - they reference voice segments:
- \`anchorType\`: "segment_start", "segment_end", or "segment_percent"
- \`anchorSegmentId\`: ID of the voice segment to anchor to
- \`offsetMs\`: offset in milliseconds (negative = before, positive = after)
- \`anchorPercent\`: percentage point (0-100) when using "segment_percent"

**Examples of timingHint:**

1. SFX starts at the same time as voice-003:
\`\`\`json
{
  "anchorType": "segment_start",
  "anchorSegmentId": "voice-003",
  "offsetMs": 0
}
\`\`\`

2. SFX starts 500ms BEFORE voice-005 ends:
\`\`\`json
{
  "anchorType": "segment_end",
  "anchorSegmentId": "voice-005",
  "offsetMs": -500
}
\`\`\`

3. Music changes at 75% through voice-001:
\`\`\`json
{
  "anchorType": "segment_percent",
  "anchorSegmentId": "voice-001",
  "anchorPercent": 75,
  "offsetMs": 0
}
\`\`\`

## estimatedDuration for Non-Voice Segments

All non-voice segments (SFX, music, ambiance) MUST include \`estimatedDuration\` in seconds:

| Type | Typical Duration | Guidelines |
|------|------------------|------------|
| **SFX** | 2-5 seconds | Short sound effects (door, footsteps, etc.) |
| **Music** | 15-30 seconds | Background music transitions. Should cover the narrative section it accompanies. |
| **Ambiance** | 30-60 seconds | Environmental sounds. Can be longer as they loop. |

**IMPORTANT:** Music segments should NOT be too short (minimum 15 seconds) or too long (maximum 45 seconds for a 5-minute story). The music will play from its anchor point for its estimated duration.

## Why Relative Timing?

The LLM cannot know exact TTS durations. With relative timing:
- Voice segments just specify order
- SFX/music specify WHERE they go relative to voice
- After TTS generation, real durations are used to compute exact times
- Result: accurate, synchronized audio mix
`;
}

/**
 * Build the system prompt for script generation
 */
export function buildScriptGenerationSystemPrompt(
  profile: { firstName: string; age: number; gender: string; language?: Language },
  concept: EnrichedConcept,
  vocabularyLevel: VocabularyLevel,
  constraints: ScriptGenerationConstraints
): string {
  const language = profile.language ?? 'fr';
  const languageName = LANGUAGE_NAMES[language];
  const vocabularyGuidance = VOCABULARY_GUIDELINES[vocabularyLevel];
  const characterList = buildCharacterList(concept);
  const { durationBudget, narrativeStructure } = constraints;

  // Calculate minimum words per segment
  const totalSegments = constraints.minNarrationSegments + constraints.minDialogueSegments;
  const inflatedTargetWordCount = Math.round(durationBudget.targetWordCount * (1 + constraints.wordCountInflation));
  const avgWordsPerSegment = Math.round(inflatedTargetWordCount / totalSegments);
  const minWordsPerNarration = Math.round(avgWordsPerSegment * 1.2);
  const minWordsPerDialogue = Math.round(avgWordsPerSegment * 0.8);

  return `You are an expert children's audiobook scriptwriter creating professional-quality audio stories.

## SCRIPT FORMAT: Relative Timing

This script uses RELATIVE timing instead of absolute timestamps:
- Voice segments have \`order\` (1, 2, 3...) for sequential playback
- SFX/music have \`timingHint\` referencing voice segments
- Actual times are computed after TTS generation

## Word Count Requirements

| Metric | Target | Minimum |
|--------|--------|---------|
| **TOTAL WORDS** | **${inflatedTargetWordCount}** | ${Math.round(durationBudget.targetWordCount * 0.85)} |
| Voice duration | ${durationBudget.voiceSeconds}s | Based on 120 words/minute |
| Total duration | ${durationBudget.totalSeconds}s | ~${Math.round(durationBudget.totalSeconds / 60)} minutes |

### Word Distribution by Act

| Act | Target Words | Purpose |
|-----|--------------|---------|
| Act 1 (Setup) | **${Math.round(inflatedTargetWordCount * 0.2)}** | ${narrativeStructure.act1.description} |
| Act 2 (Confrontation) | **${Math.round(inflatedTargetWordCount * 0.6)}** | ${narrativeStructure.act2.description} |
| Act 3 (Resolution) | **${Math.round(inflatedTargetWordCount * 0.2)}** | ${narrativeStructure.act3.description} |

## Story Context

**Title:** "${concept.title}"
**Tone:** ${concept.tone}
**Setting:** ${concept.setting.location} (${concept.setting.era})
**Themes:** ${concept.themes.join(', ')}
**Synopsis:** ${concept.synopsis ?? 'Not provided'}

## Characters
${characterList}

## Target Audience
**Child:** ${profile.firstName}, ${profile.age} years old
**Vocabulary Level:** ${vocabularyLevel}

## Vocabulary Guidelines
${vocabularyGuidance}

## Output Language
**ALL story content MUST be written in ${languageName}.**
(Audio tags stay in English: [laughs], [whispering], etc.)

## Segment Requirements

| Type | Minimum Count | Words Per Segment |
|------|---------------|-------------------|
| Narration | ${constraints.minNarrationSegments}+ | ${minWordsPerNarration}-${minWordsPerNarration + 15} |
| Dialogue | ${constraints.minDialogueSegments}+ | ${minWordsPerDialogue}-${minWordsPerDialogue + 10} |
| Sound Effects | ${constraints.minSfxSegments}+ | N/A |
| Music | 3-4 | N/A |

## Sound Effects Language
Sound effect descriptions should be in **English** for ElevenLabs compatibility.

${buildJsonSchema(language, vocabularyLevel)}

## Prosody Guidelines

For dialogue segments, include expressive elements:
- Use ellipses (...) for hesitation
- Use CAPS for emphasis (1-2 words max)
- Use dashes (-) for interruptions
- Include expressive speech verbs and physical descriptions

Example dialogue:
\`\`\`
[excited] "REGARDE!" s'ecria-t-il, les yeux ecarquilles
\`\`\`

## Quality Checklist

Before finalizing, verify:
- [ ] Word count is at least ${Math.round(durationBudget.targetWordCount * 0.85)} words
- [ ] Voice segments have sequential \`order\` values (1, 2, 3...)
- [ ] SFX segments have \`timingHint\` referencing voice segments
- [ ] Music segments mark mood transitions with \`timingHint\`
- [ ] All segments have unique IDs`;
}

/**
 * Build the user prompt for script generation
 */
export function buildScriptGenerationUserPrompt(
  concept: EnrichedConcept,
  answers: StoryAnswer[],
  previousAttemptFeedback?: string
): string {
  const answersContext = buildAnswersContext(answers);

  let prompt = `Generate an audio script for this story.

## Story Concept
**Title:** "${concept.title}"
**Synopsis:** ${concept.synopsis ?? `A story following ${concept.mainCharacter.name}`}

## Creative Choices
${answersContext}

## Your Task

Create an engaging audiobook script that:
1. Has the required word count
2. Uses sequential \`order\` for voice segments (1, 2, 3...)
3. Uses \`timingHint\` for SFX/music positioning
4. Includes immersive sound effects at key moments
5. Makes the child feel transported into the story

**Remember:** Voice segments are sequential. SFX/music reference voice segments.`;

  if (previousAttemptFeedback) {
    prompt += `

## Previous Attempt Failed

${previousAttemptFeedback}

Please fix these issues in your new attempt.`;
  }

  return prompt;
}
