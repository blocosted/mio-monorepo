/**
 * Full Story Pipeline Command
 *
 * Orchestrates the complete audio story generation pipeline:
 * 1. TTS generation from script
 * 2. SFX generation from script (if segments present)
 * 3. Ambiance generation from script (if segments present)
 * 4. Music generation from script (with auto-music option)
 * 5. Final mix combining all tracks
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

import type { StoryScript } from '@mio/shared/types';
import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';

import { createRunDir, writeJsonFile } from '../_local-run-store/run-store';
import { runGenerateFromScriptCommand as runAmbianceFromScript } from '../ambiance/generate-from-script';
import { runMixStoryCommand } from '../mix/mix-story';
import { runGenerateFromScriptCommand as runMusicFromScript } from '../music/generate-from-script';
import { runGenerateFromScriptCommand as runSfxFromScript } from '../sfx/generate-from-script';
import { runGenerateFromScriptCommand as runTtsFromScript } from '../tts/generate-from-script';

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
 * Check what tracks are present in the script
 */
function analyzeScript(script: StoryScript): {
  hasVoice: boolean;
  hasSfx: boolean;
  hasAmbiance: boolean;
  hasMusic: boolean;
  voiceCount: number;
  sfxCount: number;
  ambianceCount: number;
  musicCount: number;
} {
  let voiceCount = 0;
  let sfxCount = 0;
  let ambianceCount = 0;
  let musicCount = 0;

  for (const track of script.tracks) {
    switch (track.type) {
      case 'voice':
        voiceCount += track.segments.length;
        break;
      case 'sfx':
        sfxCount += track.segments.length;
        break;
      case 'ambiance':
        ambianceCount += track.segments.length;
        break;
      case 'music':
        musicCount += track.segments.length;
        break;
    }
  }

  return {
    hasVoice: voiceCount > 0,
    hasSfx: sfxCount > 0,
    hasAmbiance: ambianceCount > 0,
    hasMusic: musicCount > 0,
    voiceCount,
    sfxCount,
    ambianceCount,
    musicCount
  };
}

export interface FullStoryCommandArgs {
  scriptFile: string;
  language?: 'fr' | 'en';
  storeDir?: string;
  envFile?: string;
  dryRun: boolean;
  // Optional overrides
  skipSfx?: boolean;
  skipAmbiance?: boolean;
  skipMusic?: boolean;
  autoMusic?: boolean;
  pauseBetweenSegments?: number;
  musicVolume?: number;
  sfxVolume?: number;
  ambianceVolume?: number;
}

