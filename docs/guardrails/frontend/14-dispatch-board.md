# 14 — Dispatch board

The dispatch board is the single screen a coordinator stares at while jobs are in flight. Open it at 6am with the day's load, leave it open until the last worker checks out. Everything else in the product is a detour from this view.

Visual contract is `docs/images/ui/dispatch-board.png`. State machine contract is `docs/images/diagrams/job-state-machine.png`.

## Goal

A coordinator can read the entire field operation in one glance. Who is scheduled, who is moving, who is on site, who is done. The board surfaces the jobs that need attention now, hides the ones that don't, and updates without a refresh. If the coordinator can do their work from the board alone, the board has succeeded.

The board does not try to be a planner. Schedules are built in the schedule view (`16-schedule-view.md`). The board is the operational present.

## Layout

The board occupies the main content area below the topbar. The page sits on `bg-surface`. The board's columns sit on `bg-canvas` panel fills inside that page.

```
┌─ topbar ────────────────────────────────────────────────┐
├─ filters bar ───────────────────────────────────────────┤
├─ filter chips (when present) ───────────────────────────┤
├─ board grid ────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │SCHEDULED │ │EN ROUTE  │ │IN PROG.  │ │COMPLETED │    │
│  │          │ │          │ │          │ │          │    │
│  │ [card]   │ │ [card]   │ │ [card]   │ │ [card]   │    │
│  │ [card]   │ │ [card]   │ │ [card]   │ │ [card]   │    │
│  │ ...      │ │ ...      │ │ ...      │ │ ...      │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Columns

Four columns, equal width, `space-4` gap between them. Each column is a panel with `bg-canvas` fill, `radius-lg`, no border, `space-4` internal padding. Cards stack inside with `space-3` between them.

The four columns are fixed in order.

| Column header | Maps to job status | Notes |
|---|---|---|
| SCHEDULED | `scheduled` | Created and not yet started. Sorted by scheduled start time ascending. |
| EN ROUTE | `en_route` | Worker tapped start, has not arrived. Sorted by start time ascending. |
| IN PROGRESS | `in_progress` | Worker tapped arrive. Sorted by arrive time ascending. |
| COMPLETED | `completed` | Worker tapped complete. Awaiting coordinator verification. Sorted by completed time descending. |

`VERIFIED` is intentionally hidden from this board. Once a coordinator verifies a job, it rolls off after a tunable delay (default 30 minutes, set per tenant in `19-settings.md`). The rationale is the board shows in-flight work, not history. Verified jobs live in the jobs index (`12-data-display.md`).

### Column header anatomy

Each column header is a horizontal row at the top of the panel, `space-3` from the first card.

| Slot | Token | Notes |
|---|---|---|
| Label | `text-micro text-muted` | ALL CAPS, the column name. |
| Count | `Badge` neutral | Total cards in the column, including ones below the fold. |
| Action (optional) | `IconButton` size `sm`, `Plus` icon | Only on SCHEDULED. Opens the new job dialog. `aria-label="Add job"`. |

The header is left-aligned. The optional action sits at the far right of the header row.

### Page grid

The board takes the full content width inside the app shell. On screens narrower than `lg` (1024px), the columns scroll horizontally as a single row. Each column keeps its full width; the user pans sideways. Mobile coordinator usage is rare, but the layout does not collapse to a single column because the state of all columns at once is the point of the screen.

## Job card anatomy

A `JobCard` is the unit of the board. It is a `Card` with dense padding and a documented internal layout.

```
┌──────────────────────────────────────┐
│ Title line                       ●   │
│ Sub line                             │
│                                      │
│ [avatar] Worker name                 │
│                                      │
│ ⏱ 10:00 – 11:30                      │
└──────────────────────────────────────┘
```

Card spec.

| Property | Value |
|---|---|
| Fill | `bg-surface` |
| Border | `border-line` 1px |
| Radius | `radius-lg` |
| Padding | `space-3` |
| Internal gap | `space-2` between rows |
| Cursor | `pointer` on the card body |

### Title line

`text-h3 text-default`, single line, truncates with ellipsis. Format is the property short name followed by a separator and the job type abbreviation. Example "12 Beacon St · HVAC service".

### Sub line

`text-small text-muted`, single line, truncates with ellipsis. The full property address. Example "12 Beacon Street Condos, Brookline MA".

### Worker row

A row with the assigned worker. Two states.

| State | Render |
|---|---|
| Assigned | `Avatar` size `sm` + worker first name and last initial in `text-body` |
| Unassigned | Inline `LinkButton` with text "Assign worker" |

The avatar plus name pair behaves as one interactive region. Clicking it opens the worker drawer for that worker, not the job drawer. Cursor on the worker pill is `default` until hover, then `pointer`. The card body and the worker pill must not both be in the tab order as the same target; the worker pill is a separate focusable element nested inside the focusable card.

### Time chip

A small inline group below the worker row. Shows the scheduled window when the job has not started, the actual start time once the worker tapped start.

| Status | Renders |
|---|---|
| `scheduled` | `Clock` icon + "10:00 – 11:30" |
| `en_route` | `Navigation` icon + "Started 10:04" |
| `in_progress` | `Play` icon + "On site 10:11" |
| `completed` | `CheckCircle` icon + "Done 11:24" |

Icon size `icon-xs`, `text-small text-muted`. Times are human-formatted per the voice rules in `00-design-system.md`.

### Active indicator

A filled circle in `bg-accent`, 8px, sits at the top-right of the card with `space-3` inset from the corners. Used only on the single in-progress job per worker. If a worker has multiple jobs in the IN PROGRESS column (rare, but allowed by the data model), only their most recently started job gets the indicator.

The indicator is decorative on top of a semantic state. Screen readers receive the state from the column membership, not from the dot. `aria-hidden="true"` on the dot itself.

### Selected state

When a card's drawer is open, the card stays visually selected on the board so the coordinator does not lose context.

| Property | Value |
|---|---|
| Left border | 2px `bg-brand` |
| Fill | `bg-brand-soft` |
| Border (other sides) | unchanged `border-line` 1px |

Padding is preserved by shrinking the left padding by 2px to compensate for the thicker border. The visual width of the card does not change.

## Card interactions

### Click target

The card body is the primary click target. Clicking anywhere on the card except the worker pill and the three-dot menu opens the right-side `Drawer` for that job. The drawer contract is in `01-components.md`. Visual reference for the drawer body is `docs/images/ui/job-detail.png`.

### Three-dot menu

On hover, a `DropdownMenu` trigger appears at the top-right of the card, replacing the active indicator visually. The menu trigger and the active indicator never appear on the same card at the same time; if a card has an active indicator, the menu trigger replaces it on hover, then the indicator returns on hover-out.

Menu items.

| Item | Action |
|---|---|
| Reassign | Opens the reassign popover. Worker `Combobox`. |
| Reschedule | Opens the reschedule popover. Date + time inputs. |
| Cancel job | Opens a `ConfirmDialog`. Destructive, requires a reason. |

Items disable based on the state machine. A `completed` card has no Reschedule. A `scheduled` card has all three. The menu is keyboard-accessible from the card with `Shift+F10` or the `Menu` key per the dropdown contract in `01-components.md`.

### Cursors

| Region | Cursor |
|---|---|
| Card body | `pointer` |
| Worker pill | `default`, becomes `pointer` on hover |
| Three-dot menu trigger | `pointer` |
| Time chip | `default`, not interactive |

### Keyboard

A card is a single focusable element. `Enter` or `Space` opens the drawer. `Tab` moves to the next focusable inside the card (worker pill, then menu trigger if visible). Arrow keys do not move between cards; this is documented in `10-accessibility-and-motion.md` as a known affordance the keyboard user gets through column navigation instead.

## Realtime updates

The board subscribes to the tenant's job event stream over WebSocket. The transport is documented in `17-webhooks-and-events.md`. The UI rules below apply regardless of source.

### Incoming changes

When a job arrives or changes column due to a server event, the card animates into its destination column.

| Property | Value |
|---|---|
| Movement | The card translates from its previous column position to its new one. |
| Pulse | A `bg-accent` outline pulse on the card border, 600ms total. |
| Duration | `motion-base` for the movement, the pulse runs in parallel. |
| Easing | `motion-base` easing curve. |
| Reduced motion | Plain re-render. No translate, no pulse. |

A new card that enters the board (a job created elsewhere) fades in at 0 to 100 opacity over `motion-base`, then receives the same outline pulse.

### Optimistic local transitions

When the coordinator triggers a transition from the board itself (drag in v0.2, menu items now), the UI moves the card immediately.

| Property | Value |
|---|---|
| Movement | Instant. Card jumps to the destination column. |
| Underline | A 2px `bg-accent` underline along the bottom edge of the card while the request is in flight. |
| Rollback | If the server rejects, the card returns to its origin column with `motion-base` and a `Toast` variant `error` describes the cause. |
| Confirmation | When the server confirms, the underline removes. No toast on success. |

The optimistic underline is the only loading indicator on a card. Buttons do not spin inside cards.

## Filters and controls

The filters bar sits between the topbar and the columns. It is a single horizontal row, `space-4` vertical padding, `bg-surface` (the page fill, no panel of its own).

### Controls

| Control | Component | Notes |
|---|---|---|
| Date | Three-segment control | "Today" pill (default), "Tomorrow" pill, custom day `Popover` with a `Calendar` |
| Worker | `MultiCombobox` | Filters cards by assigned worker. Includes an "Unassigned" pseudo-option. |
| Property | `MultiCombobox` | Filters cards by property. |

Status filter is implicit. The columns are the status filter; there is no separate control.

The "Today" and "Tomorrow" pills use the `StatusPill` `brand` variant when active, `neutral` when inactive. The custom day picker is a third pill that shows the selected date when not Today or Tomorrow.

### Filter chips

When any filter is applied beyond the default Today view, a row of removable chips appears below the controls bar. Each chip uses the `StatusPill` `neutral` variant with a trailing `X` `IconButton`. Clicking the X removes that filter. A "Clear filters" `LinkButton` appears at the end of the row when more than one chip is present.

Chip examples.

| Chip | Renders |
|---|---|
| Worker filter | "Worker: Maya R., Jamal T." with X |
| Property filter | "Property: 12 Beacon St" with X |
| Date filter | "Date: Fri Mar 14" with X (only when not Today or Tomorrow) |

### URL state

All filter values serialize into the URL query string. A bookmark restores the view. The default state (Today, no worker or property filter) renders with no query string.

## Empty column states

Columns have terse empty states. The board is information-dense; empty copy stays out of the way.

| Column | Empty render |
|---|---|
| SCHEDULED | A small `EmptyState` inline at the top of the panel. Title "Nothing scheduled." Sub "Add a job to start the day." Action is an `Add job` `Button` size `sm` variant `secondary`. |
| EN ROUTE | A single `—` glyph in `text-muted`, centered in the column, `space-8` from the top. No copy. |
| IN PROGRESS | A single `—` glyph in `text-muted`, centered, `space-8` from the top. No copy. |
| COMPLETED | A single `—` glyph in `text-muted`, centered, `space-8` from the top. No copy. |

The asymmetry is intentional. SCHEDULED is the only column the coordinator acts on directly when empty. The others are filled by worker actions.

## Drag-and-drop reschedule

In scope for v0.2. The implementation can land later; the interaction model is fixed now so the rest of the screen does not regress when it ships.

### Model

A card can be dragged across columns to transition its state. The drag is gated by the same state machine as the rest of the system. A drop on an illegal column is rejected with a brief shake and a `Toast` variant `warn`.

| From | To allowed | To rejected |
|---|---|---|
| SCHEDULED | EN ROUTE | IN PROGRESS, COMPLETED |
| EN ROUTE | IN PROGRESS, SCHEDULED | COMPLETED |
| IN PROGRESS | COMPLETED, EN ROUTE | SCHEDULED |
| COMPLETED | (none from the board) | all |

Backwards transitions (EN ROUTE back to SCHEDULED) are allowed for coordinator overrides and follow the state machine in `docs/images/diagrams/job-state-machine.png`.

### Visuals

| Phase | Render |
|---|---|
| Hold | After 250ms of mousedown on the card body, the card lifts. `shadow-pop`, `radius-lg` preserved. Cursor `grabbing`. |
| Drag | The original card position shows a placeholder, a `bg-canvas` rectangle with `border-line` dashed 1px. The cursor carries a ghost of the card. |
| Hover legal | The destination column gains a 2px inner outline in `bg-accent`. |
| Hover illegal | The destination column gains a 2px inner outline in `text-[--color-danger]`. Cursor `not-allowed`. |
| Drop legal | Card animates into the destination column at its sorted position. Optimistic underline applies per the realtime rules above. |
| Drop illegal | Card animates back to origin with `motion-base`. Toast warn explains the rule. |

Keyboard equivalent uses `Space` to lift, arrow keys to move between columns, `Space` again to drop, and `Escape` to cancel. Documented further in `10-accessibility-and-motion.md`.

## Performance notes

The board can carry hundreds of cards on a busy day for a large operator.

| Threshold | Behavior |
|---|---|
| Up to 200 cards per column | Plain render. |
| Above 200 cards per column | Switch to virtualized rendering. [NEEDS: chosen virtualization library, react-virtual or tanstack-virtual] |
| First paint | Server-rendered with the initial set of cards. The WebSocket subscription attaches after hydration and updates from there. |
| Card images | None. Cards are text only. There is no image fetch cost per card. |

Counts in the column headers come from the same payload as the cards. They do not require a separate query.

## Drawer integration

Opening a card drawer is the dominant interaction on the board. The drawer is documented in `01-components.md`. On this surface specifically.

- The drawer width does not push the board. The board stays full width and the drawer overlays the right side with its backdrop.
- The selected card on the board stays in the selected state for the lifetime of the open drawer.
- Closing the drawer returns focus to the card. Closing with `Escape` does the same.
- If the drawer is open and a realtime event arrives that moves the open card to a different column, the card animates to its new column, stays selected, and the drawer header status pill updates. No other interruption to the coordinator.

## Acceptance checklist

A dispatch board PR is done when these criteria all hold.

- The four columns render with the correct order and the correct status mapping in the table above.
- VERIFIED jobs do not appear. Verified jobs roll off after the tenant delay.
- A card shows title, sub, worker row, time chip, and the optional active indicator per the anatomy above.
- Selected state, hover state, and the three-dot menu render with the documented tokens.
- Click on the card body opens the drawer. Click on the worker pill opens the worker drawer instead.
- WebSocket events move cards with the documented motion. Reduced motion collapses to plain re-render.
- Optimistic local transitions show the underline and revert with a toast on server rejection.
- Filters bar with date, worker, and property controls behaves per the table above and serializes to the URL.
- Filter chips show below the controls with click-to-remove.
- Empty states match per column.
- Keyboard traversal reaches every interactive element and the menu opens via keyboard.
- Lighthouse a11y is 95+.

## Gaps

- Drag-and-drop reschedule is in scope for v0.2. The interaction model in this chapter is the contract for that work, but the implementation is not in v0.1.
- The virtualization library choice for above-200 columns is not yet decided. [NEEDS: chosen virtualization library].
- The tunable delay for VERIFIED roll-off has no settings UI yet; see `19-settings.md` for where it will live.
- Bulk select across cards (multi-reassign, multi-reschedule) is not in scope for v0.1 and has no defined interaction model yet.
