/**
 * Cache Service Implementation
 *
 * Core Redis cache operations using Upstash Redis.
 * Uses Inversify for dependency injection.
 */

import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { AppError, ErrorCodes, DiagnoseSeverity } from '@mio/shared';

import { IocInfrastructure } from '../../ioc';
import type { IRedisClient } from '../../connections/redis';
import type { ICacheService, CacheSetOptions } from './cache.service.types';

/** Default TTL: 1 hour */
const DEFAULT_TTL_SECONDS = 3600;

/**
 * Cache Service
 *
 * Provides caching operations using Upstash Redis.
 */
@injectable()
export class CacheService implements ICacheService {
    constructor(
        @inject(IocInfrastructure.REDIS_CLIENT) private readonly redis: IRedisClient
    ) { }

    /**
     * Get a value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.redis.get<T>(key);
            return value;
        } catch (error) {
            throw new AppError(ErrorCodes.CacheGetFailed, {
                diagnoses: [
                    {
                        name: 'key',
                        message: key,
                        severity: DiagnoseSeverity.Info,
                    },
                    {
                        name: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: DiagnoseSeverity.Error,
                    },
                ],
            });
        }
    }

    /**
     * Set a value in cache
     */
    async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
        try {
            const { ex } = options;
            if (ex) {
                await this.redis.set(key, value, { ex });
            } else {
                await this.redis.set(key, value);
            }
        } catch (error) {
            throw new AppError(ErrorCodes.CacheSetFailed, {
                diagnoses: [
                    {
                        name: 'key',
                        message: key,
                        severity: DiagnoseSeverity.Info,
                    },
                    {
                        name: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: DiagnoseSeverity.Error,
                    },
                ],
            });
        }
    }

    /**
     * Get a value from cache, or fetch and cache it if not found (cache-aside pattern)
     */
    async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const fresh = await fetcher();
        await this.set(key, fresh, { ex: ttlSeconds });
        return fresh;
    }

    /**
     * Delete a value from cache
     */
    async delete(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            throw new AppError(ErrorCodes.CacheDeleteFailed, {
                diagnoses: [
                    {
                        name: 'key',
                        message: key,
                        severity: DiagnoseSeverity.Info,
                    },
                    {
                        name: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: DiagnoseSeverity.Error,
                    },
                ],
            });
        }
    }

    /**
     * Check if a key exists in cache
     */
    async exists(key: string): Promise<boolean> {
        try {
            return await this.redis.exists(key);
        } catch {
            return false;
        }
    }

    /**
     * Delete all keys matching a pattern
     */
    async invalidate(pattern: string): Promise<void> {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            throw new AppError(ErrorCodes.CacheDeleteFailed, {
                diagnoses: [
                    {
                        name: 'pattern',
                        message: pattern,
                        severity: DiagnoseSeverity.Info,
                    },
                    {
                        name: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: DiagnoseSeverity.Error,
                    },
                ],
            });
        }
    }

    /**
     * Increment a counter
     */
    async incr(key: string): Promise<number> {
        try {
            const value = await this.redis.incr(key);
            return value;
        } catch (error) {
            throw new AppError(ErrorCodes.CacheSetFailed, {
                diagnoses: [
                    {
                        name: 'key',
                        message: key,
                        severity: DiagnoseSeverity.Info,
                    },
                    {
                        name: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        severity: DiagnoseSeverity.Error,
                    },
                ],
            });
        }
    }
}
