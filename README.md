# Feature Workflow — Claude Code Plugin

A full virtual product team inside Claude Code. Covers the entire feature lifecycle — requirements, development, testing, and deployment — for **web apps** (React + Node), **Flutter/Dart mobile**, or **both**. Works on new and existing codebases with session continuity and token-efficient cached analysis.

## What You Get

**13 Skills** (commands you type):

| Command | What It Does |
|---------|-------------|
| `/analyze-codebase` | Scan an existing project: detect stack, features, architecture, debt. Cache results for fast future sessions |
| `/init-project` | Set up a new project with team infrastructure. Auto-detects existing codebases and pre-fills from scan |
| `/resume` | Load context from your last session. Uses cached analysis — never re-reads unchanged files |
| `/use-case` | Define business logic before coding. On legacy projects: checks existing features first, estimates impact |
| `/develop` | Implement a web feature across all layers (React + Node/Express). Respects existing conventions on legacy projects |
| `/develop-flutter` | Implement a Flutter/Dart feature with Clean Architecture. Supports BLoC, Riverpod, and Provider |
| `/test` | Write tests (unit, integration, E2E). On legacy projects: detects existing test framework and matches patterns |
| `/review-with-code-rabbit` | AI-powered code review. Uses CodeRabbit CLI on macOS/Linux, Claude direct review on Windows. Tracks reviewed state |
| `/ship` | Commit, push, deploy. On legacy projects: respects existing git workflow and CI/CD pipelines |
| `/save-progress` | Save session state and update codebase cache for fast next session |
| `/setup-infra` | Validate environment, CLI tools, database connection, and service credentials |
| `/connect-github` | Verify GitHub authentication and repo access |
| `/deploy` | Multi-target deployment. On legacy projects: detects existing infrastructure, improves incrementally |

**7 Team Agents** (virtual teammates you can spawn):

| Agent | Role |
|-------|------|
| Product Manager | Reviews progress, prioritizes backlog |
| Business Analyst | Gathers requirements through structured questions |
| Frontend Developer | Builds React/Next.js UI |
| Backend Developer | Builds Node/Express APIs + database layer |
| Flutter Developer | Builds Flutter/Dart apps (mobile + web) |
| QA Engineer | Writes and runs tests |
| DevOps Engineer | Handles git, deployment, verifies production |

---

## Setup Guide (Start Here)

### Step 1: Prerequisites

Before installing Claude Code, make sure you have **Node.js** and **Git** installed.

<details>
<summary><strong>Windows</strong></summary>

```powershell
# Install Node.js LTS
winget install OpenJS.NodeJS.LTS

# Install Git
winget install Git.Git
```

> **Important:** After installing, **close and reopen your terminal** for PATH changes to take effect.

Verify both are installed:

```powershell
node --version
git --version
```

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
# Install Node.js LTS
brew install node

# Git comes pre-installed on macOS. If not:
brew install git
```

Verify:

```bash
node --version
git --version
```

</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

```bash
# Install Node.js LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git
```

Verify:

```bash
node --version
git --version
```

</details>

### Step 1b: Flutter SDK (Flutter Projects Only)

Skip this if you're not building Flutter apps.

| Platform | Install Command |
|----------|----------------|
| **Windows** | Download from [flutter.dev/install](https://docs.flutter.dev/get-started/install/windows), add to PATH |
| **macOS** | `brew install flutter` — for iOS: `sudo gem install cocoapods` |
| **Linux** | `sudo snap install flutter --classic` |

After installing, run `flutter doctor` to verify everything is set up. Fix any issues it reports.

### Step 2: Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Then launch it:

```bash
claude
```

You'll be prompted to sign in with your Anthropic account. You need a **Max plan** for agent teams.

> If you already have Claude Code installed, skip to Step 3.

### Step 3: Install This Plugin

This repo is structured as a Claude Code **marketplace**. Installation is two commands:

```bash
# Register the marketplace
claude plugin marketplace add MostafaSecurity/Claude-Plugin

# Install the plugin (globally)
claude plugin install --scope user feature-workflow
```

After installation, **restart Claude Code** for the new skills to become available.

> **Scope options:** Use `--scope user` (global, all projects) or `--scope project` (current project only).

To verify the plugin is installed:

```bash
claude plugin list
# Should show: feature-workflow@feature-workflow-marketplace
```

To update later, **uninstall and reinstall** (marketplace update is not yet reliable):

```bash
# Remove old version
claude plugin uninstall feature-workflow
claude plugin marketplace remove feature-workflow-marketplace

