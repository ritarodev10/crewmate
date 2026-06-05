# Workforce Screen — /workforce

Two tabs at the top of the content area:
  [Workers]  [Teams]
Default tab: Workers

---

## Tab 1: Workers

### Overview

The Workers tab gives Operations Managers and Super Admins a live view of all field workers across the CrewMate Demo SpA operator. At a glance it shows real-time status (ON_JOB / IDLE / OFF_DUTY), jobs count and composition for today, per-worker earnings with projected totals, and lifetime ratings. Clicking any worker card opens a right-side drawer with a full breakdown of today's jobs and a four-tab earnings history.

Team Leads see a restricted version: only the "My Team" tab (Team Alfa), and only their team members' cards are visible. They can still open each team member's drawer, and their own drawer includes an extra "Team Summary" section.

This tab is **read-only**. There are no add, edit, or delete worker actions.

### Workers tab — Roles With Access

| Role | Tab(s) Visible | Cards Shown | Drawer Access |
|---|---|---|---|
| SUPER_ADMIN | All Workers, Team Alfa | All 9 workers | Full drawer for any worker |
| MANAGER | All Workers, Team Alfa | All 9 workers | Full drawer for any worker |
| TEAM_LEAD | My Team (only) | Team Alfa members only (w-01 – w-04) | Full drawer; own drawer has extra "Team Summary" section |
| WORKER | No access (route hidden in nav) | — | — |

### Layout Diagram (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Sidebar nav (collapsed on md, visible on lg)                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Page header]                                                               │
│  Workforce                                                                   │
│  Live worker status across all crews                                         │
│                                              [Workers]  [Teams]  ← tabs     │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Summary Cards row — 4 cards]                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ ┌──────────────────┐  │
│  │ Total       │ │ On Job Now  │ │ Completed Today  │ │ Avg Earnings     │  │
│  │ Workers     │ │             │ │                  │ │ Today            │  │
│  │    9        │ │   6  🟢     │ │     15   ✓       │ │   € 148          │  │
│  └─────────────┘ └─────────────┘ └─────────────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│  [All Workers ▼] [Team Alfa]  ← sub-tabs within Workers tab                 │
│  [Worker Cards Grid — 3 columns on lg, 2 on md, 1 on sm]                    │
│                                                                              │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐       │
│  │ [avatar] Luca      │ │ [avatar] Sofia      │ │ [avatar] Davide    │       │
│  │ Ferrari            │ │ Conti               │ │ Russo              │       │
│  │ [TEAM_LEAD]        │ │ [TEAM_MEMBER]       │ │ [TEAM_MEMBER]      │       │
│  │ Team Alfa          │ │ Team Alfa           │ │ Team Alfa          │       │
│  │ ● ON JOB           │ │ ● ON JOB            │ │ ● ON JOB           │       │
│  │ 2 done / 2 active  │ │ 3 done / 2 active   │ │ 3 done / 1 active  │       │
│  │ €204 + €267 proj   │ │ €150 + €112 proj    │ │ €150 + €62 proj    │       │
│  │ 4.8 ⭐ +39 333...  │ │ 4.6 ⭐ +39 333...   │ │ 4.5 ⭐ +39 333...  │       │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘       │
│                                                                              │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐       │
│  │ [avatar] Elena     │ │ [avatar] Antonio    │ │ [avatar] Giulia    │       │
│  │ Moretti            │ │ Ricci               │ │ Romano             │       │
│  │ [TEAM_MEMBER]      │ │ [SOLO]              │ │ [SOLO]             │       │
│  │ Team Alfa          │ │ Solo                │ │ Solo               │       │
│  │ ○ IDLE             │ │ ● ON JOB            │ │ ● ON JOB           │       │
│  │ 2 done / 1 active  │ │ 2 done / 1 active   │ │ 2 done / 1 active  │       │
│  │ €112 + €168 proj   │ │ €240 + €135 proj    │ │ €168 + €70 proj    │       │
│  │ 4.7 ⭐ +39 333...  │ │ 4.8 ⭐ +39 333...   │ │ 4.7 ⭐ +39 333...  │       │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘       │
│                                                                              │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐       │
│  │ [avatar] Matteo    │ │ [avatar] Chiara     │ │ [avatar] Roberto   │       │
│  │ Gallo              │ │ Marino              │ │ Costa              │       │
│  │ [SOLO]             │ │ [SOLO]              │ │ [SOLO]             │       │
│  │ Solo               │ │ Solo                │ │ Solo               │       │
│  │ ○ IDLE             │ │ ● ON JOB            │ │ ○ IDLE             │       │
│  │ 2 done / 0 active  │ │ 1 done / 1 active   │ │ 1 done / 0 active  │       │
│  │ €104 + €0          │ │ €145 + €326 proj    │ │ €100 + €0          │       │
│  │ 4.4 ⭐ +39 333...  │ │ 4.8 ⭐ +39 333...   │ │ 4.4 ⭐ +39 333...  │       │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Summary Cards

