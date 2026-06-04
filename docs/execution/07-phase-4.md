# 07 — Phase 4: Wire UI to backend

**Goal.** Replace the mock providers from phase 2 with real Apollo Client and TanStack Query hooks pointing at the api from phase 3. Every screen renders real data. Mutations hit real endpoints. Subscriptions deliver live updates over WebSocket. End-to-end on the live production URL.

**Gate condition.** Open `https://crewmate.ritaro.dev`. Log in as the seeded admin. Walk the full happy path on the live site. Open two browsers as different roles. Transition a job in one and watch the other update via subscription. Visit `/webhooks` and trigger a test delivery; it appears in the log within seconds.

**Concurrency cap.** 9 agents at peak (wave 4.1).

**Estimated wall-clock.** ~3h at cap.

**Input.** Phase 3 gate signed off.

**Continuous deploy.** Every merge to `main` triggers both `deploy-api.yml` and `deploy-web.yml` (whichever side changed). After the `prod` approval clicks, the live site shows the wired screens against the real api.

---

## Wave 4.0 — Real client configuration

**Tool:** `/goal` per task
**Concurrency:** 2 (sequential by convention; 4.0a and 4.0b can run in parallel but both block 4.1)

### Task 4.0a — Apollo Client real config

```
/goal
Wire Apollo Client to the real api. Done when:
- apps/web/src/lib/apollo-client.ts points to http://localhost:3000/graphql in dev
- HTTP link has an auth header interceptor that reads the access token from cookies
- WebSocket link handles wss://localhost:3000/graphql for subscriptions
- Auth refresh link retries once on 401 using POST /v1/auth/refresh before redirecting to /login
- The MockedProvider wrapper from phase 2 is removed from the production code path
  (move to __tests__ or feature-flag behind NEXT_PUBLIC_MOCK=true)
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p4-F-112-apollo-real

Read: docs/guardrails/frontend/05-data-fetching.md, docs/FEATURES.md F-112
Files in scope: apps/web/src/lib/apollo-client.ts, apps/web/src/lib/apollo-mock.tsx
— or stop after 20 turns
```

### Task 4.0b — TanStack Query real config

```
/goal
Wire TanStack Query to the real api. Done when:
- apps/web/src/lib/query-client.ts is configured with fetchWithAuth that attaches the
  access token and handles 401 refresh
- MSW handlers are removed from the production code path
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p4-F-112-query-real

Read: docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/web/src/lib/query-client.ts, apps/web/src/lib/msw/
— or stop after 20 turns
```

---

## Wave 4.1 — Screen wiring (Workflow)

**Tool:** Claude Code `Workflow` tool
**Concurrency:** 9 agents

Save the script below to `.claude/workflows/phase-4-wave-4-1.js` and run it with `/workflows` → select `phase-4-wave-4-1` → run.

Then wrap the run in a goal:

```
/goal
Workflow for wave 4.1 runs to completion: all 9 wiring agents commit their branches,
pnpm --filter @crewmate/web typecheck exits 0 across all screen directories.
Run the Workflow at .claude/workflows/phase-4-wave-4-1.js.
— or stop after 30 turns
```

