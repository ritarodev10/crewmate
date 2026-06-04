---
phase: 02-ui-screens
plan: "20"
subsystem: web
tags: [design-system, fixtures, msw, apollo, providers, tailwind]
dependency_graph:
  requires: []
  provides:
    - apps/web/src/styles/tokens.css
    - apps/web/src/lib/motion.ts
    - apps/web/src/lib/cn.ts
    - apps/web/src/lib/fixtures/*
    - apps/web/src/lib/msw/*
    - apps/web/src/app/providers.tsx
  affects:
    - All Phase 2 Wave 2.1 + 2.2 screen agents (they import from these paths)
tech_stack:
  added:
    - msw@^2.0.0 (MIT) — REST mocking via service worker
    - react-hook-form@^7.53.0 (MIT) — form state management (required by Phase 2 form screens)
    - "@hookform/resolvers@^3.9.0" (MIT) — zod integration for react-hook-form
  patterns:
    - Tailwind 4 CSS-native @theme block in tokens.css (no tailwind.config duplication)
    - Apollo Client v4 — ApolloProvider from @apollo/client/react, HttpLink constructor
    - MSW 2.x — http.get/post handlers with HttpResponse.json
    - MockedResponse from @apollo/client/testing
key_files:
  created:
    - apps/web/src/styles/tokens.css
    - apps/web/tailwind.config.ts
    - apps/web/src/lib/motion.ts
    - apps/web/src/lib/cn.ts
    - apps/web/src/lib/fixtures/jobs.ts
    - apps/web/src/lib/fixtures/workers.ts
    - apps/web/src/lib/fixtures/properties.ts
    - apps/web/src/lib/fixtures/users.ts
    - apps/web/src/lib/fixtures/scheduleEvents.ts
    - apps/web/src/lib/fixtures/webhookDeliveries.ts
    - apps/web/src/lib/fixtures/auditRows.ts
    - apps/web/src/lib/fixtures/teamMembers.ts
    - apps/web/src/lib/fixtures/customRoles.ts
    - apps/web/src/lib/fixtures/kpiMetrics.ts
    - apps/web/src/lib/fixtures/index.ts
    - apps/web/src/lib/msw/handlers/jobs.ts
    - apps/web/src/lib/msw/handlers/webhooks.ts
    - apps/web/src/lib/msw/handlers/team.ts
    - apps/web/src/lib/msw/handlers/settings.ts
    - apps/web/src/lib/msw/handlers/index.ts
    - apps/web/src/lib/msw/browser.ts
    - apps/web/src/lib/msw/apollo-mocks.ts
    - apps/web/src/app/providers.tsx
    - apps/web/src/lib/apollo/client.ts
    - apps/web/src/lib/query/client.ts
  modified:
    - apps/web/src/app/globals.css
    - apps/web/src/app/layout.tsx
    - apps/web/package.json
decisions:
  - "Apollo Client v4 requires ApolloProvider from @apollo/client/react (not @apollo/client) — import updated"
  - "Apollo Client v4 requires HttpLink in constructor (uri shorthand removed) — client.ts updated"
  - "Tailwind 4 CSS-native @theme generates utilities directly; tailwind.config.ts kept minimal (content paths only)"
  - "msw, react-hook-form, @hookform/resolvers added — all MIT, zero SaaS fees; flagged as new deps"
  - "tokens.css uses both raw token names (--color-bone) and role-mapped names (--color-canvas) for maximum Tailwind utility coverage"
metrics:
  duration: "~45 minutes"
  completed_date: "2026-06-04"
  tasks_completed: 3
  files_created: 25
  files_modified: 3
---

# Phase 2 Plan 20: Design Tokens, Fixtures, MSW Setup Summary

Design system tokens wired into CSS-native Tailwind 4 @theme, 10 fully typed fixture files for all Phase 2 entities, and complete MSW + MockedProvider infrastructure ready for all Wave 2.1 and 2.2 screen agents.

## What Was Built

### T1: Design system tokens + Tailwind config + motion.ts + cn.ts

**tokens.css** (97 CSS custom properties in @theme block):
- 11 brand colors (bone, paper, ink, muted, line, line-strong, navy, navy-soft, navy-fade, amber, amber-fade)
- 9 semantic colors + fade variants (success, warn, danger, info)
- Role-mapped utilities (canvas, surface, default, brand, brand-soft, brand-fade, accent, accent-fade, on-brand)
- 2 shadows (pop, overlay)
- 11 spacing tokens (space-0 through space-16, 4px base)
- 6 radius tokens (0, sm, md, lg, xl, full)
- 5 icon size tokens (xs, sm, md, lg, xl)
- 8 z-index tokens (base, shell, topbar, sticky, dropdown, drawer, dialog, toast)
- 3 motion duration tokens (fast 120ms, base 180ms, slow 280ms)
- Full type scale vars (display, h1, h2, h3, body, body-strong, small, micro, mono)

**globals.css**: Replaced placeholder @theme block; now imports tokens.css via `@import "../styles/tokens.css"`.

**tailwind.config.ts**: Minimal — content paths only. Tailwind 4 CSS-native mode generates utilities from @theme directly.

**motion.ts**: Exports `motionFast` (0.12), `motionBase` (0.18), `motionSlow` (0.28), `easeStandard` ([0.2, 0, 0, 1] as const), and `motionVariants` (fade, slideRight, scaleIn).

**cn.ts**: `clsx` + `tailwind-merge` helper. Both were already in package.json — no new deps required.

### T2: Fixture files (10 typed entity files)

| File | Entities | Count |
|------|----------|-------|
| jobs.ts | 15 jobs | 4 scheduled, 3 en_route, 4 in_progress, 3 completed, 1 cancelled |
| workers.ts | 5 workers | 3 available, 2 on_job; avatar palette applied |
| properties.ts | 5 properties | residential, commercial, hospitality |
| users.ts | 4 users + FIXTURE_SESSIONS | 1 admin, 2 coordinator, 1 worker; sessions keyed by email |
| scheduleEvents.ts | 18 events | 3 workers × Mon-Sun; 1 overdue, 1 high-priority |
| webhookDeliveries.ts | 12 deliveries | 6 delivered, 3 retrying, 3 failed (2 with code, 1 timeout) |
| auditRows.ts | 10 rows | 7 Allow, 3 Deny (non-null reason on all Deny) |
| teamMembers.ts | 7 members | 1 admin, 2 coordinator, 2 worker, 1 custom, 1 invited |
| customRoles.ts | 2 roles | Maintenance Lead, Property Inspector |
| kpiMetrics.ts | 4 KPI cards, 28 chart points, 4 property bars, 4 worker sparklines | — |

All fixture files: locally declared types mirroring @crewmate/contracts shapes, named exports only, no `any` types.

### T3: MSW handlers + Apollo MockedProvider mocks + providers.tsx

**New deps added** (all MIT, zero SaaS fees):
- `msw@^2.0.0` — REST surface mocking via browser service worker
- `react-hook-form@^7.53.0` — form state (required by Phase 2 invite/settings forms)
- `@hookform/resolvers@^3.9.0` — zod resolver for react-hook-form

**MSW handlers** (all using MSW 2.x `http` + `HttpResponse` API):
- `jobs.ts`: GET /v1/jobs, POST /v1/jobs/:id/transition
- `webhooks.ts`: GET /v1/webhooks/deliveries, POST /v1/webhooks/deliveries/:id/retry, POST /v1/webhooks/endpoints/:id/test
- `team.ts`: GET /v1/team/members, POST /v1/team/invitations, GET /v1/audit, GET /v1/audit/export (CSV)
- `settings.ts`: GET/PATCH /v1/settings/profile, GET/PATCH /v1/settings/account, GET/PATCH /v1/settings/notifications

**browser.ts**: `setupWorker(...handlers)` — exports `mswWorker`.

**apollo-mocks.ts**: 9 `MockedResponse` entries covering all Phase 2 GraphQL documents:
GetDashboardKpis, GetJobs, GetJob (by id), GetJobActivity, GetScheduleEvents, GetWorkerTodayJobs, GetTeamMembers, GetCustomRoles, GetAuditLog.

**providers.tsx** (`'use client'`): `ApolloProvider → QueryClientProvider → MswProvider`. MSW starts via dynamic `import()` inside `useEffect`, guarded by `process.env.NODE_ENV === 'development'`. Never enters production bundle.

**apollo/client.ts**: Stub using `HttpLink({ uri: '/graphql' })`. Real link chain (auth, WS split, error retry) wired in Phase 4.

**query/client.ts**: TanStack QueryClient with guardrail-spec defaults (staleTime 30s, gcTime 5min, retry 2, retryDelay exponential, refetchOnWindowFocus/Reconnect 'always', mutations retry false).

**layout.tsx**: Updated to wrap `{children}` with `<Providers>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Apollo Client v4 ApolloProvider import path**
- **Found during:** Task 3 (first typecheck run)
- **Issue:** `@apollo/client` v4 does not export `ApolloProvider` from the root package; it moved to `@apollo/client/react`
- **Fix:** Changed import from `@apollo/client` to `@apollo/client/react` in providers.tsx
- **Files modified:** `apps/web/src/app/providers.tsx`
- **Commit:** 7aafe25

**2. [Rule 1 - Bug] Apollo Client v4 constructor API change**
- **Found during:** Task 3 (first typecheck run)
- **Issue:** `ApolloClient` v4 `Options` interface requires `link: ApolloLink` (not `uri: string` shorthand)
- **Fix:** Replaced `{ uri: '/graphql' }` with `{ link: new HttpLink({ uri: '/graphql' }) }` in apollo/client.ts
- **Files modified:** `apps/web/src/lib/apollo/client.ts`
- **Commit:** 7aafe25

**3. [Rule 1 - Bug] TypeScript noUncheckedIndexedAccess — array element access**
- **Found during:** Task 3 (first typecheck run)
- **Issue:** `FIXTURE_JOBS[0].id` flagged as `possibly undefined` under strict TS settings
- **Fix:** Changed to `FIXTURE_JOBS[0]?.id ?? 'job-001'` in apollo-mocks.ts
- **Files modified:** `apps/web/src/lib/msw/apollo-mocks.ts`
- **Commit:** 7aafe25

## Dependency Notes

**Already present in package.json (no action required):**
- `clsx@^2.1.0` — used in cn.ts
- `tailwind-merge@^2.5.0` — used in cn.ts
- `@apollo/client@^4.0.0` — used in providers.tsx, apollo-mocks.ts
- `@tanstack/react-query@^5.56.0` — used in providers.tsx

**Newly added (flagged per CLAUDE.md):**
- `msw@^2.0.0` — MIT license, zero SaaS fees. Required for REST surface mocking per 02-CONTEXT.md decisions.
- `react-hook-form@^7.53.0` — MIT license, zero SaaS fees. Required for Phase 2 invite dialog and settings forms.
- `@hookform/resolvers@^3.9.0` — MIT license, zero SaaS fees. Peer of react-hook-form for zod validation.

## Known Stubs

**apollo/client.ts** — The `apolloClient` export uses a stub `HttpLink` pointing to `/graphql` with no auth link, no WS subscription link, and no error retry link. This is intentional: Phase 2 screens use `MockedProvider` for all GraphQL (the real client is not exercised). Phase 4 replaces this stub with the full link chain per `05-data-fetching.md`.

**apollo-mocks.ts** — Mock documents use inline `gql\`\`` tags because GraphQL codegen (which generates `*Document` constants) runs in Phase 3. Phase 3 codegen output will replace these inline documents with typed generated constants.

## Verification

```
pnpm --filter @crewmate/web typecheck   PASS — exit 0
--color-bone in tokens.css              PASS
--color-danger-fade in tokens.css       PASS
tokens.css imported in globals.css      PASS
motionBase in motion.ts                 PASS
FIXTURE_JOBS in fixtures/jobs.ts        PASS (242 lines, 15 entries)
FIXTURE_SESSIONS in fixtures/users.ts   PASS (keyed by email)
setupWorker in browser.ts               PASS
NODE_ENV guard in providers.tsx         PASS
MockedResponse in apollo-mocks.ts       PASS
fixtures/index.ts exists                PASS
```

## Self-Check: PASSED
