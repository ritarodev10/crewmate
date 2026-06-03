# 05 — Data display

Tables, filters, drawers, timelines, and the supporting machinery for surfaces that exist to show many rows of structured data. The catalog entry for `Table`, `Drawer`, `Timeline`, and `StatusPill` lives in `01-components.md`. This chapter is the deep guide for assembling those parts into the real surfaces the product ships: webhook deliveries, team management, job detail.

The visual contracts referenced here are `docs/images/ui/job-detail.png`, `docs/images/ui/webhook-log.png`, and `docs/images/ui/team-management.png`.

## Choosing the right container

Three containers carry list data in the product. The choice is not stylistic. It follows the shape of the data and the task.

| Container | Use when | Avoid when |
|---|---|---|
| Table | Rows share a fixed schema, the user scans by column, sort and filter matter | The user reorders by dragging, or status matters more than column comparison |
| Card list | Each row is small and visual, mobile-first, or rows have variable height | Columns need to align across rows |
| Kanban | Rows move between states and that movement is the primary user action | The user is reading, not moving |

Webhook deliveries, team members, and audit logs are tables. The dispatch board is a kanban (see `06-dispatch-board.md`). The mobile worker today view is a card list (see `07-worker-mobile.md`).

## Tables

### Anatomy refresher

The `Table` primitive in `01-components.md` defines row height, padding, borders, hover, and selected-row fill. This section covers the patterns that wrap a table into a real surface.

### Sortable columns

A column is sortable when its `HeaderCell` declares `sortable` and a `sortKey`. The header renders a trailing chevron icon at `icon-xs`.

- Idle column. Chevron in `text-muted`, opacity 0.4.
- Active ascending. Chevron up in `text-default`, opacity 1.
- Active descending. Chevron down in `text-default`, opacity 1.

The header cell uses `aria-sort="ascending" | "descending" | "none"`. Only one column carries the non-none value at a time.

Keyboard activation. The header cell is a real `<button>` inside `<th>`. Enter or Space toggles the sort. The first activation sorts ascending, the second descending, the third clears back to default ordering.

The sort state lives in the URL (`?sort=member.asc`). Reloading the page restores the sort.

### Sticky header and sticky first column

The header is sticky on vertical scroll by default. It uses `position: sticky`, `top: 0`, `bg-surface`, and a 1px bottom border in `border-line`. No shadow.

When a table scrolls horizontally (more columns than the viewport can hold), the first body column also becomes sticky. The sticky column carries a right border in `border-line` to mark the transition. The header cell above it inherits both stickies.

Horizontal overflow is allowed inside the table container, never on the page itself. The page never side-scrolls.

### Density variants

Three densities. Pass `density="compact" | "default" | "comfortable"` on the `Table` root.

| Density | Row height | Cell padding | When |
|---|---|---|---|
| Compact | 36px | `space-2` y, `space-3` x | Webhook deliveries, audit log, anywhere the row is a record the user scans by the hundred |
| Default | 48px | `space-3` y, `space-4` x | Team management, properties, jobs list. The everyday case |
| Comfortable | 56px | `space-4` y, `space-4` x | Surfaces where each row carries an avatar and two lines of text |

Density does not change type tokens. Body cells stay `text-body`, ID columns stay `text-mono`, headers stay `text-micro text-muted`. Only height and padding change.

Compact tables still meet the 32px desktop touch target through cell padding; the visual row is 36px but the click target on inline actions extends to the row edges.

### Row selection

A selection column is added as the first column when bulk actions are available on the surface. It contains a `Checkbox` per row and a master checkbox in the header.

- Master checkbox states. Unchecked when no rows are selected. Indeterminate when some rows are selected. Checked when all rows on the current page are selected.
- Selecting on one page does not select rows on other pages. A banner appears above the table when the selection is partial across pages, with a "Select all 1,247 matching rows" link.
- Shift-click on a row checkbox selects the range between the last clicked row and the current row.

When `selection.size > 0`, a bulk-action toolbar replaces the page's filter row. It carries:

- A `text-body-strong` count: "3 selected".
- The actions available for the selection (e.g. `Resend`, `Disable`, `Delete`).
- A trailing "Clear selection" `ghost` button.

