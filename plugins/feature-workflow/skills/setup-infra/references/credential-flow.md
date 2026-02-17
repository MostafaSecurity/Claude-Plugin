# Secure Credential Flow — Collection, Storage & Validation

## Golden Rule

**NEVER ask for credentials by default. Only request them when a specific operation requires external access.**

## Credential Collection Principles

### 1. Detect Before Asking

Before requesting any credential, check if it already exists:

```bash
# GitHub — check existing auth
gh auth status

# Vercel — check existing login
vercel whoami

# GCP — check existing auth
gcloud auth list

# Database — check if .env has DATABASE_URL
grep DATABASE_URL .env
```

### 2. Minimum Privilege

Only request the minimum credential needed:

| Service | Preferred Method | Fallback | Minimum Scope |
|---------|-----------------|----------|---------------|
| GitHub | `gh auth login` (browser OAuth) | Personal Access Token | `repo`, `read:org` |
| Vercel | `vercel login` (browser OAuth) | `VERCEL_TOKEN` env var | Deploy access |
| GCP | `gcloud auth login` (browser OAuth) | Service Account JSON | `roles/run.admin`, `roles/secretmanager.accessor` |
| PostgreSQL | Connection string in `.env` | — | Read/write on project DB |
| MongoDB | Connection string in `.env` | — | `readWrite` on project DB |
| MySQL | Connection string in `.env` | — | All privileges on project DB |

### 3. Explain Before Requesting

Every credential request MUST include:

```
I need [CREDENTIAL] because:
  Why:   [specific operation that requires it]
  Where: [exactly where it will be used]
  Scope: [minimum permissions needed]

The credential will be stored in [LOCATION] and is NOT committed to git.

Proceed? (yes/no)
```

### 4. Never Store in Git

Credentials must ONLY be stored in:

| Storage Location | Used For | Git-Tracked? |
|-----------------|----------|--------------|
| `.env` | Database URLs, API keys | ❌ NEVER |
| CLI config (`~/.config/gh/`) | GitHub auth | ❌ N/A |
| CLI config (`~/.config/gcloud/`) | GCP auth | ❌ N/A |
| GCP Secret Manager | Production secrets | ❌ N/A |
| Vercel Dashboard (env vars) | Production env vars | ❌ N/A |

**Always verify `.env` is in `.gitignore` before writing to it.**

## Per-Service Credential Guides

### GitHub

**When needed:** PR creation, pushing code, repo management

**Preferred flow:**
```bash
gh auth login --web
# Opens browser → user authorizes → done
```

**Verification:**
```bash
gh auth status
# Expected: Logged in to github.com account USERNAME
```

**Token refresh (if expired):**
```bash
gh auth refresh
```

**Troubleshooting:**
- "Bad credentials" → `gh auth refresh`
- "SSO required" → `gh auth refresh --scopes read:org`
- "Not found" → user may not have access to the repo

### Vercel

**When needed:** Frontend deployment to Vercel

**Preferred flow:**
```bash
vercel login
# Opens browser → user authorizes → done
```

**Verification:**
```bash
vercel whoami
# Expected: user@email.com
```

**Alternative (CI/CD):**
```bash
# Set token as env var (for automated pipelines)
export VERCEL_TOKEN="token-here"
```

**Troubleshooting:**
- "Invalid token" → `vercel login` (re-login)
- "Project not found" → `vercel link` to connect the project
- "Team permission" → verify team access in Vercel Dashboard

### GCP (Google Cloud Platform)

**When needed:** Backend deployment to Cloud Run, AI services to Vertex AI

**Preferred flow:**
```bash
gcloud auth login
# Opens browser → user authorizes → done

gcloud config set project [PROJECT_ID]
```

**Verification:**
```bash
gcloud auth list
gcloud config get-value project
```

**For CI/CD (Service Account):**
```bash
# Create service account
gcloud iam service-accounts create deploy-sa \
  --display-name "Deploy Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member "serviceAccount:deploy-sa@[PROJECT_ID].iam.gserviceaccount.com" \
  --role "roles/run.admin"

# Generate key (store securely, NEVER in git)
gcloud iam service-accounts keys create key.json \
  --iam-account deploy-sa@[PROJECT_ID].iam.gserviceaccount.com

# Authenticate with key
gcloud auth activate-service-account --key-file key.json
```

**Troubleshooting:**
- "Permission denied" → check IAM roles for the user
- "Project not found" → `gcloud projects list` to find correct ID
- "Billing disabled" → enable billing in GCP Console
- "API not enabled" → `gcloud services enable run.googleapis.com`

### Database Connection Strings

**When needed:** Any operation that connects to the database

**PostgreSQL:**
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

| Hosting | How to Get Connection String |
|---------|----------------------------|
| Supabase | Dashboard → Settings → Database → Connection String → URI |
| Neon | Console → Connection Details → Connection String |
| Railway | Dashboard → PostgreSQL service → Variables → DATABASE_URL |
| Local | `postgresql://postgres:postgres@localhost:5432/mydb` |

**MongoDB:**
```
DATABASE_URL="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE"
```

| Hosting | How to Get Connection String |
|---------|----------------------------|
| MongoDB Atlas | Dashboard → Database → Connect → Drivers → Copy string |
| Railway | Dashboard → MongoDB service → Variables → MONGO_URL |
| Local | `mongodb://localhost:27017/mydb` |

**MySQL:**
```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

| Hosting | How to Get Connection String |
|---------|----------------------------|
| PlanetScale | Dashboard → Connect → Create password → Connection string |
| Railway | Dashboard → MySQL service → Variables → MYSQL_URL |
| Local | `mysql://root:password@localhost:3306/mydb` |

**SQLite:**
```
DATABASE_URL="file:./dev.db"
```
No external connection needed. File is created locally.

## Credential Validation Checklist

After collecting any credential, always validate it immediately:

```bash
# GitHub
gh auth status && echo "✅ GitHub OK" || echo "❌ GitHub FAILED"

# Vercel
vercel whoami && echo "✅ Vercel OK" || echo "❌ Vercel FAILED"

# GCP
gcloud auth list 2>/dev/null | grep -q "ACTIVE" && echo "✅ GCP OK" || echo "❌ GCP FAILED"

# Database (PostgreSQL via Prisma)
npx prisma db pull --force && echo "✅ Database OK" || echo "❌ Database FAILED"
```

## Security Reminders

1. **Never echo credentials** to the terminal in logs or output
2. **Never include credentials** in commit messages or PR descriptions
3. **Never store credentials** in `.env.example`, `CLAUDE.md`, or any git-tracked file
4. **Always use browser OAuth** over manual token entry when possible
5. **Rotate credentials** if they are accidentally committed (immediately revoke + regenerate)
6. **Use Secret Manager** for production secrets (GCP Secret Manager, Vercel env vars)
