# 18 — Team and RBAC

The surface where a `tenant_admin` manages who is on the team, what role each member holds, and what slice of the tenant they can reach. The model behind this UI is authoritative in `./shared/04-rbac.md`. This chapter is the visual and behavioral contract for the screens that expose that model.

The visual baseline lives at `docs/images/ui/team-management.png`. The conceptual model is `docs/images/diagrams/rbac-model.png`. Anything this chapter does not name is governed by `00-design-system.md` and `01-components.md`.

## Goal of the surface

A `tenant_admin` opens `/settings/team` to do four things in order of frequency. See who is on the team and how recently they used CrewMate. Invite a new member with the right role and scope on the first try. Change someone's role or scope when their assignment shifts. Revoke access when someone leaves.

A `coordinator` reads the same page to know who their peers are. A `worker` never reaches it; the route returns 403 and the sidebar item is hidden. A `super_admin` sees the same page across any tenant they act in, with one extra column (Tenant).

## Routes

| Route | Owner |
|---|---|
| `/settings/team` | Members list and pending invitations |
| `/settings/team/roles` | Built-in roles read-only, custom roles management (F-093) |
| `/settings/audit` | Audit log, linked from the bottom of the members page |

The Settings sidebar nests both `team` and `team/roles` under the Team item. See `03-layout-and-navigation.md` for the nested sidebar pattern.

## Members list

The main page at `/settings/team`. Layout, top to bottom.

| Region | Content |
|---|---|
| Page header | Title `Team & roles` in `text-h1`, trailing `Invite member` Button `variant="primary" size="md"` |
| Members table | Full-width `Table`, one row per active member |
| Pending invitations | `Card` titled `Pending invitations (N)` with one row per pending invite |
| Footer link | `View audit log` `LinkButton`, routes to `/settings/audit?category=authorization` |

Header padding is `space-6` top, `space-4` bottom. Between the table and the Pending invitations card the gap is `space-8`. The footer link sits `space-6` below the Pending invitations card.

### Header

Title in `text-h1`, single line. The Invite member button is right-aligned with a leading `UserPlus` Lucide icon at `icon-md`. Below the `md` breakpoint the header stacks, button on a new line beneath, full width.

### Table

The `Table` component from `01-components.md`.

| Column | Width | Content |
|---|---|---|
| Member | flex, min 240px | `Avatar size="md"` plus name in `text-body-strong` over email in `text-small text-muted` |
| Role | 160px | `RolePill` per the role catalog |
| Scope | flex, min 200px | One or more chips, see Scope display |
| Last active | 120px | Relative time in `text-small text-muted` |
| Actions | 48px | `IconButton` opening a `DropdownMenu` |

Header type is `text-micro text-muted` per the `Table` spec. Sortable columns are Member (by name), Role (by enum order below), Last active (by timestamp desc). Scope is not sortable. Row height is the default 48px. Row click opens the member `Drawer`; the trailing `IconButton` opens its menu without propagating the click.

#### Role sort order

Sorting by Role uses privilege order, not alphabetical.

| Order | Role |
|---|---|
| 1 | `super_admin` |
| 2 | `tenant_admin` |
| 3 | `coordinator` |
| 4 | `worker` |
| 5 | `custom:*` (alphabetical within this bucket) |

#### Last active

Relative time. `now`, `12m ago`, `2h ago`, `yesterday`, `3d ago`. Anything older than 14 days falls back to `MMM D`. A member who has never signed in shows `never` in `text-small text-muted`; this means they accepted the invite but have not yet signed in. Unaccepted invites live in the Pending invitations card below.

#### Row action menu

The trailing `IconButton` carries a `MoreHorizontal` Lucide icon. Menu contents depend on the actor.

| Item | Visible to |
|---|---|
| Change role | `tenant_admin`, `super_admin` |
| Adjust scope | `tenant_admin`, `super_admin` |
| Revoke access | `tenant_admin`, `super_admin` (never on self) |

A `coordinator` sees no trailing button. The slot is empty; the row stays clickable and opens a read-only `Drawer`.

### Empty state

The table never renders empty because the actor always counts as a member. A brand-new tenant shows the inviting admin as the only row. The Pending invitations card has its own empty state, documented below.

## Role display

The five `RolePill` variants are defined in `01-components.md`. This chapter does not redefine them. Refer to the catalog there for fill, border, and text tokens.

### Multiple grants

