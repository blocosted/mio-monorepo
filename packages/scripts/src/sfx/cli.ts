#!/usr/bin/env bun

/**
 * SFX CLI
 *
 * Sound effects generation utilities using ElevenLabs API.
 *
 * Usage:
 *   bun run packages/scripts/src/sfx/cli.ts <command> [options]
 *   nx run scripts:sfx -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runBatchCommand } from './batch';
import { runGenerateCommand } from './generate';
import { runGenerateFromScriptCommand } from './generate-from-script';

yargs(hideBin(process.argv))
  .scriptName('sfx')
  .usage('$0 <command> [options]')
  .command(
    'generate',
    'Generate a single sound effect from text description',
    (y) =>
      y
        .option('text', {
          type: 'string',
          alias: 't',
          description: 'Text description of the sound effect',
          demandOption: true
        })
        .option('category', {
          type: 'string',
          alias: 'c',
          description: 'Category (ambient, effects, transitions, foley, creatures, music)',
          choices: ['ambient', 'effects', 'transitions', 'foley', 'creatures', 'music']
        })
        .option('duration', {
          type: 'number',
          alias: 'd',
          description: 'Duration in seconds (0.5-22)'
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
          category: argv.category as string | undefined,
          duration: argv.duration,
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
    'batch',
    'Generate multiple sound effects from a JSON file',
    (y) =>
      y
        .option('input', {
          type: 'string',
          alias: 'i',
          description: 'Path to JSON file with SFX descriptions',
          demandOption: true
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
        await runBatchCommand({
          input: argv.input,
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
    'Generate all SFX segments from a StoryScript JSON file',
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
          description: 'How closely to follow the prompt (0-1, default: from script or 0.3)'
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
          description: 'Print parameters without generating SFX',
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
    ['$0 generate -t "heavy rain with thunder"', 'Generate rain sound effect'],
    ['$0 generate -t "door slam" -c effects -d 2', 'Generate 2s door slam'],
    ['$0 generate -t "forest ambiance" -c ambient -d 10', 'Generate 10s forest ambiance'],
    ['$0 batch -i sfx-list.json', 'Generate SFX from JSON file'],
    ['$0 from-script -f ./output.json', 'Generate all SFX from a StoryScript'],
    ['$0 from-script -f ./script.json --dryRun', 'Preview SFX without generating']
  ])
  .parse();
