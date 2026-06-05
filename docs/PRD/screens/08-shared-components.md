# Shared Components

Cross-cutting UI elements that appear on multiple screens. None of these are full pages — they are
persistent chrome pieces and reusable overlay patterns. Implementation lives in
`apps/web/src/components/shared/`.

---

## Demo Actor Switcher

A floating chip that is **only rendered when `NEXT_PUBLIC_DEMO_MODE=true`**. Its purpose is to let a
reviewer or hiring manager switch between all seeded demo users on any screen without going through
the full login/logout flow. Because it is purely a demo convenience, it must never appear in
production builds.

### Collapsed State

The chip sits in the **bottom-right corner** of the viewport at all times, `fixed` positioned, above
the native OS scrollbar and safe-area insets. It does not scroll with page content.

```
┌──────────────────────────────────────────────┐  ← viewport edge
│                                              │
│                                              │
│                                              │
│                                              │
│                              ┌────────────────────────────┐ │
│                              │ 👤 Marco Bianchi — Manager ▾│ │  ← fixed, bottom-right
│                              └────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Chip anatomy:

| Part           | Detail                                                           |
|----------------|------------------------------------------------------------------|
| Icon           | `User` (16 px, lucide) — substituted with role emoji in expanded list |
| Name           | Current actor's display name (`text-small font-medium`)          |
| Separator      | Em-dash (—), `text-muted`                                        |
| Role badge     | Canonical role label (`text-xs font-semibold uppercase tracking-wide text-muted`) |
| Caret          | `ChevronDown` (14 px, lucide) — flips to `ChevronUp` when open   |

Styling: `rounded-full bg-canvas border border-line shadow-lg px-space-3 py-space-2 cursor-pointer
hover:bg-surface transition-colors`. Minimum width to prevent wrapping on short names.

Position: `fixed bottom-space-5 right-space-5 z-[9999]`. Above all overlays and drawers.

### Expanded State

Clicking the chip opens a dropdown that **opens upward** (`bottom-full mb-space-2`), never downward.
Width is fixed at `280px`. The list is scrollable if needed (max-height `480px`, `overflow-y-auto`).

```
┌─────────────────────────────────┐
│ Switch Actor                    │  ← section heading, text-xs text-muted px-3 pt-3 pb-1
├─────────────────────────────────┤
│ 🔑  Admin System    SUPER_ADMIN │  ← admin row
│ 👔  Marco Bianchi   MANAGER  ✓  │  ← current actor (checkmark right-aligned)
│ 🔧  Luca Ferrari    TEAM_LEAD   │
├─────────────────────────────────┤  ← divider (h-px bg-line)
│   ── Team Alfa ──               │  ← group label (text-xs text-muted px-3 py-1)
│     Sofia Conti     WORKER      │  ← indented 8px extra vs role rows
│     Davide Russo    WORKER      │
│     Elena Moretti   WORKER      │
├─────────────────────────────────┤
│   ── Solo ──                    │
│     Antonio Ricci   WORKER      │
│     Giulia Romano   WORKER      │
│     Matteo Gallo    WORKER      │
│     Chiara Marino   WORKER      │
│     Roberto Costa   WORKER      │
├─────────────────────────────────┤
│  🔄  Reset Demo Data            │  ← action row, text-danger on hover
└─────────────────────────────────┘
         ▲
         └─ dropdown sits above the chip (bottom-full)
