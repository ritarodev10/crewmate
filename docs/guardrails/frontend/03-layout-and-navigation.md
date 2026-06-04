# 03 — Layout and navigation

The shell that wraps every operator-facing surface. Sidebar on the left, topbar on top, content in the middle. This chapter is the visual and behavioral contract for the chrome. Every page chapter downstream assumes this layout is already in place.

The visual baseline lives in `docs/images/ui/dispatch-board.png`, `docs/images/ui/schedule.png`, `docs/images/ui/team-management.png`, and `docs/images/ui/analytics.png`. The worker mobile shell is described separately at the end of this file and visualized in `docs/images/ui/worker-mobile.png`.

## App shell anatomy

Three regions. Sidebar is fixed, topbar is sticky, content area scrolls.

```tsx
<AppShell>
  <Sidebar />
  <Main>
    <Topbar />
    <PageContent />
  </Main>
</AppShell>
```

### Region spec

| Region | Width | Height | Fixed or scroll |
|---|---|---|---|
| Sidebar | 240px expanded, 64px collapsed | 100vh | Fixed. Does not scroll with the page. |
| Topbar | flex 1 | 64px | Sticky to top of `<Main>` scroll context. |
| Content | flex 1 | flex 1 | Scrolls. The only region that scrolls. |

The sidebar has its own internal scroll if the nav list exceeds the viewport, which only happens at very small heights. The user pod stays pinned to the bottom.

### Breakpoints

The shell behaves in three modes. Breakpoint tokens follow the Tailwind defaults already in `tailwind.config.ts`.

| Mode | Range | Sidebar | Topbar |
|---|---|---|---|
| Desktop wide | `≥ 1280px` | Expanded, 240px | Full topbar with title, search, actions |
| Desktop narrow | `1024px - 1279px` | Collapsed, 64px (icon-only) | Full topbar |
| Tablet | `768px - 1023px` | Collapsed, 64px | Full topbar, search collapses to icon trigger |
| Mobile | `< 768px` | Hidden behind a drawer, hamburger in topbar | Single-line topbar |

