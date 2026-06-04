# 19 — Settings

Everything a user changes about themselves or their operator lives under `/settings`. The shape is the same on every sub-page. A nested vertical sub-nav on the left, a single content column on the right, one card per logical section. No tabs, no accordion, no surprise modals on entry. Coordinators and workers see a short version. Tenant admins see the full surface.

## Information architecture

`/settings` is a section of the app, not a screen. The first hit lands on `/settings/profile`, which is the lowest-privilege page and the page every user can reach.

When the active route is anywhere under `/settings`, the sidebar (chapter 03) expands a nested vertical sub-nav. The sub-nav is part of the sidebar, not a second column inside the page. Visual reference for the pattern is `docs/images/ui/team-management.png`, where Settings is shown expanded with Team active.

### Sub-nav order

The sub-nav items are fixed in this order. The order is not user-configurable. Items the current user cannot reach are hidden, not disabled.

| Order | Item | Route | Visible to |
|---|---|---|---|
| 1 | Profile | `/settings/profile` | All roles |
| 2 | Notifications | `/settings/notifications` | All roles |
| 3 | Team | `/settings/team` | `tenant_admin` |
| 4 | Properties | `/settings/properties` | `tenant_admin` |
| 5 | Webhooks | `/settings/webhooks` | `tenant_admin` |
| 6 | Audit log | `/settings/audit` | `tenant_admin` |
| 7 | Account | `/settings/account` | `tenant_admin` |

Active sub-nav item is filled with `bg-brand-soft` and labeled in `text-brand`. Inactive items use `text-default`, hover lifts to `bg-canvas`. Item height 32px, padding `space-2` y, `space-3` x, radius `radius-md`. The active marker is the fill, not a left bar. Coordinator and worker accounts see two items in this list and nothing else.

### Page frame

Every settings page uses the same frame.

- Page title in `text-h1` at the top of the content column.
- Optional one-line sub-title in `text-body text-muted`.
- A vertical stack of `Card` blocks separated by `space-6`.
- Each card has a header, a body, and a footer that holds the section's primary action.
- No global Save button. Each card owns its own Save.

A card's footer action is right-aligned. If the card has no destructive option, the footer holds a single `Button variant="primary"`. If the card has both a save and a revert, the secondary sits to the left of the primary with `space-3` between them.

## Profile

Route `/settings/profile`. Visible to every signed-in user. This is the only settings page a worker or coordinator can reach beyond Notifications.

The page is five cards.

### Identity card

| Slot | Spec |
|---|---|
| Avatar | `Avatar size="lg"`, hash-hued. No upload in v0.1. |
| Display name | `Input` with `text-body`, max 80 chars. |
| Work email | `Input` read-only, `bg-[--color-bone]`, with a `LinkButton` "Change email" to the right of the field. |
| Footer | `Button variant="primary"` "Save changes". |

The "Change email" link opens a `Dialog` titled "Change work email". The dialog body holds a single email `Input` and a hint that a verification link will be sent to the new address. Submitting the dialog does not change the email immediately. The new address is held in a `pending_email_change` row on the user. The current email keeps working until the new one is verified. The dialog footer holds `Cancel` and `Send verification link`. After submit, the field shows a `StatusPill variant="info"` reading "Verification sent" next to the read-only address, with a timestamp under it in `text-small text-muted`.

### Password card

Three fields stacked.

| Field | Type | Notes |
|---|---|---|
| Current password | `Input type="password"` | Required to change either of the next two. |
| New password | `Input type="password"` | Strength hint under the field in `text-small text-muted`. |
| Confirm new password | `Input type="password"` | Must match. Validation runs on blur, not keystroke. |

Footer holds `Button variant="primary"` "Update password". On success, a default `Toast` reads "Password updated". On a wrong current password, the error sits under the Current password field, not at the top of the card.

### Two-factor card

A short body that reads "Two-factor authentication adds a second step at sign-in using an authenticator app." Below the body, a `Switch` labeled "Require a second step at sign-in".

