# CrewMate — System Map (v2)

> Source for the PRD. Updated: teams, per-type revenue share, photos, RBAC, cancellation.
> City: Milan, Italy. All data pre-seeded, resets daily at midnight Europe/Rome.

---

## The Demo Goal

1. Dashboard with real Mapbox satellite map (Milan) — job pins colored by status
2. Floating "Demo" panel to switch actor instantly — no login friction
3. Click a map pin → job detail opens in a side drawer (photos, revenue split, status history)
4. Open Worker/Team Lead mode in a new tab (mobile layout)
5. Tap to update progress (25/50/75/100%) → map pin, kanban card, KPIs update live via WebSocket
6. Worker earnings update in real time; team lead and members see different share amounts
7. Admin can revoke any job with a predefined reason

---

## Actors & RBAC

```
SUPER ADMIN
  Access: everything + demo switcher + reset button
  RBAC: no restrictions, sees all tenants

OPERATIONS MANAGER
  Access: dashboard, jobs (kanban), workers, revenue/profit view
  RBAC: can create jobs, revoke jobs, view all workers and teams
  Cannot: edit worker profiles, access demo panel

TEAM LEAD
  Access: dashboard (own team only), own team's jobs, team earnings
  RBAC: sees only their team's jobs on kanban and map
        can see team member earnings breakdown
        cannot revoke jobs (manager only)
        cannot see other teams' revenue

WORKER (Solo or Team Member)
  Access: own jobs today, own earnings (today/week/month/lifetime)
  RBAC: sees only their assigned jobs
        cannot see other workers' data
        cannot create or revoke jobs

UI differences enforced by role:
  - Nav sidebar items hidden if role has no access
  - "Revoke Job" button only visible to MANAGER and SUPER_ADMIN
  - "New Job" button hidden from WORKER and TEAM_LEAD
  - Revenue/Profit screen hidden from WORKER (they see Earnings instead)
  - Team Lead sees a "My Team" tab on the workers screen
```

---

## Entities

### Core

```
Operator
  id, name
  Seed: "CrewMate Demo SpA"

User
  id, operatorId
  email, passwordHash, name, avatarUrl
  role: SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER

Team
  id, operatorId, name
  leadUserId → User (the team lead)
  Seed: one team — "Team Alfa"

TeamMember
  id, teamId, workerId
  (junction table — a worker belongs to at most one team)

Worker
  id, operatorId, userId
  name, avatarUrl, phone
  kind: SOLO | TEAM_MEMBER | TEAM_LEAD
  hourlyRate                   ← personal rate €/hr (e.g. Lead €34, Member €25, Solo €26-30)
  currentLat, currentLng       ← static from seed
  status: IDLE | ON_JOB | OFF_DUTY

Customer
  id, operatorId
  name, address                ← Milan address
  contactName, contactPhone    ← cosmetic
  lat, lng

JobType  (lookup table, pre-seeded)
  id, name                     ← e.g. "HVAC_REPAIR"
  label                        ← display name "HVAC Repair"
  clientRatePerHour            ← what platform charges client per worker per hour (e.g. €72)
  estimatedHours               ← default job duration in hours
  customerPhotoUrls[]          ← 2 pre-seeded "before" photo URLs for this job type
  workerPhotoUrls[]            ← 2 pre-seeded "after" photo URLs for this job type

Job
  id, operatorId
  customerId
  assigneeId                   ← Worker or Team id
  assigneeKind: SOLO | TEAM
  jobTypeId
  status: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
  progressPct: 0|25|50|75|100
  scheduledFor                 ← datetime
  startedAt, completedAt
  estimatedHours               ← copied from JobType at creation
  clientRatePerHour            ← copied from JobType at creation
  customerPhotos[]             ← pre-seeded URLs from JobType.customerPhotoUrls (read-only)
  workerPhotos[]               ← pre-seeded URLs from JobType.workerPhotoUrls (read-only, visible after COMPLETED)
  customerRating               ← 1–5 stars, pre-seeded for COMPLETED jobs
  customerTestimony            ← text review, pre-seeded for COMPLETED jobs
  notes                        ← cosmetic
  lat, lng                     ← from customer
  cancelReasonCode             ← null unless CANCELLED
  cancelReasonNote             ← optional free text
  cancelledBy                  ← userId of who revoked it
  cancelledAt

JobStatusEvent
  id, jobId
  fromStatus, toStatus
  actorUserId
  occurredAt
  metadata: Json               ← e.g. { cancelReasonCode, progressPct }
```

