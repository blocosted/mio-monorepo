import path from 'node:path';

import { defineConfig } from 'drizzle-kit';

import '@mio/helpers/env.loader';

import monorepoRoot from '@mio/helpers/getMonorepoRoot';
import { environment } from '@mio/shared/constants/environment.constants';

if (!environment.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export default defineConfig({
  // Source of truth for schemas/migrations lives in `packages/db`
  schema: path.join(monorepoRoot, 'packages/db/src/schema/index.ts'),
  dialect: 'postgresql',
  dbCredentials: {
    url: environment.DATABASE_URL
  },
  out: path.join(monorepoRoot, 'packages/db/src/migrations'),
  verbose: true,
  strict: true
});
