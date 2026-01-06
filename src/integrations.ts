/**
 * TerseJSON Framework Integrations
 *
 * Ready-to-use integrations for popular HTTP clients and frameworks.
 */

import { isTersePayload } from './types';
import { wrapWithProxy, expand } from './core';

// ============================================================================
// AXIOS
// ============================================================================

/**
 * Axios request interceptor type
 */
interface AxiosRequestConfig {
  headers?: Record<string, string> | { set?: (key: string, value: string) => void };
  [key: string]: unknown;
}

/**
 * Axios response type
 */
interface AxiosResponse<T = unknown> {
  data: T;
  headers: Record<string, string> | { get?: (key: string) => string | null };
  status: number;
  statusText: string;
  config: AxiosRequestConfig;
  [key: string]: unknown;
}

/**
 * Create Axios interceptors for TerseJSON support
 *
 * @example
 * ```typescript
 * import axios from 'axios';
 * import { createAxiosInterceptors } from 'tersejson/integrations';
 *
 * const { request, response } = createAxiosInterceptors();
 * axios.interceptors.request.use(request);
 * axios.interceptors.response.use(response);
 *
 * // Now all axios requests automatically handle TerseJSON
 * const { data } = await axios.get('/api/users');
 * console.log(data[0].firstName); // Works transparently!
 * ```
 */
export function createAxiosInterceptors(options: { useProxy?: boolean; debug?: boolean } = {}) {
  const { useProxy = true, debug = false } = options;

  return {
    request: <T extends AxiosRequestConfig>(config: T): T => {
      // Handle both old-style object headers and new AxiosHeaders class
      if (config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('accept-terse', 'true');
        } else {
          (config.headers as Record<string, string>)['accept-terse'] = 'true';
        }
      } else {
        config.headers = { 'accept-terse': 'true' };
      }
      return config;
    },

    response: <T>(response: AxiosResponse<T>): AxiosResponse<T> => {
      // Handle both old-style object headers and new AxiosHeaders class
      let isTerse = false;
      if (response.headers) {
        if (typeof response.headers.get === 'function') {
          isTerse = response.headers.get('x-terse-json') === 'true';
        } else {
          isTerse = (response.headers as Record<string, string>)['x-terse-json'] === 'true';
        }
      }

      if (isTerse && isTersePayload(response.data)) {
        if (debug) {
          console.log('[tersejson] Expanding Axios response');
        }
        response.data = (useProxy ? wrapWithProxy(response.data) : expand(response.data)) as T;
      }

      return response;
    },
  };
}

/**
 * Pre-configured Axios interceptors (convenience export)
 */
export const axiosInterceptors = createAxiosInterceptors();

// ============================================================================
// ANGULAR (Modern - HttpClient)
// ============================================================================

/**
 * Angular HttpInterceptor interface (simplified)
 */
interface HttpRequest<T = unknown> {
  clone: (options: { setHeaders?: Record<string, string> }) => HttpRequest<T>;
  [key: string]: unknown;
}

interface HttpEvent<T = unknown> {
  type?: number;
  body?: T;
  headers?: { get: (name: string) => string | null };
  [key: string]: unknown;
}

// HttpHandler not needed - Angular uses its own

/**
 * Creates an Angular HTTP interceptor for TerseJSON support
 *
 * @example
 * ```typescript
 * // terse.interceptor.ts
 * import { Injectable } from '@angular/core';
 * import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
 * import { Observable } from 'rxjs';
 * import { map } from 'rxjs/operators';
 * import { createAngularInterceptor } from 'tersejson/integrations';
 *
 * @Injectable()
 * export class TerseInterceptor implements HttpInterceptor {
 *   private handler = createAngularInterceptor();
 *
 *   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
 *     return this.handler(req, next);
 *   }
 * }
 *
 * // app.module.ts
 * providers: [
 *   { provide: HTTP_INTERCEPTORS, useClass: TerseInterceptor, multi: true }
 * ]
 * ```
 */
