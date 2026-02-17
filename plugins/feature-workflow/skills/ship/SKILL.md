---
name: ship
description: This skill should be used when the user asks to "ship it", "deploy", "push and deploy", "commit and deploy", "release", "go live", "send to production", or wants to commit, push, and deploy changes to production. It handles conventional commits, PR creation, and multi-target deployment to Vercel (frontend), GCP Cloud Run (backend), and GCP Vertex AI / Cloud Functions (AI services).
version: 0.3.0
---

# Ship — Git + Multi-Target Deployment

Commit, push, and deploy changes across a multi-target infrastructure. This skill is a flexible guide — stop at any point (e.g., commit without deploying, or deploy only frontend).

## Legacy Project Shipping Rules

When shipping changes on an **existing codebase**:

### Respect Existing Git Workflow

```bash
# Check for existing branch naming convention
git branch -a | head -15

# Check for existing commit message convention
git log --oneline -20
```

- If the project uses `feature/xxx` branches → follow that pattern
- If commit messages use a different convention (e.g., Jira ticket IDs) → match it
- If the project has a `CONTRIBUTING.md` → read and follow it
- If there's a PR template (`.github/pull_request_template.md`) → use it

### Existing CI/CD Awareness

Before deploying, check if a CI/CD pipeline will auto-deploy:

```bash
ls .github/workflows/*.yml 2>/dev/null
grep -l "deploy\|release\|publish" .github/workflows/*.yml 2>/dev/null
```

- If a pipeline deploys on merge to main → **do NOT manually deploy**. Let the pipeline handle it.
- If a pipeline runs tests on PR → note this in the PR description.
- If there's a staging environment → deploy to staging first, not production.

### Deployment Status Cache

Read `.product/deployment-status.md` for cached infrastructure info instead of re-detecting every time.

## Infrastructure Map

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    Frontend      │  │    Backend       │  │   AI Services    │
│    React         │  │    Express       │  │                  │
│       ↓          │  │       ↓          │  │       ↓          │
│    Vercel        │  │  GCP Cloud Run   │  │  Vertex AI /     │
│    Netlify       │  │  Railway         │  │  Cloud Functions  │
│    AWS Amplify   │  │  Render          │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                              ↓
                    ┌──────────────────┐
                    │    Database      │
                    │  PostgreSQL      │
                    │  MongoDB Atlas   │
                    │  MySQL           │
                    └──────────────────┘
```

## Flexible Guide

### Step 1: Pre-flight Checks

Before committing, verify the codebase is clean:

- Run the test suite: `npx vitest run` and `npx playwright test`
- If tests fail, suggest running the `test` skill to fix them
- Check for lint errors: `npx eslint .` (if configured)
- Review `git status` for unintended file changes
- Verify no secrets or `.env` files are staged

### Step 2: Smart Diff Detection

Analyze what changed to determine which targets need deployment:

```bash
git diff --name-only HEAD
```

Categorize changes:
- **Frontend changed**: Files in `src/ui/`, `public/`, or frontend config files
- **Backend changed**: Files in `src/api/`, `src/domain/`, `src/infra/`, or server config
- **AI services changed**: Files in AI-related directories
- **Shared changed**: Files in `src/types/`, `src/utils/` → deploy both frontend and backend
- **Database schema changed**: Files in `prisma/` → run migrations before deploying
- **Config only**: `package.json`, config files → check if deploy is needed

Report which targets need deployment and confirm with the user.

### Step 3: Conventional Commit

Craft a commit message following Conventional Commits format.

Reference `references/conventional-commits.md` for the full specification.

**Quick reference:**

| Prefix | When to Use |
|--------|-------------|
| `feat:` | New feature or functionality |
| `fix:` | Bug fix |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `test:` | Adding or fixing tests |
| `docs:` | Documentation changes |
| `chore:` | Build process, tooling, dependencies |
| `style:` | Formatting, whitespace (no logic change) |
| `perf:` | Performance improvement |

**Format:** `type(scope): description`
- Scope is optional: `feat(orders): add discount code validation`
- Description should be imperative: "add" not "added" or "adds"
- Keep under 72 characters

Invoke the `commit` skill for the actual commit creation.

### Step 4: Push + PR

Push the branch and create a pull request:

- Push to remote: `git push -u origin [branch-name]`
- Create PR with summary of changes
- Invoke the `commit-push-pr` skill for the full workflow
- Include which deployment targets are affected in the PR description

### Step 5: Deploy

**Invoke the `/deploy` skill for the full deployment workflow.** The deploy skill handles:

- Credential verification for each target platform
- Frontend deployment (Vercel / Netlify / Amplify)
- Backend deployment (Cloud Run / Railway / Render)
- Database migration (Prisma migrate / MongoDB checks)
- AI services deployment (Vertex AI / Cloud Functions)
- Post-deploy health verification
- Failure diagnosis and rollback guidance

If you prefer to deploy manually or only deploy specific targets, see the sections below.

### Step 5a: Deploy Frontend (Manual)

If frontend changed, deploy to Vercel:

- Invoke the `vercel:deploy` skill
- Or run manually: `vercel --prod` (for production) or `vercel` (for preview)
- Verify deployment URL works
- Check Vercel dashboard for build status

Reference `references/vercel-deploy.md` for detailed checklist.

### Step 5b: Deploy Backend (Manual)

If backend changed, deploy to Cloud Run:

```bash
# Build and deploy
gcloud run deploy [SERVICE_NAME] \
  --source . \
  --region [REGION] \
  --allow-unauthenticated  # or --no-allow-unauthenticated
