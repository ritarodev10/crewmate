# 09 — Error handling

The cross-cutting index for error handling on the web app. Six other chapters already own pieces of this surface. This chapter does not redefine those pieces. It restates the wire contract, enumerates every API error code, names the UI treatment that each code maps to, documents the error-boundary stack, and lists the anti-patterns that get refused at review.

Read this chapter when the task is "wire a new error code into the UI" or "decide which surface owns this failure mode." For the patterns themselves, follow the cross-links into the owning chapters.

## Why this chapter exists

Error handling on the web app is owned by many surfaces. The forms chapter owns server-error reconciliation inside a form. The data-fetching chapter owns retry behavior on reads. The feedback-states chapter owns the visual shapes for inline, banner, full-page, and drawer errors. None of those chapters owns the whole picture. This chapter is the entry point that points at each of them, fills the gaps between them, and pins the contract that they all read from.

## The API error contract

The wire shape is defined in `backend/04-error-handling.md`. That document is the source of truth. The shape is repeated here so the frontend agent does not have to leave this chapter to know what to consume.

```ts
type ApiError = {
  code: string;          // stable, machine-readable. Example: 'JOB_INVALID_TRANSITION'
  message: string;       // human-readable, safe to render
  requestId: string;     // ULID. Propagate to support and Sentry
  details?: Record<string, unknown>; // per-field errors for validation, etc.
};
```

The full envelope on the wire wraps this under `{ error: ApiError }` for REST and under `extensions` for GraphQL. The unwrapping happens at the transport boundary. By the time the error reaches a hook envelope it has been normalized to the `ApiError` shape above.

The same shape is exported from the contracts package so both clients consume it from one place.

```ts
// packages/contracts/src/errors.ts
export type ApiError = {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};
```

The TanStack `HttpError` class (`apps/web/src/lib/query/http-error.ts`, referenced in `05-data-fetching.md`) and the Apollo error link both normalize to this shape. Components never see the raw `Response` or the raw `GraphQLError`.

## Where errors enter the UI

Every error in the product reaches the UI through one of these entry points. Each row points at the chapter that owns the surfacing pattern.

| Source | How it surfaces | Owner chapter |
|---|---|---|
| Apollo Client (GraphQL) | `error` on `useQuery`, `useMutation`, `useSubscription` | `05-data-fetching.md` |
| TanStack Query (REST) | `isError`, `error` on the hook envelope | `05-data-fetching.md` |
| Form submission | `form.formState.errors` plus `form.setError` from server response | `07-forms.md` |
| Uncaught render error | React error boundary | `06-reusable-patterns.md` and this chapter |
| Network offline | `navigator.onLine`, topbar band | `08-feedback-states.md` |
| Auth refresh failure | Silent refresh, fallback to `/login` with banner | `11-auth-flows.md` |
| Realtime subscription drop | WebSocket reconnect with polling fallback | `05-data-fetching.md`, `14-dispatch-board.md` |
| Optimistic mutation rollback | Toast on revert | `14-dispatch-board.md`, `05-data-fetching.md` |

If an error appears somewhere not in this table, the surface is either undocumented or it is rendering an error in a way the system does not sanction. Bring it back to one of these rows before merging.

## The error-code-to-UI mapping

The definitive table. Every code documented in `backend/04-error-handling.md` has a row here with a default UI treatment. Surfaces are allowed to override the treatment when the chapter for that surface has a stronger reason. The override has to be documented in that chapter.

