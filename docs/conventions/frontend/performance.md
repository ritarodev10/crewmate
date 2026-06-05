# Performance & Optimization

Patterns that make CrewMate feel instant. The goal: every screen transition, drawer open, and status change should feel like it already happened before the server confirms it.

---

## 1. The Navigation Problem — and the Fix

### Why Clicks Feel Slow

Next.js App Router waits for the destination Server Component to resolve before painting the new route. In CrewMate, `page.tsx` files are thin Server Components that render instantly (they only compose Client Component boundaries). But without prefetching, the browser still makes a round trip to the server to fetch the page's RSC payload before transitioning. The result: the user clicks "Jobs" in the sidebar and stares at the old page for 200-400ms while the network resolves.

The fix is a layered prefetch strategy. Each layer catches a different case.

### Layer 1 — `<Link>` Prefetching

Next.js `<Link>` prefetches the destination page segment on viewport entry in production. Make this explicit on every sidebar nav item and never use raw `<a>` tags for internal navigation.

```tsx
// components/sidebar.tsx
import Link from 'next/link';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Workforce', href: '/workforce', icon: Users },
  { label: 'Revenue', href: '/revenue', icon: DollarSign },
];

function NavItem({ item, isActive }: { item: typeof navItems[number]; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      prefetch={true}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2',
        isActive
          ? 'bg-[--color-sidebar-item-active] text-[--color-sidebar-fg]'
          : 'text-[--color-sidebar-fg-muted] hover:bg-[--color-sidebar-item-hover] hover:text-[--color-sidebar-fg]',
      )}
    >
      <item.icon className="size-5" />
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  );
}
```

Rules:
- Set `prefetch={true}` explicitly. It is the default in App Router production builds, but being explicit prevents accidental opt-out and makes the intent clear to every developer reading the code.
- Never use `<a href="/jobs">` for internal navigation. It triggers a full page reload, destroys all client state (Zustand stores, TanStack Query cache, WebSocket connections), and restarts the React tree from scratch.
- Worker mobile views use `<Link>` the same way for `/worker` and `/worker/jobs/[id]`.

### Layer 2 — TanStack Query Route Prefetch on Hover

`<Link>` prefetches the page shell (the RSC payload), but the page's data still has to load via TanStack Query after the Client Component mounts. The user sees the page skeleton while the first `useQuery` fires.

Fix: prefetch the data on hover of the nav link so it is already in the TanStack Query cache when the page mounts.

```tsx
// components/sidebar.tsx
'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';

const routePrefetchMap: Record<string, () => void> = {};

function useSidebarPrefetch() {
  const queryClient = useQueryClient();

  routePrefetchMap['/dashboard'] = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.summary,
      queryFn: () => apiClient.get('/dashboard/summary'),
      staleTime: 15_000,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.activity,
      queryFn: () => apiClient.get('/dashboard/activity'),
      staleTime: 15_000,
    });
  };

  routePrefetchMap['/jobs'] = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.all,
      queryFn: () => apiClient.get('/jobs'),
      staleTime: 30_000,
    });
  };

  routePrefetchMap['/workforce'] = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.workers.all,
      queryFn: () => apiClient.get('/workers'),
      staleTime: 30_000,
    });
  };

  routePrefetchMap['/revenue'] = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.revenue.all,
      queryFn: () => apiClient.get('/revenue'),
      staleTime: 30_000,
    });
  };

  return routePrefetchMap;
}
```

Then in the nav item:

```tsx
function NavItem({ item, isActive }: NavItemProps) {
  const prefetchMap = useSidebarPrefetch();

  return (
    <Link
      href={item.href}
      prefetch={true}
      onMouseEnter={() => prefetchMap[item.href]?.()}
      className={cn(/* ... */)}
    >
      {/* ... */}
    </Link>
  );
}
```

The `staleTime` in each `prefetchQuery` call must match the `staleTime` in the corresponding `useQuery` hook. If they differ, the prefetched data may be considered stale immediately on mount, causing a redundant refetch.

### Layer 3 — `router.prefetch()` on App Mount

For the three most-visited routes, prefetch the RSC payload eagerly on app mount instead of waiting for hover. This eliminates even the hover-to-click latency on first navigation after login.

