#!/usr/bin/env bun

/**
 * Music CLI
 *
 * Background music generation utilities using ElevenLabs API.
 *
 * Usage:
 *   bun run packages/scripts/src/music/cli.ts <command> [options]
 *   nx run scripts:music -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runGenerateCommand } from './generate';
import { runGenerateFromScriptCommand } from './generate-from-script';

const MOODS = ['calm', 'mysterious', 'adventurous', 'tense', 'joyful', 'sad', 'magical', 'serene'] as const;

yargs(hideBin(process.argv))
  .scriptName('music')
  .usage('$0 <command> [options]')
  .command(
    'generate',
    'Generate a single music track from a mood',
    (y) =>
      y
        .option('mood', {
          type: 'string',
          alias: 'm',
          description: 'Music mood',
          demandOption: true,
          choices: MOODS
        })
        .option('duration', {
          type: 'number',
          alias: 'd',
          description: 'Target duration in seconds',
          demandOption: true
        })
        .option('fadeInDuration', {
          type: 'number',
          description: 'Fade in duration in seconds (default: 2.0)'
        })
        .option('fadeOutDuration', {
          type: 'number',
          description: 'Fade out duration in seconds (default: 3.0)'
        })
        .option('volume', {
          type: 'number',
          alias: 'v',
          description: 'Volume level 0-1 (default: 0.15)'
        })
        .option('promptInfluence', {
          type: 'number',
          alias: 'p',
          description: 'How closely to follow the prompt (0-1)',
          default: 0.5
        })
        .option('customPrompt', {
          type: 'string',
          description: 'Custom prompt (overrides mood mapping)'
        })
        .option('output', {
          type: 'string',
          alias: 'o',
          description: 'Output file path (default: auto-generated)'
        })
        .option('storeDir', {
          type: 'string',
          description: 'Local directory to store outputs (gitignored)',
          default: '.mio-data'
        })
        .option('envFile', {
          type: 'string',
          description: 'Optional dotenv file to load'
        }),
    async (argv) => {
      try {
        await runGenerateCommand({
          mood: argv.mood as (typeof MOODS)[number],
          duration: argv.duration,
          fadeInDuration: argv.fadeInDuration,
          fadeOutDuration: argv.fadeOutDuration,
          volume: argv.volume,
          promptInfluence: argv.promptInfluence,
          customPrompt: argv.customPrompt,
          output: argv.output,
          storeDir: argv.storeDir,
          envFile: argv.envFile
        });
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  )
  .command(
    'from-script',
    'Generate all music segments from a StoryScript JSON file',
    (y) =>
      y
        .option('scriptFile', {
          type: 'string',
          alias: 'f',
          description: 'Path to StoryScript JSON file (or generate-script output.json)',
          demandOption: true
        })
        .option('autoMusic', {
          type: 'boolean',
          alias: 'a',
          description: 'Generate automatic music cues if none in script (intro/climax/outro)',
          default: false
        })
        .option('promptInfluence', {
          type: 'number',
          alias: 'p',
          description: 'How closely to follow the prompt (0-1, default: 0.5)'
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
          description: 'Print parameters without generating music',
          default: false
        }),
    async (argv) => {
      try {
        await runGenerateFromScriptCommand({
          scriptFile: argv.scriptFile,
          autoMusic: argv.autoMusic,
          promptInfluence: argv.promptInfluence,
          storeDir: argv.storeDir,
          save: argv.save,
          envFile: argv.envFile,
          dryRun: argv.dryRun
        });
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
    ['$0 generate -m calm -d 15', 'Generate 15s calm music'],
    ['$0 generate -m adventurous -d 30 --fadeInDuration 2', 'Generate 30s adventure music with 2s fade in'],
    ['$0 generate -m magical -d 20 --customPrompt "fairy tale music"', 'Generate with custom prompt'],
    ['$0 from-script -f ./output.json', 'Generate all music from a StoryScript'],
    ['$0 from-script -f ./script.json --autoMusic', 'Generate automatic music cues'],
    ['$0 from-script -f ./script.json --dryRun', 'Preview music without generating']
  ])
  .parse();
