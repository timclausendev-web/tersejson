# TerseJSON

**Transparent JSON key compression for Express APIs. Reduce bandwidth by up to 80% with zero code changes.**

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

### Bandwidth Savings

| Scenario | Original | Compressed | Savings |
|----------|----------|------------|---------|
| 100 users, 10 fields | 45 KB | 12 KB | **73%** |
| 1000 products, 15 fields | 890 KB | 180 KB | **80%** |
| 10000 logs, 8 fields | 2.1 MB | 450 KB | **79%** |

*Note: These savings are **before** gzip. Combined with gzip, total reduction can exceed 90%.*

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

Minimal. Key mapping is O(n) and Proxy access adds negligible overhead. The bandwidth savings far outweigh the processing cost.

### Can I use this with GraphQL?

TerseJSON is designed for REST APIs. GraphQL already has efficient query mechanisms.

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
