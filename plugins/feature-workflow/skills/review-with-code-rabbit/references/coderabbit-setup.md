# CodeRabbit CLI Setup Guide

## Installation

### macOS / Linux

```bash
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

### Windows (PowerShell)

```powershell
powershell -Command "irm https://cli.coderabbit.ai/install.ps1 | iex"
```

> **Important:** After installing on Windows, close and reopen your terminal for PATH changes to take effect.

### Verify Installation

```bash
cr --version
```

## Authentication

### Browser Login (Recommended)

```bash
cr auth login
```

This opens your browser. Log in to CodeRabbit, copy the authentication token, and paste it back into your terminal.

### Check Auth Status

```bash
cr auth status
```

### API Key (Programmatic)

For CI/CD or non-interactive use, pass the API key directly:

```bash
cr review --api-key <YOUR_API_KEY>
```

Get your API key from: https://app.coderabbit.ai/settings

### Switch Organization

```bash
cr auth org
```

### Logout

```bash
cr auth logout
```

## CLI Command Reference

### Basic Review

```bash
# Interactive review (default)
cr

# Plain text review
cr review --plain

# Minimal output (optimized for AI agents)
cr review --prompt-only
```

### Review Scope

```bash
# Review uncommitted changes only
cr review -t uncommitted --plain

# Review committed changes only
cr review -t committed --plain

# Review all changes (committed + uncommitted)
cr review -t all --plain
```

### Comparison Targets

```bash
# Compare against a specific branch
cr review --base main --plain

# Compare against a specific commit
cr review --base-commit abc1234 --plain
```

### Project Context

```bash
# Pass project instructions for better context
cr review --plain -c CLAUDE.md

# Pass multiple config files
cr review --plain -c CLAUDE.md -c .coderabbit.yaml
```

### Other Options

```bash
# Specify working directory
cr review --cwd /path/to/project --plain

# Disable colored output
cr review --plain --no-color

# Update CLI to latest version
cr update
```

## Troubleshooting

### "cr: command not found"

The CLI is not in your PATH.

**macOS/Linux:** Add to your shell profile:
```bash
export PATH="$HOME/.coderabbit/bin:$PATH"
```

**Windows:** Restart your terminal after installation.

### "Authentication failed" or "Invalid API key"

```bash
# Check current status
cr auth status

# Re-authenticate
cr auth logout
cr auth login
```

### "Not a git repository"

CodeRabbit requires a git repository. Initialize one:

```bash
git init
git add -A
git commit -m "Initial commit"
```

### "No changes to review"

This means the working tree is clean and there are no uncommitted or new committed changes. Make some code changes first.

### Review Takes Too Long

For very large repositories:
- Review specific files: focus on changed files only
- Use `--prompt-only` for faster, shorter output
- Review in smaller batches (commit and review incrementally)

### Proxy / Network Issues

If behind a corporate proxy:
```bash
export HTTPS_PROXY=http://proxy:port
cr review --plain
```
