# CrewMate — /goal Conditions

Pre-written verifiable conditions for every wave. Copy the condition, run `/goal <condition>`.

**Rules for all conditions:**
- Claude proves the condition by running commands and showing output in the conversation
- Haiku evaluates from that output — not by reading files independently
- Every condition has a turn bound to prevent runaway loops
- Pair with auto mode for fully unattended execution

---

## Phase 0 — Scaffold + Deploy Pipeline

### Wave 1 — Foundation Files
```
/goal `pnpm install` exits 0 and `prisma/schema.prisma` exists with all 9 entities (Operator, User, Worker, Team, TeamMember, Customer, JobType, Job, JobStatusEvent) visible in the file and `apps/web/src/types/api.ts` exists or stop after 15 turns
```

### Wave 2 — App Scaffolds
```
/goal `pnpm --filter api build` exits 0 and `pnpm --filter web build` exits 0 or stop after 20 turns
```

### Wave 3 — Deploy Config
```
/goal `docker/api.Dockerfile` exists with 4 stages (base, deps, builder, runner) and `railway.toml` exists with a healthcheck entry and `wrangler.toml` exists with the crewmate.ritaro.dev route and `apps/web/src/worker/proxy.ts` exists or stop after 15 turns
```

### Wave 4 — CI/CD
```
/goal `.github/workflows/ci.yml` and `.github/workflows/deploy-api.yml` and `.github/workflows/deploy-web.yml` all exist and `pnpm typecheck` exits 0 or stop after 15 turns
```

