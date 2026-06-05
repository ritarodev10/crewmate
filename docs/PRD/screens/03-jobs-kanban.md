# Jobs — /jobs

## Overview

The Jobs screen is the primary operational view for managers and team leads. It renders a live kanban board of all today's jobs grouped by status, combined with summary KPI cards at the top. Managers see every job across the entire operator; team leads see only the jobs assigned to their team.

The board updates in real time via Socket.io: cards animate between columns when a worker changes job status, and progress rings pulse as workers advance through their steps. A right-side drawer opens on card click to surface full job detail — revenue breakdown, photo strips, status history timeline, and action buttons.

**Route:** `/jobs`
**Feature IDs:** F-023 (Jobs CRUD), F-024 (Job state machine), F-030 (WebSocket gateway), F-031 (Dispatch board UI), F-032 (Job detail drawer), F-033 (Optimistic UI)
**Data resets:** Nightly at midnight Europe/Rome. All 40 seed jobs restored.
**City context:** Milan, Italy. Customers are real Milan landmarks (UniCredit Tower, Politecnico, Darsena, Brera, etc.).

---

## Roles With Access

| Role | Scope | Can Create Jobs | Can Revoke Jobs |
|---|---|---|---|
| `SUPER_ADMIN` | All 40 jobs, all workers | Yes | Yes |
| `MANAGER` | All 40 jobs, all workers | Yes | Yes |
| `TEAM_LEAD` | Only Team Alfa's jobs (J-001 to J-020) | No | No |
| `WORKER` | No access to `/jobs` — redirected to `/worker` | No | No |

Role-based differences are enforced at both the API (RBAC guard) and UI layer (buttons hidden, filters scoped).

---

## Layout Diagram (detailed ASCII)

### Full-page layout (1440px desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px)       │  MAIN CONTENT AREA (fills remaining width)         │
│  [logo]                │                                                     │
│  ─────────             │  ┌───────────────────────────────────────────────┐  │
│  Dashboard             │  │  PAGE HEADER                                  │  │
│  > Jobs        ←active │  │  Jobs                    [+ New Job]          │  │
│  Workers               │  │  Today's field operations  [LIVE badge]       │  │
│  Revenue               │  └───────────────────────────────────────────────┘  │
│  ─────────             │                                                     │
│  Worker App            │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐  │
│                        │  │TOTAL JOBS│ │SCHEDULED │ │IN PROGRESS│ │COMPLET│  │
│                        │  │    40    │ │    12    │ │    8  🔴  │ │  15   │  │
│                        │  └──────────┘ └──────────┘ └──────────┘ └───────┘  │
│                        │                                                     │
│                        │  ┌─────────────────────────────────────────────┐   │
│                        │  │  FILTER BAR                                 │   │
│                        │  │  Worker: [All Workers ▾]  Type: [All ▾]     │   │
│                        │  └─────────────────────────────────────────────┘   │
│                        │                                                     │
│                        │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────┐ │
│                        │  │SCHEDULED  │ │IN PROGRESS│ │COMPLETED  │ │CANC.│ │
│                        │  │    12     │ │    8      │ │    15     │ │  5  │ │
│                        │  │           │ │           │ │           │ │     │ │
│                        │  │[job card] │ │[job card] │ │[job card] │ │[job]│ │
│                        │  │[job card] │ │[job card] │ │[job card] │ │[job]│ │
│                        │  │[job card] │ │[job card] │ │[job card] │ │[job]│ │
│                        │  │    ...    │ │    ...    │ │    ...    │ │ ... │ │
│                        │  │  scroll   │ │  scroll   │ │  scroll   │ │scrl │ │
│                        │  └───────────┘ └───────────┘ └───────────┘ └─────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layout with side drawer open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR    │  MAIN CONTENT (compressed)       │  SIDE DRAWER (420px)       │
│  (240px)    │                                  │  ┌────────────────────┐    │
│             │  [summary cards — 4 cols]        │  │  × close           │    │
│             │                                  │  │                    │    │
│             │  [filter bar]                    │  │  J-009             │    │
│             │                                  │  │  Electrical Panel  │    │
│             │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──┐│  │  IN PROGRESS       │    │
│             │  │SCHED │ │IN PR.│ │COMPL.│ │CA││  │                    │    │
│             │  │      │ │      │ │      │ │  ││  │  Customer          │    │
│             │  │[card]│ │[card]│ │[card]│ │  ││  │  Worker/Team       │    │
│             │  │[card]│ │[card]│ │[card]│ │  ││  │  Revenue           │    │
│             │  │ ...  │ │ ...  │ │ ...  │ │  ││  │  Progress ring     │    │
│             │  └──────┘ └──────┘ └──────┘ └──┘│  │  Photos (before)   │    │
│             │                                  │  │  Photos (after)    │    │
│             │                                  │  │  Status timeline   │    │
│             │                                  │  │  [Revoke Job]      │    │
│             │                                  │  │  [Open Worker View]│    │
│             │                                  │  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary Cards

