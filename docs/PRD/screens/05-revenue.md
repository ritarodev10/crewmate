# Revenue — /revenue

## Overview

The Revenue screen gives MANAGER and SUPER_ADMIN a financial snapshot of platform performance.
It shows today's earned revenue, platform profit, and margin derived from all COMPLETED jobs, plus
a 7-day trend area chart and a per-job-type breakdown table. Data is read-only, has no filters,
and reflects today's running totals with a 30-second polling refresh for the live partial day.

The revenue model is purely computational: the platform bills clients at a fixed rate per worker-hour
(set on the JobType), and pays each worker their personal hourlyRate. The spread between those two
numbers is the platform's profit. Only COMPLETED jobs contribute to revenue or profit figures — 
SCHEDULED, IN_PROGRESS, and CANCELLED jobs are excluded.

City context: Milan, Italy. Currency: Euro (€). Historical data covers 7 days prior to today.

---

## Roles With Access

| Role | Access |
|---|---|
| SUPER_ADMIN | Full access |
| MANAGER | Full access |
| TEAM_LEAD | No access — redirected to /worker |
| WORKER | No access — redirected to /worker |

The revenue nav item is hidden from the sidebar for TEAM_LEAD and WORKER roles.
A direct URL visit by those roles returns a 403 and the UI redirects to their home route.

---

## Revenue Formula Reference

These formulas are computed at query time — nothing is stored in the DB.

```
clientCharge   = estimatedHours × clientRatePerHour × numberOfWorkersOnJob

workerCost     = Σ(estimatedHours × worker.hourlyRate)
                 summed over each individual worker assigned to the job

platformProfit = clientCharge − workerCost

profitMargin   = (platformProfit / clientCharge) × 100
```

Workers on a TEAM job: lead (w-01, €34/hr) + up to 3 members (€25/hr each).
Workers on a SOLO job: one worker at their personal hourlyRate.
`clientRatePerHour` is always greater than any single `worker.hourlyRate`, so profit is always positive.

---