A user can hold more than one `RoleGrant`, per `./shared/04-rbac.md`. In the table, the primary pill renders the highest-privileged role using the privilege order above. A small suffix `+1 more` (or `+2 more`) renders in `text-small text-muted` to the right of the pill with `space-1` gap. The suffix is not clickable; the full list of grants lives in the Drawer.

## Scope display

Small chips in the Scope column. Neutral cases use `Badge`; the tenant-wide case uses `bg-brand-soft`.

| Scope kind | Rendering |
|---|---|
| `tenant` | Single chip with label `Tenant`, `bg-brand-soft text-brand`, no icon |
| `region` | Single chip with the region name, leading `MapPin` Lucide icon at `icon-xs`, neutral `Badge` styling |
| `properties` | First two property names as neutral `Badge` chips, then a `+N more` overflow chip when the list is longer than two |

Chips are 22px tall, padding `space-1` y `space-2` x, radius `radius-sm`, `text-micro`. Gap between chips is `space-1`. When a member holds multiple grants, chips render tenant-wide first, then regions alphabetically, then property-list chips.

### Click to filter

Any Scope chip is interactive. Clicking a chip filters the members list to members whose grants touch that scope. A removable pill in `bg-brand-soft` appears above the table; clicking the chip again or the pill's close affordance clears it. Filter state is URL-bound, like `?scope=region:r_123` or `?scope=property:p_456`, so admins can share filtered views. The chip click stops propagation; row click still opens the Drawer.

### Overflow chip

The `+N more` chip opens a `Popover` listing the remaining property names in a vertical list in `text-small`, each clickable to filter by that single property. The Popover uses `shadow-pop` per `00-design-system.md`.

## Invitation flow

The Invite member button opens a `Dialog` per `01-components.md`.

### Dialog anatomy

Title `Invite a member` in `text-h3`. Description in `text-body text-muted`, reading `They will receive an email with a link valid for 7 days.` The body holds four fields stacked with `space-5` vertical rhythm.

| Field | Component | Required | Notes |
|---|---|---|---|
| Email | `FormField` + `Input type="email"` | Yes | Validated for shape and uniqueness against existing members |
| Name | `FormField` + `Input` | No | If left blank, prefilled from the email local part on submit |
| Role | `FormField` + `Select` | Yes | The five roles, filtered to ones the actor can grant |
| Scope | `FormField` + `Combobox` or `MultiCombobox` | Conditional | Depends on the Role value, see below |

The footer carries `Cancel` Button `variant="secondary"` and `Send invite` Button `variant="primary"`. The primary stays disabled until email and role are valid.

### Role select

Available options depend on the actor.

| Actor | Roles offered |
|---|---|
| `super_admin` | `super_admin`, `tenant_admin`, `coordinator`, `worker`, any custom roles |
| `tenant_admin` | `tenant_admin`, `coordinator`, `worker`, any custom roles. Never `super_admin` |

Each option renders the matching `RolePill` inline with a short description in `text-small text-muted` to the right. For `coordinator` the description reads `Manages jobs and workers within an assigned region or property list.`

### Scope combobox

Scope depends on Role.

| Role chosen | Scope control |
|---|---|
| `super_admin` | Hidden. Scope is implicitly platform-wide |
| `tenant_admin` | Hidden. Scope is the tenant. A read-only chip `Tenant` renders where the control would be |
| `coordinator` | `Combobox` to switch between Region or Properties, then a `Combobox` or `MultiCombobox` for the chosen kind |
| `worker` | `Combobox` to pick a single property |
| `custom:*` | The custom role's declared scope kind drives the control. See Custom roles |

The Combobox renders region or property names with their identifiers in `text-mono text-muted` to the right, so two properties with the same display name stay distinguishable.

### Submit behavior

On `Send invite` the dialog stays open with the primary button in `loading` state. On success the dialog closes, a `Toast variant="success"` reads `Invitation sent to <email>`, and a new row appears in the Pending invitations card with a one-off `bg-amber-fade` highlight that fades over 1200ms. If the card was empty it transitions to populated as a single layout swap, no fade.

### Errors

Inline errors render under the offending field per the `FormField` pattern.

| Cause | Where | Copy |
|---|---|---|
| Email shape invalid | Email field | `Enter a valid email address` |
| Email belongs to an existing member | Email field | `This email is already on the team` |
| Email belongs to a pending invitation | Email field | `An invitation is already pending for this email` |
| Role not allowed for this actor | Role field | `You cannot grant this role` |
| Scope empty when required | Scope field | `Pick at least one property` |
| Server failure unrelated to inputs | Banner at top of dialog body | `We couldn't send the invitation. Try again` |

