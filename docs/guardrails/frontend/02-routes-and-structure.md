# 02 — Routes and structure

Two things in one chapter. The **route map** of every page in `apps/web`, what each page shows, and the status of that route. And the **folder convention** that every page follows, with feature-local `_components`, `_hooks`, and `_utils` folders next to the page they belong to, plus shared top-level folders for code that earned its place across three or more callers.

This chapter is the single answer to two questions a new agent picking up the web app keeps asking. "What routes exist and what should they render." "Where do I put new files for this page."

---

## Route map

Every authenticated route lives under the `(app)` route group with a shared layout (sidebar plus topbar). Every authentication-flow route lives under `(auth)` with no shell. The worker mobile view is at `/today` under `(app)` but renders its own minimal shell (header plus footer plus job list, no sidebar).

Status mirrors the tier in `docs/FEATURES.md`. The sidebar dot and the topbar pill defined in `03-layout-and-navigation.md` render the same status per route. When a route is promoted across tiers, this map, the layout chapter, and the feature card update together.

### Auth surfaces

| Route | Status | Realizes | What it shows | Owner chapter |
|---|---|---|---|---|
| `/login` | Live | F-002 | Two-panel split. Navy left with editorial headline `Coordinate field work without the chaos.` and three customer wordmarks. Bone right with a sign-in card (email, password, Forgot link, primary `Sign in`, divider, `Continue with Google` secondary). Bottom line `Not on CrewMate yet? Talk to your operator.` | `11-auth-flows.md` |
| `/forgot` | Planned | F-007 | Single card. Email input plus a `Send reset link` primary. Success state replaces the card with a one-line confirmation. | `11-auth-flows.md` |
| `/reset/[token]` | Planned | F-007 | New password, confirm password, primary `Set password`. Invalid or expired token renders a full-page ErrorState with a link back to `/forgot`. | `11-auth-flows.md` |
| `/invite/[token]` | Planned | F-006 | Three sections in one card. The role and scope read-only at the top, password fields in the middle, primary `Accept invitation`. Already-accepted token renders a small notice with a sign-in link. | `11-auth-flows.md` |

### App shell surfaces

The `(app)` group wraps every authenticated route except `/today` with the sidebar plus topbar shell from `03-layout-and-navigation.md`.

| Route | Status | Realizes | What it shows | Owner chapter |
|---|---|---|---|---|
| `/` | Live | n/a | Server-side redirect. `tenant_admin` and `coordinator` land on `/dispatch`. `worker` lands on `/today`. `super_admin` lands on `/dispatch`. | `03-layout-and-navigation.md` |
| `/dashboard` | Preview | F-080 | Three KPI cards across the top (Jobs completed, On-time rate, Avg job duration with deltas), a wide stacked-area chart `Jobs by status over time`, two side-by-side cards `Top properties by job volume` (horizontal bars) and `Workers, last 7 days` (sparkline list). Date range selector top-right, `Export` outline button. | `13-dashboard-and-analytics.md` |
| `/dispatch` | Live | F-031 | Four-column kanban (Scheduled, En route, In progress, Completed). Job cards show property, time chip, worker pill, optional amber active dot. Filter row above the board. | `14-dispatch-board.md` |
| `/dispatch/[jobId]` | Live | F-032 | Same dispatch board with a right-side Drawer open over it. Drawer holds the job detail (status pill, horizontal stepper, details key-value, activity timeline, action buttons). | `12-data-display.md` plus `14-dispatch-board.md` |
| `/schedule` | Preview | F-050 | Week grid with workers in rows and 7 days in columns. Rounded event blocks per scheduled job. Week selector with arrows and `Today` jump. Worker and property filters. | `16-schedule-view.md` |
| `/properties` | Preview | F-021 | Card grid of operator properties. Each card shows name, address, region tag, job count, last activity. `New property` primary top-right. Click a card to open `/settings/properties/[id]`. | `19-settings.md` |
| `/workers` | Preview | F-022 | List of workers with status (available, on a job, off), today's job count, last activity. Click a row to open the worker drawer. | `18-team-and-rbac.md` |
| `/webhooks` | Preview | F-063 | Stripe-style table of webhook deliveries. Columns Status, Event, Endpoint, Attempt, Timestamp, Latency. Filter chips above. Selected row opens a pinned right-side detail panel with the raw signed payload (JsonViewer) and headers. `Retry failed` action. | `17-webhooks-and-events.md` |

