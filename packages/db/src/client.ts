import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { environment } from '@mio/shared/constants/environment.constants';

/**
 * Database connection string from environment
 */
const connectionString = environment.DATABASE_URL;

if (!connectionString) {
    console.warn(
        'DATABASE_URL is not set. Database operations will fail until it is configured.'
    );
}

/**
 * PostgreSQL client with connection pooling
 */
const client = connectionString
    ? postgres(connectionString, {
        max: 10, // Maximum number of connections
        idle_timeout: 20, // Idle connection timeout in seconds
        connect_timeout: 10, // Connection timeout in seconds
    })
    : (null as unknown as ReturnType<typeof postgres>);

/**
 * Drizzle ORM instance with schema
 */
export const db = client
    ? drizzle(client, { schema })
    : (null as unknown as ReturnType<typeof drizzle>);

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
    if (client) {
        await client.end();
    }
}
