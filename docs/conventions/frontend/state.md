# State Management

Two systems: **TanStack Query** for server state (data from the API) and **Zustand** for client state (UI state in the browser). They do not overlap.

---

## TanStack Query (Server State)

All data that comes from the API is managed by TanStack Query. This includes jobs, workers, dashboard summaries, activity feeds, revenue data, and worker earnings.

### Query Keys

All query keys are defined as factory functions in `src/lib/query-keys.ts`. Never use inline string arrays in `useQuery` calls.

```ts
// src/lib/query-keys.ts
export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: JobFilters) => ['jobs', filters] as const,
    detail: (id: string) => ['jobs', id] as const,
  },
  workers: {
    all: ['workers'] as const,
    detail: (id: string) => ['workers', id] as const,
    earnings: (id: string, period?: string) => ['workers', id, 'earnings', period] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
  revenue: {
    all: ['revenue'] as const,
  },
} as const;
```

Using these keys in a hook:

```ts
// app/(app)/jobs/_hooks/use-jobs.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import { apiClient } from '@web/lib/api-client';
import type { JobResponse } from '@web/types/api';

export function useJobs(filters?: JobFilters) {
  return useQuery<JobResponse[]>({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: () => apiClient.get('/jobs', { params: filters }),
    staleTime: 30_000,
  });
}
```

### Stale Time Defaults

| Data | `staleTime` | Reason |
|---|---|---|
| Dashboard summary | `15_000` (15s) | Frequently updated by WebSocket, short stale window catches gaps |
| Dashboard activity | `15_000` (15s) | New events arrive via WebSocket, stale window is a safety net |
| Jobs list | `30_000` (30s) | Status changes arrive via WebSocket; polling is a fallback |
| Workers list | `30_000` (30s) | Worker status changes arrive via WebSocket |
| Worker detail | `30_000` (30s) | Drawer data, refetched on open |
| Revenue | `30_000` (30s) | Polling replaces WebSocket for this screen |

### Polling with `refetchInterval`

Use `refetchInterval` only on screens that do **not** receive WebSocket updates for the same data. In this project, only the revenue screen polls:

```ts
// app/(app)/revenue/_hooks/use-revenue.ts
export function useRevenue() {
  return useQuery({
    queryKey: queryKeys.revenue.all,
    queryFn: () => apiClient.get('/revenue'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
```

The dashboard, jobs, and workforce screens receive real-time updates via WebSocket. Do **not** add `refetchInterval` on those screens — it causes redundant fetches that waste bandwidth and create UI flicker.

### Mutation Pattern

Mutations follow a consistent pattern: fire the API call, then invalidate the relevant query cache on success.

```ts
// app/(app)/jobs/_hooks/use-jobs.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, body }: { jobId: string; body: CancelJobBody }) =>
      apiClient.patch(`/jobs/${jobId}/cancel`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}
```

Rules:

- On success: call `queryClient.invalidateQueries()` with the broadest relevant key. For job mutations, invalidate `queryKeys.jobs.all` (matches all job queries) plus `queryKeys.dashboard.summary` (KPI counts change).
- Do **not** manually update the cache with `setQueryData` for mutation responses. Let `invalidateQueries` trigger a refetch. The one exception is WebSocket event handlers (see below).
- On error: show a toast notification. Never silently swallow errors.

### WebSocket Cache Updates

The `hooks/use-websocket.ts` hook listens for Socket.io events and updates the TanStack Query cache **in-place** using `queryClient.setQueryData`. This avoids a redundant refetch that would cause UI flicker.

