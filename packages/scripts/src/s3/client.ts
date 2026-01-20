/**
 * Supabase Admin Client for Storage Management
 */

import '@mio/helpers/env.loader';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@mio/shared/constants/environment.constants';

let client: SupabaseClient | null = null;

/**
 * Get Supabase admin client
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (!client) {
        const url = environment.SUPABASE_URL;
        const serviceKey = environment.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceKey) {
            throw new Error(
                'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.\n' +
                'Make sure .env.local is configured correctly.'
            );
        }

        client = createClient(url, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return client;
}
