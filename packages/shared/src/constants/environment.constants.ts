/**
 * Environment Variables Configuration
 *
 * All environment variables used by the application should be declared here.
 * This file provides type-safe access to environment variables.
 */

/**
 * Required environment variables for the API
 */
export const API_ENV = {
    /** Database connection string (Supabase PostgreSQL) */
    DATABASE_URL: 'DATABASE_URL',

    /** Supabase project URL */
    SUPABASE_URL: 'SUPABASE_URL',

    /** Supabase service role key (for storage) */
    SUPABASE_SERVICE_ROLE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',

    /** Upstash Redis REST URL */
    UPSTASH_REDIS_URL: 'UPSTASH_REDIS_URL',

    /** Upstash Redis REST Token */
    UPSTASH_REDIS_TOKEN: 'UPSTASH_REDIS_TOKEN',

    /** OpenAI API Key */
    OPENAI_API_KEY: 'OPENAI_API_KEY',

    /** Anthropic API Key */
    ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',

    /** LLM Provider (openai | anthropic) */
    LLM_PROVIDER: 'LLM_PROVIDER',

    /** ElevenLabs API Key */
    ELEVENLABS_API_KEY: 'ELEVENLABS_API_KEY',

    /** Suno API Key */
    SUNO_API_KEY: 'SUNO_API_KEY',

    /** API Port */
    API_PORT: 'API_PORT',
} as const;

/**
 * Required environment variables for the Web app
 */
export const WEB_ENV = {
    /** API URL for frontend to call */
    NEXT_PUBLIC_API_URL: 'NEXT_PUBLIC_API_URL',
} as const;

/**
 * Default values for optional environment variables
 */
export const ENV_DEFAULTS = {
    API_PORT: '3001',
    LLM_PROVIDER: 'openai',
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
} as const;

/**
 * Get an environment variable value with optional default
 */
export function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

/**
 * Get an optional environment variable value
 */
export function getEnvOptional(key: string): string | undefined {
    return process.env[key];
}

/**
 * Check if all required environment variables are set
 */
export function validateEnv(requiredVars: string[]): void {
    const missing: string[] = [];
    for (const key of requiredVars) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }
}
