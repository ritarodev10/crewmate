# CrewMate — Development Roadmap

## Strategy

Schema-first approach. `prisma/schema.prisma` is the single contract that both backend and frontend reference from day one. Once the schema is locked, backend and frontend work run in parallel — the frontend uses typed dummy data shaped to exactly match the API response types defined in `apps/web/src/types/api.ts`. Integration in Phase 3 is a data-source swap, not a refactor.

---

## Phase 0 — Scaffold (blocks everything, do first)

Sequential. All other phases depend on this. No other phase begins until Phase 0 is complete.

1. **CLAUDE.md** — agent context file (operating rules, stack, monorepo layout, guardrails reading order)
2. **pnpm monorepo** — `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.npmrc`, `.gitignore`
3. **NestJS 11 app scaffold** — `apps/api/`: `nest-cli.json`, `package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`
4. **Next.js 15 app scaffold** — `apps/web/`: `package.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css` with design tokens, `src/app/layout.tsx`
5. **Prisma schema** — `prisma/schema.prisma`. Entities: `Operator`, `User`, `Worker`, `Team`, `TeamMember`, `Customer`, `JobType`, `Job`, `JobStatusEvent`. Enums: `JobStatus` (SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED), `WorkerStatus` (IDLE | ON_JOB | OFF_DUTY), `UserRole` (SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER), `WorkerKind` (SOLO | TEAM_MEMBER | TEAM_LEAD), `AssigneeKind` (SOLO | TEAM), `CancelCode` (CUSTOMER_CANCELLED | EQUIPMENT_UNAVAILABLE | WORKER_NO_SHOW | ACCESS_DENIED | DUPLICATE_JOB | EMERGENCY_RECALL). **This is THE CONTRACT for both tracks.**
6. **docker-compose.yml** — `postgres:17` on `:5432`, `redis:7` on `:6379`
7. **railway.toml** — Railway deploy config for the API service
8. **Cloudflare Workers config** — `wrangler.toml`, `open-next.config.ts`, proxy worker for single-domain routing
9. **GitHub Actions CI** — lint + typecheck + test on push/PR
10. **Shared API types file** — `apps/web/src/types/api.ts`: TypeScript interfaces mirroring Prisma schema field names and expected API response shapes. Frontend dummy data is typed against these interfaces.

---

## Phase 1 — Backend (parallel with Phase 2)

Starts after Phase 0 completes. Sections 1A–1F can be split across agents. Each section is independent after 1A ships.

### 1A — Core Infrastructure

- Config module — env validation with Zod, `process.env` only accessed here
- Prisma service — `PrismaClient` singleton, `onModuleInit`/`enableShutdownHooks`
- Health endpoints — `GET /healthz` (liveness), `GET /readyz` (readiness + DB ping)
- Auth module — `POST /auth/login` returns JWT access token + refresh token, Passport JWT strategy, auth guard
- Cloudflare secret guard — validates `x-cloudflare-secret` header on all non-health routes

### 1B — Jobs API

- `GET /jobs` — returns jobs grouped by status (kanban shape), supports `?worker=` and `?type=` filters, scoped by `operatorId`
- `POST /jobs` — create job from one of the 5 pre-seeded templates; auto-copies `estimatedHours`, `clientRatePerHour`, `customerPhotos`, and `workerPhotos` from `JobType`
- `GET /jobs/:id` — job detail including customer, assignee, photos, status history, computed earnings breakdown
- `PATCH /jobs/:id/status` — transitions SCHEDULED → IN_PROGRESS; sets `startedAt`, updates worker status to ON_JOB, fires `job.status.changed` WS event
- `PATCH /jobs/:id/progress` — updates `progressPct` (25/50/75/100), forward-only; fires `job.progress.updated` WS event; at 100% allows completion
- `PATCH /jobs/:id/cancel` — MANAGER/ADMIN only; accepts `cancelReasonCode` + optional `cancelReasonNote`; transitions SCHEDULED or IN_PROGRESS → CANCELLED; fires `job.cancelled` WS event

### 1C — Dashboard, Workers, Revenue

