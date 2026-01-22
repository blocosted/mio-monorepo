/**
 * Generate Ambiance from Script Command
 *
 * Generate all ambiance segments from a StoryScript JSON file.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';
import type { StoryScript, AmbianceSegmentContent } from '@mio/shared/models';

import {
    createRunDir,
    writeJsonFile,
} from '../_local-run-store/run-store';

import { SoundEffectsRepository } from '@mio/api/repositories/audio';
import { AmbianceGeneratorService } from '@mio/api/services/ambiance';

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
 * Ambiance segment info extracted from script
 */
interface AmbianceSegmentInfo {
    id: string;
    description: string;
    startTime: number;
    duration: number;
    volume?: number;
    fadeInDuration?: number;
}

/**
 * Extract ambiance segments from a StoryScript
 */
function extractAmbianceSegments(script: StoryScript): AmbianceSegmentInfo[] {
    const segments: AmbianceSegmentInfo[] = [];

    for (const track of script.tracks) {
        if (track.type === 'ambiance') {
            for (const segment of track.segments) {
                const content = segment.content as AmbianceSegmentContent;
                segments.push({
                    id: segment.id,
                    description: content.description,
                    startTime: segment.startTime,
                    duration: segment.duration,
                    volume: content.volume,
                    fadeInDuration: content.fadeInDuration,
                });
            }
        }
    }

    return segments;
}

/**
 * Generate a safe filename from description
 */
function sanitizeFilename(text: string, maxLength = 30): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, maxLength);
}

export interface GenerateFromScriptCommandArgs {
    scriptFile: string;
    storeDir?: string;
    save: boolean;
    envFile?: string;
    dryRun: boolean;
    promptInfluence?: number;
}

export async function runGenerateFromScriptCommand(args: GenerateFromScriptCommandArgs): Promise<void> {
    loadEnv(args.envFile);

    // Load script
    if (!existsSync(args.scriptFile)) {
        throw new Error(`Script file not found: ${args.scriptFile}`);
    }
    const scriptJson = readFileSync(args.scriptFile, 'utf-8');
    const parsed = JSON.parse(scriptJson);

    // Handle both direct StoryScript and wrapped format (from generate-script output.json)
    const script: StoryScript = parsed.script ?? parsed;

    // Extract ambiance segments
    const ambianceSegments = extractAmbianceSegments(script);

    if (ambianceSegments.length === 0) {
        console.log('No ambiance segments found in script.');
        return;
    }

    // Create run directory for artifacts
    const run = args.save
        ? createRunDir({
            rootDir: args.storeDir,
            namespace: 'ambiance',
            command: 'from-script',
            labelParts: [script.metadata.title.substring(0, 20)],
        })
        : null;

    // Save input
    if (run) {
        writeJsonFile(run.runDir, 'input.json', {
            scriptFile: args.scriptFile,
            storyTitle: script.metadata.title,
            segmentCount: ambianceSegments.length,
            dryRun: args.dryRun,
        });

        writeJsonFile(run.runDir, 'segments.json', ambianceSegments);
    }

    console.log(`Found ${ambianceSegments.length} ambiance segments in script "${script.metadata.title}"`);
    console.log('');

    for (const seg of ambianceSegments) {
        console.log(`  [${seg.id}] ${seg.description.substring(0, 50)}${seg.description.length > 50 ? '...' : ''}`);
        console.log(`          @ ${seg.startTime.toFixed(1)}s for ${seg.duration.toFixed(1)}s`);
    }
    console.log('');

    if (args.dryRun) {
        const payload = {
            storyTitle: script.metadata.title,
            segmentCount: ambianceSegments.length,
            segments: ambianceSegments.map(s => ({
                id: s.id,
                description: s.description.substring(0, 50) + (s.description.length > 50 ? '...' : ''),
                startTime: s.startTime,
                duration: s.duration,
            })),
            artifactsDir: run?.runDir,
        };
        console.log('[DRY RUN] Ambiance generation parameters:');
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    // Initialize services
    const logger = await Logger.create();
    const sfxProvider = new SoundEffectsRepository(logger);
    const ambianceService = new AmbianceGeneratorService(logger, sfxProvider);

    console.log('Generating ambiance for all segments...\n');
    const startTime = Date.now();

    const results: Array<{
        id: string;
        success: boolean;
        durationSeconds?: number;
        actualDuration?: number;
        startTime: number;
        error?: string;
        outputFile?: string;
        description: string;
        looped?: boolean;
    }> = [];

    for (const segment of ambianceSegments) {
        try {
            const result = await ambianceService.generate({
                description: segment.description,
                targetDurationSeconds: segment.duration,
                fadeInDuration: segment.fadeInDuration,
                volume: segment.volume,
                promptInfluence: args.promptInfluence,
            });

            const sanitizedDesc = sanitizeFilename(segment.description);
            const outputFilename = `${segment.id}-${sanitizedDesc}.mp3`;

            if (run) {
                const outputPath = path.join(run.runDir, outputFilename);
                writeFileSync(outputPath, result.audio);
            }

            results.push({
                id: segment.id,
                success: true,
                durationSeconds: segment.duration,
                actualDuration: result.durationSeconds,
                startTime: segment.startTime,
                outputFile: outputFilename,
                description: segment.description,
                looped: result.looped,
            });

            console.log(`  [OK] ${segment.id} (${result.durationSeconds.toFixed(2)}s${result.looped ? ', looped' : ''}) - ${segment.description.substring(0, 40)}...`);
        } catch (error) {
            results.push({
                id: segment.id,
                success: false,
                startTime: segment.startTime,
                error: error instanceof Error ? error.message : String(error),
                description: segment.description,
            });
            console.log(`  [FAIL] ${segment.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalDuration = results
        .filter(r => r.actualDuration)
        .reduce((sum, r) => sum + (r.actualDuration ?? 0), 0);

    // Save output
    if (run) {
        writeJsonFile(run.runDir, 'output.json', {
            successCount,
            failCount,
            totalDurationSeconds: totalDuration,
            generationTimeSeconds: parseFloat(elapsed),
            results,
        });

        writeJsonFile(run.runDir, 'meta.json', {
            command: 'ambiance from-script',
            storyTitle: script.metadata.title,
            segmentCount: ambianceSegments.length,
            successCount,
            failCount,
            totalDurationSeconds: totalDuration,
            generationTimeSeconds: parseFloat(elapsed),
            createdAt: new Date().toISOString(),
        });
    }

    console.log(`\nGeneration complete:`);
    console.log(JSON.stringify({
        successCount,
        failCount,
        totalDurationSeconds: totalDuration.toFixed(2),
        generationTimeSeconds: elapsed,
        artifactsDir: run?.runDir,
    }, null, 2));
}
