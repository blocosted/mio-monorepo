/**
 * Generate Music Command
 *
 * Generate a single music track from a mood.
 */

import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import type { MusicMood } from '@mio/shared/types';
import { SoundEffectsRepository } from '@mio/api/repositories/audio';
import { MusicGeneratorService } from '@mio/api/services/music';
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

export interface GenerateCommandArgs {
  mood: MusicMood;
  duration: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  volume?: number;
  promptInfluence?: number;
  customPrompt?: string;
  output?: string;
  storeDir?: string;
  envFile?: string;
}

export async function runGenerateCommand(args: GenerateCommandArgs): Promise<void> {
  loadEnv(args.envFile);

  const logger = await Logger.create();

  // Create SoundEffectsRepository first (required by MusicGeneratorService)
  const sfxProvider = new SoundEffectsRepository(logger);
  const musicService = new MusicGeneratorService(logger, sfxProvider);

  // Create run directory for artifacts
  const run = createRunDir({
    rootDir: args.storeDir,
    namespace: 'music',
    command: 'generate',
    labelParts: [args.mood]
  });

  // Save input
  writeJsonFile(run.runDir, 'input.json', {
    mood: args.mood,
    duration: args.duration,
    fadeInDuration: args.fadeInDuration,
    fadeOutDuration: args.fadeOutDuration,
    volume: args.volume,
    promptInfluence: args.promptInfluence,
    customPrompt: args.customPrompt
  });

  // Show the prompt that will be used
  const _promptToUse = args.customPrompt ?? musicService.getPromptForMood(args.mood);

  const startTime = Date.now();

  const result = await musicService.generate({
    mood: args.mood,
    targetDurationSeconds: args.duration,
    fadeInDuration: args.fadeInDuration,
    fadeOutDuration: args.fadeOutDuration,
    volume: args.volume,
    promptInfluence: args.promptInfluence,
    customPrompt: args.customPrompt
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // Save output
  const outputFilename = args.output ?? `music-${args.mood}.mp3`;
  const outputPath = path.join(run.runDir, outputFilename);
  writeFileSync(outputPath, result.audio);

  writeJsonFile(run.runDir, 'output.json', {
    durationSeconds: result.durationSeconds,
    looped: result.looped,
    sourceClipDurationSeconds: result.sourceClipDurationSeconds,
    promptUsed: result.promptUsed,
    generationTimeSeconds: parseFloat(elapsed),
    outputFile: outputFilename
  });

  writeJsonFile(run.runDir, 'meta.json', {
    command: 'music generate',
    mood: args.mood,
    targetDuration: args.duration,
    actualDuration: result.durationSeconds,
    looped: result.looped,
    generationTimeSeconds: parseFloat(elapsed),
    createdAt: new Date().toISOString()
  });
}
