# CrewMate — Screen Index

> All screens at a glance. Each entry has a layout diagram + role access + file link.
> Detailed specs (all elements, filters, actions, API calls) live in the individual files.

---

## File Map

```
docs/PRD/screens/
  INDEX.md                  ← this file
  01-login.md               ← /login
  02-dashboard.md           ← /dashboard
  03-jobs-kanban.md         ← /jobs
  04-workers.md             ← /workers
  05-revenue.md             ← /revenue
  06-worker-home.md         ← /worker  (mobile)
  07-worker-job-card.md     ← /worker/jobs/:id  (mobile)
  08-shared-components.md   ← sidebar, topbar, job drawer, demo switcher, revoke modal
```

---

## Role → Screen Access

| Screen | SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER |
|---|---|---|---|---|
| /login | ✅ | ✅ | ✅ | ✅ |
| /dashboard | ✅ | ✅ | ✅ (team only) | ❌ |
| /jobs | ✅ | ✅ | ✅ (team only) | ❌ |
| /workers | ✅ | ✅ | ❌ | ❌ |
| /revenue | ✅ | ✅ | ❌ | ❌ |
| /worker | ❌ | ❌ | ✅ | ✅ |
| /worker/jobs/:id | ❌ | ❌ | ✅ | ✅ |

Post-login redirect:
- SUPER_ADMIN / MANAGER → /dashboard
- TEAM_LEAD → /dashboard (data scoped to their team)
- WORKER → /worker

---

## Screen 1 — Login `/login`

→ [01-login.md](./01-login.md)

Roles: All

```
┌─────────────────────────────────────────────────────────────────┐
│  ←── 45% ──────────────────────→  ←── 55% ──────────────────→  │
│                                                                  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐  │
│  │                          │    │                          │  │
│  │   [C] CrewMate           │    │  Sign in to CrewMate     │  │
│  │                          │    │                          │  │
│  │   "Coordinate your       │    │  Email ________________  │  │
│  │    field operations      │    │                          │  │
│  │    from one place"       │    │  Password _____________  │  │
│  │                          │    │                          │  │
│  │   [logo] [logo] [logo]   │    │  [   Sign in   ]         │  │
│  │   (client logos cosmetic)│    │                          │  │
│  │                          │    │  ─── Demo shortcuts ───  │  │
│  │                          │    │  [Admin] [Manager]       │  │
│  │                          │    │  [Team Lead] [Worker ▾]  │  │
│  │                          │    │                          │  │
│  └──────────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

Key: Demo shortcut buttons auto-fill and submit without typing. One-click login for each seeded actor.

---

## Screen 2 — Dashboard `/dashboard`

→ [02-dashboard.md](./02-dashboard.md)

Roles: MANAGER, ADMIN (full) · TEAM_LEAD (team-scoped)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [C] CrewMate  │  Dashboard   🔍 Search...              [+ New Job]   │
├───────────────┼──────────────────────────────────────────────────────┤
│               │                                                       │
│  Dashboard ◀  │  ┌──────────┐┌──────────┐  ┌────────────────────┐  │
│  Jobs         │  │Total Jobs││ Active   │  │                    │  │
│  Workers      │  │  142  ↑12%│ Workers  │  │   MAPBOX MAP       │  │
│  Revenue      │  └──────────┘│  38  ↑5% │  │   (satellite)      │  │
│               │  ┌──────────┘└──────────┘  │   Milan, Italy     │  │
│               │  │On-Time % ││ Revenue  │  │                    │  │
│               │  │  94%  ↑4% │ €7,020  ↑8%│  🔵🟠🟢 pins       │  │
│               │  └──────────┘└──────────┘  │  (click → drawer)  │  │
│               │                             │                    │  │
│               │  Live Activity    View all  │  [Status filters]  │  │
│               │  ┌─────────────────────── ┐ │  🟢74 🟠22 🔵27   │  │
│               │  │ ✓ Marco  completed job │ └────────────────────┘  │
│               │  │ ▶ Sofia  started job   │                         │
│               │  │ ↑ Luca   progress 75%  │                         │
│               │  │ ✕ J-020  cancelled     │                         │
│               │  └────────────────────────┘                         │
│               │                                                       │
│  [JD] ──────  │                                                       │
└───────────────┴───────────────────────────────────────────────────────┘
```

Live updates via WebSocket: pin colors, progress rings, KPI counts, activity feed.

---

## Screen 3 — Jobs Kanban `/jobs`

→ [03-jobs-kanban.md](./03-jobs-kanban.md)

