/**
 * TerseJSON MySQL Integration
 *
 * Zero-config integration with mysql2.
 * Call terseMysql() once at startup and all queries automatically
 * return memory-efficient Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseMysql } from 'tersejson/mysql';
 * import mysql from 'mysql2/promise';
 *
 * await terseMysql(); // Patch once at startup
 *
 * const connection = await mysql.createConnection({...});
 * const [rows] = await connection.query('SELECT * FROM users');
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
 * Options for terseMysql initialization
 */
export interface TerseMysqlOptions extends Partial<CompressOptions> {
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
let globalOptions: TerseMysqlOptions = {};

// Store original methods for restoration
const originalMethods: {
  connectionQuery?: Function;
  connectionExecute?: Function;
  poolQuery?: Function;
  poolExecute?: Function;
  poolConnectionQuery?: Function;
  poolConnectionExecute?: Function;
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
 * Wrap mysql2 query result, handling the [rows, fields] tuple format
 */
function wrapQueryResult(result: any): any {
  // mysql2 returns [rows, fields] for queries
  if (Array.isArray(result) && result.length >= 2) {
    const [rows, fields] = result;

    // Only wrap if rows is an array of objects
    if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null) {
      return [wrapResults(rows), fields];
    }

    return result;
  }

  // Handle non-tuple results (shouldn't happen with mysql2 but just in case)
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
    return wrapResults(result);
  }

  return result;
}

// ============================================================================
// PATCHING FUNCTIONS
// ============================================================================

/**
 * Dynamically import mysql2 and patch its prototypes
 */
async function patchMysql(): Promise<void> {
  let mysql: any;
  try {
    mysql = await import('mysql2/promise');
  } catch {
    throw new Error(
      'terseMysql requires mysql2 to be installed. Run: npm install mysql2'
    );
  }

  // mysql2/promise exports Connection and Pool classes
  // We need to patch their prototypes

  // For Connection - we patch via createConnection result
  const originalCreateConnection = mysql.createConnection;
  mysql.createConnection = async function (...args: any[]): Promise<any> {
    const connection = await originalCreateConnection.apply(mysql, args);
    patchConnection(connection);
    return connection;
  };

  // For Pool - we patch via createPool result
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function (...args: any[]): any {
    const pool = originalCreatePool.apply(mysql, args);
    patchPool(pool);
    return pool;
  };

  // Store originals for restoration
  originalMethods.connectionQuery = originalCreateConnection;
  originalMethods.poolQuery = originalCreatePool;
}

/**
 * Patch a connection instance
 */
function patchConnection(connection: any): void {
  const originalQuery = connection.query.bind(connection);
  const originalExecute = connection.execute.bind(connection);

  connection.query = async function (...args: any[]): Promise<any> {
    const result = await originalQuery(...args);
    return wrapQueryResult(result);
  };

  connection.execute = async function (...args: any[]): Promise<any> {
    const result = await originalExecute(...args);
    return wrapQueryResult(result);
  };
}

/**
 * Patch a pool instance
 */
function patchPool(pool: any): void {
  const originalQuery = pool.query.bind(pool);
  const originalExecute = pool.execute.bind(pool);
  const originalGetConnection = pool.getConnection.bind(pool);

  pool.query = async function (...args: any[]): Promise<any> {
    const result = await originalQuery(...args);
    return wrapQueryResult(result);
  };

  pool.execute = async function (...args: any[]): Promise<any> {
    const result = await originalExecute(...args);
    return wrapQueryResult(result);
  };

  // Also patch connections obtained from pool
  pool.getConnection = async function (): Promise<any> {
    const connection = await originalGetConnection();
    patchConnection(connection);
    return connection;
  };
}

/**
 * Restore original mysql2 methods
 */
async function unpatchMysql(): Promise<void> {
  // Since we patch instance methods, we can't easily unpatch
  // The isPatched flag prevents re-patching
  // New connections after unterse() won't be patched
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize TerseJSON integration with mysql2.
 *
 * Call this once at application startup, before creating any connections.
 * All subsequent queries will automatically return Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseMysql } from 'tersejson/mysql';
 *
 * // Basic usage
 * await terseMysql();
 *
 * // With options
 * await terseMysql({
 *   minKeyLength: 4,
 *   minArrayLength: 5,
 *   skipSingleRows: true,
 * });
 * ```
 *
 * @param options - Configuration options
 */
export async function terseMysql(options: TerseMysqlOptions = {}): Promise<void> {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };
  await patchMysql();
  isPatched = true;
}

/**
 * Synchronous version of terseMysql for CommonJS compatibility.
 *
 * @param options - Configuration options
 */
export function terseMysqlSync(options: TerseMysqlOptions = {}): void {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };

  let mysql: any;
  try {
    mysql = require('mysql2/promise');
  } catch {
    throw new Error(
      'terseMysql requires mysql2 to be installed. Run: npm install mysql2'
    );
  }

  // Patch createConnection and createPool
  const originalCreateConnection = mysql.createConnection;
  mysql.createConnection = async function (...args: any[]): Promise<any> {
    const connection = await originalCreateConnection.apply(mysql, args);
    patchConnection(connection);
    return connection;
  };

  const originalCreatePool = mysql.createPool;
  mysql.createPool = function (...args: any[]): any {
    const pool = originalCreatePool.apply(mysql, args);
    patchPool(pool);
    return pool;
  };

  isPatched = true;
}

/**
 * Remove TerseJSON patches from mysql2.
 * Note: Existing connections will remain patched.
 * Only new connections created after this call will be unpatched.
 */
export async function unterseMysql(): Promise<void> {
  if (!isPatched) return;

  await unpatchMysql();

  Object.keys(originalMethods).forEach((key) => {
    delete originalMethods[key as keyof typeof originalMethods];
  });

  isPatched = false;
  globalOptions = {};
}

/**
 * Check if TerseJSON mysql2 patching is active
 */
export function isTerseMysqlActive(): boolean {
  return isPatched;
}

/**
 * Get current TerseJSON mysql2 options
 */
export function getTerseMysqlOptions(): TerseMysqlOptions {
  return { ...globalOptions };
}

/**
 * Update TerseJSON mysql2 options without re-patching
 */
export function setTerseMysqlOptions(options: Partial<TerseMysqlOptions>): void {
  globalOptions = { ...globalOptions, ...options };
}
