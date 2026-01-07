/**
 * TerseJSON GraphQL Client
 *
 * Apollo Client Link and utilities for expanding GraphQL responses.
 */

import { GraphQLTerseResponse, isGraphQLTersePayload } from './types';
import { createTerseProxy } from './core';

/**
 * Options for GraphQL client processing
 */
export interface GraphQLTerseClientOptions {
  /**
   * Use Proxy for lazy expansion (more memory efficient)
   * @default true
   */
  useProxy?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

const DEFAULT_OPTIONS: Required<GraphQLTerseClientOptions> = {
  useProxy: true,
  debug: false,
};

/**
 * Gets a value at a path in an object
 */
function getAtPath(obj: unknown, path: string): unknown {
  const parts = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const isIndex = /^\d+$/.test(part);
    if (isIndex) {
      current = (current as unknown[])[parseInt(part, 10)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Sets a value at a path in an object (mutates the object)
 */
function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const isIndex = /^\d+$/.test(part);
    if (isIndex) {
      current = (current as unknown[])[parseInt(part, 10)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const isLastIndex = /^\d+$/.test(lastPart);
  if (isLastIndex) {
    (current as unknown[])[parseInt(lastPart, 10)] = value;
  } else {
    (current as Record<string, unknown>)[lastPart] = value;
  }
}

/**
 * Expands an object using the key mapping
 */
function expandObject(
  obj: Record<string, unknown>,
  keyMap: Record<string, string>,
  maxDepth: number = 10,
  currentDepth: number = 0
): Record<string, unknown> {
  if (currentDepth >= maxDepth) return obj;

  const shortToKey = new Map(
    Object.entries(keyMap).map(([short, original]) => [short, original])
  );

  const expanded: Record<string, unknown> = {};

  for (const [shortKey, value] of Object.entries(obj)) {
    const originalKey = shortToKey.get(shortKey) ?? shortKey;

    if (Array.isArray(value)) {
      expanded[originalKey] = value.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return expandObject(item as Record<string, unknown>, keyMap, maxDepth, currentDepth + 1);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      expanded[originalKey] = expandObject(
        value as Record<string, unknown>,
        keyMap,
        maxDepth,
        currentDepth + 1
      );
    } else {
      expanded[originalKey] = value;
    }
  }

  return expanded;
}

/**
 * Wraps an array with Proxies for transparent key access
 */
function wrapArrayWithProxies<T extends Record<string, unknown>>(
  array: Record<string, unknown>[],
  keyMap: Record<string, string>
): T[] {
  return array.map(item => createTerseProxy<T>(item, keyMap));
}

/**
 * Expands an array to its original form
 */
function expandArray(
  array: Record<string, unknown>[],
  keyMap: Record<string, string>
): Record<string, unknown>[] {
  return array.map(item => expandObject(item, keyMap));
}

/**
 * Processes a GraphQL terse response, expanding compressed arrays
 *
 * @example
 * ```typescript
 * import { processGraphQLResponse } from 'tersejson/graphql-client';
 *
 * const response = await fetch('/graphql', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'accept-terse': 'true',
 *   },
 *   body: JSON.stringify({ query: '{ users { firstName lastName } }' }),
 * }).then(r => r.json());
 *
 * const expanded = processGraphQLResponse(response);
 * console.log(expanded.data.users[0].firstName); // Works transparently
 * ```
 */
export function processGraphQLResponse<T = unknown>(
  response: unknown,
  options: GraphQLTerseClientOptions = {}
): T {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // If not a terse response, return as-is
  if (!isGraphQLTersePayload(response)) {
    return response as T;
  }

  const terseResponse = response as GraphQLTerseResponse;
  const { data, __terse__, ...rest } = terseResponse;
  const { k: keyMap, paths } = __terse__;

  if (config.debug) {
    console.log('[tersejson/graphql-client] Processing terse response');
    console.log('[tersejson/graphql-client] Paths:', paths);
    console.log('[tersejson/graphql-client] Key map:', keyMap);
  }

  // Clone the data to avoid mutating
  const clonedData = JSON.parse(JSON.stringify(data));
  const result: Record<string, unknown> = { data: clonedData, ...rest };

  // Process each compressed path
  for (const path of paths) {
    const array = getAtPath(result, path) as Record<string, unknown>[] | undefined;

    if (!array || !Array.isArray(array)) {
      if (config.debug) {
        console.warn(`[tersejson/graphql-client] Path not found or not array: ${path}`);
      }
      continue;
    }

    if (config.useProxy) {
      // Wrap with proxies for lazy expansion
      const proxied = wrapArrayWithProxies(array, keyMap);
      setAtPath(result, path, proxied);
    } else {
      // Fully expand the array
      const expanded = expandArray(array, keyMap);
      setAtPath(result, path, expanded);
    }
  }

  return result as T;
}

/**
 * Type for Apollo Link (avoiding direct dependency)
 */
interface ApolloLinkLike {
  request(
    operation: { getContext: () => Record<string, unknown>; setContext: (ctx: Record<string, unknown>) => void },
    forward: (operation: unknown) => { map: (fn: (result: unknown) => unknown) => unknown }
  ): unknown;
}

/**
 * Creates an Apollo Client Link for TerseJSON
 *
 * This link automatically adds the accept-terse header and processes
 * terse responses transparently.
 *
 * @example
 * ```typescript
 * import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
 * import { createTerseLink } from 'tersejson/graphql-client';
 *
 * const terseLink = createTerseLink({ debug: true });
 *
 * const httpLink = new HttpLink({
 *   uri: '/graphql',
 * });
 *
 * const client = new ApolloClient({
 *   link: from([terseLink, httpLink]),
 *   cache: new InMemoryCache(),
 * });
 *
 * // Usage is completely transparent
 * const { data } = await client.query({
 *   query: gql`
 *     query GetUsers {
 *       users { firstName lastName email }
 *     }
 *   `,
 * });
 *
 * console.log(data.users[0].firstName); // Just works!
 * ```
 */
export function createTerseLink(options: GraphQLTerseClientOptions = {}): ApolloLinkLike {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return {
    request(operation, forward) {
      // Add accept-terse header to the request
      operation.setContext({
        ...operation.getContext(),
        headers: {
          ...((operation.getContext().headers as Record<string, string>) || {}),
          'accept-terse': 'true',
        },
      });

      // Forward the operation and process the response
      return forward(operation).map((result: unknown) => {
        if (isGraphQLTersePayload(result)) {
          if (config.debug) {
            console.log('[tersejson/apollo] Processing terse response');
          }
          return processGraphQLResponse(result, config);
        }
        return result;
      });
    },
  };
}

/**
 * Creates a fetch wrapper for GraphQL requests
 *
 * Useful for non-Apollo GraphQL clients or direct fetch usage.
 *
 * @example
 * ```typescript
 * import { createGraphQLFetch } from 'tersejson/graphql-client';
 *
 * const gqlFetch = createGraphQLFetch({ debug: true });
 *
 * const result = await gqlFetch('/graphql', {
 *   query: `{ users { firstName lastName } }`,
 * });
 *
 * console.log(result.data.users[0].firstName);
 * ```
 */
export function createGraphQLFetch(options: GraphQLTerseClientOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async function graphqlFetch<T = unknown>(
    url: string,
    body: { query: string; variables?: Record<string, unknown>; operationName?: string },
    init: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('accept-terse', 'true');

    const response = await fetch(url, {
      ...init,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return processGraphQLResponse<T>(data, config);
  };
}

// Re-export type guard for convenience
export { isGraphQLTersePayload } from './types';

// Default export
export default processGraphQLResponse;