When the switch flips on, a `Dialog` opens with the QR code rendered server-side and a six-digit `Input` for the OTP confirmation. The dialog has three regions stacked. The QR image is square, 192px, `radius-md`, `border-line` 1px. Below the image, the secret string is rendered in `text-mono` with a copy `IconButton` so users without a camera can paste it. Below that, the OTP `Input` and a hint reading "Enter the six-digit code from your app". Footer holds `Cancel` and `Verify and enable`. Until the user verifies, the switch is held in its previous state.

When the switch flips off, a `ConfirmDialog` appears titled "Disable two-factor". The body reads "Your account will sign in with password only." Footer is `Cancel` and `Button variant="danger"` "Disable".

### Language and timezone card

| Field | Component | Notes |
|---|---|---|
| Language | `Select` | English only in v0.1. |
| Timezone | `Combobox` | IANA list, default from browser. |
| Time format | `RadioGroup` | "12-hour", "24-hour". |

Footer holds `Button variant="primary"` "Save preferences".

### Sessions card

A small body line in `text-body text-muted` reading "Sign out from every device you've used, including this one." Footer holds a single `Button variant="danger"` "Sign out everywhere". The action triggers a `ConfirmDialog` since it logs the user out of the current session as well.

## Notifications

Route `/settings/notifications`. Visible to every signed-in user.

The page is one card containing a matrix. Rows are notification kinds. The only channel in v0.1 is Email, per F-072. SMS and Push are out of scope.

### The matrix

| Kind | Email |
|---|---|
| Worker invited | Switch |
| Password reset notification | Switch |
| Webhook delivery failed digest (optional) | Switch |
| Weekly summary (optional) | Switch |

The last two rows are optional per F-071; if the backend ships them, the rows are interactive, otherwise they render with the switch held off and a hint under the row.

Outbound email is sent via Resend in production (`ResendProvider`) and MailHog locally (`SmtpProvider`). See F-070 for the provider contract.

#### Cell behavior

| State | Component | Notes |
|---|---|---|
| Enabled and on | `Switch` checked | Toggle persists on change, debounced 400ms. |
| Enabled and off | `Switch` unchecked | Same. |

A single change emits a `Toast variant="default"` "Preference saved" only on the first toggle of a session. Further toggles update silently to avoid stacking noise. The full state of the matrix is sent to the server on every change as a single payload, not delta-encoded.

### Channel column header

The **Email** header shows the column name and, on a second line in `text-small text-muted`, the user's current verified email. Email is always available.

## Team

Route `/settings/team`. This page belongs to chapter 18. Settings only owns its sub-nav entry. The Settings chapter does not redefine columns, role pills, invitation flow, or scope editing. See `18-team-and-rbac.md` for the contract.

## Properties

Route `/settings/properties`. Tenant admin only. This page is the operator's catalog of physical properties under which jobs are scheduled.

### List view

The page header holds the title "Properties" and an `Add property` `Button variant="primary"` top-right. Under the header, a `Card` grid lays out one card per property. The grid is two columns above the `lg` breakpoint, one column below `md`, with `space-4` gaps. Each property card uses the default `Card` shape with the slots in the table below.

| Slot | Spec |
|---|---|
| Name | `text-h3 text-default` |
| Address | `text-small text-muted`, single line, truncates with ellipsis |
| Region | `StatusPill variant="neutral"` with the region label |
| Job count | `text-body tabular-nums` followed by `text-small text-muted` reading "active jobs" |
| Last activity | `text-small text-muted`, human time |
| Footer | `LinkButton` "Open" routes to the property edit page |

The full card is clickable and routes to the edit page. The `Open` link exists for keyboard and screen-reader users; do not rely on the card-level click alone.

### Add property

