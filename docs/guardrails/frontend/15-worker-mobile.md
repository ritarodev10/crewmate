# 15 — Worker mobile

The worker mobile view is intentionally minimal in v0.1. A worker logs in on their phone, sees today's jobs as a vertical list, and taps a button to move each one through the state machine. Most of the visible data comes from the seed; the page exists to demonstrate the full transition flow on a phone-sized screen.

Visual reference: `docs/images/ui/worker-mobile.png`. State reference: `docs/images/diagrams/job-state-machine.png`. Scope source: `docs/FEATURES.md` F-040 and F-041.

There is no PWA, no service worker, no offline queue, no push notifications, no install prompt, no history view, and no separate profile page in v0.1. Workers who need more do it on desktop. All of those surfaces are listed under "Out of scope" in `docs/FEATURES.md`.

## Surface scope

One route. One screen. One job.

| Route | View | Notes |
|---|---|---|
| `/today` | Today | The only worker route. The desktop app at `/` redirects to `/today` when the active session role is `worker`. |

A tablet renders the phone layout centered at max width 480px against a `bg-canvas` letterbox. There is no tablet-specific layout.

## App shell

Two fixed pieces, header and footer, with the job list scrolling between them.

### Top header

| Slot | Token | Notes |
|---|---|---|
| Page title | `text-h1` | "Today". Sentence case. |
| Sub-line | `text-small text-muted` | Today's full date in long form. "Tue, Mar 12". |
| Padding | `space-5` top, `space-4` x, `space-4` bottom | |
| Background | `bg-surface` | |
| Bottom border | `border-line` 1px | Separates header from scrolling content. |

The header stays fixed across the top inside the device safe area. It does not scroll with content.

### Bottom footer

A single row at the bottom with a `LinkButton` variant `link` reading "Sign out". Tap clears the session cookies and routes to `/login`. No `ConfirmDialog`. Workers share phones; signing out fast matters.

| Property | Value |
|---|---|
| Total height | 56px including the device safe area |
| Background | `bg-surface` |
| Top border | `border-line` 1px |
| Link alignment | center |
| Tap target | full row, 44px minimum |

No tab bar. No other tabs to switch to in v0.1.

## Today view

A single vertical list of jobs scheduled for the current date that are assigned to the signed-in worker. Ordered by scheduled start time, soonest first.

In v0.1 the data is mostly seeded. The page sends one request to `/v1/jobs?workerId=me&date=today` (or the GraphQL equivalent on a single subscription) and renders the result.

| Property | Value |
|---|---|
| List padding | `space-4` x, `space-4` top, `space-12` bottom |
| Gap between cards | `space-3` |
| Card padding | `space-4` |
| Card radius | `radius-lg` |

The bottom padding is generous so the last card clears the footer comfortably.

The list ends with a footer reading `text-small text-muted` "End of day" when fully scrolled.

## Job card states

Job cards take their shape from the job state machine. The state determines the border treatment, the status pill variant, and the primary action label.

| State | Sub-state | Left border | Status pill | Primary action |
|---|---|---|---|---|
| Scheduled | future today | none | `neutral` "Scheduled" | `Start` |
| In progress | en route | 4px `bg-accent` | `progress` "En route" | `Mark Arrived` |
| In progress | on site | 4px `bg-accent` | `progress` "In progress" | `Mark Completed` |
| Completed | — | none | `success` "Completed" with check icon top-right | none |
| Cancelled | — | none, dimmed | `danger` "Cancelled" | none |

Dimmed cards lose 40% of body opacity on text and icon, keep the border at full strength so the card stays legible.

### Card anatomy

Top to bottom inside the card.

| Slot | Token | Content |
|---|---|---|
| Property name | `text-h3 text-default` | "12 Beacon St." |
| Job kind and window | `text-small text-muted` | "HVAC quarterly · 10:30 to 11:15" |
| Status pill | `StatusPill` | one pill, left aligned |
| Action button | `Button` | only when state warrants it |

No job-kind icons in v0.1. The text alone reads fine on the phone.

### Action area

The action button sits inside the card, full width, separated from the metadata above by `space-3`.

| Property | Value |
|---|---|
| Button variant | `primary` |
| Button size | `lg` |
| Width | 100% of card inner width |
| Min tap height | 44px (matches `lg` height) |
| Label | "Start", "Mark Arrived", or "Mark Completed" |

On tap the button switches to its loading state with a 14px spinner in the leading slot. The transition is optimistic; the rest of the card updates immediately to reflect the next state. On server confirmation the action area relabels or collapses per the state matrix above. On rejection the card reverts and a `Toast` variant `error` reads "Couldn't update. Try again."

One primary action per card. Never a row of buttons. No secondary actions in v0.1.

## Motion

Brief and functional, per `00-design-system.md`.

| Surface | Duration | Token |
|---|---|---|
| Card status change after action | 180ms border color fade, 180ms pill swap | `motion-base` |

`prefers-reduced-motion: reduce` collapses to 1ms per the global rule.

## Accessibility

Specific to mobile. Base rules in `10-accessibility-and-motion.md` still apply.

- Every tap target is at least 44 by 44 px, including the action button and the sign-out link.
- The action button announces its label and its loading state. While loading it reads "Updating, mark arrived". On success the card region announces the new state, for example "Job marked in progress".
- Color is never the only signal. The left border accent on in-progress cards is paired with the pill text and the button label.
- The view respects the device font size. All scaling tokens are relative.

## Done checklist

The worker mobile view counts as done when:

- The page renders against the seed for an authenticated worker, with at least one card visible in each non-cancelled state.
- Every transition in the state matrix works end to end (`Start`, `Mark Arrived`, `Mark Completed`).
- The card optimistic update reverts cleanly on a forced server error.
- Sign out clears the session and routes to `/login`.
- All tap targets pass a manual 44px audit on a real phone.

## Gaps

- History view, profile page, push notifications, offline queue, install prompt, pull to refresh, date strip, and bottom tab bar are all deferred. See "Out of scope" in `docs/FEATURES.md` for the full list and reasoning. The worker view in v0.1 is just the today list.
- Job-kind icons are not in v0.1. Plain text reads fine on a phone.
- A future "I am near the property" geofencing affordance is documented as v0.2.
