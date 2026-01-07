/**
 * TerseJSON MongoDB Integration
 *
 * Zero-config integration with MongoDB native driver.
 * Call terseMongo() once at startup and all queries automatically
 * return memory-efficient Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseMongo } from 'tersejson/mongodb';
 * import { MongoClient } from 'mongodb';
 *
 * terseMongo(); // Patch once at startup
 *
 * const client = new MongoClient(uri);
 * const users = await client.db('mydb').collection('users').find().toArray();
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
 * Options for terseMongo initialization
 */
export interface TerseMongoOptions extends Partial<CompressOptions> {
  /**
   * Enable/disable compression (default: true)
   */
  enabled?: boolean;

  /**
   * Minimum array length to compress (default: 1)
   * Single documents are always wrapped for consistency
   */
  minArrayLength?: number;

  /**
   * Skip compression for single document queries like findOne (default: false)
   * Set to true if you don't want overhead on single doc fetches
   */
  skipSingleDocs?: boolean;
}

// ============================================================================
// STATE
// ============================================================================

let isPatched = false;
let globalOptions: TerseMongoOptions = {};

// Store original methods for restoration
const originalMethods: {
  findCursorToArray?: Function;
  findCursorNext?: Function;
  findCursorIterator?: Function;
  aggregationCursorToArray?: Function;
  aggregationCursorNext?: Function;
  aggregationCursorIterator?: Function;
  collectionFindOne?: Function;
} = {};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wrap an array of documents with TerseJSON Proxy
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
 * Wrap a single document with TerseJSON Proxy
 */
function wrapSingleDoc<T extends Record<string, unknown>>(doc: T): T {
  if (globalOptions.enabled === false || globalOptions.skipSingleDocs) {
    return doc;
  }

  if (doc === null || doc === undefined) {
    return doc;
  }

  if (typeof doc !== 'object') {
    return doc;
  }

  // Compress as single-item array, return first item
  const payload = compress([doc] as Record<string, unknown>[], globalOptions);
  const wrapped = wrapWithProxy(payload) as T[];
  return wrapped[0];
}

// ============================================================================
// PATCHING FUNCTIONS
// ============================================================================

/**
 * Dynamically import mongodb and patch its prototypes
 */
async function patchMongoDB(): Promise<void> {
  // Dynamic import to avoid bundling mongodb
  let mongodb: typeof import('mongodb');
  try {
    mongodb = await import('mongodb');
  } catch {
    throw new Error(
      'terseMongo requires mongodb to be installed. Run: npm install mongodb'
    );
  }

  const { FindCursor, AggregationCursor, Collection } = mongodb;

  // Patch FindCursor
  if (FindCursor?.prototype) {
    // toArray
    originalMethods.findCursorToArray = FindCursor.prototype.toArray;
    (FindCursor.prototype as any).toArray = async function (): Promise<any[]> {
      const results = await originalMethods.findCursorToArray!.call(this);
      return wrapResults(results);
    };

    // next
    originalMethods.findCursorNext = FindCursor.prototype.next;
    (FindCursor.prototype as any).next = async function (): Promise<any | null> {
      const doc = await originalMethods.findCursorNext!.call(this);
      return doc ? wrapSingleDoc(doc) : null;
    };

    // async iterator
    originalMethods.findCursorIterator =
      FindCursor.prototype[Symbol.asyncIterator];
    (FindCursor.prototype as any)[Symbol.asyncIterator] = async function* () {
      const iterator = originalMethods.findCursorIterator!.call(this);
      for await (const doc of iterator) {
        yield wrapSingleDoc(doc);
      }
    };
  }

  // Patch AggregationCursor
  if (AggregationCursor?.prototype) {
    // toArray
    originalMethods.aggregationCursorToArray =
      AggregationCursor.prototype.toArray;
    (AggregationCursor.prototype as any).toArray = async function (): Promise<any[]> {
      const results =
        await originalMethods.aggregationCursorToArray!.call(this);
      return wrapResults(results);
    };

    // next
    originalMethods.aggregationCursorNext = AggregationCursor.prototype.next;
    (AggregationCursor.prototype as any).next = async function (): Promise<any | null> {
      const doc = await originalMethods.aggregationCursorNext!.call(this);
      return doc ? wrapSingleDoc(doc) : null;
    };

    // async iterator
    originalMethods.aggregationCursorIterator =
      AggregationCursor.prototype[Symbol.asyncIterator];
    (AggregationCursor.prototype as any)[Symbol.asyncIterator] = async function* () {
      const iterator = originalMethods.aggregationCursorIterator!.call(this);
      for await (const doc of iterator) {
        yield wrapSingleDoc(doc);
      }
    };
  }

  // Patch Collection.findOne
  if (Collection?.prototype) {
    originalMethods.collectionFindOne = Collection.prototype.findOne;
    (Collection.prototype as any).findOne = async function (
      ...args: any[]
    ): Promise<any | null> {
      const doc = await originalMethods.collectionFindOne!.apply(this, args);
      return doc ? wrapSingleDoc(doc) : null;
    };
  }
}

/**
 * Restore original MongoDB methods
 */
