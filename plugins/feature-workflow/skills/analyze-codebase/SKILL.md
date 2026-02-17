---
name: analyze-codebase
description: This skill should be used when the user asks to "analyze this codebase", "understand this project", "scan this repo", "what does this project do", "onboard me", "legacy mode", "existing project", or opens a repository with existing source code but no .product/ directory. It performs a targeted, token-efficient scan of the project to build a cached understanding that all other skills use.
version: 0.1.0
---

# Analyze Codebase — Intelligent Project Understanding

Perform a targeted, incremental scan of an existing codebase to build a cached structural understanding. This is the entry point for **legacy/existing projects** that already have source code but no `.product/` infrastructure.

## Core Principles

### Token Efficiency Rules

1. **Never read entire files for structural analysis** — use file listings, `head`, and targeted `grep` instead of full file reads
2. **Read config files first** — `package.json`, `tsconfig.json`, `.env.example`, `Dockerfile` etc. contain 80% of the information in <5% of the tokens
3. **Cache everything** — write findings to `.product/` files so future sessions never re-analyze
4. **Diff-based updates** — after initial scan, only analyze files that changed since last scan
5. **Summaries over source** — store concise architectural summaries, not raw code

### What Triggers This Skill

This skill is automatically suggested when:
- A repository has source code but no `.product/` directory
- The user runs `/init-project` on a repo with existing code
- The user says "analyze", "understand", "onboard", or "scan"
- The `/resume` skill detects no `.product/progress.md`

## Process

### Step 1: Quick Structural Scan (< 30 seconds)

Read ONLY these high-signal files (never traverse the full tree):

```bash
# Project identity
cat package.json               # Node.js dependencies, scripts, name
cat pubspec.yaml               # Flutter/Dart dependencies (if Flutter project)
cat tsconfig.json              # TypeScript config (if exists)
cat analysis_options.yaml      # Dart analyzer config (if Flutter project)
cat .env.example               # Expected environment vars (if exists)

# Framework detection
ls src/ || ls app/ || ls pages/ || ls lib/    # Directory structure hint
ls lib/features/ lib/core/ lib/shared/ 2>/dev/null  # Flutter Clean Architecture hint
ls prisma/ || ls drizzle/                      # ORM detection
ls android/ ios/ web/ 2>/dev/null              # Flutter platform directories
ls Dockerfile || ls docker-compose.yml         # Container detection
ls vercel.json || ls netlify.toml || ls render.yaml  # Deploy config
ls .github/workflows/ || ls .gitlab-ci.yml     # CI/CD detection

# Dependency tree — Node.js (DO NOT read node_modules)
cat package.json | grep -A 50 '"dependencies"' 2>/dev/null
cat package.json | grep -A 20 '"devDependencies"' 2>/dev/null

# Dependency tree — Flutter/Dart (DO NOT read .dart_tool)
cat pubspec.yaml | grep -A 100 'dependencies:' 2>/dev/null

# Git history for project maturity
git log --oneline -20
git shortlog -sn --no-merges | head -10       # Top contributors
```

**DO NOT** at this stage:
- Read any source files in full
- Traverse `node_modules/`, `.git/`, `dist/`, `build/`
- Read test files
- Read documentation files

### Step 2: Detect Tech Stack

From Step 1 data, classify:

| Dimension | Detection Method | Examples |
|-----------|-----------------|----------|
| **Frontend** | `package.json` deps: react, next, vue, angular, svelte | Next.js 14, React 18 + Vite |
| **Flutter/Mobile** | `pubspec.yaml` deps: flutter, flutter_bloc, riverpod, provider | Flutter 3.x + BLoC |
| **Backend** | `package.json` deps: express, fastify, nest, hono, koa | Express 4.18, NestJS 10 |
| **Database** | `package.json` deps + config files: prisma, mongoose, drizzle, typeorm, knex, sequelize | PostgreSQL via Prisma, MongoDB via Mongoose |
| **ORM/Driver** | `prisma/schema.prisma` provider, mongoose import, drizzle config | Prisma (PostgreSQL), Mongoose |
| **State Mgmt (Flutter)** | `pubspec.yaml` deps: flutter_bloc, riverpod, provider, GetX | BLoC, Riverpod |
| **Test Framework** | `package.json` deps + config: vitest, jest, mocha, playwright, cypress; `pubspec.yaml`: flutter_test, bloc_test | Vitest + Playwright; flutter_test + bloc_test |
| **Deploy Target** | Config files: `vercel.json`, `Dockerfile`, `fly.toml`, `render.yaml`, `.github/workflows/`, `fastlane/` | Vercel + Docker (Cloud Run); Google Play + App Store |
| **Language** | `tsconfig.json` presence, file extensions; `pubspec.yaml` → Dart | TypeScript 5.3; Dart 3.x |
| **Package Manager** | Lockfile: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`; `pubspec.lock` | npm; Flutter pub |
| **Monorepo** | `pnpm-workspace.yaml`, `lerna.json`, `turbo.json`, `nx.json`; `melos.yaml` (Flutter) | Turborepo; Melos |

### Step 3: Map Architecture (Targeted Reads Only)

Based on detected framework, read ONLY the entry points and routing:

**For Express/Fastify backends:**
```bash
# Find entry point
grep -rl "app.listen\|createServer\|express()" src/ --include="*.ts" --include="*.js" -l | head -3

