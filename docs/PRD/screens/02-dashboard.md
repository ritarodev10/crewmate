# Dashboard — /dashboard

> Roles: MANAGER, SUPER_ADMIN (full data) | TEAM_LEAD (data scoped to own team)
> Real-time screen. All map pins, KPI values, and feed rows update live via WebSocket.
> City context: Milan, Italy. Map default center [9.190, 45.464], zoom 12.

---

## Overview

The dashboard is the primary operations screen for MANAGER and SUPER_ADMIN actors. It answers three questions at a glance:

1. **What is happening right now?** — KPI cards surface total jobs today, active workers, on-time rate, and revenue.
2. **Where is it happening?** — Mapbox satellite map of Milan shows every job as a colored pin with live status.
3. **What just happened?** — Live activity feed shows the last 20 status events, newest on top, auto-prepended as WebSocket events arrive.

TEAM_LEAD sees the identical layout but every data source is filtered to their team only.

---

## Roles With Access

| Role | Scope |
|---|---|
| SUPER_ADMIN | All jobs across the operator; no filter applied |
| MANAGER | All jobs within `operatorId`; no filter applied |
| TEAM_LEAD | Only jobs where `assigneeId` is their team (`tm-01 Team Alfa`) or one of their team members |

All three roles see the same two-panel layout. RBAC differences are data-only — no structural UI differences on this screen. The TEAM_LEAD does **not** see a "Revoke Job" button inside the job detail side drawer; MANAGER and SUPER_ADMIN do.

---

## Layout Diagram

