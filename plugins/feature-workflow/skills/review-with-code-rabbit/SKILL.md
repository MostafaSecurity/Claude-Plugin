---
name: review-with-code-rabbit
description: This skill should be used when the user asks to "review code", "code rabbit review", "coderabbit review", "review with code rabbit", "review my changes", "AI code review", "review latest changes", "check my code", or wants to run an AI-powered code review using CodeRabbit on their latest changes. It handles CLI setup, authentication, smart change detection, and tracks reviewed state so only new changes are reviewed each time.
version: 0.1.0
---

# Review with CodeRabbit — AI-Powered Code Review

Run AI code reviews on your latest changes using CodeRabbit CLI. Handles uncommitted changes, unpushed commits, and tracks what has been reviewed so you only see feedback on new work.

## Process

### Step 1: Check CodeRabbit CLI Installation

```bash
cr --version 2>/dev/null || coderabbit --version 2>/dev/null
```

If the command fails (CLI not installed):

**Install CodeRabbit CLI:**

```bash
# macOS / Linux
curl -fsSL https://cli.coderabbit.ai/install.sh | sh

# Windows (PowerShell)
powershell -Command "irm https://cli.coderabbit.ai/install.ps1 | iex"
```

After installation, verify:

```bash
cr --version
```

If installation fails, refer to `references/coderabbit-setup.md` for platform-specific troubleshooting.

### Step 2: Authenticate

Check current authentication status:

```bash
cr auth status
```

**If not authenticated:**

1. Ask the user: "Please provide your CodeRabbit API key. You can get one from https://app.coderabbit.ai/settings"
2. Once the user provides the key, authenticate:

```bash
cr auth login
```

This opens a browser for authentication. If the user prefers API key mode, they can use:

```bash
cr review --api-key <KEY>
```

**Important:** Never store the API key in any file. CodeRabbit CLI handles credential storage internally.

After successful authentication, note in the review log that auth is configured.

### Step 3: Detect Changes to Review

Run these checks in order to determine the review scope:

#### Check 1: Uncommitted changes

```bash
git status --porcelain
```

If output is not empty → there are uncommitted changes (staged + unstaged + untracked).

#### Check 2: Committed but not pushed

```bash
git log @{u}..HEAD --oneline 2>/dev/null
```

If output is not empty → there are local commits not yet pushed to remote.

If no upstream is set (command fails), check if there are any commits at all:

```bash
git log --oneline -5
```

#### Check 3: Changes since last review

Read `.product/coderabbit-reviews.md` if it exists:

```bash
cat .product/coderabbit-reviews.md 2>/dev/null
```

Extract the **Last Reviewed Commit** hash. Then check if there are new commits since:

```bash
git log <last-reviewed-hash>..HEAD --oneline
```

If output is not empty → there are changes since the last review.

#### Decision Matrix

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | Uncommitted changes exist | Review uncommitted changes |
| 2 | Unpushed commits exist | Review committed changes since last push |
| 3 | New commits since last review | Review changes since last reviewed commit |
| 4 | None of the above | Tell user "No new changes to review" and stop |

**Note:** If both uncommitted AND unpushed commits exist, review ALL changes (uncommitted + committed) to give comprehensive feedback.

### Step 4: Run CodeRabbit Review

Based on the detected scope, run the appropriate review command:

**For uncommitted changes:**
```bash
cr review -t uncommitted --plain
```

**For committed but unpushed changes:**
```bash
cr review -t committed --plain
```

**For changes since last review (specific base commit):**
```bash
cr review -t committed --base-commit <last-reviewed-hash> --plain
```

**For all changes (uncommitted + committed):**
```bash
cr review -t all --plain
```

**Add project context if available:**

```bash
# If CLAUDE.md exists, pass it for better context
cr review -t <type> --plain -c CLAUDE.md
```

**After receiving the review output:**

1. Present the findings to the user in a clear, organized format
2. Group findings by severity (critical → warning → suggestion)
3. Include file paths and line numbers for each finding
4. If CodeRabbit suggests fixes, show the suggested code

### Step 5: Update Review Tracking File

After a successful review, create or update `.product/coderabbit-reviews.md`:

```bash
# Get current state
git rev-parse HEAD          # Current commit hash
git diff --stat             # Files changed (uncommitted)
git diff --cached --stat    # Files staged
```

**Create `.product/` directory if it doesn't exist:**

```bash
mkdir -p .product
```

**Write/update the tracking file with this format:**

```markdown
# CodeRabbit Review Log

## Last Review State
- **Last Reviewed Commit:** <current HEAD hash>
- **Timestamp:** <current date and time>
- **Files Reviewed:** <count>
- **Review Scope:** <uncommitted / committed / all / since-commit>
- **Status:** ✅ Clean / ⚠️ Issues Found

## Review History

### <DATE> — Review #N
**Scope:** <what was reviewed, e.g., "Uncommitted changes (5 files)" or "Commits abc123..def456 (3 commits, 8 files)">
**Findings:**
- <count> critical issues
- <count> warnings
- <count> suggestions
**Key Issues:**
- [Brief summary of important findings]
**Commit at time of review:** <hash>
```

**Rules for the tracking file:**
- Always update the "Last Review State" section at the top
- Prepend new review entries to the "Review History" section (newest first)
- Keep a maximum of 20 review entries (remove oldest if exceeded)
- If the user has uncommitted changes at review time, note the commit hash AND mention uncommitted changes were included

### Edge Cases

#### No Git Repository
If `git status` fails (not a git repo):
```
⚠️ This directory is not a git repository. CodeRabbit requires git to track changes.
Run `git init` to initialize a repository first.
```

#### Empty Repository (No Commits)
If `git log` fails (no commits yet):
```
⚠️ No commits found. Make your first commit before running a review.
```

#### No `.product/` Directory
If `.product/` doesn't exist, create it. This is the first review — review ALL current changes.

#### CodeRabbit CLI Errors
If `cr review` returns an error:
- Check if the API key is valid: `cr auth status`
- Check internet connectivity
- Check if the repo has files to review
- Suggest the user run `cr auth login` to re-authenticate

#### Large Changesets
If the diff is very large (>100 files changed):
- Warn the user: "Large changeset detected. Review may take longer."
- Suggest reviewing in smaller batches if possible

## Integration with Other Skills

- After `/develop` or `/develop-flutter` → suggest running `/review-with-code-rabbit`
- After `/test` → run review to catch non-test issues
- Before `/ship` → run review as a pre-flight check
- `/save-progress` → include last review status in session notes