Four KPI cards render at the top of the screen in a 4-column responsive grid. All counts are scoped to today and to the authenticated user's access level.

### Card 1 — Total Jobs

```
┌──────────────────────────────┐
│  Total Jobs                  │
│                              │
│  40                          │
│  ──────────────────          │
│  All statuses · Today        │
└──────────────────────────────┘
```

- Count: all jobs today (seed: 40)
- Does not update live (static sum — only new jobs from "New Job" modal increment this)
- TEAM_LEAD sees: 20 (Team Alfa jobs only)

### Card 2 — Scheduled

```
┌──────────────────────────────┐
│  Scheduled                   │
│                              │
│  12                          │
│  ──────────────────          │
│  Awaiting start · Today      │
└──────────────────────────────┘
```

- Count: jobs with `status = SCHEDULED`
- Seed counts: 12 scheduled (J-014–J-018 Team Alfa + J-031–J-037 Solo)
- Decrements live when a worker starts a job (WS event moves card to IN_PROGRESS column)

### Card 3 — In Progress

```
┌──────────────────────────────┐
│  In Progress                 │
│                              │
│  8  ●                        │
│  ──────────────────          │
│  Active now · Live           │
└──────────────────────────────┘
```

- Count: jobs with `status = IN_PROGRESS`
- Seed: 8 (J-009–J-013 Team Alfa + J-028–J-030 Solo)
- Has a live indicator dot (pulsing orange) — updates via WebSocket on `job.status.changed`
- Increments when SCHEDULED → IN_PROGRESS, decrements when IN_PROGRESS → COMPLETED or CANCELLED

### Card 4 — Completed

```
┌──────────────────────────────┐
│  Completed                   │
│                              │
│  15  ●                       │
│  ──────────────────          │
│  Done today · Live           │
└──────────────────────────────┘
```

- Count: jobs with `status = COMPLETED`
- Seed: 15 completed (J-001–J-008 Team Alfa + J-021–J-027 Solo)
- Has a live indicator dot (pulsing green) — updates via WebSocket on `job.status.changed`

---

## Kanban Board

### Column Structure

Four columns render side-by-side in a scrollable horizontal container. On screens narrower than 1280px, columns stack horizontally with overflow scroll. Each column is independently scrollable on the vertical axis.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  KANBAN BOARD                                                           │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ SCHEDULED   │  │ IN PROGRESS │  │ COMPLETED   │  │ CANCELLED   │  │
│  │ ── 12 ──    │  │ ── 8 ──     │  │ ── 15 ──    │  │ ── 5 ──     │  │
│  │             │  │             │  │             │  │             │  │
│  │ [card]      │  │ [card]      │  │ [card]      │  │ [card]      │  │
│  │ [card]      │  │ [card]      │  │ [card]      │  │ [card]      │  │
│  │ [card]      │  │ [card]      │  │ [card]      │  │ [card]      │  │
│  │ [card]      │  │ [card]      │  │ [card]      │  │ [card]      │  │
│  │ [card]      │  │ [card]      │  │ [card]      │  │ [card]      │  │
│  │ [card]      │  │ [card]      │  │ [card]      │  │             │  │
│  │ [card]      │  │             │  │ [card]      │  │             │  │
│  │ [card]      │  │             │  │ [card]      │  │             │  │
│  │ [card]      │  │             │  │ [card]      │  │             │  │
│  │ [card]      │  │             │  │ [card]      │  │             │  │
│  │ [card]      │  │             │  │ [card]      │  │             │  │
│  │ [card]      │  │             │  │ [card]      │  │             │  │
│  │ ↑↓ scroll   │  │ ↑↓ scroll   │  │ ↑↓ scroll   │  │ ↑↓ scroll   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Column header anatomy:**

```
┌─────────────────────────┐
│  ● SCHEDULED    [12]    │
│  ─────────────────────  │
└─────────────────────────┘
```

- Colored dot: matches status color (blue=SCHEDULED, orange=IN_PROGRESS, green=COMPLETED, grey=CANCELLED)
- Label: status name in uppercase
- Badge: integer count in a pill, updates live

### Job Card

Each job renders as a card inside its status column. Cards are clickable — clicking anywhere opens the Job Detail Side Drawer.

#### Standard card anatomy (SCHEDULED example)

```
┌────────────────────────────────────────────┐
│  J-014                       [cust. photo] │  ← 48×48px thumbnail, top-right
│  HVAC Repair                               │
│                                            │
│  Fondazione Catella                        │  ← customer name
│  14:00 — Via Sebenico 21, Isola            │  ← scheduledFor + address
│                                            │
│  [avatar] Sofia Conti                      │  ← worker avatar (24px) + name
│                                            │
│  ┌──────────┐                              │
│  │ SCHEDULED│                              │  ← status badge (blue)
│  └──────────┘                              │
└────────────────────────────────────────────┘
```

