# 01 — Components

The component catalog. Everything visible on a page is one of these. The set is small on purpose. If you find yourself wanting a "new" component, look here first; nine times out of ten the right primitive already exists.

All components are built on shadcn/ui (vendored into `apps/web/src/components/ui/`), which sits on Radix. CrewMate-specific compositions and patterns live in `apps/web/src/components/<domain>/`.

## Component map

| Category | Component | Backed by | Notes |
|---|---|---|---|
| Action | `Button` | shadcn `Button` | Five variants, three sizes |
| Action | `IconButton` | shadcn `Button` | Square, icon-only |
| Action | `LinkButton` | Next `Link` | Looks like a link, behaves like one |
| Form | `Input` | shadcn `Input` | Text, email, password |
| Form | `Textarea` | shadcn `Textarea` | Resizes vertical only |
| Form | `Select` | shadcn `Select` | Radix Select, single value |
| Form | `Combobox` | shadcn `Command` + `Popover` | Searchable single value |
| Form | `MultiCombobox` | composition | Searchable multi-select |
| Form | `Checkbox` | shadcn `Checkbox` | Boolean inputs |
| Form | `RadioGroup` | shadcn `RadioGroup` | One-of-many |
| Form | `Switch` | shadcn `Switch` | Toggle, used in settings |
| Form | `Label` | shadcn `Label` | Always paired with one input |
| Form | `FormField` | composition | Label + control + hint + error |
| Form | `DateRangePicker` | composition | Built on `Popover` + `Calendar` |
| Display | `StatusPill` | composition | Six semantic variants |
| Display | `RolePill` | composition | Five role variants |
| Display | `Badge` | shadcn `Badge` | Counts, neutral chips |
| Display | `Avatar` | shadcn `Avatar` | Initial circle, hash-hued |
| Display | `Card` | shadcn `Card` | Default surface unit |
| Display | `KpiCard` | composition | Big number + delta |
| Display | `EmptyState` | composition | Icon + headline + sub + action |
| Display | `LoadingState` | composition | Skeleton variants |
| Display | `ErrorState` | composition | Inline and full-page |
| Data | `Table` | shadcn `Table` | Sortable, sticky, dense variants |
| Data | `Pagination` | composition | Cursor or page-number |
| Data | `Timeline` | composition | Activity log entries |
| Data | `JsonViewer` | composition | Read-only, copy-able |
| Overlay | `Dialog` | shadcn `Dialog` | Modal confirmations and forms |
| Overlay | `Drawer` | shadcn `Sheet` | Right-side detail panel |
| Overlay | `Popover` | shadcn `Popover` | Floating helper |
| Overlay | `Tooltip` | shadcn `Tooltip` | Short hint on hover |
| Overlay | `DropdownMenu` | shadcn `DropdownMenu` | Row actions, user menu |
| Overlay | `ContextMenu` | shadcn `ContextMenu` | Right-click row actions |
| Overlay | `CommandPalette` | shadcn `Command` | Cmd+K global navigator |
| Feedback | `Toast` | shadcn `Toast` (sonner) | Transient confirmations |
| Feedback | `Banner` | composition | Persistent page-level notice |
| Feedback | `ConfirmDialog` | composition | Destructive confirmation |

## Buttons

```tsx
<Button variant="primary" size="md">Save changes</Button>
<Button variant="secondary" size="md">Cancel</Button>
<Button variant="ghost" size="sm">Skip</Button>
<Button variant="danger" size="md">Delete operator</Button>
<Button variant="primary" size="md" loading>Saving</Button>
```

### Variants

| Variant | Fill | Border | Text | When |
|---|---|---|---|---|
| `primary` | `bg-brand` | none | `text-on-brand` | The single primary action on a screen. |
| `secondary` | `bg-surface` | `border-line` 1px | `text-default` | Counterpart to primary. Cancel, back. |
| `ghost` | none | none | `text-default` | Tertiary, low-emphasis. |
| `danger` | `bg-[--color-danger]` | none | `#fff` | Destructive only. Delete, revoke, force-fail. |
| `link` | none | none | `text-brand` underline-on-hover | Reads as a link. |

