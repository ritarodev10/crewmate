# Directory Structure

Feature-based directory layout for `apps/web/src/`. Every file has exactly one correct location determined by a single rule: **scope of use**.

---

## The Scoping Rule

If something is used by **one page route**, it lives inside that route's folder with a `_` prefix. If something is used by **two or more page routes**, it lives in the top-level shared folder.

| Used by | Location |
|---|---|
| One page route only | `app/(app)/dashboard/_components/kpi-cards.tsx` |
| Two or more pages | `components/job-detail-drawer.tsx` |
| All pages (app shell) | `components/sidebar.tsx`, `components/top-bar.tsx` |

There are no exceptions to this rule. When a component starts as page-private and later gets used by a second page, move it from `_components/` to `components/` in the same PR that adds the second usage.

---

## The `_` Prefix Convention

Next.js App Router ignores folders prefixed with `_` during route resolution. We use this for colocation:

- `_components/` — React components private to that route segment
- `_hooks/` — Custom hooks (typically TanStack Query wrappers) private to that route segment
- `_utils/` — Pure utility functions private to that route segment (create only when 2+ functions exist)
- `_actions.ts` — Server Actions private to that route segment (used only for auth in this project)

The `_` prefix means "private to this route." These files are never imported by code outside their containing route folder. Violating this produces hidden coupling that breaks when routes are refactored.

**Never create `_stores/`** — Zustand stores are always global because UI state (auth session, demo actor, modal state) inherently crosses page boundaries. All stores live in `src/stores/`.

---

## Full Directory Tree