Four KPI cards span the top of the screen in a single horizontal row (wraps to 2×2 on smaller viewports).

#### Card 1 — Total Workers

```
┌────────────────────────────────┐
│  👥  Total Workers             │
│                                │
│         9                      │
│                                │
│  Active field staff            │
└────────────────────────────────┘
```

- Static count — total worker records for the operator.
- Value: **9** (from seed: w-01 through w-09).
- Not live-updating; changes only on worker add/remove (out of scope for demo).

#### Card 2 — On Job Now

```
┌────────────────────────────────┐
│  🟢  On Job Now                │
│                                │
│         6                      │
│                                │
│  Currently active              │
└────────────────────────────────┘
```

- Count of workers whose `status = ON_JOB` at this moment.
- Updates live via WebSocket event `worker.status.changed`.
- Seed state: ON_JOB workers are w-01, w-02, w-03, w-05, w-06, w-08 → **6**.
- The number animates (count-up/count-down) on WS update; green accent colour.

#### Card 3 — Completed Today

```
┌────────────────────────────────┐
│  ✓   Completed Today           │
│                                │
│        15                      │
│                                │
│  Jobs finished today           │
└────────────────────────────────┘
```

- Count of jobs with `status = COMPLETED` whose `completedAt` falls within today (Europe/Rome).
- Updates live via WebSocket event `job.status.changed` (specifically transitions to COMPLETED).
- Seed state: 15 completed jobs (J-001 through J-008 for team, J-021 through J-027 for solo).
- Accumulates through the day; resets at midnight (nightly job reset).

#### Card 4 — Avg Earnings Today

```
┌────────────────────────────────┐
│  €   Avg Earnings Today        │
│                                │
│       € 148                    │
│                                │
│  Per worker (earned only)      │
└────────────────────────────────┘
```

- Average of each worker's `earned` (completed-job) earnings today — **not** projected.
- Formula: `sum(worker.todayEarned) / 9`
- Updates live as jobs complete and earnings accumulate.
- Label clarifies "earned only" so it does not mislead with projected figures.
- Displayed as `€ NNN` (no decimals on the card, truncated to nearest euro).

---

### Worker Cards Grid

Cards are arranged in a CSS Grid: 3 columns ≥1280px, 2 columns ≥768px, 1 column below 768px. All cards have equal height per row via `align-items: stretch`.

#### Card Layout

```
┌──────────────────────────────────────────────┐
│  ┌──────┐  Luca Ferrari          [TEAM_LEAD] │  ← name + role badge
│  │ AVT  │  Team Alfa                         │  ← team chip
│  └──────┘  ● ON JOB                          │  ← status badge (dot + label)
│                                              │
│  Jobs today:  2 completed  /  2 in-progress  │  ← job counts
│               1 scheduled                    │
│                                              │
│  Earnings:  €204.00                          │  ← earned (completed)
│             + €267.00 projected              │  ← projected (italic, muted)
│                                              │
│  ⭐ 4.8   +39 333 100 0001                   │  ← rating + phone
└──────────────────────────────────────────────┘
```