### Sizes

| Size | Height | Padding | Type token |
|---|---|---|---|
| `sm` | 28px | `space-2` x | `text-small` |
| `md` | 36px | `space-3` x | `text-body` |
| `lg` | 44px | `space-4` x | `text-body-strong` |

`lg` is reserved for the worker mobile primary action and any auth surface where the button is the focus of the page.

### States

Hover: 6% darker fill, 120ms `motion-fast`. Focus: 2px outline in `--color-navy-soft` at 2px offset. Disabled: 50% opacity, no hover. Loading: small spinner replaces leading slot, label stays.

### Icon and label

Leading icon: 8px gap to label. Trailing icon: 8px gap. Icon-only buttons use `IconButton`, square, with `aria-label` required.

## Inputs

```tsx
<FormField label="Work email" hint="We never share this." error={errors.email}>
  <Input type="email" name="email" placeholder="you@company.com" />
</FormField>
```

| State | Border | Background |
|---|---|---|
| Default | `border-line` 1px | `bg-surface` |
| Hover | `border-line-strong` | `bg-surface` |
| Focus | `border-brand` 1px + 2px brand outline | `bg-surface` |
| Error | `border-[--color-danger]` 1px | `bg-surface` |
| Disabled | `border-line` 1px | `bg-[--color-bone]` |

Padding: 8px vertical, 12px horizontal. Height 36px. Radius `radius-md`.

Hint text in `text-small text-muted` below the input, 4px gap. Error text replaces hint, in `text-small text-[--color-danger]`. Both should be linked to the input with `aria-describedby` and `aria-invalid` respectively.

## Pills

Two flavors. Use them precisely.

### StatusPill

For job status, delivery status, anything semantically loaded. Variants are bound to semantic colors.

| Variant | Background | Border | Text | Used for |
|---|---|---|---|---|
| `neutral` | `bg-canvas` | `border-line` | `text-muted` | Default, scheduled, draft |
| `progress` | `bg-[--color-amber-fade]` | `border-[--color-amber]` | `text-[--color-warn]` | In progress, retrying |
| `success` | `bg-[--color-success-fade]` | `border-[--color-success]` | `text-[--color-success]` | Delivered, completed, verified |
| `danger` | `bg-[--color-danger-fade]` | `border-[--color-danger]` | `text-[--color-danger]` | Failed, denied |
| `info` | `bg-[--color-info-fade]` | `border-[--color-info]` | `text-[--color-info]` | Pending, queued |
| `brand` | `bg-brand-soft` | none | `text-brand` | Brand-meaningful state (tenant_admin) |

Height 22px. Padding `space-1` y, `space-2` x. Radius `radius-sm`. `text-micro`.

```tsx
<StatusPill variant="progress">In progress</StatusPill>
```

### RolePill

Five role variants, fixed.

| Role | Variant token |
|---|---|
| `super_admin` | `bg-[--color-amber]` `text-on-brand` (fill, prominent) |
| `tenant_admin` | `bg-brand` `text-on-brand` (fill) |
| `coordinator` | `bg-brand-soft` `text-brand` border 1px brand |
| `worker` | `bg-surface` `border-line` `text-muted` |
| `custom:*` | `bg-canvas` `border-[--color-line-strong]` `text-default`, label suffix `· custom` in `text-muted` |

Reference: `docs/images/ui/team-management.png` for visual cross-check.

## Cards

The default surface above the canvas.

