# 07 — Worker mobile

The worker is the person in the field. The screen is a phone, often outdoors, often gloved hands, often patchy network. The design is mobile first, dense on purpose, action forward. Every byte the worker sees has to earn its place. Visual reference: `docs/images/ui/worker-mobile.png`. State reference: `docs/images/diagrams/job-state-machine.png`.

The desktop product belongs to the coordinator. This surface belongs to the worker. Density is calibrated so the next action is always inside the thumb's reach, even one-handed.

## Surface scope

This chapter covers the worker PWA on a phone. Three views ship in v0.1.

| Route | View | Default |
|---|---|---|
| `/m` | Today | yes |
| `/m/history` | History | no |
| `/m/profile` | Profile | no |

There is no worker tablet layout in v0.1. A tablet renders the phone layout centered at max width 480px against a `bg-canvas` letterbox. The desktop app at `/` redirects to `/m` when the active session role is `worker`.

## App shell

The shell has two pieces. A header at the top with the page title and a date sub-line, and a tab bar pinned at the bottom. No sidebar. No hamburger. Nothing collapses.

### Top header

| Slot | Token | Notes |
|---|---|---|
| Page title | `text-h1` | "Today", "History", "Profile". Sentence case. |
| Sub-line | `text-small text-muted` | Today's full date in long form. "Tue, Mar 12". History shows the active filter. Profile shows the tenant name. |
| Padding | `space-5` top, `space-4` x, `space-4` bottom | |
| Background | `bg-surface` | |
| Bottom border | `border-line` 1px | Separates header from scrolling content. |

The header does not scroll with content. It stays fixed across the top inside the device safe area.

### Bottom tab bar

Three tabs. The order is fixed. Today is default and always loads first after login.

| Tab | Icon (Lucide) | Route |
|---|---|---|
| Today | `LayoutGrid` | `/m` |
| History | `History` | `/m/history` |
| Profile | `User` | `/m/profile` |

| Property | Value |
|---|---|
| Total height | 64px including bottom safe area |
| Background | `bg-surface` |
| Top border | `border-line` 1px |
| Active tab text | `text-brand`, `text-micro` |
| Inactive tab text | `text-muted`, `text-micro` |
| Active tab icon | `icon-md` in `text-brand` |
| Inactive tab icon | `icon-md` in `text-muted` |
| Tap target | 44px minimum, full column width |

There is no badge count on tabs in v0.1. Push notifications carry that load.

### Pull to refresh

The Today scroll container supports pull to refresh. Drag distance threshold is 64px. The refresh indicator is a spinner in `text-brand` sitting `space-4` above the date strip. Release fires a refetch of today's job list. Duration of the refresh is bounded; if the network call exceeds 8s the spinner stays and a `Toast` variant `warn` reads "Still trying to refresh." History and Profile do not refresh on pull.

## Today view

The default landing surface. Everything else is one tap away from here.

### Date strip

A horizontal scroll strip of seven days centered on today. Today is highlighted in brand fill. Past and future days are tappable to filter the list below to that day's jobs.

| Slot | Token |
|---|---|
| Strip height | 64px |
| Day cell width | 44px |
| Day cell radius | `radius-md` |
| Day-of-week label | `text-micro text-muted` |
| Day-of-month label | `text-body-strong` |
| Today fill | `bg-brand`, labels in `text-on-brand` |
| Selected (non-today) fill | `bg-brand-soft`, labels in `text-brand` |
| Inactive fill | none, labels in `text-default` |
| Gap between cells | `space-2` |

Swiping the strip left and right scrolls one week at a time. The currently selected day stays centered after swipe. Tapping a day below today shows past jobs read-only. Tapping a day in the future shows scheduled jobs without action buttons; the buttons appear when the day becomes today.

### Job list

Below the date strip. Each item is a `Card` with dense padding. The list is ordered by scheduled start time, soonest first. There is no grouping by status in v0.1. The list ends with a footer reading `text-small text-muted` "End of day" when fully scrolled.

| Property | Value |
|---|---|
| List padding | `space-4` x, `space-4` top, `space-12` bottom |
| Gap between cards | `space-3` |
| Card padding | `space-4` |
| Card radius | `radius-lg` |

The bottom padding is generous so the last card clears the tab bar.

## Job card states

Job cards take their shape from the job state machine. The state determines border treatment, status pill variant, primary action label, and whether the card is interactive at all.

### State matrix

| State | Sub-state | Left border | Status pill | Primary action | Tap behavior |
|---|---|---|---|---|---|
| Scheduled | future today | none | `neutral` "Scheduled" | `Start` | none on body, tap action only |
| In progress | en route | 4px `bg-accent` | `progress` "En route" | `Mark Arrived` | none on body |
| In progress | on site | 4px `bg-accent` | `progress` "In progress" | `Mark Completed` | none on body |
| Completed | — | none | `success` "Completed" with check icon top-right | none | tap opens timeline drawer |
| Cancelled | — | none, dimmed | `danger` "Cancelled" | none | none |

Dimmed cards lose 40% of body opacity on text and icon, keep the border at full strength so the card stays legible.

### Card anatomy

