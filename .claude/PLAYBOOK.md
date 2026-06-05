# CrewMate — Build Playbook

How the agent stack fits together. Read this to pick the right tool for every scenario.

---

## Mental Model

Three layers stacked on top of each other:

| Layer | What it is | Examples |
|---|---|---|
| **Agents** | Specialists with full project context baked in via @file refs | cm-frontend, cm-backend, cm-orchestrator |
| **Skills** | Workflows an agent can invoke on demand | /plan, /wave-done, /track, /handoff |
| **Execution modes** | How agents are spawned and coordinated | Subagents, Agent Teams, Workflows, /goal |

cm-orchestrator sits at the top. It reads state, decides the approach, picks the execution mode, and delegates. You talk to it. It does or delegates everything else.

---

## Agents at a Glance

| Agent | Role | Spawn when |
|---|---|---|
| `cm-orchestrator` | PM + Tech Lead. Chat, decisions, wave runner | Default — always talking to this one |
| `cm-frontend` | Next.js 15, React, TanStack Query, Tailwind, shadcn/ui | Any work in `apps/web/` |
| `cm-backend` | NestJS, Prisma, JWT, WebSockets | Any work in `apps/api/` or `prisma/` |
| `cm-db` | Schema changes, migrations, seed data | Schema-only waves |
| `cm-reviewer` | Convention review — PASS/BLOCK verdict | Before every wave merge |
| `cm-tester` | Unit tests, e2e, Playwright | After implementation |
| `cm-debug` | Bug investigation, root cause isolation | Something is broken |
| `cm-planner` | Wave task breakdown → STATE.md | Before complex waves |
| `cm-plan-reviewer` | Adversarial plan check | After cm-planner on security-touching waves |
| `cm-deploy` | Railway + Cloudflare + CI/CD | Deploy pipeline work |
| `cm-imagegen` | Image generation via parallel-imagegen | Visual assets |
| `cm-explorer` | Read-only codebase search, never writes | Investigation only |

---

## Execution Modes

Four ways to run work. Pick based on complexity and whether agents need to talk to each other.

---

### 1 — Subagents (Agent tool) · Default

cm-orchestrator spawns an agent, it does work, reports back. Spawn multiple in the same message to run in parallel.

**Use when:**
- Single-domain work (pure backend OR pure frontend)
- Tasks where you only need the end result
- Sequential dependencies — one must finish before the next starts

```
"Implement GET /jobs"
→ cm-orchestrator spawns cm-backend (subagent)
→ cm-backend implements, returns result
→ cm-orchestrator reports back
```

✅ All `skills:` frontmatter applies in this mode.

---

### 2 — Agent Teams · Experimental

Multiple agents, each with its own context window, connected by a shared task list and direct messaging. Teammates can talk to each other without going through cm-orchestrator.

