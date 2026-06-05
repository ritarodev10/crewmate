# Routing Conventions

Next.js 15 App Router patterns for `apps/web/`.

---

## Route Groups

The app has two route groups that determine layout and authentication behavior:

| Group | Path prefix | Layout | Auth required |
|---|---|---|---|
| `(auth)` | `/login` | No shell chrome — centered card layout | No |
| `(app)` | `/dashboard`, `/jobs`, `/workforce`, `/revenue` | App shell with sidebar + topbar | Yes |
| `worker` | `/worker`, `/worker/jobs/[id]` | Mobile layout with sticky header, no sidebar | Yes |

Route groups `(auth)` and `(app)` use parentheses, which means they affect layout nesting but do not appear in the URL. The `worker` folder is a regular route segment that does appear in the URL.

---

## Layouts

### Root Layout (`app/layout.tsx`)

Server Component. Responsibilities:

1. Set `<html lang="en">` with the Inter font variable class
2. Set `<body>` with `font-sans antialiased` and the canvas background
3. Wrap children in `QueryProvider` (the `'use client'` boundary for TanStack Query)
4. Render the `DemoActorSwitcher` (conditionally, only when `NEXT_PUBLIC_DEMO_MODE=true`)

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
import { QueryProvider } from '@web/providers/query-provider';
import { DemoActorSwitcher } from '@web/components/demo-actor-switcher';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[--color-canvas] font-sans text-[--color-text-primary] antialiased">
        <QueryProvider>
          {children}
          <DemoActorSwitcher />
        </QueryProvider>
      </body>
    </html>
  );
}
```

### App Shell Layout (`app/(app)/layout.tsx`)

Server Component. Renders the sidebar and topbar around page content. Does not fetch data.

```tsx
// app/(app)/layout.tsx
import { Sidebar } from '@web/components/sidebar';
import { TopBar } from '@web/components/top-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh p-3 gap-3">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-[--color-surface]">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Key decisions:
- `h-dvh` instead of `h-screen` for correct mobile viewport handling
- `p-3 gap-3` creates the visible canvas gutter around the sidebar and content area
- The content area has `rounded-2xl` so it reads as a distinct panel floating on the canvas
- `overflow-y-auto` on `<main>` so each page scrolls independently

### Worker Layout (`app/worker/layout.tsx`)

Server Component. Mobile-first layout with a sticky header and no sidebar.

```tsx
// app/worker/layout.tsx
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-[--color-canvas]">
      {children}
    </div>
  );
}
```

### Layout Rules

- **Never fetch data in layouts.** Layouts re-render less frequently than pages. If a layout fetches data, it goes stale when the user navigates between child pages. Data fetching happens in Client Components inside each page.
- **Layouts that need no interactivity stay as Server Components.** The `(app)/layout.tsx` renders `<Sidebar>` and `<TopBar>` which are Client Components, but the layout file itself is a Server Component.
- **Do not add `'use client'` to layout files** unless the layout itself (not its children) needs hooks or event handlers. In this project, no layout needs `'use client'`.

---

## Page Files

### Always a Server Component

Every `page.tsx` file is a Server Component. It never uses `'use client'`, never calls hooks, and never attaches event handlers.

### Exports

Each page file exports exactly two things:

1. `export default function Page()` — required by Next.js
2. `export const metadata` — optional, for the page `<title>` and description

```tsx
// app/(app)/dashboard/page.tsx
import { KpiCards } from './_components/kpi-cards';
import { MapView } from './_components/map-view';
import { ActivityFeed } from './_components/activity-feed';

export const metadata = { title: 'Dashboard | CrewMate' };

export default function DashboardPage() {
  return (
    <div className="flex h-full gap-4 p-6">
      <div className="flex w-[42%] flex-col gap-4">
        <KpiCards />
        <ActivityFeed />
      </div>
      <div className="flex-1">
        <MapView />
      </div>
    </div>
  );
}
```

### No Data Fetching in Pages

`page.tsx` does not call `fetch()`, does not import `apiClient`, and does not use `async/await`. It delegates everything to Client Components in `_components/` that use TanStack Query hooks from `_hooks/`.

This keeps pages thin, testable, and consistent between Phase 2 (dummy data) and Phase 3 (real API).

---

## Data Fetching Pattern

### Phase 2 (Dummy Data)

Client Components import TanStack Query hooks that return static fixture data:

```tsx
// app/(app)/dashboard/_hooks/use-dashboard.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { dummySummary, dummyActivity } from '@web/lib/dummy-data';

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dummySummary,
    staleTime: Infinity,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: queryKeys.dashboard.activity,
    queryFn: () => dummyActivity,
    staleTime: Infinity,
  });
}
```

### Phase 3 (Real API)

Only the `queryFn` changes. The page file, component code, and types remain identical:

```tsx
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => apiClient.get('/dashboard/summary'),
    staleTime: 15_000,
  });
}
```

This pattern is why pages never fetch data directly: the abstraction layer in `_hooks/` allows a one-line change per query to switch from dummy to real data.

---

## Server Actions

Server Actions are used **only** for authentication in this project.

```
app/(auth)/login/_actions.ts    loginAction() — validates credentials, sets cookie, redirects
```

### Why Not Server Actions for CRUD?