Roles: MANAGER, ADMIN (all jobs) · TEAM_LEAD (team jobs only)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [C] CrewMate  │  Jobs         🔍 Search...              [+ New Job]  │
├───────────────┼──────────────────────────────────────────────────────┤
│               │  ┌──────────┐┌──────────┐┌──────────┐┌──────────┐  │
│  Dashboard    │  │ Total 40 ││Sched  12 ││In Prog 8 ││Done   15 │  │
│  Jobs  ◀      │  └──────────┘└──────────┘└──────────┘└──────────┘  │
│  Workers      │                                                       │
│  Revenue      │  Filter: [Worker ▾] [Job Type ▾]                     │
│               │                                                       │
│               │  ┌──────────┐┌──────────┐┌──────────┐┌──────────┐  │
│               │  │SCHEDULED ││IN PROGRES││COMPLETED ││CANCELLED │  │
│               │  │  12  🔵  ││  8   🟠  ││  15  🟢  ││  5   ⚫  │  │
│               │  ├──────────┤├──────────┤├──────────┤├──────────┤  │
│               │  │[J-014]   ││[J-009]   ││[J-001]   ││[J-019]   │  │
│               │  │HVAC Repr ││Elec Panel││AC Install││Elec Panel│  │
│               │  │Fondazione││PortaRoman││UniCredit ││Brera     │  │
│               │  │14:00     ││◉ 75%     ││★★★★★    ││✕ Cust.  │  │
│               │  │[J-015]   ││[J-010]   ││[J-002]   ││[J-020]   │  │
│               │  │AC Install││HVAC Maint││HVAC Maint││HVAC Maint│  │
│               │  │...       ││◉ 50%     ││★★★★★    ││✕ Equip. │  │
│               │  └──────────┘└──────────┘└──────────┘└──────────┘  │
└───────────────┴───────────────────────────────────────────────────────┘
                                           ↓ click any card
                              ┌────────────────────────┐
                              │ Job Detail Drawer →    │
                              │ (see 08-shared-comps)  │
                              └────────────────────────┘
```

Kanban cards move columns live via WebSocket on status change.

---

## Screen 4 — Workers `/workers`

→ [04-workers.md](./04-workers.md)

Roles: MANAGER, ADMIN

```
┌──────────────────────────────────────────────────────────────────────┐
│ [C] CrewMate  │  Workers        🔍 Search...                         │
├───────────────┼──────────────────────────────────────────────────────┤
│               │  ┌──────────┐┌──────────┐┌──────────┐┌──────────┐  │
│  Dashboard    │  │ Total  9 ││On Job  6 ││Done Tdy 8││Avg €X   │  │
│  Jobs         │  └──────────┘└──────────┘└──────────┘└──────────┘  │
│  Workers  ◀   │                                                       │
│  Revenue      │  [All Workers] [Team Alfa]   tabs                    │
│               │                                                       │
│               │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│               │  │ 🔧 Luca F.   │ │ 👤 Sofia C.  │ │ 👤 Davide R. ││
│               │  │ TEAM_LEAD    │ │ TEAM_MEMBER  │ │ TEAM_MEMBER  ││
│               │  │ 🟢 ON JOB   │ │ 🟢 ON JOB   │ │ 🟢 ON JOB   ││
│               │  │ 5/8 jobs    │ │ 3/5 jobs    │ │ 3/5 jobs    ││
│               │  │ €136 earned │ │ €100 earned │ │ €100 earned ││
│               │  │ +€X proj.   │ │ +€X proj.   │ │ +€X proj.   ││
│               │  │ 4.9 ⭐      │ │ 4.7 ⭐      │ │ 4.6 ⭐      ││
│               │  └──────────────┘ └──────────────┘ └──────────────┘│
│               │  ... (more worker cards) ...                         │
└───────────────┴───────────────────────────────────────────────────────┘
                                  ↓ click card
                     ┌─────────────────────────────┐
                     │ Worker Detail Drawer        │
                     │ [Today][Week][Month][All]   │
                     │ jobs list + earnings tabs   │
                     └─────────────────────────────┘
