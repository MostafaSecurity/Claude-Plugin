# CodeRabbit Setup Guide (Cross-Platform)

## Platform Support

| Platform | CodeRabbit CLI | Review Method |
|----------|---------------|---------------|
| **macOS (Intel)** | ✅ Supported | CLI review |
| **macOS (Apple Silicon)** | ✅ Supported | CLI review |
| **Linux (x64)** | ✅ Supported | CLI review |
| **Linux (ARM64)** | ✅ Supported | CLI review |
| **Windows** | ❌ Not supported | Claude Direct Review (via Node.js script) |

## Installation

### macOS

```bash
# Option 1: Homebrew (recommended)
brew install coderabbit

# Option 2: Install script
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

### Linux

```bash
curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

### Windows

CodeRabbit CLI is **not available** on Windows. The skill automatically uses **Claude Direct Review** mode instead.

**No additional setup needed.** The Node.js helper script (`cr-review.mjs`) handles everything. You only need:
- Node.js 18+ (already required for Claude Code)
- Git (already required for most development)

### Verify Installation (macOS/Linux)

```bash
cr --version
```

## Authentication

### Option 1: Browser Login (macOS/Linux only)

```bash
cr auth login
```

This opens your browser for authentication.

### Option 2: API Key (All platforms)

Get your API key from: https://app.coderabbit.ai/settings

**Set as environment variable (recommended):**

```bash
# macOS/Linux — add to ~/.bashrc, ~/.zshrc, or ~/.profile
export CODERABBIT_API_KEY="your-key-here"

# Windows PowerShell — persistent
[Environment]::SetEnvironmentVariable("CODERABBIT_API_KEY", "your-key-here", "User")

# Windows CMD — persistent
setx CODERABBIT_API_KEY "your-key-here"
```

> After setting environment variables on Windows, **restart your terminal**.

**Or pass directly when running:**

```bash
node cr-review.mjs --api-key your-key-here
```

### Check Authentication Status (macOS/Linux)

```bash
cr auth status
```

### Switch Organization

```bash
cr auth org
```

## Node.js Helper Script

The `cr-review.mjs` script is the cross-platform entry point. It:

1. Detects your OS
2. Checks if CodeRabbit CLI is available
3. Collects git diff information
4. Either runs `cr review` (Path A) or outputs diff data for Claude (Path B)
5. Updates the tracking file (`.product/coderabbit-reviews.md`)

### Usage

```bash
# Auto-detect what to review
node cr-review.mjs

# Review specific scope
node cr-review.mjs --type uncommitted
node cr-review.mjs --type committed
node cr-review.mjs --type all

# Compare against specific commit
node cr-review.mjs --base-commit abc1234

# Pass API key
node cr-review.mjs --api-key <key>

# Specify working directory
node cr-review.mjs --cwd /path/to/project
```

### Output Format

The script outputs one JSON object per line:

```jsonl
{"phase":"init","os":"win32","cwd":"C:\\project"}
{"phase":"scope","type":"uncommitted","description":"Uncommitted changes (3 files)"}
{"phase":"cli_check","available":false,"version":null,"os":"win32"}
{"phase":"review_start","method":"claude-direct"}
{"phase":"review_data","method":"claude-direct","diff":"...","files":["..."],...}
{"phase":"tracking_updated"}
```

## CodeRabbit CLI Reference (macOS/Linux)

### Review Commands

```bash
# Interactive review
cr

# Plain text output
cr review --plain

# Minimal output (for AI processing)
cr review --prompt-only
```

### Review Scope

```bash
# Uncommitted changes only
cr review -t uncommitted --plain

# Committed changes only
cr review -t committed --plain

# All changes
cr review -t all --plain
```

### Comparison

```bash
# Against a branch
cr review --base main --plain

# Against a specific commit
cr review --base-commit abc1234 --plain
```

### Context

```bash
# Pass project instructions
cr review --plain -c CLAUDE.md

# Multiple config files
cr review --plain -c CLAUDE.md -c .coderabbit.yaml
```

### Other

```bash
# Disable colors
cr review --plain --no-color

# Update CLI
cr update
```

## Troubleshooting

### "cr: command not found" (macOS/Linux)

Add to your shell profile:

```bash
export PATH="$HOME/.coderabbit/bin:$PATH"
```

Then restart your terminal or run `source ~/.bashrc`.

### "Authentication failed"

```bash
cr auth logout
cr auth login
```

Or re-set the API key:

```bash
export CODERABBIT_API_KEY="your-new-key"
```

### "Not a git repository"

The review requires a git repository:

```bash
git init
git add -A
git commit -m "Initial commit"
```

### "node: command not found"

Install Node.js 18+:

```bash
# macOS
brew install node

# Linux
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
winget install OpenJS.NodeJS.LTS
```

### Script hangs on Windows

If the script seems stuck, it might be trying to install CodeRabbit CLI via npx (which will fail on Windows). The script has a 30-second timeout and will fall back to Claude Direct Review automatically.

### Large diff causes timeout

For very large diffs, the review may time out. Try:

```bash
# Review only uncommitted changes
node cr-review.mjs --type uncommitted

# Or review since a recent commit
node cr-review.mjs --base-commit HEAD~3
```
