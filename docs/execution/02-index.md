# 02 — Execution Index

Quick reference for the entire build. Read `00-phasing.md` for phase definitions and parallelism caps. Read `01-agent-workflow.md` for the task brief format, `/goal` outer loop, and reviewer protocol. Copy-paste `/goal` commands are in `03-goal-commands.md`. Full phase detail is in `04-phase-1.md` through `08-phase-5.md`.

---

## Quick reference

| Phase | Wave | Pattern | Tool | Agent cap |
|---|---|---|---|---|
| 1 | 1.0 foundation | Deep / serial | Goal per task | 1 |
| 1 | 1.1–1.4 deploy | Deep / IaC ordered | Goal per task | 1–2 |
| 2 | 2.0 fixtures + mocks | Deep / serial | Goal per task | 1 |
| 2 | 2.1 app shell | Deep / single | Goal | 1 |
| **2** | **2.2 screens** | **Wide / parallel** | **Workflow** | **9** |
| 3 | 3.0 auth + RBAC | Deep / serial | Goal per task | 1 |
| **3** | **3.1 feature APIs** | **Wide / parallel** | **Workflow** | **7** |
| 3 | 3.2 state machine + events | Deep / ordered | Goal per task | 1 |
| 3 | 3.3–3.4 GraphQL, roles | Deep / ordered | Goal per task | 1 |
| 4 | 4.0 client config | Deep / single | Goal | 1 |
| **4** | **4.1 screen wiring** | **Wide / parallel** | **Workflow** | **9** |
| 4 | 4.2–4.3 subscription verify + cleanup | Manual | — | 1 |
| 5 | 5.0 tests + polish + smoke | Deep / parallel | Goal per task | 1–2 |

Workflows run exactly **three times** across the entire build: waves 2.2, 3.1, 4.1.
Everything else is a Goal loop or a single manual session.

---

## Tool-selection rules

Use a **Workflow** when all of these are true:
- Tasks are mutually parallel-safe (no shared file scope).
- There are 5 or more tasks in the wave.
- Tasks are known in advance and listed in the wave's task array.

Use a **`/goal`** for everything else:
- Single sequential tasks.
- Ordered sub-waves where task N+1 depends on task N.
- Any task where the file scope overlaps with another in-flight task.

Never wrap an entire phase in one Workflow script. One Workflow per wave.

---

## Token guard rules

These apply to every `/goal` and every Workflow invocation.

1. **Scope the prompt to the task.** Every agent reads only the guardrail chapters and files that are in scope for that task. Never tell an agent to "read the whole codebase" or "look at all guardrails."

2. **Workflow hard caps.** Each Workflow script enforces the concurrency cap from `00-phasing.md` using `parallel()` with a fixed array, not an unbounded loop.

3. **No budget loops in coding Workflows.** Budget loops (`while budget.remaining()`) are for research and discovery tasks, not for building known-scope tasks. All three CrewMate Workflows run a single parallel fan-out — no iterative accumulation.

4. **One Workflow per wave, not per phase.** Wave 2.2 is one Workflow run. Wave 3.1 is another. Never wrap an entire phase in one Workflow script.

5. **Goal exit conditions are verifiable commands.** Each `/goal` condition ends with a shell command that exits 0. This lets the evaluator check deterministically rather than reading through prose.

6. **Compact before phase gates.** Before you review the gate output, run `/compact` to free context for the next phase. Phase gates are the natural compaction points.

7. **Turn cap.** Every `/goal` includes "or stop after N turns." Use 20 turns for a single-task goal and 30 turns for a Workflow-wave goal.

---

## Reusable patterns

### Resuming a failed Workflow

Each Workflow run has an ID shown in `/workflows`. If a session ends mid-run:

```
/workflows → find the run → resume
```

Cached agent results are replayed instantly. Only failed or new agents re-run.
If an agent produced a partial result, check the branch it was working on before resuming.

### Rerunning a single failed screen or module

If one agent in a Workflow fails, you do not need to re-run the whole Workflow.
Note the failed label from the log output and run a single Goal for that task:

```
/goal
Redo the <label> task from wave <N>. [Paste the original agent prompt here.]
— or stop after 20 turns
```

### Compact checkpoints

Run `/compact` at every phase gate — not mid-phase. Compacting mid-phase drops context that in-flight agents may still need. The phase gate is the designed stopping point.

### When an agent drifts out of scope

The reviewer checks `Files in scope` per `01-agent-workflow.md`. If an agent edits files outside its scope, reject the PR and restart that task with a tighter scope line in the prompt. Do not patch out-of-scope changes manually — it hides the drift from the review trail.

### GSD state reset after escalation

If an agent is escalated and the human resolves the issue manually, update `.planning/STATE.md` to mark the task as done before resuming the next `/goal`. Write a `HANDOFF.json` with `{"taskId":"<id>","resolvedBy":"human","note":"<brief description>"}` so the audit trail is complete.
