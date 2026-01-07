/**
 * TerseJSON SQLite Integration
 *
 * Zero-config integration with better-sqlite3.
 * Call terseSqlite() once at startup and all queries automatically
 * return memory-efficient Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseSqlite } from 'tersejson/sqlite';
 * import Database from 'better-sqlite3';
 *
 * terseSqlite(); // Patch once at startup
 *
 * const db = new Database('my.db');
 * const rows = db.prepare('SELECT * FROM users').all();
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
 * Options for terseSqlite initialization
 */
export interface TerseSqliteOptions extends Partial<CompressOptions> {
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
let globalOptions: TerseSqliteOptions = {};

// Store original methods for restoration
const originalMethods: {
  statementAll?: Function;
  statementGet?: Function;
  statementIterate?: Function;
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
 * Wrap a single row with TerseJSON Proxy
 */
function wrapSingleRow<T extends Record<string, unknown>>(row: T): T {
  if (globalOptions.enabled === false || globalOptions.skipSingleRows) {
    return row;
  }

  if (row === null || row === undefined) {
    return row;
  }

  if (typeof row !== 'object') {
    return row;
  }

  const payload = compress([row] as Record<string, unknown>[], globalOptions);
  const wrapped = wrapWithProxy(payload) as T[];
  return wrapped[0];
}

// ============================================================================
// PATCHING FUNCTIONS
// ============================================================================

/**
 * Patch better-sqlite3 Statement prototype
 */
function patchSqlite(): void {
  let Database: any;
  try {
    Database = require('better-sqlite3');
  } catch {
    throw new Error(
      'terseSqlite requires better-sqlite3 to be installed. Run: npm install better-sqlite3'
    );
  }

  // better-sqlite3 exposes Statement through a temporary database
  // We need to create a temp db to access Statement.prototype
  const tempDb = new Database(':memory:');
  const stmt = tempDb.prepare('SELECT 1');
  const StatementProto = Object.getPrototypeOf(stmt);
  tempDb.close();

  // Patch Statement.prototype.all()
  if (StatementProto.all) {
    originalMethods.statementAll = StatementProto.all;
    StatementProto.all = function (...args: any[]): any[] {
      const results = originalMethods.statementAll!.apply(this, args);
      return wrapResults(results);
    };
  }

  // Patch Statement.prototype.get()
  if (StatementProto.get) {
    originalMethods.statementGet = StatementProto.get;
    StatementProto.get = function (...args: any[]): any {
      const result = originalMethods.statementGet!.apply(this, args);
      return wrapSingleRow(result);
    };
  }

  // Patch Statement.prototype.iterate()
  if (StatementProto.iterate) {
    originalMethods.statementIterate = StatementProto.iterate;
    StatementProto.iterate = function* (...args: any[]): Generator<any> {
      const iterator = originalMethods.statementIterate!.apply(this, args);
      for (const row of iterator) {
        yield wrapSingleRow(row);
      }
    };
  }
}

/**
 * Restore original better-sqlite3 methods
 */
function unpatchSqlite(): void {
  let Database: any;
  try {
    Database = require('better-sqlite3');
  } catch {
    return;
  }

  // Get Statement prototype again
  const tempDb = new Database(':memory:');
  const stmt = tempDb.prepare('SELECT 1');
  const StatementProto = Object.getPrototypeOf(stmt);
  tempDb.close();

  if (originalMethods.statementAll) {
    StatementProto.all = originalMethods.statementAll;
  }

  if (originalMethods.statementGet) {
    StatementProto.get = originalMethods.statementGet;
  }

  if (originalMethods.statementIterate) {
    StatementProto.iterate = originalMethods.statementIterate;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize TerseJSON integration with better-sqlite3.
 *
 * Call this once at application startup, before any database queries.
 * All subsequent queries will automatically return Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseSqlite } from 'tersejson/sqlite';
 *
 * // Basic usage
 * terseSqlite();
 *
 * // With options
 * terseSqlite({
 *   minKeyLength: 4,
 *   minArrayLength: 5,
 *   skipSingleRows: true,
 * });
 * ```
 *
 * @param options - Configuration options
 */
export function terseSqlite(options: TerseSqliteOptions = {}): void {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };
  patchSqlite();
  isPatched = true;
}

/**
 * Remove TerseJSON patches from better-sqlite3.
 */
export function unterseSqlite(): void {
  if (!isPatched) return;

  unpatchSqlite();

  Object.keys(originalMethods).forEach((key) => {
    delete originalMethods[key as keyof typeof originalMethods];
  });

  isPatched = false;
  globalOptions = {};
}

/**
 * Check if TerseJSON better-sqlite3 patching is active
 */
export function isTerseSqliteActive(): boolean {
  return isPatched;
}

/**
 * Get current TerseJSON better-sqlite3 options
 */
export function getTerseSqliteOptions(): TerseSqliteOptions {
  return { ...globalOptions };
}

/**
 * Update TerseJSON better-sqlite3 options without re-patching
 */
export function setTerseSqliteOptions(options: Partial<TerseSqliteOptions>): void {
  globalOptions = { ...globalOptions, ...options };
}
