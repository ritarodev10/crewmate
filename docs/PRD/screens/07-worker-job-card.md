# Worker Job Card — /worker/jobs/:id

## Overview

The worker job card is the operational heart of the CrewMate demo. It is the only screen where the field worker
takes action on a job — starting it, advancing progress in discrete 25-point steps, and marking it complete.
Every tap the worker makes here fires a WebSocket event that propagates in real time to the manager's dashboard:
map pins change color, progress rings fill, kanban cards slide columns, and KPI counters tick upward.

Route: `/worker/jobs/:id`  
Viewport: mobile-first, `max-width: 430px`. The layout is a single scrollable column with a sticky footer
housing the primary action button.  
F-NNN references: F-040 (Today view), F-041 (One-tap transitions), F-030 (WebSocket gateway),
F-031 (Dispatch board UI), F-033 (Optimistic UI).

---

## The WebSocket Demo Loop

This screen is the producer side of the live-update story. The manager dashboard is the consumer side.
Here is the full causal chain:

```
Worker taps a step on this screen
  │
  ├─ Optimistic UI update (step highlights immediately, no wait)
  │
  └─ PATCH /jobs/:id/progress { progressPct: N }
       │
       └─ API validates + persists progressPct
            │
            └─ Server emits  job.progress.updated  to room operator:{operatorId}
                 │
                 ├─ Manager dashboard map: progress ring on orange pin fills to N%
                 ├─ Job detail drawer (if open): progress ring live-updates
                 └─ Activity feed: prepends "Luca Ferrari — 75% — Porta Romana Tech Hub"

Worker taps "Start Job"
  │
  └─ PATCH /jobs/:id/status { status: "IN_PROGRESS" }
       │
       └─ Server emits  job.status.changed  { status: "IN_PROGRESS", progressPct: 0 }
            │
            ├─ Manager map: blue pin → orange pin (with empty progress ring)
            ├─ Kanban: card moves SCHEDULED → IN_PROGRESS column
            ├─ KPI card "Active Workers" increments by 1
            └─ Activity feed: prepends status change row

Worker taps "Complete Job" (at progressPct = 100)
  │
  └─ PATCH /jobs/:id/status { status: "COMPLETED" }
       │
       └─ Server emits  job.status.changed  { status: "COMPLETED", progressPct: 100 }
            │
            ├─ Manager map: orange pin → green pin (progress ring disappears)
            ├─ Kanban: card moves IN_PROGRESS → COMPLETED column
            ├─ KPI cards: Active Workers −1, Revenue +X, Profit +Y
            └─ Activity feed: prepends completion row
```

To demonstrate this to a hiring manager or client: open the manager dashboard in one browser tab and
`/worker/jobs/J-011` (Davide, currently at 25%) in a second tab sized to mobile width. Tap the 50% step in
the second tab. Watch the map pin ring update in the first tab within ~200 ms.

---

## Roles With Access

| Role | Access | Notes |
|---|---|---|
| WORKER | Full access to own assigned jobs | Cannot open jobs assigned to other workers |
| TEAM_LEAD | Full access to own assigned jobs | Sees same screen as WORKER for their personal jobs |
| MANAGER | No access to /worker routes | Uses job detail drawer instead |
| SUPER_ADMIN | No access to /worker routes | Uses demo switcher to impersonate a worker |

RBAC enforcement: the API guard on `GET /jobs/:id` returns `403` if the authenticated worker is not the
job's `assigneeId`. The UI additionally navigates back to `/worker` if a 403 is received.

---

## Layout Diagrams (ASCII — mobile 430px)

### SCHEDULED View

