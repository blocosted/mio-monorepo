/**
 * Test Runner
 *
 * Entry point for running integration tests with Docker containers.
 * Sets up PostgreSQL and Redis containers, runs migrations, and executes tests.
 *
 * Usage:
 *   bun run apps/api/src/tests/test-runner.ts [test-file-pattern]
 */

import { environment, loadEnvironmentFromValues, syncEnvironmentToProcessEnv } from '@mio/shared/constants/environment.constants';

import { configureSilentDatabase, createTestDatabase, DEFAULT_TEST_CONFIG, migrateDatabase, runTests, setupDatabase, setupRedis } from './test-utils';

const isCI = environment.CI === 'true';

const DB_CONTAINER = 'mio-test-db';
const REDIS_CONTAINER = 'mio-test-redis';

console.info('Test runner starting...');

try {
  const containerNames: string[] = [];

  // Setup containers (skip in CI if using service containers)
  if (!isCI) {
    const dbContainer = await setupDatabase(DB_CONTAINER, DEFAULT_TEST_CONFIG);
    const redisContainer = await setupRedis(REDIS_CONTAINER, DEFAULT_TEST_CONFIG);
    containerNames.push(dbContainer, redisContainer);
  }

  // Create database connection and run migrations
  const db = createTestDatabase(DEFAULT_TEST_CONFIG);
  await migrateDatabase(db);
  await configureSilentDatabase(db);

  // Set environment variables for tests (single source of truth)
  loadEnvironmentFromValues(
    {
      DATABASE_URL: DEFAULT_TEST_CONFIG.databaseUrl,
      REDIS_HOST: DEFAULT_TEST_CONFIG.redisHost,
      REDIS_PORT: String(DEFAULT_TEST_CONFIG.redisPort),
      REDIS_PASSWORD: DEFAULT_TEST_CONFIG.redisPassword,
      REDIS_URL: `redis://:${encodeURIComponent(DEFAULT_TEST_CONFIG.redisPassword)}@${DEFAULT_TEST_CONFIG.redisHost}:${DEFAULT_TEST_CONFIG.redisPort}`,
      CONFIG_OVERRIDE: 'test',
      NODE_ENV: 'test'
    },
    { override: true }
  );
  // Ensure the spawned `bun test` process receives these values
  syncEnvironmentToProcessEnv();

  // Run tests
  await runTests(containerNames);

  console.info('All tests completed successfully');
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