Full-width viewport, inside the standard app shell (sidebar nav on left, topbar at top). Dashboard content fills the remaining space.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  TOPBAR: CrewMate logo | nav breadcrumb "Dashboard" | Demo Actor Switcher chip      │
├──────────────────────┬──────────────────────────────────────────────────────────────┤
│  SIDEBAR             │                                                              │
│  (nav items)         │  LEFT PANEL (~40%)       RIGHT PANEL (~60%)                  │
│                      │  ┌───────────────────┐   ┌──────────────────────────────┐   │
│  Dashboard    ←active│  │  KPI CARDS (2×2)  │   │                              │   │
│  Jobs                │  │  ┌─────┐ ┌─────┐ │   │      MAPBOX SATELLITE        │   │
│  Workers             │  │  │     │ │     │ │   │      MAP OF MILAN            │   │
│  Revenue             │  │  │  1  │ │  2  │ │   │                              │   │
│                      │  │  └─────┘ └─────┘ │   │   [colored job pins]         │   │
│                      │  │  ┌─────┐ ┌─────┐ │   │   [progress rings on         │   │
│                      │  │  │     │ │     │ │   │    IN_PROGRESS pins]          │   │
│                      │  │  │  3  │ │  4  │ │   │                              │   │
│                      │  │  └─────┘ └─────┘ │   │                              │   │
│                      │  └───────────────────┘   │                              │   │
│                      │                           │  ┌──────────────────────┐   │   │
│                      │  ┌───────────────────┐   │  │ FILTER TOGGLE BAR    │   │   │
│                      │  │  LIVE ACTIVITY    │   │  │[All][Sched][InProg]  │   │   │
│                      │  │  FEED             │   │  │[Compl][Cancld]       │   │   │
│                      │  │                   │   │  └──────────────────────┘   │   │
│                      │  │  [row] event 1    │   │  ┌──────────────────────┐   │   │
│                      │  │  [row] event 2    │   │  │ STAT BAR             │   │   │
│                      │  │  [row] event 3    │   │  │ 🟢74 🟠22 🔵27       │   │   │
│                      │  │  ...              │   │  └──────────────────────┘   │   │
│                      │  │  (up to 20 rows)  │   └──────────────────────────────┘   │
│                      │  │                   │                                       │
│                      │  │  View all →       │                                       │
│                      │  └───────────────────┘                                       │
└──────────────────────┴──────────────────────────────────────────────────────────────┘
```

Panel widths are approximate. On viewports narrower than 1280px the right panel collapses below the left panel (map becomes full-width, stacked below KPI + feed).

---

## Left Panel

The left panel is a flex column with two sections: the KPI card grid at the top and the live activity feed below. There is no horizontal scroll. The panel has `overflow-y: auto` so on short viewports the feed scrolls independently.

---

### KPI Cards

Four cards arranged in a 2×2 grid. Fixed order, never rearranged.

```
┌──────────────────────┬──────────────────────┐
│  1. Total Jobs Today │  2. Active Workers   │
│                      │                      │
│  Big number          │  Big number          │
│  ▲ delta vs yest.    │  ▲ delta vs yest.    │
└──────────────────────┴──────────────────────┘
┌──────────────────────┬──────────────────────┐
│  3. On-Time Rate %   │  4. Revenue Today    │
│                      │                      │
│  Big number          │  Big number          │
│  ▲ delta vs yest.    │  ▲ delta vs yest.    │
└──────────────────────┴──────────────────────┘
```

#### Card 1 — Total Jobs Today

| Element | Detail |
|---|---|
| Label | `Total Jobs Today` |
| Value | Count of all jobs where `scheduledFor` falls on today's date in Europe/Rome timezone. Includes all statuses. Default seed value: **40** |
| Delta | Percentage change vs yesterday's total job count. Format: `▲ +11.1%` or `▼ -8.3%`. Yesterday seed value: 40, so delta ≈ 0% |
| Delta direction good | Neutral (total jobs is a volume metric, neither up nor down is inherently good) |
| Unit | Integer, no decimal |
| Live update | Does not update live (count changes only if a new job is created mid-day, which is rare) |

#### Card 2 — Active Workers

| Element | Detail |
|---|---|
| Label | `Active Workers` |
| Value | Count of workers where `worker.status = ON_JOB`. Default seed value: **8** (w-01 Luca, w-02 Sofia, w-03 Davide, w-05 Antonio, w-06 Giulia, w-08 Chiara, and 2 more with IN_PROGRESS jobs) |
| Delta | Percentage change vs yesterday's peak active worker count. Format: `▲ +14.3%` or `▼ -6.7%` |
| Delta direction good | Up (more workers on job = more productivity) |
| Unit | Integer |
| Live update | Yes — increments when a job transitions SCHEDULED → IN_PROGRESS (worker becomes ON_JOB), decrements when a job transitions IN_PROGRESS → COMPLETED or IN_PROGRESS → CANCELLED (worker becomes IDLE). Triggered by `job.status.changed` WS event |

#### Card 3 — On-Time Rate %

| Element | Detail |
|---|---|
| Label | `On-Time Rate` |
| Value | Percentage of started jobs where `startedAt ≤ scheduledFor + 15 minutes`. Formula: `(on-time starts / total started jobs) × 100`. Default seed value: **95.6%** (22 of 23 started jobs were on time) |
| Delta | Percentage point change vs yesterday's on-time rate. Format: `▲ +2.1 pt` or `▼ -1.4 pt` |
| Delta direction good | Up |
| Unit | One decimal place, percent sign |
| Live update | Yes — recalculates when a job transitions SCHEDULED → IN_PROGRESS and `startedAt` is recorded. Triggered by `job.status.changed` WS event |
| Edge case | If no jobs have started yet today, display `—` (em-dash) with `no data yet` below in muted text. No delta arrow |

#### Card 4 — Revenue Today

| Element | Detail |
|---|---|
| Label | `Revenue Today` |
| Value | Sum of `clientCharge` for all jobs with `status = COMPLETED` today. Formula: `estimatedHours × clientRatePerHour × numberOfWorkersOnJob`. Default seed value computed from 15 completed jobs across both team and solo workers — approximately **€2,890** |
| Delta | Percentage change vs yesterday's total revenue. Format: `▲ +8.2%` or `▼ -12.1%`. Yesterday seed: €7,020 (36 completed jobs) |
| Delta direction good | Up |
| Unit | Euro currency, no decimal cents, thousands separator. Format: `€2,890` |
| Live update | Yes — increments when a job transitions IN_PROGRESS → COMPLETED. The delta `clientCharge` for that job is added. Triggered by `job.status.changed` with `toStatus = COMPLETED` |
| TEAM_LEAD note | Shows only revenue from Team Alfa's completed jobs. Label reads `Team Revenue Today` |

#### KPI Card Anatomy (all four cards)

Each card is a `Card` component with:

- Background: `bg-surface`
- Border: 1px `border-line`
- Radius: `radius-xl`
- Padding: `space-5`
- No shadow

Internal vertical stack:

```
┌─────────────────────────────────┐
│ [label]  text-micro text-muted  │
│                                 │
│ [value]  text-display           │
│          tabular-nums           │
│          text-default           │
│                                 │
│ [arrow] [delta%]  text-small    │
│  color: success (▲) or danger(▼)│
└─────────────────────────────────┘
```

Delta arrow is a Unicode triangle glyph (`▲` or `▼`), inline with the delta number. Color is `--color-success` when the metric moved in a good direction and `--color-danger` when it moved in a bad direction.

**Loading state:** Skeleton replaces value slot (56% width rectangle) and delta slot (30% width rectangle). Label is static, never skeletons.

**Error state:** Value slot renders `unavailable` in `text-small text-muted`. A `RefreshCw` icon button in the delta slot triggers a retry. No toast.

---

### Live Activity Feed

Located below the KPI grid, fills remaining height of the left panel. The feed has `overflow-y: auto`.

#### Header Row

```
┌──────────────────────────────────────────┐
│  Live Activity              View all →   │
└──────────────────────────────────────────┘
```

- Title: `Live Activity` in `text-h3`
- "View all" is a link to `/jobs` (the full jobs kanban). Uses `text-small text-brand`. Trailing `ArrowRight` icon in `icon-sm`.

#### Feed Row Structure

Each row represents one `JobStatusEvent`. Rows are sorted descending by `occurredAt` (newest first). Maximum 20 rows displayed. When a new event arrives via WebSocket it is prepended with a brief highlight animation (fade in from the top over `motion-fast`).

```
┌────────────────────────────────────────────────────────────────┐
│ [avatar] [worker name]  [event badge]  [job ID] · [job type]   │
│          [customer name]                            [time]      │
└────────────────────────────────────────────────────────────────┘
```

Detailed slot breakdown:

| Slot | Content | Token / Notes |
|---|---|---|
| Avatar | Worker's `avatarUrl` image, circular, 32×32px. Fallback: initials on colored background | `radius-full`, `w-8 h-8` |
| Worker name | `worker.name` | `text-body-strong text-default` |
| Event badge | Colored label chip with event type text (see table below) | `Badge` component, variant per event |
| Job ID | Short job ID, e.g. `#J-009` | `text-small text-muted font-mono` |
| Separator dot | `·` | `text-muted` |
| Job type label | `jobType.label`, e.g. `Electrical Panel` | `text-small text-default` |
| Customer name | `customer.name`, e.g. `UniCredit Tower` | `text-small text-muted`, second line |
| Time | Relative time, e.g. `2 min ago`. Full ISO timestamp on hover tooltip | `text-small text-muted`, right-aligned |

