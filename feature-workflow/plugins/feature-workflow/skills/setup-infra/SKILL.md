---
name: setup-infra
description: This skill should be used when the user asks to "setup infrastructure", "configure environment", "setup infra", "connect database", "validate tools", "check CLI tools", "configure deployment", "setup env", or wants to validate their development environment, install missing tools, configure database connections, or prepare for deployment. It ensures the project environment is ready for development and deployment.
version: 0.1.0
---

# Setup Infrastructure — Environment Validation & Service Connection

Validate the development environment, configure database connections, ensure CLI tools are installed, and guide secure authentication for external services. This skill acts as a DevOps engineer — it never stops silently and always provides the next actionable step.

## Core Principle: Conditional Credential Collection

**NEVER ask for credentials by default.** Only request credentials when:
1. A specific operation requires external access
2. The user explicitly wants to connect a service
3. A deployment or integration step fails due to missing auth

When requesting credentials:
- Explain **why** the credential is needed
- Explain **where** it will be used
- Confirm with the user before storing or using it
- **NEVER** store secrets in git-tracked files

Reference `references/credential-flow.md` for the full secure credential handling guide.

## Process

### Step 1: Read Project Configuration

Load the project's stack choices:

1. Read `.product/decisions.md` — find DEC-002 (Database) and DEC-003 (Deployment Targets)
2. Read `.env.example` — understand expected environment variables
3. Read `CLAUDE.md` — understand tech stack
4. Check if `.env` exists — if not, warn the user to create it from `.env.example`

If `.product/` does not exist, suggest running `/init-project` first.

### Step 2: Validate CLI Tools

Check which CLI tools are installed based on the project's stack:

```bash
# Always check
node --version          # Node.js
npm --version           # npm (or check for yarn/pnpm)
git --version           # Git

# Check for Flutter/Dart projects
flutter --version       # Flutter SDK (if pubspec.yaml exists)
dart --version          # Dart SDK (comes with Flutter)
flutter doctor          # Comprehensive Flutter environment check

# Check based on deployment targets
gh --version            # GitHub CLI (for PRs)
vercel --version        # Vercel CLI (if frontend → Vercel)
gcloud --version        # GCP CLI (if backend → Cloud Run)
```

For **each missing tool**, provide:

