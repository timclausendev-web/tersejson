/**
 * TerseJSON
 *
 * Transparent JSON key compression for Express APIs.
 * Reduce bandwidth by up to 80% with zero code changes.
 *
 * @example Backend (Express)
 * ```typescript
 * import express from 'express';
 * import { terse } from 'tersejson/express';
 *
 * const app = express();
 * app.use(terse());
 *
 * app.get('/api/users', (req, res) => {
 *   res.json(users); // Automatically compressed!
 * });
 * ```
 *
 * @example Frontend
 * ```typescript
 * import { fetch } from 'tersejson/client';
 *
 * const users = await fetch('/api/users').then(r => r.json());
 * console.log(users[0].firstName); // Works transparently!
 * ```
 *
 * @packageDocumentation
 */

// Core exports
export {
  compress,
  expand,
  isCompressibleArray,
  isTersePayload,
  createTerseProxy,
  wrapWithProxy,
} from './core';

// Type exports
export type {
  TersePayload,
  TerseMiddlewareOptions,
  TerseClientOptions,
  Tersed,
} from './types';

// Re-export submodules for convenience
export * as express from './express';
export * as client from './client';
export * as integrations from './integrations';
