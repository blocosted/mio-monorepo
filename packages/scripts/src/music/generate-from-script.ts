/**
 * Generate Music from Script Command
 *
 * Generate all music segments from a StoryScript JSON file.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import type { MusicCue } from '@mio/api/services/music';
import type { MusicMood, MusicSegmentContent, StoryScript } from '@mio/shared/types';
import { SoundEffectsRepository } from '@mio/api/repositories/audio';
import { MusicGeneratorService, MusicStrategyService } from '@mio/api/services/music';
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
 * Music segment info extracted from script
 */
interface MusicSegmentInfo {
  id: string;
  mood: MusicMood;
  startTime: number;
  duration: number;
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

/**
 * Extract music segments from a StoryScript
 */
function extractMusicSegments(script: StoryScript, logger: Logger): MusicSegmentInfo[] {
  const segments: MusicSegmentInfo[] = [];
  const musicStrategyService = new MusicStrategyService(logger);

  for (const track of script.tracks) {
    if (track.type === 'music') {
      for (const segment of track.segments) {
        const content = segment.content as MusicSegmentContent;
        segments.push({
          id: segment.id,
          mood: musicStrategyService.normalizeMood(content.mood),
          startTime: segment.startTime,
          duration: segment.duration,
          fadeInDuration: content.fadeInDuration,
          fadeOutDuration: content.fadeOutDuration
        });
      }
    }
  }

  return segments;
}

export interface GenerateFromScriptCommandArgs {
  scriptFile: string;
  storeDir?: string;
  save: boolean;
  envFile?: string;
  dryRun: boolean;
  promptInfluence?: number;
  autoMusic?: boolean;
}

export async function runGenerateFromScriptCommand(args: GenerateFromScriptCommandArgs): Promise<void> {
  loadEnv(args.envFile);

  // Initialize logger first
  const logger = await Logger.create();

  // Load script
  if (!existsSync(args.scriptFile)) {
    throw new Error(`Script file not found: ${args.scriptFile}`);
  }
  const scriptJson = readFileSync(args.scriptFile, 'utf-8');
  const parsed = JSON.parse(scriptJson);

  // Handle both direct StoryScript and wrapped format (from generate-script output.json)
  const script: StoryScript = parsed.script ?? parsed;

  // Extract music segments from script
  let musicSegments = extractMusicSegments(script, logger);

  // If no music segments and --autoMusic is set, generate using MusicStrategyService
  if (musicSegments.length === 0 && args.autoMusic) {
    const musicStrategyService = new MusicStrategyService(logger);
    const totalDuration = script.metadata.actualDuration ?? script.metadata.targetDuration;

    const strategyResult = musicStrategyService.generateMusicCues({
      totalDuration,
      strategy: 'punctual'
    });

    // Convert cues to segment info
    musicSegments = strategyResult.cues.map((cue: MusicCue, index: number) => ({
      id: `auto-music-${index + 1}`,
      mood: cue.mood,
      startTime: cue.startTime,
      duration: cue.duration,
      volume: cue.volume,
      fadeInDuration: cue.fadeIn,
      fadeOutDuration: cue.fadeOut
    }));
  }

  if (musicSegments.length === 0) {
    return;
  }

  // Create run directory for artifacts
  const run = args.save
    ? createRunDir({
        rootDir: args.storeDir,
        namespace: 'music',
        command: 'from-script',
        labelParts: [script.metadata.title.substring(0, 20)]
      })
    : null;

  // Save input
  if (run) {
    writeJsonFile(run.runDir, 'input.json', {
      scriptFile: args.scriptFile,
      storyTitle: script.metadata.title,
      segmentCount: musicSegments.length,
      dryRun: args.dryRun,
      autoMusic: args.autoMusic
    });

    writeJsonFile(run.runDir, 'segments.json', musicSegments);
  }

  for (const _seg of musicSegments) {
  }

  if (args.dryRun) {
    const _payload = {
      storyTitle: script.metadata.title,
      segmentCount: musicSegments.length,
      segments: musicSegments.map((s) => ({
        id: s.id,
        mood: s.mood,
        startTime: s.startTime,
        duration: s.duration
      })),
      artifactsDir: run?.runDir
    };
    return;
  }

  // Initialize services
  const sfxProvider = new SoundEffectsRepository(logger);
  const musicService = new MusicGeneratorService(logger, sfxProvider);
  const startTime = Date.now();

  const results: Array<{
    id: string;
    success: boolean;
    mood: string;
    durationSeconds?: number;
    actualDuration?: number;
    startTime: number;
    error?: string;
    outputFile?: string;
    looped?: boolean;
  }> = [];

  for (const segment of musicSegments) {
    try {
      const result = await musicService.generate({
        mood: segment.mood,
        targetDurationSeconds: segment.duration,
        fadeInDuration: segment.fadeInDuration,
        fadeOutDuration: segment.fadeOutDuration,
        volume: segment.volume,
        promptInfluence: args.promptInfluence
      });

      const outputFilename = `${segment.id}-${segment.mood}.mp3`;

      if (run) {
        const outputPath = path.join(run.runDir, outputFilename);
        writeFileSync(outputPath, result.audio);
      }

      results.push({
        id: segment.id,
        success: true,
        mood: segment.mood,
        durationSeconds: segment.duration,
        actualDuration: result.durationSeconds,
        startTime: segment.startTime,
        outputFile: outputFilename,
        looped: result.looped
      });
    } catch (error) {
      results.push({
        id: segment.id,
        success: false,
        mood: segment.mood,
        startTime: segment.startTime,
        error: error instanceof Error ? error.message : String(error)
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
      command: 'music from-script',
      storyTitle: script.metadata.title,
      segmentCount: musicSegments.length,
      successCount,
      failCount,
      totalDurationSeconds: totalDuration,
      generationTimeSeconds: parseFloat(elapsed),
      createdAt: new Date().toISOString()
    });
  }
}