### Worker mobile surface

| Route | Status | Realizes | What it shows | Owner chapter |
|---|---|---|---|---|
| `/today` | Live | F-040, F-041 | Mobile-shaped page. Header with `Today` title and date. Vertical list of today's jobs as cards (property name, time window, status pill, primary action button per state). Footer with a single `Sign out` link. No sidebar, no tab bar. | `15-worker-mobile.md` |

### Settings surfaces

All under `/settings/*`. Sidebar shows a nested sub-nav when any settings route is active.

| Route | Status | Realizes | What it shows | Owner chapter |
|---|---|---|---|---|
| `/settings/profile` | Preview | F-100 | Identity card (avatar, name, email read-only with `Change email` link), Password card, Two-factor card (link to enrollment), Language and timezone card, Sign-out-everywhere action. | `19-settings.md` |
| `/settings/notifications` | Preview | F-072 | Preferences matrix. Rows are notification kinds (Worker invited, Password reset, Webhook delivery failed digest, Weekly summary). Email column only in v0.1; SMS and Push columns are Planned. | `19-settings.md` |
| `/settings/team` | Preview | F-090, F-091, F-092 | Member list table with avatar, name, email, RolePill, scope chips, last active. `Invite member` primary top-right opens the invite dialog. Pending invitations card below the table. Row click opens member Drawer. | `18-team-and-rbac.md` |
| `/settings/team/roles` | Planned | F-093 | Built-in roles read-only at top. Custom roles as Card grid with name, permission summary, member count. `New role` Dialog with permissions matrix (action by subject). | `18-team-and-rbac.md` |
| `/settings/properties` | Preview | F-021 | Same property cards as `/properties` but with edit affordances. Per-property edit page at `/settings/properties/[id]` with Profile, Team scope, Default schedule rules cards plus danger-zone delete. | `19-settings.md` |
| `/settings/webhooks` | Preview | F-060 | Endpoint list as Cards. Each card shows URL, event subscriptions, last delivery summary, status (active, paused, failing). `Add endpoint` primary. Per-endpoint detail at `/settings/webhooks/[id]` with edit URL, subscriptions, rotate secret, pause toggle, `Test delivery` action. | `17-webhooks-and-events.md` |
| `/settings/audit` | Preview | F-016 | Table of `permission_audits` rows. Columns When, Actor, Subject, Action, Decision (StatusPill), Reason. Filters by date range, actor, subject type, decision. Row click opens a Drawer with full audit detail. `Export CSV` outline button. | `19-settings.md` plus `12-data-display.md` |
| `/settings/account` | Preview | F-101 | Operator-level settings. Operator name + slug, timezone default, default job duration, danger zone with multi-step `Delete operator` ConfirmDialog requiring the operator name typed verbatim. | `19-settings.md` |

### API surfaces (reverse-proxied, not Next.js routes)

These are proxied by the Cloudflare Worker (`apps/web/src/worker/proxy.ts`) to the AWS backend. They do not have Next.js pages and do not show up in the route map for components.

- `/api/*` and `/v1/*` REST endpoints
- `/graphql` GraphQL endpoint
- `/ws` WebSocket upgrade
- `/api/healthz` and `/api/readyz` health endpoints (the proxy bypasses the shared-secret check on these so the ALB target group can reach them via the Worker if needed)

---

## Folder structure

Feature-based architecture. Every page owns its own `_components`, `_hooks`, and `_utils` folders next to `page.tsx`. The underscore prefix is Next.js's private-folder convention; folders starting with `_` are excluded from routing.

Shared code (used in three or more pages) lives in top-level folders without the underscore. Promotion from feature-local to shared follows the rule of three documented in `06-reusable-patterns.md`.

### Canonical tree