| Code | HTTP | Default UI | Owner |
|---|---|---|---|
| `AUTH_REQUIRED` | 401 | Silent refresh-and-replay. If the refresh fails, redirect to `/login` with an info `Banner` reading "Your session expired. Sign in to continue." | `11-auth-flows.md`, `05-data-fetching.md` |
| `AUTH_INVALID_CREDENTIALS` | 401 | Inline form-level `Banner` variant `error` on the login form. Generic copy, does not name which field failed. | `11-auth-flows.md`, `07-forms.md` |
| `AUTH_TOKEN_REVOKED` | 401 | Force logout. Redirect to `/login` with an info `Banner` reading "You have been signed out." | `11-auth-flows.md` |
| `AUTHZ_DENIED` | 403 | Default full-page `ErrorState` with `ShieldOff` icon and "You don't have access" copy. Inside a drawer or card, render as a section-local `Banner` variant `error`. | `11-auth-flows.md`, this chapter |
| `VALIDATION_FAILED` | 400 | Inline field errors via `form.setError`, one per `details.fields[]` entry. First errored field receives focus. No banner unless the envelope also carries a form-level message. | `07-forms.md` |
| `NOT_FOUND` | 404 | Full-page `ErrorState` with `SearchX` icon for route-level. Drawer-level falls back to a centered `ErrorState` inside the drawer body with a Close action. | `08-feedback-states.md` |
| `JOB_NOT_FOUND` | 404 | Same as `NOT_FOUND`. Copy names the entity. "This job is gone." | `14-dispatch-board.md`, `12-data-display.md` |
| `TENANT_BOUNDARY_VIOLATION` | 404 | Render as `NOT_FOUND`. Never as a 403. The UI does not distinguish between "does not exist" and "exists in another tenant." | this chapter (silent boundary) |
| `JOB_INVALID_TRANSITION` | 409 | `Toast` variant `warn` with the reason from `message`. The dispatch board additionally rolls back the optimistic move. | `14-dispatch-board.md`, `15-worker-mobile.md` |
| `CONFLICT` | 409 | `Banner` variant `warn` at the top of the form or card, with `message` as copy and a "Refresh" action that re-fetches the entity. | `07-forms.md`, surface chapter |
| `UNIQUE_CONSTRAINT` | 409 | Inline field error on the field named in `details.fields[]`. Falls back to a form-level banner if no field is named. | `07-forms.md` |
| `RATE_LIMITED` | 429 | `Toast` variant `warn` with "Slow down. Try again in a moment." The hook honors the `Retry-After` header before re-enabling the submit. | this chapter (global) |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | Not surfaced in the operator UI. The caller is a third party. Logged for the webhook diagnostics surface. | `17-webhooks-and-events.md` |
| `UPSTREAM_FAILED` | 502 | `Banner` variant `error` at the top of the card or page, with "A service we depend on is having trouble. Try again in a moment." | `17-webhooks-and-events.md`, `19-settings.md` (billing) |
| `UPSTREAM_TIMEOUT` | 504 | Same as `UPSTREAM_FAILED`. The banner copy reads "Took too long to respond. Try again." | same |
| `SERVICE_UNAVAILABLE` | 503 | Full-page `ErrorState` with `AlertOctagon` icon. The page polls `/healthz` every 10s and auto-recovers when the API responds 200. | this chapter |
| `INTERNAL_ERROR` | 500 | Full-page `ErrorState` with `AlertOctagon` icon and the `requestId` rendered in a small monospace footer with a "Copy" button. | this chapter |
| `HTTP_ERROR` | various | Fallback for `HttpException` instances the filter did not classify. Treated as `INTERNAL_ERROR` by the UI. | this chapter |
| `OFFLINE` | n/a | Topbar warn band when `navigator.onLine === false`, reading "You are offline. Reconnect to continue." Banner pattern documented in `08-feedback-states.md`. | `08-feedback-states.md` |

The codes marked "silent" never produce visible UI on their own.

| Code | Why silent |
|---|---|
| `AUTH_REQUIRED` (on background refresh) | The Apollo error link and `fetchWithAuth` both refresh-and-replay. The user sees nothing unless the refresh itself fails. |
| `TENANT_BOUNDARY_VIOLATION` | Surfaced as `NOT_FOUND`. Existence-leakage is the whole reason this code exists. |
| `WEBHOOK_SIGNATURE_INVALID` | The third party caused this. Logged for diagnostics, not shown in the operator UI. |

A code that arrives without a row in this table is a new code. The PR that introduces it edits this table in the same diff. The same rule already holds on the API side (`backend/04-error-handling.md` "Domain error catalog"); the frontend mirror is enforced here.

## The error-boundary stack

Three layers, top to bottom. Each one catches a different scope and renders a different shape. Below the entity layer, errors are not caught by a boundary; they flow through hook envelopes and render via the feedback-states patterns.

### 1. Root boundary

Catches anything that escapes a route boundary. Lives at `apps/web/src/app/global-error.tsx` per the Next.js App Router convention. Mounts only when nothing else handles the error.

```tsx
// apps/web/src/app/global-error.tsx
"use client";

import { reportError } from "@/lib/observability/report-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportError(error, { boundary: "global" });

  const requestId = extractRequestId(error);

  return (
    <html>
      <body>
        <main className="grid min-h-screen place-items-center bg-canvas px-6">
          <div className="max-w-md text-center">
            <h1 className="text-h2 text-default">Something broke.</h1>
            <p className="mt-2 text-body text-muted">
              We have been notified. Try reloading the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex h-9 items-center rounded-md bg-brand px-4 text-on-brand"
            >
              Reload
            </button>
            {requestId && (
              <p className="mt-6 font-mono text-micro text-muted">
                Request id: {requestId}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
```

