# 01 — Agent workflow

How a swarm of AI coding agents executes the phasing safely. Each task is one agent, one branch, one PR. Agents work in isolated git worktrees so parallel agents do not step on each other's working copies. A reviewer agent approves the PR before merge. The orchestrator (you, or a coordinator agent) manages dispatch, parallelism caps, and gate approval.

## The five primitives

| Primitive | Purpose |
|---|---|
| Task | One unit of work from `docs/BUILD.md`. One agent, one branch, one PR. |
| Branch | `task/p<phase>-F-<NNN>-<slug>` from `main`, or `task/p<phase>-<slug>` for non-feature work. Atomic. |
| Worktree | Isolated checkout under `.worktrees/`. Lets parallel agents share the repo without stepping on each other. |
| Reviewer agent | Different agent from the implementer. Reads the diff plus the task brief plus the guardrails. Approves or requests changes. |
| Orchestrator | Picks the next ready task, creates the worktree, dispatches the agent, runs the reviewer, merges on approval, removes the worktree. |

## Outer execution loop

`/goal` is the outer loop for all sequential tasks. Set it once with a verifiable condition; Claude works turn by turn until the condition is met, then stops.

**Goal condition anatomy.** Every `/goal` condition must include:
1. An acceptance command that exits 0 (or a concrete check that passes).
2. "code-reviewer subagent returns no blocking issues" (see section below).
3. "change is committed to `<branch-name>`".
4. "or stop after N turns" — always include a turn cap to prevent runaway loops. Use 20 turns for a single-task goal and 30 turns for a Workflow wave.

Example skeleton for a sequential task:

```
/goal
<task description>. Done when:
- <acceptance command> exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p<N>-<slug>
— or stop after 20 turns
```

**Parallel waves inside a `/goal`.** For waves 2.2, 3.1, and 4.1 the `/goal` wraps the Workflow run rather than a single task. The condition says "Workflow for wave X runs to completion: all N agents commit their branches, pnpm build exits 0 — or stop after 30 turns." The Workflow tool runs inside a single `/goal` turn.

**GSD integration.** Before starting any task within a `/goal` turn:
1. Read `.planning/STATE.md` to find the current task ID and status.
2. On task complete, mark the task done in STATE.md and write a `HANDOFF.json` in the worktree with keys `taskId`, `branch`, `featuresRealized`, `acceptanceResult`.

GSD reads these files to track progress across sessions and generate task briefs. `.planning/` must exist before running any goal. Run GSD initialization (a one-time step) before phase 1.

## Code review before commit

Within every `/goal` turn, before committing any change:

1. Spawn a `code-reviewer` subagent on the diff of the current branch against `main`.
2. The reviewer checks scope, lint, typecheck, tests, guardrails, acceptance, style, and commit message format per the table in the "Code review" section below.
3. If the reviewer returns PASS or only non-blocking notes, commit the change.
4. If the reviewer returns any BLOCKING issue, fix the issue in the same turn, re-run the reviewer, then commit.
5. Never commit over a blocking review finding. If two fix attempts still produce a blocking finding, stop and escalate to the human.

The `/goal` condition must include "code-reviewer subagent returns no blocking issues" as an explicit exit criterion. If the reviewer is not passing, the goal condition is not met and `/goal` keeps the loop open.

## Branch naming

`task/p<phase>-F-<NNN>-<slug>` for feature work, `task/p<phase>-<slug>` for foundation or infrastructure work that does not realize a specific feature.

Examples.
- `task/p1-foundation-pnpm-workspace`
- `task/p2-F-031-dispatch-board`
- `task/p3-F-023-jobs-api`
- `task/p5-infra-terraform-network`

The phase prefix makes it obvious at a glance which phase the branch belongs to. The orchestrator filters on it. Stale branches outside the current phase signal failures to investigate. The `F-NNN` segment, when present, references the feature in `docs/FEATURES.md` so the trail back to acceptance is direct.

## Worktrees, not shared workspace

Each agent works in its own git worktree under `.worktrees/<branch-suffix>`. This is the critical isolation primitive when running many agents in parallel.

Setup.

```bash
git worktree add .worktrees/p2-F-031-dispatch-board \
  -b task/p2-F-031-dispatch-board main
cd .worktrees/p2-F-031-dispatch-board
# the agent works here, sees only this checkout
```

Teardown after merge.

```bash
git worktree remove .worktrees/p2-F-031-dispatch-board
git branch -d task/p2-F-031-dispatch-board   # branch already squash-merged
```

Worktrees share the same `.git/` so they are cheap to create and tear down. Disk cost is one working copy per active worktree. With a parallelism cap of 9 in phase 2, that's 9 working copies on disk peak.

The orchestrator creates the worktree before dispatching the agent and removes it after the merge succeeds. Failed worktrees are left in place for human inspection.