```tsx
// components/sidebar.tsx (inside the Sidebar component body)
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function Sidebar() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/jobs');
    router.prefetch('/workforce');
  }, [router]);

  // ... render sidebar
}
```

Only the three core routes are prefetched eagerly. Revenue is less frequently visited and can rely on hover prefetch.

### Layer 4 — Instant Transition with Stale Data

When the user navigates to a route they visited before, TanStack Query returns the cached data instantly if it is within the `staleTime` window. The page renders immediately with real data, no skeleton visible. In the background, TanStack Query triggers a refetch to ensure freshness, but the user never sees it (the `isFetching && !isLoading` indicator is subtle).

This is the payoff of the stale time configuration in `state.md`. A 30-second `staleTime` means that if the user navigates from Dashboard to Jobs and back within 30 seconds, the Dashboard page appears instantly with the same data, then silently refreshes in the background.

### The Combined Effect

| Scenario | What happens | Perceived latency |
|---|---|---|
| First click after login (page never visited) | `router.prefetch()` already loaded the RSC payload; `onMouseEnter` prefetched the data | Near zero |
| Return visit within staleTime | Cached data renders immediately; background refetch fires | Zero |
| Return visit outside staleTime | Cached data renders immediately (stale but present); refetch replaces it | Zero visible, data updates in-place |
| Cold visit to a non-prefetched route | RSC payload fetches on click; `useQuery` fetches data on mount | 200-400ms with skeleton |

---

## 2. Optimistic Updates

### When to Use

Use optimistic updates for mutations that change visible state the user just interacted with. The update should be predictable: the user tapped "Complete Job," so the status should immediately show "Completed" without waiting for the server round trip.

| Use case | Optimistic? | Reason |
|---|---|---|
| Job progress update (25/50/75/100%) | Yes | User tapped the step, expected state is obvious |
| Job status change (Start / Complete / Cancel) | Yes | Single-field update, predictable outcome |
| Worker status toggle (on-job / idle / offline) | Yes | Single-field update, predictable outcome |
| Job creation (New Job modal) | No | Too many fields, server-generated ID and defaults, not worth faking |
| Worker assignment to team | No | Involves validation logic (team capacity, conflicts) |

### The Pattern

Every optimistic mutation follows the same three-step structure: snapshot, optimistically update, rollback on error.

```typescript
// app/(app)/worker/jobs/[id]/_hooks/use-update-progress.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';
import type { JobResponse } from '@web/types/api';

export function useUpdateProgress(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progressPct: number) =>
      apiClient.patch(`/jobs/${jobId}/progress`, { progressPct }),

    onMutate: async (progressPct) => {
      // 1. Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(jobId) });

      // 2. Snapshot the current value for rollback
      const previous = queryClient.getQueryData<JobResponse>(
        queryKeys.jobs.detail(jobId),
      );

      // 3. Optimistically update the cache
      queryClient.setQueryData<JobResponse>(
        queryKeys.jobs.detail(jobId),
        (old) => (old ? { ...old, progressPct } : old),
      );

      return { previous };
    },

    onError: (_error, _progressPct, context) => {
      // 4. Rollback to the snapshot on failure
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.jobs.detail(jobId), context.previous);
      }
      // Toast is handled by the global mutation onError in query-provider.tsx
    },

    onSettled: () => {
      // 5. Always refetch to ensure cache matches server state
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    },
  });
}
```

### Job Status Change

Same pattern, different field:

```typescript
// app/(app)/jobs/_hooks/use-update-job-status.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';
import type { JobResponse, JobStatus } from '@web/types/api';

export function useUpdateJobStatus(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: JobStatus) =>
      apiClient.patch(`/jobs/${jobId}/status`, { status }),

    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(jobId) });

      const previousList = queryClient.getQueryData<JobResponse[]>(queryKeys.jobs.all);
      const previousDetail = queryClient.getQueryData<JobResponse>(
        queryKeys.jobs.detail(jobId),
      );

      // Update the job in the list cache (moves the card between kanban columns)
      queryClient.setQueryData<JobResponse[]>(queryKeys.jobs.all, (old) =>
        old?.map((job) => (job.id === jobId ? { ...job, status } : job)),
      );

      // Update the detail cache (drawer shows new status immediately)
      queryClient.setQueryData<JobResponse>(
        queryKeys.jobs.detail(jobId),
        (old) => (old ? { ...old, status } : old),
      );

      return { previousList, previousDetail };
    },

    onError: (_error, _status, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.jobs.all, context.previousList);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.jobs.detail(jobId), context.previousDetail);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}
```

