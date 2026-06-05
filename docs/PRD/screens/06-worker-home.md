# Worker Home — /worker

## Overview

The worker home screen is the primary mobile interface for field workers in CrewMate. It is intentionally phone-shaped: forced to a max-width of 430px and designed for one-handed use in the field. Workers open this route in a separate browser tab while the operations manager monitors the same jobs from the desktop dashboard — this split-screen setup is the core WebSocket demo scenario. Changes a worker makes here (starting, progressing, completing a job) propagate in real time to the manager's map and kanban via Socket.io events.

The screen has four distinct regions stacked vertically: a sticky header, an earnings card with tabbed time periods, a mini status summary bar, and a scrollable list of today's jobs. The earnings card is the emotional anchor — it answers "how much have I made today?" immediately on open. The jobs list is operational — it answers "what do I do next?".

Route: `/worker`
Stack: Next.js 15 App Router, Tailwind 4, shadcn/ui, Socket.io client
City context: Milan, Italy — all addresses and customer names are Italian
Pre-seeded data: all job and earnings data comes from the seed (see `docs/PRD/SEED-DATA.md`)
Feature IDs: F-040 (Today view), F-041 (One-tap transitions), F-030 (WebSocket gateway)

---

## Roles With Access

| Role | Access level | Notes |
|---|---|---|
| `WORKER` (SOLO) | Full access to own jobs and own earnings | Solo workers see individual earnings only |
| `WORKER` (TEAM_MEMBER) | Full access to own assigned jobs and own earnings | Cannot see other team members' earnings |
| `TEAM_LEAD` | Full access to own jobs, own earnings, and team earnings summary | Additional "Team earnings" section in All Time tab |

Workers see only jobs assigned to their own worker ID (`workerId = me`). Team scope filtering is enforced at the API and re-enforced by RBAC guards on the WebSocket room.

---

## Layout Diagram (ASCII — mobile portrait, 430px wide)

```
┌─────────────────────────────┐  ← sticky, z-index 50
│  CrewMate            [Sofia] │  app name left, avatar+name right
│                     WORKER  │  role badge under name
└─────────────────────────────┘
                                   ← bg-canvas (#FAFAF7)
┌─────────────────────────────┐  ← earnings card, sticky-ish (scrolls until
│  [Today][Week][Month][All]  │    it hits header, then sticks)
│ ─────────────────────────── │
│         €204.00             │  large earned amount
│    + €72.00 projected       │  muted italic
│                             │
│  ████████████░░░░  3 of 9   │  progress bar + fraction
│  ●●●●●●●●●●●●●●○○  (donut) │  optional donut chart
└─────────────────────────────┘

┌─────────────────────────────┐
│  ✓ 3 Done  ◐ 2 In Progress  │  mini status summary bar
│  ○ 4 Scheduled              │  tappable filter chips
└─────────────────────────────┘

┌─────────────────────────────┐  ← job list (vertical scroll)
│ J-002  HVAC Maintenance  ✓  │
│ Politecnico di Milano       │
│ Via Ponzio 34, Città Studi  │
│ 07:30  [Completed]          │
│ Your share: €58.00 ●        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ J-010  HVAC Maintenance     │  ← IN_PROGRESS card (amber left border)
│ Meazza Stadium              │  4px left border in --color-amber
│ Via Piccolomini 5, San Siro │
│ 11:30  [In Progress]        │
│ ████████████░░░░ 50%        │  progress bar
│ Your share: ~€29.00 ◑       │  orange projected
└─────────────────────────────┘

┌─────────────────────────────┐
│ J-014  HVAC Repair          │  ← SCHEDULED card
│ Fondazione Catella          │
│ Via Sebenico 21, Isola      │
│ 14:00  [Scheduled]          │
│ Your share: €46.00 (est)    │  muted upcoming
└─────────────────────────────┘

        [End of day]               ← text-small text-muted, centered
```

---

## Header

The header is sticky at the top of the viewport (`position: sticky; top: 0; z-index: 50`). It does not scroll away. It provides persistent identity context so the worker always knows whose view they are looking at — important in demos where multiple accounts are open side by side.

