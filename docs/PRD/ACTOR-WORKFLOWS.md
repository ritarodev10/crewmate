# CrewMate — Actor Workflows (v2)

> Every use case from every actor's POV. Updated per review pass.
> ✅ In scope | 🔶 Nice to have | ❌ Out of scope

---

## Actor 1: Super Admin (Demo Controller)

| # | Workflow | Status | Notes |
|---|---|---|---|
| A1.1 | Open app, land on login | ✅ | |
| A1.2 | Click demo shortcut → login as any actor without typing credentials | ✅ | |
| A1.3 | Switch actor via floating chip without logging out | ✅ | Sets demo_actor cookie |
| A1.4 | Open Worker/Team Lead mode in new tab while Dashboard stays open | ✅ | Core WS demo path |
| A1.5 | Reset all demo data to seed state via button | ✅ | POST /demo/reset |
| A1.6 | View all jobs, all workers, all revenue across operator | ✅ | Inherits manager view |

---

## Actor 2: Operations Manager

**RBAC: full access to all screens. "Revoke Job" visible. "New Job" visible. Revenue/Profit visible.**

### 2A — Dashboard

| # | Workflow | Status | Notes |
|---|---|---|---|
| B1.1 | Log in | ✅ | |
| B1.2 | See 4 KPI cards: total jobs, active workers, on-time %, revenue | ✅ | Revenue = system share |
| B1.3 | See map with job pins colored by status (blue/orange/green/grey) | ✅ | Mapbox satellite, Milan |
| B1.4 | See pin color change live when worker updates status | ✅ | WebSocket |
| B1.5 | See progress ring on IN_PROGRESS pins update live | ✅ | WebSocket |
| B1.6 | Click a map pin → job detail opens in side drawer | ✅ | |
| B1.7 | See live activity feed (auto-prepends on WS event) | ✅ | |
| B1.8 | See revenue and profit KPIs update live as jobs complete | ✅ | WebSocket |
| B1.9 | Filter map pins by status (toggle blue/orange/green/grey) | ✅ | Promoted from 🔶 |

### 2B — Jobs (Kanban)

| # | Workflow | Status | Notes |
|---|---|---|---|
| B2.1 | See jobs in 4-column kanban: SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED | ✅ | |
| B2.2 | See kanban card move column live when worker changes status | ✅ | WebSocket |
| B2.3 | Click a kanban card → side drawer opens | ✅ | |
| B2.4 | Side drawer: job info, customer, assignee, revenue breakdown, photos, status history | ✅ | |
| B2.5 | Side drawer: click "Open in Worker View" → new tab, mobile layout | ✅ | Core demo path |
| B2.6 | Create a new job (form with 5 quick templates) | ✅ | Template fills type/hrs/rate/photos |
| B2.7 | Revoke a job: pick predefined reason, optional note → status = CANCELLED | ✅ | Manager/Admin only |

### 2C — Workers

| # | Workflow | Status | Notes |
|---|---|---|---|
| B3.1 | See worker cards: name, status badge, jobs today count, earned today | ✅ | |
| B3.2 | Click worker card → drawer with their jobs today and earnings breakdown | ✅ | |
| B3.3 | See worker earned amount update live as they complete jobs | ✅ | WebSocket |

### 2D — Revenue & Profit

| # | Workflow | Status | Notes |
|---|---|---|---|
| B4.1 | See revenue and profit as separate KPI cards on dashboard | ✅ | Revenue = job total, Profit = system share |
| B4.2 | See revenue breakdown in job detail drawer (total, system share, worker/team share) | ✅ | |
| B4.3 | See revenue trend chart (last 7 days, two lines: revenue + profit) | ✅ | From seed historical data |
| B4.4 | See per-job-type breakdown table (jobs count, revenue, profit, margin %) | ✅ | On Revenue screen |

---

## Actor 3: Team Lead

**RBAC: sees only their team's jobs on kanban and map. Can see team member earnings. Cannot create or revoke jobs.**

### 3A — Dashboard (Team-scoped)

| # | Workflow | Status | Notes |
|---|---|---|---|
| D1.1 | Log in | ✅ | |
| D1.2 | See dashboard filtered to Team Alfa's jobs only | ✅ | All data scoped by team |
| D1.3 | See team KPI cards: team jobs today, team members on-job, team revenue | ✅ | |
| D1.4 | See map showing only Team Alfa's job pins | ✅ | RBAC filter on map query |
| D1.5 | See live updates on team jobs | ✅ | WebSocket, filtered by team |
| D1.6 | Click a pin → job detail drawer (see photos, progress, member assigned) | ✅ | |

### 3B — Team Jobs

| # | Workflow | Status | Notes |
|---|---|---|---|
| D2.1 | See team's kanban: same 4 columns but only team jobs | ✅ | |
| D2.2 | See kanban cards move live | ✅ | WebSocket |
| D2.3 | Open side drawer for any team job | ✅ | |
| D2.4 | Cannot create or revoke jobs (buttons hidden) | ✅ | RBAC enforced |

### 3C — Team Earnings

