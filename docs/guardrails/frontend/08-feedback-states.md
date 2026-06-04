# 08 — Feedback states

The operating manual for everything that is not a normal happy-path render. Every surface in CrewMate, whether it is the dispatch board or a settings form, will at some point be loading, empty, broken, or quietly succeeding. This chapter says exactly how those moments look and behave. Other chapters describe what a page renders when the data is there. This chapter describes everything else.

Read `00-design-system.md` for the tokens used here and `01-components.md` for the underlying primitives. Nothing in this chapter invents a token or a primitive; it composes the ones already defined.

## What "feedback" means here

A feedback state is any visible thing that is not the resting render of real data. Five categories cover the whole surface area.

| Category | Primary surface | Component |
|---|---|---|
| Loading | Anywhere data is being fetched | `LoadingState` |
| Empty | A list, table, or panel with zero rows | `EmptyState` |
| Error | A request failed or input is invalid | `ErrorState`, `Banner`, inline error |
| Success | A write succeeded | `Toast`, `Banner` |
| Confirm | About to do something the user may not want | `Dialog`, `ConfirmDialog` |

Every UI surface in CrewMate must be reachable from these patterns. A new screen does not get to invent a sixth.

## Loading

Three patterns, used in this order of preference. The choice is not stylistic. It depends on whether the layout is known before the data is back.

### Order of preference

1. Skeletons. Use whenever the shape of the eventual result is known. Tables, KPI cards, drawers, lists.
2. Inline spinner. Use when an action is in flight inside an already rendered surface. The button, a single cell, a row that is being updated.
3. Page spinner. Last resort. Only for first-paint on a client-rendered route where SSR is not possible.

If a designer or engineer reaches for option 2 or 3 first, they are doing it wrong. Skeletons preserve layout, which is the entire point.

### Skeleton anatomy per surface

A skeleton is a `bg-canvas` shape with a 1200ms shimmer running left to right at `motion-fast` easing. Under `prefers-reduced-motion: reduce` the shimmer collapses to a flat `bg-canvas` fill. Skeletons are `aria-hidden="true"` because they carry no semantic information.

| Surface | Skeleton |
|---|---|
| Table | Header row rendered normally. Body shows N row placeholders matching the page size. Each row is one full-width bar at row height with cell-width segments separated by `space-4`. |
| KPI card | Label placeholder (width 60px, height 11px). Value placeholder (width 96px, height 28px). Delta placeholder (width 48px, height 13px). |
| Drawer | Header placeholder (width 60% of header, height `text-h3` line). Body shows three stacked groups, each a label bar + 2 content bars. Footer placeholder (width 96px, height 36px) aligned right. |
| Chart card | Title placeholder, then a `bg-canvas` rectangle at the chart's own height. No animated path. |
| Dispatch board column | Column header rendered normally. Three card placeholders at the standard card height with internal segments matching the JobCard anatomy. |
| Timeline | Five row placeholders. Each is a 24px circle on the left, a 60% wide label bar, and a 30% wide meta bar below. |
| Form | Placeholders for the labels and inputs at their resting heights. Buttons are not skeletonized; they render disabled. |

The skeleton always matches the resting layout to the pixel. If the real table has a 48px row height, the skeleton row is 48px. If the KPI value is `text-display`, the skeleton bar height matches the cap height of `text-display`. Layout shift on data arrival is the failure mode this exists to prevent.

### Loading region attributes

The loading region carries `aria-busy="true"` on the container that will hold the data. When the data arrives, the attribute is removed and the children swap in. Screen readers do not get a separate "loading" announcement; the busy attribute is enough.

### Inline spinner

A 14px spinner in `currentColor`. Lives inside a button when the button is in `loading` state, or in a single table cell when one row's value is being recomputed. Never used as a page-level loader. Animation is a 600ms linear spin. Under `prefers-reduced-motion: reduce` the spinner becomes a static `Loader2` glyph with `aria-label="Loading"`.

### Page spinner

A 24px spinner in `text-brand`, centered both axes inside the available viewport. The page chrome stays mounted. Used only for the first paint on a route that cannot be server rendered. Once any surface inside the page has its own data, the page spinner is gone and surface-level skeletons take over.

### Loading variants per surface