export function createAngularInterceptor(options: { useProxy?: boolean; debug?: boolean } = {}) {
  const { useProxy = true, debug = false } = options;

  /**
   * Returns a function that can be used as the intercept method
   * Note: This returns the logic - you need to wrap it in an @Injectable class
   */
  return {
    /**
     * Modifies the request to include the accept-terse header
     */
    modifyRequest: <T>(req: HttpRequest<T>): HttpRequest<T> => {
      return req.clone({
        setHeaders: {
          'accept-terse': 'true',
        },
      });
    },

    /**
     * Processes the response to expand TerseJSON payloads
     */
    processResponse: <T>(event: HttpEvent<T>): HttpEvent<T> => {
      // HttpResponse has type === 4
      if (event.type === 4 && event.body !== undefined) {
        const isTerse = event.headers?.get('x-terse-json') === 'true';

        if (isTerse && isTersePayload(event.body)) {
          if (debug) {
            console.log('[tersejson] Expanding Angular response');
          }
          // Create new response with expanded body
          return {
            ...event,
            body: (useProxy ? wrapWithProxy(event.body) : expand(event.body)) as T,
          };
        }
      }
      return event;
    },
  };
}

/**
 * Angular interceptor code snippet for copy-paste
 * Since Angular interceptors require decorators, we provide the implementation
 */
export const angularInterceptorSnippet = `
// terse.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isTersePayload, wrapWithProxy } from 'tersejson';

@Injectable()
export class TerseInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add accept-terse header
    const terseReq = req.clone({
      setHeaders: { 'accept-terse': 'true' }
    });

    return next.handle(terseReq).pipe(
      map(event => {
        if (event instanceof HttpResponse && event.body) {
          const isTerse = event.headers.get('x-terse-json') === 'true';
          if (isTerse && isTersePayload(event.body)) {
            return event.clone({ body: wrapWithProxy(event.body) });
          }
        }
        return event;
      })
    );
  }
}

// app.module.ts - Add to providers:
// { provide: HTTP_INTERCEPTORS, useClass: TerseInterceptor, multi: true }
`;

// ============================================================================
// ANGULARJS (1.x - $http)
// ============================================================================

/**
 * AngularJS $http config type
 */
