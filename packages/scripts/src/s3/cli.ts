#!/usr/bin/env bun
/**
 * S3/Storage CLI
 *
 * Manage Supabase Storage buckets from the command line.
 *
 * Usage:
 *   bun run packages/scripts/src/s3/cli.ts <command> [options]
 *   nx run scripts:s3 -- <command> [options]
 *
 * Commands:
 *   setup       Create all buckets defined in config
 *   list        List all existing buckets
 *   show <name> Show details of a specific bucket
 *   delete <name> [-f] Delete a bucket (use -f to force delete with files)
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { listBuckets, setupBuckets, deleteBucket, showBucket } from './commands';

yargs(hideBin(process.argv))
    .scriptName('s3')
    .usage('$0 <command> [options]')
    .command(
        'setup',
        'Create all buckets defined in config',
        () => {
            // No additional options for setup command
        },
        async () => {
            try {
                await setupBuckets();
            } catch (error) {
                console.error('❌ Error:', (error as Error).message);
                process.exit(1);
            }
        }
    )
    .command(
        'list',
        'List all existing buckets',
        () => {
            // No additional options for list command
        },
        async () => {
            try {
                await listBuckets();
            } catch (error) {
                console.error('❌ Error:', (error as Error).message);
                process.exit(1);
            }
        }
    )
    .command(
        'show <name>',
        'Show details of a specific bucket',
        (yargs) => {
            return yargs.positional('name', {
                describe: 'Bucket name',
                type: 'string',
                demandOption: true,
            });
        },
        async (argv) => {
            try {
                await showBucket(argv.name as string);
            } catch (error) {
                console.error('❌ Error:', (error as Error).message);
                process.exit(1);
            }
        }
    )
    .command(
        'delete <name>',
        'Delete a bucket',
        (yargs) => {
            return yargs
                .positional('name', {
                    describe: 'Bucket name',
                    type: 'string',
                    demandOption: true,
                })
                .option('force', {
                    alias: 'f',
                    type: 'boolean',
                    description: 'Force delete (removes all files first)',
                    default: false,
                });
        },
        async (argv) => {
            try {
                await deleteBucket(argv.name as string, argv.force);
            } catch (error) {
                console.error('❌ Error:', (error as Error).message);
                process.exit(1);
            }
        }
    )
    .demandCommand(1, 'You need to specify a command')
    .strict()
    .help()
    .alias('h', 'help')
    .version('1.0.0')
    .alias('v', 'version')
    .parse();
