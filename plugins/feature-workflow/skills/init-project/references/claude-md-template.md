# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Product Documentation

The `.product/` directory contains all project management state:

| File | Purpose | Managed By |
|------|---------|------------|
| `.product/user-roles.md` | Requirements: user roles, use cases, acceptance criteria | Business Analyst agent |
| `.product/progress.md` | Session continuity: what was done, what's next | `/save-progress` skill |
| `.product/backlog.md` | Prioritized feature backlog | Product Manager agent |
| `.product/decisions.md` | Decision log with rationale | Product Manager agent |
| `.product/TEAM-GUIDE.md` | Onboarding guide for teammates | `/init-project` skill |

**At the start of every session**, read `.product/progress.md` to understand current state. Or run `/resume` for a formatted summary.

## Workflow

The standard feature development workflow:

1. `/resume` — Load session state and see what to work on
2. **BA agent** — Gather and document requirements in `user-roles.md`
3. **PM agent** — Review, prioritize, update `backlog.md`
4. `/use-case` — Define the business logic specification
5. `/develop` — Implement across all layers (domain, infra, API, UI)
6. `/test` — Write tests following the test pyramid
7. `/ship` — Commit, push, deploy, verify production
8. `/save-progress` — Record session state for next time

## Architecture

**Clean Architecture** with pragmatic boundaries:

```
src/
├── domain/         ← Business logic (use cases, entities, ports)
├── infra/          ← Implementations (database repos, external services)
├── api/            ← Express routes, controllers, validators
├── ui/             ← React components, pages, hooks, API clients
├── types/          ← Shared types (accessible by all layers)
└── utils/          ← Shared utilities (accessible by all layers)
```

**Import rules:** UI → API → Domain ← Infra. The `types/` and `utils/` directories are accessible from any layer.

## Tech Stack

{{TECH_STACK_LIST}}

## Flutter (If Applicable)

> Remove this section if the project does not use Flutter.

- **State Management:** {{FLUTTER_STATE_MANAGEMENT}} (BLoC / Riverpod / Provider)
- **Target Platforms:** {{FLUTTER_PLATFORMS}} (Android, iOS, Web)
- **DI:** get_it + injectable
- **Navigation:** go_router / auto_route
- **Architecture:** Clean Architecture with feature-based modules (`lib/features/`)
- **Use `/develop-flutter`** for Flutter feature implementation

## Database

- **Database:** {{DATABASE_NAME}}
- **ORM/Driver:** {{ORM_NAME}}
- **Connection:** `DATABASE_URL` in `.env` (see `.env.example` for format)

## Deployment Targets

| Component | Platform | Status |
|-----------|----------|--------|
| Frontend | {{FRONTEND_HOST}} | {{FRONTEND_STATUS}} |
| Backend | {{BACKEND_HOST}} | {{BACKEND_STATUS}} |
| Database | {{DB_HOST}} | {{DB_STATUS}} |

Run `/setup-infra` to validate environment and credentials. Run `/deploy` to deploy.

## Conventions

- **Use cases:** Pattern B — factory functions with injected dependencies
- **Commits:** Conventional Commits format (`feat:`, `fix:`, `refactor:`, etc.)
- **Tests:** Test pyramid — unit (Vitest) → integration (supertest) → component (RTL) → E2E (Playwright)
- **Business rules:** `BR-N` format — testable statements that map directly to unit tests
- **Acceptance criteria:** Given/When/Then with checkboxes — checked off by QA as tests pass
- **Secrets:** NEVER in git. Use `.env` for local, platform dashboards for production.

## Team Agents

Agent definitions are in `.claude/agents/` and are auto-detected by Claude Code:

| Agent | Role | Owns |
|-------|------|------|
| `product-manager` | Strategic oversight, prioritization | `.product/backlog.md`, `.product/decisions.md` |
| `business-analyst` | Requirements gathering | `.product/user-roles.md` |
| `frontend-developer` | UI implementation | `src/ui/`, `src/pages/`, `public/` |
| `backend-developer` | API and domain logic | `src/domain/`, `src/infra/`, `src/api/` |
| `flutter-developer` | Flutter/Dart mobile + web | `lib/`, `test/`, `android/`, `ios/` |
| `mobile-developer` | React Native mobile | `/mobile/` |
| `qa-engineer` | Testing and verification | Test files, acceptance criteria |
| `devops-engineer` | Git, deployment, verification | CI/CD pipeline |
