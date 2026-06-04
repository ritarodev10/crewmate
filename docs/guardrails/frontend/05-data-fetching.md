# 05 — Data fetching

How server data enters a React component. CrewMate runs two client libraries against two transports against one user, and the rules below keep them from fighting each other. `04-state-management.md` set up the split; this chapter is the implementation depth for the server side of it.

Two clients, two caches, one rule. Apollo Client owns anything on the GraphQL schema. TanStack Query owns everything else. No endpoint is ever reached by both.

## Two clients, two caches, one rule

The split is by transport, not by feature.

| Transport | Client | Cache | Used by |
|---|---|---|---|
| GraphQL over HTTP (`/graphql`) | `@apollo/client` | Apollo normalized cache | Dashboard, dispatch board, job detail, schedule, team, audit log, settings reads |
| GraphQL over WebSocket (`/graphql`) | `@apollo/client` subscriptions | Same Apollo cache | Dispatch board realtime, schedule live edits |
| REST over HTTP (`/v1/...`) | `@tanstack/react-query` | TanStack cache | File uploads, CSV export polling, webhook test deliveries |

The single rule is that the same endpoint is never reached by both clients. If a feature is half GraphQL and half REST (a worker invitation page that loads the team list from GraphQL and then uploads a CSV via REST), the two clients coexist on the same screen. They do not share state. They do not consult each other's caches. They just both render.

The temptation to "unify" them via a wrapper is rejected. The wrapper would have to model normalized graph caching and structural-key invalidation under one API, which is the work that the two libraries already do well in their own idioms. We pay the cost of two mental models because each model is correct for its transport.

## The Apollo Client side

Apollo lives at `apps/web/src/lib/apollo/`. One client per app, instantiated in the root provider.

### Provider and link chain

```tsx
// apps/web/src/lib/apollo/client.ts
import { ApolloClient, InMemoryCache, from, split, HttpLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/tokens";

const httpLink = new HttpLink({
  uri: "/graphql",
  credentials: "include",
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: typeof window === "undefined" ? "" : `wss://${window.location.host}/graphql`,
    connectionParams: async () => ({ authorization: `Bearer ${await getAccessToken()}` }),
    retryAttempts: 5,
  }),
);

const authLink = setContext(async (_op, { headers }) => {
  const token = await getAccessToken();
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : "" } };
});

const errorLink = onError(({ networkError, graphQLErrors, operation, forward }) => {
  const isAuth =
    networkError?.statusCode === 401 ||
    graphQLErrors?.some((e) => e.extensions?.code === "UNAUTHENTICATED");
  if (isAuth) {
    return new Observable((observer) => {
      refreshAccessToken()
        .then(() => forward(operation).subscribe(observer))
        .catch((err) => observer.error(err));
    });
  }
});

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === "OperationDefinition" && def.operation === "subscription";
  },
  wsLink,
  from([errorLink, authLink, httpLink]),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({ typePolicies }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network", nextFetchPolicy: "cache-first" },
    query: { fetchPolicy: "network-only" },
  },
});
```

The chain is mandatory in this order. The error link sits outermost so a 401 retried after refresh still benefits from the auth link on replay. The split is innermost because the transport decision is the last thing that happens.

`Authorization` is set from the JWT cookie via `getAccessToken()`, which reads the in-memory token mirror that the auth bootstrap put there. The cookie itself is `HttpOnly`; the mirror is populated at login from the refresh response. See `11-auth-flows.md` for the full lifecycle.

### Cache normalization

Every GraphQL type that has a stable identifier is normalized by `__typename` plus `id`. The schema enforces this by giving every entity an `id: ID!`. Cache keys look like `Job:c1f1c8d4-...`, `Worker:...`, `Property:...`.

```ts
// apps/web/src/lib/apollo/type-policies.ts
import type { TypePolicies } from "@apollo/client";

