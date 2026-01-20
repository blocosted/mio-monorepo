import path from 'node:path';

import { config as dotenvConfig } from 'dotenv';

import {
  environment,
  loadEnvironmentFromProcessEnv,
  loadEnvironmentFromValues,
  syncEnvironmentToProcessEnv,
} from '@mio/shared/constants/environment.constants';
import monorepoRoot from './getMonorepoRoot';

/**
 * Environment loader for CLI/tools (drizzle, scripts).
 *
 * This file is intended to be imported for its side effects:
 * `import '@mio/helpers/env.loader'`
 *
 * It will load the appropriate `.env.*` file from the monorepo root.
 */

export enum ConfigEnv {
  Dev = 'dev',
  Test = 'test',
  Staging = 'staging',
  Production = 'production'
}

const ConfigEnvToFile: Record<ConfigEnv, string> = {
  [ConfigEnv.Dev]: '.env.local',
  [ConfigEnv.Test]: '.env.local.test',
  [ConfigEnv.Staging]: '.env.staging',
  [ConfigEnv.Production]: '.env.production'
};

const CONFIG_OVERRIDE_KEY = 'CONFIG_OVERRIDE';
const CONFIG_KEY = 'CONFIG';
const isCI = environment.CI === 'true';

// If running in a test environment (bun test or anchor test), default to test config
const isTestEnvironment =
  environment.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('test'));

export const config = ((environment[CONFIG_OVERRIDE_KEY] ?? environment[CONFIG_KEY] ?? (isTestEnvironment ? ConfigEnv.Test : ConfigEnv.Dev))?.toLowerCase() ??
  ConfigEnv.Dev) as ConfigEnv;
export const envFile = path.join(monorepoRoot, ConfigEnvToFile[config]);

function preloadEnvironmentVariables() {
  // Mark as a script/tool execution (useful for conditional behavior elsewhere)
  loadEnvironmentFromValues({ IS_SCRIPT: 'true' }, { override: false });

  // Normalize CONFIG so downstream code can rely on it.
  loadEnvironmentFromValues({ CONFIG: config }, { override: false });

  // Ensure NODE_ENV is coherent for tooling.
  if (!environment.NODE_ENV) {
    const nodeEnv =
      config === ConfigEnv.Test
        ? 'test'
        : config === ConfigEnv.Production
          ? 'production'
          : 'development';

    loadEnvironmentFromValues({ NODE_ENV: nodeEnv }, { override: false });
  }

  // Make sure the OS-level environment reflects what we've set (subprocesses).
  syncEnvironmentToProcessEnv();
}

export default function main() {
  if (isCI) {
    console.info('CI environment detected, skipping config loading');
    return;
  }
  // if (config === ConfigEnv.Production) {
  //   console.warn('You are about to work on the production environment. If you are sure please comment the following line in the script.');
  //   throw new Error('Production environment detected');
  // }
  try {
    const result = dotenvConfig({ path: envFile, override: true });
    preloadEnvironmentVariables();
    // Hydrate the shared `environment` singleton after dotenv has updated process.env
    loadEnvironmentFromProcessEnv({ override: true });
    // Ensure subprocesses (if any) see the same env values
    syncEnvironmentToProcessEnv();

    if (result.error) {
      // Don't crash: this loader is optional, and some environments won't have env files.
      console.warn(`Config file not loaded (${envFile}): ${(result.error as Error).message}`);
      return;
    }

    console.info(`Config loaded from ${envFile}`);
  } catch (error) {
    console.error(`Error loading config from ${config}: ${(error as Error).stack}`);
  }
}

void main();