- All protected CRUD operations go through the NestJS API (`apps/api`), not Next.js Server Actions.
- The API handles RBAC guards, validation, database transactions, and WebSocket event emission.
- Using Server Actions for CRUD would bypass the API layer and require duplicating RBAC logic.
- TanStack Query mutations call `apiClient.patch()` / `apiClient.post()` which hits the NestJS API.

The login action is the exception because it must set an `httpOnly` cookie, which can only be done server-side in Next.js via a Server Action or Route Handler.

---

## Route Table

| Route | Page component | Route group | Auth |
|---|---|---|---|
| `/login` | `(auth)/login/page.tsx` | `(auth)` | No |
| `/dashboard` | `(app)/dashboard/page.tsx` | `(app)` | Yes |
| `/jobs` | `(app)/jobs/page.tsx` | `(app)` | Yes |
| `/workforce` | `(app)/workforce/page.tsx` | `(app)` | Yes |
| `/revenue` | `(app)/revenue/page.tsx` | `(app)` | Yes |
| `/worker` | `worker/page.tsx` | (none) | Yes |
| `/worker/jobs/[id]` | `worker/jobs/[id]/page.tsx` | (none) | Yes |

### Dynamic Segments

- `[id]` in `/worker/jobs/[id]` — always a `string` from `params`. Never parse to number.
- Access via the `params` prop that Next.js passes to `page.tsx`:

```tsx
// app/worker/jobs/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkerJobPage({ params }: PageProps) {
  const { id } = await params;
  return <JobDetail jobId={id} />;
}
```

In Next.js 15, `params` is a `Promise` and must be awaited.

### Post-Login Redirects

| Role | Redirect to |
|---|---|
| SUPER_ADMIN | `/dashboard` |
| MANAGER | `/dashboard` |
| TEAM_LEAD | `/dashboard` (data scoped to their team server-side) |
| WORKER | `/worker` |

---

## Middleware

### Location

`src/middleware.ts` — runs on every request that matches the `(app)` route group and `worker` routes.

### Responsibilities

1. Read the `crewmate_session` cookie
2. Decode the JWT payload (userId, role, operatorId)
3. If the cookie is missing or expired, redirect to `/login`
4. If `demo_actor` cookie exists (demo mode), use its session instead of the real JWT
5. Inject the user's role into request headers so Server Components can read it
6. Redirect WORKER role away from `(app)` routes to `/worker`
7. Redirect non-WORKER roles away from `/worker` routes to `/dashboard`

### Matcher Configuration

```ts
// src/middleware.ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/jobs/:path*',
    '/workforce/:path*',
    '/revenue/:path*',
    '/worker/:path*',
  ],
};
```

The middleware does **not** run on `/login`, static assets, or API routes.

---

## Loading and Error States

### `loading.tsx` (Server-Rendered Skeleton)

Each `(app)` route can have a `loading.tsx` file that Next.js renders immediately while the page's Server Component is resolving. Since our pages are thin Server Components that render instantly, `loading.tsx` is used as a brief flash fallback.

```tsx
// app/(app)/dashboard/loading.tsx
import { Skeleton } from '@web/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex h-full gap-4 p-6">
      <div className="flex w-[42%] flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
      <Skeleton className="h-full flex-1 rounded-xl" />
    </div>
  );
}
```

### Client Component Loading (Refetch Skeleton)

Once the Client Component has mounted and TanStack Query takes over, use `isFetching` (not `isLoading`) to show a subtle loading indicator while stale data remains visible. Never replace visible data with a full skeleton on refetch.

```tsx
// Inside a Client Component
const { data, isLoading, isFetching } = useDashboardSummary();

if (isLoading) {
  return <KpiCardsSkeleton />;
}

return (
  <div className="relative">
    {isFetching && (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[--color-surface-card]/60">
        <Spinner />
      </div>
    )}
    <KpiCardsContent data={data} />
  </div>
);
```

### Error Boundaries

- Use Next.js `error.tsx` files for unrecoverable errors (page crash, network failure)
- Use TanStack Query's global `onError` for API errors (shows toast notification)
- Do not render inline error messages in the middle of a page unless the error is specific to one section of the page

### `not-found.tsx`

A root-level `app/not-found.tsx` handles any unmatched route. It shows a simple message with a link back to `/dashboard`.

---

## URL-Based State

### Drawer State in URL

The Job Detail Drawer uses URL search params to track which job is open. This makes the drawer state bookmarkable and shareable.

```
/dashboard?jobId=job-042    → Dashboard with job drawer open
/jobs?jobId=job-042         → Jobs kanban with job drawer open
```

The Client Component reads `searchParams` from `useSearchParams()` and opens the drawer when `jobId` is present:

```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export function KanbanBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedJobId = searchParams.get('jobId');

  const handleCardClick = (jobId: string) => {
    router.push(`/jobs?jobId=${jobId}`, { scroll: false });
  };

  const handleDrawerClose = () => {
    router.push('/jobs', { scroll: false });
  };

  return (
    <>
      {/* Kanban columns */}
      <JobDetailDrawer jobId={selectedJobId} onClose={handleDrawerClose} />
    </>
  );
}
```

### Filter State in URL

Page-level filters (job status, worker team) should also be in the URL so they survive page refresh:

```
/jobs?status=IN_PROGRESS&worker=worker-003
/workforce?tab=teams
```

Use `useSearchParams()` to read and `router.push()` to update. Never store filter state in Zustand or `useState` when it should be shareable.