```
┌──────────────────────────────────────────┐  ← max-w-[430px], bg-canvas
│  ← Back                      [SCHEDULED] │  ← sticky topbar, border-b
├──────────────────────────────────────────┤
│                                          │
│  HVAC Repair                             │  ← job type label, text-xl font-semibold
│  Fondazione Catella                      │  ← customer name, text-muted
│  Via Sebenico 21, Isola                  │  ← address, text-sm text-muted
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Scheduled   14:00 today           │  │  ← info row, clock icon + time
│  │  Est. duration   2.5 h             │  │
│  │  Your rate       €28 / hr          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ── Site Photos (Before) ─────────────── │  ← section label
│  ┌──────────────┐ ┌──────────────┐       │
│  │  [photo 1]   │ │  [photo 2]   │       │  ← 2 thumbnails, 160×120 each
│  └──────────────┘ └──────────────┘       │
│                                          │
│  ── Your Earnings ──────────────────── ── │
│  ┌────────────────────────────────────┐  │
│  │  This job                          │  │
│  │  €70.00                            │  │  ← large, text-2xl text-success
│  │  2.5 h × €28 / hr                  │  │  ← formula caption, text-xs text-muted
│  └────────────────────────────────────┘  │
│                                          │
│                                          │  ← scroll space
│                                          │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │  ← sticky footer
│  │          Start Job                 │  │  ← bg-success, text-white, h-14, rounded
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### IN_PROGRESS View

```
┌──────────────────────────────────────────┐
│  ← Back                    [IN PROGRESS] │  ← amber status badge
├──────────────────────────────────────────┤
│                                          │
│  HVAC Repair                             │
│  Fondazione Catella                      │
│  Via Sebenico 21, Isola                  │
│  Started 14:03                           │  ← startedAt, text-xs text-muted
│                                          │
│  ── Site Photos (Before) ─────────────── │
│  ┌──────────────┐ ┌──────────────┐       │
│  │  [photo 1]   │ │  [photo 2]   │       │
│  └──────────────┘ └──────────────┘       │
│                                          │
│  ── Progress ──────────────────────────  │
│                                          │
│         ╔════════════════╗               │
│         ║                ║               │
│         ║      50%       ║               │  ← large SVG ring, 140×140
│         ║                ║               │  ← ring fill = amber at progressPct
│         ╚════════════════╝               │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │  ← 4-step stepper
│  │  25% │ │  50% │ │  75% │ │ 100% │   │
│  │ done │ │  ←   │ │      │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│    grey    amber    bone     bone        │
│   (past)  (current) (next)  (next)       │
│                                          │
│  ── Your Earnings So Far ─────────────── │
│  ┌────────────────────────────────────┐  │
│  │  €35.00  of  €70.00               │  │  ← proportional, text-lg
│  │  ████████████░░░░░░░░░░░░          │  │  ← thin progress bar
│  │  50% complete (2.5 h estimated)    │  │  ← caption, text-xs text-muted
│  └────────────────────────────────────┘  │
│                                          │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │  ← sticky footer
│  │        Complete Job ✓              │  │  ← DISABLED state (grey), enabled only at 100%
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### COMPLETED View