export const typePolicies: TypePolicies = {
  Query: {
    fields: {
      // Paginated list. Merge new pages into the existing one.
      webhookDeliveries: {
        keyArgs: ["filter"],
        merge(existing, incoming, { args }) {
          if (!existing || args?.after == null) return incoming;
          return {
            ...incoming,
            edges: [...existing.edges, ...incoming.edges],
          };
        },
      },
    },
  },
  // Subscription-backed entity. No special merge; identity by id.
  Job: { keyFields: ["id"] },
  Worker: { keyFields: ["id"] },
  Property: { keyFields: ["id"] },
};
```

A custom `merge` is only added when a paginated list shape requires it. For single entities the default identity merge is correct and we do not write one. The rule keeps `type-policies.ts` short and the diff reviewable.

### useQuery, useMutation, useSubscription

The three Apollo hooks have idiomatic forms in this codebase.

```tsx
// useQuery: read with cache-and-network
const { data, loading, error, refetch } = useQuery(GetJobDocument, {
  variables: { id: jobId },
});

// useMutation: write with cache update via update callback
const [transitionJob, { loading: transitioning }] = useMutation(TransitionJobDocument, {
  update(cache, { data }) {
    if (!data?.transitionJob) return;
    cache.modify({
      id: cache.identify({ __typename: "Job", id: jobId }),
      fields: {
        status: () => data.transitionJob.status,
        updatedAt: () => data.transitionJob.updatedAt,
      },
    });
  },
});

// useSubscription: live updates on a single entity or list
useSubscription(JobUpdatedDocument, {
  variables: { propertyId },
  onData({ data }) {
    // Subscriptions write through type policies. No manual cache writes here
    // unless the subscription returns a fragment the cache could not place.
  },
});
```

Documents are generated by GraphQL Codegen into `apps/web/src/lib/graphql/__generated__/`. Components import the `<Name>Document` constant, never an inline `gql\`\`` template. See the contracts package for the schema and codegen config.

### Optimistic updates

The dispatch board card move is the canonical example. The user drops a card from "Scheduled" to "In progress". The UI must reflect the new column instantly; the server confirms within 300ms in the happy case.

```tsx
const [transitionJob] = useMutation(TransitionJobDocument, {
  optimisticResponse: ({ jobId, toStatus }) => ({
    transitionJob: {
      __typename: "Job",
      id: jobId,
      status: toStatus,
      updatedAt: new Date().toISOString(),
    },
  }),
  update(cache, { data }) {
    if (!data?.transitionJob) return;
    cache.modify({
      id: cache.identify({ __typename: "Job", id: data.transitionJob.id }),
      fields: { status: () => data.transitionJob.status },
    });
  },
});
```

The `optimisticResponse` lands in the cache immediately under a temporary write. Components reading the job through `useQuery` see the new status without round-trip. When the server returns, the optimistic write is rolled back and the real response replaces it; the cache key is the same, so the swap is invisible. If the server errors, Apollo rolls the optimistic write back and the component reverts. The dispatch board pairs this with an error toast (`08-feedback-states.md`).

### Polling vs subscriptions

Default to subscriptions when the server publishes the event over WebSocket. The dispatch board, schedule, and webhook delivery log are subscription-backed. Polling is only acceptable as a transient fallback during a known WS reconnect, and only on surfaces that explicitly tolerate stale reads.

The webhook delivery log uses both because the same surface is consumed by users who may have WS blocked by their network. The default is subscription; on a `wsLink` connection failure beyond the retry budget, the surface drops to a 10s `useQuery` poll with `pollInterval: 10_000` and reverts to subscription when the next reconnect succeeds.

## The TanStack Query side

This is the depth section. TanStack lives at `apps/web/src/lib/query/`. One `QueryClient` per app, configured at the root provider.

### Setup

```tsx
// apps/web/src/lib/query/client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: false,
    },
  },
});
```

The defaults are deliberate.

| Option | Value | Why |
|---|---|---|
| `staleTime` | `30_000` | Reads stay fresh for 30s. A page revisit inside that window does not refetch. |
| `gcTime` | `5 * 60_000` | Unobserved data lingers 5 minutes before garbage collection, so back-button navigation feels instant. |
| `retry` | `2` | Two retries beyond the initial fetch covers transient network blips without doubling load on the API during real outages. |
| `retryDelay` | exponential `1000` to `30_000` | Backs off cleanly without locking up the UI. |
| `refetchOnWindowFocus` | `'always'` | Coordinators leave the dashboard open in a tab. They expect fresh data on focus, even within `staleTime`. |
| `refetchOnReconnect` | `'always'` | Same reasoning for offline-to-online transitions. |
| `mutations.retry` | `false` | A retried mutation can double-write. Mutations either succeed or surface the error; the user retries by clicking. |

