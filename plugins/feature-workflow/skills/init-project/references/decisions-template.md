# Decision Log — {{PROJECT_NAME}}

> Significant product and technical decisions are logged here by the Product Manager agent.

---

### DEC-001: Project Initialization

- **Date:** {{INIT_DATE}}
- **Context:** Setting up project infrastructure for team collaboration
- **Decision:** Use the feature-workflow plugin with `.product/` directory for requirements tracking and `.claude/agents/` for team agent definitions
- **Rationale:** Provides session continuity, team coordination, and multi-user collaboration through git-tracked markdown files
- **Alternatives Considered:** External project management tools (Jira, Linear) — rejected because they don't integrate with Claude Code's agent system
- **Impact:** All team members must use `/resume` at session start and `/save-progress` at session end to maintain continuity

---

### DEC-002: Database Selection

- **Date:** {{INIT_DATE}}
- **Context:** Choosing the primary database and ORM for the project
- **Decision:** {{DATABASE_NAME}} with {{ORM_NAME}}
- **Rationale:** {{DATABASE_RATIONALE}}
- **Alternatives Considered:** {{DATABASE_ALTERNATIVES}}
- **Impact:** Infrastructure layer uses {{ORM_NAME}} adapters. Connection string stored in `.env` as `DATABASE_URL`. The `/develop` skill will generate {{ORM_NAME}}-based repository implementations.

---

### DEC-003: Deployment Targets

- **Date:** {{INIT_DATE}}
- **Context:** Choosing hosting platforms for frontend, backend, and database
- **Decision:** Frontend → {{FRONTEND_HOST}}, Backend → {{BACKEND_HOST}}, Database → {{DB_HOST}}
- **Rationale:** {{DEPLOY_RATIONALE}}
- **Alternatives Considered:** {{DEPLOY_ALTERNATIVES}}
- **Impact:** The `/deploy` skill will use these targets. The `/setup-infra` skill will validate CLI tools and credentials for these platforms.

---

### DEC-004: Flutter State Management

> Only included if the project uses Flutter.

- **Date:** {{INIT_DATE}}
- **Context:** Choosing the state management approach for the Flutter application
- **Decision:** {{STATE_MANAGEMENT}} (flutter_bloc / riverpod / provider)
- **Rationale:** {{STATE_MANAGEMENT_RATIONALE}}
- **Alternatives Considered:** {{STATE_MANAGEMENT_ALTERNATIVES}}
- **Impact:** The `/develop-flutter` skill will generate {{STATE_MANAGEMENT}}-based presentation layer code. Target platforms: {{FLUTTER_PLATFORMS}}. The `/test` skill will use {{STATE_MANAGEMENT}}-specific test utilities (e.g., `bloc_test` for BLoC).