```
┌──────────────────────────────────────────┐
│  ← Back                     [COMPLETED]  │  ← green status badge
├──────────────────────────────────────────┤
│                                          │
│      ✓ €70.00 earned                     │  ← hero earnings, text-3xl text-success, centered
│                                          │
│  HVAC Repair                             │
│  Fondazione Catella                      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Started     14:03                 │  │
│  │  Completed   16:34                 │  │
│  │  Duration    2h 31m                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ── Site Photos (Before) ─────────────── │
│  ┌──────────────┐ ┌──────────────┐       │
│  │  [photo 1]   │ │  [photo 2]   │       │
│  └──────────────┘ └──────────────┘       │
│                                          │
│  ── Work Completed (After) ───────────── │
│  ┌──────────────┐ ┌──────────────┐       │
│  │  [photo 3]   │ │  [photo 4]   │       │  ← workerPhotos — only visible here
│  └──────────────┘ └──────────────┘       │
│                                          │
│  ── Customer Feedback ─────────────────  │
│  ★ ★ ★ ★ ★  5 / 5                       │  ← star rating
│  "Excellent team, arrived early and      │  ← customer testimony
│   left everything spotless."             │  ← italic, text-muted
│                                          │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │              Done                  │  │  ← navigates back to /worker
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Job Info Section

Present on every status state (top of scroll area, below topbar).

| Field | Source | Display |
|---|---|---|
| Job type label | `job.jobType.label` | `text-xl font-semibold`, e.g. "HVAC Repair" |
| Customer name | `job.customer.name` | `text-base text-muted`, e.g. "Fondazione Catella" |
| Customer address | `job.customer.address` | `text-sm text-muted` |
| Scheduled time | `job.scheduledFor` | Formatted as "14:00 today" or "Tomorrow 09:00" |
| Started time | `job.startedAt` | Only shown once IN_PROGRESS |
| Status badge | `job.status` | Pill component — blue/amber/green/grey per status |

The topbar Back button navigates to `/worker`. It does not prompt — progress is already persisted to the server
after each step tap.

---

## Status-Based Views

### SCHEDULED View

Shown when `job.status === "SCHEDULED"`.

**Content rendered:**
- Job info block (type, customer, address, scheduled time)
- Site photos strip labeled "Site Photos — Before" (2 thumbnails from `job.customerPhotos`)
- Earnings preview card showing `estimatedHours × worker.hourlyRate` with the formula caption below the number
- Single primary button: "Start Job" (full-width, `bg-success`, `text-white`)

**"Start Job" behavior:**
1. Button shows loading spinner (optimistic: button disabled, text becomes "Starting…")
2. `PATCH /jobs/:id/status` with body `{ status: "IN_PROGRESS" }`
3. On 200 response: navigate to the IN_PROGRESS view for the same job (route stays `/worker/jobs/:id`,
   React state re-renders based on updated `job.status`)
4. On error: toast "Could not start job — try again", button returns to normal state

**What is NOT shown in SCHEDULED:**
- Progress stepper (not relevant before work begins)
- Worker photos (not available pre-completion)
- Customer rating / testimony (only on COMPLETED)
- "Complete Job" button

---

### IN_PROGRESS View

Shown when `job.status === "IN_PROGRESS"`. This is the centrepiece of the demo.

---

#### Progress Stepper Component

The stepper is a row of four tappable segments rendered at fixed positions across the full width of the
content area. It is the primary interactive element. Every interaction here drives the live updates
visible on the manager's dashboard.

**Visual anatomy:**

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │   25%    │  │   50%    │  │   75%    │  │  100%    │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

Each segment is a pressable button (`<button>` or `<motion.button>`). Width is equal (each ~25% of
container minus gaps). Height is `h-12` (48px) for comfortable thumb tap targets on mobile.

**State per segment — visual mapping:**

| Segment state | Background | Text color | Border | Icon |
|---|---|---|---|---|
| `past` (pct < currentPct) | `bg-success-fade` | `text-success` | `border-success` | checkmark ✓ |
| `current` (pct === currentPct) | `bg-accent` (amber) | `text-white` | none | none |
| `next` (pct > currentPct) | `bg-surface` | `text-muted` | `border-line` | none |
| `loading` (after tap, awaiting API) | `bg-accent` (amber, dimmer) | `text-white` | none | spinner |

**Forward-only rule:**

A segment is tappable only if `segmentPct > currentProgressPct`. Past segments are visually distinct
(success-fade green) but emit no click event — `pointer-events-none` applied. Current segment has
`pointer-events-none` (already there, no re-tap needed). Only the immediately next step and all steps
ahead are interactive.

Example: if `progressPct = 50`:
- 25% → `past`, no tap
- 50% → `current`, no tap
- 75% → `next`, tappable
- 100% → `next`, tappable (can skip directly to 100%)

Skipping steps is allowed. Tapping 100% when at 25% sends `{ progressPct: 100 }` directly. The API
accepts any forward value; it does not enforce increment-by-one. The "Complete Job" button activates
as soon as `progressPct === 100` regardless of whether intermediate steps were tapped.

**Tap interaction — detailed sequence:**

```
1. Worker taps "75%" segment
2. Immediate visual feedback:
   - Segment enters `loading` state (amber bg, spinner icon)
   - Scale animation: segment briefly scales to 0.93 then back to 1.0
     (CSS: transition transform 80ms ease-out)
   - The progress ring begins animating toward 75% (optimistic)
3. PATCH /jobs/:id/progress { progressPct: 75 } fires
4a. On 200 OK:
   - 50% segment transitions to `past` state (green checkmark)
   - 75% segment transitions to `current` state (solid amber, no spinner)
   - Ring completes fill to 75%
   - Earnings display updates: "€52.50 of €70.00"
   - Earnings progress bar updates width
