/**
 * Generate Ambiance Command
 *
 * Generate a single ambient sound from text description.
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

import { SoundEffectsRepository } from '@mio/api/repositories/audio';
import { AmbianceGeneratorService } from '@mio/api/services/ambiance';

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
 * Generate a safe filename from description
 */
function sanitizeFilename(text: string, maxLength = 30): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, maxLength);
}

export interface GenerateCommandArgs {
    text: string;
    duration: number;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    volume?: number;
    promptInfluence?: number;
    output?: string;
    storeDir?: string;
    envFile?: string;
}

export async function runGenerateCommand(args: GenerateCommandArgs): Promise<void> {
    loadEnv(args.envFile);

    const logger = await Logger.create();

    // Create SoundEffectsRepository first (required by AmbianceGeneratorService)
    const sfxProvider = new SoundEffectsRepository(logger);
    const ambianceService = new AmbianceGeneratorService(logger, sfxProvider);

    // Create run directory for artifacts
    const run = createRunDir({
        rootDir: args.storeDir,
        namespace: 'ambiance',
        command: 'generate',
        labelParts: [sanitizeFilename(args.text, 20)],
    });

    // Save input
    writeJsonFile(run.runDir, 'input.json', {
        text: args.text,
        duration: args.duration,
        fadeInDuration: args.fadeInDuration,
        fadeOutDuration: args.fadeOutDuration,
        volume: args.volume,
        promptInfluence: args.promptInfluence,
    });

    console.log(`Generating ambiance: "${args.text.substring(0, 50)}${args.text.length > 50 ? '...' : ''}"`);
    console.log(`Target duration: ${args.duration}s`);
    console.log('');

    const startTime = Date.now();

    const result = await ambianceService.generate({
        description: args.text,
        targetDurationSeconds: args.duration,
        fadeInDuration: args.fadeInDuration,
        fadeOutDuration: args.fadeOutDuration,
        volume: args.volume,
        promptInfluence: args.promptInfluence,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // Save output
    const sanitizedDesc = sanitizeFilename(args.text);
    const outputFilename = args.output ?? `ambiance-${sanitizedDesc}.mp3`;
    const outputPath = path.join(run.runDir, outputFilename);
    writeFileSync(outputPath, result.audio);

    writeJsonFile(run.runDir, 'output.json', {
        durationSeconds: result.durationSeconds,
        looped: result.looped,
        sourceClipDurationSeconds: result.sourceClipDurationSeconds,
        generationTimeSeconds: parseFloat(elapsed),
        outputFile: outputFilename,
    });

    writeJsonFile(run.runDir, 'meta.json', {
        command: 'ambiance generate',
        text: args.text,
        targetDuration: args.duration,
        actualDuration: result.durationSeconds,
        looped: result.looped,
        generationTimeSeconds: parseFloat(elapsed),
        createdAt: new Date().toISOString(),
    });

    console.log(`Generation complete:`);
    console.log(JSON.stringify({
        durationSeconds: result.durationSeconds.toFixed(2),
        looped: result.looped,
        sourceClipDurationSeconds: result.sourceClipDurationSeconds.toFixed(2),
        generationTimeSeconds: elapsed,
        outputFile: outputPath,
        artifactsDir: run.runDir,
    }, null, 2));
}
