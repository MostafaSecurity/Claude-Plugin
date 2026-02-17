---
name: resume
description: This skill should be used when the user asks to "resume", "continue", "pick up where I left off", "what was I working on", "session status", "where did we stop", or starts a new session and wants to load context from the previous session. It reads .product/progress.md and presents the current state. It uses cached analysis to minimize token usage.
version: 0.2.0
---

# Resume — Session Continuity

Load context from the previous session and present current project state. This is the first thing to run when starting a new session.

## Token Efficiency

This skill is **the most frequently called skill** and must be extremely token-efficient:

1. **Read cached `.product/` files first** — never re-read source code if cache exists
2. **Run incremental cache check** — compare snapshot hashes to detect changes
3. **Only load source files when the user picks a specific task** — not on initial resume
4. **Prefer summaries** — show feature names from `current-features.md`, not raw code

## Process

### Step 0: Cache Validation (Before Loading Anything)

If `.product/codebase-snapshot.md` exists, run a quick hash comparison:

```bash
# Compute current hashes (< 1 second)
CURRENT_SRC_HASH=$(find src/ app/ pages/ lib/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) 2>/dev/null | sort | md5sum | cut -d' ' -f1)
CURRENT_DEP_HASH=$(md5sum package-lock.json 2>/dev/null | cut -d' ' -f1)
CURRENT_SCHEMA_HASH=$(md5sum prisma/schema.prisma 2>/dev/null | cut -d' ' -f1)
```

Compare to stored hashes in `.product/codebase-snapshot.md`:

- **All match** → cache is fresh, proceed with cached context only
- **Some differ** → note which components changed, trigger incremental update of affected `.product/` files after presenting the resume summary
- **No snapshot exists** → suggest running `/analyze-codebase` for legacy projects, or skip for new projects

This step costs ~200 tokens and prevents ~5,000 tokens of unnecessary re-reading.

### Step 1: Read Project State

Read these files (skip any that don't exist):

1. **`.product/progress.md`** — Session log and current state
2. **`.product/backlog.md`** — Prioritized backlog with statuses
3. **`.product/architecture.md`** — Cached architecture understanding (if exists)
4. **`.product/current-features.md`** — Known features list (if exists)

**DO NOT read source files at this step.** The cached `.product/` files contain enough context.

If `.product/` directory doesn't exist:
- If source code exists → suggest `/analyze-codebase` then `/init-project`
- If no source code → suggest `/init-project` for a new project

### Step 2: Read Git State

Check the current git state:

```bash
git branch --show-current    # Current branch
git status --short           # Uncommitted changes
git log --oneline -5         # Recent commits
```

### Step 3: Present Session Summary

Display a formatted summary:

```
## Session Resume

### Last Session
- **Date:** [from progress.md]
- **Phase:** [Discovery | Development | Testing | Shipping]
- **Branch:** [from progress.md, verified with git]
- **What was accomplished:** [bullet points from last session entry]

### Currently In Progress
- [Items marked as in progress, with file paths]
- [Uncommitted changes from git status]

### Blockers
- [Any blockers noted in progress.md]
- [Failed tests or broken builds if detected]

### Backlog Snapshot
- [Top 3-5 items from backlog.md by priority]

### Suggested Next Step
Based on the current state, I recommend: [specific action]
```

### Step 4: Ask User Intent

After presenting the summary, ask:

> "Would you like to continue with [suggested next step], or work on something else?"

Options:
- Continue the suggested work
- Pick a different backlog item
- Spawn a team for a larger effort
- Run the PM agent for a product review
- Start a new feature with the BA agent

### Step 5: Load Context

Based on the user's choice:

- If continuing previous work: read the relevant source files and test files
- If starting something new: read the relevant use case from `user-roles.md`
- If spawning a team: help set up the team with appropriate agents

## Incremental Cache Update

After presenting the session summary, if Step 0 detected hash changes:

```
⚡ Codebase changes detected since last session:
  - Source structure: 3 files added
  - Dependencies: no changes
  - Database schema: 1 model updated

Updating cached analysis... (takes ~5 seconds)
```

Run a targeted incremental update of only the affected `.product/` analysis files. This keeps the cache current without a full re-scan.

## Edge Cases

- **No `.product/` directory:** If source code exists, suggest `/analyze-codebase` → `/init-project`. If no source, suggest `/init-project`
- **No `codebase-snapshot.md`:** This is either a new project or was initialized before caching. Suggest `/analyze-codebase` if the project has source code
- **Empty `progress.md`:** This is a fresh project — suggest starting with the BA agent
- **Branch mismatch:** If `progress.md` mentions a different branch than `git branch` shows, warn the user. Cache may be for a different branch — note this.
- **Stale progress:** If the last session is more than 7 days old, suggest running the PM agent for a full review
- **Stale cache:** If `codebase-snapshot.md` is older than 30 days, suggest running `/analyze-codebase` for a full refresh
