---
name: deploy
description: This skill should be used when the user asks to "deploy", "deploy to production", "deploy frontend", "deploy backend", "push to production", "go live", "release to staging", "deploy to vercel", "deploy to cloud run", or wants to deploy their application to hosting platforms. It handles multi-target deployment with credential verification, health checks, and rollback guidance.
version: 0.2.0
---

# Deploy — Intelligent Multi-Target Deployment

Deploy the application to production (or staging) across multiple hosting targets. This skill acts as a DevOps engineer: it verifies credentials before deploying, explains failures clearly, and always provides the next actionable step.

## Legacy Deployment Detection

When deploying an **existing project**, detect the current deployment method FIRST:

### Step 0: Discover Existing Infrastructure

**Read cached deployment info first:**
```bash
cat .product/deployment-status.md 2>/dev/null
```

**If no cache exists, detect from config files:**
```bash
# CI/CD pipelines
ls .github/workflows/*.yml .gitlab-ci.yml Jenkinsfile bitbucket-pipelines.yml .circleci/config.yml 2>/dev/null

# Platform configs
ls vercel.json netlify.toml fly.toml render.yaml railway.json app.yaml Procfile 2>/dev/null

# Container configs
ls Dockerfile docker-compose.yml docker-compose.prod.yml 2>/dev/null

# Deploy scripts
grep -E '"deploy|"release|"publish"' package.json 2>/dev/null
```

### Respect Existing Infrastructure

**CRITICAL: Never replace an existing deployment pipeline.**

- If the project uses GitHub Actions → add to it, don't switch to another CI
- If the project uses a custom Dockerfile → use it, don't generate a new one
- If the project deploys via `npm run deploy` script → use that command
- If the project uses Terraform/Pulumi → don't introduce gcloud CLI commands

### Incremental Improvements

Instead of replacing infrastructure, suggest incremental improvements:

| Current State | Suggestion | Risk |
|---------------|-----------|------|
| No health check endpoint | Add one | LOW |
| No CI/CD pipeline | Add GitHub Actions workflow | LOW |
| No rollback strategy | Document rollback steps | LOW |
| Manual deploy script | Keep it, add pre-deploy checks | LOW |
| Outdated Dockerfile | Update base image version | MEDIUM |
| No staging environment | Suggest adding one | MEDIUM |

Always ask before making infrastructure changes.

## Architecture

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    Frontend      │  │    Backend       │  │   AI Services    │
│  React / Next.js │  │  Node / Express  │  │                  │
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

## Core Principles

1. **Verify before deploying** — check credentials and config before running deploy commands
2. **Detect what changed** — only deploy targets with actual changes
3. **Never store secrets in git** — all credentials stay in `.env` or platform dashboards
4. **Provide rollback path** — always tell the user how to undo a failed deployment
5. **Report clearly** — green/red status for every deployment target

## Process

### Step 1: Pre-Flight Checks

Before any deployment:

```bash
# 1. Ensure tests pass
npx vitest run
npx playwright test  # if E2E tests exist

# 2. Check for lint errors
npx eslint . --quiet  # if configured

# 3. Check for TypeScript errors
npx tsc --noEmit  # if TypeScript

# 4. Check for staged secrets
git diff --cached --name-only | grep -E '\.(env|pem|key)$'
```

**If tests fail:**
→ "Tests are failing. Fix them before deploying, or run `/test` to investigate."
→ Do NOT proceed with deployment.

**If lint/type errors exist:**
→ Warn but allow the user to decide: "There are lint errors. Deploy anyway?"

**If secrets are staged:**
→ "WARNING: It looks like `.env` or key files are staged for commit. Remove them before deploying."
→ Block deployment until resolved.

### Step 2: Detect Deployment Targets

Read project configuration:

1. Check `.product/decisions.md` for DEC-003 (Deployment Targets)
2. Analyze changed files since last deployment:

```bash
# What changed since last deploy tag or main branch
git diff --name-only HEAD~1
```

Categorize changes:

| Files Changed | Deploy Target |
|---------------|---------------|
| `src/ui/`, `public/`, frontend config | Frontend |
| `src/api/`, `src/domain/`, `src/infra/`, server config | Backend |
| `src/types/`, `src/utils/` (shared) | Both frontend and backend |
| AI-related directories | AI services |
| Only `docs/`, `.product/`, `README` | No deployment needed |

