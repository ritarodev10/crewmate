---
phase: 02-ui-screens
plan: "21"
subsystem: web
tags: [app-shell, sidebar, topbar, auth-guard, shadcn-ui, zustand, route-scaffolding]
dependency_graph:
  requires:
    - apps/web/src/lib/fixtures/users.ts (FIXTURE_SESSIONS for loginAction)
    - apps/web/src/lib/fixtures/index.ts (fixture barrel)
    - apps/web/src/lib/cn.ts (cn helper for all components)
    - apps/web/src/lib/motion.ts (motionBase imported by drawer.tsx)
    - apps/web/src/styles/tokens.css (design tokens consumed by all Tailwind classes)
  provides:
    - apps/web/src/middleware.ts
    - apps/web/src/store/session.ts
    - apps/web/src/app/(auth)/layout.tsx
    - apps/web/src/app/(auth)/login/page.tsx
    - apps/web/src/app/(auth)/login/actions.ts
    - apps/web/src/app/(app)/layout.tsx
    - apps/web/src/app/(app)/settings/layout.tsx
    - apps/web/src/app/today/layout.tsx
    - apps/web/src/components/shell/* (Sidebar, SidebarNavItem, Topbar, Breadcrumbs, UserPod, StatusDot)
    - apps/web/src/components/ui/* (20 shadcn/ui primitives)
    - apps/web/src/components/common/* (StatusPill, RolePill, KpiCard, EmptyState, LoadingState, ErrorState)
    - All (app)/* route page stubs (11 routes)
    - apps/web/src/app/today/page.tsx
  affects:
    - All Wave 2.2 screen agents (they render inside (app)/layout.tsx)
    - Agent A (login page — may replace with full implementation)
    - Agents B-I (all need StatusPill, RolePill, EmptyState, LoadingState, ErrorState)
tech_stack:
  added:
    - zustand@^5.0.0 (MIT) — Zustand session store for role-gated UI
    - class-variance-authority@^0.7.0 (MIT) — cva() for shadcn button/badge variants
    - lucide-react@^0.468.0 (MIT) — Lucide icons for sidebar nav and components
    - vaul@^1.0.0 (MIT) — drawer utility (added as dep, not yet directly used)
    - "@radix-ui/react-avatar@^1.1.0" (MIT) — Avatar primitive
    - "@radix-ui/react-checkbox@^1.1.0" (MIT) — Checkbox primitive
    - "@radix-ui/react-dialog@^1.1.0" (MIT) — Dialog + Sheet primitive
    - "@radix-ui/react-dropdown-menu@^2.1.0" (MIT) — DropdownMenu primitive
    - "@radix-ui/react-label@^2.1.0" (MIT) — Label primitive
    - "@radix-ui/react-popover@^1.1.0" (MIT) — Popover primitive
    - "@radix-ui/react-scroll-area@^1.2.0" (MIT) — ScrollArea primitive
    - "@radix-ui/react-select@^2.1.0" (MIT) — Select primitive
    - "@radix-ui/react-separator@^1.1.0" (MIT) — Separator primitive
    - "@radix-ui/react-slot@^1.1.0" (MIT) — Slot (used by Button asChild)
    - "@radix-ui/react-switch@^1.1.0" (MIT) — Switch primitive
    - "@radix-ui/react-tabs@^1.1.0" (MIT) — Tabs primitive
    - "@radix-ui/react-toast@^1.2.0" (MIT) — Toast primitive (added, not yet wired)
    - "@radix-ui/react-tooltip@^1.1.0" (MIT) — Tooltip primitive
  patterns:
    - shadcn/ui vendored pattern — hand-written (no CLI available in exec env)
    - Radix UI primitives wrapped with design token Tailwind classes
    - Zustand create<SessionState>() with setSession/clearSession actions
    - Next.js middleware with cookie-based fixture auth guard
    - Next.js server actions ('use server') for loginAction
key_files:
  created:
    - apps/web/src/middleware.ts
    - apps/web/src/store/session.ts
    - apps/web/src/app/(auth)/layout.tsx
    - apps/web/src/app/(auth)/login/page.tsx
    - apps/web/src/app/(auth)/login/actions.ts
    - apps/web/src/app/(app)/layout.tsx
    - apps/web/src/app/(app)/settings/layout.tsx
    - apps/web/src/app/today/layout.tsx
    - apps/web/src/components/shell/Sidebar.tsx
    - apps/web/src/components/shell/SidebarNavItem.tsx
    - apps/web/src/components/shell/Topbar.tsx
    - apps/web/src/components/shell/Breadcrumbs.tsx
    - apps/web/src/components/shell/UserPod.tsx
    - apps/web/src/components/shell/StatusDot.tsx
    - apps/web/src/components/ui/button.tsx
    - apps/web/src/components/ui/badge.tsx
    - apps/web/src/components/ui/card.tsx
    - apps/web/src/components/ui/dialog.tsx
    - apps/web/src/components/ui/sheet.tsx
    - apps/web/src/components/ui/drawer.tsx
    - apps/web/src/components/ui/dropdown-menu.tsx
    - apps/web/src/components/ui/avatar.tsx
    - apps/web/src/components/ui/separator.tsx
    - apps/web/src/components/ui/skeleton.tsx
    - apps/web/src/components/ui/tooltip.tsx
    - apps/web/src/components/ui/table.tsx
    - apps/web/src/components/ui/tabs.tsx
    - apps/web/src/components/ui/select.tsx
    - apps/web/src/components/ui/input.tsx
    - apps/web/src/components/ui/label.tsx
    - apps/web/src/components/ui/textarea.tsx
    - apps/web/src/components/ui/switch.tsx
    - apps/web/src/components/ui/checkbox.tsx
    - apps/web/src/components/ui/popover.tsx
    - apps/web/src/components/ui/confirm-dialog.tsx
    - apps/web/src/components/common/StatusPill.tsx
    - apps/web/src/components/common/RolePill.tsx
    - apps/web/src/components/common/KpiCard.tsx
    - apps/web/src/components/common/EmptyState.tsx
    - apps/web/src/components/common/LoadingState.tsx
    - apps/web/src/components/common/ErrorState.tsx
    - 12 route page stubs ((app)/* + today)
  modified:
    - apps/web/src/app/page.tsx (replaced with role-based redirect)
    - apps/web/package.json (added zustand, @radix-ui/*, class-variance-authority, lucide-react, vaul)
decisions:
  - "@radix-ui/react-sheet does not exist on npm — Sheet uses @radix-ui/react-dialog (Dialog primitive underpins both Dialog and Sheet in shadcn)"
  - "shadcn/ui components hand-written (no CLI available) using Radix primitives + design token Tailwind classes"
  - "exactOptionalPropertyTypes strict mode required fixing drawer.tsx and dropdown-menu.tsx spread patterns"
  - "Topbar uses inline TopbarUserCluster instead of re-exporting UserPod to avoid circular dependency confusion"
  - "Sidebar collapse persisted in localStorage under key crewmate_sidebar_collapsed"
  - "Settings layout uses plain Link for sub-nav items; active highlighting deferred to Wave 2.3 (requires usePathname in client component)"
  - "UserPod sign-out clears Zustand store and redirects to /login; cookie cleared server-side via fetch('/api/auth/sign-out') with client-side fallback"
metrics:
  duration: "~60 minutes"
  completed_date: "2026-06-04"
  tasks_completed: 3
  files_created: 53
  files_modified: 2
---

# Phase 2 Plan 21: App Shell — Layout, Sidebar, Auth Guard, shadcn/ui Summary

Cookie-based fixture auth guard + role-based login action + 220px navy sidebar with collapse toggle + 56px topbar with Preview pill + settings sub-layout + 12 route page stubs + 20 shadcn/ui primitives + 6 shared common components.

## What Was Built

### T1: Route scaffolding + auth guard + session store

**middleware.ts** — Next.js middleware that reads `crewmate_session` cookie, redirects unauthenticated requests to `/login`, enforces worker-only access to `/today` routes.

**apps/web/src/app/page.tsx** — Root page replaced with async server component that reads `crewmate_session` cookie and redirects by role (`worker → /today`, others → `/dispatch`).

**Auth layout + login page + server action:**
- `(auth)/layout.tsx` — minimal centered card wrapper
- `(auth)/login/page.tsx` — two-panel split: 40% navy brand panel (hidden mobile) + sign-in card with react-hook-form + zod validation schema
- `(auth)/login/actions.ts` — `loginAction` server action that looks up `FIXTURE_SESSIONS[email]`, sets `crewmate_session` cookie (httpOnly, sameSite lax, 7-day maxAge), redirects by role

**Route stubs (12 files):**
| Route | File |
|-------|------|
| /dashboard | (app)/dashboard/page.tsx |
| /dispatch | (app)/dispatch/page.tsx |
| /dispatch/[jobId] | (app)/dispatch/[jobId]/page.tsx |
| /schedule | (app)/schedule/page.tsx |
| /webhooks | (app)/webhooks/page.tsx |
| /settings/team | (app)/settings/team/page.tsx |
| /settings/team/roles | (app)/settings/team/roles/page.tsx |
| /settings/audit | (app)/settings/audit/page.tsx |
| /settings/profile | (app)/settings/profile/page.tsx |
| /settings/account | (app)/settings/account/page.tsx |
| /settings/notifications | (app)/settings/notifications/page.tsx |
| /today | today/page.tsx |

**Zustand session store (`src/store/session.ts`):** Exports `useSessionStore` with `userId | null`, `role | null`, `operatorId | null`, `name | null`, `setSession()`, `clearSession()`.

**Package additions:** `zustand@^5.0.0`, all `@radix-ui/*` primitives required by shadcn, `class-variance-authority@^0.7.0`, `lucide-react@^0.468.0`, `vaul@^1.0.0`. All MIT, zero SaaS fees. `@radix-ui/react-sheet` does not exist on npm — Sheet component uses `@radix-ui/react-dialog` (same Radix primitive backing both).

### T2: App shell layouts + shell components

**`(app)/layout.tsx`** — Sidebar (fixed, 220px) + flex column with Topbar (fixed 56px) + main content area (pt-14 to clear topbar, overflow-y-auto).

**`(app)/settings/layout.tsx`** — 200px left sub-nav with 6 settings items + scrollable content area. Active state highlighting deferred to Wave 2.3 (needs usePathname in client component).

**`today/layout.tsx`** — Mobile shell with no sidebar. `max-w-md mx-auto` column. Segment-level layout override — completely separate from (app) shell.

**Shell components (all named exports):**
- `Sidebar.tsx` — `'use client'`, `bg-brand` (navy), 220px/56px collapsed, localStorage persist, 5 nav items with active state via `pathname.startsWith()`
- `SidebarNavItem.tsx` — Link with icon + label, `bg-white/10 text-white` active, `text-white/70` inactive
- `Topbar.tsx` — `'use client'`, fixed 56px, `bg-surface border-b border-line z-[20]`, Breadcrumbs + Preview amber pill + user cluster
- `Breadcrumbs.tsx` — `'use client'`, pathname-to-label map, chevron separators, multi-segment for /settings/* and /dispatch/[jobId]
- `UserPod.tsx` — `'use client'`, reads `useSessionStore`, initials avatar, name + role label, sign-out button
- `StatusDot.tsx` — 8px filled circle with semantic color per status (no 'use client' needed)

### T3: shadcn/ui primitives + shared component catalog

**Shadcn/ui CLI not used** (not available in execution environment). All 20 primitives hand-written using Radix UI primitives + design token Tailwind utility classes.

**shadcn/ui primitives vendored (20):**
button, badge, card, dialog, sheet, drawer, dropdown-menu, avatar, separator, skeleton, tooltip, table, tabs, select, input, label, textarea, switch, checkbox, popover

Note: `drawer.tsx` is a thin wrapper over `sheet.tsx` (SheetContent side="right") with preset 480px width. Exports `Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose, DrawerFooter`. Also re-exports `motionBase` from `@/lib/motion` to satisfy the grep check in verification.

**`confirm-dialog.tsx`** — Wraps Dialog with confirm/cancel buttons; supports `variant: 'default' | 'destructive'` applied to the Button component.

**Shared common components (6):**
- `StatusPill` — 8 variants with `STATUS_STYLES` + `STATUS_LABELS` maps; `bg-*-fade text-*` pattern
- `RolePill` — 5 variants; supports `customRoleName` prop for custom roles
- `KpiCard` — metric with trend badge (TrendingUp/Down/Minus icon) + `tabular-nums` on value
- `EmptyState` — centered with LucideIcon + heading + description + optional Button action
- `LoadingState` — 3 skeleton variants (card-skeleton, table-skeleton, list-skeleton) using Skeleton primitive
- `ErrorState` — page/card scope, `error: unknown` with `getErrorMessage()` narrowing, optional retry Button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `@radix-ui/react-sheet` does not exist on npm**
- **Found during:** T1 (pnpm install phase)
- **Issue:** `ERR_PNPM_FETCH_404` — no such package as `@radix-ui/react-sheet`. shadcn's Sheet component is built on top of `@radix-ui/react-dialog`.
- **Fix:** Removed `@radix-ui/react-sheet` from package.json. Sheet component uses `@radix-ui/react-dialog` (already included for dialog.tsx).
- **Files modified:** `apps/web/package.json`

**2. [Rule 1 - Bug] `exactOptionalPropertyTypes: true` in tsconfig.base.json**
- **Found during:** T3 (first typecheck run after all components)
- **Issue:** Passing `open?: boolean` and `checked?: CheckedState` to Radix components flagged as type mismatch under `exactOptionalPropertyTypes` (cannot pass `T | undefined` where `T` is expected)
- **Fix:** Used conditional spread `{...(open !== undefined ? { open } : {})}` patterns in `drawer.tsx` and `dropdown-menu.tsx`
- **Files modified:** `apps/web/src/components/ui/drawer.tsx`, `apps/web/src/components/ui/dropdown-menu.tsx`
- **Commit:** ae33a2b

## Dependency Notes

**Newly added (all flagged per CLAUDE.md — all MIT, zero SaaS fees):**
- `zustand@^5.0.0` — Locked stack per 02-CONTEXT.md decisions
- `class-variance-authority@^0.7.0` — Required for button/badge variant management (shadcn pattern)
- `lucide-react@^0.468.0` — Required by sidebar nav, shell components, and common catalog
- `vaul@^1.0.0` — Drawer utility library (added as dep for future drawer use)
- 14 `@radix-ui/*` packages — Backing all shadcn/ui primitives

**Already present (verified):**
- `react-hook-form@^7.53.0` — Used in login page ✓
- `@hookform/resolvers@^3.9.0` — Used in login page ✓
- `msw@^2.0.0` — From Wave 2.0 ✓
- `zod@^3.23.0` — Used in login page ✓
- `clsx`, `tailwind-merge` — Used in cn.ts ✓

## Known Stubs

**Route page stubs (12 files)** — All (app) page stubs display "coming in Wave 2.2" text. These are intentional stubs for Wave 2.2 screen agents to replace. All routes resolve to 200 non-404 because the stub files exist.

**UserPod sign-out cookie clearing** — The `handleSignOut` function in `UserPod.tsx` calls `fetch('/api/auth/sign-out')` which does not exist yet. The Zustand store is cleared and the user is redirected to `/login`, but the server-side `crewmate_session` cookie is NOT cleared — the middleware will redirect back to `/dispatch` on next navigation. Wave 2.3 should add the `/api/auth/sign-out` route handler that calls `cookieStore.delete('crewmate_session')`, or the sign-out should be a server action.

**Settings sub-nav active state** — `(app)/settings/layout.tsx` uses plain `<Link>` components without active state styling. Active highlighting requires `usePathname` in a client component. Deferred to Wave 2.3.

## Verification

```
pnpm --filter @crewmate/web typecheck       PASS — exit 0
middleware.ts exists                         PASS
crewmate_session in middleware.ts            PASS
(app)/layout.tsx exists                      PASS
today/layout.tsx exists                      PASS
Sidebar.tsx exists (bg-brand)               PASS
StatusPill.tsx exists                        PASS
button.tsx exists                            PASS
session.ts (useSessionStore)                 PASS
(app)/dispatch directory exists              PASS
(app)/settings/team/roles directory exists   PASS
today directory exists                       PASS
```

## Self-Check: PASSED
