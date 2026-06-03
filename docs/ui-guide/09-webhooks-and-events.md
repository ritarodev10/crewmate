# 09 — Webhooks and events

The operator-facing window into the webhook spine. When an event fires inside CrewMate, the platform fans it out to subscribed endpoints, signs each request, retries on failure, and writes a row for every attempt. This chapter covers the two screens that expose that machinery to a tenant_admin or coordinator.

The reference visual lives at `docs/images/ui/webhook-log.png`. The event taxonomy this UI surfaces is defined in `nestjs-ai-guardrails/06-EVENTS.md`.

## Purpose of the surface

A webhook is a promise the product makes to a tool the operator already owns. When the promise is kept, nobody looks at this page. When it isn't, this page is the first thing a coordinator opens. So the surface optimizes for one workflow.

1. Notice that something failed.
2. See which event, to which endpoint, with what response.
3. Decide whether to retry, fix the endpoint, or escalate.

Everything below serves that workflow. No marketing copy, no charts, no "delivery health" gauge. A table, a panel, and a retry button.

## The two screens

| Route | Title | Owns |
|---|---|---|
| `/webhooks` | Webhook deliveries | The log. Every attempt for every endpoint, filterable. |
| `/settings/webhooks` | Webhook endpoints | The list of endpoints, their event subscriptions, and their signing secrets. |

The deliveries log is the default landing surface when the sidebar item is clicked. The configuration screen is reachable from the topbar of the log and from the settings index.

## Webhook deliveries log

The table at `/webhooks`. See chapter 05 for the `Table`, `Pagination`, and `StatusPill` base patterns this screen reuses. This chapter only documents the deltas.

### Page header

A single row across the top of the page.

| Slot | Content | Token |
|---|---|---|
| Title (left) | "Webhook deliveries" | `text-h1` |
| Action (right) | "Retry failed" outline button | `Button` variant `secondary`, size `md` |

The retry action is disabled when no rows on the current page have `Failed` status. When enabled, it enqueues a retry for every failed row in the current filter set, not just the current page, and shows a confirmation toast with the count.

### Filter row

Sits directly below the header, separated by `space-4`. Filters are inline controls, not a sidebar.

| Filter | Component | Source |
|---|---|---|
| Events | `Combobox` | The event taxonomy table below. First option is "All events". |
| Time window | `Select` | Last 24h, Last 7d, Custom. "Custom" opens a `DateRangePicker`. |
| Status | `Select` | All, Delivered, Retrying, Failed. |

The three controls sit on one row, left-aligned, separated by `space-2`. On viewports below `md`, they wrap to a second row and each control becomes full width.

### Active filters

When any filter has a non-default value, a row of removable chips renders below the filter controls, separated by `space-2`. Each chip is a `Badge` with a trailing `X` icon button. Clicking the X resets that filter to its default. A "Clear all" `LinkButton` appears at the end of the chip row when more than one filter is active.

Active filters are reflected in the URL as query params, so the view is shareable.

### Table

The base spec is in chapter 05. The columns specific to this surface are listed below.

| Column | Token | Notes |
|---|---|---|
| Status | `StatusPill` | Semantics in the table below. |
| Event | `text-body` | The event name in plain text. `text-mono` for the dotted segments. |
| Endpoint | `text-body` | The endpoint URL, truncated with ellipsis on overflow. Full URL on hover via `Tooltip`. |
| Attempt | `text-body tabular-nums` | "1 of 5" format. |
| Timestamp | `text-small text-muted` | Relative time on default ("2m ago"), absolute on hover via `Tooltip`. |
| Latency | `text-body tabular-nums` | "184 ms". Right-aligned. Muted when status is Failed with no response. |

Rows are sortable on Timestamp (default, descending) and Latency. The other columns are filterable, not sortable.

Row click selects the row, which opens the detail panel. The selected row uses the standard table selected-row treatment from chapter 05 (left border 2px `bg-brand`, fill `bg-brand-soft`).