```

Worker card status badges update live via WebSocket.

---

## Screen 5 — Revenue `/revenue`

→ [05-revenue.md](./05-revenue.md)

Roles: MANAGER, ADMIN only

```
┌──────────────────────────────────────────────────────────────────────┐
│ [C] CrewMate  │  Revenue        🔍 Search...                         │
├───────────────┼──────────────────────────────────────────────────────┤
│               │  ┌──────────┐┌──────────┐┌──────────┐┌──────────┐  │
│  Dashboard    │  │ Revenue  ││  Profit  ││  Margin  ││Jobs Bild │  │
│  Jobs         │  │ €7,020   ││ €1,340   ││  19.1%   ││   36     │  │
│  Workers      │  │  ↑8%     ││  ↑12%    ││          ││          │  │
│  Revenue  ◀   │  └──────────┘└──────────┘└──────────┘└──────────┘  │
│               │                                                       │
│               │  Revenue Trend (last 7 days)    [Today▾]             │
│               │  €8K ┤                                    ●          │
│               │  €6K ┤          ╭──╮    ╭──╮  ╭────────╯           │
│               │  €4K ┤╭────────╯  ╰────╯  ╰──╯  ← Revenue          │
│               │  €2K ┤╭──────────────────────────── Profit (green)  │
│               │  €0K ┤                                               │
│               │       Mon  Tue  Wed  Thu  Fri  Sat  Sun              │
│               │                                                       │
│               │  Per Job Type Breakdown                               │
│               │  ┌──────────────┬──────┬─────────┬───────┬───────┐  │
│               │  │ Job Type     │ Jobs │ Revenue │ Profit│Margin │  │
│               │  ├──────────────┼──────┼─────────┼───────┼───────┤  │
│               │  │ HVAC Repair  │  8   │ €1,728  │ €888  │  51%  │  │
│               │  │ AC Install   │  6   │ €1,920  │ €984  │  51%  │  │
│               │  │ ...          │ ...  │ ...     │ ...   │ ...   │  │
│               │  ├──────────────┼──────┼─────────┼───────┼───────┤  │
│               │  │ TOTAL        │  36  │ €7,020  │€1,340 │  19%  │  │
│               │  └──────────────┴──────┴─────────┴───────┴───────┘  │
└───────────────┴───────────────────────────────────────────────────────┘
```

Revenue = clientCharge (what client pays). Profit = clientCharge − totalWorkerCost.

---

## Screen 6 — Worker Home `/worker`

→ [06-worker-home.md](./06-worker-home.md)

Roles: WORKER, TEAM_LEAD · Mobile viewport (430px)

```
┌─────────────────────────┐
│ CrewMate   Sofia C. 👤  │  ← sticky header
├─────────────────────────┤
│                         │
│  Your Earnings          │
│  [Today][Week][Mo][All] │
│                         │
│  €204.00                │  ← completed (large)
│  + €72.00 projected     │  ← in-progress (muted)
│  ████████░░  3 of 5     │  ← progress bar
│                         │
├─────────────────────────┤
│ [✓ 3] [◐ 2] [○ 4]      │  ← status mini bar
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ J-002  HVAC Maint.  │ │
│ │ Fondazione Catella  │ │  ← job card
│ │ Via Sebenico 21     │ │
│ │ 14:00   SCHEDULED   │ │
│ │ Your share: €58     │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ J-010  HVAC Maint.  │ │
│ │ Meazza Stadium      │ │
│ │ IN PROGRESS  ◉ 50%  │ │
│ │ €58 / €116 earned   │ │
│ └─────────────────────┘ │
│                         │
│  ... more job cards ... │
└─────────────────────────┘
```

Live updates: job card status + earnings update via WebSocket as work progresses.

---

## Screen 7 — Worker Job Card `/worker/jobs/:id`

→ [07-worker-job-card.md](./07-worker-job-card.md)

Roles: WORKER, TEAM_LEAD · Mobile viewport · **Core demo screen**

```
SCHEDULED state:              IN_PROGRESS state:            COMPLETED state:
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ ← Back    J-014     │       │ ← Back    J-009     │       │ ← Back    J-001     │
│ HVAC Repair SCHED   │       │ Elec Panel IN PROG  │       │ AC Install  DONE    │
├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ Fondazione Catella  │       │ Porta Romana Tech   │       │ UniCredit Tower     │
│ Via Sebenico 21     │       │ Corso di Porta 68   │       │ Piazza Gae Aulenti  │
│ 14:00 scheduled     │       │ Started: 11:10      │       │                     │
├─────────────────────┤       ├─────────────────────┤       │   ✓ €136.00 earned  │
│ [📷][📷] Before     │       │ [📷][📷] Before     │       │   (confirmed)       │
├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ 3h × €72/hr × 4    │       │     ╭───────╮        │       │ [📷][📷] Before     │
│ Your share: €102   │       │     │  75%  │        │       │ [📷][📷] After ✓    │
│ (€34/hr × 3h)      │       │     ╰───────╯        │       ├─────────────────────┤
├─────────────────────┤       ├─────────────────────┤       │ ★★★★★               │
│                     │       │ [25%]✓[50%]✓[75%]✓  │       │ "Excellent team,    │
│  [ Start Job  ▶ ]  │       │ [100%]  ← tap next  │       │  arrived early..."  │
│                     │       ├─────────────────────┤       ├─────────────────────┤
└─────────────────────┘       │ [ Complete Job  ✓ ] │       │  [ Back to jobs ]   │
                              │    (disabled <100%) │       └─────────────────────┘
                              └─────────────────────┘

