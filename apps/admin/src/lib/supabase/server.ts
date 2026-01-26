/**
 * Supabase Server Client
 *
 * Creates a Supabase client for use in Server Components and Server Actions.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnvironment } from '@mio/shared/constants/public-environment.constants';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnvironment.NEXT_PUBLIC_SUPABASE_URL, publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      }
    }
  });
}
