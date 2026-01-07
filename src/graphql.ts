/**
 * TerseJSON GraphQL Middleware
 *
 * Integration for express-graphql that compresses arrays within GraphQL responses.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  GraphQLTerseOptions,
  GraphQLTerseMetadata,
  GraphQLTerseResponse,
  CompressOptions,
} from './types';
import { isCompressibleArray, createKeyGenerator } from './core';

/**
 * Default options for GraphQL compression
 */
const DEFAULT_OPTIONS: Required<Omit<GraphQLTerseOptions, 'shouldCompress' | 'excludePaths'>> & {
  shouldCompress?: GraphQLTerseOptions['shouldCompress'];
  excludePaths: string[];
} = {
  minArrayLength: 2,
  debug: false,
  minKeyLength: 3,
  maxDepth: 10,
  keyPattern: 'alpha',
  nestedHandling: 'deep',
  homogeneousOnly: false,
  excludeKeys: [],
  includeKeys: [],
  excludePaths: [],
};

/**
 * Result from finding compressible arrays
 */
interface CompressibleArrayInfo {
  path: string;
  data: Record<string, unknown>[];
}

/**
 * Finds all compressible arrays within a data structure
 */
export function findCompressibleArrays(
  data: unknown,
  basePath: string = 'data',
  options: { minArrayLength: number; excludePaths: string[]; maxDepth: number },
  currentDepth: number = 0
): CompressibleArrayInfo[] {
  const results: CompressibleArrayInfo[] = [];

  if (currentDepth >= options.maxDepth) return results;

  if (Array.isArray(data)) {
    // Check if this array is compressible
    if (
      isCompressibleArray(data) &&
      data.length >= options.minArrayLength &&
      !options.excludePaths.includes(basePath)
    ) {
      results.push({ path: basePath, data: data as Record<string, unknown>[] });
    }

    // Also check for nested arrays within array items
    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const nestedResults = findCompressibleArrays(
          item,
          `${basePath}[${index}]`,
          options,
          currentDepth + 1
        );
        results.push(...nestedResults);
      }
    });
  } else if (typeof data === 'object' && data !== null) {
    // Walk object properties
    for (const [key, value] of Object.entries(data)) {
      const path = `${basePath}.${key}`;
      const nestedResults = findCompressibleArrays(value, path, options, currentDepth + 1);
      results.push(...nestedResults);
    }
  }

  return results;
}

/**
 * Collects all unique keys from multiple arrays
 */
function collectKeysFromArrays(
  arrays: CompressibleArrayInfo[],
  options: CompressOptions
): Set<string> {
  const allKeys = new Set<string>();
  const { minKeyLength = 3, excludeKeys = [], includeKeys = [] } = options;

  function collectFromObject(obj: Record<string, unknown>, depth: number = 0): void {
    if (depth >= (options.maxDepth ?? 10)) return;

    for (const key of Object.keys(obj)) {
      // Skip excluded keys
      if (excludeKeys.includes(key)) continue;

      // Include if in includeKeys, or if meets minKeyLength
      const shouldInclude = includeKeys.includes(key) || key.length >= minKeyLength;
      if (shouldInclude) {
        allKeys.add(key);
      }

      // Recurse into nested structures
      const value = obj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            collectFromObject(item as Record<string, unknown>, depth + 1);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        collectFromObject(value as Record<string, unknown>, depth + 1);
      }
    }
  }

  for (const { data } of arrays) {
    for (const item of data) {
      collectFromObject(item);
    }
  }

  return allKeys;
}

/**
 * Compresses an object using the key mapping
 */
