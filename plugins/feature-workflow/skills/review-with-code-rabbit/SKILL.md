---
name: review-with-code-rabbit
description: This skill should be used when the user asks to "review code", "code rabbit review", "coderabbit review", "review with code rabbit", "review my changes", "AI code review", "review latest changes", "check my code", or wants to run an AI-powered code review using CodeRabbit on their latest changes. It handles CLI setup, authentication, smart change detection, and tracks reviewed state so only new changes are reviewed each time. Works on Windows, macOS, and Linux.
version: 0.2.0
---

# Review with CodeRabbit — AI-Powered Code Review (Cross-Platform)

Run AI code reviews on your latest changes. Works on **all platforms** (Windows, macOS, Linux). Uses CodeRabbit CLI where available, falls back to Claude direct review on unsupported platforms.

## How It Works

This skill has two review paths:

| Platform | CodeRabbit CLI | Review Method |
|----------|---------------|---------------|
| **macOS** | ✅ Available | Path A: CodeRabbit CLI |
| **Linux** | ✅ Available | Path A: CodeRabbit CLI |
| **Windows** | ❌ Not available | Path B: Claude Direct Review |
| **Any OS** (CLI not installed) | ❌ Not installed | Path B: Claude Direct Review |

Both paths produce structured review output and update the tracking file (`.product/coderabbit-reviews.md`).

## Process

### Step 1: Run the Helper Script

The cross-platform helper script handles platform detection, git diff collection, and tracking.

```bash
node <plugin-path>/skills/review-with-code-rabbit/references/cr-review.mjs
```

**To find the plugin path**, check where the skill is installed:

```bash
# The script is bundled with this skill at:
# <marketplace-path>/plugins/feature-workflow/skills/review-with-code-rabbit/references/cr-review.mjs
```

Parse each JSON line from the script's output. The script will emit:

1. `{ phase: "init", os: "win32|darwin|linux", cwd: "..." }` — Platform info
2. `{ phase: "scope", type: "uncommitted|committed|all|none", description: "..." }` — What will be reviewed
3. `{ phase: "cli_check", available: true|false, version: "...", os: "..." }` — CodeRabbit CLI status
4. Then either **Path A** or **Path B** output

### Step 2: Check Authentication (Path A Only)

If the script reports `cli_check.available = true`, CodeRabbit CLI is available.

**Check if authenticated:**

```bash
cr auth status
```

**If not authenticated**, ask the user:

> "I need your CodeRabbit API key to run the review. You can get one from https://app.coderabbit.ai/settings
> Please paste your API key."

After receiving the key, the user can either:

1. Set it as environment variable (persistent):
   ```bash
   # macOS/Linux — add to ~/.bashrc or ~/.zshrc
   export CODERABBIT_API_KEY="<key>"

   # Windows — add to system environment variables
   setx CODERABBIT_API_KEY "<key>"
   ```

2. Or pass it directly to the script:
   ```bash
   node cr-review.mjs --api-key <key>
   ```

**Important:** NEVER store the API key in any project file or commit it to git.

### Step 3A: CodeRabbit CLI Review (macOS/Linux)

If the script output includes `{ phase: "review_result", method: "coderabbit-cli", output: "..." }`:

1. The review was done by CodeRabbit CLI
2. Present the output to the user, organized by severity:
   - 🔴 **Critical** — Security vulnerabilities, data loss risks, race conditions
   - 🟡 **Warning** — Performance issues, potential bugs, bad practices
   - 🟢 **Suggestion** — Code style, readability improvements, optimizations
3. Include file paths and line numbers
4. The tracking file was already updated by the script

### Step 3B: Claude Direct Review (Windows / No CLI)

If the script output includes `{ phase: "review_data", method: "claude-direct", diff: "...", ... }`:

1. The CodeRabbit CLI is not available
2. The script has collected all the git diff data
3. **YOU (Claude) must now review the code directly**

**Parse the script output:**

- `diff` — The full git diff to review
- `files` — List of changed files
- `stat` — Diff stats (files changed, insertions, deletions)
- `recentLog` — Recent commit messages for context
- `projectContext` — CLAUDE.md content (if available)