The provider mounts in `apps/web/src/app/providers.tsx`. It is the same React tree that mounts `ApolloProvider`. Both providers are siblings at the root; neither is nested inside the other.

### Query keys

Every TanStack hook in the codebase routes its key through a domain `keys` factory. No callsite writes a key as a bare array.

```ts
// apps/web/src/lib/query/keys/jobs.ts
export const jobsKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobsKeys.all, "list"] as const,
  list: (filters: JobListFilters) => [...jobsKeys.lists(), filters] as const,
  details: () => [...jobsKeys.all, "detail"] as const,
  detail: (id: string) => [...jobsKeys.details(), id] as const,
  activity: (id: string) => [...jobsKeys.detail(id), "activity"] as const,
};
```

The hierarchical shape matters for two reasons.

1. Structural equality. `useQuery` compares keys by deep equality. The factory makes sure two callsites that ask for the same filters get the same key.
2. Invalidation patterns. `queryClient.invalidateQueries({ queryKey: jobsKeys.all })` invalidates everything under "jobs". `queryClient.invalidateQueries({ queryKey: jobsKeys.list({ status: "SCHEDULED" }) })` invalidates only that one list. Both work because the deeper key is a prefix-extension of the shallower one.

The factories live under `apps/web/src/lib/query/keys/<domain>.ts`. Every domain that has any TanStack-backed surface has one. Common examples in the codebase.

```ts
export const webhooksKeys = {
  all: ["webhooks"] as const,
  endpoints: () => [...webhooksKeys.all, "endpoints"] as const,
  endpoint: (id: string) => [...webhooksKeys.endpoints(), id] as const,
  deliveries: () => [...webhooksKeys.all, "deliveries"] as const,
  deliveriesList: (filters: DeliveryFilters) => [...webhooksKeys.deliveries(), "list", filters] as const,
  delivery: (id: string) => [...webhooksKeys.deliveries(), id] as const,
};

export const exportsKeys = {
  all: ["exports"] as const,
  jobs: (range: DateRange) => [...exportsKeys.all, "jobs", range] as const,
  jobStatus: (exportId: string) => [...exportsKeys.all, "jobs", "status", exportId] as const,
};
```

### useQuery for reads

Every TanStack read sits behind a wrapper hook. Components do not call `useQuery` directly.

```tsx
// apps/web/src/lib/query/hooks/use-export-jobs-status.ts
import { useQuery } from "@tanstack/react-query";
import { exportsKeys } from "@/lib/query/keys/exports";
import { fetchWithAuth } from "@/lib/query/fetch-with-auth";

export function useExportJobsStatus(exportId: string) {
  return useQuery({
    queryKey: exportsKeys.jobStatus(exportId),
    queryFn: async ({ signal }) => {
      const res = await fetchWithAuth(`/v1/exports/jobs/${exportId}`, { signal });
      if (!res.ok) throw new HttpError(res);
      return (await res.json()) as ExportJobStatus;
    },
    refetchInterval: (q) => (q.state.data?.status === "COMPLETED" ? false : 2_000),
    enabled: Boolean(exportId),
  });
}
```

The hook returns the TanStack shape unchanged. Components read `data`, `isPending`, `isError`, `error`, `refetch` and feed those into the components from `08-feedback-states.md`.

The wrapper exists for three reasons.

1. The key comes from the factory, never a stringly-typed literal.
2. The fetch wrapper (`fetchWithAuth`) is consistent across callsites.
3. The shape of the response is parsed and typed once, not at each callsite.

### useInfiniteQuery for cursor pagination

Webhook deliveries paginate by cursor. The wrapper hides the cursor mechanics.