**Element breakdown:**

| Element | Detail |
|---|---|
| Avatar | 48×48 px circle. Source: `worker.userId` → `user.avatarUrl`. Fallback: initials on branded background. |
| Name | Full name in medium weight. Truncated to one line with ellipsis if needed. |
| Role badge | Pill badge. TEAM_LEAD = amber/yellow tones; SOLO = blue tones; TEAM_MEMBER = muted/grey tones. |
| Team chip | Small chip below the role badge showing "Team Alfa" (brand-tinted) or "Solo" (muted). Always visible. |
| Status badge | Coloured dot + label. Defined in "Status Indicators" below. |
| Jobs today | Three counts on two lines: `X completed / Y in-progress` then `Z scheduled`. Cancelled jobs are not shown on the card (irrelevant to daily performance view). |
| Earnings — earned | `€NNN.00` in normal weight. Represents income from completed jobs only. |
| Earnings — projected | `+ €NNN.00 projected` in italic, muted colour. Represents income from in-progress jobs if completed at current estimated hours. See Earnings Display section. |
| Rating | Star glyph + one-decimal average from lifetime completed jobs (e.g. `4.8`). |
| Phone | Raw phone number string from seed (e.g. `+39 333 100 0001`). Cosmetic — no tel: link required for MVP. |

Entire card is clickable (cursor: pointer, hover: subtle ring/shadow elevation). Click opens the Worker Detail Drawer from the right side.

#### Status Indicators

| Status | Dot Colour | Label | When |
|---|---|---|---|
| ON_JOB | Green (emerald-500) filled circle | ON JOB | Worker has at least one IN_PROGRESS job |
| IDLE | Grey (zinc-400) filled circle | IDLE | No active jobs; available |
| OFF_DUTY | Dark grey (zinc-600) ring (hollow) | OFF DUTY | Worker not available today |

Status transitions are pushed from the API via `worker.status.changed` WebSocket event. The dot and label update in place with a brief fade transition (200ms).

#### Earnings Display

**Earned (completed)** is income locked in: `Σ(job.estimatedHours × worker.hourlyRate)` across all COMPLETED jobs today.

**Projected (in-progress)** is best-case income if current IN_PROGRESS jobs complete at their estimated hours: `Σ(job.estimatedHours × worker.hourlyRate)` across all IN_PROGRESS jobs today. This number is uncertain.

Visual treatment for projected:

- Rendered on a separate line below the earned amount.
- Text is italic.
- Text colour uses `text-muted-foreground` (Tailwind 4 token: `--color-muted-foreground`), approximately 50% the contrast of the earned amount.
- Prefix: `+ €` to distinguish as additive.
- Suffix: ` projected` in the same muted style.
- If no in-progress jobs exist (worker is IDLE or all jobs completed/scheduled), this line is hidden entirely — do not show `+ €0.00 projected`.

---

### Worker Detail Drawer

Slides in from the right edge of the viewport when a worker card is clicked. Overlay backdrop dims the main grid. Drawer is 480px wide on desktop, full-width on mobile (below 640px). Closes via an ✕ button in the top-right corner or by clicking the backdrop.

Data is fetched on open: `GET /workers/:id` + `GET /workers/:id/earnings`.

#### Drawer Header

```
┌──────────────────────────────────────────────────┐
│                                              [✕]  │
│  ┌────────┐  Luca Ferrari                        │
│  │ AVATAR │  TEAM_LEAD      ● ON JOB             │
│  │  80×80 │  Team Alfa                           │
│  └────────┘  +39 333 100 0001                    │
│              Member since: March 2025            │
└──────────────────────────────────────────────────┘
```