#### Event Badge Colors

| Event Type | Badge Text | Badge Variant | Color |
|---|---|---|---|
| `job.status.changed` where `toStatus = IN_PROGRESS` | `started job` | `blue` | `--color-brand` |
| `job.status.changed` where `toStatus = COMPLETED` | `completed job` | `green` | `--color-success` |
| `job.status.changed` where `toStatus = CANCELLED` | `job cancelled` | `grey` | `--color-muted` |
| `job.progress.updated` | `progress updated` | `orange` | `--color-amber` |

#### Feed Row Example (seed data)

Using jobs from today's seed, the initial feed (top 8 rows shown) would look approximately like:

```
[Luca]  Luca Ferrari    [completed job]    #J-005 · Lighting Install
        Brera Pinacoteca                               09:52 AM

[Sofia] Sofia Conti     [completed job]    #J-006 · Pipe Repair
        Lambrate Hub                                   09:17 AM

[Davide] Davide Russo   [completed job]    #J-007 · HVAC Repair
         Fieramilanocity                               09:33 AM

[Elena] Elena Moretti   [completed job]    #J-008 · Generator Repair
        Niguarda Hospital                             10:04 AM

[Chiara] Chiara Marino  [started job]      #J-028 · Generator Repair
         Castello Offices                             11:02 AM

[Luca]  Luca Ferrari    [started job]      #J-009 · Electrical Panel
        Porta Romana                                  11:00 AM

[Sofia] Sofia Conti     [progress updated] #J-010 · HVAC Maintenance
        Meazza Stadium                               11:45 AM

[Davide] Davide Russo   [started job]      #J-011 · Pipe Repair
         Bovisa Campus                               12:03 AM
```

#### Feed Empty State

If no `JobStatusEvents` exist yet today (right after a demo reset), the feed area shows:

```
[ Activity icon ]
No activity yet today.
Events will appear here as workers update jobs.
```

Centered in the available feed space. Icon `ActivityIcon` in `icon-xl text-muted`. Title and description in `text-small text-muted`.

#### Feed WebSocket Behavior

New rows arrive via the `job.status.changed`, `job.progress.updated`, and `job.cancelled` events. On receipt, a new row object is prepended to the in-memory feed array. If the feed length exceeds 20, the last item is dropped from the array (not from the API — this is display-only truncation). The newly prepended row animates in with a `motion-fast` fade-from-top entrance.

---

## Right Panel

The right panel is a Mapbox satellite map of Milan, rendered full-height within the panel. It has no padding — the map fills edge to edge within the panel boundary. The filter toggle bar and stat bar float above the map at the bottom edge.

---

### Mapbox Map

| Property | Value |
|---|---|
| Map style | `mapbox://styles/mapbox/satellite-streets-v12` |
| Initial center | `[9.190, 45.464]` (Milan city center, near Duomo) |
| Initial zoom | `12` |
| Min zoom | `10` (prevents zooming out to show sea) |
| Max zoom | `18` |
| Projection | Mercator |
| Controls | Zoom in (+), Zoom out (−), scale bar (bottom-left) |
| Attribution | Mapbox attribution (bottom-right, required by terms) |

The map renders all job pins whose `scheduledFor` date is today. Each pin is a custom marker component, not a default Mapbox marker.

#### Job Pin Design

Every job has one pin. Solo jobs and team jobs both get a single pin at the customer's `[lat, lng]`.

| Status | Pin Color | Shape | Extra decoration |
|---|---|---|---|
| SCHEDULED | Blue (`--color-brand`) | Filled circle with white border | None |
| IN_PROGRESS | Orange (`--color-amber`) | Filled circle with white border | Progress ring overlay (see below) |
| COMPLETED | Green (`--color-success`) | Filled circle with white border | None |
| CANCELLED | Grey (`--color-muted`, dimmed) | Filled circle, 50% opacity | `✕` glyph inside pin |

Pin size: 24px diameter circle. White border: 2px. Drop shadow: `shadow-md`.

#### Progress Ring (IN_PROGRESS pins only)