| Slot | Token | Content | Notes |
|---|---|---|---|
| App name | `text-h3 text-brand font-sans` | "CrewMate" | Left-aligned, links to `/worker` (self-reload) |
| Avatar | `radius-full`, 32px, hash-derived hue | Worker initials | Right side, e.g. "SC" for Sofia Conti |
| Worker name | `text-small text-default` | "Sofia Conti" | Immediately right of avatar |
| Role badge | `RolePill` variant `neutral` | "WORKER" or "TEAM LEAD" | Below name, `text-micro` |
| Background | `bg-surface` | White | Separates from canvas below |
| Bottom border | `border-line` 1px | — | Visual separation from earnings card |
| Height | 56px minimum | — | Meets 44px tap-target requirement |

No navigation items. No hamburger menu. No back button. This is a single-surface app for workers.

---

## Earnings Card

The earnings card sits immediately below the header. It is the first thing a worker sees when they open the app. On Today tab it answers "how much have I made?" with a large typographic number. On other tabs it gives trend context.

The card uses `bg-surface` (white) with a 1px `border-line` border and `radius-xl` (12px). It has `space-4` (16px) internal padding. It is not permanently sticky — it scrolls with the page until the top of the card reaches the bottom of the header, at which point it sticks using `position: sticky; top: 56px`.

### Tab Bar

Four tabs rendered as a pill-group or underline tab strip inside the card header.

```
┌───────────────────────────────────────┐
│ [Today] [This Week] [This Month] [All]│
└───────────────────────────────────────┘
```

| Tab label | Query param / key | API period param |
|---|---|---|
| Today | `today` | `period=today` |
| This Week | `week` | `period=week` |
| This Month | `month` | `period=month` |
| All Time | `lifetime` | `period=lifetime` |

Active tab uses `bg-brand-soft` (navy fade) fill with `text-brand` label. Inactive tabs use `text-muted`. Minimum tap target per tab: 44px tall. Tab switching is client-side only (data for all periods is loaded once on mount, cached in component state).

---

### Today Tab

Shown by default on initial load.

```
┌─────────────────────────────────────────┐
│  Today                                  │
│                                         │
│           €204.00                       │  ← text-display (32px), text-default
│     + €72.00 projected                  │  ← text-small text-muted italic
│                                         │
│  ████████████████░░░░░░░  3 of 9 jobs   │  ← progress bar + fraction label
│                                         │
│        ● completed   ○ remaining        │  ← legend for donut (optional)
└─────────────────────────────────────────┘
```

**Large earned amount (`€204.00`)**
- Calculated from all COMPLETED jobs assigned to this worker today
- Formula: sum of (`estimatedHours × hourlyRate`) for jobs where `status = COMPLETED`
- Example for Sofia Conti (€25/hr): J-002 (HVAC_MAINTENANCE, 2h) = €50 + J-006 (PIPE_REPAIR, 2.5h) = €62.50 + J-010 progress share if completed etc.
- Formatted with `€` prefix, no decimal if whole number, two decimals otherwise
- `font-variant-numeric: tabular-nums` required
- Color: `text-default`
- Updates live via WebSocket when a job transitions to COMPLETED

**Projected amount (`+ €72.00 projected`)**
- Calculated from IN_PROGRESS jobs: prorated by `progressPct / 100 × estimatedHours × hourlyRate`
- Shown below the earned amount in `text-small text-muted font-style: italic`
- Prefix is `+ €X.XX projected`
- Color: `text-muted` (not the amber accent — projection is uncertain, not alarming)
- Updates live via WebSocket on `job.progress.updated` events