Fields:
- **Avatar**: 80×80 px circle, same source as card.
- **Name**: Large heading (text-xl / text-2xl).
- **Role badge**: Same pill as on card.
- **Team chip**: "Team Alfa" or "Solo", same as on card.
- **Status badge**: Dot + label, same colours as on card. Updates live via WS.
- **Phone**: Plain text, full number.
- **Member since**: Formatted as `Month YYYY` from `user.createdAt`. Example: "Member since March 2025".

---

#### Today's Earnings Card (inside drawer, below header)

Larger version of the earnings snippet from the main card.

```
┌──────────────────────────────────────────────────┐
│  Today's Earnings                                │
│                                                  │
│  €204.00 earned                                  │
│  + €267.00 projected     ← italic, muted         │
│                                                  │
│  Jobs done: 2 of 5                               │
└──────────────────────────────────────────────────┘
```

- "earned" label follows the amount in normal-weight muted text.
- "projected" line: italic, muted, same visual rule as on the card.
- "Jobs done: X of Y" — X = completed count; Y = total assigned today (excluding cancelled).
- Updates live via `job.status.changed` WS event while drawer is open.

---

#### Jobs Today (inside drawer)

A list below the earnings card showing all of this worker's jobs for today. Cancelled jobs are shown but visually dimmed.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Jobs Today                                                          │
├────────┬──────────────────┬──────────────────┬──────────┬───────────┤
│ Job ID │ Type             │ Customer         │ Status   │ Sched     │
├────────┼──────────────────┼──────────────────┼──────────┼───────────┤
│ J-001  │ AC Installation  │ UniCredit Tower  │ ✓ DONE   │ 07:00     │
│ J-005  │ Lighting Install │ Brera Pinacoteca │ ✓ DONE   │ 09:00     │
│ J-009  │ Electrical Panel │ Porta Romana     │ ⟳ 75%    │ 11:00     │
│ J-013  │ Lighting Install │ Palazzo Pirelli  │ ⟳ 75%    │ 13:00     │
│ J-017  │ Generator Repair │ Politecnico      │ 🕐 SCHED  │ 15:30     │
└────────┴──────────────────┴──────────────────┴──────────┴───────────┘
```

Status indicators in the list:

| Icon/text | Meaning |
|---|---|
| ✓ DONE | COMPLETED |
| ⟳ NN% | IN_PROGRESS with progressPct |
| 🕐 SCHED | SCHEDULED (not yet started) |
| ✕ CANCELLED | CANCELLED (row dimmed to 40% opacity) |

Rows are sorted by `scheduledFor` ascending. Clicking a job row is out of scope for this screen (no navigation to job detail from the workers drawer in MVP).

---

#### Earnings Tabs

Below the Jobs Today list, a tabbed section shows earnings history across four time windows.

```
┌──────────────────────────────────────────────────┐
│  [ Today ] [ This Week ] [ This Month ] [All Time]│
├──────────────────────────────────────────────────┤
│  (tab content)                                   │
└──────────────────────────────────────────────────┘
```

Tab content is loaded from `GET /workers/:id/earnings` which returns all four windows in one response.

**Today Tab**

Response shape: `earnings.today = { earned, projected, jobsDone, jobsTotal }`

- `earned`: sum of `worker.hourlyRate × job.estimatedHours` for all COMPLETED jobs today.
- `projected`: same formula for all IN_PROGRESS jobs today (best-case).
- `jobsDone / jobsTotal`: completed count over (completed + in-progress + scheduled). Cancelled excluded.
- "projected" text is italic and muted — same visual rule as on the main card.

**This Week Tab**

Response shape: `earnings.week = { total, vsLastWeek, chartData[] }`

- `total`: sum of all completed-job earnings Mon–Sun of the current ISO week.
- `vsLastWeek`: percentage delta vs the same worker's last-week total. Positive delta → green ▲; negative → red ▼.
- `chartData`: array of 7 objects `{ day: 'Mon'|'Tue'|..., amount: number }`. Zero-value days show as empty bars.
- Mini bar chart: 7 bars, fixed height ~80px, labelled with day abbreviation and amount below each bar.
- Seed data for Luca: This Week €1,280 (▲ 12.3% vs last week €1,140).

**This Month Tab**

Response shape: `earnings.month = { total, vsLastMonth, chartData[] }`

- `total`: sum of all completed-job earnings in the current calendar month.
- `vsLastMonth`: percentage delta vs the prior calendar month total.
- `chartData`: array of 4–5 objects `{ week: 'Wk 1'|..., amount: number }`.
- Seed data for Luca: This Month €4,820.

**All Time Tab**

Response shape: `earnings.lifetime = { total, jobCount, memberSince, avgRating }`

- `total`: lifetime sum across all COMPLETED jobs.
- `jobCount`: count of all COMPLETED jobs ever assigned to this worker.
- `memberSince`: formatted as `Month YYYY` from `user.createdAt`.
- `avgRating`: average of `job.customerRating` across all rated COMPLETED jobs, one decimal place.
- No chart on this tab — plain summary stats layout.

Seed values per worker (All Time tab):

| Worker | Total (€) | Jobs | Avg Rating |
|---|---|---|---|
| Luca Ferrari | 28,400 | 187 | 4.8 |
| Sofia Conti | 14,200 | 185 | 4.6 |
| Davide Russo | 13,800 | 181 | 4.5 |
| Elena Moretti | 12,600 | 179 | 4.7 |
| Antonio Ricci | 21,200 | 248 | 4.8 |
| Giulia Romano | 18,900 | 220 | 4.7 |
| Matteo Gallo | 17,400 | 201 | 4.4 |
| Chiara Marino | 20,100 | 232 | 4.8 |
| Roberto Costa | 15,200 | 178 | 4.4 |

---

#### Team Lead: Team Summary Section

Shown **only** in the drawer for worker w-01 (Luca Ferrari, TEAM_LEAD). Rendered below the Earnings Tabs.

Visible to: MANAGER, SUPER_ADMIN (when opening Luca's drawer), and TEAM_LEAD (Luca opening his own drawer from the worker app — out of scope here, but the section is documented for completeness).

```
┌──────────────────────────────────────────────────┐
│  Team Alfa — Summary                             │
│                                                  │
│  Total earnings today: €616.00                   │
│  (earned: €616.00 + projected: €441.00)          │
│                                                  │
│  Member Breakdown                                │
│  ┌────────────────┬──────────┬────────────────┐  │
│  │ Worker         │ Earned   │ Projected      │  │
│  ├────────────────┼──────────┼────────────────┤  │
│  │ Luca Ferrari   │ €204.00  │ + €267.00      │  │
│  │ Sofia Conti    │ €150.00  │ + €112.00      │  │
│  │ Davide Russo   │ €150.00  │ + €62.00       │  │
│  │ Elena Moretti  │ €112.00  │ + €0.00        │  │
│  ├────────────────┼──────────┼────────────────┤  │
│  │ Team Total     │ €616.00  │ + €441.00      │  │
│  └────────────────┴──────────┴────────────────┘  │
└──────────────────────────────────────────────────┘
```

- "Total earnings today" is the sum of all four Team Alfa members' earned + projected.
- Projected column uses the same italic/muted visual treatment.
- The table totals row uses medium font weight to stand out.
- This section is not shown on the drawers of SOLO workers or plain TEAM_MEMBERs.

---

### Workers Tab — Team View (Sub-tabs: All Workers | Team Alfa)

For MANAGER and SUPER_ADMIN, two sub-tabs appear at the top of the Workers tab content area:

```
                                    [All Workers] [Team Alfa]