```

Layout rules:

- **Role rows** (ADMIN, MANAGER, TEAM_LEAD): icon + name left-aligned, role badge right-aligned.
- **Worker rows** under a team group: name + WORKER badge, indented with `pl-space-6`.
- **Solo worker rows**: same as team worker rows but under the "Solo" group separator.
- **Current actor row**: has a `Check` icon (14 px, lucide, `text-brand`) pinned to the far right.
  Background: `bg-brand/8`.
- **Group labels**: not interactive. `text-xs text-muted font-medium uppercase tracking-wider`.
- Rows are `h-9` (`py-space-1.5 px-space-3`), `cursor-pointer`, `hover:bg-surface`, `rounded-none`.
- The whole panel: `rounded-xl border border-line bg-canvas shadow-xl`.

Role emoji map used in the list:

| Role        | Emoji |
|-------------|-------|
| SUPER_ADMIN | 🔑    |
| MANAGER     | 👔    |
| TEAM_LEAD   | 🔧    |
| WORKER      | (none, no icon in worker rows) |

### Switch Behavior

When a user row is clicked:

1. Set a **`demo_actor`** cookie (`httpOnly: false` so Next.js middleware can read it server-side,
   `sameSite: lax`, `maxAge: 1 day`, `path: /`). The value is the target user's `userId` string.
2. The dropdown closes immediately and the chip shows a brief loading spinner in place of the caret.
3. Determine the redirect target based on the **target** user's role:

| Target role           | Redirect to             |
|-----------------------|-------------------------|
| SUPER_ADMIN           | `/dashboard`            |
| MANAGER               | `/dashboard`            |
| TEAM_LEAD             | `/dashboard` (team-scoped view rendered server-side by `operatorId` + `teamId`) |
| WORKER                | `/worker`               |

4. Call `router.push(redirectTarget)` — Next.js does a soft navigation, but because the middleware
   re-reads the `demo_actor` cookie on every request, the new session context takes effect on the
   next server render. Use `router.refresh()` after `router.push()` to force a full server
   re-render, or use `window.location.href` for a hard reload.
5. **If already on the correct base path** (e.g. switching between two MANAGER actors while on
   `/dashboard`): perform a hard reload (`window.location.reload()`) so all server-fetched data
   rerenders with the new actor's `operatorId`.

Cookie shape written by the switcher:

```json
{
  "userId": "user-002",
  "role": "MANAGER",
  "operatorId": "op-brookline-001",
  "name": "Marco Bianchi"
}
```

The cookie is consumed by the Next.js middleware (`middleware.ts`) which overwrites the
`crewmate_session` cookie with the demo actor's session before passing the request to the app.
This keeps the rest of the app ignorant of the switcher — it always reads `crewmate_session`.

### Reset Demo Data

The last row in the expanded dropdown is "Reset Demo Data". It is always visible regardless of which
actor is selected.

Reset flow:

1. User clicks "Reset Demo Data".
2. The row shows a `Loader2` spinner (`animate-spin`, 14 px) in place of the 🔄 icon. The row
   becomes non-interactive (`pointer-events-none`).
3. A `POST /demo/reset` request is fired (no body). The API uses `DEMO_RESET_SECRET` from env to
   guard the endpoint.
4. **On success (200):**
   - The spinner is replaced by a `Check` icon (`text-green-600`).
   - The label text changes to "Reset complete".
   - After **2 seconds**, perform a full page reload (`window.location.reload()`).
5. **On failure (non-200):**
   - The spinner is replaced by `AlertCircle` (`text-danger`).
   - The label shows "Reset failed — try again".
   - The row becomes interactive again after 3 seconds so the user can retry.

What the API endpoint resets (see also API section):

- All `Job` rows: `status → original seed status` (SCHEDULED or CANCELLED as seeded), `progressPct → 0`, `cancelReasonCode → null`, `cancelNote → null`.
- All `WorkerProfile` rows: `status → IDLE`.
- All `JobStatusEvent` rows appended after seed time are deleted (preserves seed history).
- Rating and testimony data is **not** reset (it is static seed data).

---

## Navigation Sidebar

Present on all **desktop** pages that use the app shell layout:
`/dashboard`, `/jobs`, `/workers`, `/revenue`.

**Not present on:** `/worker`, `/worker/jobs/:id`, `/login`, or any page under `/(auth)`.

The sidebar uses a layout component `AppShell` that wraps content with a fixed sidebar + scrollable
main content area. On viewports narrower than `lg` (1024 px) the sidebar collapses to a narrow icon
rail or is hidden behind a hamburger toggle (see Responsive below).

```
┌───────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed, full viewport height)  │  MAIN CONTENT     │
│ ┌─────────────────────────────────────────┐   │  ┌─────────────┐  │
│ │                                         │   │  │  Top Bar    │  │
│ │  CrewMate  (wordmark / logo)            │   │  └─────────────┘  │
│ │                                         │   │                   │
│ │  ──────────────────────────────────     │   │  (page body)      │
│ │                                         │   │                   │
│ │  ⊞  Dashboard                           │   │                   │
│ │  💼  Jobs                               │   │                   │
│ │  👥  Workers                            │   │                   │
│ │  📊  Revenue                            │   │                   │
│ │                                         │   │                   │
│ │                                         │   │                   │
│ │  ─ ─ ─ ─ ─ ─ ─ ─ (spacer / flex-grow) │   │                   │
│ │                                         │   │                   │
│ │  ┌────────────────────────────────┐     │   │                   │
│ │  │ [AV] Marco Bianchi             │     │   │                   │
│ │  │      Manager                   │     │   │                   │
│ │  │                      [→ Logout]│     │   │                   │
│ │  └────────────────────────────────┘     │   │                   │
│ └─────────────────────────────────────────┘   │                   │
└───────────────────────────────────────────────────────────────────┘
```

### Role-Based Visibility Table

Nav items are filtered by the session role. Rendering a nav item in the DOM for a role that should
not see it is not acceptable — filter before render, not with CSS visibility.

| Nav Item  | Icon (lucide)   | SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER |
|-----------|-----------------|-------------|---------|-----------|--------|
| Dashboard | `LayoutGrid`    | ✅          | ✅      | ✅        | ❌     |
| Jobs      | `Briefcase`     | ✅          | ✅      | ✅        | ❌     |
| Workers   | `Users`         | ✅          | ✅      | ❌        | ❌     |
| Revenue   | `BarChart2`     | ✅          | ✅      | ❌        | ❌     |

TEAM_LEAD sees Dashboard and Jobs but the data rendered on those pages is scoped to their assigned
team. The sidebar itself does not communicate this scoping — the top bar subtitle does (e.g.
"Team Alfa — 3 workers").

WORKER never sees the sidebar. They land on `/worker` which uses a separate mobile-first layout
with no sidebar.

### Active State

The currently active nav item is determined by `usePathname()`. A route is "active" when the
current pathname starts with the nav item's `href`:

| Nav Item  | Active when `pathname` starts with |
|-----------|------------------------------------|
| Dashboard | `/dashboard`                       |
| Jobs      | `/jobs`                            |
| Workers   | `/workers`                         |
| Revenue   | `/revenue`                         |

Active item styling:
- Background: `bg-brand/10` (10% brand tint)
- Text: `text-brand font-semibold`
- Left border accent: `border-l-2 border-brand` (inset inside the item's padding)
- Icon: `text-brand` (inherits from text color)

Inactive item styling:
- Background: transparent, `hover:bg-surface`
- Text: `text-muted font-medium`, `hover:text-default`
- Icon: `text-muted`, `hover:text-default`

Transition: `transition-colors duration-150` on all interactive states.

### Bottom User Section

The bottom of the sidebar is pinned with `mt-auto` inside a flex-col container. It shows the
currently authenticated user and a logout action.

Layout:

```
┌──────────────────────────────────────────────┐
│ [AV]  Marco Bianchi                [→ Logout] │
│       Manager                                  │
└──────────────────────────────────────────────┘
```

Elements:

| Element        | Detail                                                                 |
|----------------|------------------------------------------------------------------------|
| Avatar         | `Avatar` component, 32 px, initials fallback if no photo URL          |
| Name           | `text-small font-medium text-default` — truncated with `truncate`     |
| Role label     | `text-xs text-muted` — human-readable canonical role name             |
| Logout button  | `LogOut` icon (16 px, lucide), `variant="ghost"` `size="icon"`, `text-muted hover:text-danger` |

Logout behavior:
1. Click calls `logoutAction()` (Next.js Server Action).
2. Action deletes the `crewmate_session` cookie and `demo_actor` cookie.
3. Server redirects to `/login`.

### Responsive Behavior

| Viewport  | Sidebar behavior                                                  |
|-----------|-------------------------------------------------------------------|
| `≥ lg`    | Full sidebar (240px) — always visible, fixed                      |
| `md – lg` | Icon rail (64px) — text labels hidden, icons + tooltips only      |
| `< md`    | Hidden by default — hamburger button in Top Bar opens sheet drawer|

The icon rail and mobile sheet drawer are out of scope for Phase 2 (desktop-first). A placeholder
hamburger icon in the top bar may be rendered but wired in a later phase.

---

## Top Bar

Present on all desktop app-shell pages alongside the sidebar. Fixed to the top of the main content
area, not full-viewport-width (excludes the sidebar's 240px).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Dashboard                     [🔍 Search jobs, workers...]  [+ New Job] │
│  Good morning, Marco. Here's what's happening today.                      │
└──────────────────────────────────────────────────────────────────────────┘
```

