# 08 — Schedule view

The schedule view is the coordinator's weekly read of every worker at once. The dispatch board (chapter 06) answers "what is happening right now"; this screen answers "what does next week look like, and is anyone overloaded". A coordinator opens this view on Sunday evening, scrolls the seven columns, and looks for empty cells that should be full, full cells that should be empty, and overlaps that need a phone call.

Visual reference, `docs/images/ui/schedule.png`. That image is the contract for layout, density, and color usage.

## Goal of the screen

One coordinator, four to twelve workers, seven days. The grid has to make the following questions answerable without clicking.

- Who is light this week and who is buried.
- Where are the conflicts.
- Where does priority work sit in time.
- What is overdue and still unmoved.

Everything else (job detail, reassign flow, recurring templates) is one click away through the existing `Drawer` and `Dialog` primitives.

## Layout

The page uses the standard app shell from chapter 02. The page body holds the schedule grid and nothing else.

| Region | Width | Notes |
|---|---|---|
| Left column (worker rail) | 200px on desktop | Sticky on horizontal scroll. |
| Day columns | 7 equal-width columns filling the remainder | Min cell width 140px before the grid scrolls. |
| Topbar filter row | Full width above grid, 56px tall | Holds week selector and filters. |
| Cell height | 96px in comfortable, 72px in compact | Stacked events live inside. |

### Worker rail

Each row in the left rail represents one worker. The row is 200px wide and matches the day-cell height of its row.

| Slot | Token |
|---|---|
| Avatar | `Avatar` size `md` |
| Name | `text-body-strong text-default` |
| Role | `RolePill` variant `worker` or `coordinator` |
| Gap (avatar to text) | `space-3` |
| Row padding | `space-3` y, `space-4` x |

Workers are sorted by first name ascending. The rail is sticky on the left edge so the day grid can scroll horizontally on narrow desktops without losing context.

### Day columns

The column header sits in a 40px sticky strip at the top of the grid. Each header reads the short weekday label on top and the date underneath.

| Slot | Token |
|---|---|
| Weekday label | `text-micro text-muted` |
| Date | `text-small text-default` tabular-nums |
| Header border-bottom | `border-line` 1px |
| Today column tint | `bg-brand-soft` on the header strip only |

Cells are a flat `bg-canvas` with a 1px `border-line` on the right and bottom. The grid reads as a quiet ruled paper, never as a stripe.

## Event block anatomy

An event block is a rectangle anchored to one worker row and one day column. It represents a single scheduled job.

| Slot | Token |
|---|---|
| Title | `text-small` weight 600, text color per fill rule below |
| Time range | `text-micro` weight 400, same color family as title |
| Internal padding | `space-2` y, `space-3` x |
| Radius | `radius-md` |
| Border (default) | none |
| Min height | 56px in comfortable, 44px in compact |
| Block-to-block gap inside a cell | 4px |

The title is the job type or property short name. The time range below uses the human format from `00-design-system.md`, for example `9:00 AM to 12:00 PM`.

### Fill rules

| State | Fill | Border | Text | Used for |
|---|---|---|---|---|
| Default | `bg-brand` | none | `text-on-brand` | The everyday scheduled job. |
| Priority | `bg-accent` | none | `text-default` | Flagged as priority on the job record. |
| Overdue | none (`bg-canvas`) | 2px `border-[--color-danger]` | `text-default` | Past the scheduled time, not started. |
| Completed | `bg-surface` | 1px `border-line` | `text-muted` with a leading `Check` icon | Finished, kept on the grid for the day. |

The accent (amber) fill is reserved for priority. Do not use it for in-progress; in-progress on the schedule reads as default brand fill, because the schedule is a planning surface, not a live status surface. Live status lives on the dispatch board.

### Conflict modifier

When two events on the same worker overlap in time, both blocks pick up a 2px `border-[--color-danger]` on top of their existing fill, and the cell renders a small `AlertCircle` glyph in the top-right corner at `icon-xs` in `text-[--color-danger]`. The fill underneath does not change; the border is the signal.

## Density and overflow

Two density modes, selectable from the topbar.

