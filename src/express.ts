/**
 * TerseJSON Express Middleware
 *
 * Automatically compresses JSON responses with repeated object structures.
 * Zero configuration required - just add the middleware.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { TerseMiddlewareOptions } from './types';
import { compress, isCompressibleArray } from './core';

const DEFAULT_OPTIONS: Required<TerseMiddlewareOptions> = {
  // Middleware-specific options
  minArrayLength: 2,
  shouldCompress: () => true,
  headerName: 'x-terse-json',
  debug: false,
  // CompressOptions
  minKeyLength: 3,
  maxDepth: 10,
  keyPattern: 'alpha',
  nestedHandling: 'deep',
  homogeneousOnly: false,
  excludeKeys: [],
  includeKeys: [],
};

/**
 * Creates the TerseJSON Express middleware
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { terse } from 'tersejson/express';
 *
 * const app = express();
 * app.use(terse());
 *
 * app.get('/users', (req, res) => {
 *   // Just send data as normal - compression is automatic
 *   res.json(users);
 * });
 * ```
 */
export function terse(options: TerseMiddlewareOptions = {}): RequestHandler {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function terseMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Check if client supports terse responses
    const acceptsTerse = req.headers['accept-terse'] === 'true' ||
                         req.headers['x-accept-terse'] === 'true';

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = function terseJson(data: unknown): Response {
      // Skip if client doesn't accept terse or compression is disabled
      if (!acceptsTerse) {
        return originalJson(data);
      }

      // Check if data is compressible
      if (!isCompressibleArray(data)) {
        return originalJson(data);
      }

      // Check minimum array length
      if ((data as unknown[]).length < config.minArrayLength) {
        return originalJson(data);
      }

      // Check custom shouldCompress function
      if (!config.shouldCompress(data, req)) {
        return originalJson(data);
      }

      try {
        // Compress the data
        const compressed = compress(data as Record<string, unknown>[], {
          minKeyLength: config.minKeyLength,
          maxDepth: config.maxDepth,
          keyPattern: config.keyPattern,
          nestedHandling: config.nestedHandling,
          homogeneousOnly: config.homogeneousOnly,
          excludeKeys: config.excludeKeys,
          includeKeys: config.includeKeys,
        });

        // Calculate savings for debugging
        if (config.debug) {
          const originalSize = JSON.stringify(data).length;
          const compressedSize = JSON.stringify(compressed).length;
          const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
          console.log(
            `[tersejson] Compressed ${originalSize} -> ${compressedSize} bytes (${savings}% savings)`
          );
        }

        // Set header to indicate terse response
        res.setHeader(config.headerName, 'true');

        return originalJson(compressed);
      } catch (error) {
        // If compression fails, fall back to original
        if (config.debug) {
          console.error('[tersejson] Compression failed:', error);
        }
        return originalJson(data);
      }
    };

    next();
  };
}

/**
 * Middleware to automatically add x-accept-terse header based on query param
 * Useful for testing or when you can't control client headers
 *
 * @example
 * ```typescript
 * app.use(terseQueryParam());
 * // Now ?terse=true will enable compression
 * ```
 */
export function terseQueryParam(paramName: string = 'terse'): RequestHandler {
  return function terseQueryMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    if (req.query[paramName] === 'true') {
      req.headers['accept-terse'] = 'true';
    }
    next();
  };
}

// Default export for convenience
export default terse;
