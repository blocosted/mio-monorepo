/**
 * Inversify IoC Container
 *
 * Central dependency injection container for the application.
 * All services, repositories, and infrastructure are registered here.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { TYPES, BUCKETS } from './types';

// Services
import { StorageService, type IStorageService } from '../services/storage';

/**
 * Storage configuration
 */
export interface StorageConfig {
    supabaseUrl: string;
    supabaseServiceKey: string;
    defaultBucket: string;
}

/**
 * Get storage configuration from environment
 */
function getStorageConfig(): StorageConfig {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable is not set');
    }

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    return {
        supabaseUrl,
        supabaseServiceKey,
        defaultBucket: BUCKETS.AUDIO,
    };
}

/**
 * Create and configure the IoC container
 */
export function createContainer(): Container {
    const container = new Container({
        defaultScope: 'Singleton',
        autobind: false,
    });

    // Configuration
    const storageConfig = getStorageConfig();
    container.bind<StorageConfig>(TYPES.StorageConfig).toConstantValue(storageConfig);

    // Infrastructure - Supabase Client
    container.bind<SupabaseClient>(TYPES.SupabaseClient).toDynamicValue(() => {
        const config = container.get<StorageConfig>(TYPES.StorageConfig);
        return createClient(config.supabaseUrl, config.supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }).inSingletonScope();

    // Services
    container.bind<IStorageService>(TYPES.StorageService).to(StorageService).inSingletonScope();

    return container;
}

/**
 * Default container instance
 */
let defaultContainer: Container | null = null;

/**
 * Get the default container (creates one if not exists)
 */
export function getContainer(): Container {
    if (!defaultContainer) {
        defaultContainer = createContainer();
    }
    return defaultContainer;
}

/**
 * Reset the container (useful for testing)
 */
export function resetContainer(): void {
    if (defaultContainer) {
        defaultContainer.unbindAll();
        defaultContainer = null;
    }
}
