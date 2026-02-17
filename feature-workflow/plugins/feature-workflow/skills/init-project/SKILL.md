---
name: init-project
description: This skill should be used when the user asks to "init project", "initialize project", "set up project", "start new project", "create project structure", or wants to set up the product management and team infrastructure for a new or existing project. It creates the .product/ directory, .claude/agents/ directory, and project CLAUDE.md. For existing codebases, it auto-detects the tech stack and triggers /analyze-codebase first.
version: 0.3.0
---

# Initialize Project — Product & Team Infrastructure

Set up the product management directory, agent definitions, and project configuration so that any teammate who clones this repo gets the full team infrastructure automatically.

## Legacy Project Detection (Step 0)

**Before Step 1, check if this is an existing codebase:**

```bash
# Does source code already exist?
ls src/ app/ pages/ lib/ 2>/dev/null
ls package.json 2>/dev/null
git log --oneline -1 2>/dev/null
```

**If source code exists AND `.product/` does NOT exist → this is a legacy project.**

In legacy mode:
1. **Run `/analyze-codebase` first** — scan the existing project to detect stack, features, and architecture
2. **Pre-fill all Step 1-3 answers** from the detected stack (ask user to confirm, not re-enter)
3. **Skip questions that are already answered** by the codebase (e.g., don't ask "which database?" if Prisma schema already defines PostgreSQL)
4. **Generate `.product/` files with real data** instead of empty templates (e.g., `current-features.md` is already populated)

**Show the user:**
```
Existing codebase detected:
  Stack: Next.js 14 + Express + PostgreSQL (Prisma)
  Features: 12 API endpoints, 8 pages, 6 DB models
  Tests: Vitest + Playwright (43 test files)
  Deploy: Vercel + Docker (Cloud Run)

I'll initialize the team infrastructure using this detected stack.
Confirm or adjust? (y/adjust)
```

If the user confirms, skip Steps 1-3 and jump to Step 4 with pre-filled values.

## What Gets Created

```
<project>/
├── .product/
│   ├── user-roles.md        # Requirements: roles, use cases, acceptance criteria
│   ├── progress.md           # Session continuity and state tracking
│   ├── backlog.md            # Prioritized feature backlog
│   ├── decisions.md          # Decision log
│   └── TEAM-GUIDE.md         # Human-readable guide for teammates
├── .claude/
│   └── agents/               # Agent definitions (auto-detected by Claude Code)
│       ├── product-manager.md
│       ├── business-analyst.md
│       ├── frontend-developer.md
│       ├── backend-developer.md
│       ├── mobile-developer.md
│       ├── qa-engineer.md
│       └── devops-engineer.md
├── .env.example              # Environment variable template (git-tracked)
└── CLAUDE.md                 # Project instructions for Claude Code
```

## Process

### Step 1: Gather Project Info

Ask the user for:

1. **Project name** — Used in templates and CLAUDE.md
2. **Project description** — One sentence describing the project
3. **Primary user type** — The main user role (e.g., "Store Owner", "Patient", "Admin")
4. **Project type** — Web app / Flutter app / Full-stack + Flutter / Other
5. **Frontend framework** (if web) — Confirm or adjust: Next.js / React (Vite) / Other
6. **Backend framework** (if web or full-stack) — Confirm or adjust: Node+Express / Other
7. **Mobile framework** (if applicable) — Flutter (recommended) / React Native / None

Wait for answers before proceeding to Step 2.

**If project type is "Flutter app":**
- Skip questions 5 and 6 (no web frontend or backend — unless user says otherwise)
- Proceed to Step 2b (Flutter Configuration) after Step 2

**If project type is "Full-stack + Flutter":**
- Ask questions 5 and 6 for the web/backend stack
- Proceed to Step 2, then Step 2b for Flutter

### Step 2: Smart Database Selection

Ask the user which database they will use:

| Option | ORM / Driver | Connection String Format |
|--------|-------------|--------------------------|
| **PostgreSQL** (recommended for relational data) | Prisma ORM | `postgresql://user:pass@host:5432/dbname` |
| **MongoDB** | Mongoose / native driver | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| **MySQL** | Prisma ORM | `mysql://user:pass@host:3306/dbname` |
| **SQLite** (good for prototyping) | Prisma ORM / better-sqlite3 | `file:./dev.db` |
| **Other** | Custom | User specifies |

Based on their choice:

- **Record the decision** in `.product/decisions.md` as `DEC-002: Database Selection`
- **Set the ORM/driver** that will be used in scaffolding:
  - PostgreSQL/MySQL/SQLite → Prisma ORM (with `schema.prisma`)
  - MongoDB → Mongoose or native MongoDB driver (ask preference)
- **Generate `.env.example`** with the correct `DATABASE_URL` placeholder
- **Adapt infrastructure references** — the `/develop` and `/deploy` skills will read this choice

### Step 2b: Flutter Configuration (If Flutter Selected)

If the user selected Flutter as their project type or mobile framework:

**Ask:**

1. **State management** — BLoC (recommended for teams) / Riverpod / Provider
2. **Target platforms** — Android + iOS (default) / Android only / iOS only / Android + iOS + Web

Based on their choices:

- **Record the decision** in `.product/decisions.md` as `DEC-004: Flutter State Management`
- **Set the core packages** based on state management choice:
  - BLoC → `flutter_bloc`, `equatable`, `bloc_test`
  - Riverpod → `flutter_riverpod`, `riverpod_annotation`
  - Provider → `provider`
- **Generate `.env.example`** with `API_BASE_URL` placeholder (for backend integration)
- **Generate `flutter-developer.md` agent** instead of `mobile-developer.md`
- The `/develop-flutter` and `/test` skills will read this choice

**If this is a Flutter-only project (no web/backend):**
- Skip Step 2 (database) and Step 3 (deployment targets for web)
- Still ask about backend API URL if the app connects to an external API
- Deployment targets become: Google Play Store, App Store, Firebase Hosting (for web)

### Step 3: Deployment Target Selection

Ask the user about their deployment targets:

| Component | Options |
|-----------|---------|
| **Frontend hosting** | Vercel (recommended) / Netlify / AWS Amplify / Self-hosted / None yet |
| **Backend hosting** | GCP Cloud Run (recommended) / AWS ECS / Railway / Render / Self-hosted / None yet |
| **Database hosting** | Based on DB choice: MongoDB Atlas / Supabase / PlanetScale / Neon / Railway / Local only |
| **Mobile (Flutter)** | Google Play Console / App Store Connect / Firebase App Distribution / None yet |

Rules:
- **"None yet" is valid** — the system does not require deployment targets at init time
- Record choices in `.product/decisions.md` as `DEC-003: Deployment Targets`
- Store in `.env.example` as commented-out target URLs
- The `/setup-infra` and `/deploy` skills will use these choices later

### Step 4: Create `.product/` Directory

Create the directory and 5 files using the reference templates:

1. **`user-roles.md`** — Initialize with the primary user role from Step 1. Use `references/user-roles-template.md` as the base.
2. **`progress.md`** — Initialize with project name and "Discovery" phase. Use `references/progress-template.md`.
3. **`backlog.md`** — Initialize with empty table. Use `references/backlog-template.md`.
4. **`decisions.md`** — Initialize with DEC-001 (Project Initialization), DEC-002 (Database Selection), and DEC-003 (Deployment Targets). Use `references/decisions-template.md`.
5. **`TEAM-GUIDE.md`** — Create the teammate onboarding guide. Use `references/team-guide-template.md`.

Replace all `{{PLACEHOLDER}}` values with the project info from Steps 1-3.

### Step 5: Create `.env.example`

Generate a `.env.example` file (git-tracked, no real secrets) based on the stack choices:

```bash
# ═══════════════════════════════════════════════
# {{PROJECT_NAME}} — Environment Variables
# ═══════════════════════════════════════════════
# Copy this file to .env and fill in real values.
# NEVER commit .env to git.

# ── Database ──
DATABASE_URL="{{DATABASE_URL_PLACEHOLDER}}"

# ── Backend ──
PORT=3000
NODE_ENV=development

# ── Frontend ──
# NEXT_PUBLIC_API_URL=http://localhost:3000/api   # (Next.js)
# VITE_API_URL=http://localhost:3000/api           # (Vite)

# ── Authentication (add when needed) ──
# JWT_SECRET=
# SESSION_SECRET=

# ── Deployment (add when ready to deploy) ──
# VERCEL_TOKEN=
# GCP_PROJECT_ID=
# GCP_REGION=us-central1
```

Adapt the placeholders based on the database and framework choices.

Also ensure `.env` is in `.gitignore`. If `.gitignore` doesn't exist, create it. If it exists, check if `.env` is already listed — add it if missing.

### Step 6: Create `.claude/agents/` Directory

Copy all 7 agent definition files from `~/.claude/agents/` into `<project>/.claude/agents/`:

- `product-manager.md`
- `business-analyst.md`
- `frontend-developer.md`
- `backend-developer.md`
- `flutter-developer.md` (if Flutter selected) OR `mobile-developer.md` (if React Native selected) — skip if no mobile
- `qa-engineer.md`
- `devops-engineer.md`

These are auto-detected by Claude Code when any teammate clones the repo.

### Step 7: Create Project `CLAUDE.md`

Create `CLAUDE.md` at the project root using `references/claude-md-template.md`. Replace all `{{PLACEHOLDER}}` values. Include the database choice and deployment targets in the Tech Stack section.

If a `CLAUDE.md` already exists, ask the user whether to:
- **Merge** — Append the team infrastructure section to the existing file
- **Replace** — Overwrite with the new template
- **Skip** — Don't modify the existing CLAUDE.md

### Step 8: Confirm Setup

Show the user what was created:

```
Project initialized:

.product/
  user-roles.md      — Requirements (1 role defined)
  progress.md        — Session tracking (ready)
  backlog.md         — Feature backlog (empty)
  decisions.md       — Decision log (3 entries: init, database, deployment)
  TEAM-GUIDE.md      — Teammate onboarding guide

.claude/agents/      — 7 agent definitions (auto-detected)
.env.example         — Environment variable template
CLAUDE.md            — Project instructions

Stack: {{FRONTEND}} + {{BACKEND}} + {{DATABASE}} ({{ORM}})
Deploy: {{FRONTEND_HOST}} + {{BACKEND_HOST}} + {{DB_HOST}}

Next steps:
1. Copy .env.example to .env and add your database connection string
2. Run /setup-infra to validate your environment and connect services
3. Run /resume to verify the setup
4. Ask the BA agent to gather requirements for your first feature
```

### Step 9: Git Advice

Remind the user:

> Both `.product/` and `.claude/agents/` should be committed to git. `.env.example` should also be committed (it contains no secrets). Add them in your next commit:
> ```
> git add .product/ .claude/agents/ CLAUDE.md .env.example .gitignore
> git commit -m "chore: initialize product management and team infrastructure"
> ```

## Additional Resources

### Reference Files

- **`references/user-roles-template.md`** — Template for the user roles and use cases document
- **`references/progress-template.md`** — Template for session progress tracking
- **`references/backlog-template.md`** — Template for the feature backlog
- **`references/decisions-template.md`** — Template for the decision log
- **`references/claude-md-template.md`** — Template for the project CLAUDE.md
- **`references/team-guide-template.md`** — Template for the teammate onboarding guide
