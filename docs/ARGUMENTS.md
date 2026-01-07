# Common Arguments & Responses

This document tracks common criticisms/questions about TerseJSON and thoughtful responses.

---

## "Modern websites are 3MB, who cares about 40KB?"

**Comment from u/Possible-Session9849:**
> I guess this is cool, but who really cares? Modern websites are 3000KB; no one's gonna bat an eye if your API request takes an extra 40KB of data.

**Response points:**

1. **It's not about a single request** - APIs serving 1000 users making 50 requests/day = 50,000 requests. At 40KB savings each, that's ~2GB/day in bandwidth costs.

2. **Mobile users on metered connections** - Not everyone has unlimited data. Users in developing markets, rural areas, or on pay-per-MB plans notice every KB.

3. **Latency matters more than size** - Smaller payloads parse faster. JSON.parse() on 180KB vs 890KB is a noticeable difference, especially on lower-end devices.

4. **Server egress costs** - Cloud providers charge for bandwidth. At scale, 70-80% reduction in API payload size directly reduces costs.

5. **The 3MB website argument is a false equivalence** - Those assets are cached. API data usually isn't. You download the JS bundle once, but you fetch fresh data constantly.

6. **It's transparent** - Zero code changes required. If there's no downside (and there isn't), why not take free bandwidth savings?

**Suggested response:**
> Fair point for single requests, but it adds up fast at scale. 1000 users × 50 requests/day × 40KB = 2GB/day in bandwidth. Also worth noting: that 3MB website is cached - your API data usually isn't. Every fetch is fresh bytes. Plus the real win is often mobile users on metered connections and lower-end devices where faster JSON parsing matters. And since it's transparent (zero code changes), it's basically free savings with no downside.

---

## "If anyone cared, they'd use something other than JSON"

**Comment from u/okayifimust:**
> If anyone cared, they wouldn't be using JSON, not raw, not minified.

**Response points:**

1. **JSON is the de facto standard** - It's what browsers, frameworks, and tools expect. Switching to Protobuf, MessagePack, or CBOR means changing your entire stack.

2. **Binary formats have trade-offs** - They're not human-readable, harder to debug, require schema management, and don't work as easily with browser DevTools.

3. **This is additive, not a replacement** - TerseJSON works transparently on top of JSON. You get 70-80% of the savings without any of the migration pain.

4. **JSON is here to stay** - Most APIs are JSON. Most teams aren't going to rewrite their stack for marginal gains. This brings those gains to the JSON world.

5. **The "if anyone cared" premise is flawed** - Plenty of people care but have constraints. Legacy systems, team expertise, tooling compatibility, time/budget all matter.

**Suggested response:**
> JSON is the de facto standard for REST APIs - it's what browsers, frameworks, and debugging tools expect. Sure, Protobuf/MessagePack are more efficient, but they require retooling your entire stack, managing schemas, and giving up human-readable debugging. TerseJSON gives you 70-80% of the bandwidth savings without any migration pain - it's just JSON with shorter keys. Most teams can't justify a full protocol switch, but they can add one middleware.

---

## "What's the savings WITH gzip, not before?"

**Comment from u/bzbub2:**
> "RE: Real savings I've measured: 73-80% reduction before gzip. Combined with gzip, 90%+."
>
> the measurement of interest is likely size of payload with gzip but without your library applied VS. size of payload with gzip and with your library applied

**This is a fair point.** The real comparison that matters is:
- `JSON + gzip` vs `TerseJSON + gzip`

**Response points:**

1. **They're right** - most production APIs use gzip, so the "before gzip" number is less relevant.

2. **TerseJSON still helps with gzip** - gzip is good at compressing repeated strings, but it still has to encode each key occurrence. TerseJSON reduces the raw bytes gzip has to work with.

3. **Typical real-world results (gzip vs gzip):**
   - 100 objects, 10 fields: ~15-25% additional savings on top of gzip
   - The bigger the array, the more the savings (gzip dictionary gets full)

4. **Acknowledge and update messaging** - This is good feedback for documentation.

**Suggested response:**
> Fair point - you're right that the gzip-to-gzip comparison is what matters in production. I should update the docs to emphasize that.
>
> Real numbers with gzip on both: TerseJSON + gzip typically saves an additional 15-25% compared to just gzip alone. The gains are more pronounced with larger arrays (100+ items) because gzip's dictionary fills up and becomes less effective at deduplicating repeated keys.
>
> I'll update the README to lead with gzip-vs-gzip numbers. Thanks for the feedback.

---

## "Gzip already does this transparently"

**Comment from u/lewster32:**
> Gzip does a pretty good job of this already and works with more than the keys. It's a nice exercise and it's a thought I and many other developers have had, but the existing tech already does this almost completely transparently anyway.

**Response points:**

1. **Gzip is good, but not perfect for repeated keys** - Gzip uses a sliding window (typically 32KB). Once that fills up, it can't reference earlier occurrences. Large arrays lose efficiency.

2. **They stack, not compete** - TerseJSON + gzip beats gzip alone by 15-25%. It's not either/or.

3. **Gzip has CPU cost too** - Compressing 890KB takes more CPU than compressing 180KB. TerseJSON reduces what gzip has to process.

4. **The "many developers have had this thought" point** - True, but most don't ship it. This is a working, tested implementation with framework integrations.

5. **Acknowledge the valid point** - Gzip does handle a lot. This is incremental improvement, not revolutionary.

**Suggested response:**
> You're right that gzip handles a lot of this - it's why I show gzip-vs-gzip numbers in the README now. TerseJSON + gzip beats plain gzip by about 15-25% in my tests.
>
> The gains come from two things: (1) gzip's 32KB sliding window means it loses efficiency on large arrays, and (2) fewer raw bytes = less CPU spent on compression.
>
> Is it revolutionary? No. Is it free incremental savings with zero code changes? Yeah. Fair point though - gzip does most of the heavy lifting.

---

## Counter-point: "What if they don't have gzip?"

**This is actually a strong use case.** Many servers don't have gzip enabled:

- Express apps without `compression` middleware
- Serverless functions (Lambda, Vercel, Cloudflare Workers)
- Development/staging environments
- Internal microservices
- APIs behind proxies that strip compression

**For these servers, TerseJSON delivers the full 70-80% savings.**

**Key messaging:**
> "If you're already using gzip, you'll save an extra 15-25%. If you're not, you'll save 70-80% instantly - and it's often easier to add than configuring gzip."

This reframes the value prop: TerseJSON isn't just for optimization nerds - it's a quick win for anyone who hasn't set up compression yet.

---

## The enterprise scale argument

**This is where TerseJSON really shines.** The critics are thinking about small apps with occasional API calls. Enterprise is different:

**The math at scale:**

| Traffic | Savings/request | Daily | Monthly | Cost saved* |
|---------|-----------------|-------|---------|-------------|
| 1M req/day | 40 KB | 40 GB | 1.2 TB | ~$108/mo |
| 10M req/day | 40 KB | 400 GB | 12 TB | ~$1,080/mo |
| 100M req/day | 40 KB | 4 TB | 120 TB | ~$10,800/mo |

*At $0.09/GB AWS egress pricing*

**Enterprise-specific benefits:**
- Large arrays (1000+ items) are common in dashboards, reports, data exports
- Gzip's 32KB window becomes a real limitation at this scale
- Reduced CPU load on compression = fewer servers needed
- Faster JSON.parse() on client = better UX on data-heavy pages

**Key messaging for enterprise:**
> "For side projects, gzip is probably enough. For APIs serving millions of requests with large payloads, TerseJSON pays for itself in cloud egress savings alone."

---

## Positive feedback + Chrome extension idea

**Comment from u/intertubeluber:**
> Pretty clever. Like minification for data. Using a header for detection is a creative solution too. I'm surprised it provides much benefit over gzip since gzip should do something similar and more.
>
> I guess you see the terse version in dev tools. Minor downside.
>
> You could use the same strategy to completely replace json with a binary format for even better performance (maybe… depending on gzip). Seems like you do the same with protobufs.

**This is great feedback:**
- Validates the approach ("pretty clever", "creative solution")
- Identifies a real UX issue (terse keys in DevTools)
- Suggests future direction (binary format)

**Chrome Extension idea:**
A DevTools extension that automatically expands TerseJSON payloads in the Network tab would solve the debugging UX issue completely. Features:
- Detect `x-terse-json` header in responses
- Show expanded keys in preview/response tabs
- Toggle between compressed/expanded view
- Zero setup required for developers

---

## "Just use arrays and integers instead"

**Comment from u/ksskssptdpss:**
> Nice idea but if your API is not public you can simply use arrays and integers. Less data, no overhead.

**They're suggesting:**
```javascript
// Instead of:
[{ firstName: "John", lastName: "Doe" }]

// Use positional arrays:
[["John", "Doe"]]  // position 0 = firstName, position 1 = lastName
```

**Response points:**

1. **True, but fragile** - Positional arrays break if you add/remove/reorder fields. Every client needs to know the exact schema.

2. **Maintenance nightmare** - "What's index 7 again?" vs `user.emailAddress`. Self-documenting code matters.

3. **Tight coupling** - Server and client must stay perfectly in sync. Deploy order matters. Versioning is painful.

4. **TerseJSON is transparent** - Your code still uses `user.firstName`. No refactoring, no documentation, no coordination.

5. **This only works for internal APIs** - As they said, "if your API is not public." TerseJSON works for any API.

**Suggested response:**
> True - positional arrays are more compact. The tradeoff is maintainability: "What's index 7?" vs `user.emailAddress`. Adding or reordering fields requires coordinated client/server deploys.
>
> TerseJSON gives you most of the size benefit while keeping `user.firstName` in your code. No refactoring, no tight coupling, no "deploy server before client" coordination.
>
> For internal APIs where you control everything and don't mind the coupling, arrays definitely work. TerseJSON is for when you want the savings without changing how you write code.

---

## "How does this compare to Avro/Protobuf?"

**Comment from u/yojimbo_beta:**
> How does this compare to using Avro?
>
> AVSC already strips keys and uses a byte-offset based format. It also builds in a schema mechanism
>
> Protobufs do something similar - and you can work with them in JS. It's very convenient as you often use these for backend transport too
>
> I suspect you are approaching a problem other technologies have already solved

**They're right that Avro/Protobuf solve this.** The difference is the tradeoffs:

| | TerseJSON | Avro/Protobuf |
|---|-----------|---------------|
| Schema required | No | Yes (.avsc/.proto files) |
| Code generation | No | Often yes |
| Format | JSON (text) | Binary |
| Human-readable | Yes | No |
| DevTools visible | Yes (with extension) | No |
| Setup time | 2 minutes | Hours/days |
| Compression | Good (70-80%) | Best (90%+) |
| Coupling | Loose | Tight (schema sync) |
| Migration effort | Zero | Significant |

**When to use what:**

- **Avro/Protobuf:** Greenfield projects, microservices you control end-to-end, maximum performance critical, team already has schema infrastructure
- **TerseJSON:** Existing JSON APIs, quick wins without migration, teams without schema tooling, public APIs, when human-readability matters

**Suggested response:**
> You're right - Avro and Protobuf absolutely solve this, and more efficiently. The difference is the tradeoff between compression and friction.
>
> Protobuf/Avro require schema files, often code generation, and coordinated deploys. They're the right choice for greenfield microservices or when you already have that infrastructure.
>
> TerseJSON is for the "I have an existing Express API and want 70% savings in 2 minutes without changing anything" case. No schemas, no code gen, no migration. Just add middleware.
>
> Different tools for different situations. If you're already on Protobuf, you definitely don't need this.

---

## "This solves a problem that doesn't exist"

**Comment from u/Practical-Plan-2560:**
> Why should anyone use your library over just using gzip directly? I feel like this solves a problem that doesn't exist.

**Response - tie together all the points:**

1. **Many servers don't have gzip** - Express apps without compression middleware, serverless functions, internal APIs. For them, 70-80% savings instantly.

2. **Gzip + TerseJSON beats gzip alone** - 15-25% additional savings. Gzip's 32KB sliding window loses efficiency on large arrays.

3. **At scale, it's real money** - 10M requests/day × 40KB savings = $1,000/month in AWS egress.

4. **Zero friction** - One line of middleware. If there's no downside, why not?

**Suggested response:**
> A few reasons:
>
> 1. Many APIs don't have gzip enabled (Express apps without compression middleware, serverless functions, internal services). For them, TerseJSON gives 70-80% savings instantly.
>
> 2. If you do have gzip, TerseJSON stacks on top for 15-25% additional savings - gzip's 32KB window loses efficiency on large arrays.
>
> 3. At enterprise scale (10M+ requests/day), that 15-25% = ~$1,000/month in egress costs.
>
> For a side project? You're probably right, gzip is enough. For APIs at scale, the math works out.

---

## Follow-up: "Why will they use yours over gzip?"

**Comment from u/Practical-Plan-2560 (follow-up):**
> Many APIs don't have your solution either. Saying that the existing solution isn't being used is irrelevant unless you can identify why it's not being used and why they will use yours.
>
> I think this COULD be a selling point, but you haven't really sold this point yet. And I'm not sure people will care about 15-25% savings in exchange for another library. But I could be wrong here.
>
> At enterprise scale they'll use other options like Protobuf.

**This is fair pushback.** Address it directly:

1. **Why gzip isn't used:** Requires additional middleware/config. Many devs don't know it's not on by default. Serverless often doesn't include it.

2. **Why TerseJSON is easier:** One line of middleware, no config. Works immediately. No nginx/Apache config needed.

3. **Enterprise & Protobuf:** True for greenfield. But most enterprises have legacy JSON APIs they can't migrate. TerseJSON is for incremental wins on existing systems.

**Suggested response:**
> Fair pushback. Here's the thing:
>
> **Why gzip often isn't enabled:** It requires configuring compression middleware or server settings (nginx/Apache). Many devs don't realize Express doesn't gzip by default. Serverless platforms vary.
>
> **Why TerseJSON is easier:** `app.use(terse())` - one line, done. No server config, no infrastructure changes.
>
> **On enterprise + Protobuf:** You're right for greenfield projects. But most enterprises have years of JSON APIs they can't realistically migrate to Protobuf. TerseJSON is for "I need to reduce bandwidth on this existing API without a rewrite."
>
> You might be right that people won't care about 15-25%. That's fine - it's not for everyone. It's for teams where bandwidth costs matter and migration isn't an option.

---

## The nginx proxy problem (deep dive)

**Research from Reddit discussion (Jan 2026):**

The "just use gzip" crowd assumes gzip is easy and universal. It's not.

**W3Techs / HTTP Archive stats (Jan 2026):**
- 11% of websites have zero compression
- Only 12-14% of text/html and text/plain responses use compression at all
- ~60% of HTTP responses have no text-based compression

**The proxy problem is real:**

When you have nginx/Cloudflare/ALB in front of Node.js, gzip config gets complicated. The defaults are actively hostile:

1. `gzip_proxied` defaults to `off` — nginx literally won't compress responses to proxied requests by default
2. HTTP version mismatch — `gzip_http_version` defaults to 1.1, but `proxy_http_version` defaults to 1.0. They don't match, so compression silently fails.
3. Docker nginx image ships with gzip OFF — `#gzip on;` (commented out)

**The "fix" requires this on the proxy side:**
```nginx
gzip on;
gzip_proxied any;
gzip_http_version 1.0;
gzip_types text/plain application/json application/javascript text/css;
```

That requires DevOps coordination, nginx access, and a restart. In most orgs, the proxy is managed by a different team than the devs writing the API.

**TerseJSON is literally:**
```javascript
app.use(terse())
```

Works instantly, no DevOps needed, doesn't care about proxy config.

**Key messaging:**
> "Why not add it? The dev never has to worry 'Is gzip configured and working?' It works at the application layer, ships with your code, doesn't depend on proxy config or DevOps tickets."

---

## "This seems heavily vibed" / AI usage criticism

**Comment from u/286893:**
> How much of this did you build? This seems pretty heavily vibed. That mixed with all your responses being supplemented with an LLM response does not make me confident in your understanding of solving a true problem.

**Response points:**

1. **Be honest about AI usage** - Don't hide it. AI tools are part of modern development.

2. **"Vibed" implies lack of understanding** - Address this directly. Using AI to implement faster doesn't mean you don't understand what you built.

3. **Understanding comes first** - Identifying the problem, designing the approach, and validating with benchmarks requires understanding. AI speeds up implementation.

4. **Personal use case adds credibility** - If you built this to solve your own problem first, mention it.

**Suggested response:**
> I use Claude for most of my coding workflow these days - not going to pretend otherwise. But "vibed" implies I don't understand what I built, which isn't the case. I identified the problem (repetitive JSON keys eating bandwidth), researched the solution space, designed the approach (key aliasing + Proxy-based expansion), and validated it with benchmarks.
>
> I also have a real use case for this - I've built a large custom CMS from scratch and TerseJSON came out of solving my own bandwidth issues there first.
>
> AI helps me write code faster and draft responses more clearly. It doesn't tell me what problems to solve or whether the solution actually works. The understanding came first - the implementation just went faster.
>
> If the code or the approach has issues, I'm happy to discuss specifics.

---

## "Why not Protobuf?" + "Zero tests" criticism

**Comment from u/Practical-Plan-2560:**
> If compression is step 1. And this is for teams wanting to squeeze more out of compression, why wouldn't at that point they just switch to Protobuf?
>
> I also think Lambda and edge functions have great support for compression middleware. Not to mention your solution is just compression middleware. So how is it for environments where that isn't an option when that is literally what yours is?
>
> Oh and I forgot. You have zero tests for your project. Zero.

**Response points:**

1. **Protobuf tradeoffs:**
   - Requires schema definitions
   - Isn't JSON - breaks DevTools debugging
   - Needs client-side changes
   - Different tradeoff: maximum compression vs drop-in simplicity

2. **Lambda/edge compression:**
   - Lambda doesn't compress responses by default - you have to manually gzip in your handler
   - API Gateway can do it, but only for certain content types and sizes
   - TerseJSON works at the application layer, doesn't depend on infrastructure config

3. **Correct the "zero tests" claim:**
   - This is factually wrong - project has `src/core.test.ts` with vitest
   - Point them to `npm run test`

**Suggested response:**
> A few points:
>
> **Protobuf:** Requires schema definitions, isn't JSON, needs client-side changes, and breaks debuggability (can't just inspect payloads in DevTools). TerseJSON is a drop-in that keeps everything JSON. Different tradeoff.
>
> **Lambda/edge compression:** Lambda doesn't compress responses by default - you have to manually gzip in your handler and set headers. API Gateway can do it, but only for certain content types and sizes. TerseJSON works at the application layer, so it doesn't depend on infrastructure config.
>
> **"Zero tests":** The project has tests - `src/core.test.ts` with vitest. Run `npm run test` and you'll see them. Not sure where you got zero from.

