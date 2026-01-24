/**
 * SFX Batch Command
 *
 * Generate multiple sound effects from a JSON file.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

export interface BatchSfxItem {
  id: string;
  text: string;
  category?: string;
  durationSeconds?: number;
  promptInfluence?: number;
}

export interface BatchCommandOptions {
  input: string;
  storeDir: string;
  envFile?: string;
}

export async function runBatchCommand(options: BatchCommandOptions): Promise<void> {
  const { input, storeDir, envFile } = options;

  // Load environment variables
  loadEnv(envFile);

  // Load input file
  const inputContent = await readFile(input, 'utf-8');
  const items: BatchSfxItem[] = JSON.parse(inputContent);

  // Dynamically import to ensure env is loaded first
  const { Logger } = await import('@mio/shared/server/logger');
  const { SoundEffectsRepository } = await import('@mio/api/repositories/audio');

  const logger = await Logger.create();
  const repository = new SoundEffectsRepository(logger);

  // Create output directory
  const dateStr = new Date().toISOString().split('T')[0] ?? 'unknown';
  const runId = `batch-${Date.now()}`;
  const outputDir = join(storeDir, 'sfx', dateStr, runId);
  await mkdir(outputDir, { recursive: true });

  const results: Array<{
    id: string;
    success: boolean;
    path?: string;
    durationSeconds?: number;
    error?: string;
  }> = [];

  const startTime = Date.now();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    try {
      const result = await repository.convert({
        text: item.text,
        durationSeconds: item.durationSeconds,
        promptInfluence: item.promptInfluence ?? 0.3
      });

      // Generate filename
      const sanitizedText = item.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 30);
      const filename = `${item.id}-${sanitizedText}.mp3`;
      const outputPath = join(outputDir, filename);

      // Write audio file
      await writeFile(outputPath, result.audio);

      results.push({
        id: item.id,
        success: true,
        path: outputPath,
        durationSeconds: result.durationSeconds
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        id: item.id,
        success: false,
        error: errorMessage
      });
    }
  }

  const _totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const totalDuration = results.filter((r) => r.success).reduce((sum, r) => sum + (r.durationSeconds ?? 0), 0);

  // Write manifest
  const manifestPath = join(outputDir, 'manifest.json');
  const manifest = {
    input,
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    successCount,
    failureCount,
    totalDurationSeconds: totalDuration,
    results
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
