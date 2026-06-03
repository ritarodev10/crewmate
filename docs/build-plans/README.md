# Build Plans

Three executable plans for building CrewMate from zero, scaling from a thin MVP to a fully production-ready system. Each plan is designed to be picked up by a swarm of AI coding agents working in parallel.

Pick a plan based on how much you want to ship, how many parallel agents you can run, and how long the agents have to work.

## Quick comparison

| Plan | Scope | Wall-clock | Parallel agents | Tasks |
|---|---|---|---|---|
| [v1 — MVP](./v1-mvp.md) | Thinnest working slice. Auth, jobs, status flow, basic dispatch table, worker list view. Single-tenant. | 4-6h | 2-3 | ~18 |
| [v2 — Portfolio](./v2-portfolio.md) | Full v0.1 spec from the main README. Multi-tenant, 4-layer RBAC, realtime board, webhook spine, all 8 UI screens. | 10-14h | 6-10 | ~45 |
| [v3 — Production](./v3-production.md) | v0.1 plus v0.2 RBAC, billing, real email/SMS, PWA worker app, AWS IaC, full observability, deploy pipeline. | 18-24h with proper fan-out | 15-20 | ~95 |

**Honest framing.** v1 fits in a quiet evening. v2 fits in a long night with 6-10 agents. v3 is realistically achievable in one night only if you can sustain 15-20 parallel agents with a coordinator that respects the dependency waves. Compress v3 into a smaller swarm and it spills into a second day.

## Version policy for the stack

The plans target latest stable as of June 2026. Pin nothing manually. The executing agent should resolve versions at install time using `pnpm view <pkg> version` and prefer `pnpm add <pkg>@latest`.

Each plan notes the major versions it assumes so an agent can flag any breaking change in a newer major before adopting it. Current targets:

| Tool | Assumed major |
|---|---|
| Node | 22 LTS |
| pnpm | 10 |
| TypeScript | 5.6+ |
| NestJS | 11 |
| Next.js | 15 (App Router) |
| React | 19 |
| Prisma | 6 |
| PostgreSQL | 17 |
| Redis | 7.4+ |
| Tailwind CSS | 4 |
| Apollo Client | 4 |
| BullMQ | 5 |
| Jest | 30 (or vitest if cleaner) |
| pino | 9 |
| OpenTelemetry (Node SDK) | 1.x |

If a newer major exists at install time and the agent has not seen breaking changes flagged in its training, the agent should use the newer major and add a one-line entry to `docs/STACK-NOTES.md` recording the bump.

## How each plan is structured

Every plan has the same shape.

1. **Goal.** What's in scope and what's deliberately out, in one paragraph.
2. **Tech stack.** Exact versions and any non-obvious choices for this plan.
3. **Phases (waves).** Tasks inside a wave are parallel-safe. Each new wave depends on the prior wave completing.
4. **Tasks.** Discrete units sized to ~1-4 hours of focused agent work. Each task names its owner-agent type, files it touches, dependencies, and an acceptance check.
5. **Acceptance.** What "done" looks like for the whole plan. One command or check the human runs to confirm.

Task card format used throughout:

```
### T-NNN — Title
Owner: <agent-type>
Depends on: T-XXX, T-YYY
Effort: ~Xh
Files: <paths the task touches or creates>
Steps:
  1. ...
  2. ...
Acceptance: <command or check>
```

## Recommended agent mix

| Plan | Agent mix |
|---|---|
| v1 | 1 backend-dev, 1 frontend-dev, 1 generalist for wiring and tests |
| v2 | 2-3 backend-dev, 2-3 frontend-dev, 1 code-reviewer, 1 explorer, 1 perf-tester |
| v3 | 4-5 backend-dev, 3-4 frontend-dev, 2 code-reviewer, 1 debugger, 1 perf-tester, 1 image-generator, 2 generalist |

The orchestrator (you, or a coordinator agent) reads the plan, checks current state against the dependency graph, and dispatches the next available task to a free agent. Tasks are deliberately small so a stuck agent on one task does not block fifteen others behind it.

## Shared context every agent must read first

Every agent picked up to execute a task should attach these files at the start of its context. Non-negotiable.

- `nestjs-ai-guardrails/` (all 10 files plus `AGENT.md`). Architecture rules, conventions, RBAC model, testing patterns, security boundaries.
- `prisma/schema.prisma`. Data model is already designed. Do not invent new shapes.
- `docs/AGENT-SETUP.md`. Env vars, secrets, what's available locally.
- `docs/images/`. UI visual contract for any frontend work. The rendered screens are the spec.
- The plan file the task lives in.

If those files contradict the plan, the guardrails win. Update the plan to match the guardrails, not the other way around.

## How tasks finish

A task is done when:

1. All files listed under `Files:` exist with correct content.
2. The `Acceptance:` command exits 0 or its check passes.
3. `pnpm lint && pnpm typecheck` is clean for any package the task touched.
4. New code has tests at the appropriate level. Service or business logic gets a unit test. New endpoints get an e2e test. UI gets at least one smoke test that the page renders.
5. The agent committed the work as a single atomic commit with a conventional-commits message referencing the task id (`feat(api): T-014 add job status transition endpoint`).

If any of those five fails, the task is not done, and the orchestrator must not dispatch the next dependent task until it is.
