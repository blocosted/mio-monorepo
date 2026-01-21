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
 * Language-specific prosody examples for expressive emotional delivery
 * Based on ElevenLabs best practices: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 */
interface ProsodyExamples {
  speechVerbs: string;
  voiceDescriptions: string;
  bodyDescriptions: string;
  gestureDescriptions: string;
  emotionTable: {
    fear: { bad: string; good: string };
    joy: { bad: string; good: string };
    sadness: { bad: string; good: string };
    anger: { bad: string; good: string };
    surprise: { bad: string; good: string };
  };
  punctuation: {
    caps: string[];
    ellipses: string[];
    dashes: string[];
    combinations: string[];
  };
  fullExample: {
    bad: string;
    good: string;
  };
  segmentExamples: {
    fear: string;
    joy: string;
    sadness: string;
    surprise: string;
  };
}

const PROSODY_EXAMPLES: Record<Language, ProsodyExamples> = {
  fr: {
    speechVerbs: 'murmura, chuchota, s\'exclama, s\'ecria, souffla, balbutia, begaya, grommela, soupira, gemit, lanca, articula, bredouilla, hoqueta, sanglota',
    voiceDescriptions: '"d\'une voix tremblante", "la voix brisee", "d\'un ton hesitant"',
    bodyDescriptions: '"les mains tremblantes", "le souffle coupe", "les yeux ecarquilles"',
    gestureDescriptions: '"en reculant d\'un pas", "serrant les poings", "le regard fuyant"',
    emotionTable: {
      fear: {
        bad: '"J\'ai peur" dit-elle.',
        good: '"J\'ai peur..." murmura-t-elle, la voix a peine audible, reculant d\'un pas.',
      },
      joy: {
        bad: '"Super!" dit-il.',
        good: '"SUPER!!" s\'ecria-t-il, les yeux petillants, bondissant sur place.',
      },
      sadness: {
        bad: '"D\'accord" dit-elle.',
        good: '"D\'accord..." souffla-t-elle, la gorge serree, baissant les yeux.',
      },
      anger: {
        bad: '"Non!" dit-il.',
        good: '"NON!" cria-t-il, les poings serres, le visage rouge de colere.',
      },
      surprise: {
        bad: '"Quoi?" dit-elle.',
        good: '"Quoi?!" s\'etrangla-t-elle, les yeux ecarquilles, n\'en croyant pas ses oreilles.',
      },
    },
    punctuation: {
      caps: [
        '"Tu ne comprends PAS!"',
        '"C\'est INCROYABLE!"',
        '"Il faut qu\'on PARTE!"',
        '"JAMAIS je ne ferai ca!"',
      ],
      ellipses: [
        '"Je... je ne sais pas..."',
        '"Et si... et si on essayait?"',
        '"C\'est vraiment... magique."',
      ],
      dashes: [
        '"C\'etait - comment dire - inattendu."',
        '"On pourrait - non, attends - peut-etre que..."',
        '"Je pensais que - enfin, je croyais..."',
      ],
      combinations: [
        '"Attends... C\'est CA!"',
        '"Non mais - ATTENDS! Tu as vu ca?!"',
        '"Je... je n\'arrive pas a y CROIRE!"',
      ],
    },
    fullExample: {
      bad: '[scared] "J\'ai entendu quelque chose."',
      good: `[scared] "J'ai... j'ai entendu quelque chose!" chuchota Marie, le coeur
battant a tout rompre. Elle se figea. "La-bas - tu as VU? Quelque chose
a BOUGE!" [whimpers]`,
    },
    segmentExamples: {
      fear: `[nervous] "Tu as entendu ca?" chuchota Marie, le coeur battant a tout rompre.
Elle retint son souffle... Le silence etait ASSOURDISSANT.
"On - on devrait peut-etre partir..." murmura-t-elle, reculant d'un pas.`,
      joy: `[excited] "REGARDE! Regarde la-bas!" s'ecria Lucas, bondissant sur place.
Ses yeux brillaient comme des etoiles. "C'est... c'est MAGIQUE!" [laughs]
Il ne pouvait s'empecher de sourire, le visage illumine de bonheur.`,
      sadness: `[sad] "Je comprends..." murmura-t-elle, la gorge serree. [sighs]
Elle baissa les yeux, les epaules affaissees. "C'est juste que... je pensais
que ca serait DIFFERENT, tu sais?" souffla-t-elle d'une voix a peine audible.`,
      surprise: `[gasps] "Quoi?! C'est... c'est IMPOSSIBLE!" s'etrangla-t-il, les yeux
ecarquilles. Il recula d'un pas, bouche bee. "Mais alors... TOUT ce qu'on
croyait savoir etait FAUX!" lanca-t-il, n'en revenant pas.`,
    },
  },
  en: {
    speechVerbs: 'whispered, murmured, exclaimed, cried out, breathed, stammered, stuttered, grumbled, sighed, moaned, called out, articulated, mumbled, gasped, sobbed',
    voiceDescriptions: '"in a trembling voice", "with a broken voice", "in a hesitant tone"',
    bodyDescriptions: '"with trembling hands", "breathless", "eyes wide open"',
    gestureDescriptions: '"stepping back", "clenching fists", "averting gaze"',
    emotionTable: {
      fear: {
        bad: '"I\'m scared" she said.',
        good: '"I\'m scared..." she whispered, her voice barely audible, stepping back.',
      },
      joy: {
        bad: '"Great!" he said.',
        good: '"This is AMAZING!!" he exclaimed, eyes sparkling, jumping up and down.',
      },
      sadness: {
        bad: '"Okay" she said.',
        good: '"Okay..." she breathed, throat tight, lowering her eyes.',
      },
      anger: {
        bad: '"No!" he said.',
        good: '"NO!" he shouted, fists clenched, face red with anger.',
      },
      surprise: {
        bad: '"What?" she said.',
        good: '"What?!" she gasped, eyes wide, unable to believe her ears.',
      },
    },
    punctuation: {
      caps: [
        '"You don\'t UNDERSTAND!"',
        '"This is INCREDIBLE!"',
        '"We have to LEAVE!"',
        '"I will NEVER do that!"',
      ],
      ellipses: [
        '"I... I don\'t know..."',
        '"What if... what if we tried?"',
        '"It\'s truly... magical."',
      ],
      dashes: [
        '"It was - how to say - unexpected."',
        '"We could - no, wait - maybe..."',
        '"I thought that - well, I believed..."',
      ],
      combinations: [
        '"Wait... That\'s IT!"',
        '"No but - WAIT! Did you see that?!"',
        '"I... I can\'t BELIEVE it!"',
      ],
    },
    fullExample: {
      bad: '[scared] "I heard something."',
      good: `[scared] "I... I heard something!" whispered Emma, her heart
pounding wildly. She froze. "Over there - did you SEE? Something
MOVED!" [whimpers]`,
    },
    segmentExamples: {
      fear: `[nervous] "Did you hear that?" whispered Emma, her heart pounding wildly.
She held her breath... The silence was DEAFENING.
"We - we should maybe leave..." she murmured, stepping back.`,
      joy: `[excited] "LOOK! Look over there!" exclaimed Lucas, jumping up and down.
His eyes sparkled like stars. "It's... it's MAGICAL!" [laughs]
He couldn't help but smile, his face glowing with happiness.`,
      sadness: `[sad] "I understand..." she murmured, her throat tight. [sighs]
She lowered her eyes, shoulders slumped. "It's just that... I thought
it would be DIFFERENT, you know?" she breathed, barely audible.`,
      surprise: `[gasps] "What?! It's... it's IMPOSSIBLE!" he gasped, eyes wide
with disbelief. He stepped back, mouth agape. "But then... EVERYTHING we
thought we knew was WRONG!" he exclaimed, stunned.`,
    },
  },
};