The banner uses the `Banner` composition and does not auto-dismiss inside the dialog.

## Pending invitations card

A `Card` titled `Pending invitations (N)` in `text-h3`, subtitle in `text-small text-muted` like `2 invitations awaiting acceptance`. Card padding is `space-5`. Rows stack with a 1px `border-line` divider between them.

### Row anatomy

Row height 56px, `space-3` y padding.

| Slot | Content |
|---|---|
| Email | `text-body` |
| Role | `RolePill` for the invited role |
| Scope | Same chip set as the members table |
| Invitation sent | Relative time in `text-small text-muted` |
| Expiry | Countdown in `text-small`, color depends on time remaining |
| Actions | `Resend` and `Revoke` as `LinkButton`s |

The expiry countdown reads `expires in 6d`, then `expires in 12h`, then `expires soon` once under 24 hours. Color steps from `text-muted` to `text-[--color-warn]` under 24 hours. An expired invitation renders a `StatusPill variant="danger"` reading `Expired` instead of the countdown. `Resend` stays available and issues a fresh 7-day link; `Revoke` removes the row.

### Resend and revoke

`Resend` is a `LinkButton`, not destructive. On click it shows a brief inline spinner in place of the label, then resolves to a `Toast variant="success"` reading `Invitation resent`.

`Revoke` is destructive. It opens a `ConfirmDialog` titled `Revoke invitation?` with the description `<email> will no longer be able to use the existing link. You can invite them again later.` The confirm button uses `variant="danger"` with label `Revoke invitation`.

### Empty state

With zero pending invitations, the card body renders an `EmptyState` with title `No pending invitations`, description `Invited members appear here until they accept the email link.`, no action. The card title still reads `Pending invitations (0)`.

## Member Drawer

Opens on row click. Uses the `Drawer` component, 480px wide on desktop, full width on mobile.

### Header

Sticky at the top. Slots, left to right.

| Slot | Content |
|---|---|
| Avatar | `Avatar size="lg"` |
| Name and email | Name in `text-h3`, email in `text-small text-muted` below |
| Role pill | Primary `RolePill`, plus the `+N more` suffix when applicable |
| Close | `IconButton` with `X` icon, pinned to the right per `Drawer` spec |

Header padding is `space-5`.

### Sections

The body scrolls. Three sections separated by 1px `border-line` dividers.

#### Grants

Title `Grants` in `text-h3`. One entry per `RoleGrant` held inside the current tenant, each row padded `space-3` y.

| Slot | Content |
|---|---|
| Role pill | The grant's role |
| Scope | The grant's scope chips |
| Meta | `Granted by <name>` and `Granted <relative time>` in `text-small text-muted` |

The granter's name carries a tooltip on hover showing their email and routes to that member's Drawer on click.

#### Activity

Title `Recent activity` in `text-h3`. A `Timeline` rendering the last 10 authorization events for this user, one line each.

Examples.

- `Granted coordinator on Beacon St yesterday at 2:14 PM by Riza R.`
- `Revoked worker on Camino Ave 3 days ago by Riza R.`
- `Signed in 12m ago`

A `View full audit` `LinkButton` at the bottom of the section routes to `/settings/audit?user=<userId>`.

#### Notification preferences

Title `Notification preferences` in `text-h3`. Read-only. Two columns listing each channel and its state.

| Channel | State |
|---|---|
| Email | `On` / `Off` |
| SMS | `On` / `Off` |
| Mobile push | `On` / `Off` |

State words render as small chips using the Scope chip styling. A line below the table reads `The member edits their own preferences from their profile.` in `text-small text-muted`. The tenant admin cannot edit another user's preferences here.

### Footer

Sticky at the bottom. Buttons, left to right.

| Button | Variant | Visible to | Notes |
|---|---|---|---|
| Change role | `secondary` | `tenant_admin`, `super_admin` | Opens the Change role dialog |
| Adjust scope | `secondary` | `tenant_admin`, `super_admin` | Opens the Adjust scope dialog |
| Revoke access | `danger` | `tenant_admin`, `super_admin` | Opens a `ConfirmDialog` |

The footer wraps on narrow viewports; buttons stack below `sm` with `Change role` on top and `Revoke access` on the bottom. A `coordinator` Drawer has no footer; the body is read-only.

### Change role and Adjust scope dialogs

