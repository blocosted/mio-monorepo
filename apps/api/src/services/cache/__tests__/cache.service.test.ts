/**
 * Cache Service Integration Tests
 *
 * Tests the core Redis cache operations with a real Redis instance.
 */

import type { RedisClient } from '@mio/shared/server/connections/redis';

import { cleanupRedisKeys, createTestRedisClient, generateTestId } from '../../../tests/test.helpers';
import { CacheService } from '../cache.service';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

describe('CacheService', () => {
  let redis: RedisClient;
  let closeRedis: () => Promise<void>;
  let cacheService: CacheService;
  const testKeyPrefix = 'test:cache:';

  beforeAll(async () => {
    const client = await createTestRedisClient();
    redis = client.redis;
    closeRedis = client.close;
    cacheService = new CacheService(redis);
  });

  afterAll(async () => {
    await closeRedis();
  });

  beforeEach(async () => {
    // Clean up test keys before each test
    await cleanupRedisKeys(redis, `${testKeyPrefix}*`);
  });

  describe('get()', () => {
    it('returns value when key exists', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const testValue = { id: 1, name: 'test' };

      await cacheService.set(key, testValue);
      const result = await cacheService.get(key);

      expect(result).toEqual(testValue);
    });

    it('returns null when key does not exist', async () => {
      const key = `${testKeyPrefix}nonexistent`;
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('handles different data types', async () => {
      const testCases = [
        { key: `${testKeyPrefix}string`, value: 'test string' },
        { key: `${testKeyPrefix}number`, value: 42 },
        { key: `${testKeyPrefix}boolean`, value: true },
        { key: `${testKeyPrefix}object`, value: { nested: { data: 'value' } } },
        { key: `${testKeyPrefix}array`, value: [1, 2, 3] }
      ];

      for (const { key, value } of testCases) {
        await cacheService.set(key, value);
        const result = await cacheService.get(key);
        expect(result).toEqual(value);
      }
    });
  });

  describe('set()', () => {
    it('sets value without TTL', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const value = 'test value';

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('sets value with TTL', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const value = 'expires soon';

      await cacheService.set(key, value, { ex: 1 });

      // Value should exist immediately
      let result = await cacheService.get(key);
      expect(result).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('handles different data types', async () => {
      const testCases = [
        { key: `${testKeyPrefix}obj`, value: { complex: { nested: true } } },
        { key: `${testKeyPrefix}arr`, value: ['a', 'b', 'c'] },
        { key: `${testKeyPrefix}null`, value: null }
      ];

      for (const { key, value } of testCases) {
        await cacheService.set(key, value);
        const result = await cacheService.get(key);
        expect(result).toEqual(value);
      }
    });
  });

  describe('getOrSet()', () => {
    it('returns cached value if exists', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const cachedValue = 'cached';

      await cacheService.set(key, cachedValue);

      const fetcher = async () => 'fresh';
      const result = await cacheService.getOrSet(key, fetcher);

      expect(result).toBe(cachedValue);
    });

    it('fetches and caches value if not exists', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const freshValue = 'fresh data';

      const fetcher = async () => freshValue;
      const result = await cacheService.getOrSet(key, fetcher);

      expect(result).toBe(freshValue);

      // Verify it was cached
      const cached = await cacheService.get(key);
      expect(cached).toBe(freshValue);
    });

    it('uses default TTL if not specified', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const value = 'with default ttl';

      const fetcher = async () => value;
      await cacheService.getOrSet(key, fetcher);

      const exists = await cacheService.exists(key);
      expect(exists).toBe(true);
    });

    it('propagates fetcher errors', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const error = new Error('Fetcher failed');

      const fetcher = async () => {
        throw error;
      };

      await expect(cacheService.getOrSet(key, fetcher)).rejects.toThrow('Fetcher failed');
    });
  });

  describe('delete()', () => {
    it('deletes key successfully', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;

      await cacheService.set(key, 'to be deleted');
      await cacheService.delete(key);

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('exists()', () => {
    it('returns true when key exists', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;

      await cacheService.set(key, 'exists');
      const result = await cacheService.exists(key);

      expect(result).toBe(true);
    });

    it('returns false when key does not exist', async () => {
      const key = `${testKeyPrefix}nonexistent`;
      const result = await cacheService.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('invalidate()', () => {
    it('deletes all keys matching pattern', async () => {
      const prefix = `${testKeyPrefix}invalidate:`;

      await cacheService.set(`${prefix}1`, 'value1');
      await cacheService.set(`${prefix}2`, 'value2');
      await cacheService.set(`${prefix}3`, 'value3');
      await cacheService.set(`${testKeyPrefix}other`, 'keep');

      await cacheService.invalidate(`${prefix}*`);

      // Pattern keys should be deleted
      expect(await cacheService.exists(`${prefix}1`)).toBe(false);
      expect(await cacheService.exists(`${prefix}2`)).toBe(false);
      expect(await cacheService.exists(`${prefix}3`)).toBe(false);

      // Other key should remain
      expect(await cacheService.exists(`${testKeyPrefix}other`)).toBe(true);
    });

    it('does nothing when no keys match', async () => {
      await cacheService.invalidate(`${testKeyPrefix}nomatch:*`);
      // Should not throw
    });
  });

  describe('incr()', () => {
    it('increments counter successfully', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;

      const result1 = await cacheService.incr(key);
      expect(result1).toBe(1);

      const result2 = await cacheService.incr(key);
      expect(result2).toBe(2);

      const result3 = await cacheService.incr(key);
      expect(result3).toBe(3);
    });

    it('initializes counter to 1 if not exists', async () => {
      const key = `${testKeyPrefix}${generateTestId()}`;
      const result = await cacheService.incr(key);

      expect(result).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty string keys', async () => {
      const key = `${testKeyPrefix}`;
      await cacheService.set(key, 'empty key');
      const result = await cacheService.get(key);
      expect(result).toBe('empty key');
    });

    it('handles special characters in keys', async () => {
      const key = `${testKeyPrefix}special:key@#$%`;
      await cacheService.set(key, 'special');
      const result = await cacheService.get(key);
      expect(result).toBe('special');
    });

    it('handles null values', async () => {
      const key = `${testKeyPrefix}null`;

      await cacheService.set(key, null);
      expect(await cacheService.get(key)).toBeNull();
    });
  });
});
