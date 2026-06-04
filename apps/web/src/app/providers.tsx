'use client';

import { type ReactNode, useEffect } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { apolloClient } from '@/lib/apollo/client';
import { queryClient } from '@/lib/query/client';

/**
 * MswProvider — starts the MSW service worker in development.
 * The worker is loaded asynchronously via dynamic import so it never enters
 * the production bundle. The import path is guarded by NODE_ENV so bundlers
 * can tree-shake the entire msw/browser import in non-dev builds.
 */
function MswProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/msw/browser').then(({ mswWorker }) => {
        mswWorker.start({ onUnhandledRequest: 'bypass' }).catch(() => {
          // MSW start failed — dev only, safe to ignore silently
        });
      });
    }
  }, []);

  return <>{children}</>;
}

/**
 * Root providers tree.
 *
 * Mount order:
 *   ApolloProvider → QueryClientProvider → MswProvider
 *
 * ApolloProvider and QueryClientProvider are siblings in intent (they own
 * separate caches) but Next.js requires nesting. ApolloProvider is outermost
 * to make apolloClient available to any server-component boundary that needs
 * to read from the Apollo cache before MSW is running.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        <MswProvider>{children}</MswProvider>
      </QueryClientProvider>
    </ApolloProvider>
  );
}