### Derived (computed on read, not stored)

```
Revenue model: platform charges per worker-hour, each worker is paid their personal rate.

clientCharge     = estimatedHours × clientRatePerHour × numberOfWorkersOnJob
workerEarning    = estimatedHours × worker.hourlyRate     (per individual worker)
platformProfit   = clientCharge − Σ(workerEarnings)

clientRatePerHour is always > any single worker.hourlyRate, so profit is always positive.

For SOLO job (1 worker):
  clientCharge   = 3h × €72 = €216
  workerEarning  = 3h × €28 = €84
  profit         = €132

For TEAM job (lead + 3 members):
  clientCharge   = 3h × €72 × 4 workers = €864
  leadEarning    = 3h × €34 = €102
  memberEarning  = 3h × €25 = €75 each  (×3 = €225)
  totalWorkers   = €327
  profit         = €537

Team lead's "bonus" is embedded in their higher personal hourlyRate — not a % calculation.
```

---

## Job Types (pre-seeded)

Client rate = what platform bills per worker per hour. Worker rates are on each Worker record.

| JobType | Label | Client Rate/hr (€) | Est. Hrs | Solo example profit* | Notes |
|---|---|---|---|---|---|
| HVAC_REPAIR | HVAC Repair | 72 | 3.0 | €132 | Standard skilled trade |
| HVAC_MAINTENANCE | HVAC Maintenance | 58 | 2.0 | €60 | Routine, lower rate |
| AC_INSTALLATION | AC Installation | 80 | 4.0 | €208 | Complex, higher value |
| ELECTRICAL_PANEL | Electrical Panel | 85 | 3.5 | €199 | Licensed work |
| PIPE_REPAIR | Pipe Repair | 68 | 2.5 | €100 | Plumber rates |
| DRAIN_CLEANING | Drain Cleaning | 50 | 1.5 | €33 | Lower skill, lower rate |
| LIGHTING_INSTALL | Lighting Install | 62 | 2.0 | €68 | Moderate complexity |
| GENERATOR_REPAIR | Generator Repair | 92 | 4.5 | €279 | Specialist, highest rate |

*Solo example profit = clientCharge − singleWorkerEarning (at €28/hr worker rate)

**Italian market context:** B2B field service companies in Italy charge clients €50–100/hr per technician.
Net contractor pay of €25–34/hr is realistic gross before INPS/tax contributions.

---

## Job Status & Map Pins

```
SCHEDULED   → blue pin   🔵
IN_PROGRESS → orange pin 🟠  (progress ring overlaid)
COMPLETED   → green pin  🟢
CANCELLED   → grey pin   ⚫  (dimmed, shown with ✕)
```

### Status transitions

```
SCHEDULED   ──→ IN_PROGRESS   worker/lead taps "Start Job"
IN_PROGRESS ──→ IN_PROGRESS   worker taps progress step (no status change, progressPct updates)
IN_PROGRESS ──→ COMPLETED     worker taps "Complete" (only at progressPct = 100)
SCHEDULED   ──→ CANCELLED     manager/admin taps "Revoke Job" + picks reason
IN_PROGRESS ──→ CANCELLED     manager/admin taps "Revoke Job" + picks reason
```

### Cancellation reason codes (predefined)

```
CUSTOMER_CANCELLED      Customer requested cancellation
EQUIPMENT_UNAVAILABLE   Required equipment not available
WORKER_NO_SHOW          Assigned worker did not show up
ACCESS_DENIED           Could not access the property
DUPLICATE_JOB           Entered in error / duplicate
EMERGENCY_RECALL        Worker recalled for emergency
```

---

## Progress Steps (Worker UI)

```
[ Start ] → [ 25% ] → [ 50% ] → [ 75% ] → [ 100% ] → [ Complete ]
```

- Steps are forward-only — can't go backward
- "Complete" button disabled until progressPct = 100
- Each step fires `job.progress.updated` WS event
- "Start" fires `job.status.changed` (SCHEDULED → IN_PROGRESS) WS event
- "Complete" fires `job.status.changed` (IN_PROGRESS → COMPLETED) WS event

---

## Photos

Both photo sets are **fully pre-seeded** — no upload functionality needed.
Photos are sourced from `JobType.customerPhotoUrls` and `JobType.workerPhotoUrls` at job creation.

```
customerPhotos[]  (label: "Before")
  - 2 URLs per job, copied from JobType.customerPhotoUrls at job creation
  - Represents the problem/site — visible immediately on any job
  - Shown as thumbnail strip at top of job detail drawer

workerPhotos[]    (label: "After")
  - 2 URLs per job, copied from JobType.workerPhotoUrls at job creation
  - Represents work completion — shown only when status = COMPLETED
  - Shown as thumbnail strip below customer photos
```