/**
 * Build the ElevenLabs prosody guide with language-specific examples
 */
function buildProsodyGuide(language: Language): string {
  const examples = PROSODY_EXAMPLES[language];
  const { emotionTable, punctuation, fullExample, segmentExamples } = examples;

  return `
## ElevenLabs v3 Prosody Guide

⚠️ **MANDATORY REQUIREMENTS FOR EACH SEGMENT:**
- Narrations: ALWAYS include an expressive speech verb + physical/emotional description
- Dialogues: AT LEAST 50% must use ellipses OR caps OR dashes
- NEVER write "flat" dialogue like: "Hello!" he said.

### 1. Narrative Context (REQUIRED - 70% of emotional expression)

**Expressive speech verbs to use:**
${examples.speechVerbs}

**Physical/emotional descriptions to add:**
- Voice: ${examples.voiceDescriptions}
- Body: ${examples.bodyDescriptions}
- Gesture: ${examples.gestureDescriptions}

| Emotion | BAD (flat) | GOOD (expressive) |
|---------|------------|-------------------|
| Fear | ${emotionTable.fear.bad} | ${emotionTable.fear.good} |
| Joy | ${emotionTable.joy.bad} | ${emotionTable.joy.good} |
| Sadness | ${emotionTable.sadness.bad} | ${emotionTable.sadness.good} |
| Anger | ${emotionTable.anger.bad} | ${emotionTable.anger.good} |
| Surprise | ${emotionTable.surprise.bad} | ${emotionTable.surprise.good} |

### 2. Expressive Punctuation (REQUIRED in 50%+ of dialogues)

**CAPS** = important words, strong emphasis (1-2 words per sentence max)
${punctuation.caps.map(ex => `- ${ex}`).join('\n')}

**Ellipses (...)** = hesitation, suspense, overflowing emotion
${punctuation.ellipses.map(ex => `- ${ex}`).join('\n')}

**Dashes (-)** = interruption, word searching, self-correction
${punctuation.dashes.map(ex => `- ${ex}`).join('\n')}

**Combinations** = maximum impact
${punctuation.combinations.map(ex => `- ${ex}`).join('\n')}

### 3. Audio Tags (COMPLEMENT only)

Use tags IN ADDITION to narrative context, never alone:

**Emotional tags**: [excited], [nervous], [sad], [scared], [angry], [happy], [curious]
**Physical reactions**: [laughs], [sighs], [gasps], [gulps], [coughs], [whimpers]
**Modulations**: [whispering], [shouting], [softly], [slowly]

### COMPLETE Example (all 3 techniques combined):

**BAD:**
\`\`\`
${fullExample.bad}
\`\`\`

**GOOD:**
\`\`\`
${fullExample.good}
\`\`\`

### Per-segment checklist

Before finalizing each segment, verify:
- [ ] Dialogue: contains ellipses, CAPS, or dashes?
- [ ] Narration: expressive verb + physical/emotional description?
- [ ] Audio tag: used as complement, not replacement?
- [ ] Variation: different emotion from previous segment?
`;
}

