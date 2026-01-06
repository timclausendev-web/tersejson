/**
 * TerseJSON Core
 *
 * The core compression and expansion algorithms.
 */

import { TersePayload, isTersePayload } from './types';

/**
 * Generates short keys: a, b, c, ... z, aa, ab, ...
 */
function generateShortKey(index: number): string {
  let key = '';
  let remaining = index;

  do {
    key = String.fromCharCode(97 + (remaining % 26)) + key;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);

  return key;
}

/**
 * Collects all unique keys from an array of objects
 */
function collectKeys(
  data: Record<string, unknown>[],
  minKeyLength: number,
  maxDepth: number,
  currentDepth: number = 0
): Set<string> {
  const keys = new Set<string>();

  if (currentDepth >= maxDepth) return keys;

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    for (const key of Object.keys(item)) {
      // Only compress keys that are long enough to benefit
      if (key.length >= minKeyLength) {
        keys.add(key);
      }

      // Recursively collect keys from nested structures
      const value = item[key];
      if (Array.isArray(value) && value.length > 0 && isCompressibleArray(value)) {
        // Nested array of objects
        const nestedKeys = collectKeys(
          value as Record<string, unknown>[],
          minKeyLength,
          maxDepth,
          currentDepth + 1
        );
        nestedKeys.forEach(k => keys.add(k));
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Single nested object
        const nestedKeys = collectKeys(
          [value as Record<string, unknown>],
          minKeyLength,
          maxDepth,
          currentDepth + 1
        );
        nestedKeys.forEach(k => keys.add(k));
      }
    }
  }

  return keys;
}

/**
 * Checks if an array is compressible (array of objects with consistent structure)
 */
export function isCompressibleArray(data: unknown): data is Record<string, unknown>[] {
  if (!Array.isArray(data) || data.length === 0) return false;

  // Check if all items are objects
  return data.every(
    item => typeof item === 'object' && item !== null && !Array.isArray(item)
  );
}

/**
 * Compresses an object using the key mapping
 */
function compressObject(
  obj: Record<string, unknown>,
  keyToShort: Map<string, string>,
  maxDepth: number,
  currentDepth: number = 0
): Record<string, unknown> {
  if (currentDepth >= maxDepth) return obj;

  const compressed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const shortKey = keyToShort.get(key) ?? key;

    if (Array.isArray(value) && isCompressibleArray(value)) {
      // Recursively compress nested arrays
      compressed[shortKey] = value.map(item =>
        compressObject(
          item as Record<string, unknown>,
          keyToShort,
          maxDepth,
          currentDepth + 1
        )
      );
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Compress single nested objects too
      compressed[shortKey] = compressObject(
        value as Record<string, unknown>,
        keyToShort,
        maxDepth,
        currentDepth + 1
      );
    } else {
      compressed[shortKey] = value;
    }
  }

  return compressed;
}

/**
 * Expands an object using the key mapping
 */
function expandObject(
  obj: Record<string, unknown>,
  shortToKey: Map<string, string>,
  maxDepth: number,
  currentDepth: number = 0
): Record<string, unknown> {
  if (currentDepth >= maxDepth) return obj;

  const expanded: Record<string, unknown> = {};

  for (const [shortKey, value] of Object.entries(obj)) {
    const originalKey = shortToKey.get(shortKey) ?? shortKey;

    if (Array.isArray(value)) {
      expanded[originalKey] = value.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return expandObject(
            item as Record<string, unknown>,
            shortToKey,
            maxDepth,
            currentDepth + 1
          );
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      expanded[originalKey] = expandObject(
        value as Record<string, unknown>,
        shortToKey,
        maxDepth,
        currentDepth + 1
      );
    } else {
      expanded[originalKey] = value;
    }
  }

  return expanded;
}

export interface CompressOptions {
  minKeyLength?: number;
  maxDepth?: number;
}

/**
 * Compresses an array of objects by replacing keys with short aliases
 */
