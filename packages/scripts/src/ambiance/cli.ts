#!/usr/bin/env bun

/**
 * Ambiance CLI
 *
 * Ambient sound generation utilities using ElevenLabs API.
 *
 * Usage:
 *   bun run packages/scripts/src/ambiance/cli.ts <command> [options]
 *   nx run scripts:ambiance -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runGenerateCommand } from './generate';
import { runGenerateFromScriptCommand } from './generate-from-script';

yargs(hideBin(process.argv))
  .scriptName('ambiance')
  .usage('$0 <command> [options]')
  .command(
    'generate',
    'Generate a single ambient sound from text description',
    (y) =>
      y
        .option('text', {
          type: 'string',
          alias: 't',
          description: 'Text description of the ambient sound',
          demandOption: true
        })
        .option('duration', {
          type: 'number',
          alias: 'd',
          description: 'Target duration in seconds',
          demandOption: true
        })
        .option('fadeInDuration', {
          type: 'number',
          description: 'Fade in duration in seconds (default: 1.0)'
        })
        .option('fadeOutDuration', {
          type: 'number',
          description: 'Fade out duration in seconds (default: 2.0)'
        })
        .option('volume', {
          type: 'number',
          alias: 'v',
          description: 'Volume level 0-1 (default: 0.3)'
        })
        .option('promptInfluence', {
          type: 'number',
          alias: 'p',
          description: 'How closely to follow the prompt (0-1)',
          default: 0.3
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
          text: argv.text,
          duration: argv.duration,
          fadeInDuration: argv.fadeInDuration,
          fadeOutDuration: argv.fadeOutDuration,
          volume: argv.volume,
          promptInfluence: argv.promptInfluence,
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
    'Generate all ambiance segments from a StoryScript JSON file',
    (y) =>
      y
        .option('scriptFile', {
          type: 'string',
          alias: 'f',
          description: 'Path to StoryScript JSON file (or generate-script output.json)',
          demandOption: true
        })
        .option('promptInfluence', {
          type: 'number',
          alias: 'p',
          description: 'How closely to follow the prompt (0-1, default: 0.3)'
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
          description: 'Print parameters without generating ambiance',
          default: false
        }),
    async (argv) => {
      try {
        await runGenerateFromScriptCommand({
          scriptFile: argv.scriptFile,
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
    ['$0 generate -t "soft forest rain" -d 30', 'Generate 30s forest rain ambiance'],
    ['$0 generate -t "busy cafe with chatter" -d 60 --fadeInDuration 2', 'Generate 60s cafe ambiance with 2s fade in'],
    ['$0 from-script -f ./output.json', 'Generate all ambiance from a StoryScript'],
    ['$0 from-script -f ./script.json --dryRun', 'Preview ambiance without generating']
  ])
  .parse();
