/**
 * Sync Voices Command
 *
 * Synchronize ElevenLabs voices from API to database.
 * This avoids repeated API calls for voice validation.
 */

import { existsSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import type { VoiceRegistryService } from '@mio/api/services/narration';
import { IocService } from '@mio/api/ioc/ioc.types';
import { getInstance, initializeContainer } from '@mio/api/ioc/ioc.config';
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

export interface SyncVoicesArgs {
  envFile?: string;
  json?: boolean;
}

export async function runSyncVoicesCommand(args: SyncVoicesArgs): Promise<void> {
  loadEnv(args.envFile);

  // Initialize IoC container
  await initializeContainer();

  // Get VoiceRegistry service
  const voiceRegistry = getInstance<VoiceRegistryService>(IocService.VOICE_REGISTRY);

  // Check last sync time
  const lastSync = await voiceRegistry.getLastSyncTime();
  if (lastSync) {
  } else {
  }

  // Sync voices
  const _result = await voiceRegistry.syncFromApi();

  if (args.json) {
    return;
  }

  // List all synced voices
  const voices = await voiceRegistry.getAllVoices();

  for (const voice of voices) {
    const _labels = voice.labels
      ? Object.entries(voice.labels)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
      : '';
  }
}