```javascript
export const meta = {
  name: 'phase-4-wave-4-1',
  description: 'Wire all UI screens to the real backend API in parallel',
  phases: [{ title: 'Wire Screens', detail: 'Up to 9 parallel agents, one per screen group' }],
}

const WIRINGS = [
  {
    label: 'wire-login',
    features: 'F-002, F-003',
    screenDir: 'apps/web/src/app/(auth)/login/',
    task: 'Replace the mock auth handler with a real POST /v1/auth/login call. On success store the access token in a cookie and redirect to /dispatch. On failure show the error toast.',
  },
  {
    label: 'wire-dispatch-board',
    features: 'F-031, F-032, F-033',
    screenDir: 'apps/web/src/app/(app)/dispatch/',
    task: 'Replace MockedProvider queries with real Apollo GraphQL queries and the job.status.changed subscription. Optimistic transitions must update the Apollo cache and roll back on server reject with a Toast.',
  },
  {
    label: 'wire-schedule',
    features: 'F-050',
    screenDir: 'apps/web/src/app/(app)/schedule/',
    task: 'Replace fixture data with real GET /v1/schedules and materialize calls.',
  },
  {
    label: 'wire-worker-mobile',
    features: 'F-040, F-041',
    screenDir: 'apps/web/src/app/(worker)/today/',
    task: 'Wire today\'s job list to real GraphQL query. Wire one-tap transitions to POST /v1/jobs/:id/transition with optimistic update.',
  },
  {
    label: 'wire-webhooks',
    features: 'F-060, F-063',
    screenDir: 'apps/web/src/app/(app)/webhooks/',
    task: 'Wire deliveries log to real GET /v1/webhooks/deliveries. Wire endpoint config forms to POST/PATCH /v1/webhooks/endpoints.',
  },
  {
    label: 'wire-team',
    features: 'F-090, F-091, F-092, F-093',
    screenDir: 'apps/web/src/app/(app)/settings/team/',
    task: 'Wire members list to real GraphQL query. Wire invite dialog to POST /v1/team/invitations. Wire member drawer actions to real PATCH /v1/team/grants.',
  },
  {
    label: 'wire-analytics',
    features: 'F-080',
    screenDir: 'apps/web/src/app/(app)/dashboard/',
    task: 'Replace precomputed sample aggregates with real GET /v1/analytics/overview calls.',
  },
  {
    label: 'wire-settings-core',
    features: 'F-100, F-101, F-072',
    screenDir: 'apps/web/src/app/(app)/settings/(core)/',
    task: 'Wire profile and account forms to real PATCH endpoints. Wire notification toggles to real preference endpoints.',
  },
  {
    label: 'wire-settings-secondary',
    features: 'F-016, F-021',
    screenDir: 'apps/web/src/app/(app)/settings/(secondary)/',
    task: 'Wire audit log table to real GET /v1/audit with filter params. Wire properties CRUD forms to real POST/PATCH /v1/properties.',
  },
]

phase('Wire Screens')
log(`Launching ${WIRINGS.length} wiring agents (cap: 9).`)

const results = await parallel(WIRINGS.map(wiring => () =>
  agent(
    `You are a frontend-dev agent. Wire the ${wiring.label} screen to the real backend.

CONTEXT FILES — read these before writing any code:
1. docs/guardrails/shared/AGENT.md
2. docs/guardrails/frontend/05-data-fetching.md
3. docs/guardrails/frontend/09-error-handling.md
4. docs/FEATURES.md — only the cards for ${wiring.features}

FILES IN SCOPE — only edit files inside:
- ${wiring.screenDir}
- apps/web/src/components/${wiring.label.replace('wire-', '')}/ (if it exists from phase 2)

FILES OUT OF SCOPE — do not touch shared components, layout files, or other screens.

TASK: ${wiring.task}

REQUIREMENTS:
- No fixture data in the production code path after this task
- Error states use the mapping in docs/guardrails/frontend/09-error-handling.md
- Loading states render a skeleton, not a spinner (per 01-components.md)
- Optimistic mutations roll back with a Toast on server error

ACCEPTANCE:
- pnpm --filter @crewmate/web typecheck exits 0
- pnpm --filter @crewmate/web lint exits 0
- The screen renders real data from the seeded api at localhost:3000 without a runtime error

Return "DONE: ${wiring.label}" when acceptance passes.`,
    { label: wiring.label, phase: 'Wire Screens' }
  )
))

const passed = results.filter(r => r && r.includes('DONE'))
log(`Wirings passed: ${passed.length} / ${WIRINGS.length}`)
return { passed: passed.length, total: WIRINGS.length }
```

---

## Wave 4.2 — Subscription verification

**Tool:** Manual
**Concurrency:** 1

Open two browser windows logged in as different coordinators.
Transition a job in window A. Confirm the dispatch board in window B updates via WebSocket.
No Goal or Workflow needed — this is a manual eyeball check.

---

## Wave 4.3 — Fixture cleanup

**Tool:** `/goal`
**Concurrency:** 1

```
/goal
Move fixture data out of the production bundle. Done when:
- apps/web/src/lib/fixtures/ is moved to apps/web/src/__tests__/fixtures/
- No import of fixtures/ exists in any file under apps/web/src/app/ or apps/web/src/components/
- pnpm --filter @crewmate/web build exits 0 without fixture imports in the bundle
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p4-fixture-cleanup

Files in scope: apps/web/src/lib/fixtures/ (move target), any import sites in app/ or components/
— or stop after 20 turns
```

---

## Phase 4 gate

Open `https://crewmate.ritaro.dev`. Log in as the seeded admin. Walk the full happy path on the live site. Open two browsers as different roles. Transition a job in one and watch the other update via subscription over `wss://crewmate.ritaro.dev/ws`. Visit `/webhooks` and trigger a test delivery. See it appear in the log within seconds.

**`PHASE_4_GATE`** — after this condition appears, stop, walk the live URL with two browsers, then start phase 5 by running the first `/goal` from `08-phase-5.md` or `03-goal-commands.md`.

Run `/compact` before starting phase 5.