4b. On network error or non-200:
   - Segment returns to `next` state
   - Ring returns to previous position
   - Toast: "Progress update failed — check connection"
   - Optimistic ring animation reverses
```

**No double-tap protection:**

Once a segment enters `loading` state, all four segments become `pointer-events-none` until the API
response resolves (success or failure). This prevents race conditions where two progress events fire
in rapid succession.

**Haptic feedback note:**

On supported devices, `navigator.vibrate(30)` fires on tap (30 ms pulse). This is additive — if the
browser doesn't support the Vibration API the tap still works. The vibration call is in a try/catch.

---

#### Progress Ring / Visual

A large circular SVG ring sits between the job info block and the stepper. It provides at-a-glance
visual confirmation of progress state and makes the screen feel dynamic.

**Specification:**

- SVG circle, `viewBox="0 0 140 140"`, rendered at `w-36 h-36` (144×144 px), centered in the column
- Stroke width: 10px
- Background track: `stroke="var(--color-line)"` (full circle, always visible)
- Fill arc: `stroke="var(--color-amber)"`, `strokeDasharray` computed from circumference
- Arc animates via CSS transition on `strokeDashoffset`: `transition: stroke-dashoffset 400ms ease-out`
- Center text: current percentage as a number, `text-2xl font-semibold text-ink`, e.g. "50%"
- At `progressPct = 100`: fill arc turns `stroke="var(--color-success)"`, center text shows "100%"

The ring is purely presentational. It reads `progressPct` from local component state which is
optimistically updated on tap (before the API call resolves).

---

#### Earnings During Execution

A card below the stepper showing how much the worker has notionally earned so far.

**Calculation:**

```
totalEarning    = job.estimatedHours × worker.hourlyRate
earnedSoFar     = (progressPct / 100) × totalEarning
```

Example (Sofia, HVAC Maintenance, 2h, €28/hr, at 50%):
```
totalEarning = 2.0 × 28 = €56.00
earnedSoFar  = 0.50 × €56.00 = €28.00
```

**Display:**

```
┌────────────────────────────────────────┐
│  €28.00  of  €56.00                    │
│  ████████████░░░░░░░░░░░               │  ← thin bar, amber fill, bone track
│  50% complete · 2.0 h estimated        │
└────────────────────────────────────────┘
```

- `€28.00` is `text-xl font-semibold text-ink`
- `of €56.00` is `text-xl text-muted`
- The bar is `h-2`, `rounded-full`, animated width transition matching the ring
- Caption is `text-xs text-muted`

This number updates optimistically on each step tap in sync with the progress ring. It is a computed
display only — no separate API call. The "real" earn confirmation is shown in the COMPLETED view.

---

#### Complete Button State

The "Complete Job ✓" button lives in the sticky footer. Its state is binary: disabled or enabled.

**Disabled state** (`progressPct < 100`):

```
bg-surface  border border-line  text-muted  cursor-not-allowed
text: "Complete Job ✓"
```

No visual animation, no tooltip. The button is visually inert. The worker cannot trigger a completion
event by any means other than reaching 100% via the stepper — the API also enforces this (returns 422
if `PATCH /status { COMPLETED }` is sent with `progressPct < 100`).

**Enabled state** (`progressPct === 100`):

```
bg-success  text-white  shadow-md  cursor-pointer
text: "Complete Job ✓"
Entrance animation: scale from 0.97 → 1.0, duration 200ms ease-out
```

The transition from disabled to enabled is animated: background color cross-fades over 200ms from
`--color-line` to `--color-success`, text color shifts from `--color-muted` to white.

**On tap (enabled):**

1. Button enters loading state: spinner replaces checkmark, `"Completing…"`
2. `PATCH /jobs/:id/status { status: "COMPLETED" }` fires
3. On 200: the entire screen transitions to COMPLETED view (job data re-fetched or received via WS event)
4. On error: button returns to enabled state, toast "Could not complete job — try again"

---

### COMPLETED View

Shown when `job.status === "COMPLETED"`.

---

#### Success State

The hero element of the COMPLETED view is the earnings confirmation displayed prominently at the top
of the scroll area, above all other content.

```
    ✓ €70.00 earned