## Layout Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Revenue                                   [Refresh] badge: live        │
│  Platform earnings for today · Milan, Italy                             │
├──────────────┬──────────────┬──────────────┬──────────────────────────  │
│  Total        │  Total        │  Profit       │  Jobs                    │
│  Revenue      │  Profit       │  Margin       │  Billed                  │
│               │               │               │                          │
│  €2,890       │  €552         │  19.1%        │  15                      │
│  ▲ −58.8%     │  ▲ −58.8%    │  ─ 0.0 pp     │  ▼ −58.3%               │
│  vs yesterday │  vs yesterday │  vs yesterday │  vs yesterday            │
├──────────────┴──────────────┴──────────────┴──────────────────────────  │
│  Revenue Trend                                                           │
│                            [Today] [Last 7 days]                        │
│  €8K ┤                                                      ╭──         │
│  €7K ┤                                               ╭──────╯           │
│  €6K ┤              ╭──────╮           ╭─────╮      │                   │
│  €5K ┤  ╭──────────╯       ╰──────────╯      ╰──────╯                  │
│  €4K ┤  │                                                               │
│  €3K ┤  │                                                  ╭── Today    │
│  €2K ┤  │                                                 ╱  (partial)  │
│  €1K ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╱              │
│      └──┬───────┬───────┬───────┬───────┬───────┬───────┬──────────     │
│        T-7     T-6     T-5     T-4     T-3     T-2     Yesterday Today  │
│        (Revenue area = blue, Profit area = green, stacked)              │
├───────────────────────────────────────────────────────────────────────  │
│  Per-Job-Type Breakdown                                                  │
│                                                                          │
│  ┌──────────────────┬────────┬──────────────┬─────────────┬─────────┐  │
│  │ Job Type         │ Jobs   │ Total Revenue│ Total Profit│ Margin  │  │
│  ├──────────────────┼────────┼──────────────┼─────────────┼─────────┤  │
│  │ AC Installation  │   2    │    €960.00   │   €484.00   │  50.4%  │  │
│  │ HVAC Repair      │   2    │    €432.00   │   €192.00   │  44.4%  │  │
│  │ HVAC Maintenance │   2    │    €232.00   │   €112.00   │  48.3%  │  │
│  │ Electrical Panel │   2    │    €595.00   │   €225.00   │  37.8%  │  │
│  │ Pipe Repair      │   2    │    €340.00   │   €140.00   │  41.2%  │  │
│  │ Drain Cleaning   │   2    │    €150.00   │   €66.00    │  44.0%  │  │
│  │ Lighting Install │   2    │    €248.00   │   €116.00   │  46.8%  │  │
│  │ Generator Repair │   1    │    €414.00   │   €130.50   │  31.5%  │  │
│  ├──────────────────┼────────┼──────────────┼─────────────┼─────────┤  │
│  │ TOTAL            │  15    │  €2,891.00   │  €1,065.50  │  36.8%  │  │
│  └──────────────────┴────────┴──────────────┴─────────────┴─────────┘  │
│   Note: Live figures — small rounding differences may appear vs cards   │
└─────────────────────────────────────────────────────────────────────────┘
```

> The ASCII numbers above are illustrative for layout. Exact live values come from the API.
> Actual seeded today-partial revenue from the API is €2,890 / profit €552 (per SEED-DATA.md).

---

## Summary Cards

Four cards displayed as a 2×2 grid on mobile and a single row on desktop (≥ 768 px).

### Card 1: Total Revenue

| Property | Value |
|---|---|
| Label | Total Revenue |
| Value | Today's sum of `clientCharge` across all COMPLETED jobs, formatted as `€X,XXX` or `€X.XXK` |
| Delta | % change vs yesterday (`deltaRevenue` from API), shown as `▲ +XX%` or `▼ −XX%` in green/red |
| Subtext | "vs yesterday" |
| Icon | Currency / trending-up icon |
| Seed today value | €2,890 (15 completed jobs, live partial) |
| Seed yesterday | €7,020 (36 completed jobs) |
| Seed delta | −58.8% (today is partial — expected to be negative until later in the day) |

### Card 2: Total Profit

| Property | Value |
|---|---|
| Label | Total Profit |
| Value | Today's sum of `platformProfit` across all COMPLETED jobs, formatted as `€X,XXX` |
| Delta | % change vs yesterday (`deltaProfit` from API) |
| Subtext | "vs yesterday" |
| Icon | Profit / wallet icon |
| Seed today value | €552 (live partial) |
| Seed yesterday | €1,340 |
| Seed delta | −58.8% |

### Card 3: Profit Margin %

| Property | Value |
|---|---|
| Label | Profit Margin |
| Value | `(totalProfit / totalRevenue) × 100`, rendered as `XX.X%` |
| Delta | Percentage-point change vs yesterday, shown as `▲ +X.Xpp` or `▼ −X.Xpp` (note: pp, not %) |
| Subtext | "vs yesterday" |
| Icon | Gauge / percent icon |
| Seed today value | ~19.1% (€552 / €2,890) |
| Seed yesterday | ~19.1% (€1,340 / €7,020) |
| Seed delta | ~0.0 pp — margin is structurally stable across days |

> Profit margin on this screen represents platform margin only, not gross margin in the accounting sense.
> It will vary slightly day-to-day based on job-type mix.

### Card 4: Jobs Billed

| Property | Value |
|---|---|
| Label | Jobs Billed |
| Value | Count of COMPLETED jobs today, shown as integer |
| Delta | Count change vs yesterday, shown as `▲ +N` or `▼ −N` |
| Subtext | "vs yesterday" |
| Icon | Checkmark / receipt icon |
| Seed today value | 15 |
| Seed yesterday | 36 |
| Seed delta | −21 (partial day) |

### Card delta color rules

- Positive delta for Revenue, Profit, Jobs Billed: green text + ▲
- Negative delta for Revenue, Profit, Jobs Billed: red text + ▼ (partial-day negatives are expected and normal)
- Profit Margin delta: neutral grey text if ±0.5 pp, green if > +0.5 pp, red if < −0.5 pp
- Zero delta: neutral grey, no arrow

---

## Revenue Trend Chart

### Data Source

The chart uses data from `GET /revenue` → `trend[]` array (7 historical days) plus today's live partial.
Each element: `{ date: ISO-8601 date string, revenue: number, profit: number }`.

Historical 7-day seed data:

| Day | Date Label | Revenue (€) | Profit (€) |
|---|---|---|---|
| Today − 7 | Mon (example) | 5,240 | 980 |
| Today − 6 | Tue | 5,890 | 1,102 |
| Today − 5 | Wed | 4,960 | 924 |
| Today − 4 | Thu | 6,320 | 1,210 |
| Today − 3 | Fri | 6,080 | 1,148 |
| Today − 2 | Sat | 5,620 | 1,058 |
| Yesterday | Sun (example) | 7,020 | 1,340 |
| Today | Mon (example) | 2,890 (live) | 552 (live) |

### Chart Type

Recharts `AreaChart` with two series rendered as semi-transparent filled areas.
The areas are overlapping (not stacked) so both series share the same Y-axis scale.

### Data Series

| Series | Color | Area Fill | Description |
|---|---|---|---|
| Revenue | `#3b82f6` (blue-500) | `rgba(59, 130, 246, 0.2)` | Total client charge billed |
| Profit | `#22c55e` (green-500) | `rgba(34, 197, 94, 0.2)` | Platform earnings after paying workers |