```ts
// hooks/use-websocket.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@web/lib/query-keys';
import type { JobProgressEvent, JobStatusEvent } from '@web/types/api';

export function useWebSocket(socket: Socket) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleJobProgress = (event: JobProgressEvent) => {
      // Update the specific job in the jobs list cache
      queryClient.setQueryData<JobResponse[]>(queryKeys.jobs.all, (old) => {
        if (!old) return old;
        return old.map((job) =>
          job.id === event.jobId
            ? { ...job, progressPct: event.progressPct }
            : job,
        );
      });
    };

    const handleJobStatusChanged = (event: JobStatusEvent) => {
      // Invalidate instead of patching — status changes affect multiple caches
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
    };

    socket.on('job.progress.updated', handleJobProgress);
    socket.on('job.status.changed', handleJobStatusChanged);

    return () => {
      socket.off('job.progress.updated', handleJobProgress);
      socket.off('job.status.changed', handleJobStatusChanged);
    };
  }, [socket, queryClient]);
}
```

- Use `setQueryData` for high-frequency events like progress updates (avoids flicker on every 25% step).
- Use `invalidateQueries` for status changes that affect multiple caches across different screens.
- Always clean up listeners in the `useEffect` return function.

### Error Handling

Use the global `onError` callback on the `QueryClient` to show toast notifications. Individual queries do not render inline error UI unless the error needs context-specific messaging.

```ts
// providers/query-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Something went wrong');
      },
    },
  },
});
```

### Loading State: `isFetching` vs `isLoading`

- `isLoading` is `true` only on the **first** fetch (no cached data exists). Use it to show full skeleton screens on initial page load.
- `isFetching` is `true` on every fetch including background refetches. Use it to show a subtle loading indicator (e.g., translucent overlay, spinner in the corner) while stale data remains visible.

Never replace visible data with a full skeleton on refetch. The user should always see the previous data with a subtle loading indicator.

---

## Zustand (Client State)

Zustand manages UI state that lives in the browser, persists across route navigations, and is never async. It never holds data that comes from the API.

### When to Use Zustand

| Use case | Store |
|---|---|
| Current logged-in user (userId, role, operatorId, name) | `stores/auth-store.ts` |
| Demo actor switcher (dropdown open/closed, loading state) | `stores/demo-store.ts` |
| Teams tab UI (add modal open, edit modal open, selected team ID) | `stores/teams-store.ts` |

### When NOT to Use Zustand

| Use case | Use instead |
|---|---|
| Jobs list, worker list, revenue data | TanStack Query |
| Map filter status buttons (toggled on/off) | `useState` in the map component |
| Search input value | `useState` with debounce in the search component |
| Modal open/close for a single component | `useState` in the parent component |
| Form field values | `useState` or a form library in the form component |

The rule: if the state is needed by exactly one component and its direct children, use `useState`. If the state is needed by unrelated components on different parts of the page (or across pages), use Zustand.

### Store File Structure

```ts
// stores/auth-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  role: UserRole | null;
  operatorId: string | null;
  name: string | null;
  setSession: (session: { userId: string; role: UserRole; operatorId: string; name: string }) => void;
  reset: () => void;
}

const initialState = {
  userId: null,
  role: null,
  operatorId: null,
  name: null,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      ...initialState,
      setSession: (session) => set(session),
      reset: () => set(initialState),
    }),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
```

Conventions:

- File: `stores/{name}-store.ts`
- Export: `use{Name}Store` (e.g., `useAuthStore`, `useDemoStore`, `useTeamsStore`)
- `devtools` middleware is enabled only in development (`process.env.NODE_ENV === 'development'`)
- Keep stores flat. Prefer primitive values and IDs over nested objects. If you need a nested object, extract it into a separate store.
- Every store must have a `reset()` action that returns the store to its initial state.

### Store Structure: `demo-store.ts`

```ts
// stores/demo-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DemoState {
  isDropdownOpen: boolean;
  isResetting: boolean;
  openDropdown: () => void;
  closeDropdown: () => void;
  setResetting: (value: boolean) => void;
  reset: () => void;
}

export const useDemoStore = create<DemoState>()(
  devtools(
    (set) => ({
      isDropdownOpen: false,
      isResetting: false,
      openDropdown: () => set({ isDropdownOpen: true }),
      closeDropdown: () => set({ isDropdownOpen: false }),
      setResetting: (value) => set({ isResetting: value }),
      reset: () => set({ isDropdownOpen: false, isResetting: false }),
    }),
    {
      name: 'demo-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
```

