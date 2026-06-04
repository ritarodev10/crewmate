# Execution

How the build actually runs. This directory complements `docs/FEATURES.md` (what ships) and `docs/BUILD.md` (the task catalog) with two things those don't cover.

1. The *order* in which the tasks execute, optimized for human review at each gate.
2. The *mechanics* of running a swarm of AI agents safely (branches, worktrees, code review, merge).

## Files

| # | File | What's in it |
|---|---|---|
| 00 | [`00-phasing.md`](./00-phasing.md) | The five phases. Phase 1 ships the deploy infrastructure plus a skeleton deploy; phases 2 through 4 push to prod on every merge; phase 5 is tests and polish. Explicit gates the human reviews before the next phase starts. |
| 01 | [`01-agent-workflow.md`](./01-agent-workflow.md) | How to dispatch agents at scale. Branching, worktrees, parallelism caps, code review policy, merge procedure, failure handling. Also covers the `/goal` outer loop, GSD integration, and the code-review-before-commit rule. |
| 02 | [`02-index.md`](./02-index.md) | Quick reference table (phase / wave / tool / agent cap), tool-selection rules, token guard rules, and reusable patterns (resuming workflows, single retries, compact checkpoints). |
| 03 | [`03-goal-commands.md`](./03-goal-commands.md) | Copy-paste `/goal` cheat sheet. One entry per phase and wave. Paste a block into Claude Code and press Enter. |
| 04 | [`04-phase-1.md`](./04-phase-1.md) | Phase 1 — Foundation and skeleton deploy. All waves, tasks, `/goal` prompts, and the phase gate. |
| 05 | [`05-phase-2.md`](./05-phase-2.md) | Phase 2 — UI with dummy data. All waves, tasks, `/goal` prompts, Workflow script, and the phase gate. |
| 06 | [`06-phase-3.md`](./06-phase-3.md) | Phase 3 — Backend implementation. All waves, tasks, `/goal` prompts, Workflow script, and the phase gate. |
| 07 | [`07-phase-4.md`](./07-phase-4.md) | Phase 4 — Wire UI to backend. All waves, tasks, `/goal` prompts, Workflow script, and the phase gate. |
| 08 | [`08-phase-5.md`](./08-phase-5.md) | Phase 5 — Tests and final polish. All waves, tasks, `/goal` prompts, and the phase gate. |

## The big idea

Two ideas working together.

1. **Deploy first.** Phase 1 ships the deploy infrastructure plus an empty shell. From phase 2 onward every merge to `main` pushes to `https://crewmate.ritaro.dev`, so the gate review for every later phase happens on the live URL, not on `localhost`. This eliminates the "everything works locally, deploy breaks on the last day" failure mode that plagues portfolio builds.
2. **UI before backend.** The whole UI is visible against dummy data before any backend code is real. You review every screen, every state, every interaction on the live URL before approving backend work. UI and backend agents fan out cleanly across many parallel workers because they share no file dependencies in the early phases.

## Execution tools

Three tools are combined.

- **`/goal` outer loop** — used for all sequential tasks. Set a verifiable condition; Claude works until that condition is met or 20–30 turns elapse.
- **Claude Code `Workflow` tool** — used for exactly three parallel waves where speed matters: wave 2.2 (9 screens), wave 3.1 (7 API modules), wave 4.1 (9 screen wirings). One Workflow script per wave.
- **GSD** — manages task state across `/goal` sessions. `.planning/` must exist before running any goal. GSD reads these files to generate the `.planning/` structure.

## The five phases

| Phase | Goal | Gate the human reviews |
|---|---|---|
| 1, Foundation + skeleton deploy | Monorepo boots locally, schema in place, both apps render placeholder pages, AWS + Cloudflare infrastructure provisioned, two deploy workflows live, first production deploy serves the placeholder at `https://crewmate.ritaro.dev`. | Visit the live URL; placeholder loads; `/api/healthz` returns 200 through the Worker proxy. |
| 2, UI with dummy data | Every route renders against fixtures shaped by the Prisma schema. No real backend wiring. Each merge auto-deploys to prod. | Click through every route on the live URL. Approve the visual design. |
| 3, Backend implementation | Every API endpoint and worker functions against `curl` on the live api. No UI changes. Each merge auto-deploys. | Hit every documented endpoint on `https://crewmate.ritaro.dev/api/*` and confirm shape matches. |
| 4, Wire UI to backend | Replace mock query handlers with real Apollo and TanStack hooks. Each merge auto-deploys. | Walk the full happy path on the live URL. |
| 5, Tests and final polish | Critical-path tests, polish from review. Production has been live since phase 1; phase 5 verifies and hardens. | `pnpm test` green in CI; production smoke passes. |

A phase does not begin until the previous phase's gate is signed off.

## Why UI-first

The default order would be backend-first, then UI. That works but it has two failure modes for a portfolio build.

- The visual design is only known to be correct after backend work has already been done. If a screen needs a rethink, backend work has to follow.
- Backend and UI agents step on each other when the boundary is being defined. DTOs change, types ripple, both sides edit shared contracts.

Doing UI-first against fixtures fixes both. The Prisma schema is the contract; the fixtures are typed against it; the UI is built against typed fixtures; the backend is built against the same typed contract. Both sides converge on the same shape but in two independent passes.

## Why a gate after every phase

Hundreds of agents can produce hundreds of merged PRs in a short window. Without explicit human gates between phases, the only signal of whether the swarm did the right thing is the final running app. By then, course-correction is expensive.

A gate is cheap. It's a `pnpm dev` and a click-through. The reviewer (you) approves or rejects. If approved, the next phase fans out. If rejected, a small targeted set of agents addresses the specific issues, and you re-review.

## How to use this directory

| You want to | Read |
|---|---|
| Understand the order of execution and what each phase produces | `00-phasing.md` |
| Set up and run agents safely at scale | `01-agent-workflow.md` |
| Get a quick phase/wave/tool overview | `02-index.md` |
| Find copy-paste `/goal` commands | `03-goal-commands.md` |
| Run a specific phase end-to-end | `04-phase-1.md` through `08-phase-5.md` |
| Find the task-level detail (file paths, acceptance commands) | `docs/BUILD.md` |
| Find what each feature is supposed to do | `docs/FEATURES.md` |
| Find the visual contract for any UI | `docs/guardrails/frontend/` and `docs/images/ui/` |
| Find the rules every agent must respect | `docs/guardrails/shared/AGENT.md` |

## Status

This is the canonical execution model for the CrewMate v0.1 build. If the build deviates from it (a phase compresses, a gate is skipped, the parallelism cap changes), update this directory in the same PR that introduces the deviation. The phasing doc and the build plan are designed to stay in sync.