#### IN_PROGRESS card (with progress ring)

```
┌────────────────────────────────────────────┐
│  J-009                       [cust. photo] │
│  Electrical Panel                          │
│                                            │
│  Porta Romana Tech Hub                     │
│  11:00 — Corso di Porta Romana 68          │
│                                            │
│  [avatar] Luca Ferrari                     │
│                                            │
│  ┌────────────┐   ╭───╮                    │
│  │ IN PROGRESS│   │75%│  ← progress ring   │
│  └────────────┘   ╰───╯   (orange, live)   │
└────────────────────────────────────────────┘
```

- Progress ring: SVG circle, stroke-dashoffset animates from prior value to new value on WS update
- Ring color: orange while IN_PROGRESS
- Percentage text shown inside the ring
- Only rendered on IN_PROGRESS cards

#### COMPLETED card (with star rating)

```
┌────────────────────────────────────────────┐
│  J-001                       [cust. photo] │
│  AC Installation                           │
│                                            │
│  UniCredit Tower                           │
│  07:00 — Piazza Gae Aulenti 3              │
│                                            │
│  [avatar] Team Alfa (Luca Ferrari)         │  ← team name + lead name
│                                            │
│  ┌───────────┐  ★★★★★                     │  ← status badge + star rating
│  │ COMPLETED │  5.0                        │
│  └───────────┘                             │
└────────────────────────────────────────────┘
```

- Star rating: pre-seeded 1–5 stars, shown as filled star icons
- Rating only visible on COMPLETED cards
- For team jobs: shows team name ("Team Alfa") + lead name in parentheses

#### CANCELLED card

```
┌────────────────────────────────────────────┐
│  J-019                       [cust. photo] │
│  Electrical Panel                          │
│                                            │
│  Brera Pinacoteca                          │
│  10:00 — Via Brera 28                      │
│                                            │
│  [avatar] Davide Russo                     │
│                                            │
│  ┌───────────────────┐                     │
│  │ CANCELLED         │  ← grey badge       │
│  └───────────────────┘                     │
│  Customer Cancelled                        │  ← cancel reason label
└────────────────────────────────────────────┘
```

- Cancel reason is rendered as a small text label below the badge
- No progress ring, no star rating on CANCELLED cards
- Card has reduced opacity (0.65) and no hover elevation to visually de-emphasize

#### Customer photo thumbnail

All cards show a small customer photo thumbnail (48×48px, rounded corners, top-right corner of card). This comes from the JobType's `customerPhotoUrls[0]`, using the Picsum deterministic seed:

```
https://picsum.photos/seed/{jobTypeName}-before/400/300
```

Examples by job type:
- HVAC_REPAIR → `https://picsum.photos/seed/HVAC_REPAIR-before/400/300`
- AC_INSTALLATION → `https://picsum.photos/seed/AC_INSTALLATION-before/400/300`
- DRAIN_CLEANING → `https://picsum.photos/seed/DRAIN_CLEANING-before/400/300`

All jobs of the same type share the same customer thumbnail. This is intentional.

#### Status badge colors

| Status | Badge color | Text |
|---|---|---|
| SCHEDULED | Blue (`bg-blue-100 text-blue-700`) | SCHEDULED |
| IN_PROGRESS | Amber/orange (`bg-amber-100 text-amber-700`) | IN PROGRESS |
| COMPLETED | Green (`bg-green-100 text-green-700`) | COMPLETED |
| CANCELLED | Grey (`bg-neutral-100 text-neutral-500`) | CANCELLED |

### Column Live Updates (WebSocket)

When a WebSocket event arrives, the relevant card transitions between columns with a smooth animation:

#### `job.status.changed` (SCHEDULED → IN_PROGRESS)

1. Card slides out of SCHEDULED column (translate + fade out, ~200ms)
2. Card slides into IN_PROGRESS column at the top (translate + fade in, ~200ms)
3. Progress ring appears on card (initial value from event payload `progressPct`)
4. IN_PROGRESS column count badge increments by 1
5. SCHEDULED column count badge decrements by 1
6. Summary card "In Progress" increments, "Scheduled" decrements

#### `job.progress.updated`

1. Progress ring on the card in IN_PROGRESS column updates its percentage
2. Ring arc re-animates via CSS transition on stroke-dashoffset
3. No column change

#### `job.status.changed` (IN_PROGRESS → COMPLETED)

1. Card slides out of IN_PROGRESS column
2. Card slides into COMPLETED column
3. Progress ring removed; star rating appears (pre-seeded value from initial data load)
4. Column counts and summary cards update

#### `job.cancelled` (SCHEDULED → CANCELLED or IN_PROGRESS → CANCELLED)

1. Card slides out of its current column
2. Card slides into CANCELLED column
3. Cancel reason label appears below the badge
4. Card renders at reduced opacity
5. Column counts update

All transitions use CSS `@keyframes` or Framer Motion `AnimatePresence` with `layout` prop to smoothly reorder remaining cards in the source column.

