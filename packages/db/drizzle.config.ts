import '@mio/helpers/env.loader';
import { defineConfig } from 'drizzle-kit';
import { environment } from '@mio/shared/constants/environment.constants';

if (!environment.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

export default defineConfig({
    schema: './src/schema/index.ts',
    out: './src/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: environment.DATABASE_URL,
    },
    verbose: true,
    strict: true,
});