Revenue area is rendered first (bottom layer); Profit area rendered on top.
Because profit values are smaller than revenue values, the green area always fits within the blue area.
This creates a clear visual: the blue "cap" above the green line represents total worker cost.

### Axes

- X-axis: date labels formatted as `"Mon 2"` (abbreviated day name + day number). Today is labelled `"Today"`.
- Y-axis: Euro amounts, auto-scaled. Tick format: `€X,XXX` for values ≥ 1000, `€XXX` below.
- Grid lines: horizontal dotted lines at Y-axis ticks, muted grey (`#e5e7eb`).
- No vertical grid lines.

### Period Selector

Two pill buttons above the chart (right-aligned):

```
[Today]  [Last 7 days]
```

- **Last 7 days** (default): shows the full 8-point dataset (7 historical + today). X-axis shows all 8 dates.
- **Today**: switches to an hourly breakdown of today only. X-axis shows hours (`08:00`, `09:00`, ..., current hour). Each data point is cumulative revenue/profit for completed jobs by that hour. This view is useful to see the intraday earning ramp.

The period selector does not reload the page — it switches between two pre-fetched datasets client-side.
The hourly data is included in the initial `/revenue` API response under a separate `hourly[]` key (see API section).

### Interactions

**Tooltip on hover (Recharts `<Tooltip>` custom component):**

```
┌─────────────────────────────┐
│  Thursday, 29 May           │
│  ─────────────────────────  │
│  ● Revenue   €6,320         │
│  ● Profit    €1,210         │
│  ─────────────────────────  │
│  Margin      19.1%          │
└─────────────────────────────┘
```

- Triggered on mouse hover (desktop) or touch (mobile)
- Shows formatted date, both series values, and computed margin
- Tooltip follows the cursor; background is white with `shadow-md` border
- Active dot shown on both series at the hovered point (filled circle, 5 px radius)
- Today's data point tooltip appends `"(partial)"` to the date label

**Legend:** a small inline legend below the period selector showing the two colored dots + labels:
`● Revenue  ● Profit`

---

## Per-Job-Type Breakdown Table

Displayed below the chart. Shows today's COMPLETED job revenue aggregated by job type.