```
apps/web/src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # auth route group, no shell
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts                  # server actions for this page
│   │   │   ├── _components/                # login-only components
│   │   │   │   ├── sign-in-card.tsx
│   │   │   │   ├── customer-wordmarks.tsx
│   │   │   │   └── google-button.tsx
│   │   │   ├── _hooks/                     # login-only hooks
│   │   │   │   └── use-login-mutation.ts
│   │   │   ├── _utils/                     # login-only utilities
│   │   │   │   └── parse-next-param.ts
│   │   │   └── _schema/                    # login form schema (zod)
│   │   │       └── login.schema.ts
│   │   ├── forgot/
│   │   ├── reset/
│   │   │   └── [token]/
│   │   ├── invite/
│   │   │   └── [token]/
│   │   └── layout.tsx                      # auth shell (centered card)
│   │
│   ├── (app)/                     # authenticated app shell
│   │   ├── layout.tsx                      # sidebar + topbar
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── _components/
│   │   │   │   ├── kpi-card.tsx
│   │   │   │   ├── jobs-status-chart.tsx
│   │   │   │   ├── property-bar-chart.tsx
│   │   │   │   └── workers-sparkline-list.tsx
│   │   │   ├── _hooks/
│   │   │   │   └── use-overview-metrics.ts
│   │   │   └── _utils/
│   │   │       └── compute-delta.ts
│   │   ├── dispatch/
│   │   │   ├── page.tsx
│   │   │   ├── [jobId]/
│   │   │   │   ├── page.tsx                # drawer route (intercepted)
│   │   │   │   └── _components/
│   │   │   │       └── job-drawer.tsx
│   │   │   ├── _components/
│   │   │   │   ├── kanban-column.tsx
│   │   │   │   ├── job-card.tsx
│   │   │   │   ├── active-dot.tsx
│   │   │   │   └── filter-bar.tsx
│   │   │   ├── _hooks/
│   │   │   │   ├── use-dispatch-jobs.ts
│   │   │   │   ├── use-job-subscription.ts
│   │   │   │   └── use-transition-job.ts
│   │   │   └── _utils/
│   │   │       └── group-by-status.ts
│   │   ├── schedule/
│   │   │   ├── page.tsx
│   │   │   ├── _components/
│   │   │   │   ├── week-grid.tsx
│   │   │   │   ├── event-block.tsx
│   │   │   │   └── week-selector.tsx
│   │   │   ├── _hooks/
│   │   │   │   └── use-week-schedule.ts
│   │   │   └── _utils/
│   │   │       └── week-bounds.ts
│   │   ├── properties/
│   │   ├── workers/
│   │   ├── webhooks/
│   │   │   ├── page.tsx                    # deliveries log
│   │   │   ├── _components/
│   │   │   │   ├── delivery-row.tsx
│   │   │   │   ├── payload-viewer.tsx
│   │   │   │   └── retry-failed-button.tsx
│   │   │   └── _hooks/
│   │   │       └── use-deliveries.ts
│   │   ├── today/                          # worker mobile, no sidebar
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx                  # overrides app shell
│   │   │   ├── _components/
│   │   │   │   ├── job-card-mobile.tsx
│   │   │   │   └── action-button.tsx
│   │   │   ├── _hooks/
│   │   │   │   └── use-today-jobs.ts
│   │   │   └── _utils/
│   │   │       └── format-window.ts
│   │   └── settings/
│   │       ├── layout.tsx                  # settings sub-nav
│   │       ├── profile/
│   │       │   ├── page.tsx
│   │       │   └── _components/
│   │       ├── notifications/
│   │       ├── team/
│   │       │   ├── page.tsx
│   │       │   ├── roles/
│   │       │   │   ├── page.tsx
│   │       │   │   └── _components/
│   │       │   └── _components/
│   │       │       ├── member-row.tsx
│   │       │       ├── invite-dialog.tsx
│   │       │       └── member-drawer.tsx
│   │       ├── properties/
│   │       ├── webhooks/
│   │       ├── audit/
│   │       │   ├── page.tsx
│   │       │   ├── _components/
│   │       │   │   └── audit-row-drawer.tsx
│   │       │   └── _hooks/
│   │       │       └── use-audit-query.ts
│   │       └── account/
│   │
│   ├── layout.tsx                          # root layout (providers)
│   ├── globals.css
│   └── not-found.tsx                       # 404
│
├── components/                    # SHARED, used in 3+ pages
│   ├── ui/                                 # shadcn primitives, vendored
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form-field.tsx
│   │   ├── status-pill.tsx
│   │   ├── role-pill.tsx
│   │   ├── status-dot.tsx                  # the sidebar nav dot
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── tooltip.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── shell/                              # app shell pieces
│   │   ├── sidebar.tsx
│   │   ├── sidebar-nav-item.tsx
│   │   ├── topbar.tsx
│   │   ├── topbar-status-pill.tsx          # the topbar status indicator
│   │   ├── user-pod.tsx
│   │   └── breadcrumbs.tsx
│   ├── data-display/                       # tables, timelines, json viewer
│   │   ├── data-table.tsx
│   │   ├── timeline.tsx
│   │   └── json-viewer.tsx
│   ├── states/                             # empty, loading, error
│   │   ├── empty-state.tsx
│   │   ├── error-state.tsx
│   │   └── skeleton-rows.tsx
│   └── icons/                              # any icon compositions
│
├── hooks/                         # SHARED hooks
│   ├── use-current-user.ts
│   ├── use-tenant.ts
│   ├── use-toast.ts
│   ├── use-confirm.ts
│   ├── use-debounced-value.ts
│   ├── use-hotkey.ts
│   ├── use-online-status.ts
│   ├── use-reduced-motion.ts
│   ├── use-copy-to-clipboard.ts
│   ├── use-search-param.ts
│   └── use-search-params.ts
│
├── lib/                           # SHARED helpers, clients, adapters
│   ├── apollo-client.ts
│   ├── apollo-provider.tsx
│   ├── query-client.ts
│   ├── query-keys.ts                       # the keys factory
│   ├── auth.ts                             # token, cookie helpers
│   ├── motion.ts                           # duration + easing constants
│   ├── cn.ts                               # className merger (re-export)
│   ├── format-relative-time.ts
│   ├── format-time-range.ts
│   ├── initials.ts
│   ├── avatar-color.ts
│   ├── group-by.ts
│   ├── chunk.ts
│   └── get-policy-denied-reason.ts
│
├── stores/                        # SHARED Zustand stores (ephemeral UI)
│   ├── ui.ts                               # drawer open, modal open, etc.
│   ├── filters.ts                          # in-flight filter form state
│   └── selection.ts                        # bulk-select sets
│
├── worker/                        # Cloudflare Worker entry + proxy
│   ├── entry.ts                            # Worker entrypoint
│   └── proxy.ts                            # the /api, /v1, /graphql, /ws proxy
│
└── styles/
    └── tokens.css                          # design system CSS variables
```

