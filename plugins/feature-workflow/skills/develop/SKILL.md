---
name: develop
description: This skill should be used when the user asks to "implement a feature", "build this", "code this", "develop feature", "wire up", "connect layers", "implement use case", or wants to turn a use case specification into working code across all application layers. It follows Clean Architecture with React/Next.js frontend, Node/Express backend, and PostgreSQL + Prisma ORM. For legacy projects, it respects existing conventions and proposes minimal-impact changes.
version: 0.3.0
---

# Feature Development — Clean Architecture Implementation

Implement features across all layers of a React + Node/Express application following Clean Architecture with pragmatic boundaries. This skill is a flexible guide — adapt the order based on what makes sense for the specific feature.

> **For Flutter/Dart projects**, use `/develop-flutter` instead. It follows the same Clean Architecture principles but with Flutter-specific patterns (BLoC/Riverpod, Dart entities, feature-based modules).

## Legacy Project Rules

When working on an **existing codebase** (detected by presence of `.product/architecture.md` or existing source code):

### Convention Detection (Before Writing Code)

Read `.product/architecture.md` first. If it doesn't exist, check the codebase directly:

```bash
# What patterns does this project use?
grep -rn "export default\|export function\|export const\|module.exports" src/ --include="*.ts" | head -10

# What naming convention?
ls src/api/routes/ src/api/controllers/ src/domain/ 2>/dev/null | head -20

# What import style?
grep -rn "^import\|require(" src/ --include="*.ts" | head -10
```

**Match existing conventions exactly:**
- If the project uses `class`-based services → use classes, not factory functions
- If the project uses `camelCase` file names → don't introduce `kebab-case`
- If the project uses `default` exports → don't introduce named exports
- If the project uses a custom ORM wrapper → use it, don't introduce Prisma

### Impact Analysis (Before Implementing)

Before writing any code, present an impact plan:

```
Implementation Plan:

  Feature: [name]
  Risk Level: LOW / MEDIUM / HIGH

  New files ({{COUNT}}):
    - src/api/routes/discount.ts
    - src/domain/use-cases/apply-discount.ts

  Modified files ({{COUNT}}):
    - src/api/routes/index.ts (add route registration)
    - prisma/schema.prisma (add Discount model)

  Schema changes: YES — new Discount model
    → Migration needed: npx prisma migrate dev --name add-discount

  Backward compatibility: ✅ No breaking changes
    → Existing API endpoints unchanged
    → New endpoint only: POST /api/discounts/apply

  Estimated token cost: ~2,000 (only reading 4 files)

Proceed? (y/adjust)
```

**Always wait for user confirmation before writing code on legacy projects.**

### Minimal-Impact Rules

1. **Never modify files that aren't directly related** to the feature
2. **Never refactor existing code** unless the user explicitly asks for it
3. **Add, don't replace** — extend existing modules rather than rewriting them
4. **Preserve all existing tests** — never delete or modify passing tests
5. **If a schema migration is needed**, explain exactly what changes and provide rollback SQL
6. **If backward compatibility might break**, flag it as HIGH risk and explain the impact

## Architecture Overview

```
src/
├── domain/              ← Entities, value objects, use case functions
│   ├── entities/
│   ├── use-cases/
│   └── ports/           ← Repository interfaces
├── infra/               ← Concrete implementations
│   ├── repositories/    ← Database adapters (Prisma or Mongoose)
│   ├── services/        ← External service clients
│   └── config/
├── api/                 ← Express routes and controllers
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── validators/
├── ui/                  ← React components
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── services/       ← API client functions
├── types/               ← Shared types (pragmatic: accessible by all layers)
└── utils/               ← Shared utilities (pragmatic: accessible by all layers)
```

**Pragmatic boundaries**: The `types/` and `utils/` directories are accessible from any layer. All other imports flow inward: UI → API → Domain ← Infra.

## Database-Aware Development

Before implementing, check which database the project uses:

1. Read `.product/decisions.md` — find DEC-002 (Database Selection)
2. Check for `prisma/schema.prisma` (Prisma ORM → PostgreSQL/MySQL/SQLite)
3. Check for Mongoose models in `src/infra/models/` (MongoDB)

**Key rule:** The domain layer is IDENTICAL regardless of database. Only the `infra/` layer changes.

| Database | ORM/Driver | Repository Pattern | Reference |
|----------|-----------|-------------------|-----------|
| PostgreSQL | Prisma | `createPrismaXxxRepo(prisma)` | `references/database-adapters.md` |
| MongoDB | Mongoose | `createMongoXxxRepo()` | `references/database-adapters.md` |
| MongoDB | Native driver | `createMongoNativeXxxRepo(collection)` | `references/database-adapters.md` |
| MySQL | Prisma | `createPrismaXxxRepo(prisma)` | `references/database-adapters.md` |
| SQLite | Prisma | `createPrismaXxxRepo(prisma)` | `references/database-adapters.md` |