| Mode | Cell height | Min block height | Title type | Time visible |
|---|---|---|---|---|
| Comfortable (default) | 96px | 56px | `text-small` | Yes |
| Compact | 72px | 44px | `text-small` | Yes, single line truncated |

When a cell holds more event blocks than fit at the current density, the last visible block is replaced by a `+N more` link rendered in `text-small text-brand`. Clicking the link opens a `Popover` anchored to the link, listing the hidden jobs with the same anatomy as the inline blocks. The popover is read-only; clicking a row inside it opens the same job `Drawer` as clicking a block.

Block height never drops below the minimum for the active density. If the cell still cannot fit two blocks at the minimum height, the overflow link appears with the first block alone visible.

## Filters and controls

The page-level topbar (chapter 02) holds the schedule controls. Reading left to right.

| Control | Component | Behavior |
|---|---|---|
| Week selector | composition of `IconButton` chevrons and a label | Label reads `Mar 10 to Mar 16`. Chevrons step one week. |
| Today button | `Button` variant `secondary` size `sm` | Jumps the grid to the week containing today and scrolls today into view. |
| Worker filter | `MultiCombobox` | Multi-select of workers. Empty selection means all workers. |
| Property filter | `MultiCombobox` | Multi-select of properties. Empty selection means all properties. |
| Density toggle | `Switch` with `text-micro` label `Compact` | Off is comfortable, on is compact. Persists per user. |

Filter state writes to the URL query string so a coordinator can share a filtered link. The week label is keyboard-operable; pressing left or right arrow while the label has focus steps the week.

## Interactions

### Click a block

Opens the job `Drawer` from chapter 06. Same drawer, same content, same close behavior. The schedule view does not have a custom job detail surface.

### Hover a block

Two things change on hover, both inside `motion-fast`.

| Property | Change |
|---|---|
| Border | Add 1px `border-line-strong` inside the existing radius. |
| Top-left affordance | Reveal a `GripVertical` icon at `icon-xs` in `text-on-brand` (or `text-muted` for outlined variants). |

The grip is the handle for reassign and reschedule. It only appears on hover and on keyboard focus.

### Keyboard focus

Tab moves between event blocks in reading order (top to bottom, left to right within a row, then next row). Enter opens the `Drawer`. Space picks the block up for keyboard reschedule (see below).

## Drag and drop reschedule

Drag and drop is documented now for v0.2. It is not in v0.1. The chapter ships the behavior so the design is decided before the engineering work starts.

### Pick up

Pressing the grip and dragging, or pressing space on a focused block, picks the event up.

| Phase | Visual |
|---|---|
| Picked up | Original block reduces to 40% opacity in place. A ghost block follows the cursor at full opacity with `shadow-pop`. |
| Valid drop zone | Target cell fills with `bg-brand-soft`. |
| Invalid drop zone | Target cell stays at its default `bg-canvas`. No red flash. |
| Snap | The ghost snaps to 30 minute increments within the target day. |

Valid drop zones are cells in the worker's row, in any day, for any time the worker is available. The available windows come from the worker's schedule on the worker record (out of scope for this chapter, see `[NEEDS: worker availability rules]`).

### Drop

On a valid drop the grid updates optimistically. A `Toast` variant `default` appears with the text `Moved to Thu 9:00 AM` and an `Undo` action that stays clickable for 5 seconds. If the server rejects the move, the optimistic block snaps back and the toast turns into a `Toast` variant `error` with the cause.

### Cancel

Escape during a drag cancels and returns the block to its origin with no toast.

## Conflict resolution

Conflicts are surfaced inline on the grid. The deeper resolve flow lives in a small dialog.

### Inline signal

Both conflicting blocks pick up the danger border described in the event anatomy table. The cell shows the `AlertCircle` glyph in the top-right.

### Hover

Hovering a conflicted block opens a `Popover` after a 400ms delay listing the conflicting jobs with property name, time range, and a small `Resolve` `Button` variant `secondary` size `sm`.

### Resolve dialog

`Resolve` opens a `Dialog` with the following slots.

| Slot | Content |
|---|---|
| Title | `Resolve conflict` |
| Description | One sentence stating the conflict. `Maya has two jobs from 9 to 11 on Thu.` |
| Body | A list of the conflicting jobs with a `Select` per row offering Reassign, Move, or Keep. |
| Footer | `Cancel` and `Apply` buttons. |