### Store Structure: `teams-store.ts`

```ts
// stores/teams-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface TeamsState {
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedTeamId: string | null;
  openAddModal: () => void;
  closeAddModal: () => void;
  openEditModal: (teamId: string) => void;
  closeEditModal: () => void;
  reset: () => void;
}

export const useTeamsStore = create<TeamsState>()(
  devtools(
    (set) => ({
      isAddModalOpen: false,
      isEditModalOpen: false,
      selectedTeamId: null,
      openAddModal: () => set({ isAddModalOpen: true }),
      closeAddModal: () => set({ isAddModalOpen: false }),
      openEditModal: (teamId) => set({ isEditModalOpen: true, selectedTeamId: teamId }),
      closeEditModal: () => set({ isEditModalOpen: false, selectedTeamId: null }),
      reset: () => set({ isAddModalOpen: false, isEditModalOpen: false, selectedTeamId: null }),
    }),
    {
      name: 'teams-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
```

### Reset on Logout

When the user logs out, all Zustand stores must be reset to prevent stale state from leaking to the next session. Call each store's `reset()` in the logout handler:

```ts
function handleLogout() {
  useAuthStore.getState().reset();
  useDemoStore.getState().reset();
  useTeamsStore.getState().reset();
  // Then redirect to /login
}
```

Use `getState()` (not the hook) because the logout handler runs outside of a React component context.

---

## Decision Table

Quick reference for where any piece of state belongs:

| Data | Where | Why |
|---|---|---|
| Jobs list from API | TanStack Query (`useJobs`) | Server data, needs caching + refetch |
| Workers list from API | TanStack Query (`useWorkers`) | Server data |
| Dashboard KPIs from API | TanStack Query (`useDashboardSummary`) | Server data |
| Dashboard activity feed from API | TanStack Query (`useDashboardActivity`) | Server data |
| Revenue from API | TanStack Query (`useRevenue`) | Server data, polls every 30s |
| Worker earnings from API | TanStack Query (`useWorkerEarnings`) | Server data |
| Single job detail from API | TanStack Query (`useJobDetail`) | Server data, fetched on drawer open |
| Current logged-in user | Zustand (`useAuthStore`) | Client state, read by sidebar + RBAC components |
| Active demo actor | Zustand (`useDemoStore`) | Client state, demo-only UI |
| Teams tab modals (open/close) | Zustand (`useTeamsStore`) | Client state, crosses component boundaries |
| Map status filter buttons | Local `useState` | Single component, no cross-page need |
| Search input value | Local `useState` with 300ms debounce | Single component, resets on navigation |
| Drawer open/close (job detail) | URL search params (`?jobId=xxx`) | Bookmarkable, survives page refresh |
| Modal open/close (single use) | Local `useState` | Scoped to one parent component |
| Form field values | Local `useState` | Scoped to form component |

---

## Phase 2 vs Phase 3 Data Fetching

### Phase 2 (Dummy Data)

During Phase 2, TanStack Query hooks use static dummy data imported from `src/lib/dummy-data.ts`. The `queryFn` returns the data synchronously:

```ts
import { dummyJobs } from '@web/lib/dummy-data';

export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.all,
    queryFn: () => dummyJobs,
    staleTime: Infinity, // Static data never goes stale
  });
}
```

### Phase 3 (Real API)

In Phase 3, the `queryFn` changes to call the real API. The component code, types, and query keys stay identical:

```ts
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: () => apiClient.get<JobResponse[]>('/jobs', { params: filters }),
    staleTime: 30_000,
  });
}
```

This is why TanStack Query is used even for static data in Phase 2: it keeps the component interface identical across phases, and the migration to real data requires changing only the `queryFn` line.