`Add property` opens a `Dialog` titled "Add property" with four fields stacked. Name (`Input`), Address (`Textarea` two rows), Region (`Combobox` of the operator's existing region tags with an inline "create" affordance), Default job duration (`Select` of common durations). Footer is `Cancel` and `Button variant="primary"` "Add property". On success, the dialog closes, a `Toast variant="success"` reads "Property added", and the grid prepends the new card.

### Property edit page

Route `/settings/properties/[id]`. The page reuses the same frame as other settings pages. Three cards stacked.

| Card | Body | Footer action |
|---|---|---|
| Profile | Name, address, region, default duration, internal notes | `Save changes` |
| Team scope | A `MultiCombobox` of coordinators with access to this property, plus a `Switch` "Workers see this property in their app" | `Save scope` |
| Default schedule rules | Quiet hours range (two `DateRangePicker`-style time inputs), weekly recurring template `Select`, blackout dates `MultiCombobox` | `Save rules` |

Default schedule rules apply when a coordinator creates a job on this property without overriding. Workers do not see this card. Below the three cards, a small danger zone card reads "Delete property". Deletion uses a `ConfirmDialog` that requires the property name typed verbatim. Properties with active jobs cannot be deleted; the confirm button is disabled and a hint under the name field reads "This property has 3 scheduled jobs. Reschedule or cancel them first."

## Webhooks

Route `/settings/webhooks`. This page belongs to chapter 17. Settings only owns the sub-nav entry. The settings frame is reused, the content is the endpoint list, delivery log, and payload viewer documented in `17-webhooks-and-events.md`.

## Audit log

Route `/settings/audit`. Tenant admin only. This is the read-only view of `permission_audits` rows. Realizes F-016.

### Page chrome

Title "Audit log". Sub-title in `text-body text-muted` reading "Every permission check on this operator. Retained 90 days." Top-right holds a single `Button variant="secondary"` "Export CSV". The export is a synchronous server-rendered file response; the browser receives the CSV directly as the response body. No background job, no email handoff. The volume of audit rows at this scale fits in a single response.

### Filter row

Above the table, a horizontal filter row sits in `space-3` gaps and wraps at `md`.

| Filter | Component | Notes |
|---|---|---|
| Date range | `DateRangePicker` | Default last 7 days |
| Actor | `Combobox` | Member list of the operator |
| Subject type | `Select` | Job, worker, property, settings |
| Decision | `Select` | Allow, Deny |

Filters apply on change, debounced 250ms. Active filters render as `StatusPill variant="neutral"` chips to the right of the filter row with an `x` `IconButton` per chip. A `Clear all` `LinkButton` sits at the right edge when at least one chip is active.

### Table

| Column | Format |
|---|---|
| When | `text-body` human time, `text-small text-muted` second line with the exact timestamp |
| Actor | `Avatar size="sm"` + name in `text-body`. |
| Subject | Entity label in `text-body` with the entity type in `text-small text-muted` underneath |
| Action | `text-mono`, for example `job.update`, `worker.invite` |
| Decision | `StatusPill variant="success"` "Allow" or `StatusPill variant="danger"` "Deny". Allow may also render as `StatusPill variant="neutral"` in views where success would be too loud, but the default is success. |
| Reason | `text-small text-muted`, single line, truncates with ellipsis |

Row click opens a `Drawer` with the full audit detail. The drawer header is the action label. The drawer body stacks five sections.

| Section | Content |
|---|---|
| Summary | Decision pill, action, timestamp |
| Actor | Member card with role pill |
| Subject | Entity card with a `LinkButton` to the entity's detail page |
| Policy | The matched scope rule, in `text-mono`, plus any custom-role overrides involved |
| Raw | `JsonViewer` of the full audit row |

Drawer footer holds a single `LinkButton` "Open this entity" that links to the subject's detail page where one exists. There is no destructive action in this drawer; audits are immutable.

## Account

Route `/settings/account`. Tenant admin only. Operator-level settings, not per-user.

### Operator card

| Field | Component | Notes |
|---|---|---|
| Operator name | `Input` | Editable |
| Slug | `Input` read-only | `bg-[--color-bone]`. Hint under the field reads "Used in URLs and webhook signatures. Contact support to change." |
| Default timezone | `Combobox` | Applies to scheduled jobs that don't specify one |
| Default job duration | `Select` | Common durations, used as the initial value on the new-job form |
| Week start | `RadioGroup` | "Sunday", "Monday" |

Footer holds `Button variant="primary"` "Save changes".

### Danger zone card

The card uses the default surface but the footer action is `Button variant="danger"`. Body reads "Deleting this operator archives all jobs, workers, properties, and webhooks. This cannot be undone." Footer holds `Button variant="danger"` "Delete operator".

The click opens a `ConfirmDialog` with the multi-step shape.

1. Title "Delete operator". Body explains the consequence and lists the counts that will be archived (workers, jobs, properties, webhooks) in a small grid of `KpiCard`-shaped tiles using dense padding.
2. An `Input` labeled "Type the operator name to confirm". The destructive button is disabled until the value matches exactly, including case.
3. Footer holds `Cancel` and `Button variant="danger"` "Delete operator". Loading state shows the button label as "Deleting" with the spinner in the leading slot.

After deletion, the user is signed out and routed to the login page.

## Permissions per section

The visibility map below is the source of truth for what each role sees in the settings sub-nav and on each page. The router enforces the same rules; the sub-nav does not show items the user cannot reach.

| Section | `tenant_admin` | `coordinator` | `worker` | `super_admin` |
|---|---|---|---|---|
| Profile | Full | Full (self) | Full (self) | Full (self) |
| Notifications | Full | Full (self) | Full (self) | Full (self) |
| Team | Full | Hidden | Hidden | Full |
| Properties | Full | Hidden | Hidden | Full |
| Webhooks | Full | Hidden | Hidden | Full |
| Audit log | Full | Hidden | Hidden | Full |
| Account | Full | Hidden | Hidden | Full |

Profile and Notifications are always self-only. A tenant admin editing another member's profile happens through the Team page, not the Profile page. The Profile and Notifications pages never expose a user picker.

## Mobile behavior

The settings sub-nav collapses into a `Select`-shaped picker at the top of the content column below the `md` breakpoint. The picker shows the active section label and opens a sheet that mirrors the sub-nav items in the same order. Cards keep their vertical stack and full-width fill. Tables degrade to stacked cards per the rule in chapter 01. The audit table on Audit log becomes a list of dense rows that open the drawer on tap. The drawer goes full-width on mobile.

Coordinators and workers on mobile see only Profile and Notifications, and the picker shows both labels.

## Loading, empty, error

| Page | Loading | Empty | Error |
|---|---|---|---|
| Profile | Skeleton cards in shape order | n/a | Banner at top of the page |
| Notifications | Skeleton matrix with grayed switches | n/a | Banner at top of the page |
| Properties | Skeleton grid of six cards | `EmptyState` "No properties yet" with `Add property` action | Full-page error |
| Audit log | Skeleton table rows | `EmptyState` "No audit events match these filters" with `Clear filters` action | Banner above the table |
| Account | Skeleton cards | n/a | Banner at top of the page |

A failed save on any card surfaces inline at the card footer in `text-small text-[--color-danger]`, not as a toast. Toasts are reserved for successful saves.

## Done means

- Sub-nav matches the order and visibility map above on every role.
- Every card on every page has its own save action and inline error surface.
- Two-factor enable and disable flows both pass keyboard-only.
- Notifications matrix toggles persist with a debounced single write.
- Property delete and operator delete both require verbatim name match before the destructive button is enabled.
- Audit drawer opens from a row click and is closable with Escape.
- Mobile picker mirrors the sub-nav and respects role visibility.

## Gaps

- Impersonation was considered and dropped. The Settings sidebar carries no impersonation switcher and the Audit drawer carries no impersonation context. See the "Out of scope" table in `docs/FEATURES.md`.
- Multi-language i18n is deferred. The Language `Select` only lists English in v0.1. Strings are externalized in the codebase so a second locale can land without a redesign, but no translation work is scheduled.
- Password-less authentication (magic links, passkeys) is not designed. The Password card and the two-factor card assume password as the primary factor. A future revision will add a "Sign-in methods" card to Profile when the auth surface supports more than one factor type.
- Operator slug change is intentionally not self-serve in v0.1. Changing a slug rewrites webhook signature payloads and invite URLs, so it routes through support. A self-serve flow with a redirect window is on the roadmap.

/Users/macbookpro/Documents/RITARODEV/ritarodev-context/Projects/01-Job Hunt/portfolio-projects/crewmate/docs/ui-guide/11-settings.md