---

## Job Detail Side Drawer

Clicking any job card opens a right-side drawer that slides in from the right edge. The drawer is 420px wide on desktop, full-width on mobile. It overlaps the main content (does not push the kanban). A semi-transparent backdrop covers the kanban behind it. Clicking the backdrop or the × button closes the drawer.

### Drawer anatomy overview

```
┌─────────────────────────────────────────────────────┐
│  × close                                            │
│                                                     │
│  J-009  ·  Electrical Panel  ┌──────────────┐       │
│                              │ IN PROGRESS  │       │
│                              └──────────────┘       │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  CUSTOMER                                           │
│  Porta Romana Tech Hub                              │
│  Corso di Porta Romana 68, Porta Romana             │
│  Contact: Valentina Riva                            │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ASSIGNED WORKER                                    │
│  [avatar 40px] Luca Ferrari                         │
│                TEAM_LEAD · €34/hr                   │
│                Team Alfa                            │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  REVENUE BREAKDOWN                                  │
│  ... (see section below) ...                        │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  PROGRESS          ╭─────────╮                      │
│  75%               │  ╭───╮  │  live via WebSocket  │
│                    │  │75%│  │                      │
│                    │  ╰───╯  │                      │
│                    ╰─────────╯                      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  BEFORE PHOTOS (2 thumbnails)                       │
│  [photo 1] [photo 2]                                │
│                                                     │
│  AFTER PHOTOS  ← only if COMPLETED                  │
│  [photo 1] [photo 2]                                │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  RATING & TESTIMONY  ← only if COMPLETED            │
│  ★★★★★  5.0                                         │
│  "Excellent team, arrived early..."                 │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  STATUS HISTORY                                     │
│  ... (timeline) ...                                 │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [Revoke Job]  ← MANAGER/SUPER_ADMIN only           │
│  [Open in Worker View]                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Revenue Breakdown Display

The revenue section shows the full financial breakdown for the job. All values are computed on read — not stored.

**Formula:**
```
clientCharge   = estimatedHours × clientRatePerHour × numberOfWorkers
workerEarning  = estimatedHours × worker.hourlyRate   (per individual)
platformProfit = clientCharge − Σ(all workerEarnings)
```

#### Solo worker job example (J-029: HVAC Repair, Antonio Ricci, €30/hr, 2.5h at €72/hr client rate)

```
┌─────────────────────────────────────────────────┐
│  REVENUE BREAKDOWN                              │
│                                                 │
│  Client Charge          €180.00                 │
│  (2.5h × €72/hr × 1 worker)                    │
│                                                 │
│  ──────────────────────────────────────────     │
│                                                 │
│  Antonio Ricci earns    €75.00                  │
│  (2.5h × €30/hr)                               │
│                                                 │
│  Platform Profit        €105.00  (58%)          │
│  ──────────────────────────────────────────     │
│                                                 │
│  Profit margin bar: ████████████████░░░░  58%  │
└─────────────────────────────────────────────────┘
```

#### Team job example (J-001: AC Installation, Team Alfa, 4h at €80/hr, 4 workers)

```
┌─────────────────────────────────────────────────┐
│  REVENUE BREAKDOWN                              │
│                                                 │
│  Client Charge          €1,280.00               │
│  (4h × €80/hr × 4 workers)                     │
│                                                 │
│  ──────────────────────────────────────────     │
│                                                 │
│  Worker Costs                                   │
│  Luca Ferrari (Lead)    €136.00  (4h × €34)    │
│  Sofia Conti            €100.00  (4h × €25)    │
│  Davide Russo           €100.00  (4h × €25)    │
│  Elena Moretti          €100.00  (4h × €25)    │
│  Total Worker Cost      €436.00                 │
│                                                 │
│  Platform Profit        €844.00  (66%)          │
│  ──────────────────────────────────────────     │
│                                                 │
│  Profit margin bar: █████████████████░░░  66%  │
└─────────────────────────────────────────────────┘
```

Revenue breakdown is always visible regardless of job status. For IN_PROGRESS jobs the values reflect the full estimated hours (not partial). For CANCELLED jobs, a note reads: "Job cancelled — no charge issued."

### Photos Section

The photos section renders two thumbnail strips. Photos are pre-seeded per job type — all jobs of the same type share the same photo URLs (derived from `JobType.customerPhotoUrls` and `JobType.workerPhotoUrls`).

```
┌─────────────────────────────────────────────────┐
│  BEFORE                                         │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │                  │  │                  │    │
│  │   [photo 1]      │  │   [photo 2]      │    │
│  │   120×90px       │  │   120×90px       │    │
│  │                  │  │                  │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                 │
│  AFTER  (only if status = COMPLETED)            │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │                  │  │                  │    │
│  │   [photo 1]      │  │   [photo 2]      │    │
│  │   120×90px       │  │   120×90px       │    │
│  │                  │  │                  │    │
│  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