### Pagination

Cursor-based, since the log is append-only and can grow unbounded. The footer renders the current range ("1 to 25 of 248") on the left and prev/next controls on the right. See chapter 05 for the `Pagination` component.

### Selected-row detail panel

When a row is selected, the right side of the page collapses into a pinned `Drawer`. Unlike the standard drawer behavior in chapter 01, this one is pinned open while a row is selected and does not render a backdrop. The table to the left of it stays interactive.

| Property | Value |
|---|---|
| Width | 480px |
| Position | Right edge of page, pinned |
| Backdrop | None |
| Slide-in | 180ms `motion-base` on first open in the session |
| Close | Click the selected row again, click outside the table, or press Escape |

The panel scrolls independently when its content exceeds the viewport height.

#### Panel anatomy

| Block | Content | Tokens |
|---|---|---|
| Header | Endpoint URL (truncated), request ID, timestamp | URL in `text-h3`, request ID in `text-mono text-small text-muted`, timestamp in `text-small text-muted` |
| Status block | `StatusPill` (large), HTTP code, latency | Pill at the standard 22px height. HTTP code in `text-h2 tabular-nums`. Latency in `text-small text-muted` next to the code. |
| Payload | `JsonViewer` of the request body | With copy button in the block header |
| Signed headers | `JsonViewer` of the request headers | Includes `x-crewmate-signature`, `x-crewmate-event`, `x-crewmate-delivery-id`. Copy button in the block header. |
| Activity timeline | `Timeline` of every attempt | One entry per attempt, with timestamp, outcome, and response code |
| Actions | "Retry now" primary, "Open endpoint settings" link | Sticky footer of the panel |

The two `JsonViewer` blocks share the same component. The "Signed headers" block uses the JSON viewer in flat-key mode (one key per row, no nesting), since headers are flat.

Each timeline entry shows the attempt number, the time delta from the previous attempt, the response code, and the latency. Failed attempts include a one-line error reason underneath, in `text-small text-[--color-danger]`.

The "Open endpoint settings" link navigates to the endpoint's detail page at `/settings/webhooks/[endpointId]`, preserving the selected delivery in the URL hash so the back button returns to the same row.

## Webhook endpoints configuration

The screens at `/settings/webhooks` and `/settings/webhooks/[endpointId]`.

### List page

A grid of endpoints, one per `Card`. The page header has the title "Webhook endpoints" and a primary "Add endpoint" button on the right.

#### Endpoint card anatomy

| Slot | Content | Token |
|---|---|---|
| Title | The endpoint URL, truncated | `text-h3` |
| Status pill | Active, Paused, Failing | `StatusPill` variants in the table below |
| Subscriptions | A `Badge` for each subscribed event domain | `Badge` neutral, max 4 visible, "+N" overflow |
| Last delivery | "Delivered 2m ago" or "Failed 14m ago" | `text-small text-muted` |
| Footer link | "Open settings" | `LinkButton` |

The card is clickable. The whole card area is one link to the endpoint detail page. The "Open settings" link is for screen reader and keyboard parity, not a separate target.

Endpoints are sorted by last delivery descending, with failing endpoints pinned to the top regardless of recency.

#### Card status mapping

| Endpoint state | Pill variant | Label |
|---|---|---|
| Active, last delivery succeeded | `success` | "Active" |
| Active, last delivery failed once | `progress` | "Retrying" |
| Active, last delivery exhausted retries | `danger` | "Failing" |
| Paused by an operator | `neutral` | "Paused" |

### Endpoint detail page

The screen at `/settings/webhooks/[endpointId]`. A single-column form layout, max width 720px, centered. The form uses `FormField`, `Input`, `Checkbox`, and `Switch` from chapter 01.

#### Sections

