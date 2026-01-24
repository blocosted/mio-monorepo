/**
 * Generate Speech Command
 *
 * Generate audio from text using the TTS service.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import { VoicesRepository } from '@mio/api/repositories/audio';
import { type CharacterArchetype, EMOTION_VOICE_SETTINGS } from '@mio/api/services/narration';

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
import { Emotion } from '@mio/shared/types';

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

function selectVoiceForCharacter(description: string, gender: 'male' | 'female' = 'female', language: 'fr' | 'en' = 'fr'): string {
  const lowerDescription = description.toLowerCase();
  const voiceIds = VOICE_IDS_BY_LANGUAGE[language];

  const archetypeKeywords: Record<CharacterArchetype, string[]> = {
    narrator: ['narrator', 'narration', 'story', 'storyteller', 'narrateur', 'narratrice', 'conteur', 'conteuse', 'histoire'],
    childHero: [
      'child',
      'kid',
      'boy',
      'girl',
      'young',
      'hero',
      'protagonist',
      'enfant',
      'garcon',
      'fille',
      'jeune',
      'heros',
      'heroine',
      'protagoniste',
      'petit',
      'petite'
    ],
    wiseCharacter: [
      'wise',
      'elder',
      'sage',
      'mentor',
      'wizard',
      'grandmother',
      'grandfather',
      'old',
      'sage',
      'ancien',
      'ancienne',
      'mentor',
      'sorcier',
      'magicien',
      'grand-mere',
      'grand-pere',
      'vieux',
      'vieille'
    ],
    villain: [
      'villain',
      'evil',
      'bad',
      'witch',
      'monster',
      'dragon',
      'dark',
      'mechant',
      'mechante',
      'mal',
      'mauvais',
      'sorciere',
      'monstre',
      'dragon',
      'sombre',
      'vilain'
    ],
    comedic: ['funny', 'silly', 'comic', 'clown', 'joker', 'goofy', 'drole', 'rigolo', 'comique', 'clown', 'bouffon', 'amusant', 'farceur'],
    parent: ['parent', 'mom', 'dad', 'mother', 'father', 'mama', 'papa', 'parent', 'maman', 'papa', 'mere', 'pere', 'mère', 'père'],
    friend: ['friend', 'buddy', 'sidekick', 'companion', 'pal', 'ami', 'amie', 'copain', 'copine', 'compagnon', 'compagne', 'camarade'],
    animal: [
      'animal',
      'pet',
      'dog',
      'cat',
      'bird',
      'rabbit',
      'bear',
      'fox',
      'creature',
      'animal',
      'chien',
      'chat',
      'oiseau',
      'lapin',
      'ours',
      'renard',
      'creature',
      'loup',
      'souris'
    ],
    magical: [
      'magical',
      'fairy',
      'elf',
      'sprite',
      'unicorn',
      'magic',
      'enchanted',
      'magique',
      'fee',
      'elfe',
      'lutin',
      'licorne',
      'magie',
      'enchante',
      'fantastique'
    ]
  };

  for (const [archetype, keywords] of Object.entries(archetypeKeywords)) {
    if (keywords.some((keyword) => lowerDescription.includes(keyword))) {
      const voices = voiceIds![archetype as CharacterArchetype];
      return voices[gender]!;
    }
  }

  return voiceIds!.narrator[gender]!;
}

export async function runGenerateSpeechCommand(args: {
  text?: string;
  file?: string;
  voice: string;
  emotion: string;
  gender: 'male' | 'female';
  language: 'fr' | 'en';
  output?: string;
  storeDir?: string;
  save: boolean;
  envFile?: string;
  dryRun: boolean;
}): Promise<void> {
  loadEnv(args.envFile);

  // Load text from file or use inline text
  let text: string;
  if (args.file) {
    if (!existsSync(args.file)) {
      throw new Error(`File not found: ${args.file}`);
    }
    text = readFileSync(args.file, 'utf-8');
  } else if (args.text) {
    text = args.text;
  } else {
    throw new Error('Either --text or --file is required');
  }

  // Validate emotion
  const emotion = args.emotion as Emotion;
  if (!Object.values(Emotion).includes(emotion)) {
    throw new Error(`Invalid emotion "${emotion}". Valid options: ${Object.values(Emotion).join(', ')}`);
  }

  // Get voice ID for the specified language
  const voiceId = selectVoiceForCharacter(args.voice, args.gender, args.language);
  const voiceSettings = EMOTION_VOICE_SETTINGS[emotion];

  // Create run directory for artifacts
  const run = args.save
    ? createRunDir({
        rootDir: args.storeDir,
        namespace: 'tts',
        command: 'generate',
        labelParts: [args.voice, emotion]
      })
    : null;

  // Save input
  if (run) {
    writeJsonFile(run.runDir, 'input.json', {
      text,
      voice: args.voice,
      voiceId,
      emotion,
      gender: args.gender,
      language: args.language,
      voiceSettings
    });

    writeJsonFile(run.runDir, 'meta.json', {
      command: 'tts generate',
      voice: args.voice,
      voiceId,
      emotion,
      gender: args.gender,
      language: args.language,
      textLength: text.length,
      createdAt: new Date().toISOString(),
      dryRun: args.dryRun
    });
  }

  if (args.dryRun) {
    const _payload = {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      textLength: text.length,
      voice: args.voice,
      voiceId,
      emotion,
      gender: args.gender,
      language: args.language,
      voiceSettings,
      artifactsDir: run?.runDir
    };
    return;
  }

  // Initialize repository
  const logger = await Logger.create();
  const repository = new VoicesRepository(logger);
  const startTime = Date.now();

  const result = await repository.convertWithTimestamps({
    text,
    voiceId,
    voiceSettings
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // Save output
  if (run) {
    const outputFilename = args.output ?? 'output.mp3';
    const outputPath = path.join(run.runDir, outputFilename);
    writeFileSync(outputPath, result.audio);

    writeJsonFile(run.runDir, 'output.json', {
      durationSeconds: result.durationSeconds,
      bufferSize: result.audio.length,
      hasAlignment: !!result.alignment,
      generationTimeSeconds: parseFloat(elapsed),
      outputFile: outputFilename
    });
  } else {
    // If not saving, write to specified output or current dir
    const outputPath = args.output ?? 'output.mp3';
    writeFileSync(outputPath, result.audio);
  }
}