interface AngularJSHttpConfig {
  headers?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * AngularJS $http response type
 */
interface AngularJSHttpResponse<T = unknown> {
  data: T;
  headers: (name: string) => string | null;
  status: number;
  statusText: string;
  config: AngularJSHttpConfig;
}

/**
 * Creates AngularJS $http interceptor for TerseJSON support
 *
 * @example
 * ```javascript
 * // In your AngularJS app config
 * angular.module('myApp', [])
 *   .config(['$httpProvider', function($httpProvider) {
 *     $httpProvider.interceptors.push(['$q', function($q) {
 *       return createAngularJSInterceptor();
 *     }]);
 *   }]);
 * ```
 */
export function createAngularJSInterceptor(options: { useProxy?: boolean; debug?: boolean } = {}) {
  const { useProxy = true, debug = false } = options;

  return {
    /**
     * Request interceptor - adds accept-terse header
     */
    request: <T extends AngularJSHttpConfig>(config: T): T => {
      config.headers = config.headers || {};
      config.headers['accept-terse'] = 'true';
      return config;
    },

    /**
     * Response interceptor - expands TerseJSON payloads
     */
    response: <T>(response: AngularJSHttpResponse<T>): AngularJSHttpResponse<T> => {
      const isTerse = response.headers('x-terse-json') === 'true';

      if (isTerse && isTersePayload(response.data)) {
        if (debug) {
          console.log('[tersejson] Expanding AngularJS response');
        }
        response.data = (useProxy ? wrapWithProxy(response.data) : expand(response.data)) as T;
      }

      return response;
    },
  };
}

/**
 * AngularJS setup code snippet
 */
export const angularJSInterceptorSnippet = `
// Setup TerseJSON with AngularJS
angular.module('myApp', [])
  .factory('terseInterceptor', ['$q', function($q) {
    return {
      request: function(config) {
        config.headers = config.headers || {};
        config.headers['accept-terse'] = 'true';
        return config;
      },
      response: function(response) {
        var isTerse = response.headers('x-terse-json') === 'true';
        if (isTerse && response.data && response.data.__terse__) {
          // Use tersejson.process() or tersejson.wrapWithProxy()
          response.data = tersejson.process(response.data);
        }
        return response;
      }
    };
  }])
  .config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('terseInterceptor');
  }]);
`;

// ============================================================================
// JQUERY AJAX
// ============================================================================

/**
 * jQuery AJAX setup for TerseJSON
 *
 * @example
 * ```javascript
 * import { setupJQueryAjax } from 'tersejson/integrations';
 * setupJQueryAjax($);
 *
 * // Now $.ajax, $.get, $.post all support TerseJSON
 * $.get('/api/users', function(data) {
 *   console.log(data[0].firstName); // Works!
 * });
 * ```
 */
export function setupJQueryAjax(
  $: { ajaxSetup: (options: unknown) => void; ajaxPrefilter: (callback: unknown) => void },
  options: { useProxy?: boolean; debug?: boolean } = {}
) {
  const { useProxy = true, debug = false } = options;

  // Add header to all requests
  $.ajaxSetup({
    headers: {
      'accept-terse': 'true',
    },
  });

  // Process responses
  $.ajaxPrefilter((ajaxOptions: { dataFilter?: (data: string, type: string) => unknown }) => {
    const originalDataFilter = ajaxOptions.dataFilter;

    ajaxOptions.dataFilter = function (data: string, type: string) {
      let processed = data;

      if (originalDataFilter) {
        processed = originalDataFilter(data, type) as string;
      }

      if (type === 'json' || type === undefined) {
        try {
          const parsed = typeof processed === 'string' ? JSON.parse(processed) : processed;
          if (isTersePayload(parsed)) {
            if (debug) {
              console.log('[tersejson] Expanding jQuery response');
            }
            return useProxy ? wrapWithProxy(parsed) : expand(parsed);
          }
          return parsed;
        } catch {
          return processed;
        }
      }

      return processed;
    };
  });
}

/**
 * jQuery setup code snippet
 */
export const jQuerySetupSnippet = `
// Setup TerseJSON with jQuery
$.ajaxSetup({
  headers: { 'accept-terse': 'true' },
  dataFilter: function(data, type) {
    if (type === 'json') {
      var parsed = JSON.parse(data);
      if (parsed && parsed.__terse__) {
        return tersejson.process(parsed);
      }
      return parsed;
    }
    return data;
  }
});
`;

// ============================================================================
// SWR / React Query
// ============================================================================

/**
 * Creates a fetcher for SWR with TerseJSON support
 *
 * @example
 * ```typescript
 * import useSWR from 'swr';
 * import { createSWRFetcher } from 'tersejson/integrations';
 *
 * const fetcher = createSWRFetcher();
 *
 * function UserList() {
 *   const { data, error } = useSWR('/api/users', fetcher);
 *   return <div>{data?.[0].firstName}</div>;
 * }
 * ```
 */
export function createSWRFetcher(options: { useProxy?: boolean; debug?: boolean } = {}) {
  const { useProxy = true, debug = false } = options;

  return async <T>(url: string): Promise<T> => {
    const response = await globalThis.fetch(url, {
      headers: {
        'accept-terse': 'true',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (isTersePayload(data)) {
      if (debug) {
        console.log('[tersejson] Expanding SWR response');
      }
      return (useProxy ? wrapWithProxy(data) : expand(data)) as T;
    }

    return data as T;
  };
}

/**
 * Creates a query function for React Query / TanStack Query
 *
 * @example
 * ```typescript
 * import { useQuery } from '@tanstack/react-query';
 * import { createQueryFn } from 'tersejson/integrations';
 *
 * const queryFn = createQueryFn();
 *
 * function UserList() {
 *   const { data } = useQuery({
 *     queryKey: ['users'],
 *     queryFn: () => queryFn('/api/users')
 *   });
 *   return <div>{data?.[0].firstName}</div>;
 * }
 * ```
 */
export const createQueryFn = createSWRFetcher; // Same implementation

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Axios
  createAxiosInterceptors,
  axiosInterceptors,

  // Angular
  createAngularInterceptor,
  angularInterceptorSnippet,

  // AngularJS
  createAngularJSInterceptor,
  angularJSInterceptorSnippet,

  // jQuery
  setupJQueryAjax,
  jQuerySetupSnippet,

  // SWR / React Query
  createSWRFetcher,
  createQueryFn,
};