### Columns

| Column # | Header | Type | Description | Format |
|---|---|---|---|---|
| 1 | Job Type | string | Human-readable label from `JobType.label` | Left-aligned text. E.g. `HVAC Repair` |
| 2 | Jobs Completed | integer | Count of COMPLETED jobs of this type today | Center-aligned. Shows `0` if none |
| 3 | Total Revenue | currency | Sum of `clientCharge` for all COMPLETED jobs of this type | Right-aligned `€X,XXX.XX` |
| 4 | Total Profit | currency | Sum of `platformProfit` for all COMPLETED jobs of this type | Right-aligned `€X,XXX.XX` |
| 5 | Margin % | percentage | `(totalProfit / totalRevenue) × 100` for this type | Right-aligned `XX.X%` |

Rows are ordered by Total Revenue descending (highest earning type at top).
If two types have equal revenue, alphabetical order by job type label is used as tiebreaker.

### Totals Row

A sticky footer row with `font-semibold` and a top border separator:

| Job Type | Jobs Completed | Total Revenue | Total Profit | Margin % |
|---|---|---|---|---|
| **TOTAL** | **15** | **€2,890.00** | **€552.00** | **19.1%** |

The totals row sums columns 2, 3, 4 and recalculates margin from those totals.
It is not an average of the per-type margins — it is `(totalProfit / totalRevenue) × 100`.

### Today's Seeded Job Type Data (for reference)

Derived from SEED-DATA.md completed jobs (J-001 through J-027 COMPLETED status):

| Job Type | Completed Jobs | Key Jobs | Revenue Formula |
|---|---|---|---|
| AC Installation | 2 | J-001 (Team Alfa, 4 workers, 4h, €80/hr), J-026 (Antonio solo, 4h, €80/hr) | J-001: 4×€80×4=€1,280; J-026: 4×€80×1=€320 |
| HVAC Repair | 2 | J-007 (Davide solo, 3h, €72/hr), J-021 (Antonio solo, 3h, €72/hr) | Each: 3×€72×1=€216 |
| HVAC Maintenance | 2 | J-002 (Sofia solo, 2h, €58/hr), J-027 (Giulia solo, 2h, €58/hr) | Each: 2×€58×1=€116 |
| Electrical Panel | 2 | J-003 (Davide solo, 3.5h, €85/hr), J-025 (Roberto solo, 3.5h, €85/hr) | Each: 3.5×€85×1=€297.50 |
| Pipe Repair | 2 | J-006 (Sofia solo, 2.5h, €68/hr), J-022 (Giulia solo, 2.5h, €68/hr) | Each: 2.5×€68×1=€170 |
| Drain Cleaning | 2 | J-004 (Elena solo, 1.5h, €50/hr), J-023 (Matteo solo, 1.5h, €50/hr) | Each: 1.5×€50×1=€75 |
| Lighting Install | 2 | J-005 (Luca solo, 2h, €62/hr), J-024 (Chiara solo, 2h, €62/hr) | Each: 2×€62×1=€124 |
| Generator Repair | 1 | J-008 (Elena solo, 4.5h, €92/hr) | 4.5×€92×1=€414 |

> Note: Team Alfa jobs (J-001 through J-008) assign individual workers per job, not the full 4-person team.
> The AC Installation job J-001 is assigned to Luca as sole worker on that ticket (1 worker × 4h × €80 = €320).
> The large team-billing example in SYSTEM-MAP.md is a conceptual example, not reflected in today's seed.
> The aggregate seeded revenue of €2,890 for today comes from the SEED-DATA historical summary table.
> Exact per-type live figures are computed from COMPLETED job rows in the DB at query time.

### Empty State (Row Level)

If a job type has zero completed jobs today, the row still appears with:
- Jobs Completed: `0`
- Total Revenue: `€0.00`
- Total Profit: `€0.00`
- Margin %: `—` (em-dash, since division by zero is undefined)

