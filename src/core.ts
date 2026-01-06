/**
 * TerseJSON Core
 *
 * The core compression and expansion algorithms.
 */

import {
  TersePayload,
  isTersePayload,
  KeyPattern,
  KeyGenerator,
  NestedHandling,
  CompressOptions,
} from './types';

// ============================================================================
// KEY PATTERN GENERATORS
// ============================================================================

/**
 * Alpha pattern: a, b, c, ... z, aa, ab, ...
 */
function alphaGenerator(index: number): string {
  let key = '';
  let remaining = index;

  do {
    key = String.fromCharCode(97 + (remaining % 26)) + key;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);

  return key;
}

/**
 * Numeric pattern: 0, 1, 2, ... 9, 10, 11, ...
 */
function numericGenerator(index: number): string {
  return String(index);
}

/**
 * Alphanumeric pattern: a1, a2, ... a9, b1, b2, ...
 */
function alphanumericGenerator(index: number): string {
  const letterIndex = Math.floor(index / 9);
  const numIndex = (index % 9) + 1;
  return alphaGenerator(letterIndex) + numIndex;
}

/**
 * Short pattern: uses shortest possible keys
 * _, a, b, ..., z, aa, ab, ...
 */
function shortGenerator(index: number): string {
  if (index === 0) return '_';
  return alphaGenerator(index - 1);
}

/**
 * Prefixed pattern: k0, k1, k2, ...
 */
function prefixedGenerator(prefix: string, style: 'numeric' | 'alpha' = 'numeric'): KeyGenerator {
  return (index: number) => {
    if (style === 'alpha') {
      return prefix + alphaGenerator(index);
    }
    return prefix + index;
  };
}

/**
 * Creates a key generator from a pattern configuration
 */
export function createKeyGenerator(pattern: KeyPattern): { generator: KeyGenerator; name: string } {
  // If it's already a function, use it directly
  if (typeof pattern === 'function') {
    return { generator: pattern, name: 'custom' };
  }

  // If it's a preset string
  if (typeof pattern === 'string') {
    switch (pattern) {
      case 'alpha':
        return { generator: alphaGenerator, name: 'alpha' };
      case 'numeric':
        return { generator: numericGenerator, name: 'numeric' };
      case 'alphanumeric':
        return { generator: alphanumericGenerator, name: 'alphanumeric' };
      case 'short':
        return { generator: shortGenerator, name: 'short' };
      case 'prefixed':
        return { generator: prefixedGenerator('k'), name: 'prefixed:k' };
      default:
        return { generator: alphaGenerator, name: 'alpha' };
    }
  }

  // If it's a prefix config object
  if (typeof pattern === 'object' && 'prefix' in pattern) {
    return {
      generator: prefixedGenerator(pattern.prefix, pattern.style || 'numeric'),
      name: `prefixed:${pattern.prefix}`,
    };
  }

  return { generator: alphaGenerator, name: 'alpha' };
}

/**
 * Resolves nested handling to a numeric depth
 */
function resolveNestedDepth(handling: NestedHandling | undefined, maxDepth: number): number {
  if (handling === undefined || handling === 'deep') {
    return maxDepth;
  }
  if (handling === 'shallow') {
    return 1;
  }
  if (handling === 'arrays') {
    return maxDepth; // Special handling in collect/compress functions
  }
  if (typeof handling === 'number') {
    return handling;
  }
  return maxDepth;
}

// Legacy generateShortKey removed - use createKeyGenerator instead

interface CollectKeysOptions {
  minKeyLength: number;
  maxDepth: number;
  nestedHandling: NestedHandling;
  excludeKeys?: string[];
  includeKeys?: string[];
  homogeneousOnly?: boolean;
}

/**
 * Collects all unique keys from an array of objects
 */
function collectKeys(
  data: Record<string, unknown>[],
  options: CollectKeysOptions,
  currentDepth: number = 0
): Set<string> {
  const keys = new Set<string>();
  const { minKeyLength, maxDepth, nestedHandling, excludeKeys, includeKeys } = options;

  if (currentDepth >= maxDepth) return keys;

  // For homogeneous mode, track key counts
  const keyCounts = new Map<string, number>();

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    for (const key of Object.keys(item)) {
      // Skip excluded keys
      if (excludeKeys?.includes(key)) continue;

      // Include if in includeKeys, or if meets minKeyLength
      const shouldInclude = includeKeys?.includes(key) || key.length >= minKeyLength;

      if (shouldInclude) {
        keys.add(key);
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      }

      // Handle nested structures based on nestedHandling option
      const value = item[key];

      if (nestedHandling === 'shallow') {
        // Don't process nested structures
        continue;
      }

      if (Array.isArray(value) && value.length > 0 && isCompressibleArray(value)) {
        // Nested array of objects - always process
        const nestedKeys = collectKeys(
          value as Record<string, unknown>[],
          options,
          currentDepth + 1
        );
        nestedKeys.forEach(k => keys.add(k));
      } else if (
        nestedHandling !== 'arrays' &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Single nested object - skip if nestedHandling is 'arrays'
        const nestedKeys = collectKeys(
          [value as Record<string, unknown>],
          options,
          currentDepth + 1
        );
        nestedKeys.forEach(k => keys.add(k));
      }
    }
  }

  // If homogeneous mode, only keep keys that appear in ALL objects
  if (options.homogeneousOnly && data.length > 0) {
    for (const [key, count] of keyCounts) {
      if (count < data.length) {
        keys.delete(key);
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

// Re-export CompressOptions from types for backwards compatibility
export type { CompressOptions } from './types';

/**
 * Compresses an array of objects by replacing keys with short aliases
 */
export function compress<T extends Record<string, unknown>[]>(
  data: T,
  options: CompressOptions = {}
): TersePayload<unknown[]> {
  const {
    minKeyLength = 3,
    maxDepth = 10,
    keyPattern = 'alpha',
    nestedHandling = 'deep',
    homogeneousOnly = false,
    excludeKeys,
    includeKeys,
  } = options;

  // Create key generator
  const { generator, name: patternName } = createKeyGenerator(keyPattern);

  // Resolve nested depth
  const effectiveDepth = resolveNestedDepth(nestedHandling, maxDepth);

  // Collect all unique keys
  const allKeys = collectKeys(data, {
    minKeyLength,
    maxDepth: effectiveDepth,
    nestedHandling,
    excludeKeys,
    includeKeys,
    homogeneousOnly,
  });

  // Sort keys by frequency of use (most used first) for optimal compression
  // For now, just sort alphabetically for deterministic output
  const sortedKeys = Array.from(allKeys).sort();

  // Create bidirectional mapping
  const keyToShort = new Map<string, string>();
  const keyMap: Record<string, string> = {};

  sortedKeys.forEach((key, index) => {
    const shortKey = generator(index);
    // Only use short key if it's actually shorter
    if (shortKey.length < key.length) {
      keyToShort.set(key, shortKey);
      keyMap[shortKey] = key;
    }
  });

  // Compress the data
  const compressed = data.map(item =>
    compressObject(item, keyToShort, effectiveDepth)
  );

  return {
    __terse__: true,
    v: 1,
    k: keyMap,
    d: compressed,
    p: patternName,
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
