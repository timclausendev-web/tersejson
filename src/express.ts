/**
 * TerseJSON Express Middleware
 *
 * Automatically compresses JSON responses with repeated object structures.
 * Zero configuration required - just add the middleware.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { TerseMiddlewareOptions } from './types';
import { compress, isCompressibleArray } from './core';
import { recordEvent, TerseAnalytics, AnalyticsConfig } from './analytics';

/**
 * Extended middleware options with analytics
 */
export interface TerseMiddlewareOptionsWithAnalytics extends TerseMiddlewareOptions {
  /**
   * Analytics configuration
   * Set to true for local-only analytics
   * Set to { apiKey: 'xxx' } for cloud reporting
   */
  analytics?: boolean | Partial<AnalyticsConfig> | TerseAnalytics;
}

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
export function terse(options: TerseMiddlewareOptionsWithAnalytics = {}): RequestHandler {
  const { analytics: analyticsOption, ...restOptions } = options;
  const config = { ...DEFAULT_OPTIONS, ...restOptions };

  // Setup analytics if enabled
  let analyticsInstance: TerseAnalytics | null = null;
  if (analyticsOption) {
    if (analyticsOption instanceof TerseAnalytics) {
      analyticsInstance = analyticsOption;
    } else if (analyticsOption === true) {
      // Local-only analytics
      analyticsInstance = new TerseAnalytics({ enabled: true, debug: config.debug });
    } else if (typeof analyticsOption === 'object') {
      analyticsInstance = new TerseAnalytics({ enabled: true, ...analyticsOption });
    }
  }

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
        const dataArray = data as Record<string, unknown>[];

        // Compress the data
        const compressed = compress(dataArray, {
          minKeyLength: config.minKeyLength,
          maxDepth: config.maxDepth,
          keyPattern: config.keyPattern,
          nestedHandling: config.nestedHandling,
          homogeneousOnly: config.homogeneousOnly,
          excludeKeys: config.excludeKeys,
          includeKeys: config.includeKeys,
        });

        // Calculate sizes
        const originalSize = JSON.stringify(data).length;
        const compressedSize = JSON.stringify(compressed).length;

        // Record analytics
        if (analyticsInstance) {
          analyticsInstance.record({
            originalSize,
            compressedSize,
            objectCount: dataArray.length,
            keysCompressed: Object.keys(compressed.k).length,
            endpoint: req.path,
            keyPattern: compressed.p || 'alpha',
          });
        }

        // Also record to global analytics if initialized
        recordEvent({
          originalSize,
          compressedSize,
          objectCount: dataArray.length,
          keysCompressed: Object.keys(compressed.k).length,
          endpoint: req.path,
          keyPattern: compressed.p || 'alpha',
        });

        // Debug logging
        if (config.debug) {
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

// Re-export analytics for convenience
export { TerseAnalytics, analytics, initAnalytics, getAnalytics } from './analytics';
export type { AnalyticsConfig, AnalyticsStats, CompressionEvent } from './analytics';

// Default export for convenience
export default terse;
