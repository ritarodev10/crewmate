# CrewMate

Field service operations platform for property and hospitality operators. Coordinate field crews, track jobs in real time, and monitor revenue — all from a single dashboard.

**Live demo:** [crewmate.ritaro.dev](https://crewmate.ritaro.dev)

---

## What It Does

CrewMate helps operations managers coordinate field workers across a city. A manager assigns HVAC repairs, electrical work, and plumbing jobs to workers or teams. Workers receive jobs on their phone, update progress in real time, and complete jobs with photo evidence. The manager watches everything live on a Mapbox map — no refresh needed.

The demo is pre-loaded with **CrewMate Demo SpA**, a Milan-based field service company with 9 workers, 8 job types, and 40 active jobs across the city.

---

## Roles & Access

| Role | What they see |
|---|---|
| **Manager** | Dashboard map, all jobs, all workers, full revenue & profit |
| **Team Lead** | Same as manager but scoped to their team (Team Alfa) |
| **Worker** | Mobile job list, their own earnings, progress steps |

---

## Login

Go to [crewmate.ritaro.dev/login](https://crewmate.ritaro.dev/login).

**Quickest way — use the demo shortcut buttons on the login page.** One click logs you in as any actor without typing.

Or sign in manually:

| Name | Email | Password | Role |
|---|---|---|---|
| Rita Admin | `admin@crewmate.demo` | `demo1234` | Manager |
| Marco Bianchi | `marco@crewmate.demo` | `demo1234` | Team Lead |
| Luca Ferrari | `luca@crewmate.demo` | `demo1234` | Worker |
| Sofia Russo | `sofia@crewmate.demo` | `demo1234` | Worker |
| Davide Conti | `davide@crewmate.demo` | `demo1234` | Worker |
| Elena Marino | `elena@crewmate.demo` | `demo1234` | Worker |
| Andrea Costa | `andrea@crewmate.demo` | `demo1234` | Worker |
| Giulia Ricci | `giulia@crewmate.demo` | `demo1234` | Worker |
| Matteo Greco | `matteo@crewmate.demo` | `demo1234` | Worker |
| Chiara Bruno | `chiara@crewmate.demo` | `demo1234` | Worker |

> All accounts use password `demo1234`. The floating chip (bottom-right corner) lets you switch actors at any time without logging out.

---

## Demo Scenarios

### The Core Live Demo (best shown in two browser tabs)

**Tab 1:** Log in as **Manager** → go to Dashboard  
**Tab 2:** Log in as **Worker (Luca)** → go to his job list

Now in Tab 2, open a scheduled job and tap **Start Job**. Watch Tab 1 — the job pin on the map turns orange and the activity feed updates instantly. No refresh.

Tap through the 4 progress steps (25% → 50% → 75% → 100%) and hit **Complete**. The map pin turns green, the KPI cards update, and the revenue counters tick up.

---

### Scenario 1 — Dashboard Overview (Manager)
- 4 KPI cards: total jobs today, active workers, on-time rate, revenue
- Mapbox map centered on Milan with color-coded job pins (blue = scheduled, orange = in progress, green = completed, grey = cancelled)
- Click any pin → job detail drawer slides in with customer, assignee, revenue breakdown, and photos
- Live activity feed shows every status change as it happens

### Scenario 2 — Jobs Kanban (Manager or Team Lead)
- 4 columns: Scheduled / In Progress / Completed / Cancelled
- Cards move columns in real time as workers update their jobs
- Filter by worker or job type
- Click **New Job** → pick a template (HVAC Inspection, Electrical Fault Check, etc.) → assign a worker → confirm

### Scenario 3 — Revoke a Job (Manager only)
- Open any in-progress or scheduled job from the Kanban board
- Click **Revoke Job** → select a reason (Client Cancel, No Access, Worker Sick, etc.) → confirm
- The worker's tab shows the job marked as cancelled with the reason displayed

### Scenario 4 — Team Lead vs Manager
- Log in as **Marco (Team Lead)** — he sees the Workers screen scoped to Team Alfa only
- His Revenue screen shows Team Alfa's numbers, not the full company
- He cannot see the platform profit margin (Manager-only field)

### Scenario 5 — Worker Mobile View
- Log in as any worker on a mobile device (or resize browser to 430px)
- No sidebar — full-screen job list
- Earnings card at the top with tabs: **Today / This Week / This Month / All Time**
- Today tab shows earned so far + projected earnings based on remaining jobs
- All Time tab shows lifetime total, jobs count, member since, and avg customer rating

### Scenario 6 — Progress Stepper & Earnings During Job
- Open an in-progress job as a worker
- The circular progress ring shows current completion
- Tap a progress step → ring animates to new percentage → "Earned so far" updates in real time
- Earnings calculate as: `progressPct / 100 × totalWorkerEarning`
- Complete button only activates at 100%

### Scenario 7 — Revenue & Profit (Manager)
- Revenue screen shows trend chart (revenue vs profit, last 7 days)
- Per-job-type table: HVAC Repair earns the most, sorted by revenue
- Profit formula visible: `Client Rate − Worker Cost = Platform Profit`
- Refreshes every 30 seconds

### Scenario 8 — Worker Earnings Tabs
- Open the Workers screen as a manager → click any worker card
- Detail drawer shows Today / This Week / This Month / All Time tabs with bar charts
- Team Lead variation: the All Time tab includes a Team Alfa breakdown table

### Scenario 9 — Reset Demo Data
- The demo actor switcher (floating chip, bottom-right) has a **Reset Demo** button
- Wipes all job progress, re-seeds the original 40 jobs at their starting states
- Useful after a live demo session to restore clean data

---

## Stack

| Layer | Technology |
|---|---|
| API | NestJS 11 · TypeScript · Prisma 6 · PostgreSQL 17 |
| Real-time | Socket.io WebSocket gateway (4 events) |
| Web | Next.js 15 App Router · React 19 · Tailwind CSS 4 · shadcn/ui |
| State | TanStack Query 5 · Zustand 5 |
| Maps | Mapbox GL JS |
| Auth | Passport JWT (access + refresh) |
| Deploy | Railway (API) · Cloudflare Workers (Web) |
| CI/CD | GitHub Actions · Docker |

---

## Local Development

```bash
# Prerequisites: Node 22, pnpm 10, Docker

# Start PostgreSQL
docker compose up -d

# Install dependencies
pnpm install

# Run migrations and seed demo data
pnpm prisma migrate dev
pnpm db:seed

# Start dev servers
pnpm dev
# API → http://localhost:3000
# Web → http://localhost:3001
```

### Environment variables

`apps/api/.env`:
```
DATABASE_URL=postgresql://crewmate:crewmate@localhost:5432/crewmate
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
CLOUDFLARE_SHARED_SECRET=<secret>
```

`apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Project Structure

```
apps/
  api/          NestJS API (REST + WebSocket)
  web/          Next.js web app
prisma/         Schema, migrations, seed
docker/         API Dockerfile
docs/
  PRD/          Product requirements (source of truth)
```

---

## Deploy

- **API:** Railway — push to `main` triggers auto-deploy via GitHub integration
- **Web:** Cloudflare Workers — `wrangler deploy` from `apps/web/`
- **CI:** GitHub Actions runs lint → typecheck → test on every push; deploys on merge to `main`

### First-time Railway setup
1. Create a Railway project at [railway.app](https://railway.app)
2. Add a PostgreSQL service and a Redis service
3. Deploy the API service linked to this repo (`apps/api/`)
4. Railway auto-injects `DATABASE_URL` and `REDIS_URL`
5. Set remaining secrets in Railway dashboard: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDFLARE_SHARED_SECRET`
6. Add `RAILWAY_TOKEN` to GitHub repo secrets for CI deploy