- `GET /dashboard/summary` — `{ totalJobs, activeWorkers, onTimeRate, revenueToday, profitToday }` — revenue and profit are computed from COMPLETED jobs, not stored
- `GET /dashboard/activity` — last 20 `JobStatusEvent` rows with actor name, job type, and status transition
- `GET /workers` — worker list with name, kind, status, jobs completed today, earnings today (computed), average rating
- `GET /workers/:id` — worker detail + today's jobs + current status
- `GET /workers/:id/earnings` — `{ today: { earned, projected, completed, total }, week, month, allTime }` — all figures computed from job rows
- `GET /revenue` — `{ summary: { totalRevenue, totalProfit, marginPct, jobsCompleted }, trend: [8 days], byType: [8 rows + totals] }`

Revenue formula (computed, never stored):
- `clientCharge = estimatedHours × clientRatePerHour × numberOfWorkersOnJob`
- `workerEarning = estimatedHours × worker.hourlyRate` (per individual worker)
- `platformProfit = clientCharge − Σ(workerEarnings)`

### 1D — WebSocket Gateway

- Socket.io gateway on `/ws`
- Rooms: `operator:{operatorId}` — all clients join on connect
- 4 emitted events:
  - `job.status.changed` — `{ jobId, status, workerId, teamId, lat, lng, progressPct }`
  - `job.progress.updated` — `{ jobId, progressPct, workerId }`
  - `job.cancelled` — `{ jobId, cancelReasonCode, cancelledBy }`
  - `worker.status.changed` — `{ workerId, status }`
- Emitted from service layer on every PATCH that changes job or worker state

### 1E — Seed + Demo Reset

- `prisma/seed.ts` — loads in this order: Operator → JobTypes (8 types with photo URLs) → Users (11) → Workers (9) → Teams → TeamMembers → Customers (15, Milan coordinates) → Jobs (40 today) → JobStatusEvents → HistoricalJobs (past 7 days for revenue trend)
- Photo URL pattern: `https://picsum.photos/seed/{jobTypeName}-{before|after}-{1|2}/400/300`
- `POST /demo/reset` — resets today's 40 jobs to seed state (SCHEDULED/CANCELLED as appropriate, progressPct=0, clears startedAt/completedAt), resets all workers to IDLE, deletes post-seed JobStatusEvents; does NOT touch historical jobs, customers, workers, users, or job types

### 1F — Tests

- Unit tests for `JobsService`: status transition guards (e.g. cannot go backward, cannot complete at < 100%), cancel authorization, revenue calculation correctness
- Unit tests for `WorkersService`: earnings calculation for today/week/month/allTime, projected earnings formula
- e2e test for health endpoints (`GET /healthz`, `GET /readyz`)
- Target: all business logic covered — revenue math, cancel codes, progress step rules, RBAC guards

---

## Phase 2 — Frontend (parallel with Phase 1)

Starts after Phase 0 completes. 2A must finish before 2B; 2B must finish before 2C–2I. Screens 2C–2I are all independent of each other.

All screens use dummy data from `docs/PRD/SEED-DATA.md` typed with interfaces from `apps/web/src/types/api.ts`. No real API calls until Phase 3.

### 2A — Design System

- `apps/web/src/app/globals.css` — CSS custom properties:
  - `--color-canvas: #F0EBE0` (warm off-white page background)
  - `--color-surface: #FFFFFF` (cards, drawers)
  - `--color-sidebar: #111318` (dark sidebar)
  - `--color-primary: #2563EB` (blue, actions + SCHEDULED pin)
  - Status colors: in-progress orange, completed green, cancelled grey
  - Shadow scale, border radius tokens
- shadcn/ui component init: `button`, `card`, `badge`, `dialog`, `sheet`, `tabs`, `select`, `input`, `avatar`, `skeleton`
- Zustand store — auth/session slice (current user, role) + demo actor state (active actor, switcher open)
- TanStack Query client setup — `QueryClientProvider`, default stale time

### 2B — App Shell

- `src/app/(app)/layout.tsx` — sidebar + main area shell
- `Sidebar` component — dark `#111318` background, role-gated nav items (Revenue hidden from WORKER, Workers hidden from WORKER, New Job hidden from WORKER/TEAM_LEAD), user pod at bottom, active state highlight
- `TopBar` component — page greeting, page title, contextual "New Job" button
- `src/app/(auth)/layout.tsx` — centered auth layout
- Middleware — checks JWT cookie, redirects unauthenticated requests to `/login`
- `DemoActorSwitcher` component — floating chip bottom-right, expands to show 11 actor buttons (one per seeded user), sets cookie, "Reset Demo" button

