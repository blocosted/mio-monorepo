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
    return;
  }

  if (Object.keys(stats.sfx.byCategory).length > 0) {
    for (const [_category, count] of Object.entries(stats.sfx.byCategory)) {
      const countNum = count as number;
      const _pct = stats.sfx.total > 0 ? ((countNum / stats.sfx.total) * 100).toFixed(1) : '0';
    }
  }

  if (Object.keys(stats.sfx.byEnvironment).length > 0) {
    for (const [_env, count] of Object.entries(stats.sfx.byEnvironment)) {
      const countNum = count as number;
      const _pct = stats.sfx.total > 0 ? ((countNum / stats.sfx.total) * 100).toFixed(1) : '0';
    }
  }

  if (Object.keys(stats.ambiance.byEnvironment).length > 0) {
    for (const [_env, count] of Object.entries(stats.ambiance.byEnvironment)) {
      const countNum = count as number;
      const _pct = stats.ambiance.total > 0 ? ((countNum / stats.ambiance.total) * 100).toFixed(1) : '0';
    }
  }

  if (Object.keys(stats.ambiance.byMood).length > 0) {
    for (const [_mood, count] of Object.entries(stats.ambiance.byMood)) {
      const countNum = count as number;
      const _pct = stats.ambiance.total > 0 ? ((countNum / stats.ambiance.total) * 100).toFixed(1) : '0';
    }
  }

  if (Object.keys(stats.music.byMood).length > 0) {
    for (const [_mood, count] of Object.entries(stats.music.byMood)) {
      const countNum = count as number;
      const _pct = stats.music.total > 0 ? ((countNum / stats.music.total) * 100).toFixed(1) : '0';
    }
  }

  if (Object.keys(stats.music.byIntensity).length > 0) {
    for (const [_intensity, count] of Object.entries(stats.music.byIntensity)) {
      const countNum = count as number;
      const _pct = stats.music.total > 0 ? ((countNum / stats.music.total) * 100).toFixed(1) : '0';
    }
  }

  if (stats.topUsed.sfx.length > 0) {
    for (const _item of stats.topUsed.sfx.slice(0, 5)) {
    }
  }

  if (stats.topUsed.ambiance.length > 0) {
    for (const _item of stats.topUsed.ambiance.slice(0, 5)) {
    }
  }

  if (stats.topUsed.music.length > 0) {
    for (const _item of stats.topUsed.music.slice(0, 5)) {
    }
  }

  // === Summary ===
  const _totalAssets = stats.sfx.total + stats.ambiance.total + stats.music.total;

  // Calculate total usage
  const totalUsage =
    stats.topUsed.sfx.reduce((sum: number, item: any) => sum + item.usageCount, 0) +
    stats.topUsed.ambiance.reduce((sum: number, item: any) => sum + item.usageCount, 0) +
    stats.topUsed.music.reduce((sum: number, item: any) => sum + item.usageCount, 0);

  // Estimate savings (assuming $0.01 per API call)
  const _estimatedSavings = totalUsage * 0.01;
  const sfxTargetCount = 80; // ~80 SFX variations target
  const ambianceTargetCount = 60; // ~60 ambiance variations target
  const musicTargetCount = 60; // ~60 music variations target

  const _sfxCoverage = Math.min(100, (stats.sfx.total / sfxTargetCount) * 100);
  const _ambianceCoverage = Math.min(100, (stats.ambiance.total / ambianceTargetCount) * 100);
  const _musicCoverage = Math.min(100, (stats.music.total / musicTargetCount) * 100);
}