# Find route registration
grep -rn "app.use\|router\.\(get\|post\|put\|delete\)" src/ --include="*.ts" --include="*.js" | head -30

# Find middleware
grep -rn "app.use(" src/ --include="*.ts" --include="*.js" | head -15
```

**For Next.js/React frontends:**
```bash
# Page routes
ls -R app/ 2>/dev/null || ls -R pages/ 2>/dev/null | head -30

# API routes
ls -R app/api/ 2>/dev/null || ls -R pages/api/ 2>/dev/null | head -20
```

**For Flutter/Dart apps:**
```bash
# Entry point
head -30 lib/main.dart 2>/dev/null

# Feature modules
ls lib/features/ lib/modules/ lib/src/ 2>/dev/null | head -20

# State management pattern
grep -rn "class.*Bloc\b\|class.*Cubit\b\|class.*Notifier\b\|ChangeNotifierProvider\|ConsumerWidget\|BlocProvider" lib/ --include="*.dart" | head -15

# DI setup
grep -rn "GetIt\|get_it\|@injectable\|ProviderScope" lib/ --include="*.dart" | head -10

# Navigation
grep -rn "GoRouter\|MaterialApp.router\|AutoRouter\|@AutoRouterConfig" lib/ --include="*.dart" | head -10

# API client
grep -rn "Dio\|http.Client\|@RestApi" lib/ --include="*.dart" | head -10
```

**For database schema:**
```bash
# Prisma — read the schema (this file IS worth reading fully, it's the data model)
cat prisma/schema.prisma

# Mongoose — find model definitions
grep -rn "new Schema\|mongoose.model" src/ --include="*.ts" --include="*.js" | head -20

# Drizzle/TypeORM — find entity/table definitions
grep -rn "pgTable\|mysqlTable\|@Entity" src/ --include="*.ts" --include="*.js" | head -20
```

**For deployment:**
```bash
# Dockerfile commands
head -20 Dockerfile 2>/dev/null

