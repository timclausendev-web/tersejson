/**
 * TerseJSON PostgreSQL Integration
 *
 * Zero-config integration with node-postgres (pg).
 * Call tersePg() once at startup and all queries automatically
 * return memory-efficient Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { tersePg } from 'tersejson/pg';
 * import { Client } from 'pg';
 *
 * await tersePg(); // Patch once at startup
 *
 * const client = new Client();
 * await client.connect();
 * const { rows } = await client.query('SELECT * FROM users');
 * // rows is automatically Proxy-wrapped - 70% less memory
 * ```
 *
 * @packageDocumentation
 */

import { compress, wrapWithProxy, isCompressibleArray } from './core';
import { CompressOptions } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for tersePg initialization
 */
export interface TersePgOptions extends Partial<CompressOptions> {
  /**
   * Enable/disable compression (default: true)
   */
  enabled?: boolean;

  /**
   * Minimum array length to compress (default: 1)
   */
  minArrayLength?: number;

  /**
   * Skip compression for single row results (default: false)
   */
  skipSingleRows?: boolean;
}

// ============================================================================
// STATE
// ============================================================================

let isPatched = false;
let globalOptions: TersePgOptions = {};

// Store original methods for restoration
const originalMethods: {
  clientQuery?: Function;
  poolQuery?: Function;
} = {};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wrap an array of rows with TerseJSON Proxy
 */
function wrapResults<T extends Record<string, unknown>>(results: T[]): T[] {
  if (globalOptions.enabled === false) {
    return results;
  }

  if (results.length < (globalOptions.minArrayLength ?? 1)) {
    return results;
  }

  if (!isCompressibleArray(results)) {
    return results;
  }

  const payload = compress(results as Record<string, unknown>[], globalOptions);
  return wrapWithProxy(payload) as T[];
}

/**
 * Wrap query result, preserving the result object structure
 */
function wrapQueryResult(result: any): any {
  if (!result || !result.rows || !Array.isArray(result.rows)) {
    return result;
  }

  // Wrap the rows array
  result.rows = wrapResults(result.rows);
  return result;
}

// ============================================================================
// PATCHING FUNCTIONS
// ============================================================================

/**
 * Dynamically import pg and patch its prototypes
 */
async function patchPg(): Promise<void> {
  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    throw new Error(
      'tersePg requires pg to be installed. Run: npm install pg'
    );
  }

  const { Client, Pool } = pg;

  // Patch Client.prototype.query
  if (Client?.prototype) {
    originalMethods.clientQuery = Client.prototype.query;
    (Client.prototype as any).query = async function (
      ...args: any[]
    ): Promise<any> {
      const result = await originalMethods.clientQuery!.apply(this, args);
      return wrapQueryResult(result);
    };
  }

  // Patch Pool.prototype.query
  if (Pool?.prototype) {
    originalMethods.poolQuery = Pool.prototype.query;
    (Pool.prototype as any).query = async function (
      ...args: any[]
    ): Promise<any> {
      const result = await originalMethods.poolQuery!.apply(this, args);
      return wrapQueryResult(result);
    };
  }
}

/**
 * Restore original pg methods
 */
async function unpatchPg(): Promise<void> {
  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    return;
  }

  const { Client, Pool } = pg;

  if (Client?.prototype && originalMethods.clientQuery) {
    Client.prototype.query = originalMethods.clientQuery as any;
  }

  if (Pool?.prototype && originalMethods.poolQuery) {
    Pool.prototype.query = originalMethods.poolQuery as any;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize TerseJSON integration with node-postgres.
 *
 * Call this once at application startup, before any database queries.
 * All subsequent queries will automatically return Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { tersePg } from 'tersejson/pg';
 *
 * // Basic usage
 * await tersePg();
 *
 * // With options
 * await tersePg({
 *   minKeyLength: 4,
 *   minArrayLength: 5,
 *   skipSingleRows: true,
 * });
 * ```
 *
 * @param options - Configuration options
 */
export async function tersePg(options: TersePgOptions = {}): Promise<void> {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };
  await patchPg();
  isPatched = true;
}

/**
 * Synchronous version of tersePg for CommonJS compatibility.
 *
 * @param options - Configuration options
 */
export function tersePgSync(options: TersePgOptions = {}): void {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };

  let pg: typeof import('pg');
  try {
    pg = require('pg');
  } catch {
    throw new Error(
      'tersePg requires pg to be installed. Run: npm install pg'
    );
  }

  const { Client, Pool } = pg;

  if (Client?.prototype) {
    originalMethods.clientQuery = Client.prototype.query;
    (Client.prototype as any).query = async function (
      ...args: any[]
    ): Promise<any> {
      const result = await originalMethods.clientQuery!.apply(this, args);
      return wrapQueryResult(result);
    };
  }

  if (Pool?.prototype) {
    originalMethods.poolQuery = Pool.prototype.query;
    (Pool.prototype as any).query = async function (
      ...args: any[]
    ): Promise<any> {
      const result = await originalMethods.poolQuery!.apply(this, args);
      return wrapQueryResult(result);
    };
  }

  isPatched = true;
}

/**
 * Remove TerseJSON patches from pg.
 */
export async function untersePg(): Promise<void> {
  if (!isPatched) return;

  await unpatchPg();

  Object.keys(originalMethods).forEach((key) => {
    delete originalMethods[key as keyof typeof originalMethods];
  });

  isPatched = false;
  globalOptions = {};
}

/**
 * Check if TerseJSON pg patching is active
 */
export function isTersePgActive(): boolean {
  return isPatched;
}

/**
 * Get current TerseJSON pg options
 */
export function getTersePgOptions(): TersePgOptions {
  return { ...globalOptions };
}

/**
 * Update TerseJSON pg options without re-patching
 */
export function setTersePgOptions(options: Partial<TersePgOptions>): void {
  globalOptions = { ...globalOptions, ...options };
}
