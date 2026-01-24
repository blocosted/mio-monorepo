/**
 * Redis Connection
 *
 * Single place where we encapsulate the Redis client.
 *
 * - The rest of the codebase should not depend on the Redis client directly.
 * - This module provides JSON (de)serialization so consumers can store objects safely.
 *
 * NOTE: Server-only module.
 * Uses npm redis package for better TLS support (Upstash compatibility).
 */

import { createClient, type RedisClientType } from 'redis';

import { environment } from '../../constants/environment.constants';
import { AppError, ErrorCodes } from '../../constants/error.constants';
import type { Logger } from '../logger/Logger';

export interface RedisConfig {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
}

export interface RedisStats {
    connected: boolean;
    keyCount: number;
    info?: string;
}

export interface RedisSetOptions {
    /** TTL in seconds */
    ex?: number;
}

export interface IRedisClient {
    connect(): Promise<void>;
    close(): void;
    quit(): Promise<void>;

    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: RedisSetOptions): Promise<void>;
    del(...keys: string[]): Promise<number>;
    exists(key: string): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;

    // Pub/Sub methods
    publish(channel: string, message: string): Promise<number>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    unsubscribe(channel: string): Promise<void>;
    duplicate(): IRedisClient;
}

export function buildRedisUrl(config: {
    host: string;
    port: number;
    password?: string;
    db?: number;
}): string {
    const passwordPart = config.password
        ? `:${encodeURIComponent(config.password)}@`
        : '';
    const dbPart = typeof config.db === 'number' ? `/${config.db}` : '';
    return `redis://${passwordPart}${config.host}:${config.port}${dbPart}`;
}

export class RedisClient implements IRedisClient {
    private client: RedisClientType;
    private readonly logger?: ReturnType<Logger['withModule']>;
    private readonly url: string;
    private isConnected = false;

    constructor(config: RedisConfig, logger?: Logger) {
        const url =
            config.url ??
            (config.host && config.port
                ? buildRedisUrl({
                    host: config.host,
                    port: config.port,
                    password: config.password,
                    db: config.db,
                })
                : undefined);

        if (!url) {
            throw new Error(
                'REDIS_URL (or REDIS_HOST + REDIS_PORT) must be provided'
            );
        }

        this.url = url;
        this.logger = logger?.withModule('RedisClient');

        // Log connection attempt (mask password if present)
        const maskedUrl = url.replace(/:([^@]+)@/, ':***@');
        this.logger?.info(`Creating Redis client with URL: ${maskedUrl}`);

        this.client = this.createClient();
    }

    private createClient(): RedisClientType {
        const client = createClient({
            url: this.url,
        });

        client.on('connect', () => {
            this.logger?.info('Redis connecting...');
        });

        client.on('ready', () => {
            this.logger?.info('Redis connected and ready');
            this.isConnected = true;
        });

        client.on('error', (err) => {
            this.logger?.withError(err).error('Redis client error');
        });

        client.on('end', () => {
            this.logger?.info('Redis connection closed');
            this.isConnected = false;
        });

        client.on('reconnecting', () => {
            this.logger?.info('Redis reconnecting...');
        });

        return client;
    }

    /**
     * Ensure Redis connection is established
     */
    public async connect(): Promise<void> {
        try {
            if (this.client.isOpen) {
                return;
            }

            this.logger?.info('Connecting to Redis...');
            await this.client.connect();
            this.logger?.info('Redis connection established');
        } catch (error) {
            this.logger?.withError(error as Error).error('Redis connection failed');
            throw new AppError(ErrorCodes.CacheConnectionFailed);
        }
    }

    /**
     * Execute operation with automatic reconnect on connection errors
     */
    private async withReconnect<T>(operation: () => Promise<T>): Promise<T> {
        try {
            await this.connect();
            return await operation();
        } catch (error) {
            const err = error as Error;
            this.logger?.withError(err).error('Redis operation failed');
            throw error;
        }
    }

    /**
     * Close Redis connection
     */
    public close(): void {
        if (this.client.isOpen) {
            this.client.disconnect();
        }
    }

