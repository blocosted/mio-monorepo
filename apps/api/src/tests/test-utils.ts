/**
 * Test Utilities
 *
 * Provides utilities for setting up test infrastructure:
 * - Docker containers for PostgreSQL and Redis
 * - Database migrations
 * - Test data cleanup
 */

import { execSync, spawn } from 'node:child_process';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { treaty } from '@elysiajs/eden';

import { environment, getProcessEnv } from '@mio/shared/constants/environment.constants';
import monorepoRoot from '@mio/helpers/getMonorepoRoot';
import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { createApiApp } from '@mio/api';
import { MioApiClient } from '@mio/shared/clients/mio';

const isCI = environment.CI === 'true';

/**
 * Test environment configuration
 */
export interface TestEnvConfig {
    databaseUrl: string;
    databaseHost: string;
    databasePort: number;
    databaseUser: string;
    databasePassword: string;
    databaseName: string;
    redisHost: string;
    redisPort: number;
    redisPassword: string;
}

/**
 * Default test environment configuration
 */
export const DEFAULT_TEST_CONFIG: TestEnvConfig = {
    databaseUrl: 'postgresql://test:test@localhost:5433/mio_test',
    databaseHost: 'localhost',
    databasePort: 5433,
    databaseUser: 'test',
    databasePassword: 'test',
    databaseName: 'mio_test',
    redisHost: 'localhost',
    redisPort: 6380,
    redisPassword: 'test',
};

/**
 * Check if Docker is installed
 */
function checkDockerIsInstalled(): void {
    try {
        execSync('docker --version', { stdio: 'ignore' });
    } catch {
        console.error('Docker is not available. Please install Docker for local testing.');
        process.exit(1);
    }
}

/**
 * Cleanup a Docker container
 */
function cleanupContainer(containerName: string): void {
    try {
        execSync(`docker stop ${containerName}`, { stdio: 'ignore' });
        execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
    } catch {
        // Container doesn't exist, ignore
    }
}

/**
 * Create a PostgreSQL test container
 */