| Surface | Default pattern | Notes |
|---|---|---|
| Dashboard overview | Skeleton on each KPI card and chart card independently | KPIs resolve faster, chart cards may stay skeletoned longer |
| Tables (members, deliveries) | Table skeleton | Header is real, body is placeholders matching page size |
| Drawer (job, worker, property) | Drawer skeleton | Slides in already skeletoned, then content fades over |
| Dispatch board | Column-level skeletons | Each column resolves independently |
| Worker mobile today view | Skeleton list of three cards | [NEEDS: worker mobile skeleton image] |
| Settings forms | Field skeletons | Submit button disabled while loading |
| Webhook delivery viewer | Skeleton timeline | Payload viewer shows its own skeleton inside |
| Auth pages | No skeleton, button shows inline spinner | Auth surfaces are tiny and SSR-eligible |

## Empty states

`EmptyState` from chapter 01 is the default. Icon 32px in `text-muted`. Title `text-h3`. Description `text-body text-muted`. Action centered below when there is one.

### Tone

Never apologize. Never use exclamation marks. Name the situation in one short sentence. Point to the next step in one short sentence. If there is no next step, omit the action button rather than inventing one.

### Empty due to filters

A distinct variant. When the underlying data is non-empty but the active filters return zero rows, render the same `EmptyState` shape with copy that names the cause and offers an action to undo it.

Title: `No rows match these filters.`
Description: `Adjust or clear the filters to see results.`
Action: `Button variant="secondary"` labeled `Clear filters`.

This variant only ever appears below an active filter chip row. If the page has no filters applied and is empty, use the unfiltered empty state.

### Examples per surface

| Surface | Title | Description | Action |
|---|---|---|---|
| Dispatch SCHEDULED column | Nothing scheduled. | Add a job to start the day. | `New job` |
| Dispatch IN PROGRESS column | Nothing in progress. | Jobs move here when a worker checks in. | none |
| Dispatch COMPLETED column | Nothing completed yet. | Completed jobs land here. | none |
| Worker today | No jobs today. | Check back later or ask your coordinator. | none |
| Webhook deliveries | No deliveries yet. | Add a webhook endpoint to start receiving events. | `Add endpoint` |
| Webhook endpoints | No endpoints configured. | Add one to start receiving events. | `Add endpoint` |
| Team members | Only you so far. | Invite a teammate to coordinate together. | `Invite member` |
| Audit log | No activity in this range. | Try a wider date range or check back later. | none |
| Properties | No properties yet. | Add a property to assign jobs against it. | `Add property` |
| Notifications | You're caught up. | New activity will land here. | none |
| Filtered table (any) | No rows match these filters. | Adjust or clear the filters to see results. | `Clear filters` |
| Search (Cmd+K) | No matches. | Try a different term. | none |

### What never goes here

- No mascots.
- No illustrations beyond the Lucide icon.
- No marketing language. The product never sells itself inside itself.

## Error states

Four shapes. Pick the one that matches the scope of what failed.

### Inline error under an input

For a single-field validation error. The field gets a `--color-danger` border. The hint text is replaced by the error text in `text-small` in `--color-danger`. The input gets `aria-invalid="true"` and `aria-describedby` pointing at the error element.

Spacing is unchanged from the resting field. The error replaces the hint, it does not add height. If there was no hint, the error adds the standard 4px gap below the input.

### Banner at the top of a card or page

For form-level errors after submit and for surface-level problems that affect the whole card but not the whole page. Uses `Banner` (chapter 01).

| Property | Value |
|---|---|
| Icon | `AlertCircle` in `--color-danger` |
| Fill | `--color-danger-fade` |
| Border-left | 3px `--color-danger` |
| Body type | `text-body` |
| Action | optional `Button variant="ghost"` aligned right |
| Dismiss | optional X `IconButton`, only when the banner is informational; mandatory errors do not dismiss until resolved |

Banners are placed at the top of the surface they describe. Card-scoped banners go inside the card, above the body. Page-scoped banners go below the page title, above the page content.

### Full-page error

For 404, 403, network out. Uses the `EmptyState` shape with a Lucide icon in `text-muted` and a centered action.

| Case | Icon | Title | Description | Action |
|---|---|---|---|---|
| 404 | `SearchX` | This page doesn't exist. | Check the URL or head back to the dashboard. | `Go to dashboard` |
| 403 | `ShieldOff` | You don't have access. | Ask an admin on this team to grant the role you need. | `Back` |
| Network out | `WifiOff` | Can't reach the server. | Check your connection. We'll retry automatically. | `Retry now` |
| 500 | `AlertOctagon` | Something broke on our side. | We've been notified. Try again in a moment. | `Retry` |