The toolbar fill is `bg-brand-soft`, height 48px, padding `space-4` horizontal, no border. It animates in over `motion-base`. Escape clears the selection and restores the filter row.

### Inline actions

The rightmost column is reserved for the per-row action menu. The header cell is empty. The cell contains a three-dot `IconButton` that opens a `DropdownMenu`.

- Icon: Lucide `MoreHorizontal`, `icon-sm`.
- `aria-label` on the button names the row context: "Actions for invoice.sent".
- The menu items are sentence case verbs: "Resend", "View payload", "Disable endpoint".
- Destructive items sit at the bottom of the menu under a divider, in `text-[--color-danger]`.

If the row has only one common action, prefer a direct `ghost` button in that column over a one-item dropdown. The webhook log uses a direct "Retry" `ghost` button on failed rows, no menu.

### Mobile fallback

Below the `md` breakpoint a table renders as a stacked card list. The transformation is automatic on the `Table` primitive when the surface declares `responsive`.

- Each row becomes a `Card` with `space-4` padding.
- Each column becomes a labeled row inside the card. Label on the left in `text-micro text-muted`, value on the right in `text-body`.
- The inline action menu moves to the top-right of the card.
- Selection checkboxes move to the top-left of the card.
- Sort and filter controls stack vertically above the list.

Sticky headers do not apply on mobile. The filter row scrolls with the page.

### Row click vs row action

Clicking a row opens the entity drawer when the table represents entities (jobs, members, webhooks). Clicking an inline action does not open the drawer. Both behaviors are tested.

The row uses `cursor-pointer` only when `onClick` is set. Inline action buttons call `stopPropagation` on their click. Keyboard activation: Enter on a focused row opens the drawer; Space toggles selection.

## Pagination

Three patterns. Pick the one that fits the data shape.

| Pattern | When | Notes |
|---|---|---|
| Page-number | Static lists under 10k rows that the user might want to deep-link to a specific page | Webhook endpoints, team members, properties |
| Cursor | Live streams that grow at the head | Webhook deliveries, audit log |
| Load more | Infinite-feel surfaces where the user is browsing, not auditing | Notifications panel, activity feed inside a drawer |

### Page-number

The `Pagination` component renders below the table, right-aligned. It shows the current page, neighbors within 2, first and last, with ellipses between gaps. Page size is selectable from a `Select` to the left of the pager, with options 25 / 50 / 100.

URL contract. Page state lives in the query string: `?page=3&size=50`. The browser back button moves between pages. Reload restores position.

When the result set fits on one page, the pager is hidden but the page-size selector remains visible.

### Cursor

For tables that read from an append-only stream, page-numbers lie. A cursor pager renders two buttons: "Newer" and "Older". The webhook deliveries log uses this pattern.

- "Older" loads the next page of older rows. Disabled when no more rows exist.
- "Newer" appears only when the user has paged backward. It loads rows newer than the current head.
- The current view does not auto-prepend new rows. A subtle inline banner appears at the top of the table: "12 new deliveries since you opened this view. Refresh."

The cursor itself lives in the URL as an opaque token: `?after=eyJ0c...`.

### Load more

A single `secondary` button at the bottom of the list, full width inside the container. Label "Load 20 more". Disabled with label "All loaded" when the stream ends.

This pattern is used only on surfaces where the user is browsing without a goal. Tables never use load-more.

## Filtering

### Filter chips

Filter chips sit in a horizontal row above the table. The row uses `space-2` between chips and wraps to a second line on small viewports.

Two states.

- Idle chip. `bg-surface`, `border-line`, `text-default`, leading icon `icon-xs` in `text-muted`. The chip is a `secondary` button at `sm` size.
- Active chip. `bg-brand-soft`, no border, `text-brand`, trailing close `IconButton` at 14px. Clicking the body of the chip reopens the popover; clicking the close removes the filter.

A chip with multiple selected values shows the count: "Status (3)". A chip with a single selected value shows the value: "Status: Delivered".

### Filter popover

For dimensions with more than four values, the chip opens a `Popover` containing a `MultiCombobox`. The popover anchors below the chip with 8px offset.

