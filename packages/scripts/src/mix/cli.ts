#!/usr/bin/env bun

/**
 * Mix CLI
 *
 * Audio mixing utilities for combining TTS outputs with music, ambiance, and SFX.
 *
 * Usage:
 *   bun run packages/scripts/src/mix/cli.ts <command> [options]
 *   nx run scripts:mix -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import type { IStorageService } from '@mio/api/services/storage';

import { runMixStoryCommand } from './mix-story';

yargs(hideBin(process.argv))
  .scriptName('mix')
  .usage('$0 <command> [options]')
  .command(
    'story',
    'Mix voice segments from a TTS run with optional music, ambiance, and SFX',
    (y) =>
      y
        .option('ttsRunDir', {
          type: 'string',
          alias: 'd',
          description: 'Path to TTS run directory (from tts from-script)',
          demandOption: true
        })
        .option('music', {
          type: 'string',
          alias: 'm',
          description: 'Path to background music file'
        })
        .option('musicVolume', {
          type: 'number',
          description: 'Music volume (0.0-1.0)',
          default: 0.15
        })
        .option('enableDucking', {
          type: 'boolean',
          description: 'Enable sidechain compression (ducking) on music',
          default: true
        })
        .option('ambiance', {
          type: 'string',
          alias: 'a',
          description: 'Path to ambiance/atmosphere file'
        })
        .option('ambianceVolume', {
          type: 'number',
          description: 'Ambiance volume (0.0-1.0)',
          default: 0.3
        })
        .option('loopAmbiance', {
          type: 'boolean',
          description: 'Loop ambiance to match story length',
          default: true
        })
        .option('sfx', {
          type: 'array',
          alias: 's',
          description: 'Paths to SFX files'
        })
        .option('sfxTimings', {
          type: 'array',
          description: 'Start times for SFX files (seconds)'
        })
        .option('sfxVolume', {
          type: 'number',
          description: 'SFX volume (0.0-1.0)',
          default: 0.8
        })
        .option('sfxRunDir', {
          type: 'string',
          description: 'Path to SFX generation run directory (auto-loads files and timings)'
        })
        .option('ambianceRunDir', {
          type: 'string',
          description: 'Path to ambiance generation run directory (auto-loads files)'
        })
        .option('musicRunDir', {
          type: 'string',
          description: 'Path to music generation run directory (auto-loads files)'
        })
        .option('pauseBetweenSegments', {
          type: 'number',
          alias: 'p',
          description: 'Pause duration between voice segments (seconds)',
          default: 0.5
        })
        .option('outputBitrate', {
          type: 'string',
          alias: 'b',
          description: 'Output MP3 bitrate',
          default: '192k'
        })
        .option('storeDir', {
          type: 'string',
          description: 'Local directory to store outputs (gitignored)',
          default: '.mio-data'
        })
        .option('save', {
          type: 'boolean',
          description: 'Write artifacts to disk',
          default: true
        })
        .option('envFile', {
          type: 'string',
          description: 'Optional dotenv file to load'
        })
        .option('dryRun', {
          type: 'boolean',
          description: 'Print parameters without mixing',
          default: false
        })
        // Auto-music options
        .option('autoMusic', {
          type: 'boolean',
          description: 'Enable automatic music generation (punctual cues at intro/climax/outro)',
          default: false
        })
        .option('musicLibraryDir', {
          type: 'string',
          description: 'Path to music library directory (required with --auto-music)'
        })
        .option('musicStrategy', {
          type: 'string',
          choices: ['punctual', 'continuous', 'minimal'] as const,
          description: 'Music strategy: punctual (intro/climax/outro), continuous, or minimal',
          default: 'punctual'
        }),
    async (argv) => {
      try {
        await runMixStoryCommand({
          ttsRunDir: argv.ttsRunDir,
          music: argv.music,
          musicVolume: argv.musicVolume,
          enableDucking: argv.enableDucking,
          ambiance: argv.ambiance,
          ambianceVolume: argv.ambianceVolume,
          loopAmbiance: argv.loopAmbiance,
          sfx: argv.sfx as string[] | undefined,
          sfxTimings: argv.sfxTimings as number[] | undefined,
          sfxVolume: argv.sfxVolume,
          sfxRunDir: argv.sfxRunDir,
          ambianceRunDir: argv.ambianceRunDir,
          musicRunDir: argv.musicRunDir,
          pauseBetweenSegments: argv.pauseBetweenSegments,
          outputBitrate: argv.outputBitrate,
          storeDir: argv.storeDir,
          save: argv.save,
          envFile: argv.envFile,
          dryRun: argv.dryRun,
          autoMusic: argv.autoMusic,
          musicLibraryDir: argv.musicLibraryDir,
          musicStrategy: argv.musicStrategy as 'punctual' | 'continuous' | 'minimal' | undefined
        });
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  )
  .command(
    'verify',
    'Verify FFmpeg installation and codecs',
    (y) => y,
    async () => {
      try {
        const { Logger } = await import('@mio/shared/server/logger');
        const { FFmpegMixerService } = await import('@mio/api/services/audio-mixing');

        const logger = await Logger.create();
        const mockStorage: IStorageService = {
          download: async () => Buffer.from(''),
          upload: async () => ({ path: '', url: '' }),
          delete: async () => {
            /* mock */
          },
          deleteMany: async () => {
            /* mock */
          },
          getPublicUrl: () => '',
          exists: async () => true
        };

        const mixerService = new FFmpegMixerService(logger, mockStorage);
        const _result = await mixerService.verifyFFmpegInstalled();
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, 'You need to specify a command')
  .strict()
  .help()
  .alias('h', 'help')
  .example([
    ['$0 story -d .mio-data/tts/from-script/2026-01-21/run-abc', 'Mix voice-only story'],
    ['$0 story -d ./tts-run -m ./music.mp3', 'Mix with background music'],
    ['$0 story -d ./tts-run -m ./music.mp3 -a ./forest.mp3', 'Mix with music and ambiance'],
    ['$0 story -d ./tts-run --sfxRunDir ./sfx-run', 'Mix with SFX from run directory'],
    ['$0 story -d ./tts-run --sfxRunDir ./sfx --ambianceRunDir ./amb', 'Mix with SFX and ambiance from runs'],
    ['$0 story -d ./tts-run --musicRunDir ./music-run', 'Mix with music from run directory'],
    ['$0 story -d ./tts-run --auto-music --music-library-dir ./music-lib', 'Mix with auto-generated music cues'],
    ['$0 story -d ./tts-run --dryRun', 'Preview mix parameters'],
    ['$0 verify', 'Check FFmpeg installation']
  ])
  .parse();
