/**
 * Cache Service Types
 */

/**
 * Options for cache set operations
 */
export interface CacheSetOptions {
  /** Time to live in seconds */
  ex?: number;
}

/**
 * Cache Service Interface
 */
export interface ICacheService {
  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (TTL)
   */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /**
   * Get a value from cache, or fetch and cache it if not found
   * @param key - Cache key
   * @param fetcher - Function to fetch the value if not cached
   * @param ttlSeconds - Time to live in seconds
   * @returns Cached or fetched value
   */
  getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;

  /**
   * Delete a value from cache
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @returns True if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Delete all keys matching a pattern
   * @param pattern - Key pattern (e.g., 'audio:*')
   */
  invalidate(pattern: string): Promise<void>;

  /**
   * Increment a counter
   * @param key - Cache key
   * @returns New value after increment
   */
  incr(key: string): Promise<number>;

  /**
   * Set expiration time on a key
   * @param key - Cache key
   * @param seconds - Time to live in seconds
   * @returns True if timeout was set
   */
  expire(key: string, seconds: number): Promise<boolean>;
}
