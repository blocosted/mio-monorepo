/**
 * Redis Connection
 *
 * Single place where we encapsulate the Redis client (Bun).
 *
 * - The rest of the codebase should not depend on the Redis client directly.
 * - This module provides JSON (de)serialization so consumers can store objects safely.
 *
 * NOTE: Server-only module (Bun).
 */

import { RedisClient as BunRedisClient } from 'bun';

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
    private readonly client: BunRedisClient;
    private readonly logger?: ReturnType<Logger['withModule']>;
    private hasConnected = false;

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

        this.client = new BunRedisClient(url, {
            // Let Bun pipeline automatically for performance
            enableAutoPipelining: true,
        });

        this.logger = logger?.withModule('RedisClient');

        this.client.onconnect = () => {
            this.logger?.info('Redis connected');
        };

        this.client.onclose = () => {
            this.logger?.info('Redis connection closed');
            this.hasConnected = false;
        };
    }

    /**
     * Ensure Redis connection is established
     */
    public async connect(): Promise<void> {
        try {
            if (this.hasConnected && this.client.connected) {
                return;
            }
            await this.client.connect();
            this.hasConnected = true;
        } catch (error) {
            this.logger?.withError(error as Error).error('Redis connection failed');
            throw new AppError(ErrorCodes.CacheConnectionFailed);
        }
    }

    /**
     * Close Redis connection
     */
    public close(): void {
        this.client.close();
    }

    /**
     * Quit Redis connection gracefully
     */
    public async quit(): Promise<void> {
        this.client.close();
    }

    public async get<T>(key: string): Promise<T | null> {
        await this.connect();
        const value = await this.client.get(key);
        if (value === null) return null;

        try {
            return JSON.parse(value) as T;
        } catch {
            // If it wasn't JSON, treat as plain string
            return value as unknown as T;
        }
    }

    public async set<T>(
        key: string,
        value: T,
        options: RedisSetOptions = {}
    ): Promise<void> {
        await this.connect();
        const serialized =
            typeof value === 'string' ? value : JSON.stringify(value);

        if (options.ex) {
            await this.client.set(key, serialized, 'EX', options.ex);
        } else {
            await this.client.set(key, serialized);
        }
    }

    public async del(...keys: string[]): Promise<number> {
        await this.connect();
        if (keys.length === 0) return 0;
        return await this.client.del(...keys);
    }

    public async exists(key: string): Promise<boolean> {
        await this.connect();
        return await this.client.exists(key);
    }

    public async keys(pattern: string): Promise<string[]> {
        await this.connect();
        return await this.client.keys(pattern);
    }

    public async incr(key: string): Promise<number> {
        await this.connect();
        return await this.client.incr(key);
    }

    public async expire(key: string, seconds: number): Promise<number> {
        await this.connect();
        return await this.client.expire(key, seconds);
    }

    /**
     * Optional stats (useful for health endpoints)
     */
    public async getStats(): Promise<RedisStats> {
        await this.connect();
        const info = (await this.client.send('INFO', [])) as string;
        const keys = await this.client.keys('*');
        return {
            connected: this.client.connected,
            keyCount: keys.length,
            info,
        };
    }

    /**
     * Publish a message to a Redis channel (Pub/Sub)
     */
    public async publish(channel: string, message: string): Promise<number> {
        await this.connect();
        return (await this.client.send('PUBLISH', [channel, message])) as number;
    }

    /**
     * Subscribe to a Redis channel (Pub/Sub)
     */
    public async subscribe(
        channel: string,
        callback: (message: string) => void
    ): Promise<void> {
        await this.connect();
        await this.client.subscribe(channel, callback);
    }

    /**
     * Unsubscribe from a Redis channel
     */
    public async unsubscribe(channel: string): Promise<void> {
        await this.client.unsubscribe(channel);
    }

    /**
     * Create a duplicate Redis connection (for Pub/Sub)
     */
    public duplicate(): IRedisClient {
        // Create a new client with the same URL
        // Note: BunRedisClient doesn't expose its URL, so we reconstruct from environment
        const { environment } = require('../../constants/environment.constants');
        const config: RedisConfig = {
            url: environment.REDIS_URL,
        };
        return new RedisClient(config);
    }
}

/**
 * Create a Redis client from environment variables
 */
export function redisConnectionFactory(logger: Logger): RedisClient {
    const url = environment.REDIS_URL;

    if (url) {
        return new RedisClient({ url }, logger);
    }

    const host = environment.REDIS_HOST;
    const port = environment.REDIS_PORT;
    const password = environment.REDIS_PASSWORD;

    if (!host || !port) {
        throw new Error('REDIS_HOST and REDIS_PORT (or REDIS_URL) environment variables must be set');
    }

    return new RedisClient(
        {
            host,
            port: parseInt(port, 10),
            password,
        },
        logger
    );
}

