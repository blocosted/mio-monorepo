/**
 * Test Utilities Exports
 *
 * Provides test utilities, helpers, and fixtures.
 */

// Test helpers for mocks and fixtures
export {
  asCacheService,
  asStorageService,
  createMockCacheService,
  createMockStorageService,
  createTestAudioBuffer,
  generateEmail,
  generateTestId,
  getCallAt,
  getMockCalls,
  type MockCacheService,
  type MockStorageService,
  wait
} from './test.helpers';
// Test utilities for Docker containers and database
export {
  cleanTestData,
  cleanTestPostgresData,
  cleanTestRedisData,
  configureSilentDatabase,
  createTestDatabase,
  DEFAULT_TEST_CONFIG,
  migrateDatabase,
  runTests,
  setupDatabase,
  setupRedis,
  type TestEnvConfig
} from './test-utils';