- Width matches the chip's content width, minimum 240px.
- Header line: dimension name in `text-micro text-muted`.
- Search input at the top when more than 8 options.
- Options list with checkboxes. Max height 280px, scrolls inside.
- Footer with "Clear" `ghost` button on the left and "Apply" `primary` button on the right. Apply commits the selection and closes the popover.

For dimensions with four or fewer values, a `DropdownMenu` of checkable items is enough. No Apply button; selection commits on each toggle.

### Search input

When the surface supports free-text search, an `Input` with leading magnifier icon sits at the start of the filter row. Width 240px desktop, full width mobile.

- Debounce 200ms. The request fires 200ms after the last keystroke.
- A leading `Loader2` icon replaces the magnifier while the request is in flight.
- Escape clears the input and refocuses it.
- The search term lives in the URL: `?q=brookline`.

The search input is not a filter chip. It sits to the left of the chips, separated by a vertical divider in `border-line`.

### URL contract for filters

Every filter dimension reads from and writes to the URL. The contract is stable so coordinators can share links.

```
?status=delivered,retrying&endpoint=hooks/jobs&q=brookline&sort=timestamp.desc&page=2&size=50
```

The page rehydrates entirely from the URL on load. No filter state lives only in component state.

### Empty filtered state

When filters exclude every row, the table body is replaced with an inline empty state inside the table container.

- Title `text-h3`: "No rows match these filters."
- Description `text-body text-muted`: "Try a broader range or remove a filter."
- Action `secondary` button: "Clear filters." Clicking it removes all filter chips, the search term, and resets the URL to the base view.

This is different from a brand-new-surface empty state (the "No webhooks yet" case below). Filtered-empty is a recoverable state. New-surface-empty is a first-run state.

## Drawer pattern for entity detail

Reference: `docs/images/ui/job-detail.png`. The drawer is the contract for the right-side detail panel that opens from a list row.

### Frame

- Width 480px on desktop, full width on mobile.
- Fill `bg-surface`, 1px `border-line` on the left edge.
- Slide in from the right over `motion-base`.
- Backdrop 40% black on the rest of the page, click-to-close.
- Trap focus on open, restore focus to the originating row on close.
- Escape closes.

### Sticky header

The header is sticky to the top of the drawer scroll container.

- Height 56px, padding `space-4` horizontal, `bg-surface`, 1px bottom border `border-line`.
- Left slot. Entity title in `text-h3`. Subtitle below in `text-small text-muted` when present (e.g. job ID in `text-mono`).
- Right slot. Close `IconButton` with Lucide `X`, `aria-label="Close"`.

### Body sections

The body scrolls. Section order is fixed across entities so users learn the layout once.

1. **Status row.** A `StatusPill` and, where the entity has a workflow, a horizontal stepper of state nodes. The active node is filled in `bg-accent`, completed nodes filled in `bg-[--color-success]`, future nodes outlined in `border-line`. See the job detail image.
2. **Details.** A two-column key-value grid. Labels in `text-micro text-muted` on the left, values in `text-body` on the right. Section heading "Details" in `text-h3`.
3. **Activity timeline.** See the Timeline section below.
4. **Related actions.** A list of cross-links to related entities (e.g. "Operator: Brookline Property Co." links to the operator detail).

Sections are separated by `space-6` vertical and a 1px `border-line` divider.

### Sticky footer

The footer is sticky to the bottom of the drawer.

- Height 64px, padding `space-4` horizontal, `bg-surface`, 1px top border `border-line`.
- One `primary` action on the right. One `secondary` to its left. No more than two actions in the footer.
- Destructive actions never live in the footer. They live inside the inline action `DropdownMenu` in the header right slot, beside the close button.

### Loading and error inside the drawer

Loading. The header and footer render immediately with skeleton title and disabled actions. The body renders three skeleton sections.

Error. If the entity fetches but a sub-resource fails (e.g. activity timeline), the timeline section shows an inline `ErrorState` with a `Retry` `ghost` button. The rest of the drawer remains usable.

If the entity itself fails to load, the drawer body shows a full-section error: title "Couldn't load this job.", description with the cause, `secondary` action "Try again".

## Detail page vs drawer