The global boundary renders its own `<html>` and `<body>` because it sits above the root layout. It does not use the design-system components by reference because those primitives depend on providers that may not have mounted. The copy and the tokens stay consistent with `00-design-system.md`.

### 2. Route-level boundary

Catches anything that escapes the page's React tree. Lives at `apps/web/src/app/<route>/error.tsx`. The route shell (sidebar, topbar) stays mounted because the boundary sits inside the layout.

```tsx
// apps/web/src/app/dispatch/error.tsx
"use client";

import { ErrorState } from "@/components/ui/error-state";
import { reportError } from "@/lib/observability/report-error";
import { extractRequestId } from "@/lib/errors/extract-request-id";

export default function DispatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  reportError(error, { boundary: "route", route: "/dispatch" });
  const requestId = extractRequestId(error);

  return (
    <ErrorState
      scope="page"
      icon="AlertOctagon"
      title="Something broke loading the board."
      description="We have been notified. Try again."
      action={{ label: "Retry", onClick: reset }}
      requestId={requestId}
    />
  );
}
```

Every route directory in the app gets an `error.tsx`. The shape is identical except for the route name in the copy. The patterns chapter (`06-reusable-patterns.md`) documents the route-level boundary as one of the two required layers.

### 3. Entity-level boundary

Wraps a `Drawer`, a `Card`, or any region whose data fetch can fail without taking down the rest of the route. Implemented as a React class component because functional boundaries are not part of React's stable API. Lives in `packages/ui/`.

```tsx
// packages/ui/src/components/entity-error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "./error-state";
import { reportError } from "../lib/report-error";

type Props = {
  children: ReactNode;
  scope: "drawer" | "card" | "dialog";
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
};

type State = { error: Error | null };

export class EntityErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    reportError(error, { boundary: "entity", scope: this.props.scope, info });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return (
      <ErrorState
        scope={this.props.scope}
        icon="AlertCircle"
        title="This section failed to load."
        action={{ label: "Try again", onClick: this.reset }}
      />
    );
  }
}
```

The boundary preserves the parent layout. A drawer error renders inside the drawer body. A card error renders inside the card. The rest of the page stays interactive.

## Sentry capture policy

Sentry is out of scope for v0.1 per docs/FEATURES.md. In v0.1 the error log line is the trail. Pino emits structured JSON to CloudWatch with requestId, route, action, userId where known, operatorId, and the error itself. Sentry could be slotted in later by calling captureException at the same place the log line is written; the abstraction is left informal until then.

```ts
// apps/web/src/lib/observability/report-error.ts
type Context = Record<string, unknown>;

export function reportError(error: unknown, context: Context = {}): void {
  const ctx = {
    requestId: extractRequestId(error),
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    userId: tryGetUserId(),
    operatorId: tryGetOperatorId(),
    ...context,
  };
  if (process.env.NODE_ENV === "development") {
    console.error("[reportError]", { error, context: ctx });
    return;
  }
  console.error(JSON.stringify({ kind: "client_error", error: serializeError(error), context: ctx }));
}
```

Every error log carries the same context fields.

| Field | Source |
|---|---|
| `requestId` | Extracted from the error envelope. Missing for render errors. |
| `route` | `window.location.pathname` at the moment of capture. |
| `userId` | The current user id if the auth context has resolved. |
| `operatorId` | The active operator id. Null for super_admin pre-impersonation. |
| `boundary` | `global`, `route`, or `entity`. Passed by the caller. |
| `scope` | For entity boundaries, the value passed at the wrapping site. |

The `reportError` adapter is the only place errors leave the app. Surfaces never call `console.error` or `console.log` directly. The patterns chapter (`06-reusable-patterns.md`) already pins this rule for boundaries; this chapter extends it to every error path.

## Request-id propagation

The API sets `x-request-id` on every response. Both client transports preserve it on the error envelope so the UI can display it on the full-page error layout. Apollo's error link reads `response.extensions.requestId` and stitches it onto the `ApolloError` instance. TanStack's `fetchWithAuth` reads the `X-Request-Id` response header and attaches it to the `HttpError` instance. The shape of `HttpError`.

```ts
// apps/web/src/lib/query/http-error.ts
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details?: Record<string, unknown>;

  constructor(args: { status: number; code: string; message: string; requestId: string | null; details?: Record<string, unknown> }) {
    super(args.message);
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId;
    this.details = args.details;
  }
}
```

