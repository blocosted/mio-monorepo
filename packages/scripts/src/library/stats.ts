/**
 * Audio Library Stats Command
 *
 * Display statistics about the audio library contents and usage.
 */

import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }
    loadEnvironmentFromProcessEnv({ override: true });
}

export interface StatsCommandOptions {
    json: boolean;
    envFile?: string;
}

export async function runStatsCommand(options: StatsCommandOptions): Promise<void> {
    loadEnv(options.envFile);

    // Dynamic imports after env is loaded
    const { Logger } = await import('@mio/shared/server/logger');
    const { createCliServices } = await import('./factory');

    const logger = await Logger.create();
    const services = await createCliServices(logger);

    const stats = await services.getStats();

    if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
    }

    console.log('\n=== Audio Library Statistics ===\n');

    // === SFX Stats ===
    console.log('--- SFX Library ---');
    console.log(`Total: ${stats.sfx.total} assets`);

    if (Object.keys(stats.sfx.byCategory).length > 0) {
        console.log('\nBy Category:');
        for (const [category, count] of Object.entries(stats.sfx.byCategory)) {
            const countNum = count as number;
            const pct = stats.sfx.total > 0 ? ((countNum / stats.sfx.total) * 100).toFixed(1) : '0';
            console.log(`  ${category}: ${countNum} (${pct}%)`);
        }
    }

    if (Object.keys(stats.sfx.byEnvironment).length > 0) {
        console.log('\nBy Environment:');
        for (const [env, count] of Object.entries(stats.sfx.byEnvironment)) {
            const countNum = count as number;
            const pct = stats.sfx.total > 0 ? ((countNum / stats.sfx.total) * 100).toFixed(1) : '0';
            console.log(`  ${env}: ${countNum} (${pct}%)`);
        }
    }

    // === Ambiance Stats ===
    console.log('\n--- Ambiance Library ---');
    console.log(`Total: ${stats.ambiance.total} assets`);

    if (Object.keys(stats.ambiance.byEnvironment).length > 0) {
        console.log('\nBy Environment:');
        for (const [env, count] of Object.entries(stats.ambiance.byEnvironment)) {
            const countNum = count as number;
            const pct = stats.ambiance.total > 0 ? ((countNum / stats.ambiance.total) * 100).toFixed(1) : '0';
            console.log(`  ${env}: ${countNum} (${pct}%)`);
        }
    }

    if (Object.keys(stats.ambiance.byMood).length > 0) {
        console.log('\nBy Mood:');
        for (const [mood, count] of Object.entries(stats.ambiance.byMood)) {
            const countNum = count as number;
            const pct = stats.ambiance.total > 0 ? ((countNum / stats.ambiance.total) * 100).toFixed(1) : '0';
            console.log(`  ${mood}: ${countNum} (${pct}%)`);
        }
    }

    // === Music Stats ===
    console.log('\n--- Music Library ---');
    console.log(`Total: ${stats.music.total} assets`);

    if (Object.keys(stats.music.byMood).length > 0) {
        console.log('\nBy Mood:');
        for (const [mood, count] of Object.entries(stats.music.byMood)) {
            const countNum = count as number;
            const pct = stats.music.total > 0 ? ((countNum / stats.music.total) * 100).toFixed(1) : '0';
            console.log(`  ${mood}: ${countNum} (${pct}%)`);
        }
    }

    if (Object.keys(stats.music.byIntensity).length > 0) {
        console.log('\nBy Intensity:');
        for (const [intensity, count] of Object.entries(stats.music.byIntensity)) {
            const countNum = count as number;
            const pct = stats.music.total > 0 ? ((countNum / stats.music.total) * 100).toFixed(1) : '0';
            console.log(`  ${intensity}: ${countNum} (${pct}%)`);
        }
    }

    // === Top Used Assets ===
    console.log('\n--- Most Used Assets ---');

    if (stats.topUsed.sfx.length > 0) {
        console.log('\nTop SFX:');
        for (const item of stats.topUsed.sfx.slice(0, 5)) {
            console.log(`  ${item.canonicalKey}: ${item.usageCount} uses`);
        }
    }

    if (stats.topUsed.ambiance.length > 0) {
        console.log('\nTop Ambiance:');
        for (const item of stats.topUsed.ambiance.slice(0, 5)) {
            console.log(`  ${item.canonicalKey}: ${item.usageCount} uses`);
        }
    }

    if (stats.topUsed.music.length > 0) {
        console.log('\nTop Music:');
        for (const item of stats.topUsed.music.slice(0, 5)) {
            console.log(`  ${item.canonicalKey}: ${item.usageCount} uses`);
        }
    }

    // === Summary ===
    const totalAssets = stats.sfx.total + stats.ambiance.total + stats.music.total;
    console.log('\n--- Summary ---');
    console.log(`Total Library Assets: ${totalAssets}`);

    // Calculate total usage
    const totalUsage =
        stats.topUsed.sfx.reduce((sum: number, item: any) => sum + item.usageCount, 0) +
        stats.topUsed.ambiance.reduce((sum: number, item: any) => sum + item.usageCount, 0) +
        stats.topUsed.music.reduce((sum: number, item: any) => sum + item.usageCount, 0);

    console.log(`Total Reuse Count: ${totalUsage}`);

    // Estimate savings (assuming $0.01 per API call)
    const estimatedSavings = totalUsage * 0.01;
    console.log(`Estimated Savings: $${estimatedSavings.toFixed(2)}`);

    // Coverage indicators
    console.log('\n--- Coverage ---');
    const sfxTargetCount = 80; // ~80 SFX variations target
    const ambianceTargetCount = 60; // ~60 ambiance variations target
    const musicTargetCount = 60; // ~60 music variations target

    const sfxCoverage = Math.min(100, (stats.sfx.total / sfxTargetCount) * 100);
    const ambianceCoverage = Math.min(100, (stats.ambiance.total / ambianceTargetCount) * 100);
    const musicCoverage = Math.min(100, (stats.music.total / musicTargetCount) * 100);

    console.log(`SFX: ${stats.sfx.total}/${sfxTargetCount} (${sfxCoverage.toFixed(0)}%)`);
    console.log(`Ambiance: ${stats.ambiance.total}/${ambianceTargetCount} (${ambianceCoverage.toFixed(0)}%)`);
    console.log(`Music: ${stats.music.total}/${musicTargetCount} (${musicCoverage.toFixed(0)}%)`);

    console.log('');
}
