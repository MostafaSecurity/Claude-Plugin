# Codebase Snapshot Format — Cache & Diff Specification

## Purpose

The codebase snapshot is a lightweight cache that enables **incremental analysis**. Instead of re-reading the entire codebase every session, the plugin compares hashes to detect what changed and only re-analyzes the affected components.

## Hash Computation

### Source Structure Hash

Captures file additions, deletions, and renames (NOT content changes):

```bash
# List all source files sorted, then hash the list
find src/ app/ pages/ lib/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.vue" -o -name "*.svelte" \) 2>/dev/null | sort | md5sum | cut -d' ' -f1
```

**Changes when:** files are added, removed, or renamed.
**Does NOT change when:** file contents are modified (that's a different check).

### Dependency Hash

Captures package additions, removals, and version changes:

```bash
# Hash the lockfile (exact dependency tree)
md5sum package-lock.json 2>/dev/null || md5sum yarn.lock 2>/dev/null || md5sum pnpm-lock.yaml 2>/dev/null || echo "no-lockfile"
```

**Changes when:** `npm install`, `yarn add`, or dependency updates occur.

### Schema Hash

Captures database model changes:

```bash
# Prisma
md5sum prisma/schema.prisma 2>/dev/null

# Mongoose (hash all model files)
find src/ -path "*/models/*" -name "*.ts" -o -path "*/models/*" -name "*.js" 2>/dev/null | sort | xargs cat 2>/dev/null | md5sum | cut -d' ' -f1

# Drizzle
find src/ -path "*/schema/*" -name "*.ts" 2>/dev/null | sort | xargs cat 2>/dev/null | md5sum | cut -d' ' -f1
```

**Changes when:** database models are added, modified, or removed.

### Config Hash

Captures infrastructure and build configuration changes:

```bash
# Combine key config files
cat package.json tsconfig.json vercel.json Dockerfile docker-compose.yml .github/workflows/*.yml 2>/dev/null | md5sum | cut -d' ' -f1
```

**Changes when:** build config, deploy config, or CI/CD pipelines change.

## Diff Detection Logic

When `/resume` or `/analyze-codebase` runs, compare current hashes to stored hashes:

```
┌─────────────────────┐     ┌────────────────────┐
│  Current Hashes     │     │  Stored Hashes     │
│  (computed now)     │────▶│  (from snapshot)   │
└─────────────────────┘     └────────────────────┘
         │                           │
         └─────────┐   ┌────────────┘
                   ▼   ▼
              ┌──────────────┐
              │   Compare    │
              └──────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   All match    Some differ   All differ
        │            │            │
   "Cache OK"   Incremental   Full re-scan
   Skip scan    update only
```

### Decision Matrix

| Source | Dependencies | Schema | Config | Action |
|--------|-------------|--------|--------|--------|
| same | same | same | same | **Skip** — cache is current |
| changed | same | same | same | Re-scan features and architecture |
| same | changed | same | same | Re-check tech stack versions and vulnerabilities |
| same | same | changed | same | Re-scan database models only |
| same | same | same | changed | Re-check deployment and build config |
| changed | changed | changed | changed | **Full re-scan** (equivalent to first run) |

### Partial Update Rules

When only specific components changed:

1. **Re-analyze ONLY the affected `.product/` file(s)**
2. **Preserve manual annotations** — if a user edited architecture.md, keep their additions
3. **Update the snapshot hashes** to reflect the new state
4. **Log the update** in `.product/progress.md` as a technical note

## File Manifest Format

The snapshot includes a file manifest for fine-grained diff detection:

```
## File Manifest

src/api/routes/auth.ts          | 145 lines
src/api/routes/orders.ts        | 203 lines
src/api/controllers/auth.ts     | 89 lines
src/domain/use-cases/create-order.ts | 67 lines
src/infra/repositories/order-repo.ts | 112 lines
src/ui/pages/LoginPage.tsx      | 78 lines
...
```

This enables the `/develop` skill to know exactly which files exist and their approximate size before deciding whether to read them.

## Token Cost Estimates

| Operation | Estimated Tokens | When |
|-----------|-----------------|------|
| Full initial scan | 3,000-5,000 | First /analyze-codebase run |
| Hash comparison | 200-400 | Every /resume |
| Incremental update (1 component) | 500-1,500 | When one hash differs |
| Full re-scan | 3,000-5,000 | When all hashes differ |
| Skip (cache current) | 100-200 | When nothing changed |

The goal is that **80% of sessions cost < 500 tokens** for context loading, versus 3,000-10,000 tokens without caching.

## Cache Invalidation

Force a full re-scan when:

1. User explicitly runs `/analyze-codebase` with `--force` or says "re-analyze"
2. `.product/codebase-snapshot.md` is missing or corrupted
3. The git branch changed since last scan (different branch = potentially different code)
4. The last scan is older than 30 days (stale cache safety net)
5. The commit count since last scan exceeds 50 (significant drift)