Present the plan:
```
Deployment Plan:
  Frontend (Vercel)      — 3 files changed in src/ui/
  Backend (Cloud Run)    — 5 files changed in src/api/ and src/domain/
  Database               — No schema changes detected
  AI Services            — No changes

Proceed with deployment? (frontend + backend)
```

Wait for user confirmation.

### Step 3: Verify Credentials (Per Target)

**Only check credentials for targets that need deployment.** Do not ask for credentials for targets with no changes.

#### Frontend → Vercel

```bash
vercel whoami
```

- **If authenticated** → proceed
- **If not** → "Vercel is not authenticated. Run `vercel login` to continue, or I can guide you through it."
- **If CLI missing** → "Install Vercel CLI: `npm i -g vercel`, then `vercel login`"

#### Frontend → Netlify

```bash
netlify status
```

- Similar flow: check auth, guide login if needed

#### Backend → GCP Cloud Run

```bash
gcloud auth list
gcloud config get-value project
```

- **If authenticated with project set** → proceed
- **If not authenticated** → "GCP is not authenticated. Run `gcloud auth login` to continue."
- **If no project** → "No GCP project configured. Run `gcloud config set project [PROJECT_ID]`"
- **If CLI missing** → provide install instructions

#### Backend → Railway

```bash
railway whoami
```

- Similar flow: check auth, guide login if needed

#### Database Connection

```bash
# Test the connection through the application
# For Prisma:
npx prisma db pull --force

# For MongoDB:
# Check if app can connect (start health check endpoint)
```

### Step 4: Deploy Frontend

Based on the configured frontend host:

#### Vercel Deployment

```bash
# Production deployment
vercel --prod --yes

# Or preview deployment
vercel --yes
```

**Post-deploy checks:**
- Verify the deployment URL loads
- Check that API calls reach the correct backend
- Review build logs for warnings

**If deployment fails:**
- Parse the error output
- Common fixes:
  - Build error → "Run `npm run build` locally to see the full error"
  - Env vars missing → "Set environment variables in Vercel Dashboard → Project → Settings"
  - Framework detection → "Add `framework` to `vercel.json` or specify build command"

Reference `references/deployment-targets.md` for platform-specific guides.

#### Netlify Deployment

```bash
netlify deploy --prod
```

#### AWS Amplify

```bash
amplify publish
```

### Step 5: Deploy Backend

Based on the configured backend host:

#### GCP Cloud Run Deployment

```bash
gcloud run deploy [SERVICE_NAME] \
  --source . \
  --region [REGION] \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

**If using secrets (database URL, API keys):**
```bash
# Store secret in GCP Secret Manager first
echo -n "connection-string" | gcloud secrets create db-url --data-file=-

# Reference in Cloud Run
gcloud run deploy [SERVICE] \
  --set-secrets "DATABASE_URL=db-url:latest"
```

**Post-deploy checks:**
```bash
# Health check
curl -s https://[SERVICE_URL]/health

# Read logs
gcloud run services logs read [SERVICE_NAME] --limit 20
```

**If deployment fails:**
- Container build error → check Dockerfile
- Port binding → ensure app listens on `$PORT`
- Memory limit → increase `--memory`
- Permission denied → check IAM roles

#### Railway Deployment

```bash
railway up
```

#### Render Deployment

Render deploys automatically from git. Guide the user to check the Render dashboard.

### Step 5b: Deploy Flutter App (If Applicable)

If the project includes a Flutter application:

**Detect Flutter deployment:**
```bash
ls pubspec.yaml android/app/build.gradle ios/Runner.xcodeproj/project.pbxproj 2>/dev/null
cat pubspec.yaml | grep 'version:' 2>/dev/null
ls fastlane/ 2>/dev/null
```

#### Android Build & Deploy

```bash
# Build App Bundle for Play Store
flutter build appbundle --release