```
apps/web/src/
├── app/
│   ├── layout.tsx                  Root layout — html/body, fonts, providers
│   ├── globals.css                 Tailwind 4 @theme block + CSS custom properties
│   │
│   ├── (auth)/
│   │   └── login/
│   │       ├── page.tsx            Server Component — renders LoginForm
│   │       ├── _components/
│   │       │   ├── login-form.tsx          'use client' — email/password form
│   │       │   └── demo-shortcuts.tsx      'use client' — one-click demo login buttons
│   │       └── _actions.ts                Server Action — validateCredentials, set cookie, redirect
│   │
│   ├── (app)/
│   │   ├── layout.tsx              App shell — Server Component, renders Sidebar + TopBar + {children}
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx            Server Component — renders DashboardPage client boundary
│   │   │   ├── _components/
│   │   │   │   ├── kpi-cards.tsx           'use client' — 4 KPI metric cards
│   │   │   │   ├── map-view.tsx            'use client' — Mapbox GL satellite map with job pins
│   │   │   │   └── activity-feed.tsx       'use client' — live activity feed list
│   │   │   └── _hooks/
│   │   │       └── use-dashboard.ts        useDashboardSummary + useDashboardActivity queries
│   │   │
│   │   ├── jobs/
│   │   │   ├── page.tsx            Server Component — renders JobsPage client boundary
│   │   │   ├── _components/
│   │   │   │   ├── kanban-board.tsx         'use client' — 4-column kanban layout
│   │   │   │   ├── job-card.tsx             'use client' — individual kanban card
│   │   │   │   └── new-job-modal.tsx        'use client' — job creation form modal
│   │   │   └── _hooks/
│   │   │       └── use-jobs.ts             useJobs query + useCreateJob + useCancelJob mutations
│   │   │
│   │   ├── workforce/
│   │   │   ├── page.tsx            Server Component — renders WorkforcePage client boundary
│   │   │   ├── _components/
│   │   │   │   ├── workers-tab.tsx          'use client' — Workers tab container with sub-tabs
│   │   │   │   ├── teams-tab.tsx            'use client' — Teams tab container
│   │   │   │   ├── worker-card.tsx          'use client' — individual worker card
│   │   │   │   ├── worker-detail-drawer.tsx 'use client' — side drawer for worker details
│   │   │   │   ├── team-card.tsx            'use client' — individual team card
│   │   │   │   ├── team-detail-drawer.tsx   'use client' — side drawer for team details
│   │   │   │   ├── worker-picker-modal.tsx  'use client' — modal for adding workers to teams
│   │   │   │   └── add-team-modal.tsx       'use client' — modal for creating a new team
│   │   │   └── _hooks/
│   │   │       └── use-workers.ts           useWorkers + useWorkerDetail queries
│   │   │
│   │   └── revenue/
│   │       ├── page.tsx            Server Component — renders RevenuePage client boundary
│   │       ├── _components/
│   │       │   ├── revenue-chart.tsx        'use client' — Recharts area/line chart
│   │       │   └── breakdown-table.tsx      'use client' — per-job-type revenue table
│   │       └── _hooks/
│   │           └── use-revenue.ts           useRevenue query with 30s polling
│   │
│   └── worker/                     Mobile worker views — no sidebar, no topbar
│       ├── layout.tsx              Mobile layout — sticky header, no shell chrome
│       ├── page.tsx                Server Component — renders WorkerHomePage client boundary
│       ├── _components/
│       │   ├── earnings-card.tsx            'use client' — earnings with Today/Week/Month/All tabs
│       │   └── job-list-item.tsx            'use client' — tappable job row in today's list
│       └── jobs/
│           └── [id]/
│               ├── page.tsx        Server Component — renders WorkerJobPage client boundary
│               └── _components/
│                   ├── progress-stepper.tsx  'use client' — 25/50/75/100% tap steps
│                   └── progress-ring.tsx     'use client' — circular SVG progress indicator
│
├── components/                     Shared across 2+ pages
│   ├── ui/                         shadcn/ui primitives — NEVER hand-edit these files
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── avatar.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── radio-group.tsx
│   │   ├── textarea.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   └── skeleton.tsx
│   ├── job-detail-drawer.tsx       Used from /dashboard map pins AND /jobs kanban cards
│   ├── revoke-job-modal.tsx        Used from /dashboard drawer AND /jobs drawer
│   ├── global-search.tsx           TopBar search with scope filter chips
│   ├── demo-actor-switcher.tsx     Floating bottom-right chip (demo mode only)
│   ├── sidebar.tsx                 Dark sidebar with nav groups
│   └── top-bar.tsx                 Page title + search + actions bar
│
├── stores/                         Zustand stores — always global, never page-private
│   ├── auth-store.ts               Current user session (userId, role, operatorId, name)
│   ├── demo-store.ts               Demo actor switcher state (open/closed, loading)
│   └── teams-store.ts              Teams tab UI state (add modal open, edit modal open, selected team)
│
├── hooks/                          Shared hooks used by 2+ pages
│   └── use-websocket.ts            Socket.io connection management + event subscription
│
├── lib/
│   ├── api-client.ts               Fetch wrapper — injects JWT from cookie, sets base URL, handles errors
│   ├── query-keys.ts               TanStack Query key factory — all keys defined here, never inline
│   ├── dummy-data.ts               Phase 2 static fixture data (jobs, workers, revenue, activity)
│   └── utils.ts                    cn() (clsx + tailwind-merge), date formatters, currency formatters
│
├── providers/
│   └── query-provider.tsx          'use client' — wraps app in QueryClientProvider
│
└── types/
    └── api.ts                      TypeScript interfaces mirroring Prisma schema + API response shapes
```

---

## Key Decisions Explained

### `page.tsx` is Always a Server Component

Every `page.tsx` file is a Server Component. It does not use `'use client'`, does not call hooks, and does not fetch data directly. Its job is to:

1. Accept route `params` and `searchParams` from Next.js
2. Render one or more Client Component boundaries from `_components/`
3. Optionally export `metadata` for the page title

Data fetching happens inside Client Components via TanStack Query hooks defined in `_hooks/`. This keeps pages thin and testable.

```tsx
// app/(app)/dashboard/page.tsx — correct
import { KpiCards } from './_components/kpi-cards';
import { MapView } from './_components/map-view';
import { ActivityFeed } from './_components/activity-feed';

export const metadata = { title: 'Dashboard | CrewMate' };

export default function DashboardPage() {
  return (
    <div className="flex h-full gap-4">
      <div className="flex w-[42%] flex-col gap-4">
        <KpiCards />
        <ActivityFeed />
      </div>
      <div className="flex-1">
        <MapView />
      </div>
    </div>
  );
}
```

### `_components/` vs `components/`

The test is simple: **count the import sites**.