# CI/CD pipeline
head -40 .github/workflows/*.yml 2>/dev/null | head -60

# Deploy scripts in package.json
grep -E '"(deploy|build|start|dev)"' package.json
```

### Step 4: Detect Existing Features

Identify current feature modules WITHOUT reading implementation details:

```bash
# API endpoints = features
grep -rn "router\.\(get\|post\|put\|delete\|patch\)" src/ --include="*.ts" --include="*.js" | \
  sed 's/.*router\.\(get\|post\|put\|delete\|patch\)(\(.*\)/\1 \2/' | head -40

# Page routes = UI features
find app/ pages/ src/pages/ src/ui/pages/ -name "*.tsx" -o -name "*.jsx" 2>/dev/null | head -30

# Database models = domain entities
grep -rn "model \|@Entity\|new Schema\|pgTable" prisma/ src/ --include="*.ts" --include="*.prisma" | head -20
```

**For Flutter apps — screens, BLoCs, models:**
```bash
# Screens/pages
find lib/ -name "*_page.dart" -o -name "*_screen.dart" -o -name "*_view.dart" 2>/dev/null | head -20

# State management (BLoCs/Cubits/Notifiers)
find lib/ -name "*_bloc.dart" -o -name "*_cubit.dart" -o -name "*_notifier.dart" -o -name "*_provider.dart" 2>/dev/null | head -20

# Domain entities and models
find lib/ -name "*_entity.dart" -o -name "*_model.dart" 2>/dev/null | head -20

# Use cases
find lib/ -name "*.dart" -path "*/usecases/*" -o -name "*.dart" -path "*/use_cases/*" 2>/dev/null | head -20

# Repositories
find lib/ -name "*_repository.dart" -o -name "*_repository_impl.dart" 2>/dev/null | head -20
```

List features as a concise table, NOT detailed descriptions:

```
| Feature | Type | Entry Point |
|---------|------|-------------|
| User Auth | API + UI | src/api/routes/auth.ts, app/login/page.tsx |
| Orders | CRUD API | src/api/routes/orders.ts |
| Dashboard | UI Page | app/dashboard/page.tsx |
```

### Step 5: Identify Technical Debt Signals

Scan for common debt indicators (pattern-match only, no deep reads):

```bash
# TODO/FIXME/HACK comments
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|WORKAROUND" src/ --include="*.ts" --include="*.tsx" --include="*.js" | wc -l

# Any files > 500 lines (complexity smell)
find src/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs wc -l 2>/dev/null | sort -rn | head -10

# Dependency vulnerabilities
npm audit --production 2>/dev/null | tail -5

# Outdated dependencies count
npm outdated 2>/dev/null | wc -l

# Test coverage gaps
find src/ -name "*.ts" -o -name "*.tsx" | wc -l    # Total source files
find src/ -name "*.test.*" -o -name "*.spec.*" | wc -l  # Test files
```

### Step 6: Generate Snapshot Hash

Create a fingerprint of the codebase state for cache invalidation:

```bash
# File structure hash (detects added/removed files)
find src/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | sort | md5sum
find lib/ -name "*.dart" 2>/dev/null | sort | md5sum   # Flutter/Dart projects

# Dependency hash (detects package changes)
md5sum package-lock.json 2>/dev/null || md5sum yarn.lock 2>/dev/null || echo "no-node-lockfile"
md5sum pubspec.lock 2>/dev/null || echo "no-pubspec-lock"   # Flutter/Dart projects

# Schema hash (detects data model changes)
md5sum prisma/schema.prisma 2>/dev/null || echo "no-prisma-schema"

# Config hash (detects infra changes)
cat package.json tsconfig.json 2>/dev/null | md5sum
cat pubspec.yaml analysis_options.yaml 2>/dev/null | md5sum   # Flutter/Dart projects
```

Store these hashes in `.product/codebase-snapshot.md` for future diff-based updates.

### Step 7: Write Cached Analysis Files

Generate the following files in `.product/`:

#### `.product/architecture.md`

```markdown
# Architecture — {{PROJECT_NAME}}

> Auto-generated by /analyze-codebase on {{DATE}}. Do not edit manually.
> Re-run /analyze-codebase to update, or it will auto-update on /resume if changes detected.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | {{FRAMEWORK}} | {{VERSION}} |
| Backend | {{FRAMEWORK}} | {{VERSION}} |
| Database | {{DB}} | via {{ORM}} |
| Testing | {{TEST_FRAMEWORK}} | {{VERSION}} |
| Deploy | {{DEPLOY_TARGET}} | — |
| Language | {{LANGUAGE}} | {{VERSION}} |
| Package Manager | {{PM}} | — |

## Directory Structure

```
{{CONCISE_TREE — max 25 lines}}
```

## Architecture Pattern

{{PATTERN_DESCRIPTION — e.g., "Clean Architecture with domain/infra/api separation" or "Next.js App Router with server actions" or "Monolithic Express with route-based modules"}}

## Import/Dependency Flow

{{CONCISE_FLOW — e.g., "UI → API routes → Services → Repositories → Database"}}

## Entry Points

| Type | File |
|------|------|
| Server | {{FILE}} |
| Frontend | {{FILE}} |
| Database | {{FILE}} |

## Key Configuration

| Config | File | Notes |
|--------|------|-------|
| TypeScript | tsconfig.json | {{BRIEF_NOTES}} |
| Database | {{FILE}} | {{BRIEF_NOTES}} |
| Build | {{FILE}} | {{BRIEF_NOTES}} |
| Deploy | {{FILE}} | {{BRIEF_NOTES}} |
```

#### `.product/current-features.md`

```markdown
# Current Features — {{PROJECT_NAME}}

> Auto-generated by /analyze-codebase on {{DATE}}.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
{{DETECTED_ENDPOINTS}}

## UI Pages/Routes

| Route | Component | Description |
|-------|-----------|-------------|
{{DETECTED_PAGES}}

## Database Models

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
{{DETECTED_MODELS}}

## External Integrations

| Service | Purpose | Config Location |
|---------|---------|-----------------|
{{DETECTED_INTEGRATIONS}}
```

#### `.product/technical-debt.md`

```markdown
# Technical Debt — {{PROJECT_NAME}}

> Auto-generated by /analyze-codebase on {{DATE}}.

## Summary

- **TODO/FIXME comments:** {{COUNT}}
- **Source files without tests:** {{COUNT}} / {{TOTAL}} ({{PERCENTAGE}}%)
- **Files over 500 lines:** {{COUNT}}
- **Vulnerable dependencies:** {{COUNT}}
- **Outdated dependencies:** {{COUNT}}

## Large Files (Complexity Signals)

| File | Lines | Notes |
|------|-------|-------|
{{TOP_10_LARGEST_FILES}}

## Missing Test Coverage

| Source File | Has Tests? |
|-------------|-----------|
{{UNTESTED_FILES — only show files WITHOUT matching test files}}

## Dependency Issues

{{NPM_AUDIT_SUMMARY — max 10 lines}}
```

#### `.product/deployment-status.md`

```markdown
# Deployment Status — {{PROJECT_NAME}}

> Auto-generated by /analyze-codebase on {{DATE}}.

## Detected Infrastructure

| Component | Platform | Config File | Status |
|-----------|----------|-------------|--------|
| Frontend | {{PLATFORM}} | {{FILE}} | {{STATUS}} |
| Backend | {{PLATFORM}} | {{FILE}} | {{STATUS}} |
| Database | {{PLATFORM}} | {{FILE}} | {{STATUS}} |
| CI/CD | {{PLATFORM}} | {{FILE}} | {{STATUS}} |

## Environment Variables

| Variable | Set in .env? | Required By |
|----------|-------------|-------------|
{{DETECTED_ENV_VARS}}

## Build Commands

```bash
# Dev
{{DEV_COMMAND}}

# Build
{{BUILD_COMMAND}}

# Start
{{START_COMMAND}}

# Test
{{TEST_COMMAND}}
```

## Health Check

| Endpoint | Expected |
|----------|----------|
| {{HEALTH_ENDPOINT}} | 200 OK |
```

#### `.product/codebase-snapshot.md`

```markdown
# Codebase Snapshot — {{PROJECT_NAME}}

> Cache fingerprint for incremental analysis. Used by /resume and /analyze-codebase to detect changes.

## Last Full Scan

- **Date:** {{DATE}}
- **Commit:** {{COMMIT_HASH}}
- **Branch:** {{BRANCH}}

## Hashes

| Component | Hash | File Count |
|-----------|------|-----------|
| Source structure | {{HASH}} | {{COUNT}} files |
| Dependencies | {{HASH}} | — |
| Database schema | {{HASH}} | — |
| Config files | {{HASH}} | — |

## File Manifest

{{SORTED_LIST_OF_SOURCE_FILES_WITH_LINE_COUNTS — for diff detection}}
```

### Step 8: Present Summary

Show the user a concise overview:

```
Codebase Analysis Complete:

  Project: {{NAME}} ({{LANGUAGE}})
  Stack: {{FRONTEND}} + {{BACKEND}} + {{DATABASE}} ({{ORM}})
  Features: {{COUNT}} API endpoints, {{COUNT}} UI pages, {{COUNT}} DB models
  Tests: {{COUNT}} test files ({{COVERAGE_PERCENTAGE}}% of source files covered)
  Deploy: {{DEPLOY_TARGET}}
  Debt: {{TODO_COUNT}} TODOs, {{LARGE_FILE_COUNT}} large files, {{VULN_COUNT}} vulnerabilities

  Generated:
    .product/architecture.md
    .product/current-features.md
    .product/technical-debt.md
    .product/deployment-status.md
    .product/codebase-snapshot.md

  Next steps:
    1. Review .product/architecture.md for accuracy
    2. Run /init-project to add team infrastructure (agents, backlog, decisions)
    3. Run /resume to start working with cached context
```

## Incremental Update Mode

When this skill is re-run (or triggered by `/resume`), it operates in **diff mode**:

### Detect Changes

```bash
# Compare current hashes to .product/codebase-snapshot.md
# Only re-analyze components whose hashes changed
```

| What Changed | What to Re-analyze |
|-------------|-------------------|
| Source structure hash | Re-scan features list and architecture |
| Dependency hash | Re-check tech stack versions and vulnerabilities |
| Schema hash | Re-scan database models |
| Config hash | Re-check deployment and build config |
| Nothing changed | Skip analysis entirely, report "Cache is current" |

### Update Rules

- **Append** new features to `current-features.md`, don't regenerate from scratch
- **Update** changed sections in `architecture.md`, preserve manual annotations
- **Refresh** `technical-debt.md` counters (these are cheap to recount)
- **Always update** `codebase-snapshot.md` hashes

## Integration with Other Skills

| Skill | How It Uses Cached Analysis |
|-------|---------------------------|
| `/init-project` | Pre-fills stack choices from detected tech |
| `/resume` | Loads architecture.md instead of re-reading source files |
| `/use-case` | Reads current-features.md to understand existing domain |
| `/develop` | Reads architecture.md for conventions, avoids conflicting patterns |
| `/test` | Reads current-features.md to find untested features |
| `/deploy` | Reads deployment-status.md instead of re-detecting infra |
| `/ship` | Reads deployment-status.md for deploy targets |
| `/setup-infra` | Reads architecture.md for stack-specific tool checks |

## Additional Resources

### Reference Files

- **`references/codebase-snapshot-format.md`** — Specification for the codebase snapshot cache format, hash computation, and diff detection rules