The same entity can be reached two ways. The container differs by entry point.

| Entry point | Container |
|---|---|
| From a row in a list view | Drawer |
| From a deep link, a notification, or a dashboard tile | Detail page |
| From the URL bar | Detail page |

The drawer keeps the parent list visible behind it. The user came from there, will return to it, and the context of the row neighbors matters. The detail page is the canonical home of the entity. Both render the same section blocks (status, details, timeline, related actions) so the visual contract is shared.

The drawer carries an `ExternalLink` icon button in the header right slot, beside the close. It opens the same entity in its detail page route. The route is stable: `/jobs/{id}`, `/webhooks/deliveries/{id}`, `/team/members/{id}`.

The detail page carries no close button. Its breadcrumbs link back to the parent list.

## Timeline (activity log)

The timeline renders inside the drawer or the detail page as the activity log section.

### Anatomy

A vertical line runs down the left side of the section in `border-line`, 1px. Each event is a row on this line.

| Slot | Token | Notes |
|---|---|---|
| Node | 12px filled circle, sits on the vertical line | Color by event type |
| Timestamp | `text-small text-muted`, left of node | Format "today at 10:42 AM", "yesterday", date for older |
| Description | `text-body`, right of node | The action sentence |
| Icon | `icon-sm` inside the description | Optional, leads the description |

Row spacing: `space-4` vertical between events. The vertical line connects through this space.

### Event type colors

| Type | Node fill | Description icon |
|---|---|---|
| System event | `bg-[--color-line-strong]` | Lucide `Cog` in `text-muted` |
| User action | `bg-brand` | Lucide `User` in `text-brand` |
| Webhook | `bg-[--color-info]` | Lucide `Webhook` in `text-[--color-info]` |
| Status change | `bg-accent` | Lucide `ArrowRight` in `text-[--color-warn]` |
| Error | `bg-[--color-danger]` | Lucide `AlertCircle` in `text-[--color-danger]` |

### Loading

Three placeholder rows. Each row has a circle skeleton, a 60px timestamp skeleton, and a 70%-width description skeleton. Shimmer per `01-components.md` loading rules.

### Empty

"No activity yet." in `text-body text-muted`, centered, no icon. Empty timelines are rare; most entities have at least a creation event.

## Code and JSON viewer

`JsonViewer` (catalog entry in `01-components.md`) renders read-only structured payloads. Used for webhook request bodies, webhook response bodies, signed headers, and audit log diffs.

### Frame

- Fill `bg-canvas`, 1px `border-line`, `radius-md`.
- Font `text-mono`, line height 1.45.
- Padding `space-3` all sides.
- Line numbers in a gutter, `text-mono text-muted`, right-aligned, 1px right border in `border-line`. Numbers are not selectable.
- Max height 360px in a drawer. Inner scroll. Larger on the detail page.

### Copy

A `Copy` `IconButton` sits in the top-right inside the viewer frame, 8px inset. Clicking copies the full payload to clipboard and triggers a toast with `default` variant: "Copied."

The copy button uses Lucide `Copy` idle and Lucide `Check` for 1.2s after the copy succeeds.

### Headers

For signed headers, the viewer renders a key-value list rather than JSON. Each key in `text-mono text-default`, value in `text-mono text-muted`. The same frame, the same copy button. See the webhook log image for the `pms.brookline/test/hooks/jobs` payload and headers stack.

### Long payloads

Payloads over 64KB are not rendered inline. The viewer shows a placeholder with a "Download payload" `secondary` button. The size is shown in `text-small text-muted` next to the button.

## Status pill usage matrix

The `StatusPill` variants are defined in `01-components.md`. The mapping from domain status to variant is fixed per entity.

### Job status

| Status | Variant | Notes |
|---|---|---|
| Scheduled | `neutral` | Future job, not yet started |
| En route | `info` | Worker has been dispatched |
| In progress | `progress` | Worker has tapped start |
| Completed | `success` | Worker has tapped done |
| Verified | `success` | Coordinator has confirmed completion |
| Cancelled | `danger` | Job was cancelled before completion |

Verified and Completed share `success`. The pill label disambiguates; both states are positive endpoints of the workflow.

### Webhook delivery

