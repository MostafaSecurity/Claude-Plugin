---
name: connect-github
description: This skill should be used when the user asks to "connect GitHub", "setup GitHub", "authenticate GitHub", "gh auth", "GitHub login", "verify GitHub", "link repo", "setup remote", or wants to verify and configure GitHub authentication, repo access, and push/PR permissions.
version: 0.1.0
---

# Connect GitHub — Authentication & Repository Access

Verify GitHub authentication, ensure repository access, and enable PR creation and push permissions. This is a focused, single-purpose skill that can be run standalone or is invoked by `/setup-infra` and `/deploy` when GitHub access is needed.

## Core Principle

**Only request authentication when needed.** Check existing auth first. If everything works, confirm and exit quickly.

## Process

### Step 1: Check GitHub CLI

```bash
gh --version
```

- **If installed** → continue to Step 2
- **If not installed** → provide installation guide:

```
GitHub CLI is not installed. You need it for PR creation and repo management.

Install with:
  macOS:   brew install gh
  Windows: winget install --id GitHub.cli
  Linux:   See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

After installing, run /connect-github again.
```

### Step 2: Verify Authentication

```bash
gh auth status
```

Parse the output to determine:
- **Authenticated** → extract username and scopes
- **Not authenticated** → proceed to Step 3
- **Token expired** → proceed to Step 3 with "Your GitHub session has expired" message

If authenticated, show:
```
GitHub: ✅ Authenticated
  Account: @username
  Protocol: HTTPS
  Scopes: repo, read:org
```

### Step 3: Authenticate (Only If Needed)

Ask the user: "GitHub CLI is not authenticated. Would you like to log in now?"

If yes, guide them through the preferred flow:

**Option A: Browser Login (Recommended)**
```bash
gh auth login --web
```
This opens a browser for OAuth — no tokens to copy/paste.

**Option B: Existing Token**
If the user already has a Personal Access Token:
```bash
gh auth login --with-token
```
Minimum required scopes: `repo`, `read:org`

**Option C: SSH**
```bash
gh auth login --git-protocol ssh
```

After authentication, re-verify with `gh auth status`.

### Step 4: Verify Repository Access

Check if the current directory is a git repo with a remote:

```bash
git remote -v
```

**If no remote:**
- Ask: "This repo has no GitHub remote. Do you want to create a GitHub repo and push?"
- If yes: `gh repo create [name] --source=. --push`
- If no: note that push/PR features won't work until a remote is configured

**If remote exists:**
```bash
# Verify push access
gh repo view --json name,owner,defaultBranchRef
```

- **If access confirmed** → show repo name and default branch
- **If access denied** → "You don't have push access to this repo. You may need to fork it or request access from the owner."

### Step 5: Verify PR Permissions

```bash
# Test that we can list PRs (verifies API access)
gh pr list --limit 1
```

- **If works** → "PR creation: ✅ Ready"
- **If fails** → diagnose: missing scopes, repo not found, etc.

### Step 6: Summary

```
GitHub Connection Status:

  ✅ CLI installed (gh v2.x.x)
  ✅ Authenticated as @username
  ✅ Repo: owner/repo-name
  ✅ Push access: yes
  ✅ PR creation: ready
  ✅ Default branch: main

You're all set for /ship and /deploy.
```

If any item failed:
```
GitHub Connection Status:

  ✅ CLI installed (gh v2.x.x)
  ✅ Authenticated as @username
  ❌ Repo: no remote configured
  ❌ Push access: no remote
  ❌ PR creation: no remote

Next step:
  Run: gh repo create my-project --source=. --push
  Then run /connect-github again to verify.
```

## Edge Cases

### Multiple GitHub Accounts
If the user has multiple accounts:
```bash
gh auth status
# Shows active account
gh auth switch
# Switch between accounts
```

### SSH vs HTTPS
If the remote uses SSH but auth is HTTPS (or vice versa):
- Detect the mismatch
- Ask which protocol the user prefers
- Update remote URL if needed: `git remote set-url origin [new-url]`

### Organization Repos
If the repo is in an org:
- Check org membership: `gh api user/memberships/orgs/[ORG_NAME]`
- If SSO is required: guide the user to authorize their token for the org

### Fork Workflow
If the user is working on a fork:
- Verify upstream remote exists
- Suggest: `gh repo fork --remote`