A circular progress ring is rendered as an SVG overlay outside the 24px pin. Ring outer diameter: 34px. Stroke: 3px. The ring sweeps clockwise from the top (12 o'clock position). The filled arc color is `--color-amber`. The empty arc track is `rgba(255,255,255,0.4)`.

Ring percentage maps directly to `job.progressPct`:

| progressPct | Arc fill |
|---|---|
| 0 | Empty (0%) |
| 25 | Quarter arc (25%) |
| 50 | Half arc (50%) |
| 75 | Three-quarter arc (75%) |
| 100 | Full ring — status transitions to COMPLETED immediately |

The ring updates live when a `job.progress.updated` WS event is received. The update is animated over `motion-fast` (CSS transition on stroke-dashoffset).

#### Pin Hover State

On hover (desktop cursor), the pin enlarges to 30px diameter over `motion-fast`. A tooltip appears above the pin:

```
┌──────────────────────────┐
│  #J-009                  │
│  Electrical Panel        │
│  Porta Romana Tech Hub   │
│  ● IN PROGRESS  75%      │
└──────────────────────────┘
```

Tooltip uses `bg-surface shadow-pop radius-md space-3 padding text-small`. Status badge in the tooltip uses the same color coding as the event feed badges.

#### Pin Click

Clicking a pin opens the Job Detail Side Drawer (documented in its own section below). The clicked pin receives a `ring-2 ring-white ring-offset-1` highlight to indicate selection. Clicking anywhere on the map outside a pin deselects (removes the ring, closes the drawer).

---

### Map Filters

A horizontal toggle bar floats above the map at the bottom. It sits above the stat bar, approximately `56px` from the bottom of the map panel.

```
┌──────────────────────────────────────────────────────────────────┐
│  [  All  ]  [ Scheduled ]  [ In Progress ]  [ Completed ]  [ Cancelled ]  │
└──────────────────────────────────────────────────────────────────┘
```

- Container: `bg-surface/90 backdrop-blur-sm rounded-xl shadow-pop px-2 py-1.5`
- Each toggle is a `Button` styled as a pill toggle
- Active state: filled background with status color, white text
- Inactive state: `bg-transparent text-muted` with hover `bg-canvas`
- Default active: `All` (all statuses visible)

| Toggle | Filters to | Active color |
|---|---|---|
| All | No filter — all pins visible | `bg-surface` (neutral) |
| Scheduled | Only SCHEDULED pins | Blue |
| In Progress | Only IN_PROGRESS pins | Orange |
| Completed | Only COMPLETED pins | Green |
| Cancelled | Only CANCELLED pins | Grey |

Selecting a single status toggle deselects `All`. Re-clicking the active status toggle returns to `All`. Only one status can be active at a time (single-select toggle group). Hidden pins animate out with a fade over `motion-fast`.

---

### Map Stat Bar

A count bar floats at the very bottom of the map panel, directly above the Mapbox attribution bar.

```
┌────────────────────────────────────────────────────────────────┐
│  🟢 Completed 74   🟠 In Progress 22   🔵 Scheduled 27        │
└────────────────────────────────────────────────────────────────┘
```

Note: The counts shown (`74`, `22`, `27`) reflect the totals documented in the SYSTEM-MAP demo goal — these are the headline numbers used in the live demo. Today's 40-job seed data shows lower numbers; after a week of accruing historical context or during a live demo with the worker screen open, these numbers climb.

For the initial seed state, the stat bar reads:
```
🟢 Completed 15   🟠 In Progress 8   🔵 Scheduled 12   ⚫ Cancelled 5
```

- Container: `bg-surface/90 backdrop-blur-sm rounded-xl shadow-pop px-4 py-2`
- Each count group: colored dot + status label + bold count
- Counts update live via WebSocket (same KPI card recalculation)
- Cancelled count is shown only when at least 1 cancelled job exists (hidden otherwise to keep bar clean)

---

## Job Detail Side Drawer

Opens from a map pin click (or a kanban card click on `/jobs`). The drawer slides in from the right edge of the viewport at `motion-standard` speed. Width: `440px` fixed on desktop, full-width on mobile (100vw).

The drawer overlays the map but does not push the map. The active map pin remains visible and highlighted. The map can still be panned/zoomed while the drawer is open.

Closing the drawer: click the `×` button in the drawer header, press `Escape`, or click anywhere on the map outside a pin.

### Drawer Header

```
┌────────────────────────────────────────────────────────┐
│  ELECTRICAL PANEL                   [status badge]  ×  │
│  #J-009                                                 │
└────────────────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Job type label | `jobType.label` in `text-h3 text-default`. E.g. `ELECTRICAL PANEL` (uppercase) |
| Status badge | `Badge` component matching status color. Text: `IN PROGRESS`, `COMPLETED`, `SCHEDULED`, `CANCELLED` |
| Close button | `×` icon button, top-right corner. `ArrowRight` Lucide icon or `X` icon |
| Job ID | `#J-009` in `text-small text-muted font-mono` below the title |

### Drawer Sections (in vertical order, scrollable)

---

#### Section 1 — Customer

```
┌────────────────────────────────────────────────────────┐
│  CUSTOMER                                               │
│  Porta Romana Tech Hub                                  │
│  Corso di Porta Romana 68                               │
│  Contact: Valentina Riva                                │
└────────────────────────────────────────────────────────┘
```

| Field | Source | Display |
|---|---|---|
| Customer name | `job.customer.name` | `text-body-strong` |
| Address | `job.customer.address` | `text-small text-muted` |
| Contact name | `job.customer.contactName` | `text-small text-muted` prefixed with `Contact:` |

Section label `CUSTOMER` in `text-micro text-muted uppercase tracking-wide`.

---

#### Section 2 — Assigned Worker / Team

For solo jobs:

```
┌────────────────────────────────────────────────────────┐
│  ASSIGNED                                               │
│  [avatar] Luca Ferrari              TEAM LEAD           │
│           +39 333 100 0001                              │
└────────────────────────────────────────────────────────┘
```

For team jobs:

```
┌────────────────────────────────────────────────────────┐
│  ASSIGNED — Team Alfa                                   │
│  [avatar] Luca Ferrari   LEAD    [status dot] ON JOB   │
│  [avatar] Sofia Conti    MEMBER  [status dot] ON JOB   │
│  [avatar] Davide Russo   MEMBER  [status dot] ON JOB   │
│  [avatar] Elena Moretti  MEMBER  [status dot] IDLE     │
└────────────────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Avatar | 28×28px circular image. Fallback initials |
| Worker name | `text-small text-default` |
| Kind badge | `TEAM LEAD` / `MEMBER` / `SOLO` in `text-micro text-muted` |
| Status dot | 8px circle, green = ON_JOB, grey = IDLE, slate = OFF_DUTY |
| Phone | `text-small text-muted` (solo only) |

---

#### Section 3 — Progress (IN_PROGRESS jobs only)

Hidden when status is SCHEDULED, COMPLETED, or CANCELLED.

```
┌────────────────────────────────────────────────────────┐
│  PROGRESS                                               │
│                                                         │
│  [=========75%============-------]                     │
│                                                         │
│  [ Start ] [25%] [50%] [●75%] [100%]  [ Complete ]    │
│                               ↑ active                 │
│  Updated 11:47 AM by Luca Ferrari                       │
└────────────────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Progress bar | Full-width horizontal bar, fills to `progressPct`. Color `--color-amber` fill on `--color-amber/20` track |
| Step pills | 6 pill buttons: `Start`, `25%`, `50%`, `75%`, `100%`, `Complete`. Read-only in manager/admin view — not interactive. Steps that have been passed are filled green. Active step is filled amber. Future steps are empty/muted. |
| Last update | `text-micro text-muted`: `Updated [time] by [workerName]` |
| Live update | Progress bar and active step pill update when `job.progress.updated` WS event received |

This section is read-only for MANAGER, SUPER_ADMIN, and TEAM_LEAD. Only the worker themselves can advance progress.

---

#### Section 4 — Schedule & Timing

```
┌────────────────────────────────────────────────────────┐
│  SCHEDULE                                               │
│  Scheduled    11:00 AM today                           │
│  Started      11:00 AM today (on time)                 │
│  Est. hours   3.5 h                                     │
└────────────────────────────────────────────────────────┘
```

| Field | Source | Detail |
|---|---|---|
| Scheduled | `job.scheduledFor` | Formatted as `HH:MM AM/PM today` |
| Started | `job.startedAt` | `HH:MM AM/PM today`. Suffix: `(on time)` if within 15 min, `(X min late)` otherwise. Only shown if not null. |
| Completed | `job.completedAt` | Only shown if job is COMPLETED |
| Est. hours | `job.estimatedHours` | `X.X h` |

---

#### Section 5 — Revenue Breakdown

Visible to MANAGER and SUPER_ADMIN. Hidden entirely for TEAM_LEAD (they see earnings, not revenue).

```
┌────────────────────────────────────────────────────────┐
│  REVENUE BREAKDOWN                                      │
│                                                         │
│  Client charge     €297.50                              │
│  Platform profit   €191.50                              │
│  Worker total      €106.00                              │
│                                                         │
│  ─ Luca Ferrari (Lead)   3.5h × €34 = €119.00         │
│  ─ Sofia Conti           3.5h × €25 = €87.50           │
│  ─ Davide Russo          3.5h × €25 = €87.50           │
│  ─ Elena Moretti         3.5h × €25 = €87.50           │
│                                                         │
│  Client rate: €85/hr × 3.5h × 1 worker                │
└────────────────────────────────────────────────────────┘
```

Computed values (never stored):

| Field | Formula |
|---|---|
| Client charge | `estimatedHours × clientRatePerHour × numberOfWorkersOnJob` |
| Worker total | `Σ(estimatedHours × worker.hourlyRate)` for all assigned workers |
| Platform profit | `clientCharge − workerTotal` |

For COMPLETED jobs, values are fixed. For IN_PROGRESS and SCHEDULED jobs, values are shown as projections with `(projected)` in `text-micro text-muted` after the label.

---

#### Section 6 — Customer Photos (Before)

```
┌────────────────────────────────────────────────────────┐
│  PHOTOS — BEFORE                                        │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │              │  │              │                   │
│  │  [photo 1]   │  │  [photo 2]   │                   │
│  │              │  │              │                   │
│  └──────────────┘  └──────────────┘                   │
└────────────────────────────────────────────────────────┘
```

Two photos from `job.customerPhotos[]`. URLs follow pattern: `https://picsum.photos/seed/{jobTypeName}-before-{1|2}/400/300`. Rendered as `160×120px` thumbnails. Click to open lightbox (full-size overlay with left/right navigation).

Always visible regardless of job status.

---

#### Section 7 — Worker Photos (After)

```
┌────────────────────────────────────────────────────────┐
│  PHOTOS — AFTER                                         │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │              │  │              │                   │
│  │  [photo 1]   │  │  [photo 2]   │                   │
│  │              │  │              │                   │
│  └──────────────┘  └──────────────┘                   │
└────────────────────────────────────────────────────────┘
```

Two photos from `job.workerPhotos[]`. URLs: `https://picsum.photos/seed/{jobTypeName}-after-{1|2}/400/300`.

**Visible only when `job.status = COMPLETED`.** When status is SCHEDULED or IN_PROGRESS, this section is replaced by a placeholder:

```
┌────────────────────────────────────────────────────────┐
│  PHOTOS — AFTER                                         │
│  [ camera icon ]                                        │
│  Photos will appear when the job is completed.          │
└────────────────────────────────────────────────────────┘
```

When a `job.status.changed` event arrives with `toStatus = COMPLETED`, this section animates in (fade over `motion-standard`) showing the two after photos.

---

#### Section 8 — Customer Rating & Testimony

Visible only when `job.status = COMPLETED` and `job.customerRating` is not null (all COMPLETED seed jobs have ratings).

```
┌────────────────────────────────────────────────────────┐
│  CUSTOMER FEEDBACK                                      │
│                                                         │
│  ★ ★ ★ ★ ★   5 / 5                                    │
│                                                         │
│  "Excellent team, arrived early and left everything     │
│   spotless."                                            │
└────────────────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Stars | 5 filled/empty star SVGs. Filled color `--color-amber`. Unfilled `--color-line`. 16px each |
| Rating number | `X / 5` in `text-small text-muted` |
| Testimony | Quoted text in `text-small text-default italic`. Max 3 lines, truncated with `...` and "Read more" toggle if longer |

---

#### Section 9 — Status History Timeline

```
┌────────────────────────────────────────────────────────┐
│  STATUS HISTORY                                         │
│                                                         │
│  ● 11:00 AM  Job scheduled          (auto)              │
│  │                                                      │
│  ● 11:00 AM  Started                Luca Ferrari        │
│  │                                                      │
│  ● 11:23 AM  Progress: 25%          Luca Ferrari        │
│  │                                                      │
│  ● 11:47 AM  Progress: 75%          Luca Ferrari        │
│                                                         │
└────────────────────────────────────────────────────────┘
```

Sourced from `JobStatusEvent[]` for this job, sorted ascending by `occurredAt`.

| Column | Source | Detail |
|---|---|---|
| Time | `occurredAt` | `HH:MM AM/PM` |
| Event description | Derived from `fromStatus → toStatus` or `metadata.progressPct` | Human-readable label |
| Actor | `actorUserId` → `user.name` | `text-small text-muted`. `(auto)` for system-generated events |

Timeline dot and connecting line: dots are 8px `bg-brand` circles. Line is 1px `bg-line` vertical connector.

---

#### Section 10 — Action Buttons

Two buttons pinned to the bottom of the drawer (sticky footer, not scrolled with content).

```
┌────────────────────────────────────────────────────────┐
│  [ Open in Worker View ↗ ]    [ Revoke Job ]           │
└────────────────────────────────────────────────────────┘
```

**Open in Worker View:**
- Visible to all roles (MANAGER, SUPER_ADMIN, TEAM_LEAD)
- Opens `/worker/jobs/{jobId}` in a new browser tab, using the assigned worker's session (or the currently logged-in actor if they are that worker)
- Button variant: `secondary`
- Icon: `ExternalLink` Lucide icon trailing

**Revoke Job (MANAGER / SUPER_ADMIN only):**
- Hidden entirely for TEAM_LEAD
- Only enabled when `job.status` is `SCHEDULED` or `IN_PROGRESS` (disabled grey button when COMPLETED or already CANCELLED, with tooltip `Job already closed`)
- Button variant: `destructive`
- Icon: `Ban` Lucide icon leading
- Clicking opens the Revoke Job Modal (see below)

---

#### Revoke Job Modal

Opens on top of the drawer. The drawer stays open underneath.

```
┌──────────────────────────────────────────────────────────────┐
│  Revoke Job #J-009                                       ×   │
│  ──────────────────────────────────────────────────────────  │
│  Reason *                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Select a reason...                                  ↓ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Note (optional)                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ⚠  This action cannot be undone.                            │
│                                                              │
│  [ Cancel ]                        [ Revoke Job ]           │
└──────────────────────────────────────────────────────────────┘
```

Reason select options (maps to `cancelReasonCode`):

| Display label | Code |
|---|---|
| Customer requested cancellation | `CUSTOMER_CANCELLED` |
| Required equipment not available | `EQUIPMENT_UNAVAILABLE` |
| Assigned worker did not show up | `WORKER_NO_SHOW` |
| Could not access the property | `ACCESS_DENIED` |
| Entered in error / duplicate | `DUPLICATE_JOB` |
| Worker recalled for emergency | `EMERGENCY_RECALL` |

On confirm:
1. `PATCH /jobs/{id}/cancel` fires with `{ cancelReasonCode, cancelReasonNote }`
2. Job status changes to CANCELLED
3. Map pin changes to grey with `✕`
4. Activity feed prepends `job cancelled` event
5. Modal closes
6. Drawer stays open showing updated status

---

## WebSocket Subscriptions

The dashboard establishes a single Socket.io connection to `NEXT_PUBLIC_WS_URL` (`ws://localhost:3000` in local dev). On connection, it subscribes to the operator room:

```typescript
socket.emit('subscribe', { room: `operator:${operatorId}` })
```

For TEAM_LEAD, the subscription is the same room but the server filters events to team-scoped jobs only before broadcasting.

### Events Consumed

| WS Event | Payload | Dashboard action |
|---|---|---|
| `job.status.changed` | `{ jobId, status, workerId, teamId, lat, lng, progressPct }` | 1. Update pin color on map. 2. Recalculate KPI cards (Active Workers, On-Time Rate, Revenue). 3. Prepend new row to activity feed. 4. Update stat bar counts. 5. If drawer is open for this jobId, update status badge, progress section, and unlock After photos section if COMPLETED |
| `job.progress.updated` | `{ jobId, progressPct, workerId }` | 1. Update progress ring on map pin. 2. Prepend `progress updated` row to activity feed. 3. If drawer open for this jobId, update progress bar and step pills |
| `job.cancelled` | `{ jobId, cancelReasonCode, cancelledBy }` | 1. Change pin to grey with `✕`. 2. Decrement Active Workers if worker was ON_JOB. 3. Prepend `job cancelled` row to activity feed. 4. Update stat bar. 5. If drawer open for this jobId, update status to CANCELLED and disable Revoke button |

### Connection State

| State | UI treatment |
|---|---|
| Connecting | Small spinner in topbar area, tooltip `Connecting to live feed...` |
| Connected | Green dot indicator (subtle) in topbar, tooltip `Live` |
| Disconnected (unexpected) | Yellow pulsing dot in topbar, tooltip `Reconnecting...`. Automatic reconnect with exponential backoff. Feed rows get a `(live updates paused)` banner at top |
| Reconnected | Toast notification: `Live feed reconnected.` (dismisses after 3s) |

---

## API Calls

All calls include `Authorization: Bearer {accessToken}` header. All tenant-scoped calls are filtered by `operatorId` server-side.

### GET /dashboard/summary

Called once on page mount. Response populates all 4 KPI cards.

**Request:**
```
GET /dashboard/summary
```

**Response shape:**
```json
{
  "totalJobs": 40,
  "activeWorkers": 8,
  "onTimeRate": 95.6,
  "revenue": 2890.00,
  "deltaYesterday": {
    "totalJobs": 0.0,
    "activeWorkers": 14.3,
    "onTimeRate": 2.1,
    "revenue": -58.8
  }
}
```

`deltaYesterday` values are percentage changes (positive = increase). `onTimeRate` delta is in percentage points.

For TEAM_LEAD, the server filters all aggregations to `teamId = req.user.teamId`.

### GET /dashboard/activity

Called once on page mount to hydrate the initial feed state.

**Request:**
```
GET /dashboard/activity
```

**Response shape:**
```json
[
  {
    "id": "evt-001",
    "jobId": "J-005",
    "jobTypeLabel": "Lighting Install",
    "customerId": "c-05",
    "customerName": "Brera Pinacoteca",
    "workerId": "w-01",
    "workerName": "Luca Ferrari",
    "workerAvatarUrl": "avatar-luca.jpg",
    "fromStatus": "IN_PROGRESS",
    "toStatus": "COMPLETED",
    "progressPct": null,
    "occurredAt": "2026-06-05T09:52:00+02:00"
  },
  ...
]
```

Returns last 20 `JobStatusEvent` records, sorted descending by `occurredAt`. Each event is enriched with job type label, customer name, worker name and avatar.

### GET /jobs/{id} (for drawer)

Called when a map pin is clicked, to hydrate the job detail drawer.

**Request:**
```
GET /jobs/{id}
```

**Response shape (abbreviated):**
```json
{
  "id": "J-009",
  "status": "IN_PROGRESS",
  "progressPct": 75,
  "scheduledFor": "2026-06-05T11:00:00+02:00",
  "startedAt": "2026-06-05T11:00:00+02:00",
  "completedAt": null,
  "estimatedHours": 3.5,
  "clientRatePerHour": 85,
  "customerPhotos": ["https://picsum.photos/seed/ELECTRICAL_PANEL-before-1/400/300", "..."],
  "workerPhotos": ["https://picsum.photos/seed/ELECTRICAL_PANEL-after-1/400/300", "..."],
  "customerRating": null,
  "customerTestimony": null,
  "cancelReasonCode": null,
  "jobType": { "id": "jt-04", "label": "Electrical Panel" },
  "customer": { "name": "Porta Romana Tech Hub", "address": "Corso di Porta Romana 68", "contactName": "Valentina Riva", "lat": 45.451, "lng": 9.200 },
  "assignee": {
    "kind": "SOLO",
    "worker": { "id": "w-01", "name": "Luca Ferrari", "avatarUrl": "avatar-luca.jpg", "hourlyRate": 34, "phone": "+39 333 100 0001", "status": "ON_JOB" }
  },
  "statusHistory": [
    { "fromStatus": null, "toStatus": "SCHEDULED", "actorUserId": null, "occurredAt": "..." },
    { "fromStatus": "SCHEDULED", "toStatus": "IN_PROGRESS", "actorUserId": "u-03", "occurredAt": "..." }
  ]
}
```

### PATCH /jobs/{id}/cancel (from Revoke modal)

```
PATCH /jobs/{id}/cancel
Body: { "cancelReasonCode": "CUSTOMER_CANCELLED", "cancelReasonNote": "optional text" }
```

Roles: MANAGER, SUPER_ADMIN only. Returns updated job object.

### WebSocket — /ws

```
Connection: Socket.io
URL: NEXT_PUBLIC_WS_URL
Namespace: /
Room subscription: emit('subscribe', { room: 'operator:{operatorId}' })
```

---

## RBAC Variations

### MANAGER and SUPER_ADMIN

- See all 40 jobs on the map
- All 4 KPI cards show full operator-wide numbers
- Revenue Today card shows total platform revenue
- Activity feed shows events from all workers
- Job detail drawer shows full revenue breakdown section
- "Revoke Job" button visible and enabled (per job status)
- SUPER_ADMIN additionally sees the floating Demo Actor Switcher chip in topbar

### TEAM_LEAD (Luca Ferrari, `u-03`)

- Map shows only Team Alfa's 20 jobs (J-001 through J-020)
- KPI Card 1 label: `Team Jobs Today` → 20
- KPI Card 2 label: `Team Members On Job` → count of Team Alfa members with `status = ON_JOB` → 3 (Luca, Sofia, Davide)
- KPI Card 3 label: `Team On-Time Rate` → computed from Team Alfa jobs only
- KPI Card 4 label: `Team Revenue Today` → sum of clientCharge for Team Alfa's COMPLETED jobs only
- Activity feed shows only events from Team Alfa workers (w-01 through w-04)
- Job detail drawer: revenue breakdown section is hidden. Earnings section shows team member earnings instead
- "Revoke Job" button hidden from drawer footer
- "New Job" button (present in nav sidebar for MANAGER) is hidden for TEAM_LEAD

---

## Notes / Edge Cases

### Midnight Reset

At midnight Europe/Rome, a cron job calls the equivalent of `POST /demo/reset`:
- All in-progress and completed jobs revert to their seed state
- Map pins reset to their initial colors and statuses
- KPI cards reload from `/dashboard/summary`
- Activity feed is cleared and re-seeded
- WebSocket room broadcasts a `demo.reset` event which triggers a full page data refresh on any connected clients

### Demo Reset Button

`POST /demo/reset` is triggered by the SUPER_ADMIN's floating Demo panel. The dashboard responds to the `demo.reset` WS event by refetching all data (equivalent to a page reload of data, without a hard browser reload). A toast appears: `Demo data reset to seed state.`

### Multiple Pins at Same Location

Some customers share coordinates (e.g., multiple jobs at UniCredit Tower). When two or more pins occupy the same pixel position, the map renders a cluster marker (small number badge overlaid on the topmost pin). Clicking the cluster zooms in until the pins separate. Mapbox cluster configuration: `clusterRadius: 30px`.

### Map Pin Count vs Feed Count

The map shows jobs based on `scheduledFor` date. The feed shows `JobStatusEvents`. A single job can have multiple feed events (e.g., started + 3 progress updates + completed = 5 feed rows from 1 job). Total feed rows (up to 20) and total map pins (up to 40 for today's seed) are independent numbers.

### On-Time Rate Edge Case

If the current time is before any jobs have started (e.g., immediately after midnight reset), `onTimeRate` returns `null`. The KPI card shows `—` (em-dash) with `No starts yet` in the delta slot. The on-time calculation includes only jobs that have been started (`startedAt` is not null), not SCHEDULED jobs.

### Revenue for IN_PROGRESS Jobs

The Revenue Today KPI counts only `COMPLETED` jobs. An IN_PROGRESS job does not contribute to revenue until it transitions to COMPLETED. The drawer's revenue breakdown section does label projected amounts for non-completed jobs, but this is purely informational in the drawer — it is not reflected in the KPI card number.

### TEAM_LEAD Data Isolation

The server enforces TEAM_LEAD scoping at the query layer — every request carrying a TEAM_LEAD JWT automatically applies `WHERE teamId = user.teamId` to all job queries. The frontend does not need to pass `teamId` explicitly; the server derives it from the JWT claims. The dashboard simply renders whatever the summary and activity endpoints return.

### Drawer State on Status Change

If the job detail drawer is open and a WebSocket event arrives for that job:
- Status badge updates immediately (no drawer close/reopen)
- Progress section animates to new `progressPct`
- After photos section fades in if `toStatus = COMPLETED`
- Revenue section amounts do not change (estimated hours do not change mid-job)

### Cancelled Job Visibility

CANCELLED pins are shown on the map at 50% opacity by default (not hidden). The `[All]` filter includes cancelled pins. The `[Cancelled]` filter toggle shows only cancelled pins. The `[Scheduled]`, `[In Progress]`, `[Completed]` filters each hide cancelled pins.

### Responsive / Mobile

The dashboard at viewports below 1280px (`lg` breakpoint):
1. Right panel (map) collapses below left panel, becomes full-width
2. Map height is fixed at `400px` on mobile
3. KPI cards remain 2×2 grid until `md` breakpoint, then stack to single column
4. Activity feed becomes a horizontal scroll list of compact cards below the map
5. Filter toggle bar scrolls horizontally if it overflows map width

The dashboard is not a primary mobile surface — workers use `/worker` route instead. Mobile layout exists to allow demo viewers to see the map on a tablet or phone.