| Status | Variant | Label format |
|---|---|---|
| Delivered | `success` | "Delivered 200" (HTTP code as suffix) |
| Retrying | `progress` | "Retrying" |
| Failed | `danger` | "Failed 502" (HTTP code as suffix) |

The HTTP code lives inside the pill label in `text-mono`, separated by a space. See the webhook log image.

### Invitation status

| Status | Variant | Notes |
|---|---|---|
| Pending | `info` | Invite sent, not yet accepted |
| Accepted | `success` | Member has joined |
| Expired | `danger` | Invite past its window without acceptance |

### Cross-cutting rule

A status pill is never used as a button. It is a display element. When the user needs to change a status, the affordance is a separate `Button` in the row's action menu or in the drawer footer.

## Empty list states

For a brand-new surface with zero rows, the table is replaced entirely by the `EmptyState` component from `01-components.md`. This is different from the filtered-empty state above.

| Surface | Title | Description | Action |
|---|---|---|---|
| Webhooks | "No webhooks yet." | "Add an endpoint to start receiving deliveries." | `primary` "Add endpoint" |
| Team | "Only you so far." | "Invite a coordinator or worker to start assigning jobs." | `primary` "Invite member" |
| Properties | "No properties yet." | "Add a property to start scheduling jobs at it." | `primary` "Add property" |
| Audit log | "No events yet." | "Activity will appear here as your team uses the product." | none |

The empty state replaces both the table and the filter row. Filters do not appear when there is nothing to filter.

## Accessibility checklist for data display

- Every sortable header is a real `<button>` inside `<th>` with `aria-sort` reflecting current state.
- Every row that opens a drawer is keyboard-focusable. Enter opens.
- Selection checkboxes carry `aria-label` naming the row they select.
- The bulk-action toolbar announces the new count to assistive tech on appearance ([NEEDS: aria-live region spec for selection count]).
- Filter chips announce their removal: clicking close on "Status: Delivered" announces "Removed status filter".
- The drawer traps focus on open and restores focus on close.
- The timeline is a `<ol>` with each event as a `<li>`. Timestamps use `<time datetime>` with the ISO value, even when the visible label is humanized.

See `13-accessibility-and-motion.md` for the full a11y patterns.

## Done checklist

A data-display surface is done when:

- Container is correct (table, card list, or kanban) for the data shape.
- Sortable columns work via mouse and keyboard, and the sort state lives in the URL.
- Filters work via mouse and keyboard, debounced search at 200ms, and all filter state lives in the URL.
- Pagination matches the pattern for the data shape and lives in the URL.
- Selecting more than zero rows replaces the filter row with the bulk-action toolbar.
- Inline action menu is reachable by keyboard and does not propagate to row click.
- Mobile fallback renders the row as a stacked card.
- Drawer opens with the row context preserved, header and footer are sticky, focus is trapped and restored.
- Detail page route exists for the same entity, reachable from the drawer's external link.
- Status pills follow the mapping tables above.
- Filtered-empty and new-surface-empty states are both implemented.
- Timeline renders five event types with the right node colors and icons, and degrades to skeletons during load.
- JSON viewer renders read-only with line numbers and a working copy button.

## Gaps

- Bulk-action toolbar announcement to assistive tech has no documented `aria-live` region spec yet. [NEEDS: aria-live region spec for selection count]
- Cursor pagination's "12 new deliveries" inline banner has no documented refresh animation. [NEEDS: realtime-banner motion spec]
- The drawer external-link icon button has no documented behavior when the entity has no canonical detail route (some surfaces may not have one in v0.1). [NEEDS: rule for surfaces without a detail page]
- The mobile fallback rules for sticky-column tables are unwritten; horizontal scroll on mobile is currently undefined. [NEEDS: mobile horizontal-scroll table spec]
- Saved filter views (per-user saved searches) are out of scope for v0.1 but a likely v0.2 ask. [NEEDS: saved filter views design when scheduled]
- JSON viewer's syntax highlighting palette is not yet defined; current spec is monochrome `text-mono`. [NEEDS: JSON syntax color tokens]
- Long-payload download flow has no documented progress or error state. [NEEDS: payload download error and progress spec]