```

- `text-3xl font-bold text-success`, centered
- The checkmark glyph (`✓`) precedes the amount in the same text node
- Rendered inside a `bg-success-fade` rounded card, `py-6 px-4`, centered
- On first render (transition from IN_PROGRESS), this card animates in:
  scale 0.8 → 1.0, opacity 0 → 1, duration 350ms ease-out

Below the hero card: the job summary block (started at, completed at, duration).

**Duration calculation:**

```
duration = completedAt − startedAt, formatted as "Xh Ym"
Example: startedAt 14:03, completedAt 16:34 → "2h 31m"
```

If duration is under 1 hour: display as "Xm" only (e.g., "47m").

---

#### Worker Photos Reveal

The "Work Completed (After)" section appears for the first time in this view.

- Section header: "Work Completed (After)", same style as "Site Photos (Before)"
- Two thumbnails from `job.workerPhotos` (same layout as customer photos)
- Photo URLs are `https://picsum.photos/seed/{typeName}-after/400/300` (deterministic per job type)
- Photos are technically available in the API response for any status — the frontend controls
  visibility by rendering this section only when `job.status === "COMPLETED"`
- No upload interface. Thumbnails are read-only, can be tapped to open a full-screen lightbox
  (same behavior as customer photos)

Both photo strips (Before and After) remain visible in COMPLETED view so the visual before/after
comparison is immediately apparent.

---

#### Rating & Testimony Display

Pre-seeded customer ratings and testimonies are revealed in the COMPLETED view.

**Source:** `job.customerRating` (integer 1–5) and `job.customerTestimony` (string).

**Layout:**

```
── Customer Feedback ───────────────────

★ ★ ★ ★ ★  5 / 5

"Excellent team, arrived early and
 left everything spotless."
              — Alessia Bucci, Fondazione Catella
```

- Stars: five `★` glyphs, filled amber (`text-accent`) for `≤ rating`, bone for `> rating`
- Score: `5 / 5` in `text-sm font-semibold text-ink` to the right of the stars
- Testimony text: `text-sm text-muted italic`, max 3 lines before truncation (truncation unlikely
  given seed data lengths)
- Attribution: `text-xs text-muted`, right-aligned: `— {customer.contactName}, {customer.name}`

This section only renders if `job.customerRating != null`. All 15 seeded COMPLETED jobs have ratings.
Jobs that are freshly completed in the current demo session (completed by the worker in the tab) show
the rating immediately — it is a pre-seeded value attached to the job record, not collected post-completion.

---

### CANCELLED View

Shown when `job.status === "CANCELLED"`.

**Layout:**

