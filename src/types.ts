/**
 * TerseJSON Types
 *
 * Defines the wire format and configuration options for transparent
 * JSON key compression.
 */

/**
 * The compressed format sent over the wire
 */
export interface TersePayload<T = unknown> {
  /** Marker to identify this as a TerseJSON payload */
  __terse__: true;
  /** Version for future compatibility */
  v: 1;
  /** Key mapping: short key -> original key */
  k: Record<string, string>;
  /** The compressed data with short keys */
  d: T;
  /** Pattern used for key generation (for debugging/info) */
  p?: string;
}

/**
 * Built-in key pattern presets
 */
export type KeyPatternPreset =
  | 'alpha'      // a, b, c, ... z, aa, ab (default)
  | 'numeric'    // 0, 1, 2, ... 9, 10, 11
  | 'alphanumeric' // a1, a2, ... a9, b1, b2
  | 'short'      // _, __, ___, a, b (shortest possible)
  | 'prefixed';  // k0, k1, k2 (with 'k' prefix)

/**
 * Custom key generator function
 */
export type KeyGenerator = (index: number) => string;

/**
 * Key pattern configuration
 */
export type KeyPattern =
  | KeyPatternPreset
  | { prefix: string; style?: 'numeric' | 'alpha' }
  | KeyGenerator;

/**
 * How to handle nested structures
 */
export type NestedHandling =
  | 'deep'       // Compress all nested objects/arrays (default)
  | 'shallow'    // Only compress top-level array
  | 'arrays'     // Only compress nested arrays, not single objects
  | number;      // Specific depth limit (1 = shallow, Infinity = deep)

/**
 * Compression options
 */
export interface CompressOptions {
  /**
   * Minimum key length to consider for compression
   * Keys shorter than this won't be shortened
   * @default 3
   */
  minKeyLength?: number;

  /**
   * Maximum depth to traverse for nested objects
   * @default 10
   */
  maxDepth?: number;

  /**
   * Key pattern to use for generating short keys
   * @default 'alpha'
   */
  keyPattern?: KeyPattern;

  /**
   * How to handle nested objects and arrays
   * @default 'deep'
   */
  nestedHandling?: NestedHandling;

  /**
   * Only compress keys that appear in all objects (homogeneous)
   * @default false
   */
  homogeneousOnly?: boolean;

  /**
   * Keys to always exclude from compression
   */
  excludeKeys?: string[];

  /**
   * Keys to always include in compression (even if short)
   */
  includeKeys?: string[];
}

/**
 * Configuration options for the Express middleware
 */
export interface TerseMiddlewareOptions extends CompressOptions {
  /**
   * Minimum array length to trigger compression
   * @default 2
   */
  minArrayLength?: number;

  /**
   * Custom function to determine if a response should be compressed
   * Return false to skip compression for specific responses
   */
  shouldCompress?: (data: unknown, req: unknown) => boolean;

  /**
   * Custom header name for signaling terse responses
   * @default 'x-terse-json'
   */
  headerName?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Configuration options for the client
 */
export interface TerseClientOptions {
  /**
   * Custom header name to check for terse responses
   * @default 'x-terse-json'
   */
  headerName?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Automatically expand terse responses
   * @default true
   */
  autoExpand?: boolean;
}

/**
 * Type helper to preserve original types through compression
 */
export type Tersed<T> = T;

/**
 * Check if a value is a TersePayload
 */
export function isTersePayload(value: unknown): value is TersePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__terse__' in value &&
    (value as TersePayload).__terse__ === true &&
    'v' in value &&
    'k' in value &&
    'd' in value
  );
}

/**
 * GraphQL terse metadata (attached to response)
 */
export interface GraphQLTerseMetadata {
  /** Version for compatibility */
  v: 1;
  /** Key mapping: short key -> original key */
  k: Record<string, string>;
  /** JSON paths to compressed arrays (e.g., ["data.users", "data.products"]) */
  paths: string[];
}

/**
 * GraphQL response with terse compression
 */
export interface GraphQLTerseResponse<T = unknown> {
  /** The compressed data with short keys in arrays */
  data: T;
  /** GraphQL errors (untouched) */
  errors?: Array<{ message: string; [key: string]: unknown }>;
  /** GraphQL extensions (untouched) */
  extensions?: Record<string, unknown>;
  /** Terse metadata */
  __terse__: GraphQLTerseMetadata;
}

/**
 * GraphQL middleware options
 */
export interface GraphQLTerseOptions extends CompressOptions {
  /**
   * Minimum array length to trigger compression
   * @default 2
   */
  minArrayLength?: number;

  /**
   * Custom function to determine if a path should be compressed
   * Return false to skip compression for specific paths
   */
  shouldCompress?: (data: unknown, path: string) => boolean;

  /**
   * Paths to exclude from compression (e.g., ["data.config"])
   */
  excludePaths?: string[];

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Check if a value is a GraphQL terse response
 */
export function isGraphQLTersePayload(value: unknown): value is GraphQLTerseResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    '__terse__' in value &&
    typeof (value as GraphQLTerseResponse).__terse__ === 'object' &&
    (value as GraphQLTerseResponse).__terse__ !== null &&
    'v' in (value as GraphQLTerseResponse).__terse__ &&
    'k' in (value as GraphQLTerseResponse).__terse__ &&
    'paths' in (value as GraphQLTerseResponse).__terse__
  );
}