| Section | Controls |
|---|---|
| Identity | URL (`Input`, required), description (`Input`, optional) |
| Event subscriptions | One `Checkbox` per event, grouped by domain. See the taxonomy table below. |
| Signing secret | Read-only display of the secret hash, a "Rotate secret" `Button` variant `secondary`, and a "Show last 4" hint |
| Delivery controls | "Pause deliveries" `Switch`, "Test delivery" `Button` |
| Danger zone | "Delete endpoint" `Button` variant `danger`, opens a `ConfirmDialog` |

Save is a sticky footer with `Button` variant `primary` (Save changes) on the right and `Button` variant `ghost` (Discard) on the left. The footer only appears when the form is dirty.

#### Signing secret rotation

The signing secret is shown once, in plain text, only at two moments.

1. When the endpoint is first created. A `Dialog` with the secret, a copy button, and a "I've saved it" primary button. The dialog cannot be dismissed by clicking the backdrop, only by the button or the close icon.
2. When the operator clicks "Rotate secret" and confirms in a `ConfirmDialog`. The new secret is then shown in the same one-time `Dialog`.

At rest, the UI shows only the secret hash and the last 4 characters of the actual secret, both in `text-mono text-small text-muted`. The product never re-displays a secret it has already shown once.

#### Test delivery

"Test delivery" opens a `Dialog` with a `Combobox` for the event type to simulate. The default selection is `webhook.endpoint.test`. On confirm, the dialog closes, a toast appears ("Test delivery enqueued"), and the user is routed to `/webhooks` with the test delivery's row pre-selected and the detail panel open.

The synthetic event uses the same delivery pipeline as real events. Its payload is fixture data, not live tenant data. The `x-crewmate-event` header is set to the chosen event name. The activity timeline marks the entry as a test in `text-small text-muted`.

## Event taxonomy

The full canonical list is in `nestjs-ai-guardrails/06-EVENTS.md`. The UI groups events by domain, in this order. Each row in the subscriptions form and each option in the event filter combobox comes from this table.

| Domain | Event | Fires when |
|---|---|---|
| Job | `job.created` | A coordinator creates a new job. |
| Job | `job.assigned` | A worker is attached to a job. |
| Job | `job.status.changed` | A job moves between any two statuses (scheduled, en route, in progress, completed, blocked). |
| Worker | `worker.invited` | A worker invitation is sent. |
| Worker | `worker.assigned` | A worker accepts an assignment to a job. |
| Webhook | `webhook.endpoint.test` | An operator clicks "Test delivery". |
| Webhook | `webhook.delivery.failed` | A delivery exhausts retries. Emitted in-process only, not delivered to webhooks (would loop). |

Two rules carry from the events spec into this UI.

- Past tense in labels. The combobox shows "Job created", not "Create job".
- No outcome suffixes. There is no `job.created.success`. Either it happened or it did not.

The `webhook.delivery.failed` event is listed in the subscriptions form but is grayed out with a `Tooltip` that reads "Internal event. Not delivered to webhooks."

## Status pill semantics for delivery rows

The mapping the `Status` column and the panel header use. This is the only place these labels appear in the product, so the mapping is fixed.

| Delivery state | `StatusPill` variant | Label | Suffix |
|---|---|---|---|
| Delivered, 2xx response | `success` | "Delivered" | HTTP code, e.g. "Delivered 200" |
| Retrying, attempt in flight | `progress` | "Retrying" | Attempt count, e.g. "3 of 5" |
| Failed, retries exhausted, response received | `danger` | "Failed" | HTTP code, e.g. "Failed 500" |
| Failed, retries exhausted, no response | `danger` | "Failed" | "no response" |
| Awaiting first attempt | `info` | "Queued" | None |

The suffix renders inside the pill, in `text-micro` like the label, separated by a single space. No icon inside the pill.

## Empty states

The two empty surfaces this chapter owns.

| Surface | Title | Description | Action |
|---|---|---|---|
| `/webhooks` with no deliveries | "No deliveries yet." | "Add a webhook endpoint to start receiving events." | "Add endpoint" primary, links to `/settings/webhooks` |
| `/settings/webhooks` with no endpoints | "No endpoints yet." | "Add a webhook endpoint to push events to your tools." | "Add endpoint" primary |