/**
 * Build segment examples section with language-specific examples
 */
function buildSegmentExamplesSection(language: Language): string {
  const { segmentExamples } = PROSODY_EXAMPLES[language];

  return `
## ⚠️ MANDATORY EXAMPLES - FOLLOW THIS FORMAT EXACTLY

**COMPARISON: What you must AVOID vs what you must WRITE:**

See the emotion table above for quick reference.

**Fear/Tension (MODEL TO FOLLOW):**
\`\`\`
${segmentExamples.fear}
\`\`\`
→ Techniques: ellipses, CAPS, dash, expressive verbs, physical description

**Joy/Excitement (MODEL TO FOLLOW):**
\`\`\`
${segmentExamples.joy}
\`\`\`
→ Techniques: CAPS, ellipses, expressive verb, physical descriptions

**Sadness (MODEL TO FOLLOW):**
\`\`\`
${segmentExamples.sadness}
\`\`\`
→ Techniques: ellipses, CAPS, expressive verbs, physical descriptions

**Surprise (MODEL TO FOLLOW):**
\`\`\`
${segmentExamples.surprise}
\`\`\`
→ Techniques: ellipses, multiple CAPS, expressive verbs, physical descriptions
`;
}

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

${buildProsodyGuide(language)}

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

${buildSegmentExamplesSection(language)}

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
- [ ] Sound effects enhance key moments
- [ ] Story has clear beginning, middle, and end
- [ ] Dialogue feels natural for character ages
- [ ] No abrupt transitions

## ⚠️ PROSODY - MANDATORY VERIFICATION

**BEFORE submitting, verify EACH segment:**

1. **Dialogues** - At least 50% contain:
   - [ ] Ellipses (...) for hesitation/emotion
   - [ ] CAPS for emphasis (1-2 words)
   - [ ] Dashes (-) for interruptions

2. **Narrations after dialogue** - ALL contain:
   - [ ] Expressive speech verb (whispered, exclaimed, murmured, stammered...)
   - [ ] Physical/emotional description (trembling voice, sparkling eyes...)

3. **Audio tags** - Used as COMPLEMENT, never alone

**IF a segment doesn't follow these rules, REWRITE IT before continuing.**`;
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
