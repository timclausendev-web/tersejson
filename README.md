# TerseJSON

**Transparent JSON key compression for Express APIs. 30-39% bandwidth reduction with 2 lines of code.**

> *68% of websites don't have Gzip enabled ([W3Techs](https://w3techs.com/technologies/details/ce-gzipcompression)). TerseJSON works at the application layer - no server config needed. And it stacks with Gzip/Brotli for up to 93% total savings.*

[![npm version](https://badge.fury.io/js/tersejson.svg)](https://www.npmjs.com/package/tersejson)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## The Problem

Every API response repeats the same keys over and over:

```json
[
  { "firstName": "John", "lastName": "Doe", "emailAddress": "john@example.com" },
  { "firstName": "Jane", "lastName": "Doe", "emailAddress": "jane@example.com" },
  // ... 1000 more objects with the same keys
]
```

For 1000 objects, you're sending ~50KB of just repeated key names!

## The Solution

TerseJSON automatically compresses keys on the server and transparently expands them on the client:

```
Over the wire (compressed):
{
  "k": { "a": "firstName", "b": "lastName", "c": "emailAddress" },
  "d": [
    { "a": "John", "b": "Doe", "c": "john@example.com" },
    { "a": "Jane", "b": "Doe", "c": "jane@example.com" }
  ]
}

Your code sees (via Proxy magic):
users[0].firstName  // "John" - just works!
```

## Quick Start

### Installation

```bash
npm install tersejson
```

### Backend (Express)

```typescript
import express from 'express';
import { terse } from 'tersejson/express';

const app = express();
app.use(terse());

app.get('/api/users', (req, res) => {
  // Just send data as normal - compression is automatic!
  res.json(users);
});
```

### Frontend

```typescript
import { fetch } from 'tersejson/client';

// Use exactly like regular fetch
const users = await fetch('/api/users').then(r => r.json());

// Access properties normally - TerseJSON handles the mapping
console.log(users[0].firstName); // Works transparently!
console.log(users[0].emailAddress); // Works transparently!
```

## How It Works

### Compression Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Your Express route calls res.json(data)                 │
│                         ↓                                   │
│  2. TerseJSON middleware intercepts the response            │
│                         ↓                                   │
│  3. Detects array of objects with repeated keys             │
│                         ↓                                   │
│  4. Creates key map: { "a": "firstName", "b": "lastName" }  │
│                         ↓                                   │
│  5. Replaces keys in data with short aliases                │
│                         ↓                                   │
│  6. Sends compressed payload + header                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Client fetch() receives response                        │
│                         ↓                                   │
│  8. Detects terse header, parses payload                    │
│                         ↓                                   │
│  9. Wraps data in Proxy for transparent key access          │
│                         ↓                                   │
│  10. Your code accesses data.firstName → mapped to data.a   │
└─────────────────────────────────────────────────────────────┘
```

### Bandwidth Savings (Real Benchmarks)

| Compression Method | Reduction | Use Case |
|--------------------|-----------|----------|
| TerseJSON alone | **30-39%** | Sites without Gzip (68% of web) |
| Gzip alone | ~75% | Large payloads (>32KB) |
| **TerseJSON + Gzip** | **~85%** | Recommended for production |
| **TerseJSON + Brotli** | **~93%** | Maximum compression |

*Benchmarks run on real API endpoints with 100-5000 records. [Full report →](https://tersejson.com/benchmarks)*

**Performance overhead (client-side):**

| Operation | Time | vs JSON.parse() |
|-----------|------|-----------------|
| JSON.parse() | 2.5ms | baseline |
| TerseJSON (Proxy mode) | 2.6ms | **+4%** |
| TerseJSON (expand mode) | 3.2ms | +28% |

*Proxy mode (default) is nearly zero-cost - keys are translated lazily on access.*

**Network speed impact (1000-record payload):**

| Network | Normal JSON | TerseJSON + Gzip | Saved |
|---------|-------------|------------------|-------|
| 4G (20 Mbps) | 200ms | 30ms | **170ms** |
| 3G (2 Mbps) | 2,000ms | 300ms | **1,700ms** |
| Slow 3G | 10,000ms | 1,500ms | **8,500ms** |

*Every 100ms of latency costs 1% in conversions (Amazon/Google studies).*

**Memory efficiency (Proxy mode):**

Unlike binary formats (Protocol Buffers, MessagePack) that require full deserialization, TerseJSON's Proxy mode only expands keys when accessed. This is huge for CMS and data-heavy apps:

```javascript
// CMS fetches 1000 articles with 21 fields each
const articles = await terseFetch('/api/articles');

// But list view only needs 3 fields
articles.map(a => ({ title: a.title, slug: a.slug, excerpt: a.excerpt }));

// Result: Only 3 keys translated per object
// The other 18 fields stay compressed in memory
```

**Real memory benchmarks (1000 records, 21 fields each):**

| Fields Accessed | Normal JSON | TerseJSON Proxy | Memory Saved |
|-----------------|-------------|-----------------|--------------|
| 1 field | 6.35 MB | 4.40 MB | **31%** |
| 3 fields (list view) | 3.07 MB | ~0 MB | **~100%** |
| 6 fields (card view) | 3.07 MB | ~0 MB | **~100%** |
| All 21 fields | 4.53 MB | 1.36 MB | **70%** |

*TerseJSON Proxy is so lightweight that accessing partial fields triggers garbage collection of unused data.*

**Perfect for:**
- CMS list views (title + slug + excerpt from 20+ field objects)
- Dashboards with large datasets
- Mobile apps with memory constraints
- Infinite scroll / virtualized lists

## Why Gzip Isn't Enough

**"Just use gzip"** is the most common response to compression libraries. But here's the reality:

### Gzip Often Isn't Enabled

- **68%** of websites don't have Gzip enabled (W3Techs, 2024)
- Most cloud platforms, serverless functions, and shared hosting don't enable it by default

### Proxy Defaults Are Hostile

Most deployments put a reverse proxy (nginx, Traefik, etc.) in front of Node.js. The defaults actively work against you:

**NGINX:**
- `gzip_proxied` defaults to `off` — won't compress proxied requests
- `gzip_http_version` defaults to `1.1`, but `proxy_http_version` defaults to `1.0` — mismatch causes silent failures
- Official Docker nginx image ships with `#gzip on;` (commented out)

**Traefik (Dokploy, Coolify, etc.):**
- Compress middleware is NOT enabled by default
- Must explicitly add labels to every service:
```yaml
traefik.http.middlewares.compress.compress=true
traefik.http.routers.myrouter.middlewares=compress
```

**Kubernetes ingress-nginx:**
- `use-gzip: false` by default in ConfigMap
- Must explicitly configure in ingress-nginx-controller

### The Fix Requires DevOps

Enabling gzip properly requires:
```nginx
gzip on;
gzip_proxied any;
gzip_http_version 1.0;
gzip_types text/plain application/json application/javascript text/css;
```

That means DevOps coordination, nginx access, and deployment. In most orgs, the proxy is managed by a different team.

### TerseJSON Just Works

```typescript
app.use(terse())
```

One line. Ships with your code. No proxy config. No DevOps ticket. Works whether gzip is enabled or not.

**If gzip is working:** TerseJSON + Gzip = 85% total reduction (vs 75% gzip alone).
**If gzip isn't working:** You get 30-39% savings instantly with zero config.

Either way, you're covered.

## API Reference

### Express Middleware

```typescript
import { terse, terseQueryParam } from 'tersejson/express';

// Basic usage
app.use(terse());

// With options
app.use(terse({
  minArrayLength: 5,      // Only compress arrays with 5+ items
  minKeyLength: 4,        // Only compress keys with 4+ characters
  maxDepth: 5,            // Max nesting depth to traverse
  debug: true,            // Log compression stats
  headerName: 'x-terse',  // Custom header name
  shouldCompress: (data, req) => {
    // Custom logic to skip compression
    return !req.path.includes('/admin');
  },
}));

// Enable via query parameter (?terse=true)
app.use(terseQueryParam());
```

### Client Library

```typescript
import {
  fetch,           // Drop-in fetch replacement
  createFetch,     // Create configured fetch instance
  expand,          // Fully expand a terse payload
  proxy,           // Wrap payload with Proxy (default)
  process,         // Auto-detect and expand/proxy
  axiosInterceptor // Axios support
} from 'tersejson/client';

// Drop-in fetch replacement
const data = await fetch('/api/users').then(r => r.json());

// Custom fetch instance
const customFetch = createFetch({
  debug: true,
  autoExpand: true,
});

// Axios integration
import axios from 'axios';
axios.interceptors.request.use(axiosInterceptor.request);
axios.interceptors.response.use(axiosInterceptor.response);

// Manual processing
import { process } from 'tersejson/client';
const response = await regularFetch('/api/users');
const data = process(await response.json());
```

### Core Functions

```typescript
import {
  compress,           // Compress an array of objects
  expand,             // Expand a terse payload
  isCompressibleArray,// Check if data can be compressed
  isTersePayload,     // Check if data is a terse payload
  createTerseProxy,   // Create a Proxy for transparent access
} from 'tersejson';

// Manual compression
const compressed = compress(users, { minKeyLength: 3 });

// Manual expansion
const original = expand(compressed);

// Type checking
if (isTersePayload(data)) {
  const expanded = expand(data);
}
```

## TypeScript Support

TerseJSON is written in TypeScript and provides full type definitions:

```typescript
import type {
  TersePayload,
  TerseMiddlewareOptions,
  TerseClientOptions,
  Tersed,
} from 'tersejson';

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

// Types flow through compression
const users: User[] = await fetch('/api/users').then(r => r.json());
users[0].firstName; // TypeScript knows this is a string
```

## Framework Integrations

TerseJSON provides ready-to-use integrations for popular HTTP clients and frameworks.

### Axios

```typescript
import axios from 'axios';
import { createAxiosInterceptors } from 'tersejson/integrations';

const { request, response } = createAxiosInterceptors();
axios.interceptors.request.use(request);
axios.interceptors.response.use(response);

// Now all axios requests automatically handle TerseJSON!
const { data } = await axios.get('/api/users');
console.log(data[0].firstName); // Works transparently!
```

### Angular (HttpClient)

```typescript
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

// app.module.ts
@NgModule({
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: TerseInterceptor, multi: true }
  ]
})
```

### AngularJS (1.x)

```javascript
angular.module('myApp', [])
  .factory('terseInterceptor', function() {
    return {
      request: function(config) {
        config.headers = config.headers || {};
        config.headers['accept-terse'] = 'true';
        return config;
      },
      response: function(response) {
        var isTerse = response.headers('x-terse-json') === 'true';
        if (isTerse && response.data && response.data.__terse__) {
          response.data = tersejson.process(response.data);
        }
        return response;
      }
    };
  })
  .config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('terseInterceptor');
  }]);
```

### jQuery

```javascript
import { setupJQueryAjax } from 'tersejson/integrations';

// One-time setup
setupJQueryAjax($);

// All jQuery AJAX calls now support TerseJSON
$.get('/api/users', function(data) {
  console.log(data[0].firstName); // Works!
});
```

### SWR (React)

```typescript
import useSWR from 'swr';
import { createSWRFetcher } from 'tersejson/integrations';

const fetcher = createSWRFetcher();

function UserList() {
  const { data, error } = useSWR('/api/users', fetcher);

  if (error) return <div>Error loading</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.firstName}</li>
      ))}
    </ul>
  );
}
```

### React Query / TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { createQueryFn } from 'tersejson/integrations';

const queryFn = createQueryFn();

function UserList() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => queryFn('/api/users')
  });

  return <div>{data?.[0].firstName}</div>;
}
```

## Analytics (Opt-in)

TerseJSON includes optional analytics to track your compression savings.

### Local Analytics

Track compression stats without sending data anywhere:

```typescript
import { terse } from 'tersejson/express';
import { analytics } from 'tersejson/analytics';

