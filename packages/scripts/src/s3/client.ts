/**
 * Supabase Admin Client for Storage Management
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

let client: SupabaseClient | null = null;

/**
 * Get Supabase admin client
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