| Missing Tool | Install Command | Why It's Needed |
|-------------|-----------------|-----------------|
| `node` | `brew install node` or `nvm install 20` | Runtime for the application |
| `flutter` | See [flutter.dev/docs/get-started/install](https://flutter.dev/docs/get-started/install) | Flutter app development and builds |
| `gh` | `brew install gh` then `gh auth login` | GitHub PR creation and repo management |
| `vercel` | `npm i -g vercel` then `vercel login` | Frontend deployment to Vercel |
| `gcloud` | `brew install google-cloud-sdk` then `gcloud auth login` | Backend deployment to GCP Cloud Run |
| `docker` | `brew install --cask docker` | Container builds for Cloud Run |
| `cocoapods` | `gem install cocoapods` (macOS, for iOS builds) | iOS Flutter builds |

**Flutter-specific checks (if `pubspec.yaml` exists):**
- `flutter doctor` output should show no critical issues
- Android SDK installed (for Android builds)
- Xcode installed (for iOS builds, macOS only)
- CocoaPods installed (for iOS dependencies)

**Behavior:**
- If all required tools are present → show green checkmarks and continue
- If optional tools are missing → warn but don't block (e.g., `vercel` is only needed when deploying)
- If critical tools are missing (node, git) → stop and provide install instructions
- After providing install instructions, offer to re-check: "Run `/setup-infra` again after installing to verify"

### Step 3: Validate Database Connection

Based on the database choice from `/init-project`:

#### For PostgreSQL (Prisma)

```bash
# Check if Prisma is installed
npx prisma --version

# Check if schema.prisma exists
# If not, initialize: npx prisma init

# Test connection (requires DATABASE_URL in .env)
npx prisma db pull   # or: npx prisma migrate dev --name init
```

**If connection fails:**
- Check if `DATABASE_URL` is set in `.env`
- If not set, ask the user: "I need a PostgreSQL connection string to continue. Where is your database hosted?"
  - **Supabase** → Guide: "Go to Supabase Dashboard → Settings → Database → Connection String"
  - **Neon** → Guide: "Go to Neon Console → Connection Details"
  - **Railway** → Guide: "Go to Railway Dashboard → PostgreSQL → Variables → DATABASE_URL"
  - **Local** → Guide: "Ensure PostgreSQL is running locally. Default: `postgresql://postgres:postgres@localhost:5432/dbname`"
- After receiving the connection string, write it to `.env` (NEVER to `.env.example` or any git-tracked file)
- Re-test the connection

#### For MongoDB

```bash
# Check if MongoDB driver/Mongoose is installed
npm ls mongoose || npm ls mongodb
```

**If connection fails:**
- Guide to MongoDB Atlas: "Go to Atlas Dashboard → Database → Connect → Drivers → Copy connection string"
- Remind about IP whitelist: "Add your IP to Atlas Network Access, or use 0.0.0.0/0 for development"
- After receiving the connection string, write to `.env`

#### For MySQL (Prisma)

Same flow as PostgreSQL, but with MySQL-specific connection string format.

#### For SQLite

```bash
# SQLite is file-based, no external connection needed
# Just verify the Prisma schema is set up
npx prisma migrate dev --name init
```

### Step 4: Validate Authentication for External Services

**Only check services that the project actually uses** (based on deployment targets in `.product/decisions.md`).

Do NOT proactively ask for tokens. Instead, verify existing auth:

#### GitHub (always check — needed for PRs)

```bash
gh auth status
```

- **If authenticated** → show "GitHub: authenticated as @username"
- **If not authenticated** → ask: "GitHub CLI is not authenticated. Do you want to log in now? This is needed for creating PRs and pushing code."
  - If yes → run `gh auth login` (interactive browser flow — preferred over tokens)
  - If no → note it as a blocker for `/ship` and continue

#### Vercel (only if frontend → Vercel)

```bash
vercel whoami
```

- **If authenticated** → show "Vercel: authenticated as user@email.com"
- **If not authenticated** → ask: "Vercel CLI is not logged in. Do you want to log in now? This is needed for frontend deployment."
  - If yes → run `vercel login` (interactive browser flow)
  - If no → note it as a blocker for `/deploy` and continue

#### GCP (only if backend → Cloud Run)

```bash
gcloud auth list
gcloud config get-value project
```

- **If authenticated** → show "GCP: authenticated, project=[project-id]"
- **If not authenticated** → ask: "GCP CLI is not authenticated. Do you want to log in now? This is needed for backend deployment."
  - If yes → run `gcloud auth login` (interactive browser flow)
  - If no → note it as a blocker for `/deploy` and continue
- **If no project set** → ask: "What GCP project should be used?" then run `gcloud config set project [PROJECT_ID]`

### Step 5: Validate Project Dependencies

```bash
# Check if node_modules exists
ls node_modules/

# If not, install
npm install   # or yarn / pnpm based on lockfile presence
```

Check for common issues:
- Missing `package.json` → warn that project scaffolding may not be complete
- Lockfile mismatch (e.g., both `package-lock.json` and `yarn.lock` exist)
- Outdated dependencies with known vulnerabilities: `npm audit --production`

### Step 6: Generate Infrastructure Summary

Present a clear report:

```
Infrastructure Status:

 Runtime
  ✅ Node.js v20.11.0
  ✅ npm 10.2.4
  ✅ Git 2.43.0

 Database
  ✅ PostgreSQL (Prisma ORM)
  ✅ Connection verified
  ✅ Schema synced (3 models)

 External Services
  ✅ GitHub: authenticated as @username
  ✅ Vercel: authenticated as user@email.com
  ⚠️  GCP: not authenticated (needed for backend deployment)

 Deployment Readiness
  ✅ Frontend → Vercel (ready)
  ❌ Backend → GCP Cloud Run (needs: gcloud auth login)
  ✅ Database → Supabase (connected)

Blockers:
  1. GCP authentication needed for backend deployment
     → Run: gcloud auth login

Next steps:
  1. Fix the blockers above, or proceed with development
  2. Run /develop to start building features
  3. Run /deploy when ready to ship
```

### Step 7: Update Progress

Add a session entry to `.product/progress.md` noting what was configured and any remaining blockers.

## Edge Cases

### No `.product/` Directory
→ Suggest: "Run `/init-project` first to set up the project."

### No `.env` File
→ "I see `.env.example` but no `.env`. Let me create `.env` from `.env.example` so you can fill in your credentials."

### Authentication Expired
→ Detect from error messages. Guide re-authentication:
  - GitHub: `gh auth refresh`
  - Vercel: `vercel login`
  - GCP: `gcloud auth login`

### Wrong Database Version
→ Detect from connection errors. Suggest specific version requirements.

### Port Already In Use
→ If the development server fails, check for port conflicts: `lsof -i :3000`

## Additional Resources

### Reference Files

- **`references/credential-flow.md`** — Complete guide for secure credential collection, storage, and validation with per-service instructions
