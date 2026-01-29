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

export type VoiceLibrarySource = 'shared' | 'personal';

export interface SyncVoicesArgs {
  envFile?: string;
  json?: boolean;
  source?: VoiceLibrarySource;
}

export async function runSyncVoicesCommand(args: SyncVoicesArgs): Promise<void> {
  loadEnv(args.envFile);

  // Initialize IoC container
  await initializeContainer();

  // Get VoiceRegistry service
  const voiceRegistry = getInstance<VoiceRegistryService>(IocService.VOICE_REGISTRY);

  // Determine source
  const useSharedLibrary = args.source !== 'personal';
  const sourceName = useSharedLibrary ? 'shared library' : 'personal library';

  // Check last sync time
  const lastSync = await voiceRegistry.getLastSyncTime();
  if (lastSync) {
    console.log(`Last sync: ${lastSync.toISOString()}`);
  } else {
    console.log('No previous sync found');
  }

  console.log(`\nSyncing voices from ${sourceName}...`);

  // Sync voices
  const result = await voiceRegistry.syncFromApi({ useSharedLibrary });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Display result
  console.log(`\nSync complete:`);
  console.log(`  Added:   ${result.added}`);
  console.log(`  Updated: ${result.updated}`);
  console.log(`  Removed: ${result.removed}`);
  console.log(`  Total:   ${result.total}`);
}