async function unpatchMongoDB(): Promise<void> {
  let mongodb: typeof import('mongodb');
  try {
    mongodb = await import('mongodb');
  } catch {
    return;
  }

  const { FindCursor, AggregationCursor, Collection } = mongodb;

  if (FindCursor?.prototype && originalMethods.findCursorToArray) {
    FindCursor.prototype.toArray = originalMethods.findCursorToArray as any;
    FindCursor.prototype.next = originalMethods.findCursorNext as any;
    FindCursor.prototype[Symbol.asyncIterator] =
      originalMethods.findCursorIterator as any;
  }

  if (AggregationCursor?.prototype && originalMethods.aggregationCursorToArray) {
    AggregationCursor.prototype.toArray =
      originalMethods.aggregationCursorToArray as any;
    AggregationCursor.prototype.next =
      originalMethods.aggregationCursorNext as any;
    AggregationCursor.prototype[Symbol.asyncIterator] =
      originalMethods.aggregationCursorIterator as any;
  }

  if (Collection?.prototype && originalMethods.collectionFindOne) {
    Collection.prototype.findOne = originalMethods.collectionFindOne as any;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize TerseJSON integration with MongoDB native driver.
 *
 * Call this once at application startup, before any MongoDB queries.
 * All subsequent queries will automatically return Proxy-wrapped results.
 *
 * @example
 * ```typescript
 * import { terseMongo } from 'tersejson/mongodb';
 *
 * // Basic usage
 * await terseMongo();
 *
 * // With options
 * await terseMongo({
 *   minKeyLength: 4,        // Only compress keys with 4+ characters
 *   minArrayLength: 5,      // Only compress arrays with 5+ items
 *   skipSingleDocs: true,   // Don't wrap findOne results
 * });
 * ```
 *
 * @param options - Configuration options
 */
export async function terseMongo(
  options: TerseMongoOptions = {}
): Promise<void> {
  if (isPatched) {
    // Update options if already patched
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };
  await patchMongoDB();
  isPatched = true;
}

/**
 * Synchronous version of terseMongo for CommonJS compatibility.
 *
 * Note: This requires mongodb to already be loaded in the module cache.
 * For best results, use the async terseMongo() instead.
 *
 * @param options - Configuration options
 */
export function terseMongoSync(options: TerseMongoOptions = {}): void {
  if (isPatched) {
    globalOptions = { minArrayLength: 1, ...options };
    return;
  }

  globalOptions = { minArrayLength: 1, ...options };

  // Try synchronous require
  let mongodb: typeof import('mongodb');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mongodb = require('mongodb');
  } catch {
    throw new Error(
      'terseMongo requires mongodb to be installed. Run: npm install mongodb'
    );
  }

  const { FindCursor, AggregationCursor, Collection } = mongodb;

  // Same patching logic as async version
  if (FindCursor?.prototype) {
    originalMethods.findCursorToArray = FindCursor.prototype.toArray;
    (FindCursor.prototype as any).toArray = async function (): Promise<any[]> {
      const results = await originalMethods.findCursorToArray!.call(this);
      return wrapResults(results);
    };

    originalMethods.findCursorNext = FindCursor.prototype.next;
    (FindCursor.prototype as any).next = async function (): Promise<any | null> {
      const doc = await originalMethods.findCursorNext!.call(this);
      return doc ? wrapSingleDoc(doc) : null;
    };

    originalMethods.findCursorIterator =
      FindCursor.prototype[Symbol.asyncIterator];
    (FindCursor.prototype as any)[Symbol.asyncIterator] = async function* () {
      const iterator = originalMethods.findCursorIterator!.call(this);
      for await (const doc of iterator) {
        yield wrapSingleDoc(doc);
      }
    };
  }

  if (AggregationCursor?.prototype) {
    originalMethods.aggregationCursorToArray =
      AggregationCursor.prototype.toArray;
    (AggregationCursor.prototype as any).toArray = async function (): Promise<any[]> {
      const results =
        await originalMethods.aggregationCursorToArray!.call(this);
      return wrapResults(results);
    };

    originalMethods.aggregationCursorNext = AggregationCursor.prototype.next;
    (AggregationCursor.prototype as any).next = async function (): Promise<any | null> {
      const doc = await originalMethods.aggregationCursorNext!.call(this);
      return doc ? wrapSingleDoc(doc) : null;
    };

    originalMethods.aggregationCursorIterator =
      AggregationCursor.prototype[Symbol.asyncIterator];
    (AggregationCursor.prototype as any)[Symbol.asyncIterator] = async function* () {
      const iterator = originalMethods.aggregationCursorIterator!.call(this);
      for await (const doc of iterator) {
        yield wrapSingleDoc(doc);
      }
    };
  }

  if (Collection?.prototype) {
    originalMethods.collectionFindOne = Collection.prototype.findOne;
    (Collection.prototype as any).findOne = async function (
      ...args: any[]
    ): Promise<any | null> {
      const doc = await originalMethods.collectionFindOne!.apply(this, args);
      return doc ? wrapSingleDoc(doc) : null;
    };
  }

  isPatched = true;
}

/**
 * Remove TerseJSON patches from MongoDB driver.
 *
 * Useful for testing or when you need to temporarily disable compression.
 *
 * @example
 * ```typescript
 * import { terseMongo, unterse } from 'tersejson/mongodb';
 *
 * await terseMongo();
 * // ... queries are Proxy-wrapped
 *
 * await unterse();
 * // ... queries return normal documents
 * ```
 */
export async function unterse(): Promise<void> {
  if (!isPatched) return;

  await unpatchMongoDB();

  // Clear stored references
  Object.keys(originalMethods).forEach((key) => {
    delete originalMethods[key as keyof typeof originalMethods];
  });

  isPatched = false;
  globalOptions = {};
}

/**
 * Check if TerseJSON MongoDB patching is active
 */
export function isTerseMongoActive(): boolean {
  return isPatched;
}

/**
 * Get current TerseJSON MongoDB options
 */
export function getTerseMongoOptions(): TerseMongoOptions {
  return { ...globalOptions };
}

/**
 * Update TerseJSON MongoDB options without re-patching
 */
export function setTerseMongoOptions(options: Partial<TerseMongoOptions>): void {
  globalOptions = { ...globalOptions, ...options };
}