Each tap on progress step → PATCH /jobs/:id/progress
→ server emits job.progress.updated WebSocket
→ manager's map pin ring updates live
```

---

## Shared Components

→ [08-shared-components.md](./08-shared-components.md)

### Demo Actor Switcher (all screens, bottom-right)

```
All screens — collapsed:
  [👤 Marco Bianchi — Manager ▾]

Expanded (opens upward):
  ┌──────────────────────────────┐
  │  Switch Actor                │
  ├──────────────────────────────┤
  │  🔑 Admin System  SUPER_ADMIN│
  │  👔 Marco Bianchi MANAGER  ✓ │
  │  🔧 Luca Ferrari  TEAM_LEAD  │
  │  ── Team Alfa ──             │
  │     Sofia Conti   WORKER     │
  │     Davide Russo  WORKER     │
  │     Elena Moretti WORKER     │
  │  ── Solo ──                  │
  │     Antonio Ricci WORKER     │
  │     Giulia Romano WORKER     │
  │     Matteo Gallo  WORKER     │
  │     Chiara Marino WORKER     │
  │     Roberto Costa WORKER     │
  ├──────────────────────────────┤
  │  [🔄 Reset Demo Data]        │
  └──────────────────────────────┘
```

### Job Detail Side Drawer (from /dashboard map pin or /jobs kanban card)

```
                              ┌───────────────────────────────┐
  [overlay backdrop]          │ J-001  AC Installation  🟢    │ ✕
                              ├───────────────────────────────┤
                              │ 📍 UniCredit Tower            │
                              │    Piazza Gae Aulenti 3       │
                              │    Francesca Sala             │
                              ├───────────────────────────────┤
                              │ Team Alfa (Luca + 3 members)  │
                              │ Your share: €136.00           │
                              ├───────────────────────────────┤
                              │ Revenue Breakdown             │
                              │ Client charge:  €1,280.00     │
                              │ Worker cost:    €436.00       │
                              │ Platform profit: €844.00      │
                              ├───────────────────────────────┤
                              │ [📷 before-1] [📷 before-2]  │
                              │ [📷 after-1]  [📷 after-2]   │
                              ├───────────────────────────────┤
                              │ ★★★★★  "Excellent team..."   │
                              ├───────────────────────────────┤
                              │ Timeline:                     │
                              │ ✓ 09:20 Luca completed        │
                              │ ▶ 07:05 Luca started          │
                              │ + 07:00 job scheduled         │
                              ├───────────────────────────────┤
                              │ [Open Worker View] [Revoke ✕] │
                              └───────────────────────────────┘
```

---

## API Quick Reference

| Endpoint | Method | Used by |
|---|---|---|
| /auth/login | POST | Login |
| /dashboard/summary | GET | Dashboard KPIs |
| /dashboard/activity | GET | Activity feed |
| /jobs | GET | Jobs kanban |
| /jobs | POST | New job modal |
| /jobs/:id | GET | Job detail drawer |
| /jobs/:id/status | PATCH | Worker job card |
| /jobs/:id/progress | PATCH | Worker job card |
| /jobs/:id/cancel | PATCH | Revoke modal |
| /workers | GET | Workers screen |
| /workers/:id | GET | Worker drawer |
| /workers/:id/earnings | GET | Worker drawer tabs |
| /workers/me/jobs | GET | Worker home |
| /revenue | GET | Revenue screen |
| /demo/reset | POST | Demo switcher |
| /ws | WS | Dashboard, Jobs, Worker home/card |

## WebSocket Events Quick Reference

| Event | Emitted when | Received by |
|---|---|---|
| job.status.changed | Worker starts/completes job | Dashboard map, Jobs kanban, Worker home |
| job.progress.updated | Worker taps progress step | Dashboard pin ring, Jobs kanban card |
| job.cancelled | Manager revokes job | Dashboard map, Jobs kanban |
| worker.status.changed | Worker goes ON_JOB / IDLE | Workers screen cards |
