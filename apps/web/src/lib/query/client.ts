/**
 * TanStack Query client — defaults per 05-data-fetching.md.
 *
 * staleTime: 30s so repeated page visits stay fast within the window.
 * retry: 2 — covers transient blips; mutations retry: false to avoid double-writes.
 * refetchOnWindowFocus and refetchOnReconnect: 'always' — coordinators leave
 * the dashboard open; they expect fresh data on focus or reconnect.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false,
    },
  },
});