All 8 job types are always shown, even on days with no activity for that type.
This keeps the table layout stable and avoids jarring row-count changes.

### Table Styling Notes

- Alternating row background: odd rows `bg-white`, even rows `bg-gray-50/50`
- Hover state: `bg-blue-50/30` on row hover
- Header row: `text-xs uppercase tracking-wider text-muted-foreground bg-gray-50`
- Totals row: `bg-gray-100 font-semibold border-t-2 border-gray-200`
- Currency columns use tabular numbers (`font-variant-numeric: tabular-nums`) for alignment

---

## Revenue vs Profit — Visual Distinction Guide

Consistent visual encoding is used throughout the screen so the user can instantly tell revenue from profit.

### Color System

| Concept | Color Token | Hex | Usage |
|---|---|---|---|
| Revenue | `--color-revenue` → `blue-500` | `#3b82f6` | Chart area fill, card accent, column header |
| Profit | `--color-profit` → `green-500` | `#22c55e` | Chart area fill, card accent, column header |
| Worker Cost | (implicit gap) | — | Never shown explicitly; it's the visual gap between revenue and profit areas |
| Neutral / Total | `gray-700` | `#374151` | Totals row, summary text |

### Label Conventions

- Never abbreviate: always spell out "Revenue" and "Profit" in full.
- Chart legend: `● Revenue` (blue dot) and `● Profit` (green dot) — no other labels.
- Table column headers: "Total Revenue" and "Total Profit" — never "Billing" or "Income".
- Cards: card 1 is labelled "Total Revenue", card 2 is labelled "Total Profit" — never swapped.
- Tooltip: always show Revenue first, Profit second (top-to-bottom order matches value size: bigger on top).
- Delta signs: Revenue and Profit deltas use the same sign convention (positive = good = green ▲).

### Typography Distinction

