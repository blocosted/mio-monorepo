/**
 * Global preload for `bun test`.
 *
 * Goal: make `bun test` behave like our previous `bun run test` runner:
 * - Start PostgreSQL + Redis docker containers (local)
 * - Run migrations
 * - Set env vars for tests (via shared `environment`)
 *
 * Runs once per `bun test` invocation (before any test files load).
 */

import { execSync } from 'node:child_process';

import { environment, loadEnvironmentFromValues, syncEnvironmentToProcessEnv } from '@mio/shared/constants/environment.constants';

import { initializeContainer } from '../ioc/ioc.config';
import { configureSilentDatabase, createTestDatabase, DEFAULT_TEST_CONFIG, migrateDatabase, setupDatabase, setupRedis } from './test-utils';
import { afterAll } from 'bun:test';

const DB_CONTAINER = 'mio-test-db';
const REDIS_CONTAINER = 'mio-test-redis';

function cleanupContainer(containerName: string): void {
  try {
    execSync(`docker stop ${containerName}`, { stdio: 'ignore' });
  } catch {
    // ignore
  }
  try {
    execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
  } catch {
    // ignore
  }
}

const isCI = environment.CI === 'true';
const startedContainers: string[] = [];

// Ensure tests run under "test" config, even when invoking `bun test` directly.
loadEnvironmentFromValues(
  {
    CONFIG: 'test',
    CONFIG_OVERRIDE: 'test',
    NODE_ENV: 'test'
  },
  { override: false }
);
syncEnvironmentToProcessEnv();

// Local: start containers. CI: assume service containers exist.
if (!isCI) {
  const dbContainer = await setupDatabase(DB_CONTAINER, DEFAULT_TEST_CONFIG);
  const redisContainer = await setupRedis(REDIS_CONTAINER, DEFAULT_TEST_CONFIG);
  startedContainers.push(dbContainer, redisContainer);
}

// Run migrations against the test DB.
const db = createTestDatabase(DEFAULT_TEST_CONFIG);
await migrateDatabase(db);
await configureSilentDatabase(db);

// Hydrate env vars used by the app/services.
loadEnvironmentFromValues(
  {
    DATABASE_URL: DEFAULT_TEST_CONFIG.databaseUrl,
    REDIS_HOST: DEFAULT_TEST_CONFIG.redisHost,
    REDIS_PORT: String(DEFAULT_TEST_CONFIG.redisPort),
    REDIS_PASSWORD: DEFAULT_TEST_CONFIG.redisPassword,
    REDIS_URL: `redis://:${encodeURIComponent(DEFAULT_TEST_CONFIG.redisPassword)}@${DEFAULT_TEST_CONFIG.redisHost}:${DEFAULT_TEST_CONFIG.redisPort}`
  },
  { override: true }
);
syncEnvironmentToProcessEnv();

// Initialize IoC container (creates Logger asynchronously)
await initializeContainer();

afterAll(() => {
  if (startedContainers.length === 0) return;
  for (const name of startedContainers) {
    cleanupContainer(name);
  }
});