Top to bottom inside the card.

| Slot | Token | Content |
|---|---|---|
| Property name | `text-h3 text-default` | "12 Beacon St." |
| Job kind and window | `text-small text-muted` | "HVAC quarterly · 10:30 to 11:15" |
| Status pill row | `StatusPill` | one pill, left aligned |
| Action area | full-width primary action | only when state warrants it |

The icon on the left of the card is a job-kind glyph inside a `radius-md` tile, 40px square, `bg-canvas` fill, `border-line` 1px. Glyphs map to the job kind, not the status. Lucide names map per kind, see `[NEEDS: job-kind to icon map]`.

### Action area

The action button sits inside the card, full width, separated from the metadata above by `space-3`.

| Property | Value |
|---|---|
| Button variant | `primary` |
| Button size | `lg` |
| Width | 100% of card inner width |
| Min tap height | 44px (matches `lg` height) |
| Label | "Start", "Mark Arrived", or "Mark Completed" |

On tap the button switches to the loading state. The leading slot shows a 14px spinner in `currentColor`, the label stays. The state transition is optimistic; the rest of the card updates immediately to reflect the next state. On server confirmation the action area collapses or relabels per the state matrix above. On rejection the card reverts and a `Toast` variant `error` reads "Couldn't update. Try again."

There is one primary action per card. There is never a row of buttons in the worker view. If the workflow ever needs a secondary action (rare), it lives in a `DropdownMenu` triggered by an `IconButton` in the top-right of the card.

### Tap to view detail

Completed cards open a timeline drawer on tap. Scheduled and in-progress cards do not navigate on tap; the action button does the work. The drawer slides from the right per the `Drawer` component spec and shows the full transition log for the job. On mobile the drawer is full width.

## History view

Reverse chronological list of completed and verified jobs. Each row is a smaller card without an action.

| Property | Value |
|---|---|
| Card padding | `space-3` |
| Gap between cards | `space-2` |
| Title type | `text-body-strong` |
| Meta type | `text-small text-muted` |
| Status pill | always shown, right aligned |

Filter controls sit between the header and the list.

| Control | Component | Default |
|---|---|---|
| Week | `Select` | this week |
| Property | `Combobox` | all properties |

Filter changes refetch the list. The active filter set is reflected in the header sub-line, for example "This week · 4 Park Dr."

The empty state for History uses the `EmptyState` component. Title "No completed jobs". Description "Jobs you finish show up here." No action button.

## Profile view

The simplest of the three. Single column. No tabs.

| Section | Content | Component |
|---|---|---|
| Identity | Avatar `lg`, full name `text-h2`, role pill, tenant name `text-small text-muted` | `Avatar`, `RolePill` |
| Notifications | Link row to notification settings | `LinkButton` variant link |
| Account | Sign out | `Button` variant secondary, full width |

The notifications row is a tappable row with a chevron right. It opens the in-app notification preferences page where the worker can toggle push categories. See the push section below for the toggles.

Sign out clears the session and routes to `/login`. A `ConfirmDialog` is not used; sign out from the worker view is a one-tap action because workers share phones and signing out fast matters.

## Offline behavior

The worker view is a PWA. It must do useful work offline.

### Offline banner

A persistent `Banner` across the top, below the header, in front of the date strip.

| Property | Value |
|---|---|
| Background | `bg-warn-fade` |
| Text color | `text-warn` |
| Text size | `text-small` |
| Padding | `space-2` y, `space-4` x |
| Copy | "You are offline. Actions will sync when you reconnect." |
| Dismiss | none, only auto-hides on reconnect |

The banner is announced once to screen readers when it appears.

### Read-only cache

Today's job list and the seven-day date strip are cached on every successful fetch. When offline the worker still sees the cards, status pills, and metadata last known to be true. Jobs that were not in the cache at the time of disconnect are not visible. The banner copy implies the rest.

### Action queue

Tapping an action while offline does not fail. The action is enqueued in a local queue, optimistic UI applies immediately, and the button label suffixes with a pending marker.

| Property | Value |
|---|---|
| Pending label | trailing dot in `bg-warn`, 6px circle, `space-2` from label end |
| Pending button state | `disabled`, opacity 100% so it stays legible |
| Tap on pending | no-op, screen reader reads "Pending sync" |

Queued actions persist across app launches. On reconnect the queue flushes in order. Conflicts (the server says the job is already in the next state) drop silently. A single summary `Toast` variant `info` fires after the flush, reading "Synced N actions, M no longer valid" where M is the count of dropped conflicts. The toast omits the second clause when M is zero.

If a queued action fails for a non-conflict reason (server error, auth lapse) the corresponding card reverts and surfaces an inline `ErrorState` at the top of the card body, reading "Couldn't sync. Tap to retry." Tap re-enqueues.

## Push notifications

Web Push using VAPID. The worker subscribes once per device, on the first session after install, through a single permission prompt invoked from the notification settings page (not from the first launch).

### Categories in v0.1

| Category | Trigger | Default toggle |
|---|---|---|
| `job.assigned` | Coordinator assigns a job for today to this worker | on |
| `job.starting_soon` | An assigned job is within 30 minutes of its scheduled start | on |