Both use the `EmptyState` component. Icon is `Webhook` from Lucide, 32px, `text-muted`. Voice follows the rule from `00-design-system.md`. No apologies, no "Oops".

A third near-empty state exists when filters are applied and no rows match. The table renders an inline `EmptyState` in the body, with title "No deliveries match these filters." and a single `LinkButton` "Clear filters". No icon for the inline variant.

## Realtime behavior

The deliveries log subscribes to a `webhook.delivery.*` WebSocket channel for the active tenant. Two updates can arrive.

1. A new delivery. The row prepends to the top of the current page when sorted by Timestamp descending. The row mounts with a `bg-brand-soft` fill that fades to the default row background over 600ms, easing `cubic-bezier(0.2, 0, 0, 1)`. `prefers-reduced-motion` collapses the fade and the row simply appears.
2. An attempt update on an existing row. The Status pill and Attempt cell update in place. No flash, no fade. Tabular numerals keep the layout stable.

When the user is not on the top page (cursor has moved forward), new rows do not insert. Instead, a thin banner appears under the header with the message "3 new deliveries. Show latest." and a `LinkButton`. Clicking returns to the top of the log.

The endpoint list page does not subscribe to a realtime channel in v0.1. It refetches on focus.

## Permissions

The three roles that interact with this surface, mapped to scopes.

| Role | `/webhooks` | `/settings/webhooks` | Retry actions | Rotate secret |
|---|---|---|---|---|
| `tenant_admin` | Read and act | Read and edit | Yes | Yes |
| `coordinator` | Read only | Hidden | No | No |
| `worker` | Hidden | Hidden | No | No |

A coordinator viewing `/webhooks` sees the table, filters, and detail panel, but the "Retry failed" button and the panel's "Retry now" button render as disabled with a `Tooltip` "Ask a tenant admin to retry." The "Open endpoint settings" link also renders as disabled with the same pattern.

The worker mobile shell at `/app` does not surface this section at all. No nav entry, no deep link path. A direct URL navigation returns the 403 full-page error state from chapter 12.

## Keyboard

| Key | Action |
|---|---|
| `↑` `↓` | Move the selected row in the table |
| `Enter` | Open the selected row's detail panel (if not already open) |
| `Escape` | Close the detail panel and clear the selection |
| `r` | Trigger "Retry now" when the detail panel is open and the row is failed |
| `g` then `w` | Jump to `/webhooks` from anywhere (matches the global navigator pattern) |

All shortcuts respect form focus. They do not fire while a `Combobox` or `Input` has focus.

## Mobile

The deliveries log degrades to a stacked card list below `md`, following the table degradation rule from chapter 01. Each delivery becomes a card with the same six fields, labeled. The detail panel becomes a full-screen `Drawer` reached by tapping the card. The retry button moves to the drawer footer.

The endpoint configuration screens are tenant_admin only, and tenant_admin is a desktop-first role. The pages render on mobile but the form layout is not optimized below `md`. This is documented under Gaps.

## Copy reference

The strings that ship on this surface, collected so a copy review can run against them without opening the React tree. Sentence case throughout, no exclamation marks.

| Where | String |
|---|---|
| Page title, deliveries log | "Webhook deliveries" |
| Page title, endpoint list | "Webhook endpoints" |
| Primary action, deliveries header | "Retry failed" |
| Primary action, endpoint list | "Add endpoint" |
| Primary action, panel footer | "Retry now" |
| Link, panel footer | "Open endpoint settings" |
| Empty state, no deliveries | "No deliveries yet." |
| Empty state, no endpoints | "No endpoints yet." |
| Empty state, no rows match | "No deliveries match these filters." |
| Toast, retry queued | "Retry queued." |
| Toast, bulk retry queued | "Retried 14 deliveries." |
| Toast, test delivery queued | "Test delivery enqueued." |
| Toast, secret rotated | "Signing secret rotated." |
| Toast, endpoint paused | "Endpoint paused." |
| Confirm dialog, delete endpoint title | "Delete this endpoint?" |
| Confirm dialog, delete endpoint body | "Deliveries already in flight will finish. New events will stop reaching this URL." |
| Permission tooltip, retry blocked | "Ask a tenant admin to retry." |