- Photo source: `https://picsum.photos/seed/{jobTypeName}-before/400/300` (customer / Before)
- Photo source: `https://picsum.photos/seed/{jobTypeName}-after/400/300` (worker / After)
- "Before" strip: always visible on any job status
- "After" strip: only rendered when `status = COMPLETED`
- Thumbnails are 120×90px with rounded corners and a subtle border
- Clicking a thumbnail opens a lightbox (full-size image overlay)

### Rating & Testimony

Visible only when `status = COMPLETED`. Pre-seeded for all 15 completed seed jobs.

```
┌─────────────────────────────────────────────────┐
│  CUSTOMER FEEDBACK                              │
│                                                 │
│  ★★★★★   5.0                                    │
│                                                 │
│  "Excellent team, arrived early and left        │
│   everything spotless."                         │
│                                                 │
│  — Francesca Sala, UniCredit Tower              │
└─────────────────────────────────────────────────┘
```

- Stars: filled SVG star icons (1–5), with half-star not used (integer only)
- Testimony: blockquote style, truncated at 3 lines with "Show more" expand if longer
- Attribution: contact name + customer name

For newly created jobs that reach COMPLETED during the session (via live WS), no rating or testimony will exist yet. The section is hidden entirely in that case (not shown as empty).

### Status History Timeline

A vertical timeline listing all `JobStatusEvent` records for the job, ordered oldest-first.

