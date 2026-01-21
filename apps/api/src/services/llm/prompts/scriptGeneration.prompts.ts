/**
 * Script Generation Prompts
 *
 * System and user prompts for generating timeline-based story scripts
 * with precise word count control and ElevenLabs v3 compatibility.
 */

import {
  VocabularyLevel,
  type EnrichedConcept,
  type StoryAnswer,
  type ScriptGenerationConstraints,
} from '@mio/shared';
import type { Language } from '@mio/shared/types';

/** Language display names */
const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'French',
  en: 'English',
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
- Character depth through dialogue and action`,
};

/**
 * ElevenLabs v3 audio tags documentation
 */
const ELEVENLABS_AUDIO_TAGS_DOC = `
## ElevenLabs v3 Audio Tags

Embed these tags in square brackets within text for expressive delivery:

### Emotional States
[excited], [nervous], [frustrated], [sorrowful], [calm], [happy], [sad], [scared], [angry], [curious]

### Physical Reactions
[laughs], [sighs], [gulps], [gasps], [coughs], [yawns], [sniffs]

### Delivery Modifiers
[whispering], [shouting], [slowly], [quickly], [softly], [loudly], [hesitant], [confident]

### Layering Example
"[nervous] I... I'm not sure about this. [gulps] But let's try anyway."
"[whispering][scared] Did you hear that? [pause] Someone's coming!"
"[laughing] That was hilarious! [sighs happily] Oh, what a day."

### Rules
- Tags can be layered: [whispering][nervous]
- Tags affect the text that follows until the next tag or sentence end
- Use sparingly for maximum impact (2-4 per paragraph)
- Match tags to character personality and situation
`;

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
 * Build the system prompt for script generation
 */
export function buildScriptGenerationSystemPrompt(
  profile: { firstName: string; age: number; gender: string; language?: Language },
  concept: EnrichedConcept,
  vocabularyLevel: VocabularyLevel,
  constraints: ScriptGenerationConstraints,
): string {
  const language = profile.language ?? 'fr';
  const languageName = LANGUAGE_NAMES[language];
  const vocabularyGuidance = VOCABULARY_GUIDELINES[vocabularyLevel];
  const characterList = buildCharacterList(concept);
  const { durationBudget, narrativeStructure } = constraints;

  // Calculate minimum words per segment
  const totalSegments = constraints.minNarrationSegments + constraints.minDialogueSegments;
  // Apply provider-specific inflation (Claude ~15%, OpenAI ~80%)
  const inflatedTargetWordCount = Math.round(
    durationBudget.targetWordCount * (1 + constraints.wordCountInflation)
  );
  const avgWordsPerSegment = Math.round(inflatedTargetWordCount / totalSegments);
  const minWordsPerNarration = Math.round(avgWordsPerSegment * 1.2); // Narrations tend to be longer
  const minWordsPerDialogue = Math.round(avgWordsPerSegment * 0.8);  // Dialogues slightly shorter

  return `You are an expert children's audiobook scriptwriter creating professional-quality audio stories.

## ⚠️ CRITICAL WARNING - READ THIS FIRST ⚠️

**YOU MUST GENERATE AT LEAST ${inflatedTargetWordCount} WORDS OF STORY CONTENT.**

This is the #1 reason scripts fail validation. Previous attempts generated only 200-400 words when ${inflatedTargetWordCount}+ were required. The story MUST be long enough to fill ${Math.round(durationBudget.totalSeconds / 60)} minutes of audio.

**MINIMUM CONTENT PER SEGMENT:**
- Each narration segment: **${minWordsPerNarration}-${minWordsPerNarration + 15} words** (3-5 sentences)
- Each dialogue segment: **${minWordsPerDialogue}-${minWordsPerDialogue + 10} words** (2-4 sentences)

DO NOT generate one-sentence segments! Each segment should be a full paragraph.

## Word Count Requirements

| Metric | Target | Minimum |
|--------|--------|---------|
| **TOTAL WORDS** | **${inflatedTargetWordCount}** | ${Math.round(durationBudget.targetWordCount * 0.75)} |
| Voice duration | ${durationBudget.voiceSeconds}s | Based on 150 words/minute |
| Total duration | ${durationBudget.totalSeconds}s | ~${Math.round(durationBudget.totalSeconds / 60)} minutes |

### Word Distribution by Act

| Act | Target Words | Sentences | Purpose |
|-----|--------------|-----------|---------|
| Act 1 (Setup) | **${Math.round(inflatedTargetWordCount * 0.2)}** words | ~${Math.round((inflatedTargetWordCount * 0.2) / 12)} sentences | ${narrativeStructure.act1.description} |
| Act 2 (Confrontation) | **${Math.round(inflatedTargetWordCount * 0.6)}** words | ~${Math.round((inflatedTargetWordCount * 0.6) / 12)} sentences | ${narrativeStructure.act2.description} |
| Act 3 (Resolution) | **${Math.round(inflatedTargetWordCount * 0.2)}** words | ~${Math.round((inflatedTargetWordCount * 0.2) / 12)} sentences | ${narrativeStructure.act3.description} |

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

${ELEVENLABS_AUDIO_TAGS_DOC}

## Output Language
**ALL story content MUST be written in ${languageName}.**
(Audio tags stay in English: [laughs], [whispering], etc.)