// Enable local-only analytics
app.use(terse({ analytics: true }));

// Or with custom callbacks
app.use(terse({
  analytics: {
    enabled: true,
    onEvent: (event) => {
      console.log(`Saved ${event.originalSize - event.compressedSize} bytes`);
    },
  },
}));

// Check your savings anytime
setInterval(() => {
  console.log(analytics.getSummary());
  // "TerseJSON Stats: 1,234 compressions, 847KB saved (73.2% avg)"
}, 60000);
```

### Cloud Analytics (tersejson.com)

Get a dashboard with your compression stats at tersejson.com:

```typescript
app.use(terse({
  analytics: {
    apiKey: 'your-api-key', // Get one at tersejson.com/dashboard
    projectId: 'my-app',
    reportToCloud: true,
  },
}));
```

Dashboard features:
- Real-time compression stats
- Bandwidth savings over time
- Per-endpoint analytics
- Team sharing

### Privacy

- Analytics are **100% opt-in**
- Endpoint paths are hashed (no sensitive data)
- No request/response content is ever collected
- Only aggregate stats are reported

## FAQ

### Does this work with nested objects?

Yes! TerseJSON recursively compresses nested objects and arrays:

```javascript
// This works
const data = [
  {
    user: { firstName: "John", lastName: "Doe" },
    orders: [
      { productName: "Widget", quantity: 5 }
    ]
  }
];
```

### What about non-array responses?

TerseJSON only compresses arrays of objects (where key compression makes sense). Single objects or primitives pass through unchanged.

### Does this break JSON.stringify on the client?

No! The Proxy is transparent. `JSON.stringify(data)` works and outputs the original key names.

### What's the performance overhead?

Minimal. Proxy mode adds **<5% CPU overhead** vs JSON.parse(). Memory is actually *lower* because payloads are smaller. The network savings (170-8500ms) far outweigh client processing cost (~0.1ms).

### Can I use this with GraphQL?

Yes! TerseJSON supports GraphQL via `express-graphql` and Apollo Client:

```typescript
// Server (express-graphql)
import { graphqlHTTP } from 'express-graphql';
import { terseGraphQL } from 'tersejson/graphql';

app.use('/graphql', terseGraphQL(graphqlHTTP({
  schema: mySchema,
  graphiql: true,
})));

// Client (Apollo)
import { createTerseLink } from 'tersejson/graphql-client';

const client = new ApolloClient({
  link: from([createTerseLink(), httpLink]),
  cache: new InMemoryCache(),
});
```

GraphQL queries returning arrays of objects (like `users { firstName lastName }`) benefit from the same key compression.

## Browser Support

Works in all modern browsers that support:
- `Proxy` (ES6) - Chrome 49+, Firefox 18+, Safari 10+, Edge 12+
- `fetch` - Or use a polyfill

## Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE)

---

**[tersejson.com](https://tersejson.com)** | Made with bandwidth in mind