### 2C — Login Screen

- Two-panel layout: brand/product left, form right
- Email + password form with validation
- Demo shortcut buttons — 5 actors (Admin, Marco/Manager, Luca/Team Lead, Antonio/Worker, Chiara/Worker), one-click login sets cookie
- `loginAction()` Server Action — fixture mode matches email against SEED-DATA users, sets JWT-equivalent session cookie, redirects to `/dashboard` or `/worker` based on role

### 2D — Dashboard Screen

- 4 KPI cards — dummy values from SEED-DATA: 40 jobs total, 8 active workers, 95.6% on-time, €2,890 revenue
- Mapbox GL map — Milan center (45.47, 9.19), 40 job pins color-coded by status (blue/orange/green/grey), click pin opens Job Detail Drawer
- Live Activity Feed — dummy events from SEED-DATA job status history, newest first, 20 rows
- Map filter buttons — All / Scheduled / In Progress / Completed / Cancelled
- Job Detail Side Drawer (shared — see 2I)

### 2E — Jobs Kanban Screen

- 4 columns: Scheduled (12) / In Progress (8) / Completed (15) / Cancelled (5)
- Job cards — customer name, assigned worker/team, job type label, scheduled time, earnings preview
- Filter bar — worker dropdown + job type dropdown
- "New Job" modal — Step 1: pick one of 5 templates (auto-fills customer, hours, rate, photos); Step 2: pre-filled form, assign worker
- Job Detail Side Drawer (shared — see 2I)

### 2F — Workers Screen

- 4 summary KPI cards — total workers (9), on job now (8), completed today (by count), team avg earnings
- 3-column worker card grid — avatar, name, role badge (TEAM_LEAD / TEAM_MEMBER / SOLO), status pill, jobs today, earnings today, star rating
- Worker Detail Drawer — earnings tabs (Today / This Week / This Month / All Time) with bar charts using Recharts; Team Lead drawer includes team total vs individual breakdown
- "My Team" tab (Team Lead role) — shows only Team Alfa members

### 2G — Revenue Screen

- 4 KPI cards — total revenue, total profit, margin %, jobs billed (COMPLETED count)
- Recharts `AreaChart` — revenue vs profit dual-line, 8-day period (today − 7 through today), period selector (7d / 30d)
- Per-job-type breakdown table — 8 rows (one per job type) + totals row, columns: Job Type | Jobs | Revenue | Profit | Margin %

### 2H — Worker Mobile Screens

- `/worker` — mobile home (max-width 430px, sticky top header with status bar): earnings card with 4 tabs (Today / This Week / This Month / All Time), today's job list sorted by scheduled time, COMPLETED jobs greyed out
- `/worker/jobs/:id` — job card: progress stepper (`[Start] → [25%] → [50%] → [75%] → [100%] → [Complete]`), progress ring SVG, customer photos strip ("Before"), worker photos strip ("After", visible only when COMPLETED), ratings display on COMPLETED
- Status variants: SCHEDULED (start button active), IN_PROGRESS (progress stepper active, complete disabled until 100%), COMPLETED (read-only, full photos visible), CANCELLED (cancelled badge, reason shown)

### 2I — Shared Components

- `JobDetailDrawer` — 480px `Sheet` from right; sections: Job ID + type label + status badge, Customer (name, address), Assignee (avatar, name, earnings this job), Revenue Breakdown (client charge | platform profit | worker/team share), Progress ring (live), Customer photos ("Before"), Worker photos ("After", conditional on COMPLETED), Status timeline, "Revoke Job" button (MANAGER/ADMIN only), "Open in Worker View" link
- `RevokeJobModal` — triggered from drawer; 6 cancel reason radio buttons (CUSTOMER_CANCELLED / EQUIPMENT_UNAVAILABLE / WORKER_NO_SHOW / ACCESS_DENIED / DUPLICATE_JOB / EMERGENCY_RECALL) + optional note textarea + confirm button

---

## Phase 3 — Integration (sequential, after Phase 1 + 2)

Replace dummy data with real API calls. Screens and endpoints are matched 1-to-1. Each item below can be taken independently once both the relevant backend endpoint and frontend screen are done.

