# 05 — Phase 2: UI with dummy data

**Goal.** Every screen documented in `docs/guardrails/frontend/` renders against fixture data shaped by the Prisma schema. No real backend wiring. The reviewer (you) clicks through the whole product visually on the live production URL before any backend code is real.

**Gate condition.** Visit `https://crewmate.ritaro.dev`. Click through every route. Every screen matches its `docs/images/ui/<name>.png` reference. Optimistic UI works on the dispatch board. No real network errors in the console.

**Concurrency cap.** 9 agents at peak (wave 2.2).

**Estimated wall-clock.** ~5–6h at cap.

**Input.** Phase 1 gate signed off. Deploy workflows live.

**Continuous deploy.** Every merge to `main` triggers `deploy-web.yml`, which pushes the new bundle to the Cloudflare Worker behind the `prod` environment approval. Walk the live URL after each PR merges.

---

## Wave 2.0 — Fixtures and mock providers

**Tool:** `/goal` per task
**Concurrency:** 1 (sequential; each blocks the next)

### Task 2.0a — Fixture package

```
/goal
Build the fixtures package at apps/web/src/lib/fixtures/. Done when:
- Typed fixtures exist for: Operator, User, RoleGrant, Property, Worker, Job, Schedule,
  WebhookEndpoint, WebhookDelivery, PermissionAudit
- At least 80 records distributed across entities (proportions per docs/BUILD.md layer 2 seed)
- All fixture types derive from @prisma/client generated types
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-fixtures

Read: prisma/schema.prisma, docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/web/src/lib/fixtures/ only
— or stop after 20 turns
```

### Task 2.0b — Mock Apollo provider

```
/goal
Set up MockedProvider for Apollo. Done when:
- apps/web/src/lib/apollo-mock.tsx wraps the app with ApolloMockProvider in dev
- Mock responses exist for every GraphQL query and mutation in docs/guardrails/frontend/05-data-fetching.md
- Subscriptions return fixture data on connect
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-apollo-mock

Read: docs/guardrails/frontend/05-data-fetching.md, apps/web/src/lib/fixtures/
Files in scope: apps/web/src/lib/apollo-mock.tsx, apps/web/src/lib/msw/
— or stop after 20 turns
```

### Task 2.0c — Mock TanStack Query + MSW

```
/goal
Set up MSW handlers for all REST endpoints. Done when:
- apps/web/src/lib/msw/handlers.ts has a handler for every endpoint in docs/guardrails/backend/02-api.md
- Handlers return fixture data from apps/web/src/lib/fixtures/
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-msw-handlers

Read: docs/guardrails/backend/02-api.md, docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/web/src/lib/msw/ only
— or stop after 20 turns
```

---

## Wave 2.1 — App shell

**Tool:** `/goal`
**Concurrency:** 1 (blocks wave 2.2)

```
/goal
Build the app shell. Done when:
- apps/web/src/app/layout.tsx renders sidebar + topbar on every authenticated route
- Sidebar has nav items for every route in docs/guardrails/frontend/03-layout-and-navigation.md
- Status dots render per the tier mapping in 03-layout-and-navigation.md
- Mobile shell exists at apps/web/src/app/(worker)/layout.tsx
- Every route in docs/FEATURES.md feature index is reachable (placeholder pages ok)
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-app-shell

Read: docs/guardrails/frontend/03-layout-and-navigation.md,
      docs/guardrails/frontend/01-components.md,
      docs/guardrails/frontend/02-design-system.md
Files in scope: apps/web/src/app/layout.tsx, apps/web/src/components/shell/
— or stop after 20 turns
```

---

## Wave 2.2 — Screens (Workflow)

**Tool:** Claude Code `Workflow` tool
**Concurrency:** 9 agents

Save the script below to `.claude/workflows/phase-2-wave-2-2.js` and run it with `/workflows` → select `phase-2-wave-2-2` → run.

Then wrap the run in a goal:

```
/goal
Workflow for wave 2.2 runs to completion: all 9 screen agents commit their branches,
pnpm --filter @crewmate/web typecheck exits 0 across all screen directories.
Run the Workflow at .claude/workflows/phase-2-wave-2-2.js.
— or stop after 30 turns
```

