/**
 * Database Connection Factory
 *
 * Creates a Drizzle ORM connection to PostgreSQL (Supabase).
 *
 * NOTE: Server-only module (Bun/Node).
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@mio/db/schema';

import { environment } from '../../constants/environment.constants';

export type DatabaseConnection = PostgresJsDatabase<typeof schema>;
export type DatabaseTransaction = DatabaseConnection;

/**
 * Create a database connection
 */
export function dbConnectionFactory(): DatabaseConnection {
  const databaseUrl = environment.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(databaseUrl, {
    // Use connection pooling for serverless
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });

  return drizzle(client, { schema });
}

/**
 * Create a test database connection with custom URL
 */
export function createTestDatabaseConnection(url: string): DatabaseConnection {
  const client = postgres(url, { max: 1 });
  return drizzle(client, { schema });
}