Each job type has its own fixed photo set (e.g., all HVAC_REPAIR jobs show the same "before" HVAC photo).
This is intentional for demo purposes — keeps seed simple, still looks realistic in the UI.

---

## New Job — 5 Quick Templates

Create Job form has **only** the template path — pick one of 5 pre-seeded templates.
Template auto-fills: job type, customer, hours, client rate, and customer photos. Worker is assigned manually.

| Template | Type | Customer | Hrs | Client Rate/hr |
|---|---|---|---|---|
| T1 | HVAC Maintenance | Politecnico MI | 2.0 | €58 |
| T2 | Drain Cleaning | Darsena Office | 1.5 | €50 |
| T3 | Pipe Repair | Porta Romana Tech | 2.5 | €68 |
| T4 | Lighting Install | Brera Pinacoteca | 2.0 | €62 |
| T5 | AC Installation | UniCredit Tower | 4.0 | €80 |

---

## Teams vs Solo — Revenue Example

**Solo Worker (Antonio, €30/hr), HVAC Repair (3h, client rate €72/hr):**
```
Client charge:  3h × €72 × 1 worker  = €216.00
Antonio earns:  3h × €30             = €90.00
Platform profit:                       €126.00  (58% margin)
```

**Team Alfa, AC Installation (4h, client rate €80/hr, 4 workers):**
```
Client charge:  4h × €80 × 4 workers = €1,280.00
Luca (Lead):    4h × €34             = €136.00
Sofia:          4h × €25             = €100.00
Davide:         4h × €25             = €100.00
Elena:          4h × €25             = €100.00
Total workers:                         €436.00
Platform profit:                       €844.00  (66% margin)
```

The team lead's higher rate (€34 vs €25) is the "bonus" — it's built into their hourly rate, not a % calculation on top.

---

## Worker Earnings Display — UX Recommendation

The Worker app home screen has a sticky earnings card at the top.

```
┌─────────────────────────────────────────────┐
│  Your Earnings                              │
│  [Today] [This Week] [This Month] [All Time]│
│                                             │
│  Today tab:                                 │
│    €204.00 earned                           │
│    + €128.25 projected (in-progress)        │
│    3 of 5 jobs completed                    │
│                                             │
│  This Week tab:                             │
│    €1,020.00  ▲ 12% vs last week           │
│    Mini bar chart (Mon–Sun, today = today)  │
│                                             │
│  This Month tab:                            │
│    €3,840.00  ▲ 8% vs last month           │
│    Week-by-week bar chart                   │
│                                             │
│  All Time tab:                              │
│    €24,600.00 total earned                  │
│    312 jobs completed                       │
│    Member since March 2025                  │
└─────────────────────────────────────────────┘
```

**Why this structure:**
- Today is the primary motivator (workers check this constantly)
- Week gives performance context (am I on track?)
- Month gives paycheck context (how much will I get paid?)
- All Time shows tenure and track record (pride, not stress)
- Progressive disclosure — tabs avoid overwhelming on a small screen
- Projected earnings are visually distinct (lighter, not part of "real" number)

For Team Lead: additional card below showing team total vs individual breakdown.

---

## Revenue & Profit Display (Manager/Admin)

```
Dashboard KPI cards (top row):
  [Total Jobs Today]   [Active Workers]   [Revenue Today]   [Profit Today]

Revenue screen (separate page or expandable drawer):
  Revenue = sum of all job revenues (COMPLETED jobs)
  Profit  = sum of systemEarning across COMPLETED jobs
  
  Top: 4 summary cards
    Total Revenue  |  Total Profit  |  Profit Margin %  |  Jobs Completed

  Middle: Revenue trend chart (last 7 days)
    Area chart — two lines: Revenue (blue) + Profit (green)

  Bottom: Per-job-type breakdown table
    | Job Type | Jobs | Revenue | Profit | Margin |

  (All data from DB, seeded for past 7 days for historical trend)
```

---

## WebSocket Events

```
job.status.changed    { jobId, status, workerId, teamId, lat, lng, progressPct }
job.progress.updated  { jobId, progressPct, workerId }
job.cancelled         { jobId, cancelReasonCode, cancelledBy }
worker.status.changed { workerId, status }
```