# Or build APK for direct distribution
flutter build apk --release
```

**Post-build:**
- Upload `build/app/outputs/bundle/release/app-release.aab` to Google Play Console
- Or use Fastlane: `cd android && fastlane android deploy`

**If build fails:**
- Keystore not found → "Run `keytool -genkey -v -keystore key.jks -keyalg RSA -keysize 2048` to generate"
- Gradle error → "Run `cd android && ./gradlew clean` then retry"
- Version code conflict → "Increment version in `pubspec.yaml`"

#### iOS Build & Deploy (macOS only)

```bash
# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Build IPA for App Store
flutter build ipa --release
```

**Post-build:**
- Upload via Xcode (Archive → Distribute) or Transporter app
- Or use Fastlane: `cd ios && fastlane ios release`

**If build fails:**
- CocoaPods not installed → "Run `gem install cocoapods && cd ios && pod install`"
- Provisioning profile error → "Open Xcode, enable Automatic Signing"
- Minimum iOS version → "Set `platform :ios, '13.0'` in `ios/Podfile`"

#### Flutter Web Deploy

```bash
flutter build web --release
```

Then deploy `build/web/` to the configured web host:
- Firebase Hosting: `firebase deploy`
- Vercel: `cd build/web && vercel --prod --yes`
- Netlify: `cd build/web && netlify deploy --prod --dir .`

Reference `references/deployment-targets.md` for detailed Flutter deployment guides.

### Step 6: Deploy AI Services (If Applicable)

#### GCP Cloud Functions

```bash
gcloud functions deploy [FUNCTION_NAME] \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --region [REGION]
```

#### Vertex AI Endpoints

```bash
gcloud ai endpoints deploy-model [ENDPOINT_ID] \
  --model [MODEL_ID] \
  --region [REGION]
```

### Step 7: Database Health Check

After backend deployment, verify the database:

#### PostgreSQL (Prisma)

```bash
# Ensure migrations are applied
npx prisma migrate deploy

# Verify connection from deployed backend
curl https://[BACKEND_URL]/health
```

#### MongoDB Atlas

- Verify IP whitelist includes deployment target IPs
- Check Atlas dashboard for connection count
- Verify collections and indexes exist

Reference the ship skill's `references/mongodb-checklist.md` for the full checklist.

### Step 8: Post-Deploy Verification

Run a comprehensive check:

```bash
# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://[FRONTEND_URL]

# Backend health
curl -s https://[BACKEND_URL]/health

# API connectivity (frontend → backend)
curl -s https://[BACKEND_URL]/api/health
```

Present results:

```
Deployment Complete:

  Frontend (Vercel)
    ✅ Deployed: https://my-app.vercel.app
    ✅ Status: 200 OK
    ✅ Build time: 45s

  Backend (Cloud Run)
    ✅ Deployed: https://api-xxxxx-uc.a.run.app
    ✅ Health check: passing
    ✅ Revision: my-app-00003-abc

  Database (Supabase)
    ✅ Connected
    ✅ Migrations applied
    ✅ No slow queries detected

Post-deploy:
  - Monitor error logs for the next 15 minutes
  - Frontend: vercel logs --follow
  - Backend: gcloud run services logs read [SERVICE] --follow
```

### Step 9: Handle Failures

If any deployment step fails, **do not stop silently**:

1. **Show the error** — paste the relevant error output
2. **Diagnose** — explain what the error means
3. **Provide fix** — give the exact command or action to resolve it
4. **Offer retry** — "Want me to retry the deployment after you fix this?"

Common failure patterns:

| Error | Diagnosis | Fix |
|-------|-----------|-----|
| `vercel: command not found` | CLI not installed | `npm i -g vercel && vercel login` |
| `gcloud: not authenticated` | Auth expired | `gcloud auth login` |
| `Build failed` | Code error | "Run `npm run build` locally to see details" |
| `Port already allocated` | Port conflict on Cloud Run | "Ensure your app uses `process.env.PORT`" |
| `Connection refused` (DB) | DB not accessible from deploy target | "Check IP whitelist / firewall rules" |
| `Secret not found` | GCP secret missing | "Create with: `gcloud secrets create [NAME] --data-file=-`" |
| `Timeout during deploy` | Build too slow | "Increase build timeout or optimize Dockerfile" |

### Step 10: Rollback Guidance

If the deployment is broken in production:

#### Vercel Rollback
```bash
vercel ls                          # List recent deployments
vercel promote [PREVIOUS_URL]      # Promote previous deployment
```

#### Cloud Run Rollback
```bash
gcloud run revisions list --service [SERVICE]
gcloud run services update-traffic [SERVICE] \
  --to-revisions [PREVIOUS_REVISION]=100
```

#### Railway Rollback
```bash
railway rollback
```

## Additional Resources

### Reference Files

- **`references/deployment-targets.md`** — Platform-specific deployment guides for Vercel, GCP Cloud Run, Railway, Render, Netlify, and AWS Amplify
- **Ship skill's `references/conventional-commits.md`** — For commit formatting before deployment
- **Ship skill's `references/mongodb-checklist.md`** — Post-deploy database verification
