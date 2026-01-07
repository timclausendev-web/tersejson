/**
 * TerseJSON Sequelize Integration
 *
 * Zero-config integration with Sequelize ORM.
 * Call terseSequelize() once at startup and all queries automatically
 * return memory-efficient Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseSequelize } from 'tersejson/sequelize';
 * import { Sequelize, Model, DataTypes } from 'sequelize';
 *
 * await terseSequelize(); // Patch once at startup
 *
 * class User extends Model {}
 * User.init({ name: DataTypes.STRING }, { sequelize });
 *
 * const users = await User.findAll();
 * // users is automatically Proxy-wrapped - 70% less memory
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
 * Options for terseSequelize initialization
 */
export interface TerseSequelizeOptions extends Partial<CompressOptions> {
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

  /**
   * Convert Sequelize Model instances to plain objects before wrapping (default: true)
   */
  usePlainObjects?: boolean;
}

// ============================================================================
// STATE
// ============================================================================

let isPatched = false;
let globalOptions: TerseSequelizeOptions = {};

// Store original methods for restoration
const originalMethods: {
  findAll?: Function;
  findOne?: Function;
  findByPk?: Function;
  findAndCountAll?: Function;
  sequelizeQuery?: Function;
} = {};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Sequelize Model instance to plain object
 */
function toPlain(instance: any): Record<string, unknown> {
  if (!instance) return instance;

  // Check if it's a Sequelize Model instance
  if (typeof instance.get === 'function') {
    return instance.get({ plain: true });
  }

  return instance;
}

/**
 * Wrap an array of rows with TerseJSON Proxy
 */
function wrapResults<T>(results: T[]): T[] {
  if (globalOptions.enabled === false) {
    return results;
  }

  if (!Array.isArray(results) || results.length === 0) {
    return results;
  }

  if (results.length < (globalOptions.minArrayLength ?? 1)) {
    return results;
  }

  // Convert to plain objects if needed
  const plainResults = globalOptions.usePlainObjects !== false
    ? results.map(toPlain)
    : results;

  if (!isCompressibleArray(plainResults as Record<string, unknown>[])) {
    return results;
  }

  const payload = compress(plainResults as Record<string, unknown>[], globalOptions);
  return wrapWithProxy(payload) as T[];
}

/**
 * Wrap a single row with TerseJSON Proxy
 */
function wrapSingleRow<T>(row: T): T {
  if (globalOptions.enabled === false || globalOptions.skipSingleRows) {
    return row;
  }

  if (row === null || row === undefined) {
    return row;
  }

  // Convert to plain object if needed
  const plainRow = globalOptions.usePlainObjects !== false
    ? toPlain(row)
    : row;

  if (typeof plainRow !== 'object') {
    return row;
  }

  const payload = compress([plainRow] as Record<string, unknown>[], globalOptions);
  const wrapped = wrapWithProxy(payload) as T[];
  return wrapped[0];
}

// ============================================================================
// PATCHING FUNCTIONS
// ============================================================================

/**
 * Dynamically import Sequelize and patch its Model class
 */
async function patchSequelize(): Promise<void> {
  let sequelize: any;
  try {
    sequelize = await import('sequelize');
  } catch {
    throw new Error(
      'terseSequelize requires sequelize to be installed. Run: npm install sequelize'
    );
  }

  const { Model, Sequelize } = sequelize;

  // Patch Model.findAll
  if (Model?.findAll) {
    originalMethods.findAll = Model.findAll;
    (Model as any).findAll = async function (...args: any[]): Promise<any[]> {
      const results = await originalMethods.findAll!.apply(this, args);
      return wrapResults(results);
    };
  }

  // Patch Model.findOne
  if (Model?.findOne) {
    originalMethods.findOne = Model.findOne;
    (Model as any).findOne = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.findOne!.apply(this, args);
      return wrapSingleRow(result);
    };
  }

  // Patch Model.findByPk
  if (Model?.findByPk) {
    originalMethods.findByPk = Model.findByPk;
    (Model as any).findByPk = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.findByPk!.apply(this, args);
      return wrapSingleRow(result);
    };
  }

  // Patch Model.findAndCountAll
  if (Model?.findAndCountAll) {
    originalMethods.findAndCountAll = Model.findAndCountAll;
    (Model as any).findAndCountAll = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.findAndCountAll!.apply(this, args);
      if (result && Array.isArray(result.rows)) {
        result.rows = wrapResults(result.rows);
      }
      return result;
    };
  }

  // Patch Sequelize.prototype.query for raw queries
  if (Sequelize?.prototype?.query) {
    originalMethods.sequelizeQuery = Sequelize.prototype.query;
    Sequelize.prototype.query = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.sequelizeQuery!.apply(this, args);

      // Raw queries can return [results, metadata] or just results
      if (Array.isArray(result)) {
        if (result.length === 2 && Array.isArray(result[0])) {
          // [results, metadata] format
          const [rows, metadata] = result;
          if (rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null) {
            return [wrapResults(rows), metadata];
          }
        } else if (result.length > 0 && typeof result[0] === 'object' && result[0] !== null) {
          // Direct results array
          return wrapResults(result);
        }
      }

      return result;
    };
  }
}