Anatomy:

| Zone   | Content                                                              |
|--------|----------------------------------------------------------------------|
| Left   | Page title (`text-h3 font-semibold text-default`) + subtitle (`text-small text-muted`) |
| Center | Search input (cosmetic — no live query wired in Phase 2)             |
| Right  | "+ New Job" button (conditional — MANAGER and SUPER_ADMIN only)      |

**Page title and subtitle per route:**

| Route       | Title      | Subtitle                                                |
|-------------|------------|---------------------------------------------------------|
| /dashboard  | Dashboard  | "Good [morning/afternoon/evening], [first name]. Here's what's happening today." |
| /jobs       | Jobs       | "All jobs across your operation."                       |
| /workers    | Workers    | "Your field team."                                      |
| /revenue    | Revenue    | "Earnings and margin overview."                         |

The greeting in the Dashboard subtitle uses the current hour (server-rendered):
- 05:00–11:59 → "Good morning"
- 12:00–17:59 → "Good afternoon"
- 18:00–04:59 → "Good evening"

**Search input:**

- Placeholder: "Search…"
- Icon: `Search` (16 px, lucide) — left-aligned inside input, muted color
- Width: `w-64` on `lg`, `w-48` on `md`
- Activates Global Search (see ### Global Search below)

### Global Search

A single search input in the TopBar with inline scope filter chips.

**Visual anatomy (left to right):**
- Search icon (magnifying glass, muted color)
- Text input ("Search…" placeholder)
- "In:" label
- Dashed-border pill chips: [Jobs] [Workers] [Customers]
  - All three selected by default
  - Click chip to toggle scope (deselected = dimmer, dashed border)
  - At least one must always remain selected

**Trigger:**
- Click search input OR press Cmd+K (Mac) / Ctrl+K (Win)
- Focuses input and opens results dropdown

**Results dropdown (appears below TopBar, full width of search bar):**
- Grouped by scope: "Jobs (3)", "Workers (1)", "Customers (2)"
- Max 5 results per group
- Each result row: icon + primary label + secondary label
  - Job: job type icon + customer name + worker name + status badge
  - Worker: avatar + worker name + role badge + status dot
  - Customer: building icon + customer name + address
- Click result → navigate to relevant screen/drawer:
  - Job → opens Job Detail Side Drawer on the Jobs Kanban screen
  - Worker → opens Worker Detail Drawer on the Workers screen
  - Customer → opens first active job for that customer
- "No results" empty state if query returns nothing
- Loading skeleton (3 placeholder rows) while fetching

**Search fields per scope:**
- Jobs: customer name, job type name, assigned worker name, customer address, job ID
- Workers: name, phone number, email
- Customers: name, address, contact name

**Keyboard navigation:**
- Arrow keys navigate results
- Enter opens focused result
- Escape clears input and closes dropdown

**Debounce:** 300ms after last keystroke before firing API call
**Min query length:** 2 characters

**RBAC:**
- MANAGER / SUPER_ADMIN: all 3 scopes available
- TEAM_LEAD: Jobs and Workers scopes only (Workers results filtered to their team)
- WORKER: search not shown (worker view has no TopBar)

**"+ New Job" button:**

- Label: "+ New Job"
- Variant: `default` (brand fill)
- Only rendered when `session.role === 'SUPER_ADMIN' || session.role === 'MANAGER'`
- Clicking opens the New Job creation flow (separate modal, out of scope for this document)
- TEAM_LEAD and WORKER never see this button

**Top bar height:** `h-16` (64px). Sticky within the main content column (`sticky top-0 z-40
bg-canvas/95 backdrop-blur-sm border-b border-line`).

---

## Job Detail Side Drawer

A slide-in panel that provides full detail for a single job. Reused across `/dashboard` (from the
KPI area and job list widgets) and `/jobs` (from the jobs table).

### Opening Behavior

Trigger: clicking any job card, job table row, or job ID link that is not a direct route navigation.

```
┌──────────────────────────────────────────────────────────────────────┐
│  MAIN CONTENT (dimmed, pointer-events blocked)   │  DRAWER (480px)  │
│ ┌────────────────────────────────────────────┐   │ ┌──────────────┐ │
│ │                                            │   │ │ ✕            │ │
│ │                                            │   │ │              │ │
│ │        (backdrop overlay bg-black/40)      │   │ │  Job J-042   │ │
│ │                                            │   │ │  IN_PROGRESS │ │
│ │                                            │   │ │  ──────────  │ │
│ │                                            │   │ │  § Customer  │ │
│ │                                            │   │ │  § Assignee  │ │
│ │                                            │   │ │  § Revenue   │ │
│ │                                            │   │ │  § Progress  │ │
│ │                                            │   │ │  § Photos    │ │
│ │                                            │   │ │  § Rating    │ │
│ │                                            │   │ │  § Timeline  │ │
│ │                                            │   │ │  ──────────  │ │
│ │                                            │   │ │  [Actions]   │ │
│ └────────────────────────────────────────────┘   │ └──────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Open mechanics:
- Drawer enters from the right: `translate-x-full → translate-x-0`, eased with
  `transition-transform duration-300 ease-out`.
- Backdrop fades in: `opacity-0 → opacity-100`, `duration-200`.
- Body scroll is locked while open (`overflow-hidden` on `<body>`).
- Focus is trapped inside the drawer. First focus target is the `✕` close button.

Close mechanics (any of these triggers close):
1. Click the `✕` button (top-right corner of drawer).
2. Click the backdrop overlay outside the drawer.
3. Press `Escape`.

On close: reverse the transition, then remove the drawer from the DOM (or set `open={false}`
to unmount with animation).

Width: `w-[480px]` at `lg+`. On `md`: `w-full` (full-width bottom sheet or full-width side panel,
depending on implementation preference). On `< md`: always a bottom sheet, `h-[90vh]`.

The drawer is scrollable internally (`overflow-y-auto`) — the header (job ID + status) and footer
(actions) are sticky inside the drawer.

### Drawer Layout (Full)

```
┌─────────────────────────────────────────────┐
│  J-042                    [IN_PROGRESS ●]  ✕│  ← sticky header
│  Electrical Inspection                       │
├─────────────────────────────────────────────┤
│  CUSTOMER                                    │  ← section label (text-xs text-muted uppercase)
│  Villa Montecarlo                            │  ← customer name (text-base font-semibold)
│  Via della Moscova 12, 20121 Milano, IT      │  ← address (text-small text-muted)
│  Contact: Ing. Ferrario  +39 02 1234567     │
├─────────────────────────────────────────────┤
│  ASSIGNEE                                    │
│  [AV] Marco Bianchi · Manager                │  (SOLO job example)
│       €45/hr  —  Your share: €270           │
├─────────────────────────────────────────────┤
│  REVENUE BREAKDOWN                           │
│  Client charge:  6h × €80 × 1 worker = €480 │
│  Worker cost:    6h × €45              = €270│
│  Platform profit:                       €210 │
├─────────────────────────────────────────────┤
│  PROGRESS                    [  72%  ]       │  ← ring
│  ████████████░░░░  72%                       │
├─────────────────────────────────────────────┤
│  PHOTOS — Before                             │
│  [img 80×60] [img 80×60]                    │
│  PHOTOS — After             (COMPLETED only) │
│  [img 80×60] [img 80×60]                    │
├─────────────────────────────────────────────┤
│  RATING & TESTIMONY         (COMPLETED only) │
│  ★★★★☆  4/5                                │
│  "The team arrived on time and left the      │
│   property spotless. Highly recommended."   │
├─────────────────────────────────────────────┤
│  STATUS HISTORY                              │
│  [AV] Marco Bianchi  SCHEDULED → IN_PROGRESS│
│       Jun 4, 2026 · 09:14                   │
│  [AV] Admin System   CREATED → SCHEDULED    │
│       Jun 3, 2026 · 16:30                   │
├─────────────────────────────────────────────┤
│  [Open in Worker View]  [Revoke Job ⚠]      │  ← sticky footer
└─────────────────────────────────────────────┘
```

### Section 1: Customer

Always visible. Shows:

| Field          | Source                       | Styling                              |
|----------------|------------------------------|--------------------------------------|
| Customer name  | `job.customer.name`          | `text-base font-semibold text-default` |
| Full address   | `job.customer.address` formatted as "Street, PostCode City, Country" | `text-small text-muted` |
| Contact name   | `job.customer.contactName`   | `text-small text-default`            |
| Contact phone  | `job.customer.contactPhone`  | `text-small text-muted`             |

Contact name and phone are on the same line separated by two spaces or a middle dot (·).

### Section 2: Assignee

Always visible. Layout differs by assignment type.

**SOLO assignment** (single worker):

```
[AV 32px]  Sofia Conti · Worker
           €32/hr  —  Your share: €192
```

- Avatar (32px) + name (`text-small font-medium`) + role (`text-xs text-muted`)
- `hourlyRate` formatted as `€XX/hr`
- "Your share" = `worker.hourlyRate × job.estimatedHours`, formatted as `€XXX`
- "Your share" label is only shown to the viewing actor if they are the assigned worker.
  All other roles see the worker's hourly rate only.

**TEAM assignment**:

```
[Team icon]  Team Alfa
             Lead: Luca Ferrari · 4 members
             Team cost: €XXX
```

- Team icon (a stylised group avatar or `Users` lucide icon at 32px)
- Team name (`text-small font-medium`)
- Lead name + member count on second line (`text-xs text-muted`)
- Team total cost = Σ(each member's `hourlyRate × estimatedHours`)

### Section 3: Revenue Breakdown

Visible to SUPER_ADMIN, MANAGER, TEAM_LEAD. **Not shown to WORKER** (workers do not see billing
rates or platform margin).

Three-row mini table layout:

| Row              | Formula                                            | Example    |
|------------------|----------------------------------------------------|------------|
| Client charge    | `estimatedHours × clientRatePerHour × workerCount` | €480       |
| Worker cost      | `Σ(worker.hourlyRate × estimatedHours)`            | €270       |
| Platform profit  | Client charge − Worker cost                        | €210       |

Platform profit row is styled with `text-brand font-semibold` when positive, `text-danger
font-semibold` when negative (rare, indicates a pricing error).

Layout: a `<table>` or three-row flex stack with label left-aligned (`text-small text-muted`) and
value right-aligned (`text-small font-medium text-default`). A subtle top border separates the
profit row from the two cost rows.

### Section 4: Progress

Shown only when `job.status === 'IN_PROGRESS' || job.status === 'COMPLETED'`.

A large circular progress ring (SVG, 80px diameter) showing `job.progressPct` (0–100). Inside the
ring: the percentage value as `text-xl font-bold text-default`.

Below the ring: a horizontal progress bar (`h-2 rounded-full bg-line`) with a fill (`bg-brand`)
proportional to `progressPct`. The percentage value is repeated as text to the right of the bar for
accessibility.

For `IN_PROGRESS` jobs, the ring and bar update in real time via WebSocket (see WebSocket section).
An animated pulse on the ring border (`animate-pulse ring-brand/30`) signals live updates.

For `COMPLETED` jobs, `progressPct` is always `100`, the ring is full, and `text-green-600` is used
instead of brand color to signal completion.

### Section 5: Photos

Always rendered, but the "After" strip is conditional.

**Before strip** (always visible if photos seeded):

```
PHOTOS — Before
┌──────────┐  ┌──────────┐
│  80×60   │  │  80×60   │
│  (img)   │  │  (img)   │
└──────────┘  └──────────┘
```

**After strip** (only when `job.status === 'COMPLETED'`):

```
PHOTOS — After
┌──────────┐  ┌──────────┐
│  80×60   │  │  80×60   │
│  (img)   │  │  (img)   │
└──────────┘  └──────────┘
```

Thumbnail specs:

| Property   | Value                                     |
|------------|-------------------------------------------|
| Size       | `80 × 60px`, `object-cover rounded-md`    |
| Click      | Opens full-size image in a lightbox overlay (`Dialog` centered, `max-w-2xl`) |
| Lightbox   | Shows the image + a caption (photo type + job ID). `Escape` or click outside closes. |
| Placeholder| If `job.photos` is empty: text "No photos yet" in `text-muted text-small italic` |

Each photo object: `{ url: string, type: 'before' | 'after', jobId: string }`.

Two photos per strip are expected from seed data. The UI should handle 1–4 gracefully (flex-wrap
row, gap-space-2, no fixed grid).

### Section 6: Rating & Testimony

Shown only when `job.status === 'COMPLETED'` and `job.rating !== null`.

**Star rating:**

Five `Star` icons (lucide, 16px each). Filled stars (`text-amber-400 fill-amber-400`) for the
rating value, empty stars (`text-muted`) for the remainder. The numeric value appears to the right:
`4/5` in `text-small font-medium`.

**Testimony:**

The full testimony string rendered in `text-small text-muted italic`, wrapped in a blockquote
element with a left border accent (`border-l-2 border-line pl-space-3`).

```
┌──────────────────────────────────────────────┐
│ ★★★★☆  4/5                                  │
│                                              │
│ ╷ "The team arrived on time and left the     │
│ ╷  property spotless. Highly recommended."  │
└──────────────────────────────────────────────┘
```

If `job.testimony === null` but `job.rating !== null`: show only the stars, omit the blockquote.

### Section 7: Status History Timeline

Always visible. Lists `job.statusHistory` (array of `JobStatusEvent`) sorted newest-first.

Each timeline item:

```
[AV 24px]  Marco Bianchi          Jun 4, 2026 · 09:14
           SCHEDULED → IN_PROGRESS
```

| Element        | Source                             | Styling                      |
|----------------|------------------------------------|------------------------------|
| Actor avatar   | `event.actor.avatarUrl` or initials | 24px, rounded-full          |
| Actor name     | `event.actor.name`                 | `text-small font-medium`     |
| Timestamp      | `event.createdAt` formatted as "MMM D, YYYY · HH:mm" | `text-xs text-muted` right-aligned |
| Status change  | `"${event.fromStatus} → ${event.toStatus}"` | `text-xs text-muted` using status badge colors for each status word |

Timeline connector: a thin vertical line (`w-px bg-line`) running through the left avatar column,
between items but not before the first or after the last. Implemented as a pseudo-element or an
absolutely positioned div within the list container.

The "CREATED" event (first status, always present) uses the Admin System actor and shows
`null → CREATED` or simply "Job created" as the label.

### Section 8: Actions Footer

Sticky at the bottom of the drawer (`sticky bottom-0 bg-canvas border-t border-line pt-space-3
pb-space-4 flex gap-space-2`).

| Button             | Visibility                | Behavior                                |
|--------------------|---------------------------|-----------------------------------------|
| Open in Worker View | All roles                 | `window.open('/worker/jobs/:id', '_blank')` |
| Revoke Job          | SUPER_ADMIN, MANAGER only | Opens Revoke Job Modal (see below). Disabled if `job.status === 'COMPLETED' \|\| job.status === 'CANCELLED'` |

"Revoke Job" disabled state: `opacity-50 cursor-not-allowed`. A `title` tooltip reads "Cannot
revoke a completed or already-cancelled job."

---

## Revoke Job Modal

Triggered from the drawer footer. Renders on top of the drawer (both the drawer backdrop and the
drawer itself remain visible behind the modal's own overlay).

```
┌──────────────────────────────────────────────┐
│  Revoke Job J-042                         ✕  │  ← modal header
├──────────────────────────────────────────────┤
│  Select a reason for cancellation:           │
│                                              │
│  ○  Customer requested cancellation          │
│  ○  Required equipment not available         │
│  ○  Worker did not show up                   │
│  ○  Could not access the property            │
│  ○  Entered in error / duplicate             │
│  ○  Worker recalled for emergency            │
│                                              │
│  Note (optional)                             │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│              [Cancel]  [Confirm Revoke ⚠]   │
└──────────────────────────────────────────────┘
```

Modal specs:

| Property      | Value                                                              |
|---------------|--------------------------------------------------------------------|
| Width         | `max-w-md` (448px)                                                 |
| Overlay       | `bg-black/60` above the drawer backdrop                            |
| Close triggers| `✕` button, "Cancel" button, `Escape` key                         |
| Focus trap    | Yes — focus locked inside modal while open                        |

**Radio group — Cancel Reason Codes:**

| Code (sent to API)                  | Display label                        |
|-------------------------------------|--------------------------------------|
| `CUSTOMER_REQUESTED`                | Customer requested cancellation      |
| `EQUIPMENT_NOT_AVAILABLE`           | Required equipment not available     |
| `WORKER_NO_SHOW`                    | Worker did not show up               |
| `PROPERTY_ACCESS_DENIED`            | Could not access the property        |
| `ENTERED_IN_ERROR`                  | Entered in error / duplicate         |
| `WORKER_RECALLED`                   | Worker recalled for emergency        |

One reason must be selected before "Confirm Revoke" is enabled. The button is `disabled` until a
radio option is chosen.

**Note textarea:**

- Optional free-text field, `max-length: 280`.
- Label: "Note (optional)" (`text-small text-muted`).
- `rows={3}`, `resize-none`.
- Placeholder: "Add any additional context…".
- Value sent as `cancelNote` in the API request.

**Confirm Revoke button:**

- Variant `destructive` (red fill).
- Label: "Confirm Revoke" with a `TriangleAlert` icon (14px) to signal danger.
- `disabled` until a reason is selected.

**Submission flow:**

1. Click "Confirm Revoke".
2. Button shows `Loader2` spinner + "Revoking…" label. Both buttons become `disabled`.
3. Fire `PATCH /jobs/:id/cancel` with body `{ cancelReasonCode, cancelNote }`.
4. **On 200:** close the modal, close the drawer, refresh the jobs list (invalidate query cache).
   Show a toast notification: "Job J-042 revoked." (`variant="default"`).
5. **On error:** show an inline error message below the radio group ("Failed to revoke — please
   try again."), re-enable both buttons.

---

## API Calls (Shared Components)

### Demo Actor Switcher

| Method | Endpoint          | Trigger                      | Body / Params              | Expected response |
|--------|-------------------|------------------------------|----------------------------|-------------------|
| POST   | `/demo/reset`     | "Reset Demo Data" clicked    | None                       | `200 { ok: true }` |

The `POST /demo/reset` endpoint requires the `X-Demo-Reset-Secret` header (value from
`DEMO_RESET_SECRET` env var). The Next.js client sends this header from a Route Handler
(`/api/demo/reset`) that proxies the request to the API, injecting the secret server-side so it
is never exposed to the browser.

### Revoke Job Modal

| Method | Endpoint               | Trigger              | Body                                      | Expected response |
|--------|------------------------|----------------------|-------------------------------------------|-------------------|
| PATCH  | `/jobs/:id/cancel`     | "Confirm Revoke"     | `{ cancelReasonCode, cancelNote? }`       | `200 Job`         |

On 200 the full updated `Job` object is returned. The drawer and jobs list should update
optimistically or re-fetch after the modal closes.

### Logout (Sidebar)

| Method | Action           | Trigger           | Notes                                 |
|--------|------------------|-------------------|---------------------------------------|
| Server Action | `logoutAction()` | Logout button | Deletes `crewmate_session` + `demo_actor` cookies, redirects to `/login` |

---

## WebSocket (Drawer Live Updates)

When the Job Detail Drawer is open for a job with `status === 'IN_PROGRESS'`, the client subscribes
to real-time progress updates.

**Channel:** `job-progress:{jobId}` (WebSocket room managed by the NestJS gateway).

**Message payload received:**

```json
{
  "jobId": "job-042",
  "progressPct": 78,
  "status": "IN_PROGRESS"
}
```

**On message received:**

1. Update the local React state for `progressPct` (the ring and bar animate to the new value via
   CSS transition, `transition-all duration-500 ease-out`).
2. If `status` transitions to `COMPLETED` in the message:
   - The ring fills completely and switches to green color.
   - The "After photos" strip becomes visible (if the photos array now has entries).
   - The "Rating & Testimony" section appears (if the rating is now set).
   - The drawer re-fetches the full job object (`GET /jobs/:id`) to pick up the final state.
3. If the drawer is closed while subscribed, the WebSocket subscription is cancelled in the
   component cleanup (`useEffect` return function).

**Subscription lifecycle:**

```
Drawer opens (job IN_PROGRESS)
  → subscribe to "job-progress:{jobId}"
  → receive updates → update progressPct state

Drawer closes
  → unsubscribe
  → no further updates processed
```

No subscription is created for SCHEDULED, COMPLETED, or CANCELLED jobs — static data only.

---

## Notes / Edge Cases

1. **Demo Actor Switcher z-index.** The switcher must always be above modals, drawers, and toast
   notifications. Use `z-[9999]` or a dedicated portal root near the bottom of `<body>`. If a modal
   is open and the user opens the switcher, the switcher dropdown should appear above the modal
   overlay.

2. **Demo mode guard.** The switcher component reads `process.env.NEXT_PUBLIC_DEMO_MODE`. If this
   flag is absent or not `"true"`, the component returns `null` immediately. Never ship the
   switcher in a build where `NEXT_PUBLIC_DEMO_MODE` is not explicitly set to `"true"`.

3. **Sidebar vs. mobile layout.** The WORKER role never uses the app shell (sidebar + top bar).
   If a WORKER somehow navigates to a desktop route, the middleware should redirect them to
   `/worker`. The sidebar must not render for WORKER sessions even if somehow reached.

4. **Job Drawer and navigating away.** If the user navigates to a different route while the drawer
   is open, the drawer should close (state resets). Using URL-based drawer state
   (`?jobId=job-042`) is recommended so the drawer is bookmarkable and survives a page refresh.

5. **Progress ring accessibility.** The SVG ring must have `role="progressbar" aria-valuenow={progressPct}
   aria-valuemin={0} aria-valuemax={100} aria-label="Job progress"` for screen reader support.

6. **Revenue section and WORKER role.** The Revenue Breakdown section in the drawer must be
   completely absent from the DOM for WORKER sessions — not hidden with CSS. This prevents
   client-side DOM inspection from revealing margin data to workers.

7. **Revoke modal and keyboard navigation.** The six radio buttons in the cancel reason group must
   be keyboard-navigable with arrow keys (standard radio group behaviour). The "Confirm Revoke"
   button only becomes focusable (removes `tabIndex={-1}`) once a reason is selected.

8. **Reset Demo Data idempotency.** If the user clicks "Reset Demo Data" multiple times quickly,
   only one request should fire. The button is made non-interactive immediately on first click and
   stays disabled for the full reset + reload cycle.

9. **Cookie domain for demo_actor.** The `demo_actor` cookie must have the same domain as
   `crewmate_session` to ensure the middleware can read both. In local dev this is `localhost`.
   In production demo deployments, set `domain` explicitly.

10. **Top bar search (Phase 2 shell).** In Phase 2 the search input and scope chips are rendered
    but `onChange` is not wired to a real API call — the component is built out structurally with
    the full visual anatomy (input, "In:" label, dashed-border chips) and keyboard shortcut
    listener (Cmd+K / Ctrl+K). The results dropdown is rendered with skeleton loading rows to
    verify layout. Real API wiring (`GET /search`) happens in Phase 3 Search integration.
