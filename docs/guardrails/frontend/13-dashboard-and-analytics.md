# 13 — Dashboard and analytics

The Overview page is the first surface a coordinator sees after login. Its job is to answer three questions inside a single screen, without scrolling on a 13-inch laptop. How much work got done, how reliably did it land, and where is the volume going. Everything on the page serves one of those three answers. Anything that does not is on a different page.

Visual contract for this chapter is `docs/images/ui/analytics.png`. If the implementation drifts from that image without a corresponding PR to this guide, the implementation is wrong.

## Page anatomy

The Overview page sits inside the standard app shell from `03-layout-and-navigation.md`. The page header carries the title `Overview` in `text-h1`, and two trailing controls aligned to the right. The trailing slot holds the date range picker, then the export button, in that order.

Below the header is a fixed three-row vertical rhythm.

| Row | Content | Grid |
|---|---|---|
| 1 | Three `KpiCard`s | 3 columns, equal width, `space-4` gap |
| 2 | One wide chart card, jobs by status over time | Full width |
| 3 | Two side by side cards, top properties and worker sparklines | 2 columns, equal width, `space-4` gap |

Row spacing between rows is `space-6`. Top padding under the page header is `space-6`. Bottom padding before the page edge is `space-8`.

The whole grid is capped at `max-w-screen-2xl` and centered. On wider monitors the empty side gutters stay neutral `bg-canvas`. The page never grows past that cap.

## KPI cards

Three cards in row 1, in this fixed order. Order matters; coordinators learn the layout and scan it positionally.

| Position | Label | Value format | Delta direction that is good |
|---|---|---|---|
| 1 | `Jobs completed` | Integer with grouping separator | Up |
| 2 | `On time rate` | Percentage with one decimal | Up |
| 3 | `Avg job duration` | Duration, `m s` units, monospaced | Down |

### Anatomy

`KpiCard` is the composition documented in `01-components.md`. The slots in order, top to bottom inside the card.

| Slot | Token | Notes |
|---|---|---|
| Label | `text-micro text-muted` | Fixed copy from the table above |
| Value | `text-display tabular-nums text-default` | One line, no wrap |
| Delta | `text-small` with arrow glyph | Color depends on direction and metric semantics |

Card itself uses the standard `Card` spec. Fill `bg-surface`, 1px `border-line`, `radius-xl`, `space-5` padding, no shadow.

The delta sits directly under the value with a `space-2` gap. The arrow is a Unicode triangle glyph (`▲` or `▼`), not a Lucide icon, so it stays inline with the number and inherits color cleanly.

### Delta semantics

A delta is the relative change against the previous comparable window. Last 30 days compares to the prior 30 days. This month compares to last month at the same day index.

The rule is the same for every card. Positive delta means the metric improved. The color is always `--color-success` when the metric improved, always `--color-danger` when it got worse. The arrow direction follows the raw number, not the sentiment.

| Metric | Raw change | Arrow | Color |
|---|---|---|---|
| Jobs completed | +120 | `▲` | success |
| Jobs completed | -8 | `▼` | danger |
| On time rate | +0.8 pt | `▲` | success |
| On time rate | -1.4 pt | `▼` | danger |
| Avg job duration | -2m (faster) | `▼` | success |
| Avg job duration | +3m (slower) | `▲` | danger |

Tooltip on hover of the delta shows the comparison window in plain language, like `vs previous 30 days`. Tooltip uses the `Tooltip` component from `01-components.md`.

If the previous window has no data, the delta slot renders `no prior data` in `text-small text-muted` with no arrow and no color.

### Loading state

A skeleton replaces the value slot while the metric is in flight. The label is rendered from static config, so it never skeletons. The skeleton is a single rectangle, height matching `text-display` line box, width 56% of the value slot, `radius-md`, shimmer per `01-components.md`.

The delta slot in loading state renders a thinner skeleton rectangle at 30% width, height matching `text-small` line box.

### Empty state

A metric is empty when the current window has zero jobs, not when the API failed. Failure is an error state on the card, not an empty state.