```tsx
// apps/web/src/lib/query/hooks/use-webhook-deliveries-list.ts
export function useWebhookDeliveriesList(filters: DeliveryFilters) {
  return useInfiniteQuery({
    queryKey: webhooksKeys.deliveriesList(filters),
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        ...filters,
        ...(pageParam ? { cursor: pageParam } : {}),
        limit: "50",
      });
      const res = await fetchWithAuth(`/v1/webhooks/deliveries?${params}`, { signal });
      if (!res.ok) throw new HttpError(res);
      return (await res.json()) as DeliveriesPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
```

The component flattens pages with `data.pages.flatMap((p) => p.items)` and calls `fetchNextPage()` from a "Load more" button or an intersection observer at the bottom of the list.

### useMutation for writes

Mutations also sit behind wrappers. The wrapper owns the keys it invalidates.

```tsx
// apps/web/src/lib/query/hooks/use-test-webhook-delivery.ts
export function useTestWebhookDelivery(endpointId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TestDeliveryPayload) => {
      const res = await fetchWithAuth(`/v1/webhooks/endpoints/${endpointId}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new HttpError(res);
      return (await res.json()) as Delivery;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: webhooksKeys.deliveries() });
    },
  });
}
```

Component usage.

```tsx
const { mutate, isPending, error } = useTestWebhookDelivery(endpoint.id);

<Button variant="primary" loading={isPending} onClick={() => mutate({ event: "job.completed" })}>
  Send test
</Button>;
{error && <Banner variant="danger">{describeHttpError(error)}</Banner>}
```

### Cache invalidation

Two patterns. Both have an idiomatic use.

| Pattern | When |
|---|---|
| `qc.invalidateQueries({ queryKey })` | After a successful mutation when the new state should be fetched fresh from the server. Default choice. |
| `qc.setQueryData(queryKey, updater)` | When the server response contains the new shape verbatim and refetching would be wasteful. |

```ts
// Pattern A: invalidate (default)
onSuccess(updated) {
  qc.invalidateQueries({ queryKey: webhooksKeys.endpoints() });
}

// Pattern B: setQueryData (surgical)
onSuccess(updated) {
  qc.setQueryData(webhooksKeys.endpoint(updated.id), updated);
  qc.setQueryData<EndpointList>(webhooksKeys.endpoints(), (old) =>
    old ? { ...old, items: old.items.map((e) => (e.id === updated.id ? updated : e)) } : old,
  );
}
```

Use Pattern A unless there's a measurable reason to use B. Pattern B is fragile because it depends on the local code knowing the exact shape stored under the key. When the server response and the cached list shape diverge (server returns `Endpoint`, the list stores `EndpointSummary`), Pattern B writes the wrong shape into the cache. Pattern A asks the server for the right shape and is trivially correct.

The exception is hot UI surfaces where the user-perceived latency of a round trip is unacceptable. The dispatch board does not use TanStack so it does not apply here. The closest TanStack case is the webhook delivery "Retry" action, which writes a new delivery row optimistically (see Optimistic updates below).

### Optimistic updates with TanStack

The pattern is fixed. Snapshot, write, return context. Restore on error. Reconcile on settled.

```tsx
export function useRetryDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const res = await fetchWithAuth(`/v1/webhooks/deliveries/${deliveryId}/retry`, {
        method: "POST",
      });
      if (!res.ok) throw new HttpError(res);
      return (await res.json()) as Delivery;
    },
    async onMutate(deliveryId) {
      await qc.cancelQueries({ queryKey: webhooksKeys.deliveries() });
      const prev = qc.getQueryData<InfiniteData<DeliveriesPage>>(
        webhooksKeys.deliveriesList(currentFilters),
      );
      qc.setQueryData<InfiniteData<DeliveriesPage>>(
        webhooksKeys.deliveriesList(currentFilters),
        (old) => markDeliveryRetrying(old, deliveryId),
      );
      return { prev };
    },
    onError(_err, _deliveryId, ctx) {
      if (ctx?.prev) {
        qc.setQueryData(webhooksKeys.deliveriesList(currentFilters), ctx.prev);
      }
    },
    onSettled() {
      qc.invalidateQueries({ queryKey: webhooksKeys.deliveries() });
    },
  });
}
```

The pieces are non-negotiable.

1. `cancelQueries` before writing, so an in-flight refetch does not stomp the optimistic value.
2. `getQueryData` to snapshot. The snapshot lives in the mutation context returned from `onMutate`.
3. Optimistic write through `setQueryData`.
4. `onError` restores from the snapshot.
5. `onSettled` invalidates to reconcile, regardless of success or failure.

Skipping any of these is the documented anti-pattern. The snapshot-and-restore guarantee is the whole reason the optimistic pattern is safe; without it, an error silently loses state and the user discovers it minutes later.

### Error handling

Errors thrown from `queryFn` or `mutationFn` propagate as `error` on the hook return. The wrapper hook does not catch and swallow. Components render via the rules in `08-feedback-states.md`.

```tsx
const { data, isPending, isError, error } = useExportJobsStatus(exportId);

