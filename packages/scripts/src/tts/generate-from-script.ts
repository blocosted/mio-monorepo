/**
 * Generate from Script Command
 *
 * Generate all voice segments from a StoryScript JSON file.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import type { Emotion, StoryScript, VoiceSegmentContent } from '@mio/shared/types';
import { VoicesRepository } from '@mio/api/repositories/audio';
import { type CharacterArchetype, EMOTION_VOICE_SETTINGS } from '@mio/api/services/narration';

// TODO: Update this script to use TimelineComputationService (V3) instead of deprecated TimelineSyncService

// TODO: VOICE_IDS_BY_LANGUAGE was removed - refactor to use VoiceRegistryService
const VOICE_IDS_BY_LANGUAGE: Record<string, Record<CharacterArchetype, Record<string, string>>> = {
  fr: {
    narrator: { male: 'placeholder', female: 'placeholder' },
    childHero: { male: 'placeholder', female: 'placeholder' },
    wiseCharacter: { male: 'placeholder', female: 'placeholder' },
    villain: { male: 'placeholder', female: 'placeholder' },
    comedic: { male: 'placeholder', female: 'placeholder' },
    parent: { male: 'placeholder', female: 'placeholder' },
    friend: { male: 'placeholder', female: 'placeholder' },
    animal: { male: 'placeholder', female: 'placeholder' },
    magical: { male: 'placeholder', female: 'placeholder' }
  },
  en: {
    narrator: { male: 'placeholder', female: 'placeholder' },
    childHero: { male: 'placeholder', female: 'placeholder' },
    wiseCharacter: { male: 'placeholder', female: 'placeholder' },
    villain: { male: 'placeholder', female: 'placeholder' },
    comedic: { male: 'placeholder', female: 'placeholder' },
    parent: { male: 'placeholder', female: 'placeholder' },
    friend: { male: 'placeholder', female: 'placeholder' },
    animal: { male: 'placeholder', female: 'placeholder' },
    magical: { male: 'placeholder', female: 'placeholder' }
  }
};

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import { createRunDir, writeJsonFile } from '../_local-run-store/run-store';

function loadEnv(envFile?: string): void {
  const files = envFile ? [envFile] : ['.env.local', '.env'];
  for (const file of files) {
    if (existsSync(file)) {
      loadDotenv({ path: file });
    }
  }
  loadEnvironmentFromProcessEnv({ override: true });
}

/**
 * Gender detection keywords
 */
const GENDER_KEYWORDS = {
  male: [
    // English
    'male',
    'man',
    'boy',
    'father',
    'dad',
    'papa',
    'grandfather',
    'king',
    'prince',
    'his',
    'him',
    'he',
    'brother',
    'son',
    'uncle',
    'gentleman',
    'mister',
    'mr',
    // French
    'homme',
    'garcon',
    'garçon',
    'pere',
    'père',
    'grand-pere',
    'grand-père',
    'roi',
    'prince',
    'frere',
    'frère',
    'fils',
    'oncle',
    'monsieur'
  ],
  female: [
    // English
    'female',
    'woman',
    'girl',
    'mother',
    'mom',
    'mama',
    'grandmother',
    'queen',
    'princess',
    'her',
    'she',
    'sister',
    'daughter',
    'aunt',
    'lady',
    'miss',
    'mrs',
    // French
    'femme',
    'fille',
    'mere',
    'mère',
    'maman',
    'grand-mere',
    'grand-mère',
    'reine',
    'princesse',
    'soeur',
    'sœur',
    'tante',
    'madame',
    'mademoiselle'
  ]
};

/**
 * Archetype keywords - ORDER MATTERS!
 * Priority: narrator > childHero > magical > animal > wiseCharacter > comedic > parent > friend > villain
 * This ensures "dragon" matches "magical" not "villain"
 */