Empty value renders an em-dash glyph (`—`) at the same `text-display tabular-nums` token, color stepped down to `text-muted`. Below the em-dash, in the delta slot, the copy reads `no data yet` in `text-small text-muted`. No arrow.

### Error state

If the metric fetch fails after retry, the card stays mounted, the label stays in place, and the value slot renders `unavailable` in `text-small text-muted`. A retry `IconButton` with a `RefreshCw` Lucide icon sits in the delta slot. No toast on a per-card failure, the card communicates the failure itself.

## Charts

Three charts on the page. Each one carries a single answer. None of them is interactive beyond hover tooltips and the page-level date range picker in v0.1. Drilldown is documented under Gaps.

### Stacked area chart, jobs by status over time

Row 2. Lives inside a standard `Card` titled `Jobs by status over time` in `text-h3`. Subtitle below the title in `text-small text-muted` echoes the active date range, like `Last 30 days`.

The chart fills the card body. Height is fixed at 280px on desktop, 220px below `md`. The card padding is `space-5` on all sides, the chart sits flush inside that padding.

Four stacked series, ordered bottom to top.

| Series | Color token | Order from bottom |
|---|---|---|
| Completed | `--color-navy` | 1 |
| In progress | `--color-amber` | 2 |
| Scheduled | `--color-line-strong` | 3 |
| Cancelled | `--color-danger` | 4 |

X axis is days for windows up to 60 days, weeks for windows up to 6 months, months beyond that. Tick labels use `text-small text-muted`. The grid is horizontal-only, 1px in `--color-line`, no vertical grid lines.

Y axis is job count, left-aligned, tabular numerals, `text-small text-muted`. Axis title `Job count` sits above the topmost tick in `text-micro text-muted`.

Legend sits below the chart, centered, with `space-4` top gap. Each legend item is a `radius-full` 8px swatch in the series color followed by the label in `text-small text-default`. Items are separated by `space-4` horizontal gap. The legend is static in v0.1, clicking it does nothing.

Tooltip on hover shows the day total at the top in `text-body-strong`, then a per-series breakdown stacked under it. Each row carries a swatch, the series name, and the count with tabular numerals right-aligned. Tooltip uses `shadow-pop`, `radius-md`, `space-3` padding, `bg-surface`. The vertical hover guide is a 1px dashed line in `--color-line-strong`.

### Horizontal bar chart, top properties by job volume

Row 3, left card. Title `Top properties by job volume` in `text-h3`, subtitle in `text-small text-muted` echoing the active range.

Shows the top 5 properties by job count in the window. Bars are stacked vertically, one row per property. Each row contains the property name on the left in `text-body`, the bar in the middle, and the count on the right in `text-mono tabular-nums`.

| Element | Token |
|---|---|
| Row height | 32px |
| Row gap | `space-3` |
| Bar fill | `--color-navy` |
| Bar background track | `--color-navy-fade` |
| Bar radius | `radius-sm` |
| Bar height | 8px, vertically centered in the row |
| Numeric label color | `text-default` |

The bar widths are normalized to the largest value in the set, which gets 100% of the available track width. Right-aligned numeric labels reserve a fixed 56px column so the right edge is a straight line across all rows.

If a property has zero jobs in the window, it does not appear at all. The chart never renders a zero-width bar.

When fewer than 5 properties have any jobs in the window, the chart renders only the populated rows and the card height shrinks. No skeleton placeholders for missing positions.

### Sparkline list, workers last 7 days

Row 3, right card. Title `Workers, last 7 days` in `text-h3`. No subtitle. This card is fixed to a 7 day window and ignores the page-level date range picker. That coupling is the price of having a focused snapshot of recent worker activity.

Shows up to 5 workers, ordered by jobs completed in the window. Each row has three slots.

| Slot | Content | Token |
|---|---|---|
| Worker | Name in `text-body`, no avatar | Left |
| Jobs completed | Integer in `text-mono tabular-nums` | Center-right, 56px column |
| Sparkline | Inline tiny line chart, 7 daily values | Right, 96px wide, 24px tall |

Sparkline stroke is `--color-navy`, 1.5px, no fill, no dots. Y axis is normalized per row to that worker's own min and max so the shape carries information regardless of absolute volume.