if (isPending) return <LoadingState variant="card-skeleton" />;
if (isError) return <ErrorState scope="card" error={error} onRetry={() => qc.invalidateQueries({ queryKey: exportsKeys.jobStatus(exportId) })} />;
return <ExportStatusCard data={data} />;
```

Retries on reads are library-level via the defaults above. Retries on writes are explicitly disabled because a retried `POST /v1/webhooks/deliveries/:id/retry` would create two deliveries. Mutations either succeed or surface; the user clicks again.

### Suspense mode

`useSuspenseQuery` is available but not the default in v0.1. Routes that opt in must provide a sensible fallback.

### Background refetch indicators

A query is `isFetching` when a refetch is happening on data that is already in the cache. The component does not render a skeleton in that state; it keeps the resting render and a thin progress bar appears at the top of the page chrome.

```tsx
// apps/web/src/components/chrome/refetch-bar.tsx
import { useIsFetching } from "@tanstack/react-query";

export function RefetchBar() {
  const count = useIsFetching();
  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed top-0 left-0 h-[2px] bg-accent transition-opacity",
        count > 0 ? "opacity-100" : "opacity-0",
      )}
      style={{ width: count > 0 ? "100%" : 0 }}
    />
  );
}
```

The bar is `aria-hidden`. Screen readers do not need to know about a background refetch; the user is not blocked from interacting with the surface. See `08-feedback-states.md` for the visual.

## Picking between the two

The decision is mechanical.

| Question | Answer |
|---|---|
| Is the endpoint behind `/graphql`? | Apollo. |
| Is the endpoint a REST route (`/v1/...`)? | TanStack. |
| Is the feature half GraphQL, half REST? | The GraphQL half uses Apollo, the REST half uses TanStack, both on the same screen. |
| Is the data a subscription on the schema? | Apollo. WebSocket transport is part of the same client. |
| Is the data a file upload, polled job status, or third-party redirect? | TanStack. These are REST. |
| Do I need normalized graph caching across many overlapping views? | Apollo, by construction. |
| Do I need a flat cache with structural keys and infinite scroll? | TanStack, by construction. |

There is no judgment call. The endpoint shape decides.

## Cross-cutting concerns

### Auth refresh

Both clients call the same `refreshAccessToken()` function in `apps/web/src/lib/auth/tokens.ts`. The Apollo error link triggers it on `UNAUTHENTICATED`. The TanStack `fetchWithAuth` wrapper triggers it on a 401 response.

```ts
// apps/web/src/lib/query/fetch-with-auth.ts
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken();
  let res = await fetch(input, {
    ...init,
    headers: { ...init.headers, authorization: token ? `Bearer ${token}` : "" },
    credentials: "include",
  });
  if (res.status === 401) {
    await refreshAccessToken();
    token = await getAccessToken();
    res = await fetch(input, {
      ...init,
      headers: { ...init.headers, authorization: token ? `Bearer ${token}` : "" },
      credentials: "include",
    });
  }
  return res;
}
```

The retry-after-refresh happens at most once. If the refresh itself fails, `refreshAccessToken()` rejects, which bubbles out as the original 401 surfacing to the hook.

### Network state

When `navigator.onLine === false`, both clients short-circuit reads to cached data. TanStack does this with the `networkMode` option; the default is `online` for queries, which means a fetch fired while offline simply suspends and resumes on reconnect. Apollo's `fetchPolicy: 'cache-and-network'` falls back to cache when the network is down because the network branch errors silently and the cached branch keeps the UI alive.

Mutations fired while offline fail with an error toast and the user retries when reconnected. There is no offline mutation queue in v0.1; the worker mobile view is a responsive web surface only, not a PWA. See `docs/FEATURES.md` for the scope decision.

### Tenant boundaries

The JWT carries the operator. Both caches are tenant-scoped implicitly because the server never returns cross-tenant data for a given token. On a tenant switch (`super_admin` impersonation or operator switch), the cookie changes, the JWT changes, and the in-memory caches must be wiped so a leftover `Job:abc` entry does not leak across tenants.

```ts
export async function switchTenant(nextOperatorId: string): Promise<void> {
  await api.switchOperator(nextOperatorId);
  await refreshAccessToken();
  queryClient.clear();
  await apolloClient.clearStore();
}
```

`clear()` and `clearStore()` are both required. They are sibling operations on sibling caches. Skipping one leaves stale data visible until the next refetch.

The same wipe runs on logout, in the same order.

## Reusable wrappers, the catalog

The patterns that every domain follows.

| Pattern | Lives at | Purpose |
|---|---|---|
| Apollo type policies | `apps/web/src/lib/apollo/type-policies.ts` | Cache identity and paginated merges. |
| Apollo error link | `apps/web/src/lib/apollo/client.ts` | 401 refresh-and-replay. |
| TanStack QueryClient | `apps/web/src/lib/query/client.ts` | Defaults for the whole app. |
| TanStack key factories | `apps/web/src/lib/query/keys/<domain>.ts` | Centralized keys, structural invalidation. |
| `fetchWithAuth` | `apps/web/src/lib/query/fetch-with-auth.ts` | Single source of truth for REST auth. |
| `HttpError` | `apps/web/src/lib/query/http-error.ts` | Typed error class with `status`, `code`, `message`. |
| Domain read hooks | `apps/web/src/lib/query/hooks/use-*-*.ts` | Wrappers around `useQuery`. |
| Domain write hooks | `apps/web/src/lib/query/hooks/use-*-*.ts` | Wrappers around `useMutation` that own their invalidations. |

A new domain adds a key factory and a small set of `use-*` hooks. Components import the hooks, never the keys or the fetch wrapper directly.

## Testing

The two clients have different testing stories. Both are covered in detail in `backend/03-testing.md` for the API side; this section is the client side.

### Mocking Apollo

`MockedProvider` from `@apollo/client/testing` wraps the component under test. Each test supplies the mocks for the documents it expects to fire.

```tsx
import { MockedProvider } from "@apollo/client/testing";
import { GetJobDocument } from "@/lib/graphql/__generated__";