### Why the underscore

Next.js App Router treats any folder prefixed with `_` as a private folder. Its contents are not routed. `app/dispatch/_components/job-card.tsx` is reachable as an import inside the dispatch route but is not exposed at `/dispatch/_components/job-card` in the URL space.

This lets each page own its components, hooks, and utilities without polluting the route table. It also gives the agent reading the page a clear "look here first" signal.

### Folder vocabulary per page

| Folder | Purpose | Examples |
|---|---|---|
| `_components/` | UI components used only by this page or one of its child routes | `job-card.tsx`, `kanban-column.tsx` |
| `_hooks/` | Custom hooks scoped to this page | `use-dispatch-jobs.ts`, `use-job-subscription.ts` |
| `_utils/` | Pure functions used only by this page | `group-by-status.ts` |
| `_schema/` | Zod schemas for forms or query parsers on this page | `login.schema.ts` |
| `_types/` | Types specific to this page (avoid this folder if the types belong in `@crewmate/contracts`) | `dispatch-filters.ts` |

The four standard names cover almost every case. Add a new `_*` folder only when none of the four fit. Resist proliferation.

### Promotion lifecycle

The same rule from `06-reusable-patterns.md` applies, in folder terms.

| Callsite count | Where the file lives |
|---|---|
| 1 | `app/<route>/_components/` or `_hooks/` or `_utils/` |
| 2 | Stay there. Copy and adapt is the right move. |
| 3 | Promote to `components/<domain>/`, `hooks/`, or `lib/` per the rule of three |

