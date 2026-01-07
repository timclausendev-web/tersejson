# Reddit Post - AI Development Workflow

## Title Options:

**Option A (Confrontational):**
```
The devs dismissing AI are using it wrong. Here's the difference between amateur prompting and professional AI-augmented development.
```

**Option B (Educational):**
```
"AI code is garbage" - It is if you prompt like this. Here's how senior devs actually use it.
```

**Option C (Show don't tell):**
```
I built a production npm library with AI assistance. Here's the workflow that made it actually work.
```

**Option D (Curiosity):**
```
Why most developers fail with AI coding assistants (and what actually works)
```

---

## Post Body:

---

Every thread about AI coding tools has the same comments:
- "AI code is garbage"
- "It just produces bugs"
- "Real devs don't need it"

I used to think the same. Then I learned the difference between **amateur prompting** and **professional AI-augmented development**.

### Amateur Prompting

```
"Create me an awesome website with all the bells and whistles"

"Make a cool dashboard"

"Build me an app like Instagram"
```

Result: Generic boilerplate, wrong assumptions, code that doesn't fit your stack.

**This is not how you use AI.**

### Professional AI-Augmented Development

**1. Context Files (CLAUDE.md / AGENTS.md)**

Every project has a markdown file that tells the AI:
- Project architecture and conventions
- Tech stack and versions
- Testing requirements
- Code style rules
- What NOT to do

```markdown
# CLAUDE.md

## Project: TerseJSON
- TypeScript, strict mode, no `any` types
- Node.js 20+ with native fetch
- MongoDB Atlas (self-hosted cluster) with native driver (NOT Mongoose)
- Testing: vitest with coverage > 80%
- Build: tsup, dual ESM/CJS output
- Auth: JWT with RS256, refresh tokens in httpOnly cookies
- API style: REST with consistent error format
- Never use ORMs - raw queries only
- Always write tests before implementation
- Use pnpm, not npm or yarn

## File Structure
- /src/core.ts - main logic
- /src/express.ts - middleware
- /src/client.ts - browser SDK

## Database
- Connection string in env.DATABASE_URL
- Always use transactions for multi-doc writes
- Index all query fields

## DON'T
- No Mongoose, no Prisma
- No Express body-parser (use built-in)
- No moment.js (use date-fns)
- No lodash (use native methods)
```

The AI reads this on every interaction. It knows your exact stack, your preferences, your anti-patterns.

**2. MCP Servers (Model Context Protocol)**

Custom tools that give AI direct access to your infrastructure:

```javascript
// Example: MongoDB MCP server
// AI can query your actual schema, not guess at it

mcp.tool("getCollectionSchema", async ({ collection }) => {
  const sample = await db.collection(collection).findOne();
  const indexes = await db.collection(collection).indexes();
  return { fields: Object.keys(sample), indexes };
});

mcp.tool("runAggregation", async ({ collection, pipeline }) => {
  return await db.collection(collection).aggregate(pipeline).toArray();
});
```

Real MCPs I use:
- **Database MCP** - Query MongoDB schema, run aggregations, check indexes
- **Playwright MCP** - AI can actually see and interact with the running app
- **Git MCP** - Check branch status, diff, blame without copy-pasting
- **Docker MCP** - Container status, logs, restart services
- **Sentry MCP** - Pull actual error traces into context

Instead of "here's my schema" copy-paste, the AI queries it directly and stays in sync.

**3. Context is Everything**

The AI can only work with what it sees. Professional workflows maximize context:

- **Highlight code in VS Code** → AI sees exactly what you're referring to
- **Share error messages** → Full stack trace, not "it doesn't work"
- **Reference specific files** → "Look at src/utils/auth.ts lines 45-60"
- **Share screenshots** → UI bugs, design specs, error states

```
Amateur: "The login is broken"

Professional: *highlights the auth function*
"This function throws on line 47 when the token is expired.
Here's the error: [paste full error].
Fix it to handle expired tokens gracefully like we do in refreshToken.ts"
```

The more context, the better the output.

**4. Plan Mode**

Before writing code:
```
"I want to add feature X. Enter plan mode.
- Read the existing implementation in /src/core.ts
- Check how similar features are structured
- Propose an implementation plan
- Wait for my approval before coding"
```

The AI explores your codebase, understands patterns, proposes approach. You review. THEN it codes.

**5. Specs, Not Wishes**

```
Amateur: "Add user search to the API"

Professional: "Add GET /api/users/search endpoint:
- Query param: ?q=<search term>
- Search fields: email, firstName, lastName (case-insensitive)
- Use MongoDB text index (already exists on users collection)
- Pagination: ?page=1&limit=20, return { users, total, pages }
- Auth: requireAuth middleware from /src/middleware/auth.ts
- Response format: match /api/users/:id pattern
- Add rate limiting: 30 req/min per user
- Test file: /src/routes/users.test.ts, follow existing patterns"
```

The more specific, the less back-and-forth.

```
Amateur: "The aggregation is slow"

Professional: "This MongoDB aggregation in /src/services/analytics.ts:42
takes 3s on 1M documents. Current pipeline: [paste pipeline]
- Add $match stage first to filter by date range
- Use $project before $group to reduce document size
- Check if we need an index on { userId: 1, createdAt: -1 }
- Target: <200ms for 30-day range"
```

Specific inputs = specific outputs.

**6. Iterative Refinement**

```
"Run the tests"
> 3 failing

"Fix the failing tests, don't change the test expectations"
> Fixed

"Now run the linter"
> 2 warnings

"Fix those warnings"
> Done

"Commit with message describing what changed"
```

Small, verifiable steps. Not "build me an app."

### The Real Workflow

```
1. Write specs in markdown
2. AI enters plan mode, explores codebase
3. AI proposes implementation
4. I review and adjust
5. AI implements in small chunks
6. Tests run after each change
7. I review diff before commit
8. AI writes commit message
```

This is collaborative development, not "AI write my code."

### Results

Using this workflow, I built and shipped:
- npm library with 100+ tests, 90%+ coverage
- TypeScript strict mode, zero `any` types
- Express middleware with 0 dependencies
- Client SDK with Proxy-based lazy expansion
- Framework integrations (React Query, SWR, Axios, Angular, jQuery)
- MongoDB-style aggregation pipeline for nested compression
- Full GraphQL support (Apollo Client + express-graphql)
- Memory benchmarks showing 70% RAM reduction
- Deployed to production handling 10K+ requests/day

Tech stack: Node 20, native MongoDB driver, vitest, tsup, pnpm.

**The AI didn't replace my skills - it amplified them.**

I still make architecture decisions. I still review every line. I still debug when things break. But I ship 5x faster because I'm not typing boilerplate.

### The Mindset Shift

**Wrong:** "AI, build me a thing"
**Right:** "AI, you're a junior dev on my team. Here's the codebase context, here's the spec, here's the plan. Execute step 1."

The developers dismissing AI are the same ones who dismissed:
- Stack Overflow ("just read the docs")
- IDEs with autocomplete ("real devs use vim")
- TypeScript ("just write better JavaScript")

Tools make you faster. Learning to use them well is a skill.

---

### FAQ / Comment Responses:

**"This is just good prompting, not AI skill"**
> Exactly. The skill is knowing how to direct the tool effectively. Same as knowing how to Google, how to read docs, how to use your IDE.

**"AI still makes mistakes"**
> So do humans. That's why we have tests, code review, and iterative development. The workflow catches mistakes.

**"You're just dependent on AI now"**
> I'm dependent on my IDE, my debugger, my test framework, and Stack Overflow too. Tools are tools.

**"What about understanding the code?"**
> I review every line before commit. I understand it because I specified it and verified it. The AI is typing, I'm thinking.

**"Real senior devs don't need this"**
> Real senior devs use every tool that makes them more effective. Ego about not using tools is junior behavior.

---

## Subreddit Targets:

1. **r/ExperiencedDevs** - Senior audience, professional workflow focus
2. **r/programming** - Broad reach, controversial topic drives engagement
3. **r/webdev** - Practical workflow angle
4. **r/ChatGPT** or **r/ClaudeAI** - Audience already interested in AI

---

## Timing:

This is a spicy take. Post Tuesday-Thursday 9-11am EST for maximum engagement.

Expect controversy but also support from devs who quietly use AI effectively.

---

## Key Points to Emphasize:

1. **Context files** - CLAUDE.md makes AI useful
2. **Plan mode** - Think before code
3. **Specs not wishes** - Garbage in, garbage out
4. **Iterative steps** - Small verifiable chunks
5. **Human review** - AI types, you think

The goal: Shift perception from "AI replaces devs" to "AI amplifies devs who know how to use it"
