/**
 * Generate Music Command
 *
 * Generate a single music track from a mood.
 */

import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import {
    createRunDir,
    writeJsonFile,
} from '../_local-run-store/run-store';

import { SoundEffectsProvider } from '@mio/api/services/audio';
import { MusicGeneratorService, type MusicMood } from '@mio/api/services/audio';

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

    // Create SoundEffectsProvider first (required by MusicGeneratorService)
    const sfxProvider = new SoundEffectsProvider(logger as any);
    const musicService = new MusicGeneratorService(logger as any, sfxProvider);

    // Create run directory for artifacts
    const run = createRunDir({
        rootDir: args.storeDir,
        namespace: 'music',
        command: 'generate',
        labelParts: [args.mood],
    });

    // Save input
    writeJsonFile(run.runDir, 'input.json', {
        mood: args.mood,
        duration: args.duration,
        fadeInDuration: args.fadeInDuration,
        fadeOutDuration: args.fadeOutDuration,
        volume: args.volume,
        promptInfluence: args.promptInfluence,
        customPrompt: args.customPrompt,
    });

    // Show the prompt that will be used
    const promptToUse = args.customPrompt ?? musicService.getPromptForMood(args.mood);
    console.log(`Generating music:`);
    console.log(`  Mood: ${args.mood}`);
    console.log(`  Target duration: ${args.duration}s`);
    console.log(`  Prompt: "${promptToUse.substring(0, 60)}${promptToUse.length > 60 ? '...' : ''}"`);
    console.log('');

    const startTime = Date.now();

    const result = await musicService.generate({
        mood: args.mood,
        targetDurationSeconds: args.duration,
        fadeInDuration: args.fadeInDuration,
        fadeOutDuration: args.fadeOutDuration,
        volume: args.volume,
        promptInfluence: args.promptInfluence,
        customPrompt: args.customPrompt,
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
        outputFile: outputFilename,
    });

    writeJsonFile(run.runDir, 'meta.json', {
        command: 'music generate',
        mood: args.mood,
        targetDuration: args.duration,
        actualDuration: result.durationSeconds,
        looped: result.looped,
        generationTimeSeconds: parseFloat(elapsed),
        createdAt: new Date().toISOString(),
    });

    console.log(`Generation complete:`);
    console.log(JSON.stringify({
        mood: result.mood,
        durationSeconds: result.durationSeconds.toFixed(2),
        looped: result.looped,
        sourceClipDurationSeconds: result.sourceClipDurationSeconds.toFixed(2),
        generationTimeSeconds: elapsed,
        outputFile: outputPath,
        artifactsDir: run.runDir,
    }, null, 2));
}
