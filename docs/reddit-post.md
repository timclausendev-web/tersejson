# Reddit Post for TerseJSON

## Title options (pick one):

**Option 1:** I built a library that compresses JSON keys over the wire and transparently expands them on the client

**Option 2:** Reduce API bandwidth by 70-80% by compressing repetitive JSON keys (with zero code changes)

**Option 3:** Open source library to compress JSON keys in API responses - seeing 70-80% bandwidth reduction

---

## Post body:

**The Problem**

I kept noticing how wasteful JSON APIs are when returning arrays of objects. Every object repeats the same keys:

```json
[
  { "firstName": "John", "lastName": "Doe", "emailAddress": "john@example.com" },
  { "firstName": "Jane", "lastName": "Doe", "emailAddress": "jane@example.com" },
  // ... 1000 more objects with identical keys
]
```

For 1000 objects with 10 fields, you're sending ~50KB of just repeated key names. It always bugged me.

**The Solution**

I built [TerseJSON](https://www.npmjs.com/package/tersejson) - it compresses keys on the server and transparently expands them on the client using JavaScript Proxies.

Over the wire it looks like:
```json
{
  "k": { "a": "firstName", "b": "lastName", "c": "emailAddress" },
  "d": [
    { "a": "John", "b": "Doe", "c": "john@example.com" },
    { "a": "Jane", "b": "Doe", "c": "jane@example.com" }
  ]
}
```

But your code just works normally:
```javascript
users[0].firstName  // "John" - no changes needed
```

**Setup is minimal:**

Server (Express):
```javascript
import { terse } from 'tersejson/express';
app.use(terse());
```

Client:
```javascript
import { fetch } from 'tersejson/client';
const users = await fetch('/api/users').then(r => r.json());
// Access properties normally - it just works
```

**Real-world savings I've measured:**

| Scenario | Original | Compressed | Savings |
|----------|----------|------------|---------|
| 100 users, 10 fields | 45 KB | 12 KB | 73% |
| 1000 products, 15 fields | 890 KB | 180 KB | 80% |
| 10000 logs, 8 fields | 2.1 MB | 450 KB | 79% |

These numbers are *before* gzip. Combined with gzip, you can see 90%+ total reduction.

**What it supports:**

- Express middleware (just `app.use(terse())`)
- Drop-in fetch replacement
- Axios, Angular, jQuery, SWR, React Query integrations
- Full TypeScript support
- Nested objects/arrays
- Configurable compression thresholds

**Limitations (being honest):**

- Only useful for arrays of objects with repeated keys (single objects pass through unchanged)
- Not for GraphQL (it already has efficient querying)
- Adds a small processing overhead (but bandwidth savings far outweigh it)
- Requires client-side support to decompress

**Links:**

- npm: https://www.npmjs.com/package/tersejson
- GitHub: https://github.com/timclausendev-web/tersejson
- Website: https://tersejson.com

Would love to hear thoughts, feedback, or ideas for improvement. Is this something you'd find useful? Any edge cases I should handle better?

---

## Posting tips:

- r/node and r/javascript are good fits
- Post during US business hours (9am-12pm EST) for best visibility
- Respond to comments quickly - engagement boosts visibility
- If crossposting, wait a few hours between posts