export async function runFullStoryCommand(args: FullStoryCommandArgs): Promise<void> {
  loadEnv(args.envFile);

  // Load script
  if (!existsSync(args.scriptFile)) {
    throw new Error(`Script file not found: ${args.scriptFile}`);
  }
  const scriptJson = readFileSync(args.scriptFile, 'utf-8');
  const parsed = JSON.parse(scriptJson);
  const script: StoryScript = parsed.script ?? parsed;

  // Analyze script
  const analysis = analyzeScript(script);
  const language = args.language ?? (script.metadata.language as 'fr' | 'en') ?? 'fr';

  if (!analysis.hasVoice) {
    throw new Error('Script has no voice segments. Cannot generate story.');
  }

  // Create main pipeline run directory
  const pipelineRun = createRunDir({
    rootDir: args.storeDir,
    namespace: 'pipeline',
    command: 'full-story',
    labelParts: [script.metadata.title.substring(0, 20)]
  });

  // Save pipeline input
  writeJsonFile(pipelineRun.runDir, 'input.json', {
    scriptFile: args.scriptFile,
    storyTitle: script.metadata.title,
    language,
    analysis,
    options: {
      skipSfx: args.skipSfx,
      skipAmbiance: args.skipAmbiance,
      skipMusic: args.skipMusic,
      autoMusic: args.autoMusic,
      pauseBetweenSegments: args.pauseBetweenSegments
    },
    dryRun: args.dryRun
  });

  const steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
    runDir?: string;
    error?: string;
  }> = [
      { name: 'TTS Generation', status: 'pending' },
      { name: 'SFX Generation', status: analysis.hasSfx && !args.skipSfx ? 'pending' : 'skipped' },
      { name: 'Ambiance Generation', status: analysis.hasAmbiance && !args.skipAmbiance ? 'pending' : 'skipped' },
      { name: 'Music Generation', status: (analysis.hasMusic || args.autoMusic) && !args.skipMusic ? 'pending' : 'skipped' },
      { name: 'Final Mix', status: 'pending' }
    ];

  // Helper to safely access steps array
  const getStep = (index: number) => {
    const step = steps[index];
    if (!step) {
      throw new Error(`Step at index ${index} not found`);
    }
    return step;
  };

  const printSteps = () => {
    for (const step of steps) {
      const _icon =
        step.status === 'success'
          ? '[OK]'
          : step.status === 'failed'
            ? '[FAIL]'
            : step.status === 'running'
              ? '[...]'
              : step.status === 'skipped'
                ? '[SKIP]'
                : '[ ]';
    }
  };

  if (args.dryRun) {
    printSteps();
    return;
  }

  const startTime = Date.now();
  let ttsRunDir: string | undefined;
  let sfxRunDir: string | undefined;
  let ambianceRunDir: string | undefined;
  let musicRunDir: string | undefined;
  const ttsStep = steps[0];
  if (ttsStep) {
    ttsStep.status = 'running';
  }

  try {
    // We need to capture the run directory from TTS
    // Run TTS and get the run directory path from storeDir
    const ttsStoreDir = path.join(pipelineRun.runDir, 'tts');
    await runTtsFromScript({
      scriptFile: args.scriptFile,
      language,
      storeDir: ttsStoreDir,
      save: true,
      envFile: args.envFile,
      dryRun: false
    });

    // Find the TTS run directory (most recent in ttsStoreDir)
    const ttsNamespace = path.join(ttsStoreDir, 'tts', 'from-script');
    if (existsSync(ttsNamespace)) {
      const dateDirs = require('node:fs').readdirSync(ttsNamespace).sort().reverse();
      if (dateDirs[0]) {
        const dateDir = path.join(ttsNamespace, dateDirs[0]);
        const runDirs = require('node:fs').readdirSync(dateDir).sort().reverse();
        if (runDirs[0]) {
          ttsRunDir = path.join(dateDir, runDirs[0]);
        }
      }
    }

    getStep(0).status = 'success';
    getStep(0).runDir = ttsRunDir;
  } catch (error) {
    getStep(0).status = 'failed';
    getStep(0).error = error instanceof Error ? error.message : String(error);
    printSteps();
    throw new Error(`TTS generation failed: ${getStep(0).error}`);
  }

  // Step 2: SFX Generation
  if (getStep(1).status === 'pending') {
    getStep(1).status = 'running';

    try {
      const sfxStoreDir = path.join(pipelineRun.runDir, 'sfx');
      await runSfxFromScript({
        scriptFile: args.scriptFile,
        storeDir: sfxStoreDir,
        save: true,
        envFile: args.envFile,
        dryRun: false
      });

      // Find the SFX run directory
      const sfxNamespace = path.join(sfxStoreDir, 'sfx', 'from-script');
      if (existsSync(sfxNamespace)) {
        const dateDirs = require('node:fs').readdirSync(sfxNamespace).sort().reverse();
        if (dateDirs[0]) {
          const dateDir = path.join(sfxNamespace, dateDirs[0]);
          const runDirs = require('node:fs').readdirSync(dateDir).sort().reverse();
          if (runDirs[0]) {
            sfxRunDir = path.join(dateDir, runDirs[0]);
          }
        }
      }

      getStep(1).status = 'success';
      getStep(1).runDir = sfxRunDir;
    } catch (error) {
      getStep(1).status = 'failed';
      getStep(1).error = error instanceof Error ? error.message : String(error);
      // Continue without SFX
    }
  }

  // Step 3: Ambiance Generation
  if (getStep(2).status === 'pending') {
    getStep(2).status = 'running';

    try {
      const ambianceStoreDir = path.join(pipelineRun.runDir, 'ambiance');
      await runAmbianceFromScript({
        scriptFile: args.scriptFile,
        storeDir: ambianceStoreDir,
        save: true,
        envFile: args.envFile,
        dryRun: false
      });

      // Find the ambiance run directory
      const ambianceNamespace = path.join(ambianceStoreDir, 'ambiance', 'from-script');
      if (existsSync(ambianceNamespace)) {
        const dateDirs = require('node:fs').readdirSync(ambianceNamespace).sort().reverse();
        if (dateDirs[0]) {
          const dateDir = path.join(ambianceNamespace, dateDirs[0]);
          const runDirs = require('node:fs').readdirSync(dateDir).sort().reverse();
          if (runDirs[0]) {
            ambianceRunDir = path.join(dateDir, runDirs[0]);
          }
        }
      }

      getStep(2).status = 'success';
      getStep(2).runDir = ambianceRunDir;
    } catch (error) {
      getStep(2).status = 'failed';
      getStep(2).error = error instanceof Error ? error.message : String(error);
      // Continue without ambiance
    }
  }

  // Step 4: Music Generation
  if (getStep(3).status === 'pending') {
    getStep(3).status = 'running';

    try {
      const musicStoreDir = path.join(pipelineRun.runDir, 'music');
      await runMusicFromScript({
        scriptFile: args.scriptFile,
        storeDir: musicStoreDir,
        save: true,
        envFile: args.envFile,
        dryRun: false,
        autoMusic: args.autoMusic
      });

      // Find the music run directory
      const musicNamespace = path.join(musicStoreDir, 'music', 'from-script');
      if (existsSync(musicNamespace)) {
        const dateDirs = require('node:fs').readdirSync(musicNamespace).sort().reverse();
        if (dateDirs[0]) {
          const dateDir = path.join(musicNamespace, dateDirs[0]);
          const runDirs = require('node:fs').readdirSync(dateDir).sort().reverse();
          if (runDirs[0]) {
            musicRunDir = path.join(dateDir, runDirs[0]);
          }
        }
      }

      getStep(3).status = 'success';
      getStep(3).runDir = musicRunDir;
    } catch (error) {
      getStep(3).status = 'failed';
      getStep(3).error = error instanceof Error ? error.message : String(error);
      // Continue without music
    }
  }

  // Step 5: Final Mix
  if (!ttsRunDir) {
    throw new Error('TTS run directory not found. Cannot proceed with mix.');
  }
  getStep(4).status = 'running';

  try {
    const mixStoreDir = path.join(pipelineRun.runDir, 'mix');
    await runMixStoryCommand({
      ttsRunDir,
      sfxRunDir,
      ambianceRunDir,
      musicRunDir,
      musicVolume: args.musicVolume,
      sfxVolume: args.sfxVolume,
      ambianceVolume: args.ambianceVolume,
      pauseBetweenSegments: args.pauseBetweenSegments,
      storeDir: mixStoreDir,
      save: true,
      envFile: args.envFile,
      dryRun: false
    });

    // Find the mix run directory
    const mixNamespace = path.join(mixStoreDir, 'mix', 'mix-story');
    if (existsSync(mixNamespace)) {
      const dateDirs = require('node:fs').readdirSync(mixNamespace).sort().reverse();
      if (dateDirs[0]) {
        const dateDir = path.join(mixNamespace, dateDirs[0]);
        const runDirs = require('node:fs').readdirSync(dateDir).sort().reverse();
        if (runDirs[0]) {
          getStep(4).runDir = path.join(dateDir, runDirs[0]);
        }
      }
    }

    getStep(4).status = 'success';
  } catch (error) {
    getStep(4).status = 'failed';
    getStep(4).error = error instanceof Error ? error.message : String(error);
    printSteps();
    throw new Error(`Final mix failed: ${getStep(4).error}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // Save pipeline output
  writeJsonFile(pipelineRun.runDir, 'output.json', {
    storyTitle: script.metadata.title,
    pipelineTimeSeconds: parseFloat(elapsed),
    steps: steps.map((s) => ({
      name: s.name,
      status: s.status,
      runDir: s.runDir ? path.relative(pipelineRun.runDir, s.runDir) : undefined,
      error: s.error
    })),
    finalMixDir: steps[4]?.runDir ? path.relative(pipelineRun.runDir, steps[4].runDir) : undefined
  });

  writeJsonFile(pipelineRun.runDir, 'meta.json', {
    command: 'pipeline full-story',
    storyTitle: script.metadata.title,
    language,
    analysis,
    pipelineTimeSeconds: parseFloat(elapsed),
    createdAt: new Date().toISOString()
  });
  printSteps();

  // Show final mix location
  if (steps[4]?.runDir) {
    const finalMixPath = path.join(steps[4].runDir, 'mixed-story.mp3');
    if (existsSync(finalMixPath)) {
    }
  }
}