# Reinstall latest
claude plugin marketplace add MostafaSecurity/Claude-Plugin
claude plugin install --scope user feature-workflow
```

> **Important:** Restart Claude Code after reinstalling for changes to take effect.

This gives you all 13 skills listed above.

### Step 4: Install the Team Agents

The plugin gives you skills (commands). To also get the team agents, run `/init-project` on a project — it generates them in `<project>/.claude/agents/`.

**If a teammate has already run `/init-project` on your project**, just clone the project repo. The agents are in `<project>/.claude/agents/` and Claude Code picks them up automatically. No extra setup needed.

### Step 5: Install Optional Tools

These are needed if you want to use specific agents. **You only need the tools for the agents you plan to use.**

#### GitHub CLI — for DevOps agent (PRs, git operations)

<details>
<summary><strong>Windows</strong></summary>

```powershell
winget install GitHub.cli
```

> Close and reopen your terminal after installing.

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install gh
```

</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

```bash
sudo apt install gh
```

</details>

Then authenticate:

```bash
gh auth login
```

Verify: `gh --version`

---

#### Google Cloud SDK — for DevOps agent (GCP deployments)

<details>
<summary><strong>Windows</strong></summary>

```powershell
winget install Google.CloudSDK
```

> Close and reopen your terminal after installing.

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install google-cloud-sdk
```

</details>

<details>
<summary><strong>Linux</strong></summary>

See: https://cloud.google.com/sdk/docs/install#linux

</details>

Then authenticate:

```bash
gcloud auth login
```

Verify: `gcloud --version`

---

#### Vercel CLI — for DevOps agent (Vercel deployments)

Works on all platforms (requires Node.js):

```bash
npm install -g vercel
vercel login
```

Verify: `vercel --version`

---

#### Playwright — for QA agent (browser testing)

Works on all platforms (requires Node.js):

```bash
npx playwright install
```

Verify: `npx playwright --version`

---

> **Tip:** Run `/setup-infra` inside Claude Code to check which tools are installed and which are missing. It will guide you through fixing anything.

---

## Quick Start

### Opening an Existing Project (Legacy Mode)

```
claude
> /analyze-codebase
```

The plugin scans your existing codebase in seconds using targeted reads (not full file traversal):
- Detects framework, database, ORM, test setup, and deploy config
- Maps architecture and existing features
- Identifies technical debt signals
- Caches everything in `.product/` for future sessions

Then run `/init-project` — it **auto-fills all questions** from the detected stack.

**Token savings:** First scan costs ~4,000 tokens. Every subsequent session costs ~200 tokens (cache check only). Without caching, each session would cost 5,000-10,000 tokens re-reading the same files.

### Starting a New Project

```
claude
> /init-project
```

It will ask you for:
- Project name, description, and primary user type
- **Project type** — Web app / Flutter app / Full-stack + Flutter
- **Database** (web projects) — PostgreSQL, MongoDB, MySQL, or SQLite
- **State management** (Flutter projects) — BLoC / Riverpod / Provider
- **Deployment targets** — Vercel, Cloud Run, Play Store, App Store, etc. (or "none yet")

Then it creates:
- `.product/` — requirements, backlog, progress tracking
- `.claude/agents/` — team agent definitions (shared via git)
- `.env.example` — environment variable template
- `CLAUDE.md` — project instructions for Claude Code

### Setting Up Your Environment

```
> /setup-infra
```

Validates everything is ready:
- CLI tools installed (node, git, gh, vercel, gcloud)
- Database connected (tests the connection string)
- Service credentials valid (GitHub, Vercel, GCP)
- Reports what's ready and what needs fixing

### Daily Workflow

**Start of session:**
```
> /resume
```
Shows what happened last session and suggests what to work on next.

**During your session** — use any skill or agent:
```
> /use-case              # Define a new feature
> /develop               # Build it (web projects)
> /develop-flutter       # Build it (Flutter projects)
> /test                  # Test it
> /ship                  # Commit and push
```

**End of session:**
```
> /save-progress
```
Saves what you did so the next person (or future you) can pick up.

### Deploying to Production

```
> /deploy
```

Handles the full deployment pipeline:
- Detects what changed (frontend, backend, or both)
- Verifies credentials for each deployment target
- Deploys to the right platforms
- Runs health checks
- Reports success/failure with rollback instructions

### Using Team Agents

**One agent for a quick task:**
```
> Use the product-manager agent to review my project
> Use the qa-engineer agent to test the order feature
```

**Full team for a big feature:**
```
> Create a team to build the order management system
```

This spawns BA, PM, Frontend Dev, Backend Dev, QA, and DevOps agents that coordinate through a shared task list.

---

## Project Structure

After running `/init-project`, your project gets:

```
your-project/
├── .product/
│   ├── user-roles.md      # Requirements (roles, use cases, acceptance criteria)
│   ├── progress.md         # Session log (what was done, what's next)
│   ├── backlog.md          # Prioritized feature backlog
│   ├── decisions.md        # Decision log (includes DB + deploy choices)
│   └── TEAM-GUIDE.md       # Onboarding guide for teammates
├── .claude/
│   └── agents/             # Team agent definitions (auto-detected)
├── .env.example            # Environment variable template (git-tracked)
└── CLAUDE.md               # Project instructions for Claude Code
```

**Commit these files to git.** When teammates clone the repo, they get the full team infrastructure automatically.

---

## Working with Existing Codebases (Legacy Mode)

The plugin automatically detects when you open an existing repository and switches to **legacy mode**:

### What Gets Cached

| File | Contents | Updated By |
|------|----------|-----------|
| `.product/architecture.md` | Tech stack, directory structure, patterns, entry points | `/analyze-codebase` |
| `.product/current-features.md` | API endpoints, UI pages, DB models, integrations | `/analyze-codebase` |
| `.product/technical-debt.md` | TODO count, untested files, large files, vulnerabilities | `/analyze-codebase` |
| `.product/deployment-status.md` | Deploy platforms, CI/CD, env vars, build commands | `/analyze-codebase` |
| `.product/codebase-snapshot.md` | File hashes for cache invalidation | `/save-progress` |

### Safe Development Rules

When working on existing code, the plugin enforces safety:

- **Shows an impact plan** before writing any code (affected files, risk level, backward compatibility)
- **Matches existing conventions** — file naming, import style, patterns
- **Never modifies stable code** unless the user explicitly requests it
- **Proposes minimal changes** — extends rather than rewrites
- **Flags schema migrations** with clear explanation and rollback steps

### Token Efficiency

| Operation | Tokens (without cache) | Tokens (with cache) | Savings |
|-----------|----------------------|---------------------|---------|
| Session resume | 5,000-10,000 | 200-500 | **95%** |
| Feature development | 8,000-15,000 | 2,000-4,000 | **70%** |
| Deployment | 3,000-5,000 | 500-1,000 | **80%** |
| Full initial scan | N/A | 3,000-5,000 | One-time cost |

---

## Database Support

`/init-project` asks which database to use, and the entire toolchain adapts:

| Database | ORM/Driver | Migrations | Repository Pattern |
|----------|-----------|------------|-------------------|
| **PostgreSQL** | Prisma ORM | `prisma migrate dev` | `createPrismaXxxRepo(prisma)` |
| **MongoDB** | Mongoose or native driver | Schema-flexible | `createMongoXxxRepo()` |
| **MySQL** | Prisma ORM | `prisma migrate dev` | `createPrismaXxxRepo(prisma)` |
| **SQLite** | Prisma ORM | `prisma db push` | `createPrismaXxxRepo(prisma)` |

The **domain layer stays identical** regardless of database — only the `infra/` layer changes. This is Clean Architecture in action.

---

## Deployment Targets

`/deploy` supports multiple hosting platforms:

| Component | Supported Platforms |
|-----------|-------------------|
| **Web Frontend** | Vercel, Netlify, AWS Amplify |
| **Backend** | GCP Cloud Run, Railway, Render |
| **Database** | Supabase, MongoDB Atlas, Neon, PlanetScale, Railway |
| **Flutter Mobile** | Google Play Console, App Store Connect, Firebase App Distribution |
| **Flutter Web** | Firebase Hosting, Vercel, Netlify |

The system verifies credentials before deploying, provides clear error messages on failure, and always offers rollback instructions.

---

## Credential Management

The plugin follows a **secure-by-default** approach:

- **Never asks for credentials by default** — only when a specific operation requires them
- **Prefers browser OAuth** over manual token entry (e.g., `gh auth login`, `vercel login`)
- **Never stores secrets in git** — credentials go to `.env` (local) or platform dashboards (production)
- **Explains why** before requesting any credential
- **Validates immediately** after receiving credentials

Run `/setup-infra` to see your current credential status across all services.

---

## For Team Leads

### Onboarding a New Teammate

1. Have them follow the Setup Guide above (Steps 1-5)
2. They clone the project repo — agents are auto-detected from `.claude/agents/`
3. They run `/setup-infra` to validate their environment
4. They run `/resume` to see current state
5. They read `.product/backlog.md` to pick up work

### Important Rules

- Always run `/save-progress` before ending a session
- Always run `/resume` when starting a session
- Don't edit `.product/user-roles.md` by hand — use the BA agent
- Don't reorder `.product/backlog.md` by hand — use the PM agent
- Commit `.product/` changes alongside code changes
- Never commit `.env` — only `.env.example`

---

## Architecture

The plugin enforces **Clean Architecture** across all project types:

| Stack | Frontend | Backend | Testing | Deployment |
|-------|----------|---------|---------|------------|
| **Web** | React / Next.js | Node.js / Express | Vitest + Playwright | Vercel, Cloud Run, Railway |
| **Flutter** | Flutter (mobile + web) | — or shared backend | flutter_test + bloc_test | Play Store, App Store, Firebase |

The team agents respect directory ownership to avoid conflicts:

| Agent | Owns |
|-------|------|
| Frontend Developer | `src/ui/`, `src/pages/`, `public/` |
| Backend Developer | `src/domain/`, `src/infra/`, `src/api/`, `src/types/` |
| Flutter Developer | `lib/`, `test/`, `android/`, `ios/` |
| QA Engineer | Test files, acceptance criteria |
| DevOps Engineer | Git operations, deployment |

---

## Skill Composition

Skills are designed to work together:

**New project:**
```
/init-project → /setup-infra → /resume → /use-case → /develop (or /develop-flutter) → /review-with-code-rabbit → /test → /ship → /deploy → /save-progress
```

**Existing project:**
```
/analyze-codebase → /init-project → /setup-infra → /resume → /use-case → /develop (or /develop-flutter) → /review-with-code-rabbit → /test → /ship → /deploy → /save-progress
```

| If this fails... | Run this to fix it |
|-------------------|--------------------|
| Database connection | `/setup-infra` |
| GitHub push/PR | `/connect-github` |
| Deployment | `/deploy` (diagnoses + fixes) |
| Missing CLI tool | `/setup-infra` (provides install commands) |
| Expired credentials | `/setup-infra` (guides re-authentication) |

---

## Troubleshooting

**"Plugin not found" after install:**
Restart Claude Code (`claude`) after installing the plugin.

**Plugin update not working (`marketplace update` / `plugin update`):**
The update commands may not pick up new skills. Use uninstall + reinstall instead:
```bash
claude plugin uninstall feature-workflow
claude plugin marketplace remove feature-workflow-marketplace
claude plugin marketplace add MostafaSecurity/Claude-Plugin
claude plugin install --scope user feature-workflow
```
Then restart Claude Code.

**"not found in any configured marketplace" during install:**
You must register the marketplace first. Run `claude plugin marketplace add MostafaSecurity/Claude-Plugin` before `claude plugin install`.

**"/resume says no .product/ directory":**
Run `/init-project` first to set up the project infrastructure.

**"gh: command not found" during /ship:**
Install the GitHub CLI. See [Step 5: Install Optional Tools](#step-5-install-optional-tools) for your platform.
Or run `/setup-infra` — it will detect the missing tool and guide installation.

**"Database connection failed":**
Run `/setup-infra` — it will check your `.env` file, test the connection, and guide you through fixing it.

**"Deployment failed":**
Run `/deploy` — it diagnoses failures, explains the error, and provides the exact fix command.

**Windows: "'command' is not recognized" after installing a tool:**
Close your terminal (PowerShell / CMD) and open a new one. Windows needs a fresh terminal to pick up PATH changes from `winget install`.

**Windows: "execution policy" error when running scripts:**
Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Windows: `npx` or `npm` not found:**
Make sure Node.js is installed (`winget install OpenJS.NodeJS.LTS`) and restart your terminal.

**Flutter: `flutter: command not found`:**
Install Flutter SDK — see [Step 1b](#step-1b-flutter-sdk-for-flutter-projects-only). Run `flutter doctor` after installing.

**Flutter: build errors (Android/iOS):**
Android: `cd android && ./gradlew clean && cd ..` then retry. iOS (macOS): `sudo gem install cocoapods && cd ios && pod install`. Run `flutter doctor -v` for detailed diagnostics.

---

## License

MIT
