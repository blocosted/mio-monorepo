/**
 * List Voices Command
 *
 * List available ElevenLabs voices.
 */

import { existsSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import { VoicesRepository } from '@mio/api/repositories/audio';

// TODO: DEFAULT_VOICE_IDS was removed - refactor to use VoiceRegistryService
const DEFAULT_VOICE_IDS: Record<string, string[]> = {};

import { loadEnvironmentFromProcessEnv } from '@mio/shared/constants/environment.constants';
import { Logger } from '@mio/shared/server/logger';

function loadEnv(envFile?: string): void {
  const files = envFile ? [envFile] : ['.env.local', '.env'];
  for (const file of files) {
    if (existsSync(file)) {
      loadDotenv({ path: file });
    }
  }
  loadEnvironmentFromProcessEnv({ override: true });
}

export async function runListVoicesCommand(args: { json: boolean; envFile?: string }): Promise<void> {
  loadEnv(args.envFile);

  const logger = await Logger.create();
  const repository = new VoicesRepository(logger);

  const voices = await repository.listVoices();

  if (args.json) {
    return;
  }

  for (const voice of voices) {
    const _labels = voice.labels
      ? Object.entries(voice.labels)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : '';
  }

  for (const [_archetype, _voiceIds] of Object.entries(DEFAULT_VOICE_IDS)) {
  }
}
