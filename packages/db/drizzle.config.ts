import path from 'node:path';

import '@mio/helpers/env.loader';

import { defineConfig } from 'drizzle-kit';

import monorepoRoot from '@mio/helpers/getMonorepoRoot';
import { environment } from '@mio/shared/constants/environment.constants';

if (!environment.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const dbPackageRoot = path.join(monorepoRoot, 'packages/db');

export default defineConfig({
  schema: path.join(dbPackageRoot, 'src/schema/index.ts'),
  out: path.join(dbPackageRoot, 'src/migrations'),
  dialect: 'postgresql',
  dbCredentials: {
    url: environment.DATABASE_URL
  },
  verbose: true,
  strict: true
});
