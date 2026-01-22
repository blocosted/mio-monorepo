#!/usr/bin/env bun
/**
 * Audio Library CLI
 *
 * Manage the persistent audio library for SFX, Ambiance, and Music.
 *
 * Usage:
 *   bun run packages/scripts/src/library/cli.ts <command> [options]
 *   nx run scripts:library -- <command> [options]
 *
 * Commands:
 *   seed-sfx       Pre-generate SFX assets based on taxonomy
 *   seed-ambiance  Pre-generate Ambiance assets based on taxonomy
 *   seed-music     Pre-generate Music assets based on taxonomy
 *   stats          Show library statistics
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runSeedSfxCommand } from './seed-sfx';
import { runSeedAmbianceCommand } from './seed-ambiance';
import { runSeedMusicCommand } from './seed-music';
import { runStatsCommand } from './stats';

yargs(hideBin(process.argv))
    .scriptName('library')
    .usage('$0 <command> [options]')

    // === SEED SFX ===
    .command(
        'seed-sfx',
        'Pre-generate SFX assets based on taxonomy',
        (y) =>
            y
                .option('category', {
                    type: 'string',
                    alias: 'c',
                    description: 'Filter by category (ambient, effects, transitions, foley, creatures)',
                })
                .option('environment', {
                    type: 'string',
                    alias: 'e',
                    description: 'Filter by environment (indoor, outdoor, fantasy, urban, nature)',
                })
                .option('intensity', {
                    type: 'string',
                    alias: 'i',
                    description: 'Filter by intensity (subtle, medium, intense)',
                })
                .option('dryRun', {
                    type: 'boolean',
                    alias: 'd',
                    description: 'Show what would be generated without making API calls',
                    default: false,
                })
                .option('envFile', {
                    type: 'string',
                    description: 'Optional dotenv file to load',
                })
                .option('delayMs', {
                    type: 'number',
                    description: 'Delay between API calls in ms (rate limiting)',
                    default: 3000,
                })
                .option('maxItems', {
                    type: 'number',
                    alias: 'n',
                    description: 'Maximum number of items to generate',
                }),
        async (argv) => {
            try {
                await runSeedSfxCommand({
                    category: argv.category as any,
                    environment: argv.environment as any,
                    intensity: argv.intensity as any,
                    dryRun: argv.dryRun,
                    envFile: argv.envFile,
                    delayMs: argv.delayMs,
                    maxItems: argv.maxItems,
                });
            } catch (error) {
                console.error('Error:', (error as Error).message);
                process.exit(1);
            }
        },
    )

    // === SEED AMBIANCE ===
    .command(
        'seed-ambiance',
        'Pre-generate Ambiance assets based on taxonomy',
        (y) =>
            y
                .option('environment', {
                    type: 'string',
                    alias: 'e',
                    description: 'Filter by environment (forest, ocean, city, village, castle, cave, mountain, meadow, space, underwater)',
                })
                .option('timeOfDay', {
                    type: 'string',
                    alias: 't',
                    description: 'Filter by time of day (day, night, dawn, dusk, any)',
                })
                .option('weather', {
                    type: 'string',
                    alias: 'w',
                    description: 'Filter by weather (clear, rainy, stormy, snowy, foggy, any)',
                })
                .option('mood', {
                    type: 'string',
                    alias: 'm',
                    description: 'Filter by mood (peaceful, mysterious, tense, magical, adventurous)',
                })
                .option('dryRun', {
                    type: 'boolean',
                    alias: 'd',
                    description: 'Show what would be generated without making API calls',
                    default: false,
                })
                .option('envFile', {
                    type: 'string',
                    description: 'Optional dotenv file to load',
                })
                .option('delayMs', {
                    type: 'number',
                    description: 'Delay between API calls in ms (rate limiting)',
                    default: 3000,
                })
                .option('maxItems', {
                    type: 'number',
                    alias: 'n',
                    description: 'Maximum number of items to generate',
                }),
        async (argv) => {
            try {
                await runSeedAmbianceCommand({
                    environment: argv.environment as any,
                    timeOfDay: argv.timeOfDay as any,
                    weather: argv.weather as any,
                    mood: argv.mood as any,
                    dryRun: argv.dryRun,
                    envFile: argv.envFile,
                    delayMs: argv.delayMs,
                    maxItems: argv.maxItems,
                });
            } catch (error) {
                console.error('Error:', (error as Error).message);
                process.exit(1);
            }
        },
    )

    // === SEED MUSIC ===
    .command(
        'seed-music',
        'Pre-generate Music assets based on taxonomy',
        (y) =>
            y
                .option('mood', {
                    type: 'string',
                    alias: 'm',
                    description: 'Filter by mood (calm, mysterious, adventurous, tense, joyful, sad, magical, serene)',
                })
                .option('intensity', {
                    type: 'string',
                    alias: 'i',
                    description: 'Filter by intensity (soft, medium, epic)',
                })
                .option('tempo', {
                    type: 'string',
                    alias: 't',
                    description: 'Filter by tempo (slow, medium, fast)',
                })
                .option('dryRun', {
                    type: 'boolean',
                    alias: 'd',
                    description: 'Show what would be generated without making API calls',
                    default: false,
                })
                .option('envFile', {
                    type: 'string',
                    description: 'Optional dotenv file to load',
                })
                .option('delayMs', {
                    type: 'number',
                    description: 'Delay between API calls in ms (rate limiting)',
                    default: 3000,
                })
                .option('maxItems', {
                    type: 'number',
                    alias: 'n',
                    description: 'Maximum number of items to generate',
                }),
        async (argv) => {
            try {
                await runSeedMusicCommand({
                    mood: argv.mood as any,
                    intensity: argv.intensity as any,
                    tempo: argv.tempo as any,
                    dryRun: argv.dryRun,
                    envFile: argv.envFile,
                    delayMs: argv.delayMs,
                    maxItems: argv.maxItems,
                });
            } catch (error) {
                console.error('Error:', (error as Error).message);
                process.exit(1);
            }
        },
    )

    // === STATS ===
    .command(
        'stats',
        'Show library statistics',
        (y) =>
            y
                .option('json', {
                    type: 'boolean',
                    alias: 'j',
                    description: 'Output as JSON',
                    default: false,
                })
                .option('envFile', {
                    type: 'string',
                    description: 'Optional dotenv file to load',
                }),
        async (argv) => {
            try {
                await runStatsCommand({
                    json: argv.json,
                    envFile: argv.envFile,
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
    .version('1.0.0')
    .alias('v', 'version')
    .parse();
