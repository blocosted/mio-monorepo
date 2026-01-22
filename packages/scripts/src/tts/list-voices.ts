/**
 * List Voices Command
 *
 * List available ElevenLabs voices.
 */

import { existsSync } from 'node:fs';
import { config as loadDotenv } from 'dotenv';

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

import { VoicesRepository } from '@mio/api/repositories/audio';
import { DEFAULT_VOICE_IDS } from '@mio/api/services/narration';

function loadEnv(envFile?: string): void {
    const files = envFile ? [envFile] : ['.env.local', '.env'];
    for (const file of files) {
        if (existsSync(file)) {
            loadDotenv({ path: file });
        }
    }
    loadEnvironmentFromProcessEnv({ override: true });
}

export async function runListVoicesCommand(args: {
    json: boolean;
    envFile?: string;
}): Promise<void> {
    loadEnv(args.envFile);

    const logger = await Logger.create();
    const repository = new VoicesRepository(logger);

    console.log('Fetching available voices...\n');

    const voices = await repository.listVoices();

    if (args.json) {
        console.log(JSON.stringify(voices, null, 2));
        return;
    }

    // Display in table format
    console.log('Available ElevenLabs Voices:');
    console.log('='.repeat(80));
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
    console.log(`Total: ${voices.length} voices\n`);

    // Show default voice mappings
    console.log('\nDefault Voice Mappings (used by Mio):');
    console.log('='.repeat(80));
    console.log(`${'Archetype'.padEnd(20)} | ${'Male Voice ID'.padEnd(28)} | Female Voice ID`);
    console.log('-'.repeat(80));

    for (const [archetype, voiceIds] of Object.entries(DEFAULT_VOICE_IDS)) {
        console.log(`${archetype.padEnd(20)} | ${voiceIds.male.padEnd(28)} | ${voiceIds.female}`);
    }

    console.log('-'.repeat(80));
}
