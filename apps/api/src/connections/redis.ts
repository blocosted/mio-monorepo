/**
 * Redis Connection
 *
 * Single place where we encapsulate the Redis client (Bun).
 *
 * - The rest of the codebase should not depend on the Redis client directly.
 * - This module provides JSON (de)serialization so consumers can store objects safely.
 */

import { inject, injectable, optional } from 'inversify';
import { RedisClient as BunRedisClient } from 'bun';

import { environment } from '@mio/shared/constants/environment.constants';
import { AppError, ErrorCodes } from '@mio/shared/constants/error.constants';
import { IocInfrastructure } from '../ioc/ioc.types';
import { Logger } from '../repositories/Logger';

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

    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: RedisSetOptions): Promise<void>;
    del(...keys: string[]): Promise<number>;
    exists(key: string): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    incr(key: string): Promise<number>;
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

@injectable()
export class RedisClient implements IRedisClient {
    private readonly client: BunRedisClient;
    private readonly logger?: ReturnType<Logger['withModule']>;
    private hasConnected = false;

    constructor(
        config: RedisConfig,
        @inject(IocInfrastructure.LOGGER) @optional() logger?: Logger
    ) {
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

    return new RedisClient({
        host,
        port: parseInt(port, 10),
        password,
    }, logger);
}
