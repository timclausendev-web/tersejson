/**
 * TerseJSON Client
 *
 * Transparent client-side handling of TerseJSON responses.
 * Use the fetch wrapper or manually expand responses.
 */

import {
  TerseClientOptions,
  isTersePayload,
} from './types';
import { expand, wrapWithProxy } from './core';

const DEFAULT_OPTIONS: Required<TerseClientOptions> = {
  headerName: 'x-terse-json',
  debug: false,
  autoExpand: true,
};

/**
 * Expands a TerseJSON payload back to original format
 * Use this if you want full expansion (not proxied)
 */
export { expand };

/**
 * Wraps a TerseJSON payload with Proxy for transparent key access
 * More memory efficient than full expansion for large datasets
 */
export { wrapWithProxy as proxy };

/**
 * Check if a response/data is a TerseJSON payload
 */
export { isTersePayload };

/**
 * Process a potential TerseJSON response
 * Automatically detects and expands/proxies terse payloads
 */
export function process<T = unknown>(
  data: unknown,
  options: { useProxy?: boolean } = {}
): T {
  const { useProxy = true } = options;

  if (isTersePayload(data)) {
    return useProxy ? wrapWithProxy<T>(data) : expand<T>(data);
  }

  return data as T;
}

/**
 * Creates a fetch wrapper that automatically handles TerseJSON responses
 *
 * @example
 * ```typescript
 * import { createFetch } from 'tersejson/client';
 *
 * const fetch = createFetch();
 *
 * // Use exactly like regular fetch
 * const users = await fetch('/api/users').then(r => r.json());
 * console.log(users[0].firstName); // Works transparently!
 * ```
 */
export function createFetch(options: TerseClientOptions = {}): typeof globalThis.fetch {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async function terseFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
  ): Promise<Response> {
    // Add header to indicate we accept terse responses
    const headers = new Headers(init.headers);
    headers.set('accept-terse', 'true');

    const response = await globalThis.fetch(input, {
      ...init,
      headers,
    });

    // Check if response is terse
    const isTerse = response.headers.get(config.headerName) === 'true';

    if (!isTerse || !config.autoExpand) {
      return response;
    }

    // Clone response and override json() method
    const clonedResponse = response.clone();

    // Create a wrapper that intercepts .json()
    return new Proxy(response, {
      get(target, prop) {
        if (prop === 'json') {
          return async function (): Promise<unknown> {
            const data = await clonedResponse.json();

            if (isTersePayload(data)) {
              if (config.debug) {
                console.log('[tersejson] Expanding terse response');
              }
              return wrapWithProxy(data);
            }

            return data;
          };
        }

        const value = Reflect.get(target, prop);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
}

/**
 * Drop-in fetch replacement with TerseJSON support
 *
 * @example
 * ```typescript
 * import { fetch } from 'tersejson/client';
 *
 * const users = await fetch('/api/users').then(r => r.json());
 * console.log(users[0].firstName); // Transparent!
 * ```
 */
export const fetch = createFetch();

/**
 * React hook for fetching with TerseJSON support (if using React)
 * Returns a configured fetch function
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const terseFetch = useTerseFetch();
 *   // Use in useEffect, etc.
 * }
 * ```
 */
export function useTerseFetch(options: TerseClientOptions = {}): typeof globalThis.fetch {
  // This is a simple hook that just returns the configured fetch
  // Could be extended with caching, SWR integration, etc.
  return createFetch(options);
}

/**
 * Axios interceptor for TerseJSON support
 *
 * @example
 * ```typescript
 * import axios from 'axios';
 * import { axiosInterceptor } from 'tersejson/client';
 *
 * axios.interceptors.request.use(axiosInterceptor.request);
 * axios.interceptors.response.use(axiosInterceptor.response);
 * ```
 */
export const axiosInterceptor = {
  request: (config: { headers?: Record<string, string> }) => {
    config.headers = config.headers || {};
    config.headers['accept-terse'] = 'true';
    return config;
  },

  response: (response: { headers?: Record<string, string>; data?: unknown }) => {
    const isTerse = response.headers?.['x-terse-json'] === 'true';

    if (isTerse && isTersePayload(response.data)) {
      response.data = wrapWithProxy(response.data);
    }

    return response;
  },
};

// Default export for convenience
export default { fetch, createFetch, expand, proxy: wrapWithProxy, process };
