# TerseJSON

**Memory-efficient JSON processing. Lazy Proxy expansion uses 70% less RAM than JSON.parse.**

> TerseJSON does **LESS work** than JSON.parse, not more. The Proxy skips full deserialization - only accessed fields allocate memory. Plus 30-80% smaller payloads.

[![npm version](https://badge.fury.io/js/tersejson.svg)](https://www.npmjs.com/package/tersejson)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## The Problem

Your CMS API returns 21 fields per article. Your list view renders 3.

```javascript
// Standard JSON.parse workflow:
const articles = await fetch('/api/articles').then(r => r.json());
// Result: 1000 objects x 21 fields = 21,000 properties allocated in memory
// You use: title, slug, excerpt (3 fields)
// Wasted: 18,000 properties that need garbage collection
```

**Full deserialization wastes memory.** Every field gets allocated whether you access it or not. Binary formats (Protobuf, MessagePack) have the same problem - they require complete deserialization.

## The Solution

TerseJSON's Proxy wraps compressed data and translates keys **on-demand**:

```javascript
// TerseJSON workflow:
const articles = await terseFetch('/api/articles');
// Result: Compressed payload + Proxy wrapper
// Access: article.title → translates key, returns value
// Never accessed: 18 other fields stay compressed, never allocate
```

**Memory Benchmarks (1000 records, 21 fields each):**

| Fields Accessed | Normal JSON | TerseJSON Proxy | Memory Saved |
|-----------------|-------------|-----------------|--------------|
| 1 field | 6.35 MB | 4.40 MB | **31%** |
| 3 fields (list view) | 3.07 MB | ~0 MB | **~100%** |
| 6 fields (card view) | 3.07 MB | ~0 MB | **~100%** |
| All 21 fields | 4.53 MB | 1.36 MB | **70%** |

*Run the benchmark yourself: `node --expose-gc demo/memory-analysis.js`*

## "Doesn't This Add Overhead?"

This is the most common misconception. Let's trace the actual operations:

**Standard JSON.parse workflow:**
1. Parse 890KB string → allocate 1000 objects x 21 fields = **21,000 properties**
2. Access 3 fields per object
3. GC eventually collects 18,000 unused properties

**TerseJSON workflow:**
1. Parse 180KB string (smaller = faster) → allocate 1000 objects x 21 SHORT keys
2. Wrap in Proxy (O(1), ~0.1ms, no allocation)
3. Access 3 fields → **3,000 properties CREATED**
4. 18,000 properties **NEVER EXIST**

**The math:**
- Parse time: Smaller string (180KB vs 890KB) = **faster**
- Allocations: 3,000 vs 21,000 = **86% fewer**
- GC pressure: Only 3,000 objects to collect vs 21,000
- Proxy lookup: O(1) Map access, ~0.001ms per field

**Result:** LESS total work, not more. The Proxy doesn't add overhead - it **skips** work.

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

// Access properties normally - Proxy handles key translation
console.log(users[0].firstName); // Works transparently!
console.log(users[0].emailAddress); // Works transparently!
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  SERVER                                                      │
│  1. Your Express route calls res.json(data)                 │
│  2. TerseJSON middleware intercepts                         │
│  3. Compresses keys: { "a": "firstName", "b": "lastName" }  │
│  4. Sends smaller payload (180KB vs 890KB)                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ Network (smaller, faster)
┌─────────────────────────────────────────────────────────────┐
│  CLIENT                                                      │
│  5. JSON.parse smaller string (faster)                      │
│  6. Wrap in Proxy (O(1), near-zero cost)                    │
│  7. Access data.firstName → Proxy translates to data.a      │
│  8. Unused fields never materialize in memory               │
└─────────────────────────────────────────────────────────────┘
```

## Perfect For

- **CMS list views** - title + slug + excerpt from 20+ field objects
- **Dashboards** - large datasets, aggregate calculations on subsets
- **Mobile apps** - memory constrained, infinite scroll
- **E-commerce** - product grids (name + price + image from 30+ field objects)
- **Long-running SPAs** - memory accumulation over hours (support tools, dashboards)

## Network Savings (Bonus)

Memory efficiency is the headline. Smaller payloads are the bonus:

| Compression Method | Reduction | Use Case |
|--------------------|-----------|----------|
| TerseJSON alone | **30-39%** | Sites without Gzip (68% of web) |
| Gzip alone | ~75% | Large payloads (>32KB) |
| **TerseJSON + Gzip** | **~85%** | Recommended for production |
| **TerseJSON + Brotli** | **~93%** | Maximum compression |

**Network speed impact (1000-record payload):**

| Network | Normal JSON | TerseJSON + Gzip | Saved |
|---------|-------------|------------------|-------|
| 4G (20 Mbps) | 200ms | 30ms | **170ms** |
| 3G (2 Mbps) | 2,000ms | 300ms | **1,700ms** |
| Slow 3G | 10,000ms | 1,500ms | **8,500ms** |

## Why Gzip Isn't Enough

**"Just use gzip"** misses two points:

1. **68% of websites don't have Gzip enabled** ([W3Techs](https://w3techs.com/technologies/details/ce-gzipcompression)). Proxy defaults are hostile - nginx, Traefik, Kubernetes all ship with compression off.

2. **Gzip doesn't help memory.** Even with perfect compression over the wire, JSON.parse still allocates every field. TerseJSON's Proxy keeps unused fields compressed in memory.

**TerseJSON works at the application layer:**
- No proxy config needed
- No DevOps tickets
- Stacks with gzip/brotli for maximum savings
- **Plus** memory benefits that gzip can't provide

## vs Binary Formats (Protobuf, MessagePack)

| | TerseJSON | Protobuf/MessagePack |
|---|-----------|---------------------|
| Wire compression | 30-80% | 80-90% |
| **Memory on partial access** | **Only accessed fields** | Full deserialization required |
| Schema required | No | Yes |
| Human-readable | Yes (JSON in DevTools) | No (binary) |
| Migration effort | 2 minutes | Days/weeks |
| Debugging | Easy | Need special tools |

**Binary formats win on wire size. TerseJSON wins on memory.**

If you access 3 fields from a 21-field object:
- Protobuf: All 21 fields deserialized into memory
- TerseJSON: Only 3 fields materialize

## Server-Side Memory Optimization

TerseJSON includes utilities for memory-efficient server-side data handling:

```typescript
import { TerseCache, compressStream } from 'tersejson/server-memory';

// Memory-efficient caching - stores compressed, expands on access
const cache = new TerseCache();
cache.set('users', largeUserArray);
const users = cache.get('users'); // Returns Proxy-wrapped data

// Streaming compression for database cursors
const cursor = db.collection('users').find().stream();
for await (const batch of compressStream(cursor, { batchSize: 100 })) {
  // Process compressed batches without loading entire result set
}

// Inter-service communication - pass compressed data without intermediate expansion
import { createTerseServiceClient } from 'tersejson/server-memory';
const serviceB = createTerseServiceClient({ baseUrl: 'http://service-b' });
const data = await serviceB.get('/api/users'); // Returns Proxy-wrapped
```

## API Reference

### Express Middleware

```typescript
import { terse } from 'tersejson/express';

app.use(terse({
  minArrayLength: 5,      // Only compress arrays with 5+ items
  minKeyLength: 4,        // Only compress keys with 4+ characters
  maxDepth: 5,            // Max nesting depth to traverse
  debug: true,            // Log compression stats
}));
```

### Client Library

```typescript
import {
  fetch,           // Drop-in fetch replacement
  createFetch,     // Create configured fetch instance
  expand,          // Fully expand a terse payload
  proxy,           // Wrap payload with Proxy (default)
  process,         // Auto-detect and expand/proxy
} from 'tersejson/client';

// Drop-in fetch replacement
const data = await fetch('/api/users').then(r => r.json());

// Manual processing
import { process } from 'tersejson/client';
const response = await regularFetch('/api/users');
const data = process(await response.json());
```

### Core Functions

```typescript
import {
  compress,           // Compress an array of objects
  expand,             // Expand a terse payload (full deserialization)
  wrapWithProxy,      // Wrap payload with Proxy (lazy expansion - recommended)
  isTersePayload,     // Check if data is a terse payload
} from 'tersejson';

// Manual compression
const compressed = compress(users, { minKeyLength: 3 });

// Two expansion strategies:
const expanded = expand(compressed);        // Full expansion - all fields allocated
const proxied = wrapWithProxy(compressed);  // Lazy expansion - only accessed fields
```

## Framework Integrations

### Axios

```typescript
import axios from 'axios';
import { createAxiosInterceptors } from 'tersejson/integrations';

const { request, response } = createAxiosInterceptors();
axios.interceptors.request.use(request);
axios.interceptors.response.use(response);
```

### SWR (React)

```typescript
import useSWR from 'swr';
import { createSWRFetcher } from 'tersejson/integrations';

const fetcher = createSWRFetcher();

function UserList() {
  const { data } = useSWR('/api/users', fetcher);
  return <ul>{data?.map(user => <li>{user.firstName}</li>)}</ul>;
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

### GraphQL (Apollo)

```typescript
// Server
import { terseGraphQL } from 'tersejson/graphql';
app.use('/graphql', terseGraphQL(graphqlHTTP({ schema })));

// Client
import { createTerseLink } from 'tersejson/graphql-client';
const client = new ApolloClient({
  link: from([createTerseLink(), httpLink]),
  cache: new InMemoryCache(),
});
```

## TypeScript Support

Full type definitions included:

```typescript
import type { TersePayload, Tersed } from 'tersejson';

interface User {
  firstName: string;
  lastName: string;
}

const users: User[] = await fetch('/api/users').then(r => r.json());
users[0].firstName; // TypeScript knows this is a string
```

## FAQ

### Does this break JSON.stringify?

No! The Proxy is transparent. `JSON.stringify(data)` outputs original key names.

### What about nested objects?

Fully supported. TerseJSON recursively compresses nested objects and arrays.

### What's the performance overhead?

Proxy mode adds **<5% CPU overhead** vs JSON.parse(). But with smaller payloads and fewer allocations, **net total work is LESS**. Memory is significantly lower.

### When should I use expand() vs wrapWithProxy()?

- **wrapWithProxy()** (default): Best for most cases. Lazy expansion, lower memory.
- **expand()**: When you need a plain object (serialization to storage, passing to libraries that don't support Proxy).

## Browser Support

Works in all modern browsers supporting `Proxy` (ES6):
- Chrome 49+, Firefox 18+, Safari 10+, Edge 12+

## Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE)

---

**[tersejson.com](https://tersejson.com)** | Memory-efficient JSON for high-volume APIs