**Perform a structured code review covering:**

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

**Output format — use this exact structure:**

```
## Code Review Summary

**Scope:** <scope description from script>
**Files Reviewed:** <count>
**Method:** Claude Direct Review

### 🔴 Critical Issues (<count>)

#### [C1] <Issue title>
**File:** `<path>:<line>`
**Issue:** <description>
**Fix:**
```suggestion
<suggested code fix>
```

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
- <positive observation about the code>

### Summary
- **Critical:** <count> | **Warnings:** <count> | **Suggestions:** <count>
- **Verdict:** <PASS / PASS WITH WARNINGS / NEEDS FIXES>
```

**After completing the review**, update the tracking file:

```bash
# Read the current tracking file
cat .product/coderabbit-reviews.md
```

Update it with the actual review results (replace "Pending Claude analysis" with the real summary).

### Step 4: Offer Next Actions

After presenting the review, ask the user:

1. **Fix issues** — "Would you like me to fix the critical issues?"
2. **Re-review** — "Run the review again after fixes?"
3. **Continue** — "Proceed to `/ship` or `/test`?"

## Smart Change Detection (Auto Mode)

When no `--type` flag is specified, the script auto-detects what to review:

```
┌─────────────────────────────────────────────┐
│ Uncommitted changes exist?                   │
│   YES + Unpushed commits? → Review ALL      │
│   YES + No unpushed?      → Review UNCOMMITTED│
│   NO                                         │
│     ├─ Unpushed commits?  → Review COMMITTED │
│     └─ No unpushed?                          │
│         ├─ Changes since last review?        │
│         │   → Review since last reviewed hash│
│         └─ No changes? → "Nothing to review" │
└─────────────────────────────────────────────┘
```

## Running with Specific Options

```bash
# Review only uncommitted changes
node cr-review.mjs --type uncommitted

# Review only committed changes
node cr-review.mjs --type committed

# Review everything
node cr-review.mjs --type all

# Review since a specific commit
node cr-review.mjs --base-commit abc1234

# Pass API key directly
node cr-review.mjs --api-key <key>
```

## Tracking File (`.product/coderabbit-reviews.md`)

The script automatically creates and updates this file. Format:

```markdown
# CodeRabbit Review Log

## Last Review State
- **Last Reviewed Commit:** `abc1234`
- **Timestamp:** 2026-03-07 14:30
- **Files Reviewed:** 12
- **Review Scope:** Uncommitted changes (5 files)
- **Review Method:** CodeRabbit CLI (v1.2.3) / Claude Direct Review
- **Status:** ✅ Clean / ⚠️ Issues Found

## Review History

### 2026-03-07 14:30 — Review
**Scope:** Uncommitted changes (5 files)
**Method:** Claude Direct Review
**Files Reviewed:** 5
**Status:** ⚠️ Issues Found
**Summary:** 1 critical, 2 warnings, 3 suggestions
**Commit at time of review:** `abc1234`
```

This file enables the "since last review" feature — each subsequent review only covers NEW changes.

## Edge Cases

### No Git Repository
```
⚠️ Not a git repository. Run `git init` first.
```

### No Commits Yet
```
⚠️ No commits yet. Make your first commit before running a review.
```

### Very Large Diff (>100 files)
Warn the user and suggest reviewing in batches:
```
⚠️ Large changeset: 150 files changed. Consider:
1. Reviewing one feature branch at a time
2. Using --type committed to review only committed changes
3. Reviewing specific directories
```

### Script Not Found
If the script path is not found, fall back to manual mode:
1. Detect platform with: `node -e "console.log(process.platform)"`
2. Collect diff manually with git commands
3. Follow Path B (Claude Direct Review) steps above

## Integration with Other Skills

| After this skill... | Suggest... |
|----|-----|
| `/develop` or `/develop-flutter` | → `/review-with-code-rabbit` |
| `/review-with-code-rabbit` (issues found) | → Fix issues, then re-review |
| `/review-with-code-rabbit` (clean) | → `/test` then `/ship` |
| `/test` | → `/review-with-code-rabbit` for non-test issues |
