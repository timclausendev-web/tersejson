# CLAUDE.md

## CRITICAL: Cross-Project Sync

**This project is part of the TerseJSON ecosystem. ALWAYS check the sync file.**

```
~/projects/tersejson-sync/SYNC.md
```

### BEFORE starting work:
1. Read `SYNC.md` (symlinked in this repo)
2. Check for pending items that affect this project
3. Complete any pending items before other work

### AFTER completing work:
1. Update `SYNC.md` with what changed
2. Add pending items for other projects if needed (website docs, chrome extension sync)
3. Update version numbers in the Projects table

### Related Projects:
- **NPM Package**: `~/projects/tersejson` - Core library (THIS PROJECT)
- **Website**: `~/projects/tersejson-website` - tersejson.com (private)
- **Chrome Extension**: `~/projects/tersejson-chrome` - DevTools extension

This is the CORE package. Changes here often require updates to:
- Website (documentation, version badges, examples)
- Chrome Extension (tersejson.js library sync if expand functions change)

---

## Project Overview

TerseJSON is a transparent JSON key compression library for Express APIs. It reduces bandwidth by replacing repetitive JSON keys with short aliases on the server, then transparently expands them on the client using JavaScript Proxies.

## Build & Development Commands

```bash
npm run build       # Build with tsup (outputs to dist/)
npm run dev         # Build in watch mode
npm run test        # Run tests in watch mode (vitest)
npm run test:run    # Run tests once
npm run lint        # Lint src/ with eslint
npm run typecheck   # TypeScript type checking
```

## Architecture

### Module Structure

The library exports five separate entry points configured in `tsup.config.ts`:

- **`tersejson`** (`src/index.ts`) - Core compression/expansion functions and type exports
- **`tersejson/express`** (`src/express.ts`) - Express middleware that intercepts `res.json()` calls
- **`tersejson/client`** (`src/client.ts`) - Client-side fetch wrapper and response processing
- **`tersejson/integrations`** (`src/integrations.ts`) - Framework adapters (Axios, Angular, jQuery, SWR, React Query)
- **`tersejson/analytics`** (`src/analytics.ts`) - Optional compression stats tracking

### Wire Format

Compressed payloads follow this structure (defined in `src/types.ts`):

```typescript
interface TersePayload<T> {
  __terse__: true;     // Marker for detection
  v: 1;                // Version
  k: Record<string, string>;  // Key map: short -> original
  d: T;                // Compressed data
  p?: string;          // Pattern name (for debugging)
}
```

### Core Compression Flow

1. `compress()` in `src/core.ts` collects unique keys from array of objects
2. Creates key generator based on pattern (alpha, numeric, prefixed, custom)
3. Builds bidirectional key mapping (only if short key is actually shorter)
4. Recursively compresses objects based on `nestedHandling` option

### Client Decompression

Two strategies in `src/core.ts`:
- `expand()` - Full expansion, creates new objects with original keys
- `wrapWithProxy()` - Wraps compressed data in Proxy for lazy key translation (default, more memory efficient)

### Express Middleware

`terse()` in `src/express.ts`:
- Checks for `accept-terse: true` header from client
- Intercepts `res.json()` calls
- Only compresses arrays of objects meeting `minArrayLength` threshold
- Sets `x-terse-json: true` response header

### Key Patterns

Supported patterns in `createKeyGenerator()`:
- `alpha`: a, b, ... z, aa, ab (default)
- `numeric`: 0, 1, 2...
- `alphanumeric`: a1, a2... b1, b2
- `short`: _, a, b... (shortest possible)
- `prefixed`: custom prefix + number/alpha
- Custom function: `(index: number) => string`

## Testing

Tests are in `src/core.test.ts` using vitest. Run a specific test:

```bash
npx vitest run -t "test name pattern"
```

## Key Implementation Details

- The Proxy handler in `createTerseProxy()` handles `get`, `has`, `ownKeys`, and `getOwnPropertyDescriptor` traps
- Nested structures (objects and arrays) are recursively processed up to `maxDepth`
- Keys shorter than the compressed alias are not compressed (checked at line 360-363 in core.ts)
- Detection uses `isTersePayload()` which checks for `__terse__: true`, `v`, `k`, and `d` properties