```tsx
<Card>
  <Card.Header>
    <Card.Title>Top properties</Card.Title>
    <Card.Subtitle>Last 30 days</Card.Subtitle>
  </Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

Spec:

- Fill `bg-surface`
- Border `border-line` 1px
- Radius `radius-xl`
- Padding `space-5` default, `space-4` in dense layouts
- No shadow

Variants by purpose, not by appearance. A `KpiCard` is just a Card with a documented internal anatomy.

### KpiCard anatomy

| Slot | Token |
|---|---|
| Label | `text-micro text-muted` |
| Value | `text-display tabular-nums text-default` |
| Delta positive | `text-small text-[--color-success]` with `▲` prefix |
| Delta negative | `text-small text-[--color-success]` with `▼` prefix (when the metric being lower is good, like avg duration) |
| Sparkline (optional) | 32px tall, brand stroke 1.5px, no fill |

## Tables

```tsx
<Table>
  <Table.Header>
    <Table.HeaderCell sortable sortKey="member">Member</Table.HeaderCell>
    <Table.HeaderCell>Role</Table.HeaderCell>
    <Table.HeaderCell align="right">Last active</Table.HeaderCell>
  </Table.Header>
  <Table.Body>
    {rows.map(r => (
      <Table.Row key={r.id} onClick={() => open(r.id)}>
        <Table.Cell>{r.member}</Table.Cell>
        <Table.Cell><RolePill role={r.role} /></Table.Cell>
        <Table.Cell align="right">{r.lastActive}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

| Property | Default | Notes |
|---|---|---|
| Row height | 48px | 36px in `density="compact"` |
| Cell padding | `space-3` y, `space-4` x | |
| Header type | `text-micro text-muted` | ALL CAPS via `text-micro` token |
| Body type | `text-body` | `text-mono` for ID columns |
| Border | `border-line` between rows, none on sides | |
| Row hover | `bg-canvas` | Pointer cursor only if `onClick` set |
| Selected row | left border 2px `bg-brand` + `bg-brand-soft` fill | |
| Sortable header | trailing chevron icon, focus + ARIA `aria-sort` | |

Tables degrade to stacked cards below `md` breakpoint. Each column becomes a labeled row inside the card.

## Avatars

`Avatar` is a colored circle with the first initial inside, weight 600. Color is `hash(userId) % 6` from a fixed palette:

| Index | Hue | Hex |
|---|---|---|
| 0 | Plum | `#7B5CA8` (text white) |
| 1 | Teal | `#2F7D7F` (text white) |
| 2 | Clay | `#A85C3B` (text white) |
| 3 | Sage | `#4C7A52` (text white) |
| 4 | Slate | `#445A7A` (text white) |
| 5 | Wine | `#8B3A4E` (text white) |

Sizes: `sm` 24px, `md` 32px, `lg` 40px. No uploaded photos in v0.1.

## Drawers

The right-side detail panel for entity views (job, worker, property).

- Width: 480px on desktop, full width on mobile.
- Slide-in 180ms `motion-base`.
- Backdrop: 40% black on the rest of the page, click-to-close.
- Trap focus on open, restore focus on close.
- Escape key closes.
- Header sticky with the entity title and a close `IconButton`.
- Footer sticky for the primary actions.

Reference: `docs/images/ui/job-detail.png`.

## Dialogs

```tsx
<Dialog>
  <Dialog.Title>Delete operator</Dialog.Title>
  <Dialog.Description>This cannot be undone. Workers and jobs under this operator will be archived.</Dialog.Description>
  <Dialog.Footer>
    <Button variant="secondary">Cancel</Button>
    <Button variant="danger">Delete operator</Button>
  </Dialog.Footer>
</Dialog>
```

- Width 480px, max 90vw.
- Center on viewport.
- Backdrop 50% black.
- `shadow-overlay`, `radius-lg`.
- Focus the destructive button only if the user invoked from a destructive context; otherwise focus the dismiss.
- Title in `text-h3`, description in `text-body text-muted`.

`ConfirmDialog` is a thin wrapper for the destructive-confirmation pattern. It requires the user to type the entity name when the destruction is irreversible.

## Toasts

Sonner under the hood, anchored bottom-right on desktop, bottom-center on mobile.

| Variant | Icon (Lucide) | Used for |
|---|---|---|
| `default` | none | Neutral confirmation. "Saved." |
| `success` | `CheckCircle` in success | "Worker invited." |
| `info` | `Info` in info | "3 pending invitations." |
| `warn` | `AlertTriangle` in warn | "Retrying webhook delivery." |
| `error` | `AlertCircle` in danger | "Couldn't reach the server." |

Auto-dismiss 5s for default and success, 8s for warn, sticky for error until dismissed. Max 3 stacked, oldest pushed out.

## Empty states

```tsx
<EmptyState
  icon={<InboxIcon />}
  title="No jobs scheduled today"
  description="Create a job from the dispatch board or schedule a recurring template."
  action={<Button variant="primary">New job</Button>}
/>
```

Icon 32px in `text-muted`. Title `text-h3`. Description `text-body text-muted`. Action centered below.

Voice rule: no apologies. No "Oops!". State the situation and offer the next step.

## Loading states

Three patterns, used in this order of preference:

1. **Skeletons.** For known shapes (table rows, KPI cards). Background `bg-canvas`, shimmer 1200ms linear infinite, `prefers-reduced-motion` collapses to a static fill.
2. **Inline spinner.** For actions in flight (button `loading` state). 14px spinner in `currentColor`.
3. **Page spinner.** Last resort. Only for first-paint on a route that can't server-render.

## Error states

| Pattern | When |
|---|---|
| Inline error under input | Form validation, single-field error |
| Banner at top of card | Form-level error after submit |
| Full-page error | 404, 403, network out |
| Drawer error | When the entity loaded but a sub-fetch failed |

Error copy never blames the user. "We couldn't reach the API. Try again." is right. "Bad input." is wrong.

## Data fetching helpers

Components do not fetch data themselves. They consume hooks from one of two server-state libraries depending on the surface.

| Surface | Hook origin | Used for |
|---|---|---|
| Anything on the GraphQL schema | `@apollo/client` | Queries, mutations, subscriptions over a normalized cache. The dispatch board, schedule, job detail, analytics. |
| Anything off the GraphQL schema | `@tanstack/react-query` | REST endpoints (file upload progress, third-party calls, CSV export polling, push subscription registration, webhook test deliveries). |

The split is by transport, not by feature. A single page can read both. A worker invitation page might `useQuery` from Apollo for the team list and `useMutation` from TanStack Query for the CSV upload. They live side by side without contention because they own different caches.

Rules of thumb:

- If the data has a typed GraphQL field, use Apollo. The normalized cache, optimistic updates with cache writes, and subscription parity all favor it.
- If the data is a one-shot REST round trip or a file stream, use TanStack Query.
- Never put server data into Zustand. Zustand is for ephemeral UI only (open menus, drag positions, filter form state before submit).
- Loading and error states come from the hook (`isPending`, `isError`, `error`) and feed into the components in this catalog. See `12-feedback-states.md` for the patterns.

## Composition rules

- Every interactive component renders a real semantic element under the hood (`<button>`, `<a>`, `<input>`). No clickable divs.
- Every form input has a visible `<Label>` or an `aria-label`. Placeholder alone is never a label.
- Every overlay traps focus and restores focus on close. shadcn/Radix does this by default; do not override.
- Every component accepts `className` for layout-level overrides, but only spacing and grid-position classes. Component-internal styling lives inside the component.
- Every component is keyboard-operable end to end. Tab order is documented per surface.

## What this file does not cover

- Page-level layout. See `02-layout-and-navigation.md`.
- Status pill choices per surface (e.g. which job statuses map to which variant). See the chapter for that surface.
- Motion choreography for specific surfaces. See the chapter for that surface.
- A11y deep dive. See `13-accessibility-and-motion.md`.

If you need a component that isn't here, add it to the catalog in a PR before using it. The set stays small or it stops being a system.