The dialog is not a drawer because the action is short and modal. The dialog inherits everything from the `Dialog` spec in chapter 01.

## Empty states

Three states the grid can be in.

| Situation | Surface | Copy |
|---|---|---|
| Week has no jobs at all | Centered `EmptyState` rendered in the grid area | Title `No jobs scheduled for this week`. Description `Add jobs from the dispatch board or import a recurring schedule.` Action is a primary `Button` reading `Go to dispatch board`. |
| A worker row is empty for the week | The row stays in place with empty cells | No additional state. The empty cells are the signal. |
| Filters return no workers | Centered `EmptyState` in the grid area | Title `No workers match your filters`. Description `Clear filters to see everyone.` Action is a `Button` variant `secondary` reading `Clear filters`. |

Empty state icon, type, and gap follow the `EmptyState` spec from chapter 01.

## Loading state

On first paint the grid renders the worker rail with avatar and name skeletons and a 7x4 grid of cell skeletons. Skeleton spec follows the `LoadingState` patterns from chapter 01. The week selector and filters render fully so the coordinator can change the week before the data lands.

## Responsive behavior

The seven-column grid does not survive below the `md` breakpoint. The view collapses to a single-day mode.

| Region | Mobile behavior |
|---|---|
| Day selector | A horizontal row of pill buttons (`Mon` through `Sun`) under the topbar. The selected day uses `bg-brand` and `text-on-brand`. Today gets a small dot in the top-right of its pill. |
| Worker list | A vertical list of cards, one per worker. Each card holds that worker's blocks for the selected day. |
| Worker filter | Still applies. Property filter still applies. Density toggle is hidden below `md`. |
| Drag and drop | Disabled below `md`. Reschedule moves to the job `Drawer` instead. |

The mobile worker card uses the standard `Card` from chapter 01 with `space-4` padding. Inside the card, blocks stack vertically with the same anatomy as desktop, full width.

## Accessibility

The grid is announced as a `role="grid"` with row and column headers. Each event block is a `role="gridcell"` containing a `<button>` for the click target. The grip handle is a separate button with an explicit `aria-label` of `Move this job`.

Keyboard map.

| Key | Action |
|---|---|
| Tab | Move between blocks in reading order. |
| Enter | Open the job drawer. |
| Space | Pick the block up for keyboard reschedule. |
| Arrow keys (during drag) | Move the ghost in 30 minute increments horizontally and one cell vertically. |
| Enter (during drag) | Drop the block at the current ghost position. |
| Escape (during drag) | Cancel. |

Color is never the only signal. The conflict outline is paired with the `AlertCircle` glyph. The overdue outline is paired with a visible `Past due` label inside the block when space allows, otherwise in the drawer.

Motion follows `motion-fast` on hover and `motion-base` on drag pickup and drop. `prefers-reduced-motion: reduce` collapses the ghost follow to a static highlight on the target cell and removes the snap animation.

## What this chapter owns and what it does not

Owns: the grid layout, the block anatomy, the filter row, the conflict UI, the drag and drop spec, the empty states, and the mobile collapse.

Does not own:

- Job creation. That is the dispatch board's job in chapter 06.
- The job drawer body. That lives in chapter 05.
- Worker availability rules. That is a settings concern.
- Recurring templates. See gaps.

## Gaps

- Drag and drop reschedule is designed in this chapter but deferred to v0.2. The v0.1 release ships read-only blocks with the click-to-drawer behavior.
- Recurring schedule import is referenced by the empty state copy but the import flow itself is not designed. `[NEEDS: recurring schedule import flow]`.
- ICS export is on the roadmap but not in this version of the guide. `[NEEDS: ICS export surface]`.
- Worker availability windows used to gate valid drop zones are not specified here. `[NEEDS: worker availability rules]`.
- Cross-worker conflict (two workers double-booked on the same property) is out of scope for this chapter. `[NEEDS: cross-worker conflict surface]`.
- Time zone handling for multi-region tenants is not covered. `[NEEDS: schedule time zone rules]`.