const ARCHETYPE_KEYWORDS_ORDERED: Array<[CharacterArchetype, string[]]> = [
  ['narrator', ['narrator', 'narration', 'story', 'storyteller', 'narrateur', 'narratrice', 'conteur', 'conteuse']],
  [
    'childHero',
    [
      'child',
      'kid',
      'young',
      'hero',
      'protagonist',
      'main character',
      'enfant',
      'jeune',
      'heros',
      'héros',
      'heroine',
      'héroïne',
      'protagoniste',
      'petit',
      'petite',
      '7 years',
      '8 years',
      '9 years',
      '10 years',
      'ans'
    ]
  ],
  [
    'magical',
    [
      // IMPORTANT: dragon, fairy, etc. should match magical, not villain
      'magical',
      'fairy',
      'elf',
      'sprite',
      'unicorn',
      'magic',
      'enchanted',
      'dragon',
      'pixie',
      'gnome',
      'nymph',
      'crystal',
      'sparkle',
      'glitter',
      'magique',
      'fee',
      'fée',
      'elfe',
      'lutin',
      'licorne',
      'magie',
      'enchante',
      'enchanté',
      'fantastique',
      'farfadet',
      'cristal',
      'brillant',
      'scintillant'
    ]
  ],
  [
    'animal',
    [
      'animal',
      'pet',
      'dog',
      'cat',
      'bird',
      'rabbit',
      'bear',
      'fox',
      'creature',
      'wolf',
      'mouse',
      'owl',
      'butterfly',
      'lion',
      'tiger',
      'elephant',
      'chien',
      'chat',
      'oiseau',
      'lapin',
      'ours',
      'renard',
      'creature',
      'créature',
      'loup',
      'souris',
      'hibou',
      'papillon'
    ]
  ],
  [
    'wiseCharacter',
    [
      'wise',
      'elder',
      'sage',
      'mentor',
      'wizard',
      'grandmother',
      'grandfather',
      'old',
      'ancient',
      'teacher',
      'master',
      'guide',
      'sage',
      'ancien',
      'ancienne',
      'mentor',
      'sorcier',
      'magicien',
      'grand-mere',
      'grand-mère',
      'grand-pere',
      'grand-père',
      'vieux',
      'vieille'
    ]
  ],
  [
    'comedic',
    ['funny', 'silly', 'comic', 'clown', 'joker', 'goofy', 'playful', 'drole', 'drôle', 'rigolo', 'comique', 'clown', 'bouffon', 'amusant', 'farceur']
  ],
  ['parent', ['parent', 'mom', 'dad', 'mother', 'father', 'mama', 'papa', 'maman', 'mere', 'mère', 'pere', 'père']],
  ['friend', ['friend', 'buddy', 'sidekick', 'companion', 'pal', 'partner', 'ami', 'amie', 'copain', 'copine', 'compagnon', 'compagne', 'camarade']],
  [
    'villain',
    [
      // villain is LAST - this ensures other types match first
      'villain',
      'evil',
      'bad',
      'witch',
      'monster',
      'dark',
      'wicked',
      'sinister',
      'mechant',
      'méchant',
      'mechante',
      'méchante',
      'mal',
      'mauvais',
      'sorciere',
      'sorcière',
      'monstre',
      'sombre',
      'vilain'
    ]
  ]
];

/**
 * Detect gender from character name and description
 */
function detectGender(name: string, description: string): 'male' | 'female' {
  const combined = `${name} ${description}`.toLowerCase();

  const maleScore = GENDER_KEYWORDS.male.filter((kw) => combined.includes(kw)).length;
  const femaleScore = GENDER_KEYWORDS.female.filter((kw) => combined.includes(kw)).length;

  // Return male only if male score is strictly higher
  return maleScore > femaleScore ? 'male' : 'female';
}

/**
 * Detect archetype from character name and description
 */
function detectArchetype(name: string, description: string): CharacterArchetype {
  const combined = `${name} ${description}`.toLowerCase();

  for (const [archetype, keywords] of ARCHETYPE_KEYWORDS_ORDERED) {
    if (keywords.some((keyword) => combined.includes(keyword))) {
      return archetype;
    }
  }

  return 'narrator'; // Default
}

interface VoiceSelectionResult {
  voiceId: string;
  detectedGender: 'male' | 'female';
  detectedArchetype: CharacterArchetype;
}

/**
 * Select voice for a character based on name, description, and language
 * Uses improved gender detection and ordered archetype matching
 */
function selectVoiceForCharacter(characterName: string, voiceDescription: string, language: 'fr' | 'en' = 'fr'): VoiceSelectionResult {
  const voiceIds = VOICE_IDS_BY_LANGUAGE[language];

  const detectedGender = detectGender(characterName, voiceDescription);
  const detectedArchetype = detectArchetype(characterName, voiceDescription);

  const voiceId = voiceIds![detectedArchetype][detectedGender]!;

  return {
    voiceId,
    detectedGender,
    detectedArchetype
  };
}

interface VoiceSegmentInfo {
  id: string;
  text: string;
  characterName?: string;
  emotion?: Emotion;
  voiceId: string;
  detectedGender?: 'male' | 'female';
  detectedArchetype?: CharacterArchetype;
}

interface CharacterVoiceInfo {
  voiceId: string;
  gender: 'male' | 'female';
  archetype: CharacterArchetype;
}