| # | Workflow | Status | Notes |
|---|---|---|---|
| D3.1 | See own earnings card (same tabs as worker: today/week/month/lifetime) | ✅ | |
| D3.2 | See team earnings card: total pool + member breakdown for today | ✅ | Lead sees all member earnings |
| D3.3 | Lead earning is visually distinct from member earnings (larger %, different label) | ✅ | |

### 3D — Worker App Mode (same as solo worker)

| # | Workflow | Status | Notes |
|---|---|---|---|
| D4.1 | Open their own jobs in worker mobile view | ✅ | /worker route |
| D4.2 | Start, progress, complete own assigned jobs | ✅ | Same flow as solo worker |

---

## Actor 4: Field Worker (Solo or Team Member)

**RBAC: sees only own jobs. No kanban, no map, no revenue screen. Earnings visible.**

### 4A — Worker Home

| # | Workflow | Status | Notes |
|---|---|---|---|
| C1.1 | Log in (or switch via demo chip) | ✅ | |
| C1.2 | See list of their jobs for today, sorted by scheduledFor | ✅ | |
| C1.3 | See earnings summary card with tabs: Today / This Week / This Month / All Time | ✅ | |
| C1.4 | Today tab: earned (completed) + projected (in-progress) + job completion count | ✅ | |
| C1.5 | This Week tab: total + mini bar chart Mon–Sun + % vs last week | ✅ | |
| C1.6 | This Month tab: total + week-by-week bars + % vs last month | ✅ | |
| C1.7 | All Time tab: total earned + jobs completed + member-since date | ✅ | |
| C1.8 | See mini status summary at top: X done, Y in progress, Z scheduled | ✅ | |
| C1.9 | Tap a job → open job detail | ✅ | |

### 4B — Job Execution

| # | Workflow | Status | Notes |
|---|---|---|---|
| C2.1 | See job detail: customer name, address, type, estimated hours, rate, earnings for this job | ✅ | |
| C2.2 | See customer photos (before/problem photos) | ✅ | Read-only |
| C2.3 | Tap "Start Job" → status = IN_PROGRESS, progressPct = 0 | ✅ | Fires WS event |
| C2.4 | Tap "25%" → progressPct = 25 | ✅ | Fires WS job.progress.updated |
| C2.5 | Tap "50%" → progressPct = 50 | ✅ | Fires WS job.progress.updated |
| C2.6 | Tap "75%" → progressPct = 75 | ✅ | Fires WS job.progress.updated |
| C2.7 | Tap "100%" → progressPct = 100, "Complete" button activates | ✅ | |
| C2.8 | Tap "Complete" → status = COMPLETED | ✅ | Fires WS job.status.changed |
| C2.9 | Cannot complete below 100% (button disabled) | ✅ | UI enforced |
| C2.10 | Cannot go backward on progress steps | ✅ | Forward-only UI |
| C2.11 | See own earnings for this job update after completing | ✅ | Live recalc |
| C2.12 | See worker photos section (empty before they start, they add after) | 🔶 | Cosmetic, placeholder |

---

## System Behaviors (automatic, no actor triggers)

| # | Behavior | Status | Notes |
|---|---|---|---|
| S1 | Job status/progress change broadcasts WS event to operator room | ✅ | |
| S2 | Worker.status → ON_JOB when they start a job | ✅ | |
| S3 | Worker.status → IDLE when they complete or their job is cancelled | ✅ | |
| S4 | Revenue + Profit KPIs recalculate on every job.status.changed event | ✅ | |
| S5 | On-time % recalculates: startedAt within 15 min of scheduledFor | ✅ | |
| S6 | Daily seed reset at midnight Europe/Rome | ✅ | Cron |
| S7 | POST /demo/reset resets all job state immediately | ✅ | Manual trigger |
| S8 | RBAC guards reject unauthorized role access at API level | ✅ | NestJS guards |

---

## What's Out of Scope (not being built)

| Feature | Reason |
|---|---|
| Drag kanban card to change status | Worker owns status, not manager |
| Export jobs to CSV | Not needed for demo |
| Add / edit workers | Pre-seeded, no forms needed |
| Worker on map as separate pin | Coordinates are static, adds confusion |
| Generate invoice | Out of scope |
| Timesheet approval | Out of scope |
| Search jobs/workers from topbar | Removed from plan |
| Upload photos on mobile | Placeholder only, not real upload |
| Get directions (open Maps) | Out of scope |
| Chat with manager | Out of scope |
| Worker earnings history (past days beyond seed) | Seed covers last 7 days |
| Request payout | Out of scope |
| Recurring jobs | Out of scope |
| Notifications (push/SMS) | Out of scope |
| Multi-operator support | Single operator demo |

---

## What Could Be Added (next phase)

### High value for portfolio
- New job creation from map click (click empty location → pre-fills coordinates)
- Filter kanban by worker or job type
- Team Lead can reassign a job within their team
- Mini static map in job detail drawer

### Realistic product features
- Customer portal (track job status via shareable link)
- Recurring jobs (auto-creates same job weekly)
- Equipment assignment to jobs
- Worker schedule (availability calendar)
- Reporting: revenue per worker, per type, per week
- Audit log viewer (admin sees all status changes)

### Demo-only polish
- "Replay Day" mode — auto-steps through status changes on a timer
- Confetti animation on job completion
- Dark mode toggle in demo panel