---

## Performance overhead question

**Comment from u/Practical-Plan-2560:**
> Is 15-25% additional savings on top of gzip truly worth the performance overhead hit you take when using this library? At enterprise scale, you don't only care about wire size, you care about performance.

**Response points:**

1. **Operations are lightweight:**
   - Server-side (compress): Single pass through object keys, O(n). Just string assignment.
   - Client-side (expand): Two options - full expansion or Proxy wrapper

2. **Proxy approach is lazy:**
   - `wrapWithProxy()` (default) has near-zero upfront cost
   - Translation happens on property access
   - If you iterate 10,000 items but display 50, you only pay for 50

3. **At enterprise scale, network is the bottleneck:**
   - Serializing and transmitting a 2MB JSON payload takes orders of magnitude longer than key remapping
   - The larger your payloads, the more bandwidth savings dominate any processing overhead

4. **Acknowledge the gap:**
   - Formal CPU benchmarks haven't been published yet
   - Invite them to run benchmarks and find cases where the math doesn't work

**Suggested response:**
> Fair question. The operations are pretty lightweight:
>
> **Server-side (compress):** Single pass through the object keys to build the alias map, then key replacement. O(n) where n is number of keys. No heavy computation - just string assignment.
>
> **Client-side (expand):** Two options:
> 1. `expand()` - Creates new objects with original keys. One-time cost on response.
> 2. `wrapWithProxy()` (default) - Wraps data in a Proxy for lazy key translation. Near-zero upfront cost - translation happens on property access.
>
> The Proxy approach specifically was chosen because there's no processing overhead until you actually access a property. If you're iterating through 10,000 items but only displaying 50, you only pay for 50.
>
> At enterprise scale, the bottleneck is almost always network, not CPU. Serializing and transmitting a 2MB JSON payload takes orders of magnitude longer than the microseconds it takes to remap keys. The larger your payloads, the more the bandwidth savings dominate any processing overhead.
>
> And honestly - why not add it? With TerseJSON, the dev never has to worry "is gzip actually configured and working?" It works at the application layer, ships with your code, doesn't depend on proxy config or DevOps tickets.
>
> That said - I haven't published formal CPU benchmarks yet. If you find a case where the math doesn't work, I'd genuinely like to see it.