- `kpi-cards.tsx` is imported only in `dashboard/page.tsx`. It lives in `dashboard/_components/`.
- `job-detail-drawer.tsx` is imported in both `dashboard/_components/map-view.tsx` and `jobs/_components/kanban-board.tsx`. It lives in `components/`.
- `sidebar.tsx` is imported in `(app)/layout.tsx` only, but it is app shell chrome shared by all `(app)` routes. It lives in `components/`.

If you are unsure, start in `_components/`. Promote to `components/` when a second consumer appears.

### `_hooks/` vs `hooks/`

Same scoping rule. Each page route typically has one `_hooks/` file containing the TanStack Query hooks that fetch data for that page:

- `dashboard/_hooks/use-dashboard.ts` exports `useDashboardSummary()` and `useDashboardActivity()`
- `jobs/_hooks/use-jobs.ts` exports `useJobs()`, `useCreateJob()`, `useCancelJob()`
- `revenue/_hooks/use-revenue.ts` exports `useRevenue()`

If a hook is needed by two pages, move it to `hooks/`. The only shared hook at launch is `use-websocket.ts` because multiple pages subscribe to Socket.io events.

### When to Create `_utils/`

Only when a route folder accumulates **2 or more pure utility functions** that are specific to that page. A single helper function should live at the top of the component file that uses it, or in `lib/utils.ts` if it is generic.

Do not pre-create empty `_utils/` folders. Add them when needed.

### `stores/` Is Always Global

Never create `_stores/` inside a route folder. Zustand stores manage UI state that inherently crosses page boundaries:

- `auth-store.ts` — read by sidebar, topbar, middleware, any RBAC-gated component
- `demo-store.ts` — read by the floating demo actor switcher on every page
- `teams-store.ts` — manages modal open/close state for the Teams tab, but could be accessed by other components that link to team data

If you need truly local UI state (a single modal's open/close, a filter value), use React `useState` inside the component. Zustand is for state that persists across component unmounts or is read by unrelated components.

### `components/ui/` Is Read-Only

Files inside `components/ui/` are generated by `npx shadcn add <component>`. They are never hand-edited. To customize a shadcn primitive:

1. Create a wrapper component in `components/` (e.g., `components/status-badge.tsx` wraps `components/ui/badge.tsx`)
2. Apply project-specific default props, styles, or logic in the wrapper
3. Import the wrapper in your feature code, never the raw `ui/` primitive directly (unless you genuinely need the unstyled version)

### `types/api.ts` Is the Single Source

All TypeScript interfaces for API response shapes live in `types/api.ts`. This file mirrors the Prisma schema. Frontend code never imports from `@prisma/client` — it imports from `@web/types/api`.

When the backend schema changes, `types/api.ts` must be updated in the same PR.

### `lib/query-keys.ts` Centralizes Cache Keys

Every TanStack Query key used in the app is defined as a factory function in `lib/query-keys.ts`. No query hook ever uses an inline string key. This makes cache invalidation predictable and prevents key drift between hooks.

```ts
// lib/query-keys.ts
export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: JobFilters) => ['jobs', filters] as const,
    detail: (id: string) => ['jobs', id] as const,
  },
  workers: {
    all: ['workers'] as const,
    detail: (id: string) => ['workers', id] as const,
    earnings: (id: string) => ['workers', id, 'earnings'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
  revenue: {
    all: ['revenue'] as const,
  },
} as const;
```

### `providers/query-provider.tsx` Is a Client Boundary

TanStack Query's `QueryClientProvider` requires `'use client'`. It lives in `providers/query-provider.tsx` and is rendered once in `app/layout.tsx` (the root layout). This establishes the query client for the entire app without making the root layout itself a Client Component.

---

## Import Aliases

Configured in `apps/web/tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@web/*": ["./src/*"]
    }
  }
}
```

Always use `@web/` for imports. Never use relative paths that climb more than one directory.

```ts
// Good
import { queryKeys } from '@web/lib/query-keys';
import type { JobResponse } from '@web/types/api';
import { useDashboardSummary } from '../_hooks/use-dashboard';

// Bad — climbing too deep
import { queryKeys } from '../../../../lib/query-keys';
```

Within a route folder, relative imports (e.g., `../_hooks/use-dashboard`) are acceptable for sibling files in the same route segment. For anything outside the route folder, use `@web/`.