const mocks = [
  {
    request: { query: GetJobDocument, variables: { id: "job_1" } },
    result: { data: { job: { __typename: "Job", id: "job_1", status: "SCHEDULED" } } },
  },
];

render(
  <MockedProvider mocks={mocks} addTypename>
    <JobDrawer jobId="job_1" />
  </MockedProvider>,
);
```

A test that exercises a mutation provides a second mock for the mutation document and asserts on the cache after `await waitFor(...)`. Subscriptions are mocked with the same shape; `MockedProvider` accepts subscription mocks with an optional `delay` to fan out updates.

### Mocking TanStack

A fresh `QueryClient` per test, with `retry: false` and `gcTime: Infinity`. Fetch is mocked with `msw` (preferred) or `vi.fn()` adapters where MSW is overkill.

```tsx
function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
```

The `retry: false` flip is mandatory. The default of 2 retries makes tests slow and assertion failures cryptic. The fresh client per test prevents bleed-through between tests.

For optimistic-update tests, the test asserts on three states. The optimistic state right after the click, the resting state after the server confirms, and the rolled-back state after a forced failure.

## Anti-patterns

These do not pass review.

- Calling `fetch` directly from a component. The component imports a hook. Always.
- Building a global store on top of TanStack with `setQueryData` everywhere. The cache is the store; if a component needs derived state, it derives it in render.
- Stringly-typed keys at the callsite, e.g. `useQuery({ queryKey: ['jobs', 'list', filters] })`. Always go through the factory.
- Optimistic updates without snapshot and restore. Silent state loss on error is the documented failure mode.
- Reading the same endpoint from both Apollo and TanStack. The two caches will disagree and the bug will look like flakiness.
- A wrapper that returns a custom shape (e.g. `{ jobs, loading }`) instead of the library shape. Components rely on the library's discriminated union (`isPending`, `isError`, `data`); a custom shape breaks that.
- Catching errors inside the hook and returning `null`. The hook returns the library shape unchanged. The component decides how to render `isError`.
- Mutating cache state from inside a `useEffect` based on `data`. If the cache needs to change after a mutation, do it in `onSuccess` of that mutation, not in an effect downstream.
- Adding a `merge` in Apollo type policies for non-paginated lists. The default identity merge is correct; a custom merge will silently swallow updates.
- Retrying mutations. `mutations.retry` stays `false` globally and `false` per mutation. A retried `POST` is a double write.

## Cross-references

| Topic | Read |
|---|---|
| Component-level loading, empty, error rendering | `08-feedback-states.md` |
| Client state (Zustand) vs server state (Apollo/TanStack) | `04-state-management.md` |
| Worker mobile responsive view | `15-worker-mobile.md` |
| GraphQL schema and codegen | `backend/02-api.md`, contracts package |
| Auth refresh contract | `11-auth-flows.md`, `shared/03-security.md` |
| Tenant scoping rules | `shared/04-rbac.md` |
| Realtime subscriptions on the dispatch board | `14-dispatch-board.md` |
| Backend testing of GraphQL and REST | `backend/03-testing.md` |

## Checklist for "done"

A data-fetching surface ships when all of these are true.

- [ ] Reads go through a wrapper hook. Components never call `useQuery` or `fetch` directly.
- [ ] Writes go through a wrapper hook that owns its invalidations.
- [ ] All TanStack keys come from a domain `keys` factory.
- [ ] Apollo `optimisticResponse` is paired with an `update` callback that writes the same shape.
- [ ] TanStack optimistic updates follow snapshot, write, restore on error, invalidate on settled.
- [ ] Errors surface through the hook to the component, which renders via `08-feedback-states.md`.
- [ ] Refetch indicator (`isFetching`) is reflected in the chrome, not in surface skeletons.
- [ ] 401 refresh-and-replay works on both transports without a re-login.
- [ ] Tenant switch and logout call both `queryClient.clear()` and `apolloClient.clearStore()`.
- [ ] Tests use `MockedProvider` for Apollo and a fresh `QueryClient` with `retry: false` for TanStack.

## Gaps

- The exact retry budget for the `wsLink` before falling back to polling is not finalized. Current placeholder is 5 attempts with exponential backoff. `[NEEDS: ws retry budget decision]`
- A `useQueryState` wrapper to mirror URL search params into TanStack queries is on the backlog. Surfaces that filter by URL today wire it by hand.
- The `HttpError` class shape is not fully specified across all REST endpoints. The contracts package owns the error envelope; this chapter assumes it exists. `[NEEDS: REST error envelope contract]`
- Apollo `MockedProvider` does not natively support subscription test sequencing the way we want for the dispatch board. A small helper (`mockSubscription`) is on the backlog. `[NEEDS: subscription test helper]`
- The bar that visualizes `isFetching` is described here but does not yet have a rendered visual in `docs/images/ui/`. `[NEEDS: refetch bar visual]`
- We have not decided whether dev tools (`@tanstack/react-query-devtools`, Apollo Client devtools extension) are enabled in production builds gated by a feature flag, or excluded entirely. Current default is excluded.
- A decision log file (`docs/decisions/`) for cross-cutting data-fetching choices is not yet in the repo. `[NEEDS: decision log file]`