```

**Key checks:**
- Environment variables are set in Cloud Run config
- Database connection string is in Secret Manager
- Health check endpoint responds correctly
- Service URL is accessible

Reference `references/gcp-deploy.md` for detailed guide.

### Step 5c: Deploy AI Services (Manual)

If AI services changed, deploy to GCP:

**For Cloud Functions:**
```bash
gcloud functions deploy [FUNCTION_NAME] \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --region [REGION]
```

**For Vertex AI endpoints:** Follow the Vertex AI deployment process in `references/gcp-deploy.md`.

### Step 6: Database Health Check

After backend deployment:

#### For Prisma (PostgreSQL / MySQL)
```bash
# Apply pending migrations in production
npx prisma migrate deploy
```

#### For MongoDB
- Verify application can connect to MongoDB Atlas
- Check that any new collections or indexes are created by the application
- Monitor Atlas dashboard for connection issues

Reference `references/mongodb-checklist.md` for the checklist.

### Step 7: Post-Deploy Verification

After all deployments complete:

- Verify frontend loads and communicates with backend
- Test a key user flow end-to-end on production
- Check error monitoring (Sentry, Cloud Logging) for new errors
- Invoke `vercel:logs` to review frontend deployment logs
- Review Cloud Run logs: `gcloud run services logs read [SERVICE_NAME]`

## Composing with Other Skills

| Skill | When to Invoke |
|-------|----------------|
| `commit` | For crafting and creating the git commit |
| `commit-push-pr` | For the full commit → push → PR workflow |
| `deploy` | For the full multi-target deployment with credential verification |
| `connect-github` | If GitHub push/PR fails due to auth issues |
| `setup-infra` | If deployment fails due to missing environment configuration |
| `vercel:deploy` | For frontend deployment to Vercel |
| `vercel:logs` | For reviewing Vercel deployment logs |
| `finishing-a-development-branch` | For wrapping up the branch cleanly |

## Additional Resources

### Reference Files

- **`references/conventional-commits.md`** — Full Conventional Commits specification with examples, breaking changes, and scope conventions
- **`references/vercel-deploy.md`** — Frontend deployment checklist for Vercel including environment variables, build settings, and preview deployments
- **`references/gcp-deploy.md`** — Backend (Cloud Run) and AI (Vertex AI / Cloud Functions) deployment guide with configuration, secrets management, and health checks
- **`references/mongodb-checklist.md`** — MongoDB Atlas post-deploy health check including connection verification, index management, and monitoring
