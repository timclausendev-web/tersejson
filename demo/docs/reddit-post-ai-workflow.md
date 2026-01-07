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
- TypeScript, strict mode
- Testing: vitest
- Build: tsup
- Always write tests before implementation
- Never use `any` type
- Follow existing patterns in codebase
```

The AI reads this on every interaction. No more explaining your stack repeatedly.

**2. MCP Servers (Model Context Protocol)**

Custom tools that give AI access to:
- Your database schema
- API documentation
- Internal libraries
- Deployment configs
- Project-specific commands

Instead of copy-pasting docs, the AI can query them directly.

**3. Plan Mode**

Before writing code:
```
"I want to add feature X. Enter plan mode.
- Read the existing implementation in /src/core.ts
- Check how similar features are structured
- Propose an implementation plan
- Wait for my approval before coding"
```

The AI explores your codebase, understands patterns, proposes approach. You review. THEN it codes.

**4. Specs, Not Wishes**

```
Amateur: "Make the button look better"

Professional: "Change the submit button:
- Use our design system's primary variant
- Add loading state with spinner from /components/Spinner
- Disable during form submission
- Match the pattern in LoginForm.tsx"
```

Specific inputs = specific outputs.

**5. Iterative Refinement**

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

Using this workflow, I built:
- npm library with 100+ tests
- Full TypeScript coverage
- Express middleware + client SDK
- Framework integrations (React Query, Axios, Angular)
- Documentation and benchmarks

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