```javascript
export const meta = {
  name: 'phase-2-wave-2-2',
  description: 'Build all UI screens in parallel against fixture data',
  phases: [{ title: 'Build Screens', detail: 'Up to 9 parallel agents, one per route group' }],
}

const SCREENS = [
  {
    label: 'login',
    features: 'F-002',
    routeDir: 'apps/web/src/app/(auth)/login/',
    guardrail: 'docs/guardrails/frontend/11-auth-flows.md',
    visual: 'docs/images/ui/login.png',
  },
  {
    label: 'dispatch-board',
    features: 'F-031, F-032, F-033',
    routeDir: 'apps/web/src/app/(app)/dispatch/',
    guardrail: 'docs/guardrails/frontend/14-dispatch-board.md',
    visual: 'docs/images/ui/dispatch-board.png',
  },
  {
    label: 'schedule',
    features: 'F-050',
    routeDir: 'apps/web/src/app/(app)/schedule/',
    guardrail: 'docs/guardrails/frontend/16-schedule-view.md',
    visual: 'docs/images/ui/schedule.png',
  },
  {
    label: 'worker-mobile',
    features: 'F-040, F-041',
    routeDir: 'apps/web/src/app/(worker)/today/',
    guardrail: 'docs/guardrails/frontend/15-worker-mobile.md',
    visual: 'docs/images/ui/worker-mobile.png',
  },
  {
    label: 'webhook-log',
    features: 'F-063',
    routeDir: 'apps/web/src/app/(app)/webhooks/',
    guardrail: 'docs/guardrails/frontend/17-webhooks-and-events.md',
    visual: 'docs/images/ui/webhook-log.png',
  },
  {
    label: 'team-management',
    features: 'F-090, F-091, F-092, F-093',
    routeDir: 'apps/web/src/app/(app)/settings/team/',
    guardrail: 'docs/guardrails/frontend/18-team-and-rbac.md',
    visual: 'docs/images/ui/team-management.png',
  },
  {
    label: 'analytics',
    features: 'F-080',
    routeDir: 'apps/web/src/app/(app)/dashboard/',
    guardrail: 'docs/guardrails/frontend/13-dashboard-and-analytics.md',
    visual: 'docs/images/ui/analytics.png',
  },
  {
    label: 'settings-core',
    features: 'F-100, F-101, F-072',
    routeDir: 'apps/web/src/app/(app)/settings/(core)/',
    guardrail: 'docs/guardrails/frontend/19-settings.md',
    visual: null,
  },
  {
    label: 'settings-audit-properties-webhooks',
    features: 'F-016, F-021, F-060',
    routeDir: 'apps/web/src/app/(app)/settings/(secondary)/',
    guardrail: 'docs/guardrails/frontend/19-settings.md',
    visual: null,
  },
]

phase('Build Screens')
log(`Launching ${SCREENS.length} screen agents (cap: 9). Each owns its own route directory.`)

const results = await parallel(SCREENS.map(screen => () =>
  agent(
    `You are a frontend-dev agent. Your job is to build the ${screen.label} screen for CrewMate.

CONTEXT FILES — read these before writing any code:
1. docs/guardrails/shared/AGENT.md
2. docs/guardrails/frontend/01-components.md
3. docs/guardrails/frontend/02-design-system.md
4. ${screen.guardrail}
5. docs/FEATURES.md — only the cards for ${screen.features}
${screen.visual ? `6. ${screen.visual} — this is your pixel contract` : ''}

FIXTURES — all data comes from here, no real API calls:
- apps/web/src/lib/fixtures/

FILES IN SCOPE — only create or edit files inside:
- ${screen.routeDir}
- apps/web/src/components/${screen.label}/ (domain components for this screen)

FILES OUT OF SCOPE — do not touch anything else. Do not edit shared components,
layout files, or other routes. If you need a shared component that does not exist,
create it inside your own components folder as a local copy.

TASK: Implement the ${screen.label} screen against fixture data only.
- All queries use the mock Apollo provider or MSW handlers already in place
- Mutations update the fixture cache (optimistic update pattern)
- Screen matches the visual contract if one is listed above
- No real network calls, no hardcoded data outside fixtures

ACCEPTANCE:
- pnpm --filter @crewmate/web typecheck exits 0
- pnpm --filter @crewmate/web lint exits 0
- The route renders without a runtime error in dev mode

Return the string "DONE: ${screen.label}" when acceptance passes.`,
    { label: screen.label, phase: 'Build Screens' }
  )
))

const passed = results.filter(r => r && r.includes('DONE'))
log(`Screens passed: ${passed.length} / ${SCREENS.length}`)
if (passed.length < SCREENS.length) {
  log(`Failed or incomplete: ${SCREENS.map(s => s.label).filter(l => !passed.some(r => r.includes(l))).join(', ')}`)
}
return { passed: passed.length, total: SCREENS.length }
```

---

## Wave 2.3 — Visual review polish

**Tool:** `/goal` per item
**Concurrency:** up to 9

Address any screen that needs a second pass after the gate review. Dispatched per item; one `/goal` session per polish task. Skip this wave if the gate is approved without changes.

---

## Phase 2 gate

Click through every route on `https://crewmate.ritaro.dev`. Confirm:
- Every screen documented in `docs/guardrails/frontend/` is reachable.
- Every screen matches its `docs/images/ui/<name>.png` reference within a tight visual tolerance.
- Optimistic UI on transitions feels right. Cards move between columns on the dispatch board. Status pills update. Worker mobile cards transition.
- No real network errors in the console. Only mock-provider activity.
- The reviewer (you) signs off the visual design. This is the most important gate of the whole build.

**`PHASE_2_GATE`** — after this condition appears, stop, walk the live URL, then start phase 3 by running the first `/goal` from `06-phase-3.md` or `03-goal-commands.md`.

Run `/compact` before starting phase 3.