Both toggles live in the in-app notification preferences page reachable from Profile. Toggles are `Switch` components. Turning a category off unsubscribes the device from that topic on the server; it does not revoke the OS permission.

### Notification anatomy

| Slot | Content |
|---|---|
| Title | "New job today" / "Starting in 30 minutes" |
| Body | Property name and job kind. Example "12 Beacon St. · HVAC quarterly" |
| Icon | App icon |
| Tag | Job ID, so a second push for the same job replaces the first |
| Action | none, the body tap navigates |

Tapping a notification opens the app, navigates to Today, scrolls the list to the job card, and applies a 600ms `motion-base` highlight pulse on the card using `bg-brand-soft` fading back to `bg-surface`. If the app is already open the same scroll-and-pulse runs.

The notification permission prompt sequence is documented in `[NEEDS: permission-prompt-script]`.

## Install prompt

The worker PWA shows an install prompt on the second visit. Never on the first.

| Property | Value |
|---|---|
| Surface | `Banner` pinned above the tab bar |
| Background | `bg-brand-soft` |
| Text | `text-default text-small` |
| Copy | "Add CrewMate to your home screen to keep today's jobs one tap away." |
| Primary action | `Button` variant primary size sm, label "Add to home screen" |
| Secondary action | `Button` variant ghost size sm, label "Not now" |
| Dismiss | tap secondary or close icon, do not show again for 14 days |

The browser BeforeInstallPrompt event drives the primary action. iOS Safari, which does not support the event, falls back to a step-by-step instruction sheet opened from the same primary action; that sheet is described in `[NEEDS: ios-install-sheet]`.

If the app is already installed the banner never appears.

## Motion on this surface

Motion is brief and functional, per `00-design-system.md`. Specific choreography on the worker view.

| Surface | Duration | Token |
|---|---|---|
| Tab switch | 120ms cross-fade content, tab indicator slides under active label | `motion-fast` |
| Date strip selection | 120ms color transition on cell fill | `motion-fast` |
| Card status change after action | 180ms border color fade, 180ms pill swap | `motion-base` |
| Notification deep-link pulse | 600ms `bg-brand-soft` fade out | `motion-base` |
| Drawer open from completed card | 180ms slide from right | `motion-base` |

`prefers-reduced-motion: reduce` collapses all of the above to 1ms per the global rule. The pulse becomes a single static frame in `bg-brand-soft` that lingers for 600ms then snaps back.

## Accessibility

Specific to mobile. The base rules in `13-accessibility-and-motion.md` still apply.

- Every tap target is at least 44 by 44 px including the action button, tab bar columns, date strip cells, and card icons.
- The action button announces its label and its loading state. While loading it reads "Updating, Mark arrived". On success the card region announces the new state, for example "Job marked in progress".
- The offline banner uses `role="status"` and is announced once when it appears, never again until it disappears and reappears.
- The date strip behaves as a single tab list with `role="tablist"`, days as `role="tab"`, the day's job panel as `role="tabpanel"`.
- Color is never the only signal of state. The left border accent on in-progress cards is paired with the status pill text and the button label change.
- A high-contrast version of the status colors is validated against WCAG AA on `bg-surface` and `bg-canvas`. Validation matrix lives in `13-accessibility-and-motion.md`.
- The PWA respects the device font size. All scaling tokens are relative; nothing on this surface is locked to a pixel size at the text level.

## Done checklist

A worker mobile screen counts as done when:

- The shell renders header, content, tab bar with safe-area padding on iOS and Android.
- Today, History, and Profile each have a verified screenshot diff against `worker-mobile.png` and against their own future references once captured.
- Every card state from the matrix is implemented and visually correct, including dimmed cancelled.
- Offline banner, action queue, and conflict-summary toast all work against an artificial network outage in dev tools.
- Push subscribes on toggle, unsubscribes on toggle off, and notification taps deep-link with the pulse.
- Install banner appears on second visit only, dismiss persists for 14 days.
- All tap targets pass an automated 44px audit.
- Screen reader announcements verified on iOS VoiceOver and Android TalkBack for each transition.
- Lighthouse a11y score 95 or higher on Today, History, Profile.

## Gaps

- The job-kind to icon map is not finalized. Tracked under `[NEEDS: job-kind to icon map]`.
- The exact copy and step sequence of the notification permission prompt is not finalized. Tracked under `[NEEDS: permission-prompt-script]`.
- The iOS Safari fallback install sheet copy and visual is not finalized. Tracked under `[NEEDS: ios-install-sheet]`.
- The high-contrast color validation matrix is referenced but lives in chapter 13, which has not been written yet.
- There is no surface in v0.1 for the worker to message the coordinator. Out of scope; revisit in v0.2.
- There is no offline indicator in the tab bar separate from the top banner. If user testing shows the banner is missed when scrolled past, a tab-bar dot will be added.
- The drag distance threshold for pull to refresh is set at 64px without device testing. Will be retuned after a field session with two workers.
- There is no battery or location handling described here. v0.1 does not use location. v0.2 may add an optional "I am near the property" affordance that uses geofencing; out of scope for this chapter.
