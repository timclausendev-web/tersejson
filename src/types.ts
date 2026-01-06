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
}

/**
 * Configuration options for the Express middleware
 */
export interface TerseMiddlewareOptions {
  /**
   * Minimum array length to trigger compression
   * @default 2
   */
  minArrayLength?: number;

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
