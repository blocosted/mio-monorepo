/**
 * Test Utilities Exports
 *
 * Provides test utilities, helpers, and fixtures.
 */

// Test utilities for Docker containers and database
export {
    setupDatabase,
    setupRedis,
    runTests,
    createTestDatabase,
    migrateDatabase,
    configureSilentDatabase,
    cleanTestPostgresData,
    cleanTestRedisData,
    cleanTestData,
    DEFAULT_TEST_CONFIG,
    type TestEnvConfig,
} from './test-utils';

// Test helpers for mocks and fixtures
export {
    generateTestId,
    generateEmail,
    createMockCacheService,
    asCacheService,
    createMockStorageService,
    asStorageService,
    wait,
    createTestAudioBuffer,
    getMockCalls,
    getCallAt,
    type MockCacheService,
    type MockStorageService,
} from './test.helpers';