export function compress<T extends Record<string, unknown>[]>(
  data: T,
  options: CompressOptions = {}
): TersePayload<unknown[]> {
  const { minKeyLength = 3, maxDepth = 10 } = options;

  // Collect all unique keys
  const allKeys = collectKeys(data, minKeyLength, maxDepth);

  // Sort keys by frequency of use (most used first) for optimal compression
  // For now, just sort alphabetically for deterministic output
  const sortedKeys = Array.from(allKeys).sort();

  // Create bidirectional mapping
  const keyToShort = new Map<string, string>();
  const keyMap: Record<string, string> = {};

  sortedKeys.forEach((key, index) => {
    const shortKey = generateShortKey(index);
    // Only use short key if it's actually shorter
    if (shortKey.length < key.length) {
      keyToShort.set(key, shortKey);
      keyMap[shortKey] = key;
    }
  });

  // Compress the data
  const compressed = data.map(item =>
    compressObject(item, keyToShort, maxDepth)
  );

  return {
    __terse__: true,
    v: 1,
    k: keyMap,
    d: compressed,
  };
}

/**
 * Expands a TersePayload back to its original form
 */
export function expand<T = unknown>(payload: TersePayload): T {
  const shortToKey = new Map(
    Object.entries(payload.k).map(([short, original]) => [short, original])
  );

  if (Array.isArray(payload.d)) {
    return payload.d.map(item => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return expandObject(item as Record<string, unknown>, shortToKey, 10);
      }
      return item;
    }) as T;
  }

  if (typeof payload.d === 'object' && payload.d !== null) {
    return expandObject(payload.d as Record<string, unknown>, shortToKey, 10) as T;
  }

  return payload.d as T;
}

/**
 * Creates a Proxy that transparently maps original keys to short keys
 * This is the magic that makes client-side access seamless
 */
export function createTerseProxy<T extends Record<string, unknown>>(
  compressed: Record<string, unknown>,
  keyMap: Record<string, string> // short -> original
): T {
  // Create reverse map: original -> short
  const originalToShort = new Map(
    Object.entries(keyMap).map(([short, original]) => [original, short])
  );

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string | symbol) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop);
      }

      // Check if accessing by original key name
      const shortKey = originalToShort.get(prop);
      const actualKey = shortKey ?? prop;
      const value = target[actualKey];

      // Recursively proxy nested objects/arrays
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return createTerseProxy(item as Record<string, unknown>, keyMap);
          }
          return item;
        });
      }

      if (typeof value === 'object' && value !== null) {
        return createTerseProxy(value as Record<string, unknown>, keyMap);
      }

      return value;
    },

    has(target, prop: string | symbol) {
      if (typeof prop === 'symbol') {
        return Reflect.has(target, prop);
      }
      const shortKey = originalToShort.get(prop);
      return (shortKey ?? prop) in target;
    },

    ownKeys(target) {
      // Return original key names
      return Object.keys(target).map(shortKey => keyMap[shortKey] ?? shortKey);
    },

    getOwnPropertyDescriptor(target, prop: string | symbol) {
      if (typeof prop === 'symbol') {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
      const shortKey = originalToShort.get(prop);
      const actualKey = shortKey ?? prop;
      const descriptor = Object.getOwnPropertyDescriptor(target, actualKey);
      if (descriptor) {
        return { ...descriptor, enumerable: true, configurable: true };
      }
      return undefined;
    },
  };

  return new Proxy(compressed, handler) as T;
}

/**
 * Wraps TersePayload data with Proxies for transparent access
 */
export function wrapWithProxy<T>(payload: TersePayload): T {
  if (Array.isArray(payload.d)) {
    return payload.d.map(item => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return createTerseProxy(item as Record<string, unknown>, payload.k);
      }
      return item;
    }) as T;
  }

  if (typeof payload.d === 'object' && payload.d !== null) {
    return createTerseProxy(payload.d as Record<string, unknown>, payload.k) as T;
  }

  return payload.d as T;
}

// Re-export for convenience
export { isTersePayload };