### Worker Status Toggle

```typescript
// app/(app)/workforce/_hooks/use-update-worker-status.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';
import type { WorkerResponse, WorkerStatus } from '@web/types/api';

export function useUpdateWorkerStatus(workerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: WorkerStatus) =>
      apiClient.patch(`/workers/${workerId}/status`, { status }),

    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workers.all });

      const previous = queryClient.getQueryData<WorkerResponse[]>(queryKeys.workers.all);

      queryClient.setQueryData<WorkerResponse[]>(queryKeys.workers.all, (old) =>
        old?.map((w) => (w.id === workerId ? { ...w, status } : w)),
      );

      return { previous };
    },

    onError: (_error, _status, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.workers.all, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}
```

### Rules

- **Rollback on error.** Every `onMutate` returns a snapshot. Every `onError` restores it. No exceptions.
- **Invalidate on settled, not on success.** `onSettled` fires whether the mutation succeeded or failed. This guarantees the cache is reconciled with the server after both outcomes. Using `onSuccess` instead would skip the invalidation on rollback, leaving the cache in the pre-mutation state without a fresh server fetch.
- **Cancel in-flight queries first.** `cancelQueries` prevents a concurrent background refetch from overwriting the optimistic update with stale server data.
- **Update all affected caches.** A job status change appears in both the list cache (`queryKeys.jobs.all`) and the detail cache (`queryKeys.jobs.detail(jobId)`). Update both optimistically, invalidate both on settled.

---

## 3. Drawer/Modal Pre-loading

The Job Detail Drawer and Worker Detail Drawer are the two most common sources of perceived delay. The user clicks a card, the drawer opens, and a skeleton flashes while `useQuery` fires for the detail data.

### Fix: Prefetch on Hover

When the user hovers over a job card or worker card, prefetch the detail data so the cache is warm when the drawer mounts.

```tsx
// app/(app)/jobs/_components/job-card.tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';

interface JobCardProps {
  job: JobSummary;
  onClick: (jobId: string) => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const queryClient = useQueryClient();

  return (
    <button
      onClick={() => onClick(job.id)}
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: queryKeys.jobs.detail(job.id),
          queryFn: () => apiClient.get(`/jobs/${job.id}`),
          staleTime: 30_000,
        });
      }}
      className="w-full rounded-xl border border-[--color-border] bg-[--color-surface-card] p-4 text-left"
    >
      {/* card content */}
    </button>
  );
}
```

```tsx
// app/(app)/workforce/_components/worker-card.tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';

interface WorkerCardProps {
  worker: WorkerSummary;
  onClick: (workerId: string) => void;
}

export function WorkerCard({ worker, onClick }: WorkerCardProps) {
  const queryClient = useQueryClient();

  return (
    <button
      onClick={() => onClick(worker.id)}
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: queryKeys.workers.detail(worker.id),
          queryFn: () => apiClient.get(`/workers/${worker.id}`),
          staleTime: 30_000,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.workers.earnings(worker.id),
          queryFn: () => apiClient.get(`/workers/${worker.id}/earnings`),
          staleTime: 30_000,
        });
      }}
      className="w-full rounded-xl border border-[--color-border] bg-[--color-surface-card] p-4 text-left"
    >
      {/* card content */}
    </button>
  );
}
```

### Why This Works

`prefetchQuery` is fire-and-forget. It does not block interaction, does not throw errors to the UI, and does not refetch if the data is already within `staleTime`. On hover, the user typically pauses 100-300ms before clicking. That is enough time for the prefetch to complete (or at least start the request so it is in-flight when the drawer mounts and the `useQuery` deduplicates it).

### Mobile Worker Views

On mobile, there is no hover. For the worker's job list (`/worker`), prefetch the job detail when the job list item scrolls into view using `IntersectionObserver`:

```tsx
// app/worker/_components/job-list-item.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';

export function JobListItem({ job }: { job: JobSummary }) {
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.jobs.detail(job.id),
            queryFn: () => apiClient.get(`/jobs/${job.id}`),
            staleTime: 30_000,
          });
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [job.id, queryClient]);

  return <div ref={ref}>{/* ... */}</div>;
}
```

The `rootMargin: '200px'` triggers the prefetch 200px before the item enters the viewport, giving the request a head start.

---

## 4. Image Optimization

### Use `next/image` for All Images

Never use raw `<img>` tags. The `next/image` `<Image>` component handles responsive sizing, lazy loading, format negotiation (WebP/AVIF), and prevents Cumulative Layout Shift.

### Worker Avatars

```tsx
import Image from 'next/image';

<Image
  src={worker.avatarUrl}
  alt={worker.name}
  width={40}
  height={40}
  quality={85}
  className="rounded-full"
/>
```

- `width={40} height={40}` matches the 40px avatar slot in worker cards
- `quality={85}` is sufficient for small images; default of 75 is too aggressive for faces
- Avatars in the sidebar (current user) and topbar use the same dimensions

### Job Photos (Before/After)

```tsx
<Image
  src={job.photoUrl}
  alt={`${job.type} job at ${job.address}`}
  width={400}
  height={300}
  className="rounded-lg"
/>
```

- These appear in the Job Detail Drawer and are below the fold (drawer scrolls)
- `loading="lazy"` is the default and correct for below-fold content
- If a job photo appears above the fold in a specific layout, set `loading="eager"` on that instance only

### Login Hero Image

```tsx
// app/(auth)/login/_components/login-form.tsx
<Image
  src="/images/milan-hero.jpg"
  alt="Milan field service crew"
  fill
  priority
  className="object-cover"
/>
```

- `priority` tells Next.js to preload this image (it is the LCP candidate on the login page)
- `fill` stretches the image to cover its parent container
- Only one image per page should use `priority` (the largest above-fold image)

### Rules

- Never import images as raw `src` strings when `next/image` can handle them
- Never set `loading="eager"` on below-fold images (defeats lazy loading)
- Never omit `width` and `height` unless using `fill` (causes layout shift)
- Always include a meaningful `alt` attribute (not `alt=""` unless purely decorative)

---

## 5. Rendering Strategy Per Screen

Every screen in CrewMate is a thin Server Component `page.tsx` that renders Client Component boundaries. The table below documents what each screen renders and why.

| Screen | `page.tsx` | Client Components | Data Strategy | Why CSR |
|---|---|---|---|---|
| Dashboard | Server (shell only) | `KpiCards`, `MapView`, `ActivityFeed` | `useQuery` + WebSocket `setQueryData` | Real-time KPIs, live map pins, WebSocket activity stream |
| Jobs Kanban | Server (shell only) | `KanbanBoard`, `JobCard`, `NewJobModal` | `useQuery` + WebSocket `setQueryData` | Drag-and-drop state, real-time column updates via WebSocket |
| Workforce | Server (shell only) | `WorkersTab`, `TeamsTab`, `WorkerDetailDrawer` | `useQuery` + WebSocket | Tab state, drawer open/close, real-time worker status |
| Revenue | Server (shell only) | `RevenueChart`, `BreakdownTable` | `useQuery` + `refetchInterval: 30_000` | Recharts requires client-side rendering; no WebSocket for this screen |
| Login | Server | `LoginForm` (Client), `DemoShortcuts` (Client) | Server Action (`_actions.ts`) | Form submission can use Server Action; hero image is LCP via `priority` |
| Worker Home | Server (shell only) | `EarningsCard`, `JobListItem` | `useQuery` + WebSocket | Earnings tabs, real-time job list updates |
| Worker Job Detail | Server (shell only) | `ProgressStepper`, `ProgressRing` | `useQuery` + optimistic mutation | Progress tap interaction, circular SVG animation |

### Why Not RSC Data Fetching?

CrewMate's pages use TanStack Query in Client Components rather than `async` Server Component data fetching because:

