#!/usr/bin/env bun

/**
 * TTS CLI
 *
 * Local utilities to exercise TTS features from the command line.
 *
 * Usage:
 *   bun run packages/scripts/src/tts/cli.ts <command> [options]
 *   nx run scripts:tts -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runGenerateFromScriptCommand } from './generate-from-script';
import { runGenerateSpeechCommand } from './generate-speech';
import { runListVoicesCommand } from './list-voices';
import { runSyncVoicesCommand } from './sync-voices';
import { runTestEmotionsCommand } from './test-emotions';

yargs(hideBin(process.argv))
  .scriptName('tts')
  .usage('$0 <command> [options]')
  .command(
    'generate',
    'Generate speech from text',
    (y) =>
      y
        .option('text', {
          type: 'string',
          alias: 't',
          description: 'Text to convert to speech (inline)'
        })
        .option('file', {
          type: 'string',
          alias: 'f',
          description: 'Path to text file to convert'
        })
        .option('voice', {
          type: 'string',
          alias: 'v',
          description: 'Voice archetype',
          default: 'narrator',
          choices: ['narrator', 'childHero', 'wiseCharacter', 'villain', 'comedic', 'parent', 'friend', 'animal', 'magical']
        })
        .option('emotion', {
          type: 'string',
          alias: 'e',
          description: 'Emotion for delivery',
          default: 'neutral',
          choices: ['neutral', 'happy', 'sad', 'excited', 'scared', 'angry', 'surprised', 'curious', 'calm']
        })
        .option('gender', {
          type: 'string',
          alias: 'g',
          description: 'Voice gender',
          default: 'female',
          choices: ['male', 'female']
        })
        .option('language', {
          type: 'string',
          alias: 'l',
          description: 'Language for voice selection',
          default: 'fr',
          choices: ['fr', 'en']
        })
        .option('output', {
          type: 'string',
          alias: 'o',
          description: 'Output file path (relative to storeDir)'
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
          description: 'Print parameters without calling the TTS API',
          default: false
        })
        .check((argv) => {
          if (!argv.text && !argv.file) {
            throw new Error('Either --text or --file is required');
          }
          return true;
        }),
    async (argv) => {
      try {
        await runGenerateSpeechCommand({
          text: argv.text,
          file: argv.file,
          voice: argv.voice,
          emotion: argv.emotion as string,
          gender: argv.gender as 'male' | 'female',
          language: argv.language as 'fr' | 'en',
          output: argv.output,
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
  .command(
    'from-script',
    'Generate all voice segments from a StoryScript JSON file',
    (y) =>
      y
        .option('scriptFile', {
          type: 'string',
          alias: 's',
          description: 'Path to StoryScript JSON file',
          demandOption: true
        })
        .option('language', {
          type: 'string',
          alias: 'l',
          description: 'Language for voice selection (overrides script metadata)',
          choices: ['fr', 'en']
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
          description: 'Parse script without generating audio',
          default: false
        }),
    async (argv) => {
      try {
        await runGenerateFromScriptCommand({
          scriptFile: argv.scriptFile,
          language: argv.language as 'fr' | 'en' | undefined,
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
  .command(
    'list-voices',
    'List available ElevenLabs voices',
    (y) =>
      y
        .option('json', {
          type: 'boolean',
          alias: 'j',
          description: 'Output as JSON',
          default: false
        })
        .option('envFile', {
          type: 'string',
          description: 'Optional dotenv file to load'
        }),
    async (argv) => {
      try {
        await runListVoicesCommand({
          json: argv.json,
          envFile: argv.envFile
        });
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  )
  .command(
    'sync-voices',
    'Sync ElevenLabs voices from API to database',
    (y) =>
      y
        .option('source', {
          type: 'string',
          alias: 's',
          description: 'Voice library source to sync from',
          default: 'shared',
          choices: ['shared', 'personal']
        })
        .option('json', {
          type: 'boolean',
          alias: 'j',
          description: 'Output as JSON',
          default: false
        })
        .option('envFile', {
          type: 'string',
          description: 'Optional dotenv file to load'
        }),
    async (argv) => {
      try {
        await runSyncVoicesCommand({
          source: argv.source as 'shared' | 'personal',
          json: argv.json,
          envFile: argv.envFile
        });
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  )
  .command(
    'test-emotions',
    'Generate audio samples for all emotions with the same text',
    (y) =>
      y
        .option('text', {
          type: 'string',
          alias: 't',
          description: 'Text to use for all samples',
          default: 'Le dragon deployait ses ailes majestueuses et prenait son envol vers le ciel etoile.'
        })
        .option('voice', {
          type: 'string',
          alias: 'v',
          description: 'Voice archetype',
          default: 'narrator'
        })
        .option('gender', {
          type: 'string',
          alias: 'g',
          description: 'Voice gender',
          default: 'female',
          choices: ['male', 'female']
        })
        .option('language', {
          type: 'string',
          alias: 'l',
          description: 'Language for voice selection',
          default: 'fr',
          choices: ['fr', 'en']
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
          description: 'Print parameters without calling the TTS API',
          default: false
        }),
    async (argv) => {
      try {
        await runTestEmotionsCommand({
          text: argv.text,
          voice: argv.voice,
          gender: argv.gender as 'male' | 'female',
          language: argv.language as 'fr' | 'en',
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
  .parse();