- Revenue value on the card: `text-2xl font-bold text-blue-600`
- Profit value on the card: `text-2xl font-bold text-green-600`
- Margin value on the card: `text-2xl font-bold text-gray-800` (neutral — it's a ratio, not a raw amount)
- In the table: Revenue column header has a subtle `text-blue-700` tint; Profit column header has `text-green-700`.

### Why These Choices

- Blue for revenue is a convention borrowed from financial dashboards (revenue = "top line" = sky blue).
- Green for profit maps to the "in the green" idiom and reinforces the positive framing.
- The gap between the two areas in the chart is an implicit representation of worker costs — no third series is needed.
- Avoiding red for profit prevents users from reading normal low-profit days as losses.

---

## API Calls

### Primary: GET /revenue

Called on page load and every 30 seconds for live partial-day updates.
Scoped to `operatorId` from the authenticated JWT — no explicit query param needed.

**Request:**
```
GET /revenue
Authorization: Bearer <jwt>
```

**Response shape:**
```typescript
{
  summary: {
    revenue:    number;   // today's total clientCharge, COMPLETED jobs only
    profit:     number;   // today's total platformProfit, COMPLETED jobs only
    margin:     number;   // profit / revenue × 100 (percentage, not decimal)
    jobsBilled: number;   // count of COMPLETED jobs today
    deltaRevenue: number; // % change vs yesterday (signed, e.g. -58.8)
    deltaProfit:  number; // % change vs yesterday (signed)
    deltaMargIn:  number; // percentage-point change vs yesterday (signed)
    deltaJobs:    number; // count change vs yesterday (signed integer)
  };

  trend: Array<{
    date:    string;  // ISO-8601 date, e.g. "2026-05-29"
    revenue: number;  // total clientCharge for COMPLETED jobs that day
    profit:  number;  // total platformProfit for COMPLETED jobs that day
  }>;               // 7 elements (Today-7 through Yesterday), ordered oldest first

  today: {
    date:    string;  // today's ISO-8601 date
    revenue: number;  // live running total (same as summary.revenue)
    profit:  number;  // live running total (same as summary.profit)
  };                // appended to trend array client-side to form 8-point chart

  hourly: Array<{
    hour:    number;  // 0–23
    revenue: number;  // cumulative revenue through that hour
    profit:  number;  // cumulative profit through that hour
  }>;               // only hours up to current hour are included; used by "Today" period view

  byType: Array<{
    type:           string;  // e.g. "HVAC_REPAIR"
    label:          string;  // e.g. "HVAC Repair"
    jobsCompleted:  number;
    revenue:        number;
    profit:         number;
    margin:         number;  // percentage
  }>;              // always 8 elements (one per JobType); zero-revenue types included with zeros
}
```

**HTTP error codes:**
- `401 Unauthorized` — missing or expired JWT
- `403 Forbidden` — authenticated user has WORKER or TEAM_LEAD role
- `500` — server error (show generic error state, retry button)

### Polling Behavior

The client polls `GET /revenue` every 30 seconds while the tab is visible.
When the tab becomes hidden (`document.visibilityState === 'hidden'`), polling pauses.
When the tab becomes visible again, an immediate re-fetch runs before resuming the 30-second interval.

Implementation note: use TanStack Query `useQuery` with `refetchInterval: 30_000` and
`refetchIntervalInBackground: false` to satisfy the above behavior without manual timers.

---

## Notes / Edge Cases

### Early Morning (0 completed jobs today)

If `summary.jobsBilled === 0`:
- Summary cards: all values show `€0` or `0%` with a `—` in place of the delta (no yesterday comparison is available until at least one job completes).
- Chart: the "Today" data point is plotted at `(today, 0)` for both series — a flat dot on the X-axis.
- Table: all 8 rows show `0` completed jobs, `€0.00` revenue/profit, and `—` for margin.
- No empty-state illustration needed — the zero-data table and flat chart line are self-explanatory.

### Partial Day (jobs completing throughout the day)

Today's data point in the chart will always be lower than historical days until late afternoon.
A `"(partial)"` label is appended to the today tooltip to set expectations.
No other special treatment is needed — the 30-second poll keeps the live numbers current.

### Yesterday Had Zero Revenue (hypothetical)

If `deltaRevenue` cannot be computed (yesterday revenue = 0), the delta badge shows `—` instead of a %.
This prevents division-by-zero being surfaced to the user.

### Yesterday Is Not In Trend Array

The `/revenue` response includes `trend` covering Today-7 through Yesterday (7 elements).
Yesterday's values are used to compute `deltaRevenue` / `deltaProfit` on the server — they do not need
separate client-side calculation. The server always populates the delta fields, even if yesterday = 0.

### Job Cancellation Mid-Day

If a job transitions from COMPLETED back to CANCELLED (manager revokes a previously completed job),
the revenue figures drop on the next 30-second poll. There is no optimistic update for cancellations.

### Demo Reset

After `POST /demo/reset`, all today's jobs return to SCHEDULED status.
The next `/revenue` poll will show `summary.jobsBilled = 0` and all zeroes.
Historical trend data (7 prior days) is unaffected by reset.

### All Jobs Cancelled Today

If today has jobs but all are CANCELLED (no COMPLETED jobs), the screen behaves identically
to the zero-completed-jobs edge case — all values are `€0` and deltas show `—`.

### Timezone

All dates and times are in `Europe/Rome` (CET/CEST). The API returns dates as ISO-8601 date-only strings
(no time component) for trend data. The "today" boundary is midnight Europe/Rome.
The demo seed resets at midnight Europe/Rome via a scheduled job or Fly.io cron.

### Mobile Layout

On screens < 768 px:
- Summary cards: 2×2 grid
- Chart: full width, 220 px tall, X-axis labels reduced to day initials (`M`, `T`, `W`...)
- Table: horizontally scrollable container; minimum column widths maintain readability
- Period selector: full-width pill group above chart