When a full-page `ErrorState` renders, the `requestId` appears in a small monospace footer with a "Copy" button backed by `useCopyToClipboard`. The id is one to one with the API's log line, so support tickets can include it. `ErrorState` from `01-components.md` already accepts the `requestId` prop and renders it as `text-micro font-mono text-muted` with a 12px gap below the action button.

## Recovery patterns

Three primary patterns plus the auth sign-out path. The right one depends on the scope of the failure.

### Retry on reads

TanStack retries idempotent reads twice with exponential backoff. Apollo retries on the same `cache-and-network` `nextFetchPolicy`. The UI does not render a "Retry" button for a transient read failure; the library has already retried. After the library gives up, the surface renders the error state and the user clicks "Try again," which triggers `queryClient.invalidateQueries` or `refetch` depending on the transport.

The retry budget is fixed by `05-data-fetching.md`. This chapter does not redefine it.

### Reload

Full-page errors expose a "Reload" button that calls `window.location.reload()`. The button is the primary action on the `ErrorState`. Reloading clears both client caches because the providers re-mount.

The global boundary's "Reload" is `window.location.reload()`. The route boundary's "Retry" is the Next-provided `reset()`, which re-renders the route subtree without reloading the page. Both buttons live in this chapter's mapping; surfaces do not invent a third recovery action.

### Refresh-just-this-section

Entity-level boundaries expose "Try again" actions that call `queryClient.invalidateQueries({ queryKey })` for the failing read, or Apollo's `refetch()`. The boundary itself resets when the new render succeeds.

```tsx
<EntityErrorBoundary
  scope="drawer"
  fallback={({ reset }) => (
    <ErrorState
      scope="drawer"
      icon="AlertCircle"
      title="Couldn't load this job."
      action={{ label: "Try again", onClick: () => { reset(); refetch(); } }}
    />
  )}
>
  <JobDrawerBody jobId={jobId} />
</EntityErrorBoundary>
```

### Sign out and back in

The 401 recovery path. `05-data-fetching.md` documents the silent refresh. When the refresh itself fails, both clients clear their caches and the router pushes `/login` with a banner. The owner is `11-auth-flows.md`.

## Optimistic rollback

When a mutation fires with an optimistic update and the server rejects it, the cache rolls back and the UI fires a `Toast` variant `error`. Copy comes from the envelope's `message` for known semantic conflicts (`JOB_INVALID_TRANSITION`, `UNIQUE_CONSTRAINT`). Unknown codes get "Couldn't save. Try again." with the `requestId` appended. The dispatch board owns the pattern in detail; this chapter pins that no rollback is silent.

## Anti-patterns

Refused on review.

- **Catching errors silently.** `try { ... } catch {}` is not a valid pattern. Always log via `reportError`. Always show something to the user, even if it is "Something went wrong, try again."
- **Toast-only form errors.** When the error is form-level or field-level, the form renders inline. A toast in addition is fine. A toast instead is not.
- **Throwing through a boundary without `cause`.** When re-throwing from a hook or boundary, preserve the original. `throw new Error("Wrapping failed", { cause: original })`.
- **Swallowing a `requestId`.** Every error path either propagates the `requestId` or explicitly records that none was available. The `extractRequestId` helper handles both.
- **`alert()`, `confirm()`, `prompt()`.** Use `ConfirmDialog` from `01-components.md`. Browser-native modals break the focus contract and the visual language.
- **Single generic "Something went wrong" toast for every code.** The mapping table above is the contract. A mutation that surfaces every error as the same string has lost information the API was trying to convey.
- **Boundary that does not call `reportError`.** Every boundary forwards. The structured log line is the trail; Sentry is not wired in v0.1.
- **Rendering an error inside a `useEffect`.** Errors render in render. An effect that calls `setError` because a fetch failed should be a hook envelope, not an effect.
- **Reading the raw `Response` or raw `GraphQLError` in a component.** The transport adapters normalize to `ApiError` and `HttpError`. Components consume those.
- **Catching `AppException`-shaped errors to translate them at the callsite.** Translation lives in `mapServerErrors` for forms and in the mapping table for everything else. A callsite-local translation drifts the moment a new code lands.

## Testing

Every domain hook test covers the success path and at least one error path. The error-path test asserts two things. The shape of the surfaced error matches `ApiError`. The correct UI treatment renders for that code.

