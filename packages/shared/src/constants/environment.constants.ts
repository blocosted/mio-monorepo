/**
 * Environment Variables Configuration
 *
 * All environment variables used by the application should be declared here.
 * This file provides type-safe access to environment variables.
 */

/**
 * Runtime/system environment variables
 * (used by tooling, CI, and runtime mode detection)
 */
export const RUNTIME_ENV = {
    /** Node environment (development|test|production) */
    NODE_ENV: 'NODE_ENV',
    /** CI flag (often 'true' in CI environments) */
    CI: 'CI',
    /** Config selection (dev|test|staging|production) */
    CONFIG: 'CONFIG',
    /** Force config selection */
    CONFIG_OVERRIDE: 'CONFIG_OVERRIDE',
    /** Tooling hint (scripts) */
    IS_SCRIPT: 'IS_SCRIPT',
} as const;

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

    /**
     * Redis URL (recommended)
     * - Local: `redis://:password@localhost:6379`
     * - Upstash (TLS): `rediss://:password@<host>:6379`
     */
    REDIS_URL: 'REDIS_URL',

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

    /** Log enabled (true/false) */
    LOG_ENABLED: 'LOG_ENABLED',

    /** Log level (trace/debug/info/warn/error/fatal) */
    LOG_LEVEL: 'LOG_LEVEL',

    /** CORS origin (comma-separated or single origin) */
    CORS_ORIGIN: 'CORS_ORIGIN',

    /** Redis host (for Docker testing) */
    REDIS_HOST: 'REDIS_HOST',

    /** Redis port (for Docker testing) */
    REDIS_PORT: 'REDIS_PORT',

    /** Redis password (for Docker testing) */
    REDIS_PASSWORD: 'REDIS_PASSWORD',

    /**
     * S3 credentials (for Bun.S3Client)
     *
     * For Supabase S3 protocol:
     * - Enable S3 protocol in Supabase Storage settings
     * - Use endpoint: `https://<project-ref>.supabase.co/storage/v1/s3/storage`
     * - Use the region shown in the same settings page
     */
    S3_ACCESS_KEY_ID: 'S3_ACCESS_KEY_ID',
    S3_SECRET_ACCESS_KEY: 'S3_SECRET_ACCESS_KEY',
    S3_REGION: 'S3_REGION',
    S3_ENDPOINT: 'S3_ENDPOINT',
    /** Optional session token (AWS-style) */
    S3_SESSION_TOKEN: 'S3_SESSION_TOKEN',
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
    LOG_ENABLED: 'true',
    LOG_LEVEL: 'info',
    CORS_ORIGIN: 'http://localhost:3000',
} as const;

export type EnvironmentKey =
    | keyof typeof RUNTIME_ENV
    | keyof typeof API_ENV
    | keyof typeof WEB_ENV;

export type Environment = Partial<Record<EnvironmentKey, string>>;

/**
 * Single source of truth for environment values.
 *
 * - This object can be hydrated from:
 *   - `process.env` (default)
 *   - a secret manager (future)
 * - Other files should read values from `environment`, not from `process.env`.
 */
export const environment: Environment = {};

/**
 * Load values from `process.env` into `environment`.
 * This is non-throwing: missing variables are left as `undefined` (except defaults).
 */
export function loadEnvironmentFromProcessEnv(options: { override?: boolean } = {}): Environment {
    const { override = false } = options;

    // Prefer explicit defaults (and allow overriding if requested)
    for (const [key, defaultValue] of Object.entries(ENV_DEFAULTS)) {
        const typedKey = key as EnvironmentKey;
        const current = environment[typedKey];
        if (override || current === undefined) {
            environment[typedKey] = process.env[key] ?? defaultValue;
        }
    }

    // Copy known runtime keys
    for (const envKey of Object.keys(RUNTIME_ENV) as Array<keyof typeof RUNTIME_ENV>) {
        const value = process.env[RUNTIME_ENV[envKey]];
        if (value !== undefined && (override || environment[envKey] === undefined)) {
            environment[envKey] = value;
        }
    }

    // Copy known API keys
    for (const envKey of Object.keys(API_ENV) as Array<keyof typeof API_ENV>) {
        const value = process.env[API_ENV[envKey]];
        if (value !== undefined && (override || environment[envKey] === undefined)) {
            environment[envKey] = value;
        }
    }

    // Copy known WEB keys
    for (const envKey of Object.keys(WEB_ENV) as Array<keyof typeof WEB_ENV>) {
        const value = process.env[WEB_ENV[envKey]];
        if (value !== undefined && (override || environment[envKey] === undefined)) {
            environment[envKey] = value;
        }
    }

    return environment;
}

/**
 * Load values into `environment` (e.g. from a secret manager).
 */
export function loadEnvironmentFromValues(values: Environment, options: { override?: boolean } = {}): Environment {
    const { override = false } = options;
    for (const [key, value] of Object.entries(values)) {
        const typedKey = key as EnvironmentKey;
        if (value === undefined) continue;
        if (override || environment[typedKey] === undefined) {
            environment[typedKey] = value;
        }
    }
    return environment;
}

/**
 * Push current `environment` values back to `process.env`.
 * Useful when spawning subprocesses that expect env vars.
 *
 * NOTE: This keeps direct `process.env` manipulation centralized here.
 */
export function syncEnvironmentToProcessEnv(keys?: EnvironmentKey[]): void {
    const toSync = keys ?? (Object.keys(environment) as EnvironmentKey[]);
    for (const key of toSync) {
        const value = environment[key];
        if (value !== undefined) {
            (process.env as any)[key] = value;
        }
    }
}

/**
 * Read-only access to the current process environment.
 * Useful for subprocess spawning without leaking direct `process.env` usage everywhere.
 */
export function getProcessEnv(): NodeJS.ProcessEnv {
    return process.env;
}

/**
 * Get an environment variable value with optional default
 */
export function getEnv(key: string, defaultValue?: string): string {
    // Ensure we have an up-to-date snapshot (dotenv, CI, etc.)
    loadEnvironmentFromProcessEnv();

    const value = environment[key as EnvironmentKey];
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
    loadEnvironmentFromProcessEnv();
    return environment[key as EnvironmentKey];
}

/**
 * Check if all required environment variables are set
 */
export function validateEnv(requiredVars: string[]): void {
    loadEnvironmentFromProcessEnv();
    const missing: string[] = [];
    for (const key of requiredVars) {
        if (!environment[key as EnvironmentKey]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }
}

// Hydrate once on module load (non-throwing).
loadEnvironmentFromProcessEnv();
