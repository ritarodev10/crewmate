# CrewMate Agents

Project-scoped agent personas for the CrewMate monorepo. Each agent loads its own convention files and is scoped to a specific area of responsibility.

---

## How to Use

Claude auto-routes to the best agent based on your message. To invoke explicitly: `@cm-backend implement GET /workers` or start a session with `--agent cm-orchestrator`.

---

## Agents

### Orchestration

| Agent | File | Role |
|---|---|---|
| `cm-orchestrator` | [cm-orchestrator.md](cm-orchestrator.md) | PM + Tech Lead. Primary chat and brainstorm partner. Knows the full product, PRD, roadmap, stack, and conventions. Delegates implementation to specialists. **Default agent.** |

### Planning

| Agent | File | Role |
|---|---|---|
| `cm-planner` | [cm-planner.md](cm-planner.md) | Creates detailed implementation plans from a feature or phase goal. Breaks work into waves, maps dependencies, writes to `.planning/`. |
| `cm-plan-reviewer` | [cm-plan-reviewer.md](cm-plan-reviewer.md) | Adversarial plan reviewer. Goal-backward analysis — blocks execution if a plan has gaps, wrong dependencies, or baked-in convention violations. |

### Implementation

| Agent | File | Role |
|---|---|---|
| `cm-frontend` | [cm-frontend.md](cm-frontend.md) | Next.js 15 + React 19 specialist. Works exclusively in `apps/web/`. Loads all frontend conventions. |
| `cm-backend` | [cm-backend.md](cm-backend.md) | NestJS 11 specialist. Works exclusively in `apps/api/`. Loads all backend conventions. |
| `cm-db` | [cm-db.md](cm-db.md) | Prisma + PostgreSQL specialist. Owns `prisma/schema.prisma`, migrations, and `prisma/seed.ts`. |

### Exploration

| Agent | File | Role |
|---|---|---|
| `cm-explorer` | [cm-explorer.md](cm-explorer.md) | Read-only codebase navigator. Answers "where is X defined", "what references Y", "how does Z flow". Never writes. Fast and cheap — use before implementing to understand current state. |

### Quality

| Agent | File | Role |
|---|---|---|
| `cm-reviewer` | [cm-reviewer.md](cm-reviewer.md) | Code reviewer. Checks output against all 19 convention files — naming, security, RBAC, performance, anti-patterns. Run before every PR merge. |
| `cm-tester` | [cm-tester.md](cm-tester.md) | Test writer. NestJS unit tests (service logic, revenue math, status transitions) and e2e health checks. |
| `cm-debug` | [cm-debug.md](cm-debug.md) | Bug investigator. Scientific method: reproduce → isolate → fix. Never jumps to a fix without understanding root cause. |

### Infrastructure

| Agent | File | Role |
|---|---|---|
| `cm-deploy` | [cm-deploy.md](cm-deploy.md) | Railway + Cloudflare Workers + GitHub Actions specialist. Owns deploy pipeline, CI/CD config, `railway.toml`, `wrangler.toml`. |
| `cm-imagegen` | [cm-imagegen.md](cm-imagegen.md) | Image generation specialist. Generates worker avatars, job before/after photos, and UI hero images from prompts in PHOTO-ASSETS.md. Runs in parallel batches by category. |

---

## Recommended Workflow

```
You
 └── cm-orchestrator    ← start here for everything
      ├── cm-explorer        understand the codebase first
      ├── cm-planner         draft the plan
      ├── cm-plan-reviewer   verify the plan
      ├── cm-backend  ─┐
      ├── cm-frontend  ├─ parallel implementation
      ├── cm-db       ─┘
      ├── cm-reviewer        check the output
      └── cm-tester          write tests
```

`cm-debug` and `cm-deploy` are on-demand — invoke when something breaks or when deploying.
`cm-explorer` is on-demand — invoke before planning or debugging to map unfamiliar territory.

---

## Model Assignment

| Model | Agents |
|---|---|
| claude-opus-4-8 | `cm-orchestrator` |
| claude-sonnet-4-6 | all others |