```
┌─────────────────────────────────────────────────┐
│  STATUS HISTORY                                 │
│                                                 │
│  ●  CREATED → SCHEDULED                         │
│  │  Marco Bianchi (Manager) · 09:15             │
│  │                                              │
│  ●  SCHEDULED → IN PROGRESS                     │
│  │  Luca Ferrari (Worker) · 11:02               │
│  │                                              │
│  ●  Progress: 25%                               │
│  │  Luca Ferrari (Worker) · 11:18               │
│  │                                              │
│  ●  Progress: 50%                               │
│  │  Luca Ferrari (Worker) · 11:44               │
│  │                                              │
│  ●  Progress: 75%                               │
│     Luca Ferrari (Worker) · 12:05               │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Each row: colored dot + transition label + actor name (with role) + timestamp
- Dot color matches the `toStatus` color coding
- Progress events (no status change) use a smaller grey dot
- Timestamps are in Europe/Rome timezone, rendered as `HH:mm` (same-day) or `DD MMM HH:mm` (cross-day)
- Actor name comes from `JobStatusEvent.actorUserId` → resolved to User.name + role label
- Timeline is scrollable if long

### Actions (Revoke, Open in Worker View)

Two action buttons appear at the bottom of the drawer, separated by a divider from the timeline.

#### Revoke Job button

```
┌─────────────────────────────────────────────────┐
│  ⚠  Revoke Job                                  │  ← red outline button
└─────────────────────────────────────────────────┘
```

- Visible to: `MANAGER` and `SUPER_ADMIN` only
- Hidden from: `TEAM_LEAD`
- Disabled (greyed out) when job is already `COMPLETED` or `CANCELLED`
- Active for jobs with status `SCHEDULED` or `IN_PROGRESS`
- Clicking opens a confirmation modal (see below)

**Revoke Job Modal:**

```
┌───────────────────────────────────────────────────────┐
│  Revoke Job — J-014                                   │
│                                                       │
│  Select a reason:                                     │
│                                                       │
│  ○  Customer Cancelled                                │
│  ○  Equipment Unavailable                             │
│  ○  Worker No-Show                                    │
│  ○  Access Denied                                     │
│  ○  Duplicate Job                                     │
│  ○  Emergency Recall                                  │
│                                                       │
│  Additional note (optional):                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  [Cancel]                      [Confirm Revoke]      │
└───────────────────────────────────────────────────────┘
```

- Radio buttons for the 6 predefined `cancelReasonCode` values
- A reason must be selected; "Confirm Revoke" button is disabled until one is chosen
- Optional free-text note field (`cancelReasonNote`)
- "Confirm Revoke" calls `PATCH /jobs/:id/cancel` with `{ cancelReasonCode, cancelReasonNote }`
- On success: drawer closes, card moves to CANCELLED column via WebSocket event, toast notification shown
- Cancel reason codes and their display labels:

| Code | Display label |
|---|---|
| `CUSTOMER_CANCELLED` | Customer Cancelled |
| `EQUIPMENT_UNAVAILABLE` | Equipment Unavailable |
| `WORKER_NO_SHOW` | Worker No-Show |
| `ACCESS_DENIED` | Access Denied |
| `DUPLICATE_JOB` | Duplicate Job |
| `EMERGENCY_RECALL` | Emergency Recall |

#### Open in Worker View button

```
┌─────────────────────────────────────────────────┐
│  ↗  Open in Worker View                         │  ← secondary ghost button
└─────────────────────────────────────────────────┘
```

- Available to all roles that can open the drawer
- Opens `/worker/jobs/:id` in a new browser tab
- That route renders the mobile-layout job card with the progress stepper
- Useful for demoing the worker-side experience without switching actor

---

## Filters

A filter bar sits between the summary cards and the kanban board. Filters are applied simultaneously to all four columns.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Filter by worker:  [All Workers              ▾]                     │
│  Filter by type:    [All Job Types            ▾]                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Worker filter

- Dropdown lists all workers visible to the current user
  - MANAGER/SUPER_ADMIN: all 9 workers (Luca, Sofia, Davide, Elena, Antonio, Giulia, Matteo, Chiara, Roberto)
  - TEAM_LEAD (Luca): only Team Alfa members (Luca, Sofia, Davide, Elena)
- Selecting a worker hides all cards not assigned to that worker
- Column count badges update to reflect filtered count
- Summary cards do NOT update (they always show the full-scope totals)

### Job type filter

- Dropdown lists all 8 job types: HVAC Repair, HVAC Maintenance, AC Installation, Electrical Panel, Pipe Repair, Drain Cleaning, Lighting Install, Generator Repair
- Selecting a type hides all cards of other types
- Both filters can be active simultaneously (AND logic)

### Filter state

- Filters are URL-query-parameter-driven: `/jobs?worker=w-05&type=HVAC_REPAIR`
- Shareable URLs preserve filter state
- "Clear filters" link appears when any filter is active, resets both to "All"

---

## New Job Flow

A "+ New Job" button appears in the top-right of the page header. Visible only to `MANAGER` and `SUPER_ADMIN`; hidden for `TEAM_LEAD`.

### Step 1 — Template picker modal

Clicking "+ New Job" opens a modal with 5 template cards in a 2–3 column grid.

```
┌───────────────────────────────────────────────────────────────────────┐
│  New Job — Pick a Template                              × close        │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  HVAC Maintenance│  │  Drain Cleaning  │  │  Pipe Repair     │   │
│  │  Politecnico MI  │  │  Darsena Office  │  │  Porta Romana    │   │
│  │  2h · €58/hr     │  │  1.5h · €50/hr  │  │  2.5h · €68/hr  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐                          │
│  │  Lighting Install│  │  AC Installation │                          │
│  │  Brera Pinacoteca│  │  UniCredit Tower │                          │
│  │  2h · €62/hr     │  │  4h · €80/hr     │                          │
│  └──────────────────┘  └──────────────────┘                          │
└───────────────────────────────────────────────────────────────────────┘
```

Template cards (from seed Table 9):

| # | Template name | Job type | Customer | Hours | Client rate/hr |
|---|---|---|---|---|---|
| T1 | HVAC Quick Check | HVAC Maintenance | Politecnico di Milano | 2.0h | €58 |
| T2 | Drain Emergency | Drain Cleaning | Darsena Office Park | 1.5h | €50 |
| T3 | Pipe Leak | Pipe Repair | Porta Romana Tech Hub | 2.5h | €68 |
| T4 | Lights Replacement | Lighting Install | Pinacoteca di Brera | 2.0h | €62 |
| T5 | AC Full Install | AC Installation | UniCredit Tower | 4.0h | €80 |

### Step 2 — Pre-filled form

Clicking a template card transitions the modal to a form view. Fields pre-filled from template; `hours` and `rate` are editable.

```
┌───────────────────────────────────────────────────────────────────────┐
│  New Job — HVAC Quick Check                         × close           │
│                                                                       │
│  Job Type        HVAC Maintenance (locked)                            │
│  Customer        Politecnico di Milano (locked)                       │
│                  Via Ponzio 34, Città Studi                           │
│  Contact         Prof. Andrea Neri (locked)                           │
│                                                                       │
│  Estimated Hours  [2.0  ]  (editable)                                 │
│  Client Rate/hr   [€58  ]  (editable)                                 │
│                                                                       │
│  Assign Worker    [Select a worker ▾]  (required)                     │
│    ○  Luca Ferrari (Team Lead) — currently ON_JOB                     │
│    ○  Sofia Conti — currently ON_JOB                                  │
│    ○  Davide Russo — currently ON_JOB                                 │
│    ○  Elena Moretti — currently IDLE                                  │
│    ○  Antonio Ricci — currently ON_JOB                                │
│    ○  Giulia Romano — currently ON_JOB                                │
│    ○  Matteo Gallo — currently IDLE     ← highlighted as available    │
│    ○  Chiara Marino — currently ON_JOB                                │
│    ○  Roberto Costa — currently IDLE    ← highlighted as available    │
│                                                                       │
│  Scheduled For    [Today — 14:00  ]  (datetime picker, default +1h)   │
│                                                                       │
│  Notes (optional): [                                  ]               │
│                                                                       │
│  ← Back to templates          [Create Job]                            │
└───────────────────────────────────────────────────────────────────────┘
```

- IDLE workers are visually highlighted (green dot) in the worker dropdown
- ON_JOB workers shown in amber; still selectable (manager may double-assign)
- "Create Job" calls `POST /jobs` with `{ templateId, workerId, scheduledFor, estimatedHours?, clientRatePerHour? }`
- On success: modal closes, new card animates into SCHEDULED column at top, toast: "Job J-041 created"
- Total Jobs summary card increments, SCHEDULED count increments

---

## API Calls

| Method | Endpoint | Used by | Notes |
|---|---|---|---|
| `GET` | `/jobs` | Initial page load | Returns jobs grouped: `{ scheduled:[], inProgress:[], completed:[], cancelled:[] }`. Each job includes: id, jobType (label, photos), customer (name, address), assignee (name, avatarUrl, hourlyRate, teamName?), progressPct, scheduledFor, customerRating, cancelReasonCode |
| `GET` | `/jobs/:id` | Drawer open | Full job detail: above + estimatedHours, clientRatePerHour, workerPhotos, customerTestimony, statusHistory (JobStatusEvent[]), numberOfWorkers |
| `POST` | `/jobs` | New Job form submit | Body: `{ templateId, workerId, scheduledFor, estimatedHours?, clientRatePerHour? }`. Returns created job object |
| `PATCH` | `/jobs/:id/cancel` | Revoke Job modal confirm | Body: `{ cancelReasonCode, cancelReasonNote? }`. Returns updated job. Triggers WebSocket `job.cancelled` event |
| `GET` | `/workers` | Worker filter dropdown | Returns `[{ id, name, avatarUrl, status }]` for populating the filter dropdown |

### Response shape — GET /jobs

```typescript
{
  scheduled: JobSummary[];
  inProgress: JobSummary[];
  completed: JobSummary[];
  cancelled: JobSummary[];
}