`.worktrees/` is git-ignored so the working copies don't accidentally end up tracked. Add `.worktrees/` to `.gitignore` once (a one-line addition) and it's done.

## Task brief

The orchestrator writes a task brief into the worktree at `.task-brief.md` before dispatching the agent. The brief is the agent's primary context. It references the relevant layer in `docs/BUILD.md`, the features in `docs/FEATURES.md`, the relevant guardrails, and the in-scope files.

Brief template.

```markdown
# <title>

**Phase:** <N>
**GSD task ID:** <p<N>-t<N>>
**Owner agent type:** backend-dev | frontend-dev | generalist
**Realizes:** F-<NNN>[, F-<NNN>]
**Branch:** task/p<N>-F-<NNN>-<slug>     (or task/p<N>-<slug> for non-feature work)
**Worktree:** .worktrees/p<N>-F-<NNN>-<slug>

## Read first
- docs/guardrails/shared/AGENT.md
- docs/guardrails/<domain>/README.md
- <specific chapters relevant to this task>
- docs/FEATURES.md (the features this task realizes)
- docs/BUILD.md (the architectural layer this task implements)

## Files in scope
- <exact paths you may create or modify>

## Files explicitly out of scope
- <everything else; touching them fails review>

## Steps
1. ...
2. ...

## Acceptance
<command that exits 0, or a check that passes>

## Commit
Squash. Message format:
<type>(<scope>): <title>

Realizes: F-<NNN>
Phase: <N>
```

The brief never duplicates the spec; it references it. The orchestrator generates the brief by reading the feature card in `docs/FEATURES.md`, the relevant section of `docs/BUILD.md`, and the phase from `docs/execution/00-phasing.md`. GSD uses the `GSD task ID` field to link the brief to `.planning/STATE.md`.

## Concurrency cap per phase

The cap depends on the phase. The orchestrator enforces it; agents do not police themselves.

| Phase | Cap | Reason |
|---|---|---|
| 1 | 3 | Many tasks share root configs |
| 2 | 9 | UI screens own different route folders, no file overlap |
| 3 | 7 | Backend feature modules own different module folders |
| 4 | 9 | Per-screen wiring |
| 5 | 3 | IaC modules have ordering constraints |

If a phase is over-capped (a new task is ready but all slots are full), the orchestrator queues it. Tasks do not start until a slot frees up.

The cap is a ceiling, not a target. If only 3 tasks are ready and parallel-safe, run 3, not 9. Idle slots are fine.

## File-scope conflict detection

Before dispatch, the orchestrator checks that no in-flight task lists overlapping files. If two ready tasks both want to modify `apps/web/src/app/layout.tsx`, the second one waits.

This requires every task brief to declare its `Files in scope` precisely. The reviewer agent enforces this (any out-of-scope modification fails review). The build plan tasks already list files; the orchestrator parses them.

## Code review

Every PR is reviewed by a reviewer agent before merge. The reviewer is a different agent from the implementer.

The reviewer reads the diff, the task brief, and the guardrails the task referenced. The reviewer also has read access to the rest of the repo for cross-references.

The reviewer checks.

| Check | Pass criterion |
|---|---|
| Scope | Diff touches only files listed in the task brief's "Files in scope". |
| Lint | `pnpm lint` clean on the touched packages. |
| Typecheck | `pnpm typecheck` clean on the touched packages. |
| Tests | `pnpm test` passes. New behavior has tests at the appropriate level per `docs/guardrails/backend/03-testing.md` or the relevant chapter. |
| Guardrails | Diff does not violate `docs/guardrails/shared/AGENT.md`. Specifically: no tokens or components invented; no silent `try { } catch {}`; no clickable divs; tenant-scoped queries enforced; etc. |
| Acceptance | The task brief's acceptance command exits 0 or the check passes. |
| Style | No em dashes in prose, no colons in prose, restrained bolding, sentence case (for any markdown the task writes; not for code identifiers). |
| Commit message | Conventional commits, references the realized F-NNN features and the phase. |

If any check fails, the reviewer requests changes by writing a `REVIEW.md` in the worktree. The implementer agent gets one revision pass. If the second pass fails, the orchestrator escalates to the human.

If all checks pass, the reviewer writes an `APPROVED.md` with a one-line summary, the features realized, and the line count of the diff.

## Squash merge

```bash
# from the main repo (not the worktree)
gh pr merge --squash --delete-branch task/p2-F-031-dispatch-board
git worktree remove .worktrees/p2-F-031-dispatch-board
```

Squash means each merged commit represents a complete unit of work and shows up cleanly in the log. The branch is deleted on merge. The worktree is removed.

The merged commit message comes from the task brief's commit template, filled in by the implementer.

```
feat(web): dispatch board kanban with realtime updates

Realizes: F-031, F-032
Phase: 2
```

## Failure handling

Agents fail. The workflow assumes they will.