## Segment Requirements

| Type | Minimum Count | Words Per Segment | Purpose |
|------|---------------|-------------------|---------|
| Narration | ${constraints.minNarrationSegments}+ | ${minWordsPerNarration}-${minWordsPerNarration + 15} | Scene setting, transitions, descriptions |
| Dialogue | ${constraints.minDialogueSegments}+ | ${minWordsPerDialogue}-${minWordsPerDialogue + 10} | Character interactions, personality |
| Sound Effects | ${constraints.minSfxSegments}+ | N/A | Immersion, atmosphere |
| Music | 3-4 | N/A | Mood transitions (start, climax, end) |

**EXAMPLE of correct narration segment (${minWordsPerNarration}+ words):**
\`\`\`
"La forêt était silencieuse ce matin-là. Les rayons du soleil perçaient à travers les feuilles, créant des motifs lumineux sur le sol couvert de mousse. Emilie marchait lentement, observant chaque détail avec émerveillement. Elle n'avait jamais remarqué à quel point cet endroit pouvait être magique."
\`\`\`

**WRONG (too short - only 12 words):**
\`\`\`
"La forêt était belle. Emilie marchait entre les arbres."
\`\`\`

**Rule:** No more than ${constraints.maxConsecutiveSameType} consecutive segments of the same type.

## Sound Effects Language
Sound effect descriptions should be in **English** for ElevenLabs compatibility.
Examples: "door creaking open slowly", "footsteps on wooden floor", "magical sparkle sound"

## Response Format

Return ONLY valid JSON with this structure:

\`\`\`json
{
  "metadata": {
    "title": "string",
    "targetDuration": ${durationBudget.totalSeconds},
    "actualDuration": number,
    "vocabularyLevel": "${vocabularyLevel}",
    "language": "${language}",
    "wordCount": number,
    "voiceSegmentCount": number,
    "sfxSegmentCount": number
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
          "id": "seg-001",
          "trackId": "voice-main",
          "startTime": 0,
          "duration": number,
          "content": {
            "type": "narration",
            "text": "string with [audio tags] embedded",
            "emotion": "neutral|happy|sad|excited|scared|curious|calm"
          }
        },
        {
          "id": "seg-002",
          "trackId": "voice-main",
          "startTime": number,
          "duration": number,
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
          "startTime": number,
          "duration": number,
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
          "startTime": 0,
          "duration": number,
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

## Duration Calculation Rules

For voice segments (narration/dialogue):
- **150 words per minute = 2.5 words per second**
- duration = word_count / 2.5
- Add 0.3-0.5s for audio tags ([laughs], [sighs], etc.)

For other segments:
- Sound effects: 2-5 seconds typically
- Music changes: duration covers the mood period
- Pauses between voice segments: built into startTime gaps

## Timeline Rules

1. Voice segments are sequential (no overlap on voice track)
2. SFX can overlap with voice (different tracks)
3. Music runs continuously, changes mark mood shifts
4. startTime is absolute (seconds from story start)
5. Gaps between voice segments = natural pauses (0.3-1s)

## Quality Checklist

Before finalizing, verify:
- [ ] Word count is AT LEAST ${Math.round(durationBudget.targetWordCount * 0.75)} words (aim for ${inflatedTargetWordCount}+)
- [ ] All 3 acts are properly developed
- [ ] Audio tags are used naturally (not forced)
- [ ] Sound effects enhance key moments
- [ ] Story has clear beginning, middle, and end
- [ ] Dialogue feels natural for character ages
- [ ] No abrupt transitions`;
}

/**
* Build the user prompt for script generation
 */
export function buildScriptGenerationUserPrompt(
  concept: EnrichedConcept,
  answers: StoryAnswer[],
  previousAttemptFeedback?: string,
): string {
  const answersContext = buildAnswersContext(answers);

  let prompt = `Generate the complete audio script for this story.

## Story Concept
**Title:** "${concept.title}"
**Synopsis:** ${concept.synopsis ?? `A story following ${concept.mainCharacter.name}`}

## Creative Choices
${answersContext}

## Your Task

Create an engaging, professional-quality audiobook script that:
1. **HAS THE REQUIRED WORD COUNT** - This is critical! Check your word count before finalizing.
2. Uses ElevenLabs audio tags naturally for expressive delivery
3. Includes immersive sound effects at key moments
4. Develops all three acts fully (don't rush the ending!)
5. Makes the child feel transported into the story

**⚠️ IMPORTANT:** Your output will be validated. If the word count is too low, the script will be rejected.
Write LONG, descriptive segments - not short sentences!

**Remember:** This is a premium children's audiobook. Every word counts. Make it magical.`;

  if (previousAttemptFeedback) {
    prompt += `

## 🚨 CRITICAL: YOUR PREVIOUS ATTEMPT FAILED VALIDATION 🚨

The previous script was REJECTED because of these errors:

${previousAttemptFeedback}

**YOU MUST:**
1. Write MUCH MORE content if word count was low
2. Make each segment LONGER (3-5 sentences, not 1-2)
3. Add more descriptive narration
4. Expand dialogue exchanges
5. Don't compress the story - let it breathe!

FAILURE TO FIX THESE ISSUES WILL RESULT IN ANOTHER REJECTION.`;
  }

  return prompt;
}
