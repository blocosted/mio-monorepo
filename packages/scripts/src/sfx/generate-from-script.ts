/**
 * Generate SFX from Script Command
 *
 * Generate all sound effect segments from a StoryScript JSON file.
 * Similar to TTS from-script but for SFX generation.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import type { SfxSegmentContent, StoryScript } from '@mio/shared/types';
import { SoundEffectsRepository } from '@mio/api/repositories/audio';
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
 * SFX segment info extracted from script
 */
interface SfxSegmentInfo {
  id: string;
  description: string;
  /** Estimated duration from script (actual startTime computed after TTS) */
  estimatedDuration: number;
  promptInfluence?: number;
}

/**
 * Extract SFX segments from a StoryScript
 */
function extractSfxSegments(script: StoryScript): SfxSegmentInfo[] {
  const segments: SfxSegmentInfo[] = [];

  for (const track of script.tracks) {
    if (track.type === 'sfx') {
      for (const segment of track.segments) {
        const content = segment.content as SfxSegmentContent;
        segments.push({
          id: segment.id,
          description: content.description,
          estimatedDuration: segment.estimatedDuration ?? 5,
          promptInfluence: content.promptInfluence
        });
      }
    }
  }

  return segments;
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

export interface GenerateFromScriptCommandArgs {
  scriptFile: string;
  storeDir?: string;
  save: boolean;
  envFile?: string;
  dryRun: boolean;
  promptInfluence?: number;
}

export async function runGenerateFromScriptCommand(args: GenerateFromScriptCommandArgs): Promise<void> {
  loadEnv(args.envFile);

  // Load script
  if (!existsSync(args.scriptFile)) {
    throw new Error(`Script file not found: ${args.scriptFile}`);
  }
  const scriptJson = readFileSync(args.scriptFile, 'utf-8');
  const parsed = JSON.parse(scriptJson);

  // Handle both direct StoryScript and wrapped format (from generate-script output.json)
  const script: StoryScript = parsed.script ?? parsed;

  // Extract SFX segments
  const sfxSegments = extractSfxSegments(script);

  if (sfxSegments.length === 0) {
    return;
  }

  // Create run directory for artifacts
  const run = args.save
    ? createRunDir({
      rootDir: args.storeDir,
      namespace: 'sfx',
      command: 'from-script',
      labelParts: [script.metadata.title.substring(0, 20)]
    })
    : null;

  // Save input
  if (run) {
    writeJsonFile(run.runDir, 'input.json', {
      scriptFile: args.scriptFile,
      storyTitle: script.metadata.title,
      segmentCount: sfxSegments.length,
      dryRun: args.dryRun
    });

    writeJsonFile(run.runDir, 'segments.json', sfxSegments);
  }

  for (const _seg of sfxSegments) {
  }

  if (args.dryRun) {
    const _payload = {
      storyTitle: script.metadata.title,
      segmentCount: sfxSegments.length,
      segments: sfxSegments.map((s) => ({
        id: s.id,
        description: s.description.substring(0, 50) + (s.description.length > 50 ? '...' : ''),
        estimatedDuration: s.estimatedDuration
      })),
      artifactsDir: run?.runDir
    };
    return;
  }

  // Initialize repository
  const logger = await Logger.create();
  const repository = new SoundEffectsRepository(logger);
  const startTime = Date.now();

  const results: Array<{
    id: string;
    success: boolean;
    estimatedDuration?: number;
    actualDuration?: number;
    error?: string;
    outputFile?: string;
    description: string;
  }> = [];

  for (const segment of sfxSegments) {
    try {
      const result = await repository.convert({
        text: segment.description,
        durationSeconds: segment.estimatedDuration,
        promptInfluence: args.promptInfluence ?? segment.promptInfluence ?? 0.3
      });

      const sanitizedDesc = sanitizeFilename(segment.description);
      const outputFilename = `${segment.id}-${sanitizedDesc}.mp3`;

      if (run) {
        const outputPath = path.join(run.runDir, outputFilename);
        writeFileSync(outputPath, result.audio);
      }

      results.push({
        id: segment.id,
        success: true,
        estimatedDuration: segment.estimatedDuration,
        actualDuration: result.durationSeconds,
        outputFile: outputFilename,
        description: segment.description
      });
    } catch (error) {
      results.push({
        id: segment.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        description: segment.description
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalDuration = results.filter((r) => r.actualDuration).reduce((sum, r) => sum + (r.actualDuration ?? 0), 0);

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
      command: 'sfx from-script',
      storyTitle: script.metadata.title,
      segmentCount: sfxSegments.length,
      successCount,
      failCount,
      totalDurationSeconds: totalDuration,
      generationTimeSeconds: parseFloat(elapsed),
      createdAt: new Date().toISOString()
    });
  }
}