```tsx
// apps/web/src/features/jobs/hooks/use-transition-job.spec.tsx
it("renders a warn toast when the server rejects with JOB_INVALID_TRANSITION", async () => {
  server.use(
    graphql.mutation("TransitionJob", () => {
      return HttpResponse.json({
        errors: [{
          message: "A job in status COMPLETED cannot transition to ASSIGNED.",
          extensions: {
            code: "JOB_INVALID_TRANSITION",
            requestId: "req_test",
            details: { jobId: "job_1", from: "COMPLETED", to: "ASSIGNED" },
          },
        }],
      });
    }),
  );

  const screen = renderWithProviders(<JobCard jobId="job_1" />);
  await userEvent.click(screen.getByRole("button", { name: /assign/i }));

  const toast = await screen.findByRole("alert");
  expect(toast).toHaveTextContent(/cannot transition/i);
  expect(toast).toHaveAttribute("data-variant", "warn");
});
```

The `ErrorState` props assertions are documented in `01-components.md` under the component's test contract. This chapter does not duplicate them; it just notes that the props the test reads are the canonical interface.

The error-boundary tests cover three states.

| Test | Assertion |
|---|---|
| Boundary catches a thrown error | The fallback `ErrorState` renders, `reportError` is called once with the boundary metadata. |
| Boundary resets when the child re-renders without throwing | The fallback unmounts, the child mounts, no extra `reportError` call. |
| Boundary preserves the parent layout | The drawer or card around the boundary stays in the DOM. |

The patterns chapter (`06-reusable-patterns.md`) owns the boundary unit tests. This chapter owns the integration tests that confirm the right `ApiError` flows into the right boundary.

## Cross-references

| Topic | Read |
|---|---|
| API error contract (source of truth) | `backend/04-error-handling.md` |
| `ErrorState`, `Banner`, `Toast` components | `01-components.md` |
| Visual variants for errors | `08-feedback-states.md` |
| Apollo and TanStack error surfacing on hooks | `05-data-fetching.md` |
| Two-layer error boundary pattern | `06-reusable-patterns.md` |
| Form-level server-error reconciliation | `07-forms.md` |
| Auth refresh, login redirect | `11-auth-flows.md` |
| Dispatch board optimistic rollback | `14-dispatch-board.md` |
| Webhook failure surfaces | `17-webhooks-and-events.md` |

## Checklist for "done"

An error path is shipped when all of these are true.

- [ ] The error code surfaces through an `ApiError`-shaped envelope, never as a raw `Response` or `GraphQLError`.
- [ ] The code has a row in the mapping table in this chapter.
- [ ] The UI treatment matches the table, or the surface chapter documents an explicit override.
- [ ] The `requestId` is preserved end to end and rendered on full-page errors.
- [ ] The error path is reported via `reportError` with the documented context fields.
- [ ] The boundary that wraps the surface is one of the three layers in this chapter.
- [ ] At least one test asserts the surfaced error shape and the rendered UI treatment.
- [ ] No `try { ... } catch {}` swallows the error. No `alert()`. No toast-only form error.
- [ ] Optimistic mutations that fail surface a toast or banner; the rollback is never silent.

## Gaps

- The full-page custom error pages per route are partially defined. Each route ships its own `error.tsx`, but the visual is not yet pixel-spec'd against `docs/images/ui/`. `[NEEDS: per-route error layouts]`.
- The OFFLINE story is simpler now that the worker mobile view is not a PWA and there is no IndexedDB write queue. The shared treatment is a topbar banner driven by `navigator.onLine`, owned by `08-feedback-states.md`, with `15-worker-mobile.md` consuming the same pattern. No consolidation chapter is needed.
- The `extractRequestId` helper is described here but not yet vendored. `[NEEDS: apps/web/src/lib/errors/extract-request-id.ts]`.
- The `EntityErrorBoundary` is described here as part of `packages/ui/`. The patterns chapter (`06-reusable-patterns.md`) lists `<DataState>` as the data-hook helper but does not yet vendor the boundary alongside it. `[NEEDS: vendored EntityErrorBoundary in packages/ui/]`.
- The mapping for `SERVICE_UNAVAILABLE` includes a `/healthz` poll-and-recover loop that is not yet implemented. The placeholder render is the same as `INTERNAL_ERROR` minus the "Copy request id" footer. `[NEEDS: healthz polling on the SERVICE_UNAVAILABLE page]`.
- The UI does not yet have a documented treatment for the case where the API returns an error code that this chapter's table does not list. The interim behavior is to render `INTERNAL_ERROR` and log a warning that an unknown code was received. The proper behavior is to surface a build-time check that every code on the wire has a UI mapping. `[NEEDS: code-mapping completeness check]`.