function extractVoiceSegments(script: StoryScript, language: 'fr' | 'en'): VoiceSegmentInfo[] {
  const segments: VoiceSegmentInfo[] = [];

  // Build character to voice map with improved detection
  const characterVoices: Record<string, CharacterVoiceInfo> = {};
  for (const char of script.characters) {
    if (char.voiceId) {
      characterVoices[char.characterName] = {
        voiceId: char.voiceId,
        gender: 'female', // Default when manually specified
        archetype: 'narrator'
      };
    } else {
      const selection = selectVoiceForCharacter(char.characterName, char.voiceDescription, language);
      characterVoices[char.characterName] = {
        voiceId: selection.voiceId,
        gender: selection.detectedGender,
        archetype: selection.detectedArchetype
      };
    }
  }

  for (const track of script.tracks) {
    if (track.type === 'voice') {
      for (const segment of track.segments) {
        const content = segment.content as VoiceSegmentContent;
        const characterName = content.characterName ?? 'narrator';

        // Get voice info or create new selection for unknown character
        let voiceInfo = characterVoices[characterName];
        if (!voiceInfo) {
          const selection = selectVoiceForCharacter(characterName, '', language);
          voiceInfo = {
            voiceId: selection.voiceId,
            gender: selection.detectedGender,
            archetype: selection.detectedArchetype
          };
        }

        segments.push({
          id: segment.id,
          text: content.text,
          characterName,
          emotion: content.emotion as Emotion | undefined,
          voiceId: voiceInfo.voiceId,
          detectedGender: voiceInfo.gender,
          detectedArchetype: voiceInfo.archetype
        });
      }
    }
  }

  return segments;
}

export async function runGenerateFromScriptCommand(args: {
  scriptFile: string;
  language?: 'fr' | 'en';
  storeDir?: string;
  save: boolean;
  envFile?: string;
  dryRun: boolean;
}): Promise<void> {
  loadEnv(args.envFile);

  // Load script
  if (!existsSync(args.scriptFile)) {
    throw new Error(`Script file not found: ${args.scriptFile}`);
  }
  const scriptJson = readFileSync(args.scriptFile, 'utf-8');
  const parsed = JSON.parse(scriptJson);

  // Handle both direct StoryScript and wrapped format (from generate-script output.json)
  const script: StoryScript = parsed.script ?? parsed;

  // Determine language: CLI override > script metadata > default (French)
  const language = args.language ?? (script.metadata.language as 'fr' | 'en') ?? 'fr';

  // Extract voice segments with language-aware voice selection
  const voiceSegments = extractVoiceSegments(script, language);

  // Create run directory for artifacts
  const run = args.save
    ? createRunDir({
      rootDir: args.storeDir,
      namespace: 'tts',
      command: 'from-script',
      labelParts: [script.metadata.title.substring(0, 20)]
    })
    : null;

  // Save input
  if (run) {
    writeJsonFile(run.runDir, 'input.json', {
      scriptFile: args.scriptFile,
      storyTitle: script.metadata.title,
      language,
      segmentCount: voiceSegments.length,
      dryRun: args.dryRun
    });

    writeJsonFile(run.runDir, 'segments.json', voiceSegments);
  }

  if (args.dryRun) {
    const _payload = {
      storyTitle: script.metadata.title,
      language,
      segmentCount: voiceSegments.length,
      segments: voiceSegments.map((s) => ({
        id: s.id,
        text: s.text.substring(0, 50) + (s.text.length > 50 ? '...' : ''),
        characterName: s.characterName,
        emotion: s.emotion,
        voiceId: s.voiceId
      })),
      artifactsDir: run?.runDir
    };
    return;
  }

  // Initialize repository
  const logger = await Logger.create();
  const repository = new VoicesRepository(logger);
  const startTime = Date.now();

  const results: Array<{
    id: string;
    success: boolean;
    durationSeconds?: number;
    error?: string;
    outputFile?: string;
  }> = [];

  for (const segment of voiceSegments) {
    try {
      const voiceSettings = segment.emotion ? EMOTION_VOICE_SETTINGS[segment.emotion] : undefined;

      const result = await repository.convertWithTimestamps({
        text: segment.text,
        voiceId: segment.voiceId,
        voiceSettings
      });

      const outputFilename = `${segment.id}.mp3`;

      if (run) {
        const outputPath = path.join(run.runDir, outputFilename);
        writeFileSync(outputPath, result.audio);
      }

      results.push({
        id: segment.id,
        success: true,
        durationSeconds: result.durationSeconds,
        outputFile: outputFilename
      });
    } catch (error) {
      results.push({
        id: segment.id,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalDuration = results.filter((r) => r.durationSeconds).reduce((sum, r) => sum + (r.durationSeconds ?? 0), 0);

  // TODO: Implement timeline computation using TimelineComputationService (V3)
  // The old TimelineSyncService (V2) has been removed

  // Save output
  if (run) {
    writeJsonFile(run.runDir, 'output.json', {
      successCount,
      failCount,
      totalDurationSeconds: totalDuration,
      generationTimeSeconds: parseFloat(elapsed),
      results
    });

    writeJsonFile(run.runDir, 'meta.json', {
      command: 'tts from-script',
      storyTitle: script.metadata.title,
      language,
      segmentCount: voiceSegments.length,
      successCount,
      failCount,
      totalDurationSeconds: totalDuration,
      generationTimeSeconds: parseFloat(elapsed),
      createdAt: new Date().toISOString()
    });
  }
}