```

#### All Workers Sub-tab (default)

Shows all 9 workers in the grid in no particular ordering other than team workers first, then solo workers. Ordering:

1. w-01 Luca Ferrari
2. w-02 Sofia Conti
3. w-03 Davide Russo
4. w-04 Elena Moretti
5. w-05 Antonio Ricci
6. w-06 Giulia Romano
7. w-07 Matteo Gallo
8. w-08 Chiara Marino
9. w-09 Roberto Costa

Summary cards reflect the whole operator (all 9).

#### Team Alfa Sub-tab

Filters the cards grid to show only Team Alfa members (w-01 through w-04). The tab also shows a team-level header banner above the cards.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Team Alfa                                          Team Lead: Luca Ferrari  │
│  4 members                                                                   │
│                                                                              │
│  Today: 10 jobs total  |  ●3 on-job  |  Team earned €616  |  15 completed  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Below the team banner, only Team Alfa's 4 worker cards are shown. Summary cards switch to Team Alfa-scoped figures when this sub-tab is active:

| Card | All Workers value | Team Alfa tab value |
|---|---|---|
| Total Workers | 9 | 4 |
| On Job Now | 6 | 3 (w-01, w-02, w-03) |
| Completed Today | 15 | 8 (J-001 through J-008) |
| Avg Earnings Today | avg of all 9 | avg of Alfa 4 members |

#### My Team Sub-tab (TEAM_LEAD role only)

When logged in as Luca Ferrari (TEAM_LEAD), the sub-tab bar shows only "My Team" — the "All Workers" option is hidden.

Behaviour is identical to the "Team Alfa" sub-tab in manager view, including the team banner. The Team Lead cannot see any solo worker cards.

---

### Workers Tab — WebSocket Subscriptions

The Workers tab subscribes to the operator's Socket.io room (`operator:op-001`) on mount and unsubscribes on unmount.

**Event: `worker.status.changed`**

```json
{
  "workerId": "w-05",
  "status": "ON_JOB"
}
```

On receipt:
1. Locate the worker card for `workerId` in the DOM.
2. Update the status dot colour and label text (fade transition 200ms).
3. Increment or decrement the "On Job Now" summary card counter.
4. If the worker's drawer is currently open, update the header status badge.

**Event: `job.status.changed`**

```json
{
  "jobId": "J-029",
  "status": "COMPLETED",
  "workerId": "w-05",
  "progressPct": 100
}
```

On receipt:
1. Locate the worker card for the relevant `workerId`.
2. Re-fetch or locally update: jobs today counts, today's earned amount, today's projected amount.
3. Update the "Completed Today" summary card counter.
4. Update the "Avg Earnings Today" summary card.
5. If the worker's drawer is open, update the "Today's Earnings Card", "Jobs Today" list row, and the "Today" earnings tab.
6. If Team Alfa tab is active and affected worker is a team member, update the team banner.

---

### Workers Tab — API Calls

**Fetch All Workers**

```
GET /workers
```

Response: array of worker objects, each with today's computed stats. Called on page mount.

**Fetch Worker Detail (for drawer)**

```
GET /workers/:id
```

Response: single worker object with today's jobs list. `teamSummary` is only present for workers with `kind = TEAM_LEAD`.

**Fetch Worker Earnings (for drawer tabs)**

```
GET /workers/:id/earnings
```

Response: `{ today, week, month, lifetime }`. Called once when the drawer opens.

---

### Workers Tab — RBAC Variations

**SUPER_ADMIN / MANAGER**
- All Workers sub-tab is the default active sub-tab.
- Team Alfa sub-tab is available.
- Summary cards show operator-wide figures.
- All 9 worker cards are visible.
- Any worker card can be clicked to open the drawer.
- Team Summary section appears only in Luca Ferrari's drawer.

**TEAM_LEAD (Luca Ferrari, w-01)**
- Only "My Team" sub-tab is shown — no "All Workers" option.
- Summary cards show Team Alfa-scoped figures (4 workers, 3 on-job, etc.).
- Only 4 worker cards shown (w-01, w-02, w-03, w-04).
- Can open any team member's drawer.
- Luca's own drawer includes the Team Summary section.
- Solo worker cards (w-05 through w-09) are never rendered.

**WORKER role**
Route `/workforce` is not in the nav sidebar for the WORKER role. Attempting to navigate directly returns a 403 or redirect to `/worker`.

---

### Workers Tab — Notes / Edge Cases

- **OFF_DUTY workers**: No worker in the seed is OFF_DUTY. If a worker's status is `OFF_DUTY` their card still renders in the grid. Their job counts today will be 0 and earnings will be €0.00.
- **Cancelled jobs**: Cancelled jobs are excluded from earnings calculations and from the jobs-today counts on the worker card. They appear in the drawer's Jobs Today list as dimmed rows.
- **Workers with zero earnings**: Roberto Costa (w-09) and Matteo Gallo (w-07) have IDLE status — the projected line is hidden on their cards.
- **Team chip on worker card**: Every worker card shows a small team chip ("Team Alfa" or "Solo"). This is always visible regardless of which sub-tab is active.
- **No pagination**: 9 workers fit comfortably in a 3-column grid.
- **No search or filter controls**: All filtering is handled by the sub-tab selection.

---

## Tab 2: Teams

### Layout

Header row: "Teams" title + "Add Team" button (MANAGER/SUPER_ADMIN only; TEAM_LEAD sees button greyed out).
Team cards grid: 3 columns on desktop, 2 on tablet.

### Team Card anatomy

```
┌─────────────────────────────┐
│  Team Alfa              [→] │
│  ● Luca Ferrari (Lead)      │
│  [avatar][avatar][avatar]+1 │
│  4 members · 3 on job now   │
└─────────────────────────────┘
```

Fields:
- Team name (bold)
- Lead: avatar + name + "(Lead)" label
- Member avatar stack (max 3 shown, +N for overflow)
- Member count + how many currently ON_JOB

### Team Detail Drawer (click team card → 480px right drawer)

Header: team name + edit icon (MANAGER only)

Sections:
1. **Team Lead** — avatar, name, role badge, status dot, earnings today
2. **Members list** — table rows: avatar | name | status dot | jobs today | earnings today | [Remove] button
   - Remove button: MANAGER only, disabled for lead row
3. **"Add Member" button** (MANAGER only) → opens Worker Picker modal

**Worker Picker Modal:**
- Title: "Add to Team Alfa"
- List of workers NOT already in a team (solo workers)
- Each row: avatar + name + status dot + hourly rate
- Checkbox select (multi-select)
- "Add Selected" confirm button
- On confirm: updates local Zustand state only (no API call — UI-only feature)
- Show success toast: "2 workers added to Team Alfa"

### Add Team Modal (click "Add Team" button)

Fields:
- Team name (text input, required)
- Team Lead (select from workers list, required)
- Initial members (multi-select from workers list, optional)

On confirm: adds to local Zustand state only (no API call).
Show success toast: "Team Beta created"

### Empty State (no teams yet)

Icon + "No teams yet" + "Create your first team" button

### Dummy data (from SEED-DATA.md)

Pre-load from seed:
- Team Alfa: Lead = Luca Ferrari, Members = Sofia Conti, Davide Russo, Elena Moretti
- Solo workers (not in any team): Antonio Ricci, Giulia Romano, Matteo Gallo, Chiara Marino, Roberto Costa
  → These appear in the Worker Picker when adding to a team

### Teams Tab — RBAC

- MANAGER / SUPER_ADMIN: full access (add team, add/remove members, edit team name)
- TEAM_LEAD: read-only (can see teams, cannot add/remove/edit)
- WORKER: no access (no sidebar)

### Teams Tab — Notes

1. Teams tab is UI-only — all mutations update Zustand local state, not persisted via API.
2. Workers tab "Team" badge: each worker card shows a small team chip (e.g. "Team Alfa") if they are in a team, or "Solo" if not.
3. Worker Picker shows only workers with no current team assignment.
4. Team lead cannot be removed via the Remove button — must reassign lead first (show tooltip: "Reassign lead before removing").
5. WebSocket does not update teams (teams are static in backend for this phase).