**Enable once:**
```json
// .claude/settings.json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

**Use when:**
- Full-stack feature where frontend and backend need to coordinate on API shapes
- Multi-lens review (security / conventions / performance running simultaneously)
- Competing debug hypotheses — multiple cm-debug instances testing different theories in parallel
- Phase 3 integration work where both layers change together

```
"Implement Phase 3 auth integration"
→ spawn cm-frontend + cm-backend as teammates
→ cm-frontend asks cm-backend: "what does POST /auth/login return?"
→ they coordinate directly — no orchestrator relay
```

⚠️ **`skills:` frontmatter does NOT apply when running as a teammate.** Teammates load skills from project/user settings instead. `tools:` allowlist, CLAUDE.md, and MCP servers DO apply. This is why CLAUDE.md matters.

❌ Not for: sequential tasks, same-file edits, simple single-domain work. Coordination overhead and token cost only pay off when agents genuinely need to talk.

**Best team size:** 3–5 teammates, 5–6 tasks per teammate.

---

### 3 — Workflows

Deterministic multi-agent scripts with parallel/pipeline execution, structured output schemas, progress tracking, and resume-from-checkpoint. Written in JS, run inline.

**Use when:**
- Wave needs structured output (e.g. parallel review with typed findings)
- Large fan-outs — review 20 files in parallel, each with the same schema
- Need failure recovery — resume from the last successful checkpoint

```javascript
const results = await parallel([
  () => agent("implement GET /jobs", { agentType: "cm-backend" }),
  () => agent("implement Jobs Kanban", { agentType: "cm-frontend" })
])
```

✅ More structured than subagents, more deterministic than agent teams. Higher setup cost.

---

### 4 — /goal · Autonomous Loop

Set a verifiable condition. After every turn, Haiku evaluates whether it's met. If not, Claude starts another turn automatically. Clears when done.

**Use when:**
- A wave has a clear, measurable end state
- You want unattended execution across multiple turns
- Combine with auto mode to remove all per-tool prompts

**Write conditions verifiable from Claude's own output:**
```
/goal all Phase 0 Wave 1 files exist and `docker-compose up` exits 0
/goal the Jobs Kanban renders 4 columns with mock data and no console errors
/goal all JobsService tests pass with `pnpm test --filter api`
```

**Rules for good conditions:**
- One measurable end state (test result, exit code, file count)
- State how Claude should prove it (`pnpm test` exits 0, `git status` is clean)
- Add a turn bound to prevent runaway loops: `or stop after 20 turns`

**After /goal clears:** run `/wave-done` + `/track session` + `/handoff`.

---

## Skills Reference

### cm-orchestrator — Session management

| Skill | When |
|---|---|
| `/plan "wave goal"` | Before any non-trivial wave — updates STATE.md with task breakdown |
| `/track active "task"` | When starting a task |
| `/track done "task"` | After each task completes |
| `/track add "task"` | Mid-wave new idea or bug — drops to `## Discovered` in STATE.md |
| `/track session "summary"` | End of every session, no exceptions |
| `/wave-done "wave name"` | After wave completes — generates summary + checks convention drift |
| `/handoff` | End of session — captures decisions, dead ends, constraints |
| `/deep-research` | When planning needs external context (library API, compatibility) |

### cm-frontend — Implementation quality

| Skill | What it adds |
|---|---|
| `frontend-design` | Design quality guidelines — portfolio-grade UI patterns |
| `make-interfaces-feel-better` | Polish — micro-interactions, spacing, feel |
| `dev-browser` | Fast render check without auth overhead |
| `playwriter` | Auth-gated flows, WebSocket timing, multi-step UI |
| `agent-browser` | Accessibility tree snapshot — fast render verification |
| `full-output-enforcement` | Always write complete files, never truncate |

### cm-backend — Implementation quality

| Skill | What it adds |
|---|---|
| `security-review` | Security pass inline with implementation |
| `full-output-enforcement` | Always write complete files, never truncate |

### cm-reviewer — Code review

Run all three on every wave before merging.

| Skill | What it checks |
|---|---|
| `code-review` | Correctness, reuse, efficiency |
| `security-review` | RBAC, JWT handling, input validation, operatorId scoping |
| `simplify` | Reuse and simplification — removes unnecessary complexity |

### cm-tester — Verification

| Skill | When |
|---|---|
| `playwriter` | Auth-gated flows, WebSocket events, multi-step sequences |
| `agent-browser` | Quick render verification, accessibility snapshot |
| `verify` | Confirms the change works in the running app |

### cm-debug — Bug investigation

| Skill | When |
|---|---|
| `dev-browser` | First step — snapshot actual browser state |
| `playwriter` | Reproduce timing-sensitive or auth-gated bugs |
| `agent-browser` | Fast accessibility tree check for render issues |

### cm-planner — Research

| Skill | When |
|---|---|
| `deep-research` | Library compatibility, API shape research, version migration |

---

## MCP Tools

Wire to agents via `tools:` frontmatter. Available in every session.

