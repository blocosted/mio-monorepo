/**
 * Sync Voices Command
 *
 * Synchronize ElevenLabs voices from API to database.
 * This avoids repeated API calls for voice validation.
 */

import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { initializeContainer, getInstance, IocService } from '@mio/api/ioc';
import type { IVoiceRegistryService } from '@mio/api/services/narration';

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }
    loadEnvironmentFromProcessEnv({ override: true });
}

export interface SyncVoicesArgs {
    envFile?: string;
    json?: boolean;
}

export async function runSyncVoicesCommand(args: SyncVoicesArgs): Promise<void> {
    loadEnv(args.envFile);

    console.log('Initializing services...');

    // Initialize IoC container
    await initializeContainer();

    // Get VoiceRegistry service
    const voiceRegistry = getInstance<IVoiceRegistryService>(IocService.VOICE_REGISTRY);

    // Check last sync time
    const lastSync = await voiceRegistry.getLastSyncTime();
    if (lastSync) {
        console.log(`Last sync: ${lastSync.toISOString()}`);
    } else {
        console.log('No previous sync found.');
    }

    console.log('\nSynchronizing voices from ElevenLabs API...\n');

    // Sync voices
    const result = await voiceRegistry.syncFromApi();

    if (args.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    // Display results
    console.log('Sync Results:');
    console.log('='.repeat(40));
    console.log(`  Added:   ${result.added}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Removed: ${result.removed}`);
    console.log(`  Total:   ${result.total}`);
    console.log('='.repeat(40));

    // List all synced voices
    const voices = await voiceRegistry.getAllVoices();

    console.log(`\nSynced Voices (${voices.length} total):`);
    console.log('-'.repeat(80));
    console.log(`${'Voice ID'.padEnd(30)} | ${'Name'.padEnd(25)} | Labels`);
    console.log('-'.repeat(80));

    for (const voice of voices) {
        const labels = voice.labels
            ? Object.entries(voice.labels)
                .map(([k, v]) => `${k}:${v}`)
                .join(', ')
            : '';
        console.log(`${voice.voiceId.padEnd(30)} | ${voice.name.padEnd(25)} | ${labels}`);
    }

    console.log('-'.repeat(80));
    console.log('\nSync complete!');
}