1. **Auth integration** — wire `loginAction()` to `POST /auth/login`, store JWT in httpOnly cookie, implement refresh flow
2. **Dashboard integration** — `GET /dashboard/summary` for KPI cards, `GET /dashboard/activity` for feed, `GET /jobs` for Mapbox pin data
3. **Jobs Kanban integration** — `GET /jobs` for columns, `POST /jobs` for new job modal, `PATCH /jobs/:id/status`, `PATCH /jobs/:id/progress`, `PATCH /jobs/:id/cancel`
4. **Workers integration** — `GET /workers` for card grid, `GET /workers/:id/earnings` for drawer tabs
5. **Revenue integration** — `GET /revenue` for all three sections, 30-second polling with TanStack Query `refetchInterval`
6. **Worker mobile integration** — `GET /jobs?worker={id}` for job list, `PATCH /jobs/:id/status` for start/complete, `PATCH /jobs/:id/progress` for progress steps
7. **WebSocket integration** — connect Socket.io on app load, join `operator:{id}` room, update TanStack Query cache on all 4 events (map pins, kanban columns, KPI cards, activity feed)
8. **Demo reset integration** — wire "Reset Demo" button in `DemoActorSwitcher` to `POST /demo/reset`, invalidate all TanStack Query caches on success

---

## Phase 4 — Ship

1. **Railway deploy** — API service + managed Postgres + managed Redis; environment variables set in Railway dashboard
2. **Cloudflare Workers deploy** — `wrangler deploy` for the web app via `@opennextjs/cloudflare`
3. **Prisma migrations** — `prisma migrate deploy` in Railway release command (runs before app starts)
4. **Smoke tests** — 4 curl checks: `GET /healthz` 200, `POST /auth/login` returns token, `GET /jobs` with token returns 40 jobs, WebSocket connects and joins room
5. **GitHub Actions** — `deploy-api.yml` (push to `main` → Railway deploy) and `deploy-web.yml` (push to `main` → Cloudflare Workers deploy)

---

## Parallel Execution Map

```
Phase 0 (scaffold + schema)                [sequential, blocks all]
    │
    ├── Phase 1A (core infra)              [starts after Phase 0]
    │       │
    │       ├── Phase 1B (jobs API)
    │       ├── Phase 1C (dashboard/workers/revenue)
    │       ├── Phase 1D (websocket gateway)
    │       ├── Phase 1E (seed + demo reset)
    │       └── Phase 1F (tests)           [all 1B–1F parallel after 1A]
    │
    ├── Phase 2A (design system)           [starts after Phase 0]
    │       │
    │       └── Phase 2B (app shell)
    │               │
    │               ├── Phase 2C (login)
    │               ├── Phase 2D (dashboard)
    │               ├── Phase 2E (jobs kanban)
    │               ├── Phase 2F (workers)
    │               ├── Phase 2G (revenue)
    │               ├── Phase 2H (worker mobile)
    │               └── Phase 2I (shared components)
    │                                      [all 2C–2I parallel after 2A+2B]
    │
    └── Phase 3 (integration)             [needs Phase 1 + 2 per feature]
            │
            └── Phase 4 (ship)            [needs Phase 3 complete]
```

---

## What Blocks What

| Phase | Blocked by |
|---|---|
| Phase 1A | Phase 0 complete |
| Phase 1B–1F | Phase 0 + Phase 1A (auth guard required) |
| Phase 2A | Phase 0 complete |
| Phase 2B | Phase 2A complete |
| Phase 2C–2I | Phase 2A + Phase 2B complete |
| Phase 3 (each item) | Relevant Phase 1 endpoint + relevant Phase 2 screen |
| Phase 4 | Phase 3 complete |

---

## Schema as the Contract

`prisma/schema.prisma` defines all entities, enums, and field types. `apps/web/src/types/api.ts` mirrors the expected API response shapes as TypeScript interfaces — field names and types match exactly. Both frontend dummy data and backend response serialization reference the same definitions from day one. Phase 3 integration is a data-source swap, not a refactor.

Key computed fields (not stored in DB, derived on read):
- `clientCharge = estimatedHours × clientRatePerHour × numberOfWorkersOnJob`
- `workerEarning = estimatedHours × worker.hourlyRate` (per worker)
- `platformProfit = clientCharge − Σ(workerEarnings)`

These appear in: `GET /jobs/:id` revenue breakdown, `GET /workers/:id/earnings`, `GET /revenue`, and `GET /dashboard/summary`.