| Failure | Handling |
|---|---|
| Implementer agent's diff fails reviewer checks twice | Orchestrator escalates. Branch and worktree retained for human inspection. |
| Implementer agent runs longer than 2× the estimated effort | Orchestrator interrupts. Branch retained. Human decides to extend, reassign, or split. |
| Implementer agent modifies files outside its scope | Reviewer rejects. Implementer must revert the out-of-scope change before resubmitting. |
| Two PRs touch the same file concurrently | Should not happen with scope-correct task briefs. If it does, the second merge fails. Orchestrator rebases or escalates. |
| Post-merge CI fails on `main` | Orchestrator pauses all in-flight tasks in the same phase. Human investigates. |
| Reviewer agent disagrees with itself across revisions | Treat the second review as authoritative. If the second pass passes, merge. If it fails, escalate. |

Escalation means stop, leave artifacts, ping the human. The human inspects the branch, the brief, the review notes, and decides what to do.

## Resumption after stop

If you stop the swarm mid-phase, resumption is.

1. `git branch --list 'task/*'` to see what was in flight.
2. Read `.planning/STATE.md` to see which GSD task IDs are in-progress vs done.
3. For each branch, look at the worktree. If the agent finished, run the reviewer on the branch. If the agent did not finish, decide to restart or discard.
4. Merge what passed. Drop what did not.
5. Continue from the next task in the phase.

The phasing is durable across restarts because each task is atomic. Nothing depends on in-memory state. GSD STATE.md persists across sessions.

## Approving a phase gate

Phase gates are reviewed by the human, not by an agent. The orchestrator pauses at the gate and reports.

```
Phase 2 complete.
- 13 tasks merged.
- 9 agents at peak concurrency.
- ~5h 12m wall-clock.
- 0 escalations.

Gate: review every UI route at https://crewmate.ritaro.dev.
Reply 'approved' to start phase 3.
Reply 'reject: <reasons>' to dispatch polish tasks in 2.3.
```

When a phase gate condition appears in the transcript (`PHASE_N_GATE`), stop and review before running the next `/goal`. The next phase's `/goal` is the human's signal to proceed.

If approved, the orchestrator advances to the next phase. If rejected, the orchestrator dispatches polish agents (wave 2.3) to address the specific reasons. The reviewer re-runs against each polish PR. The gate is re-presented after the polish wave.

## The minimum command set

For an orchestrator agent or a coordinator script.

```bash
# pick up next task
git checkout main
git pull

# create worktree
git worktree add .worktrees/p<N>-T-<NNN>-<slug> \
  -b task/p<N>-T-<NNN>-<slug> main

# write brief into the worktree
echo "<brief>" > .worktrees/p<N>-T-<NNN>-<slug>/.task-brief.md

# dispatch agent (pseudo, depends on your runner)
spawn-agent --type=<backend-dev|frontend-dev|generalist> \
  --brief=.worktrees/p<N>-T-<NNN>-<slug>/.task-brief.md \
  --workdir=.worktrees/p<N>-T-<NNN>-<slug>

# after agent reports done, reviewer agent
spawn-reviewer --branch=task/p<N>-T-<NNN>-<slug> \
  --brief=.worktrees/p<N>-T-<NNN>-<slug>/.task-brief.md

# on approval (APPROVED.md present)
gh pr create --base main --head task/p<N>-T-<NNN>-<slug> \
  --title "<commit title>" --body-file .worktrees/.../APPROVED.md
gh pr merge --squash --delete-branch task/p<N>-T-<NNN>-<slug>
git worktree remove .worktrees/p<N>-T-<NNN>-<slug>
```

In practice your runner will hide the worktree mechanics. The pattern is the contract.

## What the human does

Three roles.

1. Sign off each phase gate. Hard stop. The `PHASE_N_GATE` condition in the `/goal` transcript is the signal.
2. Escalation contact when the reviewer rejects twice or the orchestrator interrupts a long-running agent.
3. Adjust the task list when something shifts. Edit `docs/BUILD.md` if a task needs to split or reshape. Edit `docs/execution/00-phasing.md` if the phase order needs to change.

The orchestrator and reviewer handle the rest. The whole point of this workflow is that the human's time is spent on gates and adjustments, not on routine review of dozens of simple PRs.

## Cost summary

A v0.1 estimate. Wall-clock assumes the parallelism caps are saturated and reviewer agents run alongside implementers.

| Phase | Tasks | Agent hours, serial | Wall-clock with cap |
|---|---|---|---|
| 1 | ~15 | ~28h | ~10h |
| 2 | ~13 | ~28h | ~5-6h |
| 3 | ~17 | ~38h | ~6-8h |
| 4 | ~10 | ~14h | ~3h |
| 5 | ~5 | ~8h | ~3h |
| Total | ~60 | ~116h | ~27-30h |

Counting reviewer agent time, total is roughly 1.5× the implementer agent hours. Wall-clock figures assume the human is available to sign off gates within a reasonable window (a few hours per gate, not days).
