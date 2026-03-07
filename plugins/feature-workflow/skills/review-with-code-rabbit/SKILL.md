---
name: review-with-code-rabbit
description: This skill should be used when the user asks to "review code", "code rabbit review", "coderabbit review", "review with code rabbit", "review my changes", "AI code review", "review latest changes", "check my code", or wants an AI-powered code review on their latest changes. Works on all platforms. Tracks reviewed state so only new changes are reviewed each time.
version: 0.3.0
---

# Review with CodeRabbit — AI Code Review

Review code changes directly using Claude. Works on all platforms (Windows, macOS, Linux). Tracks what has been reviewed so only new changes get reviewed each time.

## Process

### Step 1: Collect Changes

Detect what needs to be reviewed:

```bash
# Check for uncommitted changes
git status --porcelain

# Check for unpushed commits
git log @{u}..HEAD --oneline 2>/dev/null

# Check last reviewed commit from tracking file
cat .product/coderabbit-reviews.md 2>/dev/null
```

**Decision logic:**

| Priority | Condition | What to diff |
|----------|-----------|-------------|
| 1 | Uncommitted + unpushed commits | `git diff @{u}` (everything) |
| 2 | Uncommitted changes only | `git diff HEAD` |
| 3 | Unpushed commits only | `git diff @{u}..HEAD` |
| 4 | Changes since last review | `git diff <last-reviewed-hash>..HEAD` |
| 5 | First review (no tracking file) | Read key source files directly |
| 6 | Nothing changed | Tell user "No new changes to review" |

### Step 2: Get the Diff

```bash
# Get the diff based on Step 1
git diff <appropriate range>

# Get stats
git diff <appropriate range> --stat

# Get list of changed files
git diff <appropriate range> --name-only
```

If the diff is very large (>100 files), warn the user and suggest reviewing in batches.

### Step 3: Review the Code

Read the diff and review it covering these areas:

#### Security
- SQL injection, XSS, command injection, path traversal
- Hardcoded secrets, API keys, passwords
- Missing input validation at system boundaries
- Insecure authentication or authorization patterns

#### Bugs & Logic Errors
- Off-by-one errors, null/undefined access
- Race conditions in async code
- Missing error handling for I/O operations
- Incorrect conditional logic, unreachable code

#### Performance
- N+1 queries, unnecessary loops
- Missing pagination for large data sets
- Memory leaks (unclosed streams, event listeners)
- Unnecessary re-renders (React) or rebuilds (Flutter)

#### Architecture & Patterns
- Violations of existing project conventions
- Breaking changes to public APIs
- Missing or incorrect TypeScript types
- Import cycle risks

#### Testing
- Missing tests for new logic
- Tests that don't actually assert anything meaningful
- Flaky test patterns (timing, order-dependent)

### Step 4: Present Findings

Use this format:

```
## Code Review Summary

**Scope:** <what was reviewed>
**Files Reviewed:** <count>

### 🔴 Critical Issues (<count>)

#### [C1] <Issue title>
**File:** `<path>:<line>`
**Issue:** <description>
**Fix:**
\`\`\`suggestion
<suggested code fix>
\`\`\`

### 🟡 Warnings (<count>)

#### [W1] <Issue title>
**File:** `<path>:<line>`
**Issue:** <description>
**Fix:** <brief suggestion>

### 🟢 Suggestions (<count>)

#### [S1] <Issue title>
**File:** `<path>:<line>`
**Suggestion:** <description>

### ✅ What Looks Good
- <positive observation>

### Summary
- **Critical:** <count> | **Warnings:** <count> | **Suggestions:** <count>
- **Verdict:** PASS / PASS WITH WARNINGS / NEEDS FIXES
```

If no issues found, just say "Code looks clean" with a brief summary.

### Step 5: Update Tracking File

After review, create or update `.product/coderabbit-reviews.md`:

```bash
mkdir -p .product
```

**Format:**

```markdown
# Code Review Log

## Last Review State
- **Last Reviewed Commit:** `<hash>`
- **Timestamp:** <date time>
- **Files Reviewed:** <count>
- **Status:** ✅ Clean / ⚠️ Issues Found

## Review History

### <DATE> — Review
**Scope:** <description>
**Files Reviewed:** <count>
**Status:** <result>
**Summary:** <brief>
**Commit:** `<hash>`
```

Rules:
- Always update "Last Review State" at the top
- Prepend new entries to "Review History" (newest first)
- Keep max 20 entries

### Step 6: Offer Next Actions

After presenting the review:

1. **Fix issues** — "Want me to fix the critical issues?"
2. **Re-review** — "Run review again after fixes?"
3. **Continue** — "Proceed to `/test` or `/ship`?"

## Edge Cases

- **No git repo:** Tell user to run `git init`
- **No commits:** Tell user to make first commit
- **No changes at all:** "Nothing new to review"
- **Very large diff (>100 files):** Suggest reviewing in batches

## Integration

| After... | Suggest... |
|----------|-----------|
| `/develop` or `/develop-flutter` | → `/review-with-code-rabbit` |
| Review found issues | → Fix, then re-review |
| Review clean | → `/test` then `/ship` |
