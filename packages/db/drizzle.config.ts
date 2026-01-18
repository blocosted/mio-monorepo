import { defineConfig } from 'drizzle-kit';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables from root .env.local
config({ path: resolve(__dirname, '../../.env.local') });

export default defineConfig({
    schema: './src/schema/index.ts',
    out: './src/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    verbose: true,
    strict: true,
});