Header row of the card uses `text-micro text-muted` column labels `Worker`, `Jobs completed`, `Trend`. The trend column header is the only label that is not a direct restatement of the data underneath, used to teach what the sparkline shows.

Hover on a sparkline does not surface a tooltip in v0.1. Drilldown to the worker detail page is deferred and listed under Gaps.

## Date range picker

The picker is a composition built on `Popover` and `Calendar`, exposed as `DateRangePicker` in `01-components.md`. It sits in the page header, top right of the page, just left of the export button.

### Trigger

The trigger renders as a `Button variant="secondary" size="md"`. Leading icon `CalendarDays` in `icon-sm`. Label is the current range, formatted by preset or by custom range.

| State | Label format | Example |
|---|---|---|
| Preset selected | The preset name | `Last 30 days` |
| Custom range | Short month and day, en separator | `Mar 1 to Mar 28` |
| Same year both ends | No year shown | `Mar 1 to Mar 28` |
| Different years | Year on both ends | `Dec 28, 2025 to Jan 3, 2026` |

Trailing icon `ChevronDown` in `icon-sm`, rotates 180 degrees when the popover is open per `motion-fast`.

### Popover

Opens flush to the right edge of the trigger, `space-2` below it. Width is fixed at 560px on desktop, full width minus `space-4` on mobile.

Content is split into two regions. A vertical preset rail on the left at 160px wide, and a calendar region on the right.

Preset rail entries, top to bottom.

| Preset | Window |
|---|---|
| Last 7 days | Trailing 7 calendar days ending today |
| Last 30 days | Trailing 30 calendar days ending today |
| Last 90 days | Trailing 90 calendar days ending today |
| This month | First of current month to today |
| Last month | First to last day of previous month |
| Custom | Activates calendar selection |

Each preset is a button styled like a menu item. Selected preset gets `bg-brand-soft` fill and `text-brand` weight 600. Others use `text-default`. Hover uses `bg-canvas`. Item height 36px, padding `space-3` x.

The calendar region shows two months side by side, the current month on the right and the previous month on the left. Range selection works edge to edge across both calendars. Past dates are selectable down to the operator account creation date, which is the floor. Future dates are disabled, because analytics has no forward data.

Footer of the popover has a right-aligned action group with `Cancel` as `secondary` and `Apply` as `primary`. Apply commits the selection and closes the popover. Cancel discards and closes. Escape key behaves like cancel.

### URL persistence

The current range is mirrored to the URL query string so a range can be shared by copying the URL.

| Range type | Query format | Example |
|---|---|---|
| Preset | `?range=<preset_key>` | `?range=last_30d` |
| Custom | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | `?from=2026-03-01&to=2026-03-28` |

Preset keys are `last_7d`, `last_30d`, `last_90d`, `this_month`, `last_month`. The default when no query is present is `last_30d`.

When the user picks a preset, the URL writes the preset form. When the user picks a custom range, the URL writes the explicit from and to. Reloading the page reads the URL and restores the picker state before the first metric request fires.

## Export

The export button sits at the top right of the page, after the date range picker.

It renders as `Button variant="secondary" size="md"` with a leading `Download` icon in `icon-sm`. The label is the single word `Export`. The button is the trigger for a `DropdownMenu`, so it also carries a trailing `ChevronDown` in `icon-sm`.

Menu items.

| Item | Status | Notes |
|---|---|---|
| Export as CSV | Active in v0.1 | Generates a CSV of the current page data scoped to the active range |
| Export as PDF | Disabled in v0.1 | Tooltip on hover reads `Coming in v0.2` |

The CSV file name format is `crewmate-overview_<from>_<to>.csv`, using the active range. Generation is synchronous on the client for windows up to 90 days. Beyond that the request hits a background job and a toast confirms `Export started, we will email you the file` per the voice rules in `00-design-system.md`.

The disabled PDF item still appears in the menu so operators discover it is coming. It uses the disabled state from the `DropdownMenu` component.

## Empty dashboard state