1. **Real-time updates.** WebSocket events update the TanStack Query cache in-place. Server Components cannot receive WebSocket events.
2. **Optimistic mutations.** `useMutation` with `onMutate` requires client-side cache access.
3. **Consistent Phase 2 to Phase 3 migration.** Swapping `queryFn` from dummy data to API calls is a one-line change per hook. No architectural shift.
4. **Background refetches.** `staleTime` and `refetchInterval` keep data fresh without re-rendering the entire Server Component tree.

---

## 6. Bundle Size Rules

### Named Imports Only

Never import an entire library when you need specific functions.

```typescript
// Good — tree-shakable named import
import { format, formatDistanceToNow } from 'date-fns';

// Bad — imports the entire library
import * as dateFns from 'date-fns';
import dateFns from 'date-fns';
```

### Recharts

Import only the chart components and sub-components used on the Revenue screen:

```typescript
// Good
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Bad — barrel import
import * as Recharts from 'recharts';
```

### Mapbox GL — Lazy Load

Mapbox GL JS is approximately 200KB gzipped. It is only used on the Dashboard map. Lazy-load it so it does not block the initial bundle for every route.

```tsx
// app/(app)/dashboard/_components/map-view.tsx
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@web/components/ui/skeleton';

const MapGL = dynamic(() => import('./map-gl'), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-xl" />,
});

export function MapView() {
  return (
    <div className="size-full">
      <MapGL />
    </div>
  );
}
```

```tsx
// app/(app)/dashboard/_components/map-gl.tsx
'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function MapGL() {
  const containerRef = useRef<HTMLDivElement>(null);
  // ... Mapbox initialization
  return <div ref={containerRef} className="size-full rounded-xl" />;
}
```

- `ssr: false` prevents Mapbox from being imported on the server (it accesses `window` and `document`)
- The `loading` fallback shows a skeleton that matches the map container dimensions
- The `map-gl.tsx` file uses a `default` export because `dynamic()` requires it. This is the one exception to the "named exports only" rule (per `components.md`)

### shadcn/ui Components

Each component added via `npx shadcn add` is a local file in `components/ui/`. Only the components you add are bundled. There is no barrel export from `components/ui/index.ts` — import each component directly:

```typescript
// Good — direct import
import { Button } from '@web/components/ui/button';
import { Sheet, SheetContent } from '@web/components/ui/sheet';

// Bad — barrel import (do NOT create an index.ts in components/ui/)
import { Button, Sheet, SheetContent } from '@web/components/ui';
```

### Zustand

`create` from Zustand is approximately 1KB. No optimization needed. It is smaller than most utility functions.

### No Barrel Exports

Never create `index.ts` barrel files in `components/`, `hooks/`, or `stores/`. Barrel exports defeat tree-shaking by pulling in every module in the directory when a consumer imports any single export.

```typescript
// Bad — components/index.ts
export { Sidebar } from './sidebar';
export { TopBar } from './top-bar';
export { JobDetailDrawer } from './job-detail-drawer';
// Importing Sidebar now also bundles TopBar and JobDetailDrawer

// Good — direct imports
import { Sidebar } from '@web/components/sidebar';
import { TopBar } from '@web/components/top-bar';
```

---

## 7. Skeleton Pattern

Three tiers of loading indicators, used consistently across the app.

### Tier 1 — Full-Page Skeleton (`loading.tsx`)

Rendered by Next.js on the very first navigation to a route, before the page's Server Component resolves. The app shell (sidebar, topbar) stays visible; only `<main>` shows skeletons.

```tsx
// app/(app)/jobs/loading.tsx
import { Skeleton } from '@web/components/ui/skeleton';

export default function JobsLoading() {
  return (
    <div className="flex gap-4 p-6">
      <Skeleton className="h-[calc(100vh-120px)] w-[280px] rounded-xl" />
      <Skeleton className="h-[calc(100vh-120px)] w-[280px] rounded-xl" />
      <Skeleton className="h-[calc(100vh-120px)] w-[280px] rounded-xl" />
      <Skeleton className="h-[calc(100vh-120px)] w-[280px] rounded-xl" />
    </div>
  );
}
```

This fires once. After the Client Component mounts and TanStack Query takes over, `loading.tsx` is never shown again for that route.

### Tier 2 — Section Skeleton (First Query Load)