function compressObjectWithMap(
  obj: Record<string, unknown>,
  keyToShort: Map<string, string>,
  maxDepth: number,
  currentDepth: number = 0
): Record<string, unknown> {
  if (currentDepth >= maxDepth) return obj;

  const compressed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const shortKey = keyToShort.get(key) ?? key;

    if (Array.isArray(value)) {
      compressed[shortKey] = value.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return compressObjectWithMap(
            item as Record<string, unknown>,
            keyToShort,
            maxDepth,
            currentDepth + 1
          );
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      compressed[shortKey] = compressObjectWithMap(
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
 * Sets a value at a path in an object (mutates the object)
 */
function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const isIndex = /^\d+$/.test(part);
    if (isIndex) {
      current = (current as unknown[])[parseInt(part, 10)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const isLastIndex = /^\d+$/.test(lastPart);
  if (isLastIndex) {
    (current as unknown[])[parseInt(lastPart, 10)] = value;
  } else {
    (current as Record<string, unknown>)[lastPart] = value;
  }
}

/**
 * Compresses a GraphQL response in-place
 */
export function compressGraphQLResponse<T extends { data?: unknown }>(
  response: T,
  options: GraphQLTerseOptions = {}
): GraphQLTerseResponse<T['data']> | T {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // If no data field, return as-is
  if (!response.data) {
    return response;
  }

  // Find all compressible arrays
  const arrays = findCompressibleArrays(response.data, 'data', {
    minArrayLength: config.minArrayLength,
    excludePaths: config.excludePaths,
    maxDepth: config.maxDepth,
  });

  // Apply custom shouldCompress filter
  const filteredArrays = config.shouldCompress
    ? arrays.filter(({ path, data }) => config.shouldCompress!(data, path))
    : arrays;

  // If no arrays to compress, return as-is
  if (filteredArrays.length === 0) {
    return response;
  }

  // Collect all unique keys from all arrays
  const allKeys = collectKeysFromArrays(filteredArrays, config);

  // Sort keys for deterministic output
  const sortedKeys = Array.from(allKeys).sort();

  // Create key generator
  const { generator } = createKeyGenerator(config.keyPattern);

  // Build key mapping
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

  // If no keys were actually shortened, return as-is
  if (Object.keys(keyMap).length === 0) {
    return response;
  }

  // Clone the data to avoid mutating the original
  const clonedData = JSON.parse(JSON.stringify(response.data));

  // Sort paths from deepest to shallowest to avoid breaking nested access
  // when parent arrays have their keys renamed
  const sortedArrays = [...filteredArrays].sort((a, b) => {
    const depthA = (a.path.match(/\./g) || []).length + (a.path.match(/\[/g) || []).length;
    const depthB = (b.path.match(/\./g) || []).length + (b.path.match(/\[/g) || []).length;
    return depthB - depthA; // Deepest first
  });

  // Compress each array and update in the cloned data
  const paths: string[] = [];
  for (const { path, data } of sortedArrays) {
    const compressedArray = data.map(item =>
      compressObjectWithMap(item, keyToShort, config.maxDepth)
    );
    setAtPath({ data: clonedData } as Record<string, unknown>, path, compressedArray);
    paths.push(path);
  }

  // Build the terse metadata
  const terseMeta: GraphQLTerseMetadata = {
    v: 1,
    k: keyMap,
    paths,
  };

  // Build the response
  const terseResponse: GraphQLTerseResponse<T['data']> = {
    data: clonedData as T['data'],
    __terse__: terseMeta,
  };

  // Preserve errors and extensions if present
  if ('errors' in response && response.errors) {
    terseResponse.errors = response.errors as GraphQLTerseResponse['errors'];
  }
  if ('extensions' in response && response.extensions) {
    terseResponse.extensions = response.extensions as GraphQLTerseResponse['extensions'];
  }

  if (config.debug) {
    const originalSize = JSON.stringify(response).length;
    const compressedSize = JSON.stringify(terseResponse).length;
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(
      `[tersejson/graphql] Compressed ${originalSize} -> ${compressedSize} bytes (${savings}% savings)`
    );
    console.log(`[tersejson/graphql] Compressed paths: ${paths.join(', ')}`);
  }

  return terseResponse;
}

/**
 * Creates a format function for express-graphql
 *
 * @example
 * ```typescript
 * import { graphqlHTTP } from 'express-graphql';
 * import { createTerseFormatFn } from 'tersejson/graphql';
 *
 * app.use('/graphql', graphqlHTTP({
 *   schema: mySchema,
 *   formatResult: createTerseFormatFn({ debug: true }),
 * }));
 * ```
 */
export function createTerseFormatFn(options: GraphQLTerseOptions = {}) {
  return function formatResult(
    result: { data?: unknown; errors?: unknown[]; extensions?: Record<string, unknown> },
    _context?: unknown,
    _info?: unknown
  ) {
    return compressGraphQLResponse(result, options);
  };
}

/**
 * Express middleware wrapper for express-graphql
 *
 * @example
 * ```typescript
 * import { graphqlHTTP } from 'express-graphql';
 * import { terseGraphQL } from 'tersejson/graphql';
 *
 * app.use('/graphql', terseGraphQL(
 *   graphqlHTTP({
 *     schema: mySchema,
 *     graphiql: true,
 *   }),
 *   { debug: true }
 * ));
 * ```
 */
export function terseGraphQL(
  graphqlMiddleware: RequestHandler,
  options: GraphQLTerseOptions = {}
): RequestHandler {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function terseGraphQLMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Check if client supports terse responses
    const acceptsTerse =
      req.headers['accept-terse'] === 'true' || req.headers['x-accept-terse'] === 'true';

    if (!acceptsTerse) {
      // Client doesn't support terse, pass through to original middleware
      graphqlMiddleware(req, res, next);
      return;
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to intercept the response
    res.json = function terseGraphQLJson(data: unknown): Response {
      // Check if this looks like a GraphQL response
      if (typeof data === 'object' && data !== null && 'data' in data) {
        try {
          const compressed = compressGraphQLResponse(
            data as { data?: unknown; errors?: unknown[]; extensions?: Record<string, unknown> },
            config
          );

          // If compression happened, set the header
          if ('__terse__' in compressed) {
            res.setHeader('x-terse-json', 'graphql');
          }

          return originalJson(compressed);
        } catch (error) {
          if (config.debug) {
            console.error('[tersejson/graphql] Compression failed:', error);
          }
          return originalJson(data);
        }
      }

      return originalJson(data);
    };

    // Call the original GraphQL middleware
    graphqlMiddleware(req, res, next);
  };
}

// Default export
export default terseGraphQL;