    /**
     * Quit Redis connection gracefully
     */
    public async quit(): Promise<void> {
        if (this.client.isOpen) {
            await this.client.quit();
        }
    }

    public async get<T>(key: string): Promise<T | null> {
        return await this.withReconnect(async () => {
            const value = await this.client.get(key);
            if (value === null) return null;

            try {
                return JSON.parse(value) as T;
            } catch {
                // If it wasn't JSON, treat as plain string
                return value as unknown as T;
            }
        });
    }

    public async set<T>(
        key: string,
        value: T,
        options: RedisSetOptions = {}
    ): Promise<void> {
        return await this.withReconnect(async () => {
            const serialized =
                typeof value === 'string' ? value : JSON.stringify(value);

            if (options.ex) {
                await this.client.set(key, serialized, { EX: options.ex });
            } else {
                await this.client.set(key, serialized);
            }
        });
    }

    public async del(...keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        return await this.withReconnect(async () => {
            return await this.client.del(keys);
        });
    }

    public async exists(key: string): Promise<boolean> {
        return await this.withReconnect(async () => {
            const result = await this.client.exists(key);
            return result === 1;
        });
    }

    public async keys(pattern: string): Promise<string[]> {
        return await this.withReconnect(async () => {
            return await this.client.keys(pattern);
        });
    }

    public async incr(key: string): Promise<number> {
        return await this.withReconnect(async () => {
            return await this.client.incr(key);
        });
    }

    public async expire(key: string, seconds: number): Promise<number> {
        return await this.withReconnect(async () => {
            const result = await this.client.expire(key, seconds);
            return result ? 1 : 0;
        });
    }

    /**
     * Optional stats (useful for health endpoints)
     */
    public async getStats(): Promise<RedisStats> {
        return await this.withReconnect(async () => {
            const info = await this.client.info();
            const keys = await this.client.keys('*');
            return {
                connected: this.client.isOpen,
                keyCount: keys.length,
                info,
            };
        });
    }

    /**
     * Publish a message to a Redis channel (Pub/Sub)
     */
    public async publish(channel: string, message: string): Promise<number> {
        return await this.withReconnect(async () => {
            return await this.client.publish(channel, message);
        });
    }

    /**
     * Subscribe to a Redis channel (Pub/Sub)
     */
    public async subscribe(
        channel: string,
        callback: (message: string) => void
    ): Promise<void> {
        return await this.withReconnect(async () => {
            await this.client.subscribe(channel, callback);
        });
    }

    /**
     * Unsubscribe from a Redis channel
     */
    public async unsubscribe(channel: string): Promise<void> {
        if (this.client.isOpen) {
            await this.client.unsubscribe(channel);
        }
    }

    /**
     * Create a duplicate Redis connection (for Pub/Sub)
     */
    public duplicate(): IRedisClient {
        const config: RedisConfig = {
            url: this.url,
        };
        return new RedisClient(config, this.logger ? { withModule: () => this.logger } as Logger : undefined);
    }
}

/**
 * Create a Redis client from environment variables
 * Note: Returns a RedisClient instance that will connect lazily on first operation
 */
export function redisConnectionFactory(logger: Logger): RedisClient {
    const url = environment.REDIS_URL;

    if (url) {
        const client = new RedisClient({ url }, logger);
        // Connect immediately to ensure client is ready
        client.connect().catch(err => {
            logger.withError(err).error('Failed to connect to Redis during initialization');
        });
        return client;
    }

    const host = environment.REDIS_HOST;
    const port = environment.REDIS_PORT;
    const password = environment.REDIS_PASSWORD;

    if (!host || !port) {
        throw new Error('REDIS_HOST and REDIS_PORT (or REDIS_URL) environment variables must be set');
    }

    const client = new RedisClient(
        {
            host,
            port: parseInt(port, 10),
            password,
        },
        logger
    );

    // Connect immediately to ensure client is ready
    client.connect().catch(err => {
        logger.withError(err).error('Failed to connect to Redis during initialization');
    });

    return client;
}