interface JobSummary {
  id: string;             // "J-001"
  jobType: {
    name: string;         // "AC_INSTALLATION"
    label: string;        // "AC Installation"
    customerPhotoUrl: string;
  };
  customer: {
    name: string;
    address: string;
  };
  assignee: {
    kind: "SOLO" | "TEAM";
    name: string;         // worker name or team name
    avatarUrl: string;
    hourlyRate: number;
    teamName?: string;    // if TEAM
    leadName?: string;    // if TEAM
  };
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  progressPct: 0 | 25 | 50 | 75 | 100;
  scheduledFor: string;   // ISO 8601
  customerRating?: number; // 1–5, only on COMPLETED
  cancelReasonCode?: string;
}
```

### Response shape — GET /jobs/:id (additional fields)

```typescript
{
  // all JobSummary fields, plus:
  estimatedHours: number;
  clientRatePerHour: number;
  numberOfWorkers: number;
  workerEarnings: Array<{
    workerId: string;
    workerName: string;
    hourlyRate: number;
    totalEarning: number;   // estimatedHours × hourlyRate
  }>;
  clientCharge: number;     // computed
  platformProfit: number;   // computed
  profitMarginPct: number;  // computed
  customerPhotos: string[]; // 2 URLs
  workerPhotos: string[];   // 2 URLs (only non-empty if COMPLETED)
  customerTestimony?: string;
  cancelReasonNote?: string;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actorName: string;
    actorRole: string;
    occurredAt: string;
    metadata?: { progressPct?: number; cancelReasonCode?: string };
  }>;
}
```

---

## WebSocket Subscriptions

The client connects to `WS /ws` (Socket.io) immediately on page mount and joins the room `operator:op-001`. Subscription setup:

```typescript
socket.on('job.status.changed', (payload) => {
  // payload: { jobId, status, progressPct, workerId, teamId }
  // Move card from current column to new column
  // Update summary card counts
  // Update "In Progress" count on column header badge
});

socket.on('job.progress.updated', (payload) => {
  // payload: { jobId, progressPct, workerId }
  // Update progress ring on the matching IN_PROGRESS card
  // If drawer is open for this job, update the ring in the drawer too
});

