/**
 * Supabase Browser Client
 *
 * Creates a Supabase client for use in Client Components.
 */

import { createBrowserClient } from '@supabase/ssr';
import { publicEnvironment } from '@mio/shared/constants/public-environment.constants';

export function createClient() {
  return createBrowserClient(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