/**
 * Restore original Sequelize methods
 */
async function unpatchSequelize(): Promise<void> {
  let sequelize: any;
  try {
    sequelize = await import('sequelize');
  } catch {
    return;
  }

  const { Model, Sequelize } = sequelize;

  if (Model && originalMethods.findAll) {
    Model.findAll = originalMethods.findAll as any;
  }

  if (Model && originalMethods.findOne) {
    Model.findOne = originalMethods.findOne as any;
  }

  if (Model && originalMethods.findByPk) {
    Model.findByPk = originalMethods.findByPk as any;
  }

  if (Model && originalMethods.findAndCountAll) {
    Model.findAndCountAll = originalMethods.findAndCountAll as any;
  }

  if (Sequelize?.prototype && originalMethods.sequelizeQuery) {
    Sequelize.prototype.query = originalMethods.sequelizeQuery as any;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize TerseJSON integration with Sequelize.
 *
 * Call this once at application startup, before any database queries.
 * All subsequent queries will automatically return Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseSequelize } from 'tersejson/sequelize';
 *
 * // Basic usage
 * await terseSequelize();
 *
 * // With options
 * await terseSequelize({
 *   minKeyLength: 4,
 *   minArrayLength: 5,
 *   skipSingleRows: true,
 *   usePlainObjects: true, // Convert Model instances to plain objects
 * });
 * ```
 *
 * @param options - Configuration options
 */
export async function terseSequelize(options: TerseSequelizeOptions = {}): Promise<void> {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, usePlainObjects: true, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, usePlainObjects: true, ...options };
  await patchSequelize();
  isPatched = true;
}

/**
 * Synchronous version of terseSequelize for CommonJS compatibility.
 *
 * @param options - Configuration options
 */
export function terseSequelizeSync(options: TerseSequelizeOptions = {}): void {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, usePlainObjects: true, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, usePlainObjects: true, ...options };

  let sequelize: any;
  try {
    sequelize = require('sequelize');
  } catch {
    throw new Error(
      'terseSequelize requires sequelize to be installed. Run: npm install sequelize'
    );
  }

  const { Model, Sequelize } = sequelize;

  // Patch Model.findAll
  if (Model?.findAll) {
    originalMethods.findAll = Model.findAll;
    (Model as any).findAll = async function (...args: any[]): Promise<any[]> {
      const results = await originalMethods.findAll!.apply(this, args);
      return wrapResults(results);
    };
  }

  // Patch Model.findOne
  if (Model?.findOne) {
    originalMethods.findOne = Model.findOne;
    (Model as any).findOne = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.findOne!.apply(this, args);
      return wrapSingleRow(result);
    };
  }

  // Patch Model.findByPk
  if (Model?.findByPk) {
    originalMethods.findByPk = Model.findByPk;
    (Model as any).findByPk = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.findByPk!.apply(this, args);
      return wrapSingleRow(result);
    };
  }

  // Patch Model.findAndCountAll
  if (Model?.findAndCountAll) {
    originalMethods.findAndCountAll = Model.findAndCountAll;
    (Model as any).findAndCountAll = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.findAndCountAll!.apply(this, args);
      if (result && Array.isArray(result.rows)) {
        result.rows = wrapResults(result.rows);
      }
      return result;
    };
  }

  // Patch Sequelize.prototype.query
  if (Sequelize?.prototype?.query) {
    originalMethods.sequelizeQuery = Sequelize.prototype.query;
    Sequelize.prototype.query = async function (...args: any[]): Promise<any> {
      const result = await originalMethods.sequelizeQuery!.apply(this, args);

      if (Array.isArray(result)) {
        if (result.length === 2 && Array.isArray(result[0])) {
          const [rows, metadata] = result;
          if (rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null) {
            return [wrapResults(rows), metadata];
          }
        } else if (result.length > 0 && typeof result[0] === 'object' && result[0] !== null) {
          return wrapResults(result);
        }
      }

      return result;
    };
  }

  isPatched = true;
}

/**
 * Remove TerseJSON patches from Sequelize.
 */
export async function unterseSequelize(): Promise<void> {
  if (!isPatched) return;

  await unpatchSequelize();

  Object.keys(originalMethods).forEach((key) => {
    delete originalMethods[key as keyof typeof originalMethods];
  });

  isPatched = false;
  globalOptions = {};
}

/**
 * Check if TerseJSON Sequelize patching is active
 */
export function isTerseSequelizeActive(): boolean {
  return isPatched;
}

/**
 * Get current TerseJSON Sequelize options
 */
export function getTerseSequelizeOptions(): TerseSequelizeOptions {
  return { ...globalOptions };
}

/**
 * Update TerseJSON Sequelize options without re-patching
 */
export function setTerseSequelizeOptions(options: Partial<TerseSequelizeOptions>): void {
  globalOptions = { ...globalOptions, ...options };
}