Both reuse the Invite member `Dialog` shell. Change role locks Email and shows it as static text at the top. Adjust scope locks Email and Role and exposes only the scope control. A change is a single mutation. On success the Drawer refreshes its Grants section, a `Toast variant="success"` confirms with `Role updated` or `Scope updated`, and the table row updates in place.

### Revoke access

Destructive. The `ConfirmDialog` reads.

```text
Revoke access for <name>?
They will be signed out from every device. Existing audit records are kept.
Type their name to confirm.
```

The confirm input is a plain `Input` per the `ConfirmDialog` rules. The confirm button uses `variant="danger"` with label `Revoke access`. On success the Drawer closes, the row leaves the table with no animation, and a `Toast variant="success"` reads `<name> no longer has access`.

A self-revoke action is hidden, no inline error. A `tenant_admin` who is the only admin cannot revoke themselves; the menu item is disabled with a `Tooltip` reading `You are the last tenant admin. Promote another member before leaving.`

## Custom roles

The `/settings/team/roles` sub-page. In scope for v0.1 per F-093 (the UI surface) and F-012 (backend behavior). Tenant admins create, edit, and delete custom roles. The `RolePill` `custom:*` variant defined in `01-components.md` renders these roles wherever a role is shown.

### Layout

| Region | Content |
|---|---|
| Page header | Title `Roles` in `text-h1`, trailing `New role` Button `variant="primary"` |
| Built-in roles | Section titled `Built-in roles` in `text-h2`, a `Card` per built-in role, read-only |
| Custom roles | Section titled `Custom roles` in `text-h2`, a `Card` grid per custom role with name, description, member count, edit, and delete affordances |

### Built-in role card

One `Card` per system role, padding `space-5`.

| Slot | Content |
|---|---|
| Header | `RolePill` plus role display name in `text-h3` |
| Description | One-line summary in `text-body text-muted` |
| Permission summary | A compact list of allowed actions, see below |
| Member count | `text-small text-muted` reading `<N> members` |

The permission summary lists verbs grouped by subject. Example for `coordinator`.

| Subject | Actions |
|---|---|
| `Property` | read |
| `Job` | create, read, update, assign, reschedule, transition (limited) |
| `Worker` | read |

The summary uses `text-small` with `text-mono` for the verb column. A `LinkButton` at the bottom reads `See transition matrix` and links to `./shared/04-rbac.md`.

### Custom role card

Same anatomy as the built-in card with three additions.

| Slot | Content |
|---|---|
| Edit | `IconButton` with `Pencil` icon, opens the New role dialog in edit mode |
| Delete | `IconButton` with `Trash2` icon, opens a `ConfirmDialog` |
| Permission count | `<N> permissions` chip next to the member count |

### New role dialog

Opens from the `New role` button. The Dialog uses a wider `lg` variant of 720px to fit the permission matrix.

Body fields.

| Field | Component | Notes |
|---|---|---|
| Name | `Input` | 32 char max, validated for uniqueness within the tenant |
| Description | `Textarea` | 160 char max, shown in the Card description slot |
| Permissions matrix | Composition, see below | Required, at least one action ticked |

The permissions matrix is a table with subjects as rows and actions as columns. Each cell is a `Checkbox`. Ticking `manage` ticks every action column for that row and visually disables them.

| Subject | manage | create | read | update | delete | transition | assign | reschedule | export |
|---|---|---|---|---|---|---|---|---|---|
| `Job` | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| `Property` | ☐ | ☐ | ☐ | ☐ | ☐ | — | — | — | ☐ |
| `Worker` | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | — | ☐ |
| `RoleGrant` | ☐ | ☐ | ☐ | ☐ | ☐ | — | — | — | — |

Inapplicable cells render an em-dash glyph in `text-muted` and are not clickable. The action vocabulary follows the `Action` type from `./shared/04-rbac.md`. A footer note reads `Custom roles cannot grant access broader than your own. Some cells are disabled because of your current permissions.` Disabled cells render at 50% opacity with a `Tooltip` naming the missing actor permission.

## Audit log linkage

A `LinkButton` reading `View audit log` sits left-aligned below the Pending invitations card. It routes to `/settings/audit?category=authorization` and opens within the same shell. The link uses `text-small` with a trailing `ArrowUpRight` Lucide icon at `icon-xs`.

Per `./shared/04-rbac.md`, every grant change, Revoke, and Resend writes to the permission audit log. The audit page surfaces those rows.

## Permissions for this surface itself

The team surface enforces its own visibility rules. The matrix below is the contract.

