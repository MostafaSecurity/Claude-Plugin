# Team Guide — {{PROJECT_NAME}}

> This guide is for human teammates who use Claude Code on this project.

## Prerequisites

Before you start, make sure you have:

- [ ] **Claude Code** installed with a Max plan
- [ ] **Agent teams enabled:** Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your Claude Code settings
- [ ] **feature-workflow plugin** installed: `claude plugin add github:a7mad3akef/feature-workflow`
- [ ] **Playwright MCP** configured (for QA agent browser testing)
- [ ] **`gh` CLI** authenticated (for DevOps agent PR creation): `gh auth login`
- [ ] **`gcloud` CLI** authenticated (for GCP deployments): `gcloud auth login`
- [ ] **`vercel` CLI** authenticated (for frontend deployments): `vercel login`

## Quick Start

1. **Clone the repo** — agents in `.claude/agents/` are auto-detected by Claude Code
2. **Run `/resume`** to see current project state
3. **Read `.product/backlog.md`** for what needs to be done
4. **Start working** — spawn agents as needed, or create a full team

## How to Use the System

### Starting a New Feature

Ask the BA agent to gather requirements:
> "Use the business-analyst agent to gather requirements for [feature name]"

Or create a full team for larger features:
> "Create a team to analyze and build [feature name]"

### Building a Feature

Frontend and Backend agents work in parallel:
> "Use the frontend-developer agent to build the UI for UC-001"
> "Use the backend-developer agent to implement the API for UC-001"

### Testing

QA agent writes and runs tests:
> "Use the qa-engineer agent to test UC-001 end-to-end"

### Shipping

DevOps agent handles the full pipeline:
> "Use the devops-engineer agent to ship the current changes to production"

### End of Session

**Always run `/save-progress` before ending your session.** This records:
- What you accomplished (auto-detected from git)
- What's in progress
- What the next person should work on

### Start of Session

**Always run `/resume` when starting.** This shows:
- Last session summary
- In-progress items
- Blockers
- Suggested next steps

## Important Conventions

- **Don't edit `.product/user-roles.md` manually** — use the BA agent
- **Don't reorder `.product/backlog.md` manually** — use the PM agent
- **Commit `.product/` changes alongside code changes** — they travel together
- **Always run `/save-progress` before ending** — the next person depends on it
- **Always run `/resume` when starting** — it loads full context

## Multi-User Workflow

When multiple people are working on the project:

1. Each person works on a **feature branch**
2. BA documents requirements on the feature branch
3. Developers build on the same branch (frontend and backend own separate directories)
4. QA tests on the branch before merge
5. DevOps ships after merge to main
6. Progress files track per-branch state (branch name is recorded in `progress.md`)

### Avoiding Conflicts

- `.product/progress.md` — Each person adds entries at the top, merge conflicts are rare
- `.product/user-roles.md` — Only the BA agent modifies this, coordinate who's adding requirements
- `.product/backlog.md` — Only the PM agent reorders, avoid manual edits
- Code files — Frontend and Backend agents own different directories, so conflicts are minimized

## Spawning a Full Team

For large features, you can spawn the complete team:

```
"Create a team with BA, PM, Frontend Dev, Backend Dev, QA, and DevOps to build [feature name]"
```

The team coordinates through:
- **Shared task list** — Created automatically with the team
- **Team messaging** — Agents communicate via the messaging system
- **`.product/` files** — Shared state that all agents read/write

## Getting Help

- **Product questions** → PM agent
- **Requirements questions** → BA agent
- **Frontend issues** → Frontend Dev agent
- **Backend/API issues** → Backend Dev agent
- **Test failures** → QA agent
- **Deployment issues** → DevOps agent
- **Claude Code help** → `/help`
