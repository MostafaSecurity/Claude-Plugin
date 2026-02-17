---
name: save-progress
description: This skill should be used when the user asks to "save progress", "end session", "wrap up", "save state", "I'm done for now", "log progress", or is about to end their session. It analyzes recent work and writes a session entry to .product/progress.md.
version: 0.2.0
---

# Save Progress — Session State Persistence

Analyze what was accomplished in the current session and write a structured entry to `.product/progress.md` so the next session (or teammate) can pick up seamlessly.

## Process

### Step 1: Analyze Current State

Gather information from multiple sources:

**Git state:**
```bash
git branch --show-current
git log --oneline -10        # Recent commits this session
git diff --stat              # Uncommitted changes
git status --short           # Untracked/modified files
```

**Changed files:**
```bash
git diff --name-only HEAD~5..HEAD   # Files changed in recent commits
```

Categorize changes:
- Domain layer changes (`src/domain/`)
- Infrastructure changes (`src/infra/`)
- API changes (`src/api/`)
- UI changes (`src/ui/`, `src/pages/`)
- Test changes (`__tests__/`, `e2e/`)
- Documentation changes (`.product/`)

### Step 2: Determine Phase

Based on what was worked on:

- **Discovery** — Primarily `.product/` files, requirements gathering
- **Development** — Source code in `src/` directories
- **Testing** — Test files, coverage improvements
- **Shipping** — Deployment configs, CI/CD, git operations

### Step 3: Write Session Entry

Read existing `.product/progress.md` and prepend a new entry at the top of the Session Log section.

**Entry format:**

```markdown
### [TODAY'S DATE] — Session N

**Accomplished:**
- [Specific items with file paths, e.g., "Implemented createOrder use case (src/domain/use-cases/createOrder.ts)"]
- [Include commit messages if they're descriptive]
- [Mention deployment URLs if any deployments happened]

**In Progress:**
- [Specific remaining work, e.g., "Integration tests for order routes (needs mock database setup)"]
- [Uncommitted changes and what they represent]

**Blockers:**
- [Anything preventing progress, e.g., "API key for payment gateway not configured"]
- [Failed tests with brief description]
- [Missing dependencies or approvals]

**Next Steps:**
1. [Highest priority action for next session]
2. [Second priority]
3. [Third priority]

**Technical Notes:**
- [Architecture decisions made during this session]
- [Gotchas or issues the next person should know about]
- [Environment or config changes needed]
```

### Step 4: Update Current State Header

Update the "Current State" section at the top of `progress.md`:

```markdown
## Current State

- **Phase:** [Updated phase]
- **Active Use Case:** [Current UC number and name]
- **Active Branch:** [Current git branch]
- **Last Session:** [Today's date]
```

### Step 5: Update Backlog Statuses

Read `.product/backlog.md` and update statuses for items that changed:

- If a use case was implemented → update to "In Progress" or "In Testing"
- If tests were written and pass → update to "In Testing" or "In Review"
- If deployed → update to "Done"
- If blocked → update to "Blocked" with a note

### Step 6: Trim Old Entries

Keep the last **10 session entries** in `progress.md`. If there are more than 10, remove the oldest entries from the bottom of the Session Log section.

### Step 7: Update Codebase Snapshot

If `.product/codebase-snapshot.md` exists, refresh the hashes so the next `/resume` can do a fast cache check:

```bash
# Update source structure hash
find src/ app/ pages/ lib/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) 2>/dev/null | sort | md5sum | cut -d' ' -f1

# Update dependency hash
md5sum package-lock.json 2>/dev/null | cut -d' ' -f1

# Update schema hash
md5sum prisma/schema.prisma 2>/dev/null | cut -d' ' -f1

# Update config hash
cat package.json tsconfig.json 2>/dev/null | md5sum | cut -d' ' -f1

# Update commit reference
git rev-parse HEAD
```

Write updated hashes to `.product/codebase-snapshot.md`. This takes < 1 second and saves thousands of tokens on the next `/resume`.

If `codebase-snapshot.md` doesn't exist, skip this step (it's only for projects that have run `/analyze-codebase`).

### Step 8: Confirm Save

Show the user what was recorded:

```
Progress saved:

Session: [date] — Session N
Phase: [phase]
Branch: [branch]
Items accomplished: [count]
Items in progress: [count]
Blockers: [count]
Cache: updated (next /resume will be fast)

The next session can run /resume to load this context.
```

## Edge Cases

- **No `.product/` directory:** Suggest `/init-project` first
- **No git repo:** Record what's possible without git state, warn the user
- **No changes detected:** Ask the user what they worked on (might have been research or planning)
- **Merge/rebase in progress:** Note this as a blocker in the session entry
