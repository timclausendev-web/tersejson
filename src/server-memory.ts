/**
 * TerseJSON Server-Side Memory Optimization
 *
 * Utilities for memory-efficient data handling on the server:
 * - TerseCache: Store compressed data, return Proxy-wrapped on access
 * - compressStream: Compress data as it streams from database cursors
 * - createTerseServiceClient: Inter-service communication with compressed payloads
 */

import { compress, wrapWithProxy, isTersePayload } from './core';
import type { TersePayload, CompressOptions } from './types';

/**
 * Options for TerseCache
 */
export interface TerseCacheOptions {
  /** Compression options passed to compress() */
  compressOptions?: CompressOptions;
  /** Maximum number of entries (simple LRU when exceeded) */
  maxSize?: number;
  /** Default TTL in milliseconds (optional) */
  defaultTTL?: number;
}

/**
 * A memory-efficient cache that stores data in compressed form.
 *
 * Data is compressed on set() and stays compressed in memory.
 * On get(), data is returned wrapped in a Proxy for lazy expansion.
 *
 * @example
 * ```typescript
 * const cache = new TerseCache<User[]>();
 *
 * // Store compressed - uses less memory
 * cache.set('users', largeUserArray);
 *
 * // Get returns Proxy-wrapped data
 * const users = cache.get('users');
 * users?.map(u => u.name); // Only 'name' field expands
 * ```
 */
export class TerseCache<T extends Record<string, unknown>[] = Record<string, unknown>[]> {
  private cache: Map<string, { payload: TersePayload<T>; expiresAt?: number }>;
  private options: TerseCacheOptions;
  private accessOrder: string[] = [];

  constructor(options: TerseCacheOptions = {}) {
    this.cache = new Map();
    this.options = options;
  }

  /**
   * Store data in compressed form
   */
  set(key: string, data: T, ttl?: number): void {
    // Enforce max size with simple LRU eviction
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const payload = compress(data, this.options.compressOptions) as TersePayload<T>;
    const effectiveTTL = ttl ?? this.options.defaultTTL;
    const expiresAt = effectiveTTL ? Date.now() + effectiveTTL : undefined;

    this.cache.set(key, { payload, expiresAt });
    this.updateAccessOrder(key);
  }