| MCP | Wire to | Use for |
|---|---|---|
| `mcp__postgres__query` | cm-db, cm-debug | Direct DB inspection — verify schema, check live query results |
| `mcp__redis__get`, `mcp__redis__list` | cm-debug | Inspect session cache state during debugging |
| `mcp__context7__query-docs` | cm-planner, cm-backend, cm-frontend | Current NestJS / Next.js / Prisma / TanStack docs — never stale |
| `mcp__excalidraw__*` | cm-planner | Architecture diagrams directly from planning sessions |
| `mcp__claude_ai_Figma__get_design_context` | cm-frontend | Pull design context from Figma files if they exist |

---

## Standard Flows

### Start of session
```
cm-orchestrator reads STATUS.md automatically
→ knows current phase, last session, what's active
→ never asks "where were we?"
```

### Planning a wave
```
/plan "Phase 1 Wave 1B — Jobs API"
→ reads PRD screens + ROADMAP + Discovered items
→ writes task breakdown into STATE.md
→ optional: cm-plan-reviewer for security-touching waves (auth, RBAC, JWT)
```

### Simple wave — single domain
```
"execute wave 1B"
→ cm-orchestrator → Agent tool → cm-backend
→ implements all tasks, reports back
→ cm-reviewer (code-review + security-review + simplify)
→ /wave-done "jobs-api"
→ /track done "Wave 1B"
```

### Complex wave — full-stack
```
"implement Phase 3 auth integration"
→ cm-orchestrator spawns agent team: cm-frontend + cm-backend
→ teammates coordinate directly on API shape, cookie format, redirect flow
→ cm-reviewer reviews both sides
→ /wave-done "auth-integration"
```

### Autonomous wave
```
/goal all Wave 1B tasks are [x] in STATE.md and `pnpm test --filter api` exits 0
→ Haiku evaluates after every turn
→ runs until condition met or turn bound hit
→ /wave-done + /track session + /handoff
```

### Code review (every wave before merge)
```
cm-reviewer → code-review + security-review + simplify
→ PASS: commit and mark done
→ BLOCK: fix findings, re-run review
```

### End of session
```
/wave-done "wave name"     → .planning/summaries/sum-YYYYMMDD-name.md
/track session "summary"   → STATUS.md updated
/handoff                   → docs/handoffs/handoff-YYYYMMDD-name.md
```

### Debugging
```
cm-debug
→ Step 1: dev-browser or playwriter to reproduce exactly
→ Step 2: isolate — is the API returning correct data? yes/no
→ Step 3: fix root cause, not symptom
→ cm-tester: write regression test before closing
```

---

## Decision Tree

```
What do I need?
│
├── Need to understand something first?
│   ├── In the codebase → cm-explorer (read-only, fast)
│   └── External docs / library → /deep-research or mcp__context7__query-docs
│
├── Planning a wave?
│   ├── Simple / mechanical → skip /plan, just execute
│   └── Complex or security-touching → /plan → cm-plan-reviewer → execute
│
├── Executing a wave?
│   ├── Pure frontend OR pure backend → Subagent (Agent tool)
│   ├── Full-stack, FE + BE must coordinate → Agent Team
│   ├── Large parallel fan-out with structured output → Workflow
│   └── Want unattended execution → /goal + auto mode
│
├── After implementation?
│   ├── Always → cm-reviewer (code-review + security-review + simplify)
│   └── Critical paths → cm-tester (playwriter + verify)
│
├── Something broken?
│   └── cm-debug → isolate → fix root cause → cm-tester regression
│
└── End of wave / session?
    └── /wave-done → /track session → /handoff
```

---

## Quick Combos

**Fastest single-domain wave:**
```
/plan → [Agent tool → cm-backend] → cm-reviewer → /wave-done → /track done
```

**Fastest full-stack wave:**
```
/plan → [Agent Team: cm-frontend + cm-backend] → cm-reviewer → /wave-done → /track done
```

**Unattended overnight run:**
```
/goal <verifiable condition> + auto mode ON
→ wakes up to wave done, summaries written
→ /handoff to capture what happened
```

**Maximum review quality:**
```
cm-reviewer with code-review + security-review + simplify
→ three passes, one verdict
→ BLOCK means no merge, no exceptions
```
