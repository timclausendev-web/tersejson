# TerseJSON Monorepo Migration Plan

## Current State

```
~/projects/tersejson/           # NPM package (public git repo)
~/projects/tersejson-website/   # Website (private repo)
~/projects/tersejson/chrome-extension/  # Chrome ext (not yet moved)
```

## Target State

```
~/projects/tersejson/
├── packages/
│   ├── core/                   # NPM package (tersejson)
│   ├── website/                # tersejson.com
│   └── chrome-extension/       # DevTools extension
├── package.json                # Root workspaces config
├── pnpm-workspace.yaml
├── CLAUDE.md                   # Unified instructions
└── README.md                   # Project overview
```

## Benefits

1. **Local linking** - Chrome extension auto-links to core package
2. **Unified commands** - `pnpm -r build` builds everything
3. **Single clone** - One repo to rule them all
4. **Shared context** - One CLAUDE.md for AI assistance
5. **Atomic changes** - Update core + website docs in one commit

---

## Migration Steps

### Phase 1: Prepare the NPM Package Repo

Use existing `tersejson` repo as the base (preserves npm package git history).

```bash
cd ~/projects/tersejson

# Create packages directory
mkdir -p packages

# Move npm package contents to packages/core
# (keeping root-level config files for now)
```

### Phase 2: Restructure to packages/core

```bash
# Create the core package directory
mkdir -p packages/core

# Move source files
mv src/ packages/core/
mv dist/ packages/core/ 2>/dev/null || true
mv tsconfig.json packages/core/
mv tsup.config.ts packages/core/
mv vitest.config.ts packages/core/
mv package.json packages/core/

# Keep at root level:
# - .git/
# - .gitignore (will update)
# - LICENSE
# - node_modules/ (will regenerate)
```

### Phase 3: Create Root package.json

```json
{
  "name": "tersejson-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev": "pnpm -r dev",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "pnpm": "^8.0.0"
  }
}
```

### Phase 4: Create pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
```

### Phase 5: Move Chrome Extension

```bash
# Move chrome extension to packages
mv chrome-extension packages/chrome-extension

# Update package.json name
# "name": "@tersejson/chrome-extension"
```

### Phase 6: Import Website

Option A - Copy files (lose website git history):
```bash
cp -r ~/projects/tersejson-website/* packages/website/
```

Option B - Git subtree (preserve history):
```bash
git subtree add --prefix=packages/website \
  git@github.com:youruser/tersejson-website.git main --squash
```

### Phase 7: Update Core package.json

```json
{
  "name": "tersejson",
  "version": "0.2.0",
  "description": "Transparent JSON key compression for Express APIs",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  ...
}
```

### Phase 8: Update Chrome Extension to Use Core

In `packages/chrome-extension/package.json`:
```json
{
  "name": "@tersejson/chrome-extension",
  "dependencies": {
    "tersejson": "workspace:*"
  }
}
```

Then update the build to copy from core or import directly.

### Phase 9: Create Unified CLAUDE.md

```markdown
# TerseJSON Monorepo

## Packages

- **packages/core** - NPM package (tersejson)
- **packages/website** - tersejson.com
- **packages/chrome-extension** - DevTools extension

## Commands

pnpm install          # Install all dependencies
pnpm -r build         # Build all packages
pnpm -r test          # Test all packages
pnpm --filter core build   # Build only core

## Publishing

cd packages/core && npm publish
```

### Phase 10: Install and Verify

```bash
# Install pnpm if needed
npm install -g pnpm

# Install all dependencies
pnpm install

# Verify everything works
pnpm -r build
pnpm -r test
```

---

## Package Dependencies

```
┌─────────────────────┐
│    tersejson        │  (core - npm package)
│    packages/core    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌──────────────┐
│ website │  │ chrome-ext   │
└─────────┘  └──────────────┘
```

---

## Rollback Plan

If anything goes wrong:
1. The original tersejson repo history is preserved
2. Website repo is untouched (we copied, not moved)
3. Chrome extension was never in a separate repo yet

---

## Post-Migration Cleanup

1. Archive old tersejson-website repo (or delete if using subtree)
2. Update GitHub repo description
3. Update npm package repository URL if needed
4. Update any CI/CD pipelines