The worker view at `/today` ignores this entirely and uses a bottom tab bar. See [Mobile shell](#mobile-shell).

## Sidebar

The sidebar is the navigation spine for operators (coordinators, tenant admins, super admins). Workers never see it.

### Anatomy, top to bottom

1. Wordmark area, 64px tall.
2. Primary nav list.
3. Settings, which expands into a nested nav when active.
4. User pod, pinned to the bottom.

### Wordmark

```tsx
<SidebarWordmark>CrewMate</SidebarWordmark>
```

| Slot | Token |
|---|---|
| Height | 64px |
| Padding | `space-4` x |
| Type | `text-h2 text-on-brand` |
| Background | `bg-brand` |
| Border bottom | none |

In collapsed mode the wordmark shrinks to just the `C` glyph, centered, same height.

### Primary nav items

The order is fixed. Top to bottom.

| Label | Icon (Lucide) | Route |
|---|---|---|
| Dashboard | `LayoutDashboard` | `/dashboard` |
| Dispatch board | `Columns3` | `/dispatch` |
| Schedule | `Calendar` | `/schedule` |
| Properties | `Building2` | `/properties` |
| Workers | `Users` | `/workers` |
| Webhooks | `Webhook` | `/webhooks` |

A single item is one row, 40px tall, 12px corner radius on the inner highlight pill. The icon is `icon-md` (18px) in the leading slot, label in `text-body`, 12px gap between them.

| State | Background | Text | Icon |
|---|---|---|---|
| Default | transparent | `rgba(255,255,255,0.72)` on `bg-brand` | inherits |
| Hover | `bg-navy-soft` | `text-on-brand` | inherits |
| Focus | 2px outline `--color-amber` at 2px offset | `text-on-brand` | inherits |
| Active | `bg-navy-soft` with 3px leading bar in `--color-amber` | `text-on-brand` | inherits |
| Disabled | transparent | 40% opacity | inherits |

Active is decided by route prefix match, not exact match. `/dispatch/jobs/123` keeps Dispatch board active.

### Implementation status indicator

Each top-level nav item shows a small colored dot at the far right of the row. The dot signals the implementation status of the screen behind the link. The three statuses map to the canonical roadmap tiers documented in `docs/FEATURES.md`.

| Status | Dot color | Token | Tooltip text |
|---|---|---|---|
| Live | green | `bg-[--color-success]` | "Working with real data" |
| Preview | amber | `bg-[--color-warn]` | "Visible with sample data" |
| Planned | gray | `bg-[--color-line-strong]` | "Coming soon" |

Dot spec.

| Property | Value |
|---|---|
| Size | 8px circle |
| Radius | `radius-full` |
| Position | right edge of the nav row, 16px from the right padding, vertically centered |
| Container | a non-interactive `<span>` with `aria-label` set to the tooltip text |
| Tooltip | the `Tooltip` component from `01-components.md`, opens on hover and on keyboard focus of the parent nav row |

The dot does not change layout when the sidebar collapses to icon-only. In the collapsed state the dot tucks against the bottom-right of the icon at the same 8px size.

Per-nav status mapping for the primary nav.

| Nav | Status |
|---|---|
| Dashboard | Preview |
| Dispatch board | Live |
| Schedule | Preview |
| Properties | Preview |
| Workers | Preview |
| Webhooks | Preview |

Per-nav status for the Settings sub-nav (same convention, dots aligned at the right of each sub-item).

| Sub-nav | Status |
|---|---|
| Profile | Preview |
| Notifications | Preview |
| Team | Preview |
| Properties | Preview |
| Webhooks | Preview |
| Audit log | Preview |
| Account | Preview |

When a status changes (a Planned item is shipped and becomes Live), the change is made in two places, the dot mapping above and the feature card in `docs/FEATURES.md`. The PR that promotes a feature to a new tier touches both files in the same change.

### Settings nested nav

Settings is the seventh item, below Webhooks, separated by a 1px `border-line` divider at 24% opacity on navy.

```tsx
<SidebarItem
  label="Settings"
  icon={<Settings2 />}
  href="/settings"
  nested={[
    { label: "Team", href: "/settings/team" },
    { label: "Properties", href: "/settings/properties" },
    { label: "Webhooks", href: "/settings/webhooks" },
    { label: "Billing", href: "/settings/billing" },
    { label: "Audit log", href: "/settings/audit" },
  ]}
/>
```

When the route is under `/settings`, the parent shows the active state and the nested set expands inline. The nested items are 32px tall, indented `space-8` from the sidebar left edge, no icon, type `text-small`.

Nested item active state uses `bg-navy-soft` only, no leading amber bar (the amber bar lives on the parent).

The expansion is instant. No height animation. Hiding and revealing the nested list is a layout change, not a transition.

### User pod

Pinned to the bottom with `margin-top: auto`. A 1px top divider in the same 24% navy-on-navy tone.

```tsx
<UserPod
  user={{ name: "Riya P.", role: "tenant_admin", tenant: "Basecorps" }}
  onClick={openUserMenu}
/>
```

| Slot | Token |
|---|---|
| Container height | 64px |
| Padding | `space-3` x, `space-2` y |
| Avatar | `Avatar` size `md` (32px) |
| Name | `text-body-strong text-on-brand` |
| Tenant | `text-small` at 60% white opacity |
| Role pill | `RolePill` (sized `xs` variant when available, otherwise default with reduced padding) |
| Trailing icon | `ChevronUp` `icon-sm` at 60% white opacity |

The pod is a single button. Clicking opens the user menu via `DropdownMenu` anchored above the pod. Menu items are documented in [Topbar user menu](#user-menu).

In collapsed mode only the avatar shows, centered. Role pill and tenant text are hidden. The dropdown still opens from the avatar.

### Collapsed (icon-only) state

Triggered automatically between 1024px and 1279px, or manually by clicking a chevron in the wordmark area when wider. Width 64px.

| Element | Behavior |
|---|---|
| Wordmark | `C` glyph only |
| Nav item label | Hidden, icon only, 40px tall, centered |
| Nav item tooltip | `Tooltip` on hover, label as content, anchored right |
| Settings nested | Closed by default. Active settings sub-route shows the parent as active. The nested list does not appear inline. The user navigates by entering Settings and using the in-page sub-nav (see [Settings page header](#settings-page-header)). |
| User pod | Avatar only |

The collapse toggle persists in `localStorage` per user. Default is expanded above 1280px and collapsed between 1024 and 1279px.

## Topbar

Sticky to the top of the content area, 64px tall. Background `bg-canvas`. No border until the page is scrolled, then a 1px bottom border in `--color-line` appears.

### Anatomy

```tsx
<Topbar>
  <Topbar.Title>Dispatch board</Topbar.Title>
  <Topbar.Subtitle>Brookline Property Co. · Today, Tue Mar 12</Topbar.Subtitle>
  <Topbar.Right>
    <SearchInput placeholder="Search jobs, properties, workers" />
    <Button variant="primary">New job</Button>
    <Avatar />
  </Topbar.Right>
</Topbar>
```

| Slot | Token |
|---|---|
| Container padding | `space-4` x, full bleed under sidebar offset |
| Title | `text-h1 text-default` |
| Status indicator | `StatusPill` variant matched to the screen's tier, sits inline to the right of the title with `space-3` gap, vertically centered to the title cap-height |
| Subtitle | `text-small text-muted`, sits below the title on the next line |
| Right cluster | flex row, `space-3` gap, aligned to right edge |
| Search input | width 320px on desktop wide, 240px on desktop narrow, icon trigger on tablet and below |
| Primary action | `Button variant="primary" size="md"` |
| User menu trigger | `Avatar` size `md`, opens `DropdownMenu` |

### Screen-title status indicator

Every page title carries a small status pill to its right, signaling whether the screen is Live, Preview, or Planned. The pill mirrors the sidebar dot status from the section above but renders the label and a leading icon so the operator on the page knows immediately what state the page is in.

| Status | Variant | Icon (Lucide) | Label |
|---|---|---|---|
| Live | `StatusPill variant="success"` | `CheckCircle2` | "Live" |
| Preview | `StatusPill variant="progress"` | `Eye` | "Preview" |
| Planned | `StatusPill variant="neutral"` | `Clock` | "Planned" |

The pill consumes `StatusPill` from `01-components.md` with its leading-icon slot. The icon is `icon-xs` (14px) in `currentColor`, label in `text-micro`, height 22px, padding `space-1` y and `space-2` x, radius `radius-sm`.

Hover or keyboard focus on the pill opens a `Tooltip` with a one-line explainer.

| Status | Tooltip text |
|---|---|
| Live | "This screen is wired to the real backend." |
| Preview | "This screen renders sample data. Some actions may not persist." |
| Planned | "This screen is on the roadmap. Not yet built." |

The pill is non-interactive beyond the tooltip. It does not navigate. It does not change state. It is a read-only signal.

When the route renders a Drawer over a page, the drawer header carries its own copy of the same pill for the entity behind the drawer. If the host page is Preview but the entity inside is Live (or vice versa), the drawer pill wins for that drawer surface. This case is rare but documented so the contract is explicit.

The status per page maps one-to-one to the sidebar dot mapping in the section above. Promoting a screen from Preview to Live is a single PR that updates the dot mapping, the topbar pill mapping for that screen, and the feature card in `docs/FEATURES.md`.

### Subtitle pattern

The subtitle line carries page-level context the operator needs to interpret what they are looking at. Conventionally:

- Dispatch board, Schedule, Analytics. `<Operator name> · <Date or range>`.
- Settings sub-pages. The breadcrumb takes the subtitle slot.
- Worker detail and job detail (drawers). Drawers have their own header, not the topbar.

### Sticky behavior

The topbar stays anchored as the content scrolls. The bottom border is conditional. On scroll offset `> 0` add `border-line` 1px to the bottom edge. Use `IntersectionObserver` on a sentinel at the top of the content, no scroll listener.

The topbar does not shrink. It stays 64px. Page title and subtitle stay the same size.

### Breadcrumbs

Used on deep pages where the route depth exceeds two segments. Settings sub-pages and audit log detail are the canonical cases.

```tsx
<Breadcrumb>
  <Breadcrumb.Item href="/settings">Settings</Breadcrumb.Item>
  <Breadcrumb.Separator />
  <Breadcrumb.Item href="/settings/audit">Audit log</Breadcrumb.Item>
  <Breadcrumb.Separator />
  <Breadcrumb.Item current>Event evt_2x9k…</Breadcrumb.Item>
</Breadcrumb>
```

| Slot | Token |
|---|---|
| Item, default | `text-small text-muted` |
| Item, hover | `text-default`, underline |
| Item, current | `text-small text-default`, not a link |
| Separator | `ChevronRight` `icon-xs` in `text-muted`, `space-1` x gap on each side |

Truncation rule. When the trail has four or more items, the middle items collapse into a single ellipsis token. First item and last two items always render in full.

```
Settings › … › Audit log › Event evt_2x9k…
```

The ellipsis is a `DropdownMenu` trigger. Opening it lists the hidden items in route order. Each item is a real link.

Breadcrumbs render inside the topbar in the subtitle slot when present. The page title remains the page name.

### Search and filter row

Some pages need a filter row instead of (or below) the search input. Dispatch board has neither in the topbar (filters live in the board itself). Schedule has a date-range picker and a worker filter in the right slot. Analytics has a date range picker and an Export button.

The right cluster accepts up to three items at desktop wide. At desktop narrow, items beyond two collapse into an `IconButton` with a `MoreHorizontal` icon that opens a `DropdownMenu`. The primary action stays visible at every breakpoint.

### User menu

Triggered from the avatar in the topbar right cluster and from the user pod in the sidebar. Same menu in both places.

| Item | Icon | Action |
|---|---|---|
| Account | `UserCircle2` | `/settings/profile` |
| Switch tenant | `ArrowLeftRight` | Opens tenant switcher dialog |
| Theme | `Sun` / `Moon` | Submenu, light / dark / system |
| Keyboard shortcuts | `Keyboard` | Opens shortcuts dialog |
| Sign out | `LogOut` | Triggers logout |

The menu is a `DropdownMenu`. Width 240px, anchored to the trigger. Items separated by a 1px `border-line` divider between Theme and Keyboard shortcuts and again above Sign out.

## Page grid

The content area uses a centered column with breakpoint-aware max width and gutters.

| Breakpoint | Max content width | Side gutters |
|---|---|---|
| `< 768px` | 100% | `space-4` |
| `768 - 1023` | 100% | `space-6` |
| `1024 - 1279` | 1024px | `space-6` |
| `1280 - 1439` | 1280px | `space-8` |
| `≥ 1440` | 1280px default, 1440px on dense pages | `space-8` |

Dense pages are Analytics, Webhook log, and Audit log. They opt into the 1440px max by setting `density="wide"` on the page wrapper.

```tsx
<Page density="wide">
  <Page.Header>...</Page.Header>
  <Page.Section>...</Page.Section>
  <Page.Section>...</Page.Section>
</Page>
```

### Vertical rhythm

`space-8` between top-level sections on the page. `space-6` between subsections inside a card. The topbar is its own region and sits flush against the page header without an extra gap.

The page bottom always has at least `space-8` of trailing whitespace before the viewport edge so the last row of content doesn't kiss the bottom of the screen.

## Mobile shell

Below 768px the operator shell switches modes. The worker view at `/today` switches to its own shell at any width.

### Operator mobile

The sidebar disappears. A hamburger `IconButton` enters the topbar left slot. Tapping it opens the sidebar as a slide-in drawer.

| Element | Behavior |
|---|---|
| Hamburger | Leading slot in topbar, `icon-lg` (20px), opens the sidebar drawer |
| Sidebar drawer | Slides in from the left, 280px wide, backdrop 40% black, slide 180ms `motion-base` |
| Topbar | Single line. Title only. Subtitle moves below the topbar into the page header. |
| Topbar right cluster | Search collapses to icon trigger. Primary action stays visible. User menu trigger stays. |
| Page gutters | `space-4` |

The drawer is the same component family as detail drawers (`Drawer`), configured to slide from the left instead of the right.

### Worker mobile shell

The `/today` route uses a different shell entirely. No sidebar, no topbar in the operator sense.

| Region | Spec |
|---|---|
| Top region | Page title `text-h1`, sub-line `text-small text-muted`, 7-day strip below |
| Content | Vertical stack of job cards, full width with `space-4` gutters |
| Bottom tab bar | Sticky, 56px tall, three tabs |

Bottom tab bar tabs, in order. Today, History, Profile.

| Tab | Icon (Lucide) | Route |
|---|---|---|
| Today | `Calendar` | `/today` |
| History | `History` | `/today/history` |
| Profile | `UserCircle2` | `/today/profile` |

Active tab uses `text-brand` for icon and label. Inactive uses `text-muted`. The tab bar has a 1px top border in `--color-line` and `bg-surface` fill. No backdrop blur.

The worker shell is documented in detail in `15-worker-mobile.md`.

## Command palette (Cmd+K)

A global navigator triggered by `Cmd+K` on macOS and `Ctrl+K` on Windows and Linux. The implementation is deferred to v2. The contract is documented now so other chapters can reference it.

### Trigger

| Source | Behavior |
|---|---|
| `Cmd+K` / `Ctrl+K` | Opens the palette from any operator route |
| Search input click | Opens the palette, focusing the search field |
| Topbar `MoreHorizontal` overflow → Search | Opens the palette |

The palette is not available on the worker mobile shell.

### Layout

`CommandPalette` (from chapter 01) opens centered, 560px wide, max 80vh, `shadow-overlay`, `radius-lg`.

| Region | Content |
|---|---|
| Search field | Type `text-body`, 44px tall, placeholder `Search jobs, properties, workers, settings` |
| Sections | Grouped lists with section headers in `text-micro text-muted` |
| Footer | Hint row, `text-small text-muted`, shows `↑↓ to navigate`, `↵ to select`, `esc to close` |

### Sections

Order is fixed. Sections with no matches collapse.

1. **Recent.** Last five destinations or actions the user touched.
2. **Jobs.** Search results from the jobs index.
3. **Properties.** Search results from the property index.
4. **Workers.** Search results from the worker index.
5. **Go to.** Static destinations (Dashboard, Dispatch board, Schedule, Settings, Audit log).
6. **Actions.** Verbs the user can perform (`New job`, `Invite member`, `Open webhook log`).

Each row shows a leading icon, label, and a trailing hint when relevant. Selected row uses `bg-brand-soft` and `text-brand` for the leading icon.

### Keyboard

| Key | Behavior |
|---|---|
| `↑` / `↓` | Move selection |
| `↵` | Activate selected row |
| `esc` | Close palette |
| `tab` | Cycle between input and result list |
| `cmd+1..6` | Jump to section |

## Skeleton loading for the shell

The shell paints in two phases on first load.

1. **Phase one, immediate.** The frame paints with the sidebar, topbar bar, and an empty content area. Sidebar nav items render as labeled skeletons (the labels are static, the active state is unknown until the route resolves). Topbar title is a 200px wide skeleton bar. User pod shows a skeleton avatar and a 120px name bar.
2. **Phase two, on session resolve.** Real labels and active states replace the skeletons. The content area transitions from its own skeleton (page-specific) to the resolved view.

The shell skeleton uses the same `LoadingState` shimmer documented in `01-components.md`. Shimmer is 1200ms linear infinite, collapsed to a static fill under `prefers-reduced-motion`.

Total expected time from request to phase two is under 400ms on warm cache. If the session resolve takes longer than 800ms, a `Banner` enters at the top of the content area with `Still loading your session…` until resolution.

## Settings page header

When the route is under `/settings`, the topbar uses the breadcrumb subtitle pattern and the page renders a secondary nav row directly under the topbar.

```tsx
<Page>
  <SettingsTabs
    items={[
      { label: "Team", href: "/settings/team" },
      { label: "Properties", href: "/settings/properties" },
      { label: "Webhooks", href: "/settings/webhooks" },
      { label: "Billing", href: "/settings/billing" },
      { label: "Audit log", href: "/settings/audit" },
    ]}
  />
  <Page.Section>...</Page.Section>
</Page>
```

The tabs are a horizontal list, `text-body` labels, 40px tall, 1px bottom border in `border-line` under the row, with the active tab carrying a 2px `bg-brand` underline. This pattern is the in-page mirror of the sidebar nested nav, so collapsed-sidebar users still have a navigation surface.

## Z-index ladder

The shell sets the ground floor of the stacking context.

| Layer | z-index | Members |
|---|---|---|
| Base | 0 | Page content |
| Sidebar | 10 | Sidebar fixed column |
| Topbar | 20 | Sticky topbar |
| Sticky in-page headers | 30 | Settings tabs row, table sticky headers |
| Dropdown / popover | 40 | `DropdownMenu`, `Popover`, `Tooltip` |
| Drawer | 50 | `Drawer` and its backdrop |
| Dialog | 60 | `Dialog`, `ConfirmDialog`, command palette |
| Toast | 70 | `Toast` stack |

Component code never sets a raw z-index. It picks a layer name through the role utilities defined in `tailwind.config.ts` (`z-base`, `z-shell`, `z-overlay`, etc.).

[NEEDS: `z-*` Tailwind role utilities — referenced here but not yet defined in `00-design-system.md`.]

## Keyboard map for the shell

| Key | Action | Scope |
|---|---|---|
| `Cmd+K` / `Ctrl+K` | Open command palette | Global, operator routes |
| `Cmd+B` / `Ctrl+B` | Toggle sidebar expanded state | Operator routes, desktop only |
| `g d` | Go to Dashboard | When palette is closed and no input is focused |
| `g b` | Go to Dispatch board | Same |
| `g s` | Go to Schedule | Same |
| `g w` | Go to Workers | Same |
| `?` | Open keyboard shortcuts dialog | Global |

Single-key go-to bindings only fire when no input owns focus.

## Gaps

The following are referenced in this chapter but not yet fully designed or built. They are explicit, not silent.

- **Command palette implementation.** Documented as a contract. The actual `CommandPalette` component lives in `01-components.md` but the search wiring, recent-list source, and section ranking are deferred to v2.
- **Sidebar collapse toggle affordance.** The chevron in the wordmark area is described in behavior but no icon position or hover state is locked yet.
- **Tenant switcher dialog.** Listed as a user menu destination. Its own layout is not in any chapter.
- **Mobile sidebar drawer specifics.** The slide direction and width are set; the focus return target after close is not.
- **Right-to-left support.** Not designed for v0.1. The mirrored sidebar and breadcrumb behavior will get a chapter when localization scope opens.
- **Z-index Tailwind utilities.** Marked with `[NEEDS]` above. Until those tokens land in `00-design-system.md`, components should reference layer names from this chapter and not invent raw z-index values.