Coordinators who cannot retry see the disabled-button tooltip with the exact "Ask a tenant admin to retry." string. The string is not parameterized with a specific admin name. Surfacing a name there leaks org structure and ages poorly when staff change.

## Telemetry hooks

Three analytics events fire from this surface. They are product analytics, not domain events, so they do not appear in the taxonomy table above.

| Event name | Fires when | Properties |
|---|---|---|
| `ui.webhook.delivery_inspected` | A row's detail panel opens | `delivery_id`, `status`, `event_name` |
| `ui.webhook.retry_clicked` | "Retry now" or "Retry failed" is clicked | `scope` (single or bulk), `count` |
| `ui.webhook.test_sent` | A test delivery is confirmed | `event_name` |

These three are the only product-analytics calls the chapter authorizes. Adding a fourth requires a PR against this chapter first.

## Done checklist

A surface in this chapter ships when every box below is checked.

- The deliveries log renders the seven columns, the three filters, and the active-filter chips.
- The detail panel uses the pinned-drawer pattern with no backdrop and matches the anatomy in this chapter.
- Both `JsonViewer` blocks have working copy buttons that emit a confirmation toast.
- The activity timeline renders one entry per attempt with the documented copy.
- "Retry failed", "Retry now", and "Test delivery" all enqueue work through the same pipeline real events use.
- The endpoint list, detail, and creation flows match the spec, including the one-time secret display rule.
- The status pill mapping in the table above is the only mapping used in the product.
- Empty states use the documented copy verbatim.
- Realtime new-row entry uses the brand-soft fade and respects reduced motion.
- Permissions match the role table. A coordinator sees disabled retry actions, not hidden ones.
- Lighthouse accessibility is 95+ on both `/webhooks` and `/settings/webhooks`.

## Gaps

- Bulk-edit of event subscriptions across multiple endpoints is not designed. The current UI requires editing each endpoint one by one. Tracked for v0.2.
- Filtering by endpoint inside the deliveries log is missing. Today an operator drills in from `/settings/webhooks` to a per-endpoint view, but that per-endpoint deliveries view is not specced. `[NEEDS: endpoint-scoped deliveries view]`
- The Custom time-window picker inherits `DateRangePicker` from chapter 01, but the timezone display rule for the deliveries log is not settled. The log currently shows the operator's local time. A toggle to switch the whole log to UTC would help integrators. `[NEEDS: timezone toggle behavior]`
- The DLQ admin tool referenced in `nestjs-ai-guardrails/06-EVENTS.md` is not surfaced in the UI. For v0.1 the assumption is that the deliveries log plus the "Retry failed" action is enough. The DLQ has its own backing table but no screen yet. `[NEEDS: DLQ admin screen or explicit decision to keep it engineer-only]`
- The mobile layout for `/settings/webhooks` is not designed. Form rendering works but the secret-rotation `Dialog` is cramped on small screens. `[NEEDS: mobile endpoint settings layout]`
- The signature verification helper snippet (a "Copy verification code" block on the endpoint detail page, with a Node and a Python example) is not specced. Integrators currently have to read the API docs to verify the HMAC. `[NEEDS: signature verification snippet block]`
- Webhook health metrics over time (delivery rate, p95 latency per endpoint) are not in this chapter. The analytics surface in chapter 04 does not cover them either. `[NEEDS: delivery health metrics, owner undecided]`

/Users/macbookpro/Documents/RITARODEV/ritarodev-context/Projects/01-Job Hunt/portfolio-projects/crewmate/docs/ui-guide/09-webhooks-and-events.md