**Progress bar**
- Track: full width, `bg-canvas` (#FAFAF7), height 8px, `radius-full`
- Fill: `bg-success` (#2F7D5E), `radius-full`
- Represents `completedCount / totalJobsToday` (excludes CANCELLED jobs from denominator)
- Right-aligned label: "3 of 9 jobs" in `text-small text-muted`
- Animates width on WebSocket update using Motion (`duration: motionBase`)

**Donut chart (optional visual)**
- Small 48px donut beside or below the progress bar
- Segments: COMPLETED (success green), IN_PROGRESS (amber), SCHEDULED (canvas/bone), CANCELLED (muted gray)
- If not implemented, the progress bar alone is acceptable

**Empty state (no jobs today)**
```
No jobs scheduled for today.
```
Centered, `text-small text-muted`. Earnings amount shows `€0.00`.

---

### This Week Tab

```
┌─────────────────────────────────────────┐
│  This Week                              │
│                                         │
│  €720.00                ▲ +6% vs last   │
│                                         │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun      │
│  ▐██▌ ▐██▌ ▐██▌ ▐██▌ ▐▓▓▌ ▐░░▌ ▐░░▌   │
│   M    T    W    T  [Today] S    S      │
└─────────────────────────────────────────┘
```

**Total this week (`€720.00`)**
- Sum of all COMPLETED jobs for the current calendar week (Mon–Sun, Europe/Rome)
- `text-h1` (24px) weight 700, `text-default`
- Seed value for Sofia Conti: €720 this week (from `SEED-DATA.md` Table 11)

**Week-over-week delta**
- Shown inline: `▲ +6% vs last week` or `▼ -3% vs last week`
- `▲` in `text-success` (#2F7D5E), `▼` in `text-danger` (#B23A48)
- Formula: `(thisWeek - lastWeek) / lastWeek * 100`, rounded to nearest integer
- Seed: Sofia this week €720, last week €680 → +5.9% → "▲ +6% vs last week"
- `text-small` size, sits to the right of or below the total

**Mini bar chart (Mon–Sun)**
- 7 bars, one per day of the week
- Bar heights proportional to earnings that day (tallest bar fills the chart height)
- Today's bar: `bg-brand` (navy) fill
- Past days: `bg-brand-soft` (navy-fade) fill with `bg-brand` outline
- Future days: `bg-canvas` fill with `border-line` outline (no earnings yet)
- Chart height: 48px. Bar width: auto-fit in available space with `space-1` gaps
- No Y-axis labels. Day labels (M T W T F S S) in `text-micro text-muted` below each bar
- Today's label is `text-micro text-brand` with underline or bold treatment

---

### This Month Tab

```
┌─────────────────────────────────────────┐
│  This Month                             │
│                                         │
│  €2,760.00              ▲ +8% vs last   │
│                                         │
│  Wk1   Wk2   Wk3  [Wk4]                │
│  ▐████▌▐████▌▐████▌▐▒▒▒▌               │
│                                         │
└─────────────────────────────────────────┘
```

**Total this month (`€2,760.00`)**
- Sum of COMPLETED jobs for the current calendar month
- Seed value for Sofia Conti: €2,760 (from `SEED-DATA.md` Table 11)
- Same typography as week total

**Month-over-month delta**
- Same format as week delta
- Formula: `(thisMonth - lastMonth) / lastMonth * 100`

**4-bar week chart**
- 4 bars: Week 1, Week 2, Week 3, current week (in progress)
- Current week bar uses a striped or lighter `bg-brand-soft` fill with a dashed top edge to signal "in progress"
- Past weeks: `bg-brand` solid fill
- Bar labels: "Wk 1", "Wk 2", "Wk 3", "Wk 4" in `text-micro text-muted` below
- Current week label: "Wk 4 ◐" with `text-micro text-brand`

---

### All Time Tab

```
┌─────────────────────────────────────────┐
│  All Time                               │
│                                         │
│  €14,200.00 total earned                │
│  185 jobs completed                     │
│  Member since March 2025                │
│                                         │
│  ★ 4.7  avg from 185 reviews            │
│                                         │
└─────────────────────────────────────────┘
```

**All-time total (`€14,200.00 total earned`)**
- Lifetime earnings from all COMPLETED jobs
- `text-h1` (24px) 700 weight
- Seed values per worker (from `SEED-DATA.md` Table 11):
  - Luca Ferrari (Lead): €28,400 | 187 jobs
  - Sofia Conti (Member): €14,200 | 185 jobs
  - Davide Russo (Member): €13,800 | 181 jobs
  - Elena Moretti (Member): €12,600 | 179 jobs
  - Antonio Ricci (Solo): €21,200 | 248 jobs
  - Giulia Romano (Solo): €18,900 | 220 jobs
  - Matteo Gallo (Solo): €17,400 | 201 jobs
  - Chiara Marino (Solo): €20,100 | 232 jobs
  - Roberto Costa (Solo): €15,200 | 178 jobs

**Jobs completed count**
- `text-body text-muted` below the total
- Format: "185 jobs completed"

**Member since date**
- Derived from `user.createdAt` — seeded as March 2025 for all workers
- Format: "Member since March 2025"
- `text-small text-muted`

**Average rating**
- Shown as "★ 4.7 avg from 185 reviews"
- Star (★) in `--color-amber` (#D4A24C)
- Rating number in `text-body-strong text-default`
- "avg from N reviews" in `text-small text-muted`
- Seed values per worker (from `SEED-DATA.md` Table 8b):
  - Luca: 4.8 ⭐ (187 reviews) | Sofia: 4.6 (185) | Davide: 4.5 (181)
  - Elena: 4.7 (179) | Antonio: 4.8 (248) | Giulia: 4.7 (220)
  - Matteo: 4.4 (201) | Chiara: 4.8 (232) | Roberto: 4.4 (178)

---

### Team Lead Variation (Luca Ferrari only)

When the logged-in worker is a TEAM_LEAD (`worker.kind = TEAM_LEAD`), the All Time tab gains a "Team earnings" subsection below the personal stats. This section is only visible to the lead — team members do not see it.

```
┌─────────────────────────────────────────┐
│  All Time                               │
│                                         │
│  €28,400.00 total earned                │
│  187 jobs completed                     │
│  Member since March 2025                │
│  ★ 4.8  avg from 187 reviews            │
│                                         │
│  ─────── Team Alfa ────────────────── │
│                                         │
│  Team pool today:  €436.00              │
│  Your share:       €136.00 (31%)        │
│                                         │
│  Sofia Conti       €100.00              │
│  Davide Russo       €100.00             │
│  Elena Moretti      €100.00             │
│                                         │
└─────────────────────────────────────────┘
```

**Team Alfa section header**
- Divider with centered label "Team Alfa" in `text-small text-muted`
- Uses `border-line` divider lines flanking the label

**Team pool today (`€436.00`)**
- Sum of all team members' individual earnings for today (COMPLETED jobs only)
- Formula: sum of each member's `completedHours × hourlyRate`
- Label: `text-body-strong text-default` "Team pool today:"
- Value: `text-body-strong text-default`

**Your share**
- Lead's individual earnings as an absolute amount and percentage of the pool
- Luca's hourlyRate is €34 vs members at €25, so his share percentage will be higher on jobs where he is the primary assignee
- Format: "€136.00 (31%)"

**Member breakdown**
- Each team member (Sofia Conti, Davide Russo, Elena Moretti) shown with their individual earned today
- Only COMPLETED job earnings shown here, not projected
- `text-small text-default` for name, `text-small text-muted` for amount
- Sorted by earnings descending

**On Today tab for Team Lead**
- Today tab also shows "Team today: €X" in a secondary line below the projected amount
- Format: `text-small text-muted` "Team today: €X total (your share: €Y)"

---

## Mini Status Summary Bar

Displayed immediately below the earnings card, before the jobs list. Provides a quick count of job statuses for today without requiring the user to scroll the list.

```
┌─────────────────────────────────────────┐
│  ✓ 3 Done    ◐ 2 In Progress    ○ 4 Sched│
└─────────────────────────────────────────┘
```

**Structure**

| Slot | Icon | Color | Label format |
|---|---|---|---|
| Completed | `✓` (CheckCircle, 14px) | `text-success` | "3 Done" |
| In Progress | `◐` (Circle half-filled or Clock, 14px) | `text-accent` (amber) | "2 In Progress" |
| Scheduled | `○` (Circle outline, 14px) | `text-muted` | "4 Scheduled" |

Cancelled jobs are not shown in this bar (noise reduction). If count is 0 for any status, that chip is hidden or shown in a dimmed/zero state — designer's choice, but never shows "0 Done" as the first chip.

**Tappable filter**
- Each chip is tappable
- Tapping a chip filters the jobs list below to show only jobs with that status
- Active filter chip: `bg-brand-soft` background, `text-brand` label, `border-brand` border
- Tapping an active chip clears the filter (shows all)
- Active filter is local state — not persisted, not in the URL

**Layout**
- `bg-surface` background, 1px `border-line` border, `radius-lg` (8px)
- `space-3` (12px) internal padding
- Three chips in a row with `space-2` (8px) gap between them
- If viewport is very narrow, chips can wrap to two rows (unlikely at 430px)
- `text-small` for all labels, `text-mono` for the count numbers (tabular numerals)

**Real-time updates**
- Counts update live via WebSocket when `job.status.changed` events arrive
- Status bar receives the same event subscription as the jobs list

---

## Jobs List

The primary operational section. A vertical scroll list of today's jobs, sorted by `scheduledFor` ascending (earliest first). The list is the only place a worker takes action on their day.

```
┌─────────────────────────────────────────┐
│ J-002   [✓ Completed]                   │  ← completed jobs first if before current time
│ HVAC Maintenance                        │
│ Politecnico di Milano    [photo thumb]  │
│ Via Ponzio 34, Città Studi              │
│ 07:30                                   │
│ Your share: €50.00 ✓                    │  green confirmed earnings
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ J-010   [◐ In Progress]                 │  ← amber left border, 4px
│ HVAC Maintenance                 [thumb]│
│ Meazza Stadium                          │
│ Via Piccolomini 5, San Siro             │
│ 11:30                                   │
│ ████████████░░░░  50%                   │  ← progress bar
│ Your share: ~€29.00 ◑                   │  ← orange projected
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ J-014   [○ Scheduled]                   │
│ HVAC Repair                      [thumb]│
│ Fondazione Catella                      │
│ Via Sebenico 21, Isola                  │
│ 14:00                                   │
│ Your share: €62.50 (est)                │  ← muted upcoming
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ J-020   [✗ Cancelled]                   │  ← dimmed, 40% opacity on body
│ HVAC Maintenance                 [thumb]│
│ Lambrate Hub                            │
│ Via Conte Rosso 14, Lambrate            │
│ 11:00    EQUIPMENT_UNAVAILABLE          │
└─────────────────────────────────────────┘
```

---

### Job Card Layout

Each job is rendered as a card with `bg-surface` background, 1px `border-line` border, `radius-lg` (8px), and `space-4` (16px) internal padding. Cards have `space-3` (12px) gap between them.

**Top row (single line)**

| Slot | Content | Token |
|---|---|---|
| Job ID | "J-002" | `text-mono text-muted` — `font-size: text-small` |
| Status badge | `StatusPill` component | Right-aligned in top row |

**Second row**

| Slot | Content | Token |
|---|---|---|
| Job type icon | Lucide icon matching job type (e.g. `Wrench` for HVAC, `Zap` for electrical) | `icon-md` (18px), `text-muted`, inline before label |
| Job type label | "HVAC Maintenance" | `text-h3 text-default` (15px 600 weight) |
| Customer photo thumbnail | 40×40px rounded square | `radius-md`, `border-line` 1px, top-right corner of the card via `position: absolute` or flex justify-end |

The customer photo thumbnail uses the pre-seeded Picsum URL from the job's job type:
`https://picsum.photos/seed/{jobTypeName}-before-1/400/300` — shown at 40×40 cropped.
On COMPLETED jobs, the "after" photo is shown instead: `{jobTypeName}-after-1`.

**Third row**

| Slot | Content | Token |
|---|---|---|
| Customer name | "Politecnico di Milano" | `text-body text-muted` |

**Fourth row**

| Slot | Content | Token |
|---|---|---|
| Address | "Via Ponzio 34, Città Studi" | `text-small text-muted`, truncated with ellipsis at one line |

**Fifth row**

| Slot | Content | Token |
|---|---|---|
| Scheduled time | "07:30" | `text-small text-muted` |

**Progress bar row (IN_PROGRESS only)**

Shown only when `status = IN_PROGRESS`.

```
████████████░░░░  50%
```

| Slot | Token |
|---|---|
| Track | `bg-canvas`, height 6px, `radius-full`, full width |
| Fill | `bg-accent` (amber), `radius-full`, width = `progressPct%` |
| Label | "50%" `text-small text-muted` right-aligned |

Animates fill width on `job.progress.updated` WebSocket events using Motion.

**Per-job earnings row**

Always shown. Content and styling vary by status:

| Status | Label | Color | Notes |
|---|---|---|---|
| COMPLETED | "Your share: €50.00 ✓" | `text-success` (#2F7D5E) | CheckCircle icon after amount |
| IN_PROGRESS | "Your share: ~€29.00 ◑" | `text-warn` (#B7791F) | Tilde prefix signals projection |
| SCHEDULED | "Your share: €62.50 (est)" | `text-muted` | "(est)" suffix signals estimate |
| CANCELLED | — | — | No earnings row shown |

Formula: `estimatedHours × worker.hourlyRate`
For IN_PROGRESS: `(progressPct / 100) × estimatedHours × hourlyRate`
All amounts use `font-variant-numeric: tabular-nums`.

**Card left border (IN_PROGRESS only)**

```css
border-left: 4px solid var(--color-amber);
```

Applied only when `status = IN_PROGRESS`. Scheduled and completed cards have no accent border. Cancelled cards have no special border.

**Cancelled card dimming**

When `status = CANCELLED`:
- Card body text and icon opacity: 40% (`opacity: 0.4` on inner content wrapper)
- Border stays at full opacity
- No earnings row
- Cancellation reason shown below the scheduled time in `text-small text-muted`:
  - `CUSTOMER_CANCELLED` → "Cancelled by customer"
  - `EQUIPMENT_UNAVAILABLE` → "Equipment unavailable"
  - `ACCESS_DENIED` → "Access denied"
  - `WORKER_NO_SHOW` → "Worker no-show" (would not appear on own jobs in practice)
  - `DUPLICATE_JOB` → "Duplicate job"

---

### Sorting and Filtering

**Default sort order**
Jobs are sorted by `scheduledFor` ascending (earliest first). Within the same scheduled time, sort by job ID ascending.

**Status grouping within the sort**

Within the default sort, the ordering respects a visual grouping to aid field use:

1. IN_PROGRESS jobs — always at the top of the list regardless of scheduled time (most urgent)
2. SCHEDULED jobs — sorted by scheduledFor ASC
3. COMPLETED jobs — at the bottom, in a collapsed accordion labeled "Completed (3)" with `text-small text-muted`. Collapsed by default, expandable with a tap. Once expanded, sorted by completedAt descending (most recent first).
4. CANCELLED jobs — below completed, in a collapsed accordion labeled "Cancelled (2)". Collapsed by default.

**Active filter chip (from status bar)**

When a filter chip is active, the list shows only jobs matching that status. The "Completed" and "Cancelled" collapsed accordions are auto-expanded when their status is the active filter. The filter state is local component state — cleared on page navigation.

---

### Per-Job Earnings Display

Earnings per job are derived from the job's `estimatedHours` and the worker's personal `hourlyRate` (not the client rate). Workers do not see the client rate or the operator's profit margin.

**Computation**

```
completedEarnings    = estimatedHours × hourlyRate
inProgressEarnings   = (progressPct / 100) × estimatedHours × hourlyRate
scheduledEarnings    = estimatedHours × hourlyRate  (full estimate, shown muted)
```

**Example values (Sofia Conti, €25/hr)**

| Job | Type | Est Hours | Status | Her Earnings | Display |
|---|---|---|---|---|---|
| J-002 | HVAC_MAINTENANCE (2h) | 2.0 | COMPLETED | €50.00 | "Your share: €50.00 ✓" green |
| J-006 | PIPE_REPAIR (2.5h) | 2.5 | COMPLETED | €62.50 | "Your share: €62.50 ✓" green |
| J-010 | HVAC_MAINTENANCE (2h) | 2.0 | IN_PROGRESS 50% | ~€25.00 | "Your share: ~€25.00 ◑" amber |
| J-014 | HVAC_REPAIR (3h) | 3.0 | SCHEDULED | €75.00 | "Your share: €75.00 (est)" muted |

Team jobs (where multiple workers are assigned): each worker sees only their own individual share. The team pool total is not shown on individual job cards — only in the Team Lead's All Time tab.

---

## WebSocket Subscriptions

The worker home screen maintains a persistent Socket.io connection to the CrewMate API. The connection is established on mount and torn down on unmount. Authentication uses the same JWT access token sent as a cookie.

**Connection**

```
wss://crewmate.ritaro.dev/ws
Local: ws://localhost:3000
```

The socket joins a tenant room (`tenant:op-001`) on connect. The server filters outbound events to only send the worker their own job events (events filtered by `workerId = me` on the server before broadcast).

**Events listened**

| Event name | Payload fields | UI response |
|---|---|---|
| `job.status.changed` | `{ jobId, newStatus, progressPct, workerId }` | Update job card status badge live; move card to new group (IN_PROGRESS floats up); update mini status summary bar counts; if `newStatus = COMPLETED`, recalculate today tab earnings totals |
| `job.progress.updated` | `{ jobId, progressPct, workerId }` | Update progress bar fill and percentage label on the matching job card; update projected earnings on that card and in the Today tab total |

**Earnings recalculation on COMPLETED**

When `job.status.changed` fires with `newStatus = COMPLETED`:
1. Remove the job's projected contribution from the "projected" line
2. Add the job's full `estimatedHours × hourlyRate` to the "earned" total
3. Animate the `€` number counting up using Motion (200ms ease-out counter animation)
4. Update the progress bar (completedCount / totalCount)
5. Update the mini status summary bar

**Optimistic updates**

The worker home screen does not itself trigger job transitions — that happens in the job detail screen (`/worker/jobs/:id`). The home screen is read-only except for filter interactions. WebSocket is the sole real-time update path on this screen.

**Reconnect behavior**

On disconnect, the client shows a subtle banner: `text-small text-warn` "Connection lost — reconnecting…" pinned above the mini status bar. On reconnect, the banner disappears and a full data refresh is triggered (`GET /workers/me/jobs` re-fetches). No stale data is shown without a visual indicator.

---

## API Calls

All calls are made on mount (initial load) plus on WebSocket reconnect. The earnings tabs lazy-load their data when the tab is first tapped (Today tab data loads on mount).

| Call | Endpoint | Params | When | Response used for |
|---|---|---|---|---|
| Today's jobs | `GET /workers/me/jobs` | `date=today` | Mount, reconnect | Jobs list (all statuses) |
| Today earnings | `GET /workers/:id/earnings` | `period=today` | Mount | Today tab amounts |
| Week earnings | `GET /workers/:id/earnings` | `period=week` | First tap on Week tab | Week tab total, delta, bar chart data |
| Month earnings | `GET /workers/:id/earnings` | `period=month` | First tap on Month tab | Month tab total, delta, bar chart data |
| Lifetime earnings | `GET /workers/:id/earnings` | `period=lifetime` | First tap on All Time tab | Lifetime total, job count, member-since, rating |

**Loading states**

- On mount: skeleton placeholders for the earnings card and job cards (shimmer using `bg-canvas` to `bg-line` gradient animation)
- Tab switch (first time): skeleton for the tab content only, rest of card visible
- No full-page spinner — skeleton preferred

**Error states**

If `GET /workers/me/jobs` fails:
- Jobs list area shows: "Couldn't load your jobs. Pull to refresh." (`text-small text-muted`, centered)
- Mini status bar shows all zeros

If earnings call fails:
- Amounts show `—` placeholder
- No error toast for earnings failure (non-critical)

---

## RBAC Variations (WORKER vs TEAM_LEAD)

| Element | WORKER (SOLO) | WORKER (TEAM_MEMBER) | TEAM_LEAD |
|---|---|---|---|
| Role badge in header | "WORKER" | "WORKER" | "TEAM LEAD" |
| Earnings card | Own earnings only | Own earnings only | Own earnings + Team section in All Time tab |
| Today tab | Own earned + projected | Own earned + projected | Own earned + projected + "Team today" line |
| All Time tab | Personal stats | Personal stats | Personal stats + Team Alfa breakdown |
| Jobs list | Own assigned jobs only | Own assigned jobs only | Own assigned jobs only (team overview is on desktop) |
| Mini status bar | Own jobs counts | Own jobs counts | Own jobs counts (own jobs, not team) |
| WebSocket filter | `workerId = me` | `workerId = me` | `workerId = me` (own events) + team room if needed for team earnings updates |

The TEAM_LEAD worker view is intentionally focused on their own field work. Team management and team-wide oversight live on the desktop dashboard. The only team-specific element on mobile is the earnings breakdown in the All Time tab.

---

## Notes / Edge Cases

**End of day**
When all jobs are COMPLETED or CANCELLED and there are no SCHEDULED or IN_PROGRESS jobs left, the bottom of the list shows a centered "End of day" label in `text-small text-muted`.

**All jobs cancelled**
If all jobs for today are cancelled (edge case), the earnings card Today tab shows `€0.00` with no projected amount. The mini status bar shows only the cancelled count. Jobs list shows the collapsed Cancelled accordion expanded by default.

**No jobs today**
If the worker has no jobs assigned today (possible after a reset mid-day):
- Jobs list area shows: "No jobs scheduled for today."
- Mini status bar shows all zeros or is hidden
- Earnings card Today tab shows `€0.00 earned`, no projected line

**Midnight reset**
At midnight Europe/Rome, the server runs a daily seed reset (`POST /demo/reset` equivalent on cron). The WebSocket will emit a batch of `job.status.changed` events. The client handles these identically to individual events — each one updates the relevant card. The net result is the list resets to all SCHEDULED. Workers mid-shift may see the screen update unexpectedly; this is an acceptable demo artifact.

**Progress > 100% guard**
The server enforces `progressPct` is clamped to 0–100. If the client receives a value outside that range, it clamps before rendering.

**Currency formatting**
All amounts are formatted as `€N,NNN.NN` using `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })` — Italian locale formatting. Example: `€1.020,00` not `€1,020.00`. This matches the Milan context.

Wait — on reconsideration: for a demo targeting an international audience, `€1,020.00` (en-US style with euro prefix) may be more universally legible. Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' })` which produces `€1,020.00`. This is a product decision — document here and let the implementer confirm.

**Tap job card → navigation**
Tapping anywhere on a job card (except the filter chip in the summary bar) navigates to `/worker/jobs/:id`. There is no separate "tap target" within the card — the entire card surface is the tap target. Implemented via Next.js `<Link>` wrapping the card.

**Viewport constraint**
The route enforces max-width of 430px. On tablet or desktop, the view is letterboxed centered on a `bg-canvas` background. The header, earnings card, and jobs list all respect this constraint. No tablet-specific layout exists.

**Scroll behavior**
- Header: `position: sticky; top: 0`
- Earnings card: `position: sticky; top: 56px` (header height)
- Everything else scrolls freely
- The stickiness of the earnings card ensures the worker always sees their current earnings total while scrolling the jobs list

**Avatar colors**
Worker initials use a hash-derived hue from the design system's fixed palette of six colors. No uploaded photos in v0.1. The avatar is 32×32px with `radius-full`.

**Demo switcher integration**
The Super Admin "floating demo chip" (actor switcher) can appear over this screen when the demo session cookie is active. The chip is rendered by a global layout component and is not part of the worker home screen implementation. The chip should appear at `z-index: 100` above the sticky header (`z-index: 50`).

**Sign out**
A "Sign out" link is accessible from the header (or a minimal footer below the jobs list). Tapping clears the session cookies and routes to `/login`. No confirmation dialog — workers share phones, fast sign-out matters.

---

## Cross-references

- Job detail screen: `docs/PRD/screens/07-worker-job-detail.md` (proposed)
- WebSocket gateway guardrails: `docs/guardrails/shared/02-events.md`
- Design system tokens: `docs/guardrails/frontend/00-design-system.md`
- Worker mobile guardrails: `docs/guardrails/frontend/15-worker-mobile.md`
- Seed data (earnings numbers, job assignments): `docs/PRD/SEED-DATA.md`
- Actor workflow reference: `docs/PRD/ACTOR-WORKFLOWS.md` (Actor 4, Actor 3D)
- Feature IDs: F-040, F-041, F-030 in `docs/FEATURES.md`