**What updates live on manager dashboard:**
- Map pin color + progress ring
- Kanban card moves column on status change
- KPI counters (active workers, revenue, profit, jobs)
- Live activity feed (prepend new row)
- Worker earnings card if open

---

## Screen Layout Rule

Every main screen follows this pattern:

```
┌──────────────────────────────────────────┐
│  Page title + subtitle                   │
├──────────────────────────────────────────┤
│  Summary cards (3–4 KPIs for this module)│
├──────────────────────────────────────────┤
│  Main content: kanban / table / map      │
│  (bulk of the screen)                    │
└──────────────────────────────────────────┘
```

---

## Screens

| Route | Roles | Summary Cards | Main Content |
|---|---|---|---|
| `/login` | All | — | Form + demo shortcuts |
| `/dashboard` | MANAGER, ADMIN | Jobs today, Active workers, On-time %, Revenue | Map (right half) + activity feed |
| `/jobs` | MANAGER, ADMIN, TEAM_LEAD | Total, Scheduled, In Progress, Completed | Kanban (4 cols) + side drawer |
| `/workers` | MANAGER, ADMIN | Total workers, On job now, Completed today, Team avg earnings | Worker cards |
| `/revenue` | MANAGER, ADMIN | Total revenue, Profit, Margin %, Jobs billed | Revenue trend + per-type table |
| `/worker` | WORKER, TEAM_LEAD | Today earned, Projected, Jobs done, Jobs left | Job list |
| `/worker/jobs/:id` | WORKER, TEAM_LEAD | — | Job card with progress stepper |

**Job detail side drawer** (accessible from `/jobs` kanban and `/dashboard` map pin):
```
- Job ID + type label + status badge
- Customer name + address
- Assigned worker/team (avatar, name, earnings this job)
- Revenue breakdown: Job total | System share | Worker/team share
- Progress ring (live)
- Customer photos (before)
- Worker photos (after, live-updating)
- Status history timeline
- "Revoke Job" button (MANAGER/ADMIN only) → modal with reason picker
- "Open in Worker View" button → new tab, mobile layout
```

---

## API Endpoints

```
POST   /auth/login
GET    /dashboard/summary          → { totalJobs, activeWorkers, onTimeRate, revenue, profit }
GET    /dashboard/activity         → last 20 JobStatusEvents
GET    /jobs                       → jobs grouped by status (kanban)
GET    /jobs/:id                   → job + customer + assignee + photos + status history + earnings
POST   /jobs                       → create job (from template or custom)
PATCH  /jobs/:id/status            → { status } — fires WS event
PATCH  /jobs/:id/progress          → { progressPct } — fires WS event
PATCH  /jobs/:id/cancel            → { cancelReasonCode, cancelReasonNote } — fires WS event
GET    /workers                    → worker list with today's earnings
GET    /workers/:id                → worker detail + jobs + earnings breakdown
GET    /workers/:id/earnings       → { today, week, month, lifetime }
GET    /revenue                    → { summary, trend[7], byType[] }
POST   /demo/reset                 → reset all job state to seed defaults
WS     /ws                         → Socket.io, room: operator:{id}
```

---

## Build Order

```
Phase 1 — Schema
  1. Add Team + TeamMember tables
  2. Add JobType lookup table with revenue fields
  3. Update Job: add photos[], cancel fields, jobTypeId, systemSharePct
  4. Update Worker: add kind, status fields
  5. Add role TEAM_LEAD to User

Phase 2 — Seed
  6. Seed JobTypes (8 types with revenue shares)
  7. Seed Operator, Users, Workers, Team Alfa (lead + 3 members), 5 solo workers
  8. Seed 15 Customers (Milan coordinates)
  9. Seed 40+ Jobs with mixed statuses, times, photos
  10. Seed historical jobs (past 7 days) for revenue trend
  11. /demo/reset endpoint

Phase 3 — API
  12. Auth module (login → JWT + RBAC guards)
  13. Jobs module (list, get, create, patch status/progress/cancel)
  14. Dashboard module (summary + activity)
  15. Workers module (list, get, earnings)
  16. Revenue module (summary + trend)
  17. WebSocket gateway

Phase 4 — Web
  18. Login + demo shortcuts
  19. RBAC layout guard (hides nav items per role)
  20. Dashboard: KPI cards + map + activity feed
  21. Jobs: Kanban + side drawer
  22. Workers: worker cards
  23. Revenue: trend chart + table
  24. Worker app: job list + earnings card (tabs)
  25. Worker app: job card + progress stepper
  26. Demo actor switcher overlay
  27. WebSocket client wiring
```