socket.on('job.cancelled', (payload) => {
  // payload: { jobId, cancelReasonCode, cancelledBy }
  // Move card to CANCELLED column
  // Show cancel reason label on card
  // Update column counts
});
```

Live update rules:

| Event | Card effect | Summary card effect | Column badge effect |
|---|---|---|---|
| `job.status.changed` SCHEDULED→IN_PROGRESS | Card moves column, ring appears | Scheduled −1, In Progress +1 | SCHEDULED −1, IN_PROGRESS +1 |
| `job.status.changed` IN_PROGRESS→COMPLETED | Card moves column, ring removed, stars appear | In Progress −1, Completed +1 | IN_PROGRESS −1, COMPLETED +1 |
| `job.progress.updated` | Ring percentage updates | No change | No change |
| `job.cancelled` | Card moves to CANCELLED, opacity reduced | In Progress or Scheduled −1 | Source col −1, CANCELLED +1 |

The open drawer also subscribes to the job-specific updates:
- Progress ring in the drawer updates on `job.progress.updated` for the currently open job ID
- Status badge in the drawer updates on `job.status.changed`

---

## RBAC Variations

### SUPER_ADMIN view

- All 40 jobs visible
- "+ New Job" button visible
- "Revoke Job" button visible in drawer
- Worker filter shows all 9 workers
- No visual restrictions

### MANAGER view (e.g. Marco Bianchi)

- All 40 jobs visible
- "+ New Job" button visible
- "Revoke Job" button visible in drawer
- Worker filter shows all 9 workers
- Revenue breakdown in drawer shows full detail

### TEAM_LEAD view (e.g. Luca Ferrari)

- Only Team Alfa's jobs visible: J-001–J-020 (20 jobs)
- Summary cards count only team jobs: Total=20, Scheduled=5, InProgress=5, Completed=8, (Cancelled=2 not in summary)
- "+ New Job" button hidden
- "Revoke Job" button hidden in drawer
- Worker filter shows only Team Alfa members (Luca, Sofia, Davide, Elena)
- Revenue breakdown in drawer is visible (team lead can see team earnings)
- API calls include `teamId` scope implicitly via JWT claims

### Visual RBAC enforcement summary

| Element | SUPER_ADMIN | MANAGER | TEAM_LEAD |
|---|---|---|---|
| New Job button | Visible | Visible | Hidden |
| Revoke Job button (drawer) | Visible | Visible | Hidden |
| All workers in filter | Yes | Yes | Team only |
| All jobs in board | Yes | Yes | Team only |
| Revenue in drawer | Yes | Yes | Yes |
| Worker hourly rates in drawer | Yes | Yes | Yes |

---

## Notes / Edge Cases

### Empty columns

If a column has zero cards (after filtering or at start of day), it renders an empty state:

```
┌─────────────────────────┐
│  COMPLETED              │
│  ── 0 ──                │
│                         │
│  No completed jobs yet  │
│                         │
└─────────────────────────┘
```

Empty state text per column:
- SCHEDULED: "No jobs scheduled"
- IN_PROGRESS: "No jobs in progress"
- COMPLETED: "No completed jobs yet"
- CANCELLED: "No cancelled jobs"

### Team job assignee display

For jobs assigned to a team (`assigneeKind = TEAM`), the card renders the team name ("Team Alfa") as the primary label, with the lead's name in parentheses. The avatar shown is the lead's avatar. In the drawer, all team members are listed with their individual earnings.

### Progress ring on IN_PROGRESS cards

The progress ring is a 36px-diameter SVG circle rendered in the bottom-right of the card content area. The ring is always orange while IN_PROGRESS. At `progressPct = 100` the ring is full-circle but the job is still IN_PROGRESS until the worker taps "Complete" in the worker app — this state is intentional and the ring stays at 100% until the `job.status.changed` event arrives.

### Revoke a job that is already being revoked

If two managers attempt to revoke the same job simultaneously, the second `PATCH /jobs/:id/cancel` call returns a 409 Conflict with `{ code: "JOB_ALREADY_CANCELLED" }`. The UI shows a toast: "This job was already revoked" and closes the modal, refreshing the card state.

### Cancelled jobs — no rating or revenue

CANCELLED job drawers show a prominent notice: "Job cancelled — no charge issued. Reason: [reason label]." Revenue breakdown, photos, and rating sections are still rendered for reference (revenue is shown as what would have been charged, visually struck through).

### New jobs created mid-session

When a new job is created via the modal and appended to the SCHEDULED column, it may not have the customer thumbnail immediately if there's a brief lag in URL resolution. A placeholder grey square renders until the image loads.

### Date/time display

All times are rendered in `Europe/Rome` timezone. `scheduledFor` on cards is displayed as `HH:mm` only (e.g. "14:00"). Full date+time is shown in the drawer header and status timeline for jobs created on prior days (rare in a daily-reset demo).

### Seed data column distribution (initial load, unfiltered, all roles with full access)

| Column | Count | Job IDs |
|---|---|---|
| SCHEDULED | 12 | J-014–J-018, J-031–J-037 |
| IN_PROGRESS | 8 | J-009–J-013, J-028–J-030 |
| COMPLETED | 15 | J-001–J-008, J-021–J-027 |
| CANCELLED | 5 | J-019, J-020, J-038, J-039, J-040 |

### Photo lightbox

Clicking any photo thumbnail in the drawer opens a full-screen lightbox overlay with the full-resolution image (`400×300` from Picsum). The lightbox closes on backdrop click or Escape key. Navigation arrows are not needed (only 2 photos per strip).

### Mobile / responsive behavior

Below 768px, the kanban board switches to a tab-based layout with one column visible at a time. Tabs at top: "Scheduled (12) · In Progress (8) · Completed (15) · Cancelled (5)". The side drawer becomes a bottom sheet that slides up from the bottom edge (full width).