| Action | super_admin | tenant_admin | coordinator | worker |
|---|---|---|---|---|
| Read `/settings/team` | All tenants | Own tenant | Own tenant, read-only | 403 |
| Read `/settings/team/roles` | All tenants | Own tenant | Own tenant, read-only | 403 |
| See Invite member button | Yes | Yes | Hidden | n/a |
| Submit an invitation | Yes | Yes | n/a | n/a |
| See row action menu | Yes | Yes | Hidden | n/a |
| Open a member Drawer | Yes | Yes | Yes, read-only | n/a |
| Change role | Yes | Yes (cannot create `super_admin`) | n/a | n/a |
| Adjust scope | Yes | Yes, within own permissions | n/a | n/a |
| Revoke access | Yes | Yes, never on self when last admin | n/a | n/a |
| Resend invitation | Yes | Yes | n/a | n/a |
| Revoke invitation | Yes | Yes | n/a | n/a |
| Create custom role | Yes | Yes | n/a | n/a |
| Edit custom role | Yes | Yes | n/a | n/a |

A `coordinator` who opens a Drawer sees only Grants, Activity, and Notification preferences; the footer is suppressed. Scope chips stay interactive so they can filter the list. A `worker` who reaches `/settings/team` directly gets a full-page error with title `Not available`, description `Workers cannot manage team members.`, no action. The route returns 403 from the server; this client surface handles stale-link cases.

## Loading and error states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Members table | Skeleton rows, 6 default | Never empty | Inline `ErrorState` with retry |
| Pending invitations card | Skeleton rows, 2 default | `EmptyState` in body | Inline error with retry |
| Member Drawer | Per-section skeleton | n/a | Per-section error |
| Invite dialog submit | Primary `loading` | n/a | Inline error or Banner |

Skeletons follow `01-components.md`. Reduced motion collapses shimmer to a static fill.

## Tab order

Top to bottom, left to right. Invite member button, sortable column headers (Member, Role, Last active), then each row (Tab focuses the row and Enter opens the Drawer, followed by the trailing action menu and any Scope chips), then the Pending invitations card title as a focusable landmark, each pending row with its Resend and Revoke actions, then the View audit log link. Drawer focus is trapped per the `Drawer` spec; Escape closes and returns focus to the originating row. Footer buttons follow the visual order left to right, ending on the destructive action.

## Done checklist

- Page header renders `Team & roles` and stacks on small viewports with the Invite member button right-aligned.
- Members table renders the four columns plus action slot, with the documented sort behavior and row-click Drawer.
- `RolePill` variants match `01-components.md`. Multi-grant users render the highest-privilege pill plus `+N more` suffix.
- Scope chips render per the three kinds, with the property overflow `+N more` Popover and click-to-filter behavior working.
- Pending invitations card renders with Resend, Revoke, expiry countdown, and Expired pill behavior.
- Invite dialog enforces email shape, uniqueness, and role gating; scope control adapts to the chosen role.
- Member Drawer renders the three sections and the footer action set, with role and scope edits applying as in-place updates.
- Revoke access requires typing the name and uses `variant="danger"`.
- `/settings/team/roles` renders built-in cards read-only at the top and custom role Cards below, with a working `New role` Dialog (name, description, permissions matrix). `View audit log` routes to `/settings/audit?category=authorization`.
- A `coordinator` sees a read-only surface; a `worker` lands on the 403 page.
- Tab order matches the table. Lighthouse a11y at or above 95 on every page.

## Gaps

- Impersonation was considered and dropped. See `../../FEATURES.md` "Out of scope". The team surface ships without an Impersonate action; the active-impersonation banner referenced from `11-auth-flows.md` is removed alongside it.
- Time-bound grants (`expiresAt` on `RoleGrant`) are deferred to v0.2. The schema supports the column; v0.1 grants have no expiry and the Drawer Grants section renders no Expiry slot.
- Field-level masking on `Worker` (hourly rate, contact details) is deferred to v0.2. v0.1 reads pass through the actor's grants without per-field masking.
- Bulk actions (multi-invite, bulk role change) are deferred. The Invite dialog accepts a single email in v0.1.
- Token `[NEEDS: chip-overflow-shadow]` for the `+N more` Popover if `shadow-pop` proves too heavy against the dense table.
- Token `[NEEDS: expiry-warn]` for the expiry countdown color step. v0.1 reuses `text-[--color-warn]`; a dedicated token may emerge if the countdown picks up animation.
