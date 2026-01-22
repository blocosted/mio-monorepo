#!/usr/bin/env bun
/**
 * Pipeline CLI
 *
 * Full audio story generation pipeline orchestrator.
 *
 * Usage:
 *   bun run packages/scripts/src/pipeline/cli.ts <command> [options]
 *   nx run scripts:pipeline -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runFullStoryCommand } from './full-story';

yargs(hideBin(process.argv))
    .scriptName('pipeline')
    .usage('$0 <command> [options]')
    .command(
        'full-story',
        'Generate complete audio story from script (TTS + SFX + Ambiance + Music + Mix)',
        (y) =>
            y
                .option('scriptFile', {
                    type: 'string',
                    alias: 'f',
                    description: 'Path to StoryScript JSON file',
                    demandOption: true,
                })
                .option('language', {
                    type: 'string',
                    alias: 'l',
                    description: 'Language for voice selection (overrides script metadata)',
                    choices: ['fr', 'en'] as const,
                })
                .option('skipSfx', {
                    type: 'boolean',
                    description: 'Skip SFX generation even if segments present',
                    default: false,
                })
                .option('skipAmbiance', {
                    type: 'boolean',
                    description: 'Skip ambiance generation even if segments present',
                    default: false,
                })
                .option('skipMusic', {
                    type: 'boolean',
                    description: 'Skip music generation even if segments present',
                    default: false,
                })
                .option('autoMusic', {
                    type: 'boolean',
                    alias: 'a',
                    description: 'Generate automatic music cues if none in script',
                    default: false,
                })
                .option('pauseBetweenSegments', {
                    type: 'number',
                    alias: 'p',
                    description: 'Pause duration between voice segments (seconds)',
                    default: 0.5,
                })
                .option('musicVolume', {
                    type: 'number',
                    description: 'Music volume (0.0-1.0)',
                    default: 0.15,
                })
                .option('sfxVolume', {
                    type: 'number',
                    description: 'SFX volume (0.0-1.0)',
                    default: 0.8,
                })
                .option('ambianceVolume', {
                    type: 'number',
                    description: 'Ambiance volume (0.0-1.0)',
                    default: 0.3,
                })
                .option('storeDir', {
                    type: 'string',
                    description: 'Local directory to store outputs (gitignored)',
                    default: '.mio-data',
                })
                .option('envFile', {
                    type: 'string',
                    description: 'Optional dotenv file to load',
                })
                .option('dryRun', {
                    type: 'boolean',
                    description: 'Preview pipeline steps without executing',
                    default: false,
                }),
        async (argv) => {
            try {
                await runFullStoryCommand({
                    scriptFile: argv.scriptFile,
                    language: argv.language as 'fr' | 'en' | undefined,
                    skipSfx: argv.skipSfx,
                    skipAmbiance: argv.skipAmbiance,
                    skipMusic: argv.skipMusic,
                    autoMusic: argv.autoMusic,
                    pauseBetweenSegments: argv.pauseBetweenSegments,
                    musicVolume: argv.musicVolume,
                    sfxVolume: argv.sfxVolume,
                    ambianceVolume: argv.ambianceVolume,
                    storeDir: argv.storeDir,
                    envFile: argv.envFile,
                    dryRun: argv.dryRun,
                });
            } catch (error) {
                console.error('Error:', (error as Error).message);
                process.exit(1);
            }
        },
    )
    .demandCommand(1, 'You need to specify a command')
    .strict()
    .help()
    .alias('h', 'help')
    .example([
        ['$0 full-story -f ./script.json', 'Generate complete story from script'],
        ['$0 full-story -f ./script.json --autoMusic', 'Generate with automatic music cues'],
        ['$0 full-story -f ./script.json --skipSfx --skipAmbiance', 'Generate voice and music only'],
        ['$0 full-story -f ./script.json --dryRun', 'Preview pipeline steps'],
    ])
    .parse();
