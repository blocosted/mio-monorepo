#!/usr/bin/env bun
/**
 * LLM CLI
 *
 * Local utilities to exercise LLM features from the command line.
 *
 * Usage:
 *   bun run packages/scripts/src/llm/cli.ts <command> [options]
 *   nx run scripts:llm -- <command> [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runEnrichStoryCommand } from './enrich-story.ts';

yargs(hideBin(process.argv))
    .scriptName('llm')
    .usage('$0 <command> [options]')
    .command(
        'enrich-story',
        'Call the LLM enrichment pipeline for a test profile',
        (y) =>
            y
                .option('inputFile', {
                    type: 'string',
                    description:
                        'Path to a previously saved input.json (overrides --prompt/--profile)',
                })
                .option('prompt', {
                    type: 'string',
                    description: 'Initial story idea to enrich',
                    default: 'A child finds a mysterious door in a tree.',
                })
                .option('profile', {
                    type: 'string',
                    description: 'Which built-in test profile to use',
                    default: 'emilie',
                    choices: ['emilie', 'leo', 'sam'],
                })
                .option('all', {
                    type: 'boolean',
                    description: 'Run enrichment for all built-in test profiles',
                    default: false,
                })
                .option('storeDir', {
                    type: 'string',
                    description: 'Local directory to store inputs/outputs (gitignored)',
                    default: '.mio-data',
                })
                .option('save', {
                    type: 'boolean',
                    description: 'Write input/output artifacts to disk',
                    default: true,
                })
                .option('envFile', {
                    type: 'string',
                    description:
                        'Optional dotenv file to load (default: tries .env.local then .env if present)',
                })
                .option('model', {
                    type: 'string',
                    description: 'LLM model (default: OpenAI service default)',
                })
                .option('maxTokens', {
                    type: 'number',
                    description: 'Max tokens for completion (default: OpenAI service default)',
                })
                .option('temperature', {
                    type: 'number',
                    description: 'Sampling temperature (0-1) (default: OpenAI service default)',
                })
                .option('timeout', {
                    type: 'number',
                    description: 'Timeout in ms (default: OpenAI service default)',
                })
                .option('dryRun', {
                    type: 'boolean',
                    description: 'Print prompts without calling the LLM provider',
                    default: false,
                }),
        async (argv) => {
            try {
                await runEnrichStoryCommand({
                    prompt: argv.prompt,
                    profile: argv.profile,
                    all: argv.all,
                    inputFile: argv.inputFile,
                    storeDir: argv.storeDir,
                    save: argv.save,
                    envFile: argv.envFile,
                    options: {
                        model: argv.model,
                        maxTokens: argv.maxTokens,
                        temperature: argv.temperature,
                        timeout: argv.timeout,
                    },
                    dryRun: argv.dryRun,
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