Rendered by the Client Component when `isLoading` is `true` (no cache exists for this query). The skeleton must match the real layout dimensions exactly to prevent layout shift when data loads.

```tsx
// app/(app)/dashboard/_components/kpi-cards.tsx
'use client';

import { Skeleton } from '@web/components/ui/skeleton';
import { useDashboardSummary } from '../_hooks/use-dashboard';

export function KpiCards() {
  const { data, isLoading, isFetching } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-2 gap-4">
      {isFetching && <RefetchIndicator />}
      {/* render KPI cards with data */}
    </div>
  );
}
```

### Tier 3 — Refetch Indicator (Background Refresh)

When `isFetching && !isLoading` is true, data exists in the cache and a background refetch is in progress. Never replace data with skeletons. Show a subtle indicator instead.

Two options, chosen per component:

**Option A — Corner spinner** (preferred for cards and tables):

```tsx
function RefetchIndicator() {
  return (
    <div className="absolute right-3 top-3 z-10">
      <div className="size-4 animate-spin rounded-full border-2 border-[--color-border-strong] border-t-[--color-primary]" />
    </div>
  );
}
```

**Option B — Translucent overlay** (for dense sections like the activity feed):

```tsx
function RefetchOverlay() {
  return (
    <div className="absolute inset-0 z-10 rounded-xl bg-[--color-surface-card]/60" />
  );
}
```

### Skeleton Dimension Rules

- Skeleton height must match the rendered component's height. A KPI card is `h-[120px]`, so its skeleton is `h-[120px]`.
- Skeleton column count must match the real grid. KPI cards use `grid-cols-2`, so the skeleton uses `grid-cols-2`.
- Kanban column skeletons match the column width (`w-[280px]`) and the viewport-relative height.
- Drawer skeletons match the `w-[480px]` sheet width and use stacked horizontal lines for text placeholders.

Mismatched skeleton dimensions cause visible layout shift on data load, which feels worse than no skeleton at all.

---

## 8. What NOT To Do

| Anti-pattern | Problem | Fix |
|---|---|---|
| `useEffect(() => { fetch('/api/jobs').then(setJobs) }, [])` | Waterfall fetching, no caching, no deduplication, no background refetch | Use `useQuery` from TanStack Query |
| Showing full skeleton on every background refetch | User sees data disappear and reappear on a 30-second cycle | Check `isLoading` for skeleton, `isFetching && !isLoading` for subtle spinner |
| `<a href="/jobs">` for internal navigation | Full page reload, destroys React tree, TanStack Query cache, Zustand stores, WebSocket connections | Use `<Link href="/jobs">` from `next/link` |
| `await queryClient.fetchQuery()` in a click handler | Blocks the click handler until the fetch resolves; the drawer or page does not open until data is back | Use `prefetchQuery` on hover (fire-and-forget), let the destination component's `useQuery` pick it up |
| `import _ from 'lodash'` or `import * as _ from 'lodash'` | Bundles the entire 70KB library | Use native JS (`Array.map`, `Object.entries`, `structuredClone`) or specific imports (`import groupBy from 'lodash/groupBy'`) |
| `JSON.parse(JSON.stringify(obj))` for deep clone | Slow, loses `Date` and `undefined` values, crashes on circular references | Use `structuredClone(obj)` (available in all modern browsers and Node 17+) |
| `import * as Recharts from 'recharts'` | Bundles every chart type including unused ones | Import only what you use: `import { AreaChart, Area } from 'recharts'` |
| Creating `components/index.ts` barrel exports | Defeats tree-shaking; importing one component bundles all of them | Direct file imports: `import { Sidebar } from '@web/components/sidebar'` |
| `router.push()` for simple navigation | Skips `<Link>` prefetching behavior; no hover prefetch of RSC payload | Use `<Link>` for navigation; `router.push()` only for programmatic redirects (post-login, after mutation) |
| Setting `loading="eager"` on all images | Loads every image on page entry, including off-screen ones | Only use `eager` for above-fold images; `lazy` is the `next/image` default and correct for everything else |
| `refetchInterval` on WebSocket-connected screens | Redundant network requests every N seconds alongside real-time events | WebSocket handles live updates; `staleTime` handles the gap; `refetchInterval` is only for the Revenue screen |