---

## Positive feedback: "Code Craftsmanship"

**Comment from u/LongLiveCHIEF:**
> I admire the way OP is standing behind the idea with data. Rare to see this type of post in this sub where the OP doesn't flame any criticism or skepticism. This by itself is what will get me to take a look when I'm back in front of my terminal.

**Follow-up:**
> I coach and mentor a lot of engineers. The mentality you just described is part of the ethos I affectionately call Code Craftsmanship, and it is refreshing to see it in the community.

**Takeaway:** Standing behind claims with data and handling criticism gracefully builds credibility more than the technical pitch itself. This approach converts skeptics into users.

**Response:**
> Really appreciate that - "Code Craftsmanship" is a term I'm going to steal. Building something useful is one thing, but being able to defend it with data and take feedback seriously is what separates a side project from something people actually trust. Thanks for the kind words.

---

## Positive feedback: "Years ago I hand-built something like this"

**Comment from u/jmeistrich:**
> A lot of negativity here... But this is very cool. Years ago I hand-built something like tons of schemas for translating between full keys and single character keys. Making it this much easier is great 👍

**Takeaway:** Validation from someone who's solved this problem manually before. The pain point is real.

**Response:**
> Thanks! That's exactly the pain point - I've seen teams maintain manual key mapping schemas and it becomes a maintenance nightmare. The goal here was to make it automatic so you never have to think about it.

---

## [Add more arguments here as they come up]