async function createPostgresContainer(containerName: string, config: TestEnvConfig): Promise<void> {
    console.info(`Creating PostgreSQL container ${containerName}...`);
    execSync(
        `docker run -d --name ${containerName} \
            -e POSTGRES_PASSWORD=${config.databasePassword} \
            -e POSTGRES_USER=${config.databaseUser} \
            -e POSTGRES_DB=${config.databaseName} \
            -e TZ=UTC \
            -p ${config.databasePort}:5432 \
            postgres:15`,
        { stdio: 'inherit' }
    );

    console.info('Waiting for PostgreSQL container to be ready...');
    let retries = 0;
    const maxRetries = 30;
    while (retries < maxRetries) {
        try {
            execSync(
                `docker exec ${containerName} pg_isready -U ${config.databaseUser}`,
                { stdio: 'ignore' }
            );
            break;
        } catch {
            retries++;
            if (retries >= maxRetries) {
                console.error('PostgreSQL container failed to start within timeout');
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    console.info('PostgreSQL is ready');
}

/**
 * Create a Redis test container
 */
async function createRedisContainer(containerName: string, config: TestEnvConfig): Promise<void> {
    console.info(`Creating Redis container ${containerName}...`);
    execSync(
        `docker run -d --name ${containerName} \
            -e TZ=UTC \
            -p ${config.redisPort}:6379 \
            redis:7-alpine redis-server --requirepass ${config.redisPassword}`,
        { stdio: 'inherit' }
    );

    console.info('Waiting for Redis container to be ready...');
    let retries = 0;
    const maxRetries = 30;
    while (retries < maxRetries) {
        try {
            execSync(
                `docker exec ${containerName} redis-cli -a ${config.redisPassword} ping`,
                { stdio: 'ignore' }
            );
            break;
        } catch {
            retries++;
            if (retries >= maxRetries) {
                console.error('Redis container failed to start within timeout');
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    console.info('Redis is ready');
}

/**
 * Setup test database container
 */
export async function setupDatabase(
    containerName: string,
    config: TestEnvConfig = DEFAULT_TEST_CONFIG
): Promise<string> {
    console.info(`Setting up test database... (${isCI ? 'CI' : 'Local'} mode)`);
    checkDockerIsInstalled();
    cleanupContainer(containerName);
    await createPostgresContainer(containerName, config);
    return containerName;
}

/**
 * Setup test Redis container
 */
export async function setupRedis(
    containerName: string,
    config: TestEnvConfig = DEFAULT_TEST_CONFIG
): Promise<string> {
    console.info(`Setting up test Redis... (${isCI ? 'CI' : 'Local'} mode)`);
    checkDockerIsInstalled();
    cleanupContainer(containerName);
    await createRedisContainer(containerName, config);
    return containerName;
}

/**
 * Run tests with proper cleanup
 */
export async function runTests(containerNames?: string[]): Promise<void> {
    console.info('Starting tests...');
    const args = process.argv.slice(2);

    const testProcess = spawn('bun', ['test', '--timeout', '60000', ...args], {
        stdio: 'inherit',
        env: getProcessEnv(),
    });

    return new Promise<void>((resolve, reject) => {
        testProcess.on('close', async (code) => {
            if (containerNames && containerNames.length > 0) {
                console.info('Cleaning up test containers...');
                for (const containerName of containerNames) {
                    try {
                        execSync(`docker stop ${containerName}`, { stdio: 'ignore' });
                        execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
                    } catch (error) {
                        console.error(`Error cleaning up container ${containerName}:`, error);
                    }
                }
            }

            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Tests failed with code ${code}`));
            }
        });

        testProcess.on('error', (error) => {
            console.error('Error running tests:', error);
            reject(error);
        });
    });
}

/**
 * Create a test database connection
 */
export function createTestDatabase(config: TestEnvConfig = DEFAULT_TEST_CONFIG): DatabaseConnection {
    const client = postgres(config.databaseUrl, { max: 1 });
    return drizzle(client);
}

/**
 * Run database migrations
 */
export async function migrateDatabase(db: DatabaseConnection): Promise<void> {
    console.info('Migrating database...');
    const migrationPath = path.join(monorepoRoot, 'packages/db/src/migrations');
    await migrate(db, { migrationsFolder: migrationPath });
    console.info('Migration completed');
}

/**
 * Configure silent database mode (reduce log noise in tests)
 */
export async function configureSilentDatabase(db: DatabaseConnection): Promise<void> {
    try {
        await db.execute(sql`SET client_min_messages = 'error'`);
        await db.execute(sql`SET log_min_messages = 'error'`);
    } catch {
        // Ignore errors in test environment
    }
}

/**
 * Clean all test data from PostgreSQL
 */
export async function cleanTestPostgresData(db: DatabaseConnection): Promise<void> {
    try {
        await configureSilentDatabase(db);

        // Disable foreign key checks temporarily
        await db.execute(sql`SET session_replication_role = replica`);

        // Get all table names from the database
        const tablesResult = await db.execute(sql`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT LIKE 'pg_%'
            AND tablename NOT LIKE 'sql_%'
            AND tablename != '__drizzle_migrations'
            ORDER BY tablename
        `);

        // Truncate all tables using raw SQL
        if (tablesResult.length > 0) {
            const tableNames = tablesResult.map((row) => (row as { tablename: string }).tablename);
            const truncateQuery = `TRUNCATE TABLE ${tableNames.map((name) => `"${name}"`).join(', ')} CASCADE`;
            await db.execute(sql.raw(truncateQuery));
        }

        // Re-enable foreign key checks
        await db.execute(sql`SET session_replication_role = DEFAULT`);
    } catch (error) {
        console.error('Error cleaning database:', error);
    }
}

/**
 * Clean all test data from Redis
 */
export async function cleanTestRedisData(
    containerName: string,
    password: string
): Promise<void> {
    try {
        execSync(
            `docker exec ${containerName} redis-cli -a ${password} FLUSHALL`,
            { stdio: 'ignore' }
        );
    } catch (error) {
        console.error('Error cleaning Redis:', error);
    }
}

/**
 * Clean all test data
 */
export async function cleanTestData(
    db: DatabaseConnection,
    redisContainerName = 'mio-test-redis',
    redisPassword = DEFAULT_TEST_CONFIG.redisPassword
): Promise<void> {
    await cleanTestPostgresData(db);
    await cleanTestRedisData(redisContainerName, redisPassword);
}

export function createMioApiClient(): MioApiClient {
    const app = createApiApp();
    const api = treaty(app);
    return new MioApiClient({ apiClient: api });
}