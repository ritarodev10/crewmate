/**
 * Apollo Client stub for Phase 2.
 *
 * Phase 2 data is served by MockedProvider in providers.tsx (dev) or
 * this client in production-like scenarios. Real link chain with auth,
 * WebSocket split, and error handling is wired in Phase 4.
 *
 * @see docs/guardrails/frontend/05-data-fetching.md for the full link chain spec.
 */
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: '/graphql', credentials: 'include' }),
  cache: new InMemoryCache(),
});