First-load operator with no jobs sees the full page shell, the page header, the date range picker, the export button, but the row 1 through row 3 grid is replaced with a single centered `EmptyState`.

| Slot | Content |
|---|---|
| Icon | `BarChart3` in `icon-xl`, `text-muted` |
| Title | `Schedule your first job to see analytics here.` |
| Description | `Create a job from the dispatch board to start tracking completion, on time rate, and worker activity.` |
| Action | `Button variant="primary" size="md"` labeled `New job`, routes to `/dispatch` |

The empty state vertically centers inside the available space below the page header, capped at `max-w-md`. The export button is disabled in this state with a tooltip `No data yet`.

The picker stays enabled, because changing the range can move out of the empty state if older windows do have data. The empty state is per range, not per account.

## Responsive behavior

The page is desktop-first but degrades cleanly.

| Breakpoint | Row 1 KPIs | Row 2 chart | Row 3 cards |
|---|---|---|---|
| `lg` and up | 3 columns | Full width | 2 columns |
| `md` to `lg` | 3 columns | Full width | 2 columns |
| Below `md` | 1 column, stacked | Full width, height 220px | 1 column, stacked |

Date range picker trigger label truncates with ellipsis below 360px viewport. The popover docks to the right edge of the page on tablet and goes full width minus `space-4` on phone.

Export dropdown anchor flips to the left edge of the trigger on phone so the menu does not clip the viewport.

Sparkline width stays at 96px regardless of breakpoint. If the row cannot fit name, count, and sparkline at that minimum, the sparkline drops to the next line under the name and count, and row height grows accordingly.

## Behavior notes

- The page-level date range affects all three KPI cards, the stacked area chart, and the property bars. It does not affect the worker sparklines, which are locked to a 7 day window.
- All metric requests fan out in parallel from a single page load. Each card and chart owns its own loading and error state, so a slow series does not block the others.
- Switching the date range cancels in-flight requests for the previous range and starts the new ones.
- Polling is not used. Operators refresh by reloading or changing the range.

## Tab order

| Order | Element |
|---|---|
| 1 | Date range picker trigger |
| 2 | Export button |
| 3 | KPI card 1 (focusable for screen-reader announcement of label, value, delta) |
| 4 | KPI card 2 |
| 5 | KPI card 3 |
| 6 | Stacked area chart container (announces title and current range) |
| 7 | Property bars container |
| 8 | Worker sparklines container |

KPI cards are focusable so assistive tech can read the value and delta as a single unit, but they are not clickable in v0.1.

## Done checklist

- Three KPI cards in the documented order, with the documented delta semantics.
- Loading skeleton, empty em-dash, and error retry states all render.
- Stacked area chart matches series order, colors, legend, tooltip from this chapter.
- Property bars are right-aligned with tabular numerals and never render zero-width rows.
- Worker sparklines are fixed to 7 days regardless of page range.
- Date range picker persists to the URL and restores from it on reload.
- Export dropdown renders, CSV path works, PDF item is disabled with the documented tooltip.
- Empty dashboard state renders with the documented copy and routes the action to `/dispatch`.
- All breakpoints stack as documented.
- Tab order matches the table.
- Lighthouse a11y at or above 95 on the page.

## Gaps

- PDF export is deferred to v0.2. The menu item is rendered disabled with a tooltip in v0.1.
- Drilldown from any chart or card to a filtered list view is deferred. Sparklines, property bars, and KPI cards are not clickable in v0.1.
- Custom dashboards, where an operator picks which metrics to surface, are deferred. The Overview page is fixed in v0.1.
- Legend toggling on the stacked area chart is deferred. Clicking a legend item does nothing in v0.1.
- The CSV export does not yet include the worker sparkline data. Only KPIs, status time series, and property volumes are in the v0.1 CSV.
- Comparing to a custom prior window is deferred. Deltas always compare to the previous equal window.
- Token `[NEEDS: chart-grid]` for a dedicated chart gridline color, currently reused from `--color-line`. If grid contrast tests fail, this gets added to `00-design-system.md`.
- Token `[NEEDS: sparkline-stroke]` if the navy stroke proves too heavy at 1.5px on a 24px tall row in user testing.