  /**
   * Get data wrapped in Proxy for lazy expansion.
   * Only accessed fields are expanded from compressed form.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return undefined;
    }

    this.updateAccessOrder(key);
    return wrapWithProxy<T>(entry.payload);
  }

  /**
   * Get the raw compressed payload without expansion.
   * Useful for forwarding to other services.
   */
  getRaw(key: string): TersePayload<T> | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return undefined;
    }

    return entry.payload;
  }

  /**
   * Check if key exists (and is not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry
   */
  delete(key: string): boolean {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

/**
 * Options for streaming compression
 */
export interface CompressStreamOptions extends CompressOptions {
  /** Number of items per batch (default: 100) */
  batchSize?: number;
}

/**
 * Compress data as it streams from an async source (e.g., database cursor).
 *
 * Yields compressed batches without loading entire result set into memory.
 *
 * @example
 * ```typescript
 * // MongoDB cursor
 * const cursor = db.collection('users').find().stream();
 * for await (const batch of compressStream(cursor, { batchSize: 100 })) {
 *   // Send batch to client or process
 *   res.write(JSON.stringify(batch));
 * }
 *
 * // PostgreSQL stream
 * const stream = client.query(new QueryStream('SELECT * FROM users'));
 * for await (const batch of compressStream(stream)) {
 *   // Process compressed batches
 * }
 * ```
 */
export async function* compressStream<T extends Record<string, unknown>>(
  source: AsyncIterable<T>,
  options: CompressStreamOptions = {}
): AsyncGenerator<TersePayload<T[]>, void, unknown> {
  const batchSize = options.batchSize ?? 100;
  const { batchSize: _, ...compressOptions } = options;

  let batch: T[] = [];

  for await (const item of source) {
    batch.push(item);

    if (batch.length >= batchSize) {
      yield compress(batch, compressOptions) as TersePayload<T[]>;
      batch = [];
    }
  }

  // Yield remaining items
  if (batch.length > 0) {
    yield compress(batch, compressOptions) as TersePayload<T[]>;
  }
}

/**
 * Configuration for TerseServiceClient
 */
export interface TerseServiceClientConfig {
  /** Base URL for the service */
  baseUrl: string;
  /** Whether to expand responses with Proxy (default: true) */
  expandOnReceive?: boolean;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Custom fetch implementation (for testing or Node.js < 18) */
  fetch?: typeof globalThis.fetch;
}

/**
 * HTTP client for inter-service communication with TerseJSON.
 *
 * Services can pass compressed data without intermediate expansion,
 * reducing memory usage across the request chain.
 *
 * @example
 * ```typescript
 * const serviceB = createTerseServiceClient({
 *   baseUrl: 'http://service-b:3000',
 * });
 *
 * // GET - returns Proxy-wrapped data
 * const users = await serviceB.get<User[]>('/api/users');
 * users.map(u => u.name); // Only accessed fields expand
 *
 * // Forward compressed payload to another service
 * const raw = cache.getRaw('users');
 * if (raw) {
 *   await serviceB.forward('/api/users/sync', raw);
 * }
 * ```
 */
export function createTerseServiceClient(config: TerseServiceClientConfig) {
  const {
    baseUrl,
    expandOnReceive = true,
    headers: customHeaders = {},
    fetch: customFetch = globalThis.fetch,
  } = config;

  const defaultHeaders = {
    'Accept-Terse': 'true',
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  return {
    /**
     * GET request - receives TerseJSON and returns Proxy-wrapped (or raw)
     */
    async get<T>(path: string, options?: { headers?: Record<string, string> }): Promise<T> {
      const response = await customFetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { ...defaultHeaders, ...options?.headers },
      });

      if (!response.ok) {
        throw new Error(`TerseServiceClient: GET ${path} failed with status ${response.status}`);
      }

      const data = await response.json();

      if (isTersePayload(data) && expandOnReceive) {
        return wrapWithProxy<T>(data as TersePayload<T extends unknown[] ? T : never>);
      }

      return data as T;
    },

    /**
     * POST request with automatic compression
     */
    async post<T, R = unknown>(
      path: string,
      data: T,
      options?: { headers?: Record<string, string>; compress?: boolean }
    ): Promise<R> {
      const shouldCompress = options?.compress ?? Array.isArray(data);
      const body = shouldCompress && Array.isArray(data)
        ? JSON.stringify(compress(data as Record<string, unknown>[]))
        : JSON.stringify(data);

      const headers = {
        ...defaultHeaders,
        ...options?.headers,
        ...(shouldCompress ? { 'X-Terse-JSON': 'true' } : {}),
      };

      const response = await customFetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`TerseServiceClient: POST ${path} failed with status ${response.status}`);
      }

      const responseData = await response.json();

      if (isTersePayload(responseData) && expandOnReceive) {
        return wrapWithProxy<R>(responseData as TersePayload<R extends unknown[] ? R : never>);
      }

      return responseData as R;
    },

    /**
     * Forward a raw TersePayload to another endpoint without expansion.
     * Useful for passing data between services without intermediate deserialization.
     */
    async forward<T extends Record<string, unknown>[]>(
      path: string,
      payload: TersePayload<T>,
      options?: { headers?: Record<string, string> }
    ): Promise<void> {
      const response = await customFetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          ...defaultHeaders,
          ...options?.headers,
          'X-Terse-JSON': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`TerseServiceClient: forward to ${path} failed with status ${response.status}`);
      }
    },
  };
}

// Re-export core types for convenience
export type { TersePayload, CompressOptions };