```
┌──────────────────────────────────────────┐
│  ← Back                     [CANCELLED]  │  ← grey/danger status badge
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ✕  This job has been revoked      │  │  ← bg-danger-fade, text-danger, rounded
│  └────────────────────────────────────┘  │
│                                          │
│  HVAC Repair                             │
│  Brera Pinacoteca                        │
│  Via Brera 28                            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Reason   Customer cancelled       │  │  ← human-readable from reason code map
│  │  Revoked by  Marco Bianchi         │  │  ← cancelledBy user name
│  │  At       10:23                    │  │  ← cancelledAt formatted time
│  └────────────────────────────────────┘  │
│                                          │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │              Back                  │  │  ← navigates to /worker
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Cancel reason code → human-readable label mapping:**

| Code | Display label |
|---|---|
| `CUSTOMER_CANCELLED` | Customer cancelled |
| `EQUIPMENT_UNAVAILABLE` | Equipment unavailable |
| `WORKER_NO_SHOW` | Worker did not show up |
| `ACCESS_DENIED` | Could not access property |
| `DUPLICATE_JOB` | Duplicate — entered in error |
| `EMERGENCY_RECALL` | Emergency recall |

There is no progress stepper, no earnings figure, and no photos in this view. The job info block
(type, customer, address) remains visible for reference. The worker cannot take any action on a
cancelled job from this screen.

---

## Actions & API Calls

| User Action | HTTP Call | Request Body | WebSocket Event Emitted | Manager Dashboard Effect |
|---|---|---|---|---|
| Tap "Start Job" | `PATCH /jobs/:id/status` | `{ status: "IN_PROGRESS" }` | `job.status.changed` | Blue pin → orange pin; card moves to IN_PROGRESS column; Active Workers +1 |
| Tap "25%" | `PATCH /jobs/:id/progress` | `{ progressPct: 25 }` | `job.progress.updated` | Progress ring fills to 25%; activity feed row prepended |
| Tap "50%" | `PATCH /jobs/:id/progress` | `{ progressPct: 50 }` | `job.progress.updated` | Progress ring fills to 50% |
| Tap "75%" | `PATCH /jobs/:id/progress` | `{ progressPct: 75 }` | `job.progress.updated` | Progress ring fills to 75% |
| Tap "100%" | `PATCH /jobs/:id/progress` | `{ progressPct: 100 }` | `job.progress.updated` | Progress ring fills to 100%; Complete button activates on worker screen |
| Tap "Complete Job" | `PATCH /jobs/:id/status` | `{ status: "COMPLETED" }` | `job.status.changed` | Orange pin → green pin; card moves to COMPLETED; Revenue/Profit KPIs update; Active Workers −1 |
| Load screen | `GET /jobs/:id` | — | — | — |

All `PATCH` requests carry the worker's JWT in the `Authorization: Bearer {token}` header.
The API validates that the authenticated worker is the job's assignee before applying any mutation.

---

## Notes / Edge Cases

**Slow or absent network:**

When the API call from a step tap does not resolve within 2 000 ms, the loading spinner on the segment
persists. No automatic retry. If the call eventually succeeds (late response), the UI applies the
update normally. If the call errors, the optimistic ring animation reverses and a toast appears.
The worker can re-tap the same segment to try again — the segment returns to `next` state on error.

**Job already completed on another device:**

If the worker had the job open on two devices and completed it from device A, device B will receive the
`job.status.changed` WS event and re-render to the COMPLETED view automatically (the screen subscribes
to the operator WebSocket room and reacts to events matching `jobId`). The "Complete Job" button on
device B will never trigger a second COMPLETED transition — the API returns 422 for
`PATCH /status { COMPLETED }` when the job is already COMPLETED.

**Job revoked while worker is on screen:**

If the manager revokes the job while the worker has it open in IN_PROGRESS state, the worker's screen
receives a `job.status.changed` event with `status: "CANCELLED"` and re-renders to the CANCELLED view.
The progress stepper disappears and the revocation details render immediately. No action is needed
from the worker.

**Worker attempts to navigate directly to another worker's job:**

`GET /jobs/:id` returns `403 Forbidden` if the authenticated user is not the assignee. The screen
catches this response and redirects to `/worker` with a toast "Job not found or access denied".

**Skipping progress steps:**

Tapping 100% directly from 0% (or from any intermediate step) is valid. The API accepts any value in
`{ 0, 25, 50, 75, 100 }` as long as it is greater than the current `progressPct`. If the incoming
value is ≤ current value, the API returns 422 with `{ message: "progressPct must be greater than current value" }`.
The UI prevents this at the interaction level (past/current segments are non-tappable) but the API
guard exists as a secondary enforcement layer.

**Job in SCHEDULED state with startedAt already set (edge case):**

This should not occur in normal operation but if the API returns a job with `status: SCHEDULED` and
a non-null `startedAt` (data inconsistency), the screen renders the SCHEDULED view (status is
authoritative). The `startedAt` is not displayed in the SCHEDULED view, so the inconsistency is
invisible to the worker.

**Zero hourlyRate:**

If `worker.hourlyRate` is 0 (not expected from seed data but guarded against), the earnings display
shows "€0.00" without crashing. The formula renders as "0h × €0 / hr" — visually odd but not broken.
The API response always includes `worker.hourlyRate` in the job detail endpoint.

**Demo reset during active job:**

If `POST /demo/reset` is called while the worker has a job open in IN_PROGRESS, the next API call
from this screen (e.g., a progress step tap) will receive a 404 or a job response with reset state.
The screen handles the 404 by redirecting to `/worker`. On receiving a job with reset `progressPct`,
the ring and stepper re-render to the seeded state.

**Earnings rounding:**

All monetary values are displayed rounded to two decimal places using `toFixed(2)`. Internal
calculations use JavaScript `Number` floating-point — sufficient precision for the demo amounts in
play (max ~€414 for a Generator Repair at the highest worker rate).
