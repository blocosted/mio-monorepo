/**
 * SFX Generate Command
 *
 * Generate a single sound effect from text description.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }
    loadEnvironmentFromProcessEnv({ override: true });
}

export interface GenerateCommandOptions {
    text: string;
    category?: string;
    duration?: number;
    promptInfluence: number;
    output?: string;
    storeDir: string;
    envFile?: string;
}

export async function runGenerateCommand(options: GenerateCommandOptions): Promise<void> {
    const { text, category, duration, promptInfluence, output, storeDir, envFile } = options;

    // Load environment variables
    loadEnv(envFile);

    console.log('\n=== SFX Generation ===\n');
    console.log('Text:', text);
    console.log('Category:', category ?? 'general');
    console.log('Duration:', duration ? `${duration}s` : 'auto');
    console.log('Prompt Influence:', promptInfluence);
    console.log('');

    // Dynamically import to ensure env is loaded first
    const { Logger } = await import('@mio/shared/server/logger');
    const { SoundEffectsRepository } = await import('@mio/api/repositories/audio');

    const logger = await Logger.create();
    const repository = new SoundEffectsRepository(logger);

    console.log('Generating sound effect...');
    const startTime = Date.now();

    const result = await repository.convert({
        text,
        durationSeconds: duration,
        promptInfluence,
    });

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nGeneration complete in ${elapsedTime}s`);
    console.log('Duration:', `${result.durationSeconds.toFixed(2)}s`);
    console.log('Size:', `${(result.audio.length / 1024).toFixed(2)} KB`);

    // Create output directory
    const dateStr = new Date().toISOString().split('T')[0] ?? 'unknown';
    const sfxDir = join(storeDir, 'sfx', dateStr);
    await mkdir(sfxDir, { recursive: true });

    // Generate output filename
    const sanitizedText = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
    const timestamp = Date.now();
    const outputPath = output ?? join(sfxDir, `${sanitizedText}-${timestamp}.mp3`);

    // Write audio file
    await writeFile(outputPath, result.audio);
    console.log('\nSaved to:', outputPath);

    // Write metadata
    const metadataPath = outputPath.replace('.mp3', '.json');
    const metadata = {
        text,
        category: category ?? 'general',
        durationSeconds: result.durationSeconds,
        promptInfluence,
        generatedAt: new Date().toISOString(),
        outputPath,
    };
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('Metadata:', metadataPath);
}