Reference `references/database-adapters.md` for complete implementation examples for each database.

## Development Guide

### Step 1: Check for Use Case Spec

Before implementing, look for an existing use case specification:

- Search the codebase for related use case files
- Check if the `use-case` skill was run previously
- If no spec exists, suggest running the `use-case` skill first — but do not block if the user wants to proceed

Needed from the spec: DTOs, repository interface, use case function, business rules.

### Step 2: Implement Domain Layer

Build the use case function and supporting domain objects:

- Create the interactor as a factory function (Pattern B)
- Place in `src/domain/use-cases/`
- Define repository interfaces in `src/domain/ports/`
- Add or update entities in `src/domain/entities/`
- Place shared types in `src/types/`

**Important:** Domain code must NOT import from `infra/`, `api/`, or `ui/`. It only knows about port interfaces.

Reference `references/wiring-patterns.ts` for dependency injection examples.

### Step 3: Implement Infrastructure Layer

Build concrete implementations of the ports based on the project's database choice:

#### For Prisma (PostgreSQL / MySQL / SQLite)

1. **Update Prisma schema** — Add or modify models in `prisma/schema.prisma`
2. **Run migration** — `npx prisma migrate dev --name [feature-name]`
3. **Generate client** — `npx prisma generate`
4. **Create repository** — Implement the port using `PrismaClient` in `src/infra/repositories/`

#### For MongoDB (Mongoose)

1. **Create model** — Define Mongoose schema in `src/infra/models/`
2. **Create repository** — Implement the port using the model in `src/infra/repositories/`

#### For MongoDB (Native Driver)

1. **Create repository** — Implement the port using `Collection` in `src/infra/repositories/`

Key principle: Infrastructure errors should be translated to domain-level errors before crossing the boundary.

Reference `references/database-adapters.md` for complete implementation patterns.

### Step 4: Implement API Layer

Build Express routes and controllers:

- Create route file in `src/api/routes/`
- Create controller in `src/api/controllers/`
- Add input validation middleware in `src/api/validators/`
- Wire the use case with its dependencies in the controller
- Map use case errors to HTTP responses

Follow RESTful conventions:
- `POST` for creation, `GET` for retrieval, `PUT/PATCH` for updates, `DELETE` for removal
- Return appropriate status codes (201 created, 200 ok, 404 not found, 422 unprocessable)

### Step 5: Implement UI Layer

Build React components for the feature. Invoke the `frontend-design` skill for complex UI work.

- Create page component in `src/ui/pages/`
- Create reusable components in `src/ui/components/`
- Build custom hooks in `src/ui/hooks/` for data fetching and state
- Create API client functions in `src/ui/services/`

Guidelines:
- Use the `feature-dev` skill for guided implementation of complex features
- Keep components focused — one responsibility per component
- Extract business logic into hooks, keep components presentational
- Handle loading, error, and empty states

### Step 6: Wire Dependencies

Connect all layers together at the composition root (`src/app.ts`):

- Initialize database connection (Prisma or Mongoose/MongoClient)
- Create repository instances with database dependencies
- Wire repositories into use case factories → get executor functions
- Wire executors into controllers
- Connect controllers to Express router
- Register routes in the main app

Reference `references/wiring-patterns.ts` for the full wiring example.

### Step 7: Smoke Check

Verify the feature works end-to-end:

- Start the development server
- Test the API endpoint with a manual request
- Verify the UI renders and interacts correctly
- Check database for correct data persistence
- For Prisma: `npx prisma studio` to browse data visually

## Ralph Loop Integration (Optional)

If the `ralph-loop` skill is available, use it for iterative implementation with this prompt template:

```
/ralph-loop "Implement the [FEATURE_NAME] feature following Clean Architecture.
Use case spec is in src/domain/use-cases/[name].ts.
Implement: [Prisma/Mongoose] repository adapter, Express route + controller, React page + components.
Output <promise>IMPLEMENTED</promise> when the feature compiles and the dev server runs without errors." --max-iterations 15
```

## Composing with Other Skills

| Skill | When to Invoke |
|-------|----------------|
| `feature-dev` | For guided, multi-step implementation with complex business logic (if available) |
| `frontend-design` | For visual design, styling, and polished React UI components (if available) |
| `develop-flutter` | For Flutter/Dart feature development (BLoC, Riverpod, Clean Architecture) |
| `setup-infra` | If database connection fails or environment is not configured |

## Additional Resources

### Reference Files

- **`references/layer-structure.md`** — Detailed folder layout per layer, file naming conventions, and import rules with pragmatic boundaries
- **`references/wiring-patterns.ts`** — Complete dependency injection examples showing how to wire function-based use cases to Express routes with MongoDB repositories
- **`references/database-adapters.md`** — Multi-database repository implementations for PostgreSQL (Prisma), MongoDB (Mongoose + native driver), MySQL (Prisma), and SQLite (Prisma)