Promotion is a separate PR. The promoting PR moves the file, updates imports across all three (now sharing) callsites, adds a unit test, and adds a one-paragraph doc comment. It does not introduce new behavior. Bundling promotion with a feature change makes the diff impossible to review.

### What never gets promoted

Some things look duplicated across pages but stay feature-local on purpose.

- **Page-specific status pill mapping.** Each page maps its domain status to a StatusPill variant. The mappings happen to overlap but are conceptually distinct. Keep them in `_components/`.
- **Empty-state copy.** Each page writes its own. Resist a shared `EmptyStateCopy` constant.
- **Page-specific form schemas.** Each form's zod schema lives next to the form. Share via composition (`.extend()`) only when truly the same shape.

### Edge cases the convention handles cleanly

- **Dynamic segments.** `app/dispatch/[jobId]/page.tsx` is the drawer route. The drawer-only components live under `app/dispatch/[jobId]/_components/`. The kanban-only components live one level up under `app/dispatch/_components/`.
- **Nested layouts.** Settings has its own `layout.tsx` with the sub-nav. Worker view has its own `layout.tsx` that overrides the app shell with the mobile shell.
- **Route groups.** `(auth)` and `(app)` are route groups (parens). They do not appear in URLs. They let two shells live in the same tree.
- **Server actions.** Live next to the page that owns them as `actions.ts`. Imported only inside that page subtree.

### What goes in the root `components/`

A component is promoted to root `components/` only when one of these is true.

- It is used in three or more pages.
- It is a primitive that other components compose (the shadcn `Button`, `Input`, `Dialog` set).
- It belongs to the app shell (sidebar, topbar, breadcrumbs).
- It is a generic data-display piece (table, timeline, JSON viewer).
- It is an empty/loading/error state shell.

Anything that fails all five tests stays under a page's `_components/`.

### What goes in the root `hooks/`

A hook is promoted to root `hooks/` when it has three or more callers across different page subtrees AND it has a single named responsibility AND it has a unit test AND it does not push complexity into its callers (no "mode" flags). Same rules as the components catalog in `01-components.md` and the patterns in `06-reusable-patterns.md`.

### What goes in the root `lib/`

A helper is promoted to root `lib/` when it has three or more callers AND is a pure function AND does not reach across module boundaries. Domain-specific helpers (a "format job duration" function used only on the dispatch board) stay in `_utils/`.

### What goes in the root `stores/`

A Zustand store is promoted to root `stores/` when it holds ephemeral UI state shared across two or more pages. Form draft state stays in `react-hook-form`. Server state stays in Apollo or TanStack Query. The Zustand stores in v0.1 are small and few.

---

## Done checklist for this chapter

A page added to the app is correctly structured when:

- It lives under `app/(auth)/` or `app/(app)/` per its authentication requirement.
- It uses `_components/`, `_hooks/`, `_utils/` for any page-local files. No file is left at the route root unless it is `page.tsx`, `layout.tsx`, `actions.ts`, `error.tsx`, `loading.tsx`, or `not-found.tsx`.
- Its row in the route map at the top of this chapter is added with status, realizes, what-it-shows, and owner chapter columns filled in.
- The sidebar dot mapping in `03-layout-and-navigation.md` and the per-screen status pill mapping there both include the new route.
- The feature card in `docs/FEATURES.md` references the route.

## Gaps

- The `super_admin` lands on `/dispatch` of the operator they were last on. Multi-operator switch UI is not specified here; super_admin is a one-person admin role in v0.1 and switches by URL.
- The `/dispatch/[jobId]` route is documented as a drawer-over-the-board pattern but the precise intercepting-routes implementation is left to the page author. Both intercepting routes and a client-side drawer state work; pick the one the dispatch board's realtime subscription tolerates better.
- Worker tablet layout is not specified. A tablet that hits `/today` renders the phone layout centered at 480px max width on a `bg-canvas` letterbox.