The icon sits at 48px instead of the EmptyState default of 32px because the surface is the whole viewport. Title is `text-h2`. Description is `text-body text-muted`. Action is `Button variant="primary"` for retries and `Button variant="secondary"` for navigation-only.

### Drawer error

When the entity loaded but a sub-fetch inside the drawer failed (e.g. the activity log section couldn't load while the job header rendered fine). Render an inline `Banner` inside the affected section of the drawer body, with a `Button variant="ghost" size="sm"` labeled `Retry` local to that section. The rest of the drawer stays usable.

The drawer header never shows a section-level error. Header-level errors mean the whole entity failed to load and the drawer falls back to the full-drawer error layout (skeleton replaced by a centered `EmptyState` with `AlertCircle` and a `Retry` action).

### Error variants per surface

| Surface | Inline | Banner | Full-page | Drawer |
|---|---|---|---|---|
| Auth forms | yes | yes (after submit) | no | n/a |
| Settings forms | yes | yes (after submit) | no | n/a |
| Tables | n/a | yes (load failure) | yes (route 4xx/5xx) | n/a |
| Dispatch board | n/a | yes (column-scoped) | yes (board-scoped) | yes |
| Drawer detail | yes (sub-edits) | n/a | n/a | yes |
| Worker mobile | yes | yes (queued write failed) | yes (offline-too-long) | n/a |
| Webhook delivery | n/a | yes (retry failed) | yes | yes |

### Copy rules

- Name the cause if known. `This email is already on the team.` not `Failed.`
- Never blame the user. `Couldn't reach the server.` not `You're offline.`
- If the user can act, say what to do. `Try again` or `Check your connection.`
- If the error is transient and the system will recover, say so. `Retrying in 10s.`

## Success states

Success is mostly silent. The work is done; the UI updates; the user moves on. Two cases need a visible confirmation.

### Transient success (toast)

For an action that completed and does not need acknowledgment. The new state is already visible in the UI. The toast confirms the verb.

| Action | Toast variant | Copy |
|---|---|---|
| Worker invited | `success` | Worker invited. |
| Job marked completed | `success` | Job marked completed. |
| Endpoint added | `success` | Endpoint added. |
| Schedule saved | `default` | Saved. |
| Settings saved | `default` | Saved. |
| Member role changed | `success` | Role updated. |

Auto-dismiss at 5s. Anchor and stacking rules in the Toasts section below.

### Sticky success (banner)

For state changes that the user should keep noticing until they acknowledge or navigate. The change is in flight or has consequences that play out over time.

| State | Banner variant | Copy | Dismiss |
|---|---|---|---|
| Plan upgrading | info | Your plan is upgrading. This can take a minute. | manual |
| Bulk import in progress | info | Importing 1,240 jobs. We'll notify you when done. | manual |
| Pending invitation accepted by user | success | Maya joined the team. | manual |

Sticky success banners always provide a manual X dismiss. They never block interaction below them.

## Toasts

Variants are defined in chapter 01. This chapter governs placement and behavior.

### Anchor

| Surface | Anchor |
|---|---|
| Desktop | Bottom right, 24px from edges |
| Mobile | Bottom center, 16px from edges, above any sticky action bar |

### Stack

Maximum 3 visible at a time. Newest is at the bottom of the stack on desktop and at the top of the stack on mobile (closest to the user's thumb). When a 4th arrives, the oldest auto-dismisses early.

### Dismiss

A click anywhere on the toast or on the X button dismisses it. Swipe right to dismiss on mobile. Auto-dismiss timers in the table below.

| Variant | Auto-dismiss | Sticky |
|---|---|---|
| `default` | 5s | no |
| `success` | 5s | no |
| `info` | 6s | no |
| `warn` | 8s | no |
| `error` | none | yes, until dismissed |

### Action buttons inside toasts

Action buttons inside toasts are allowed only for Undo, and only for 5s after the originating action. After 5s, the action is no longer undoable and the toast either auto-dismisses or the action button is removed.

Example. The user archives a job. A toast appears: `Job archived.` with an `Undo` action. The toast lives 5s. Click Undo inside that window and the archive reverses. After 5s the toast and the option are both gone.

No other actions appear inside toasts. If a button is needed for longer than 5s, the surface needs a banner, not a toast.

### Accessibility

| Variant | aria-live |
|---|---|
| `default`, `success`, `info` | `polite` |
| `warn` | `polite` |
| `error` | `assertive` |

The toast region uses `role="status"` for polite variants and `role="alert"` for assertive variants. Focus is never moved into a toast; toasts are passive.

## Dialogs

Two confirmation patterns. The choice is binary. If the action can be undone or has no lasting effect, use benign. Otherwise destructive.

### Benign confirmation

For things like discarding unsaved changes, leaving a page mid-edit, or confirming a non-destructive structural change.

```tsx
<Dialog>
  <Dialog.Title>Discard unsaved changes?</Dialog.Title>
  <Dialog.Description>You have changes that have not been saved. They will be lost.</Dialog.Description>
  <Dialog.Footer>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Discard</Button>
  </Dialog.Footer>
</Dialog>
```

Focus lands on Cancel. Enter triggers the primary action. Escape closes.

### Destructive confirmation

`ConfirmDialog` from chapter 01. Title names the entity. Description states what becomes irreversible. Confirm button is `variant="danger"`.

```tsx
<ConfirmDialog
  title="Delete operator Acme Hospitality?"
  description="This cannot be undone. 412 jobs and 28 workers under this operator will be archived."
  confirmLabel="Delete operator"
  confirmVariant="danger"
/>
```

Focus lands on Cancel even for destructive. Enter does not trigger Confirm. The user must click or tab-and-space.

### Type-to-confirm

For truly irreversible actions (deleting an operator, revoking all sessions, wiping audit retention), the Confirm button stays disabled until the user types the exact entity name into an input inside the dialog. The match is case-sensitive and whitespace-trimmed. Hint text reads `Type Acme Hospitality to confirm.`

| Action | Type-to-confirm |
|---|---|
| Delete operator | yes |
| Delete property with active jobs | yes |
| Revoke all sessions | yes |
| Remove member from team | no |
| Archive job | no |
| Discard unsaved changes | no |

## Form validation

### When validation runs

| Trigger | Behavior |
|---|---|
| Keystroke | No validation. The field is "in progress." |
| Blur | Field-level validation runs. Inline error shows if invalid. |
| Submit | Full validation pass. First errored field gets focus and is scrolled into view. |
| Server response | Server-side errors map to fields where possible; otherwise to a form-level banner. |

Field-level validation never runs while the user is still typing. The product does not red-line every half-typed email.

### Submit feedback

On successful save, the submit button briefly switches to a `Check` icon with the label `Saved`. The switch lasts 1500ms, then the button returns to its resting label. For higher-stakes saves (billing changes, role grants, webhook secrets), additionally show a `default` Toast with `Saved.`

On failed save, the button returns to its resting label immediately, the form-level banner appears at the top of the form, and any field-mapped errors render inline.

### Optimistic updates

Some surfaces update locally before the server confirms. Behavior is documented per surface.

| Surface | Pattern | Reference |
|---|---|---|
| Dispatch board card move | Optimistic, rollback with toast on failure | chapter 14 |
| Worker mobile check-in | Queued offline, replay on reconnect | chapter 15 |
| Settings save | Pessimistic, no optimistic update | chapter 19 |
| Member role change | Optimistic, rollback with toast on failure | chapter 18 |

Where a chapter does not specify, the default is pessimistic. The UI waits for the server.

## Network state

### Offline indicator

When `navigator.onLine === false`, the topbar (chapter 03) gains a band along its bottom edge in `--color-warn-fade` with `--color-warn` text reading `You are offline. Changes will sync when you reconnect.` The band is 28px tall on desktop and 32px on mobile.

The band has `role="status"` and `aria-live="polite"`. When connection returns, the band slides up and away over `motion-base`, optionally followed by a `success` toast `Back online.` if any writes were queued during the outage.

### Retry-on-reconnect

| Request type | Behavior on reconnect |
|---|---|
| Idempotent GET (table reads, drawer fetches) | Auto-retried up to 3 times with exponential backoff |
| Non-idempotent write outside worker view | Fails with an error toast. User retries manually. |
| Worker view write (check-in, check-out, status update) | Queued locally, replayed on reconnect. See chapter 15. |

The dispatch board and webhook delivery log poll for updates while offline-aware. Polling pauses while offline and resumes on reconnect.

## Accessibility for feedback

| Surface | Pattern |
|---|---|
| Skeletons | `aria-hidden="true"`. Container has `aria-busy="true"`. |
| Toasts (default, success, info) | `aria-live="polite"`, `role="status"` |
| Toasts (warn, error) | `aria-live="assertive"`, `role="alert"` |
| Banners | `role="status"` for info/success, `role="alert"` for danger |
| Inline field error | `aria-invalid="true"` on the input, `aria-describedby` linking to the error text |
| Dialogs | Focus trapped on open, focus restored on close, Escape closes |
| Full-page error | Heading is `h1`. Action button is the only focusable element on the page besides chrome. |
| Offline band | `role="status"`, `aria-live="polite"` |

Color is never the only signal for an error. Every error state pairs `--color-danger` with an icon (`AlertCircle`, `AlertOctagon`) or with text. Pills already encode this; banners and inline errors must follow.

## Choreography rules

All durations come from chapter 00 motion tokens. No surface declares its own duration.

| Event | Token | Notes |
|---|---|---|
| Banner enter | `motion-base` | Slide down 8px and fade in |
| Banner exit | `motion-base` | Fade out, no slide |
| Toast enter | `motion-base` | Slide up 12px (desktop) or down 12px (mobile) and fade in |
| Toast exit | `motion-fast` | Fade and shrink |
| Dialog open | `motion-base` | Scale from 0.96 with fade, backdrop fade |
| Dialog close | `motion-fast` | Scale to 0.98 with fade |
| Skeleton shimmer | 1200ms linear infinite | Decorative only |
| Submit success flash | 1500ms hold | Check icon stays, no further animation |
| Offline band enter | `motion-base` | Slide down |
| Offline band exit | `motion-base` | Slide up |

Stagger between sibling skeletons never exceeds 60ms. Lists do not stagger items beyond the visible viewport on first render.

Under `prefers-reduced-motion: reduce` every duration in this chapter collapses to 1ms. Skeleton shimmer becomes a flat fill. Toasts and banners cross-fade without translation. Dialog scale is removed; only opacity changes.

## Per-surface summary

A compact lookup. For each major surface, the loading, empty, and error patterns to use.

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Dashboard | KPI + chart skeletons | EmptyState per card | Banner per card, full-page on route failure |
| Members table | Table skeleton | "Only you so far." | Banner above table |
| Audit log | Timeline skeleton | "No activity in this range." | Banner above timeline |
| Dispatch board | Column skeletons | "Nothing scheduled." per column | Banner above board, full-page on route failure |
| Worker mobile today | Card list skeleton | "Nothing scheduled today." | Inline + queued write fallback |
| Webhook deliveries | Table skeleton | "No deliveries yet." | Banner above table |
| Webhook delivery detail | Drawer skeleton | n/a | Drawer error |
| Settings forms | Field skeletons | n/a | Inline + form banner |
| Auth forms | Button inline spinner | n/a | Inline + form banner |
| Cmd+K search | Inline spinner in input | "No matches." | Inline error toast |

## Checklist for "done"

A feedback state is shipped when all of these are true.

- [ ] Loading uses the highest-preference pattern that fits the surface (skeleton over spinner over page spinner).
- [ ] Skeleton layout matches the resting layout to the pixel and carries `aria-hidden`.
- [ ] Empty state uses `EmptyState` with copy that names the situation and offers a next step or omits the action.
- [ ] Filtered-empty variant uses the filter-specific copy with a Clear filters action.
- [ ] Error pattern matches the scope (inline, banner, full-page, drawer).
- [ ] Toasts respect anchor, stack limit, dismiss rules, and `aria-live`.
- [ ] Destructive confirmations use `ConfirmDialog` with type-to-confirm where required.
- [ ] Form validation runs on blur, focuses first error on submit, and shows the post-save flash.
- [ ] Offline indicator appears and the surface's writes follow the documented retry behavior.
- [ ] Motion respects `prefers-reduced-motion`.

## Gaps

- Worker mobile skeleton image is not yet rendered. `[NEEDS: worker mobile skeleton image]`
- The exact retry backoff curve for idempotent reads is not finalized. Current placeholder is exponential with base 500ms, cap 8s.
- We do not yet have a copy variant for partial loading (e.g. half a table loaded, half pending). For now, the surface stays fully skeletoned until first response and then renders real data.
- The post-save success flash duration of 1500ms has not been usability-tested. It may need to drop to 1000ms after the first round of user testing.
- We do not yet specify the behavior when more than one Banner would render at the top of a card. The current intent is to stack with the highest severity on top, but the visual spec is not drawn.
- The offline indicator on the worker mobile shell may need a stronger affordance than a band; chapter 15 will decide.
- We do not yet have a documented pattern for "this resource exists but you can't see it yet because of replication lag." For now, it falls back to the 404 surface, which is not strictly accurate.