### Phase 0 Gate
```
/goal `curl -s http://localhost:6201/healthz` returns 200 and `pnpm --filter api build` and `pnpm --filter web build` both exit 0 or stop after 10 turns
```

---

## Phase 1 — Backend

### 1A — Core Infrastructure
```
/goal `curl -s http://localhost:6201/healthz` returns `{"status":"ok"}` and `curl -s http://localhost:6201/readyz` returns 200 and `POST /auth/login` with valid credentials returns a JWT token or stop after 20 turns
```

### 1B — Jobs API
```
/goal `pnpm --filter api test` exits 0 and `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6201/jobs` returns a JSON object with status-grouped jobs and `curl -s -X POST ... http://localhost:6201/jobs` returns 201 or stop after 25 turns
```

### 1C — Dashboard, Workers, Revenue
```
/goal `GET /dashboard/summary` returns `{totalJobs, activeWorkers, onTimeRate, revenueToday, profitToday}` and `GET /workers` returns an array of workers with earnings and `GET /revenue` returns `{summary, trend, byType}` all with status 200 or stop after 25 turns
```

### 1D — WebSocket Gateway
```
/goal `pnpm --filter api test` exits 0 and the test output confirms all 4 WebSocket events (job.status.changed, job.progress.updated, job.cancelled, worker.status.changed) are emitted correctly or stop after 20 turns
```

### 1E — Seed + Demo Reset
```
/goal `pnpm prisma db seed` exits 0 and `GET /jobs` returns 40 jobs and `POST /demo/reset` returns 200 and a subsequent `GET /jobs` still returns 40 jobs with reset state or stop after 20 turns
```

### 1F — Tests
```
/goal `pnpm --filter api test` exits 0 with all test suites passing, output shows JobsService tests (transitions, cancel, revenue) and WorkersService tests (earnings) and health e2e tests all green or stop after 20 turns
```

---

## Phase 2 — Frontend

> Frontend conditions require the dev server running on :6200. Claude uses dev-browser or agent-browser to verify renders.

### 2A — Design System
```
/goal `pnpm --filter web build` exits 0 and `apps/web/src/app/globals.css` contains `--color-canvas` and `--color-sidebar` and `--color-primary` tokens and all 10 shadcn components (button, card, badge, dialog, sheet, tabs, select, input, avatar, skeleton) are installed or stop after 15 turns
```

### 2B — App Shell
```
/goal `pnpm --filter web build` exits 0 and the sidebar renders with dark background and role-gated nav items and unauthenticated requests to `/dashboard` redirect to `/login` as verified by dev-browser or stop after 20 turns
```

### 2C — Login Screen
```
/goal `/login` renders a two-panel layout with email/password form and 5 demo shortcut buttons (Admin, Marco, Luca, Antonio, Chiara) visible and clicking a demo button sets a session cookie and redirects as verified by dev-browser, no console errors or stop after 15 turns
```

### 2D — Dashboard Screen
```
/goal `/dashboard` renders 4 KPI cards with dummy values and a Mapbox map with colored job pins and a Live Activity Feed with 20 rows and map filter buttons, no console errors as verified by dev-browser or stop after 20 turns
```

### 2E — Jobs Kanban Screen
```
/goal `/jobs` renders 4 kanban columns (Scheduled/In Progress/Completed/Cancelled) with job cards and a filter bar and New Job modal opens on button click, no console errors as verified by dev-browser or stop after 20 turns
```

### 2F — Workforce Screen
```
/goal `/workforce` renders Workers tab with 4 KPI cards and a 3-column worker card grid and Teams tab renders team cards from Zustand state and Worker Detail Drawer opens on card click with earnings tabs, no console errors as verified by dev-browser or stop after 25 turns
```

### 2G — Revenue Screen
```
/goal `/revenue` renders 4 KPI cards and a dual-line AreaChart (revenue vs profit) and a per-job-type breakdown table with 8 rows plus totals, no console errors as verified by dev-browser or stop after 15 turns
```

### 2H — Worker Mobile Screens
```
/goal `/worker` renders earnings card with 4 tabs and today's job list at max-width 430px and `/worker/jobs/:id` renders a progress stepper and progress ring SVG, no console errors as verified by dev-browser or stop after 15 turns
```

### 2I — Shared Components
```
/goal `JobDetailDrawer` opens from a job card with all sections (customer, assignee, revenue breakdown, progress ring, photos, status timeline) and `RevokeJobModal` renders with all 6 cancel reason radio buttons, no console errors as verified by dev-browser or stop after 15 turns
```

---

## Phase 3 — Integration

### Auth integration
```
/goal `POST /auth/login` with `{"email":"admin@crewmate.io","password":"demo"}` returns a JWT and the browser sets an httpOnly cookie and redirects to `/dashboard` as verified by dev-browser showing the dashboard loaded, no console errors or stop after 15 turns
```

### Dashboard integration
```
/goal `/dashboard` KPI cards show live values from `GET /dashboard/summary` (not dummy data) and the activity feed shows real events from `GET /dashboard/activity` as verified by comparing API response to rendered values in dev-browser or stop after 15 turns
```

### Jobs Kanban integration
```
/goal `GET /jobs` populates all 4 kanban columns with live data and `POST /jobs` creates a new job that appears in the Scheduled column and `PATCH /jobs/:id/status` moves a job to In Progress as verified by dev-browser showing the column change or stop after 20 turns
```

### Workers integration
```
/goal `GET /workers` populates the worker card grid with live data and `GET /workers/:id/earnings` populates the drawer earnings tabs with correct computed values as verified by dev-browser or stop after 15 turns
```

### Revenue integration
```
/goal `GET /revenue` populates all 3 revenue screen sections with live data and TanStack Query refetchInterval is set to 30 seconds (visible in network tab) as verified by dev-browser or stop after 15 turns
```

### Worker mobile integration
```
/goal a worker can start a job via `PATCH /jobs/:id/status`, update progress to 100% via `PATCH /jobs/:id/progress`, and complete it — all steps verified by dev-browser showing UI state changes and DB state confirmed via postgres MCP query or stop after 20 turns
```

### WebSocket integration
```
/goal triggering `PATCH /jobs/:id/status` causes the kanban column to update in the browser without a page refresh as verified by dev-browser showing the card move, and the Socket.io connection to `operator:{operatorId}` room is established on app load or stop after 20 turns
```

### Demo reset integration
```
/goal clicking "Reset Demo" calls `POST /demo/reset` which returns 200 and all TanStack Query caches invalidate and `GET /jobs` returns 40 jobs in seed state as verified by dev-browser showing the board reset or stop after 15 turns
```

### Search integration
```
/goal typing "Marco" in GlobalSearch calls `GET /search?q=Marco` with 300ms debounce and returns grouped results (jobs, workers, customers sections) visible in the dropdown as verified by dev-browser or stop after 15 turns
```
