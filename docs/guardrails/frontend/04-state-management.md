# 04 — State management

The single rule for where data lives in the web app. CrewMate's UI has four kinds of state, and each kind has exactly one home. Mixing them is the single biggest source of bugs in a React app of this size, so this chapter draws hard lines and refuses to apologize for them.

Read `01-components.md` first. The data-fetching split table (Apollo for GraphQL, TanStack Query for REST) is restated here for completeness, but the canonical location for component-level fetching guidance is still chapter 01. Tokens and visual contracts come from `00-design-system.md`. Feedback patterns referenced from this chapter (loading skeletons, toasts on rollback, banners on error) live in `08-feedback-states.md`.

## The four kinds

Every piece of data in the app fits one of these four categories. Before you reach for a hook, identify which one you have. If two answers feel plausible, the answer is whichever home preserves the data after a page refresh that the user expects.

| Kind | Home | Library | Lifetime |
|---|---|---|---|
| Server state from GraphQL | Apollo normalized cache | `@apollo/client` ^3.11 | Until the cache is evicted or the user signs out |
| Server state from REST | TanStack Query cache | `@tanstack/react-query` ^5.56 | Until the query key is invalidated or stale time elapses |
| URL state | The URL itself (search params, route params) | Next.js `useSearchParams`, `useRouter` | Until the user navigates away |
| Ephemeral UI state | Component local state, or Zustand when shared | `useState`, `useReducer`, `zustand` | Until the component unmounts |

The lifetime column is the discriminator that matters. If the data should survive a refresh, it is server state or URL state. If it should not, it is ephemeral.

## Where each kind belongs

The decision table. Use it the way you use the component catalog. If you cannot find your case in the rows below, your case is probably mis-classified, not new.

| Kind | Library | Allowed examples | Never put here |
|---|---|---|---|
| GraphQL server state | Apollo | Jobs list on the dispatch board, job detail in the drawer, schedule week, dashboard KPIs, team members, audit log entries, realtime subscription payloads | Form values, drawer open flag, toast queue, drag positions |
| REST server state | TanStack Query | CSV upload progress, webhook test delivery result, push subscription registration, file download links | Anything reachable through a GraphQL field, any subscription payload |
| URL state | `useSearchParams`, `useRouter` | Active filter selections, date ranges, selected job id, schedule week cursor, table sort key, table page cursor | Form draft values, transient UI flags, animation state |
| Ephemeral UI | `useState`, `useReducer`, `zustand` | Drawer animation phase, drag ghost position, menu open flag, command palette query string, impersonation banner visibility, multi-step form draft before submit | Server data, anything that should survive refresh, anything that has a canonical value on the server |

The "never put here" column is the part that gets violated most often by reflex. Read it twice before deciding.

## Apollo and TanStack Query, side by side

The split is by transport, not by feature. Apollo owns everything that has a typed field on the GraphQL schema. TanStack Query owns everything else.

The two libraries run side by side and never try to merge their caches. A worker invitation page can read the team list from Apollo and post a CSV upload through TanStack Query in the same component. They live in parallel and they do not contend.

| Property | Apollo | TanStack Query |
|---|---|---|
| Transport | GraphQL over HTTP, GraphQL over WebSocket for subscriptions | REST over HTTP |
| Cache shape | Normalized by `__typename` + `id` | Keyed by query key tuple |
| Optimistic updates | `useMutation` with `optimisticResponse` and cache writes | `useMutation` with `onMutate` / `onError` |
| Subscriptions | First-class via `useSubscription` | Not used. Subscriptions are GraphQL only |
| Refetch on focus | Off by default | On by default for staleTime 0 queries |

The reason for the split is documented as a decision-log entry referenced from `shared/05-quality-bar.md`. Most projects pick one library. CrewMate has GraphQL subscriptions on the dispatch board, schedule, and worker mobile feed, which Apollo handles natively. TanStack Query owns the REST surface where streaming and file uploads matter more than caching. Forcing either library to do both jobs would cost more than running both.

```tsx
// apps/web/src/features/team/team-page.tsx
"use client";

import { useQuery } from "@apollo/client";
import { useMutation } from "@tanstack/react-query";
import { TeamListDocument } from "@/graphql/team-list.generated";
import { uploadInviteCsv } from "@/lib/rest/team";

export function TeamPage() {
  const { data, loading } = useQuery(TeamListDocument);
  const upload = useMutation({ mutationFn: uploadInviteCsv });

  // ...
}
```

The two hooks coexist. They do not know about each other. They do not need to.

## The Zustand rule

Zustand is for ephemeral UI only. Never for server data. Never as a cache layer in front of Apollo or TanStack Query.

This is the rule that AI-generated code violates most often. The default reflex is to "lift state up into a global store" the moment two siblings need to read the same value. In CrewMate, that reflex is wrong four times out of five. The right home is usually either the URL (if the value should survive refresh) or the cache that already owns it (if the value is server data).

### Allowed uses

| Surface | Store responsibility |
|---|---|
| App shell | Sidebar collapsed flag, command palette open flag |
| Dispatch board | Drag-in-progress flag and ghost position during reschedule, card-selection set when bulk operating |
| Schedule view | Currently-hovered slot in the week grid, drag ghost during reschedule |
| Drawer (any) | Open / closed animation phase, when the open phase needs to be read by code outside the drawer (for example, to dim the rest of the page) |
| Filter forms before submit | Draft values while the user is composing a filter, before the submit hands the values to the URL |
| Command palette | Current query string while the user is typing, before they select an item |
| Impersonation banner | Visibility flag for the banner during an active impersonation session |

Every one of these has the property that a refresh should reset it. The drawer is closed on refresh. The drag is over on refresh. The command palette is empty on refresh. That is the signature of a Zustand-shaped piece of state.

### Disallowed uses

| Anti-pattern | What to do instead |
|---|---|
| Putting fetched data into a Zustand store and refetching from there | Read from Apollo or TanStack Query directly. Subscribe to the query at the component that needs it. |
| Mirroring an Apollo query into a store so a sibling can "react" to changes | Both siblings call `useQuery` on the same document. Apollo dedupes the request and shares the cache. |
| Holding form values in a global store | Local component state, or `react-hook-form` for non-trivial forms. The form's lifetime equals the form. |
| Building a custom event bus on top of Zustand | If two components need to react to the same server event, subscribe via `useSubscription`. If they need to react to a local UI event, hoist the handler to the nearest common parent. |
| Using `localStorage` directly | Auth tokens live in httpOnly cookies. See `11-auth-flows.md`. Other persistent UI preferences should be rare; when they exist, the store hook wraps `localStorage` once and exposes a typed selector, never raw key strings. |

If a PR adds a store named anything close to `useDataStore`, `useEntityStore`, or `useApiStore`, it is mis-shaped on its name alone.

### Store shape

A Zustand store in this codebase is small. One feature, one store, one file. It lives next to the feature it supports under `apps/web/src/features/<feature>/state/`. It exports a hook and a small set of named selectors. It does not export the store object directly.

```tsx
// apps/web/src/features/dispatch/state/drag-store.ts
import { create } from "zustand";

type DragState = {
  jobId: string | null;
  fromColumn: JobStatus | null;
  ghostX: number;
  ghostY: number;
};

type DragActions = {
  start: (jobId: string, fromColumn: JobStatus) => void;
  move: (x: number, y: number) => void;
  end: () => void;
};

export const useDragStore = create<DragState & DragActions>((set) => ({
  jobId: null,
  fromColumn: null,
  ghostX: 0,
  ghostY: 0,
  start: (jobId, fromColumn) => set({ jobId, fromColumn }),
  move: (ghostX, ghostY) => set({ ghostX, ghostY }),
  end: () => set({ jobId: null, fromColumn: null, ghostX: 0, ghostY: 0 }),
}));
```

The store carries no server data. The `jobId` it holds is a pointer back into the Apollo cache, not a copy of the job.

## The URL state rule

Anything a user can bookmark, share, or refresh and expect to return to the same view lives in the URL. Not in a store. Not in component state. The URL.

This is the rule that prevents the second-most-common AI-generated regression in this codebase, which is the slow drift toward "filters are part of the page so they live in a store, and we restore them from localStorage on mount". The URL already does that job. Use it.

### What goes in the URL

| Surface | Search params | Example |
|---|---|---|
| Dispatch board | `worker`, `property`, `date`, `job` | `/dispatch?worker=maya&date=2026-03-12&job=job_01H...` |
| Schedule view | `week` | `/schedule?week=2026-03-10` |
| Tables (any) | `sort`, `order`, `cursor`, plus filter keys per surface | `/team?sort=lastActive&order=desc` |
| Analytics | `range`, `compare` | `/analytics?range=last_30d` |
| Webhook log | `endpoint`, `status`, `range` | `/webhooks/deliveries?status=failed` |
| Drawer selection | `<entity>=<id>` | `?job=job_01H...`, `?member=usr_01H...` |

The default state (Today, no filter, no selection) renders with no query string. The URL stays clean for the common case.

### Helpers

A thin wrapper lives at `apps/web/src/lib/url/use-query-state.ts`. It pairs `useSearchParams` with `router.replace` and gives back a typed `[value, setValue]` per param. The wrapper does three things. It coerces strings into typed values (`string`, `string[]`, `Date`, `enum`). It batches updates so two `setValue` calls in the same tick produce one URL change. It uses `replace` rather than `push` so back-button history is not polluted by filter twiddling.

```tsx
// apps/web/src/features/dispatch/dispatch-page.tsx
"use client";

import { useQueryState } from "@/lib/url/use-query-state";

export function DispatchPage() {
  const [workerIds, setWorkerIds] = useQueryState("worker", { type: "string[]" });
  const [date, setDate] = useQueryState("date", { type: "date", default: today() });
  const [selectedJobId, setSelectedJobId] = useQueryState("job", { type: "string" });

  // ...
}
```

The components below render and behave entirely from these values. A bookmark of the current URL restores the same view in another tab. A refresh restores the same view. The store does not hold filters. The cache does not hold filters.

### Cross-route navigation state

A common ask. A coordinator filters the dispatch board, opens a job, drills into the worker, then navigates back. They expect the filters to still be applied.

The answer is the URL, not a global store. When the worker page is opened via a deep link, it does not need the dispatch filters. When the user navigates back, the browser restores the previous URL, which restores the filters because the filters were always in the URL.

If the design ever asks for filters to persist across truly different routes (for example, a worker filter that follows the user from the dispatch board to the schedule view), that is two routes sharing a vocabulary, and the right answer is to use the same query param name on both routes. It is still URL state.

## Form state

Form state is local to the form. It lives in `react-hook-form`. It does not live in Zustand. It does not live in the URL. It does not live in Apollo or TanStack Query.

The form is a transient editing surface. Its lifetime equals the time between the user opening it and either submitting or discarding it. On submit, the values become a mutation argument and immediately leave the form's state. On discard, they vanish.

```tsx
// apps/web/src/features/team/invite-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client";
import { InviteMemberDocument } from "@/graphql/invite-member.generated";
import { inviteSchema } from "./invite-schema";

export function InviteForm({ onDone }: { onDone: () => void }) {
  const form = useForm({ resolver: zodResolver(inviteSchema) });
  const [invite, { loading }] = useMutation(InviteMemberDocument);

  const onSubmit = form.handleSubmit(async (values) => {
    await invite({ variables: { input: values } });
    onDone();
  });

  // ...
}
```

The form values never appear in a store. The mutation hook's loading flag drives the submit button's `loading` state from `01-components.md`. The mutation hook's error feeds the form-level banner from `08-feedback-states.md`.

### Multi-step forms

A form that spans several steps still does not need a global store. The draft values live in a single `useForm` instance at the top of the wizard, and each step is a child component that reads and writes through the form's hooks. If the wizard needs to survive a route change, the answer is to keep the wizard on one route and render the steps as panels. If the wizard genuinely must span routes, the partially-saved draft is server state by then, and it lives in Apollo or TanStack Query, not in Zustand.

### Filter forms before submit

The one allowed Zustand use that touches form-shaped data. When a filter panel composes a complex query before the user hits Apply, the draft values can live in a Zustand store scoped to that panel. On Apply, the draft moves into the URL and the store resets. The store exists so that the filter panel can stay open while the user reviews other parts of the page, which a local form state would not survive if the panel unmounts.

## Optimistic updates

Apollo and TanStack Query both support optimistic updates. Use them. The rule is one line.

> Optimistic updates write to the cache that owns the data. Never to Zustand.

The cache is the source of truth for the UI. The mutation writes the optimistic value into the cache. The components subscribed to the relevant query see the new value immediately. On server confirmation, the cache is reconciled with the server response. On error, the library's standard rollback path reverts the cache and the surface raises a `Toast` variant `warn` per `08-feedback-states.md`.

```tsx
// apps/web/src/features/dispatch/use-transition-job.ts
import { useMutation } from "@apollo/client";
import { TransitionJobDocument } from "@/graphql/transition-job.generated";
import { toast } from "@/lib/toast";

export function useTransitionJob() {
  const [mutate] = useMutation(TransitionJobDocument);

  return (jobId: string, nextStatus: JobStatus) =>
    mutate({
      variables: { id: jobId, next: nextStatus },
      optimisticResponse: {
        transitionJob: {
          __typename: "Job",
          id: jobId,
          status: nextStatus,
        },
      },
      onError: () => {
        toast.warn("Couldn't move the job. Putting it back.");
      },
    });
}
```

The dispatch board renders the new column placement from the cache. It does not need a separate store to track "moving" jobs. The cache's optimistic value is the moving state.

The list of surfaces that use optimistic updates is documented per surface in `08-feedback-states.md` under the "Optimistic updates" table. This chapter sets the cache rule; the per-surface chapters set the choreography rule.

## Local component state

The default. If a piece of state is used by one component and its direct children, use `useState` or `useReducer`. Do not reach for a store.

The bar for promoting state to Zustand is the same as the bar for extracting a helper in `shared/05-quality-bar.md`. See the same shape three times before extracting. A boolean toggle in one component does not need a store. The third time the same toggle appears across siblings that cannot share a parent, the store is justified.

```tsx
function JobMenu({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  // ...
}
```

The menu's open state is one component's business. It stays local.

## Examples by surface

For each major surface, where each kind of state lives. The surface chapter governs the visual contract; this chapter governs the state contract.

| Surface | GraphQL (Apollo) | REST (TanStack Query) | URL | Ephemeral (local + Zustand) |
|---|---|---|---|---|
| Dispatch board (chapter 14) | Job list, subscription updates, job detail in drawer | Test webhook delivery (none on this page) | `worker`, `property`, `date`, `job` | Drag store (drag-in-progress, ghost position), card selection set, drawer animation phase |
| Worker mobile (chapter 15) | Today's jobs, job detail, mutations for check-in / check-out | Push subscription registration | `job` for the active job sheet | Action sheet open flag, queued-writes count for the banner |
| Schedule (chapter 16) | Schedule week, mutations to reschedule | none | `week`, optional `worker` | Drag store, hover-slot indicator |
| Webhook log (chapter 17) | Deliveries list, delivery detail, endpoint config | Test delivery (POST to a one-off REST endpoint) | `endpoint`, `status`, `range`, `delivery` | Drawer open flag, retry-in-flight per delivery (local state on the row) |
| Team page (chapter 18) | Members list, role mutations, invitations | CSV invite upload | `sort`, `order`, `member`, `role` | Invite form draft (form state via react-hook-form), confirm dialog open flag |
| Settings (chapter 19) | Settings queries and mutations | File upload for logo (future) | `tab` for the settings sub-tab | Form drafts via react-hook-form, save-flash phase |
| Login and auth (chapter 11) | Auth mutations (login, signup, 2FA enroll) | none | `reason` for messages on the login page (`?reason=expired`) | Form state via react-hook-form, 2FA enrollment dialog open flag |
| Command palette (chapter 03) | Search query via Apollo if results come from the schema | none | none (the palette closes on refresh) | Open flag, query string while typing, selected index |
| Impersonation banner (chapter 11) | Read of the act-as session from Apollo | none | none | Banner visibility flag (Zustand, so the topbar and main both subscribe) |

The composition pattern repeats. A single page typically uses three of the four kinds. The dispatch board uses Apollo for the job list and subscriptions, URL state for the active filters and selected job id, and Zustand for the drag store and the drawer animation phase. It does not use TanStack Query because it has no REST surface. The webhook log uses all four.

## Composition example

The dispatch board, end to end. Short. The full surface is in `14-dispatch-board.md`.

```tsx
// apps/web/src/features/dispatch/dispatch-page.tsx
"use client";

import { useQuery, useSubscription } from "@apollo/client";
import { JobsForDayDocument } from "@/graphql/jobs-for-day.generated";
import { JobUpdatedDocument } from "@/graphql/job-updated.generated";
import { useQueryState } from "@/lib/url/use-query-state";
import { useDragStore } from "./state/drag-store";
import { DispatchColumns } from "./dispatch-columns";
import { JobDrawer } from "./job-drawer";

export function DispatchPage() {
  // URL state.
  const [workerIds] = useQueryState("worker", { type: "string[]" });
  const [date] = useQueryState("date", { type: "date", default: today() });
  const [selectedJobId, setSelectedJobId] = useQueryState("job", { type: "string" });

  // Server state, Apollo.
  const { data, loading } = useQuery(JobsForDayDocument, {
    variables: { date, workerIds },
  });
  useSubscription(JobUpdatedDocument, { variables: { date } });

  // Ephemeral, Zustand. Drag state is read by columns and ghost layer.
  const isDragging = useDragStore((s) => s.jobId !== null);

  // ...

  return (
    <>
      <DispatchColumns jobs={data?.jobs ?? []} loading={loading} isDragging={isDragging} />
      <JobDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </>
  );
}
```

Three kinds of state, three libraries, no overlap. Filters in the URL. Jobs in Apollo. Drag in Zustand. The drawer is opened by setting a URL param, not by setting a global flag. The component subscribed to `selectedJobId` reads it from the URL and fetches the job detail itself.

## Anti-patterns to refuse on review

A PR that does any of the following is sent back without further review.

| Anti-pattern | Why it fails |
|---|---|
| Fetched server data copied into a Zustand store. | Two sources of truth. The cache already exists and is automatic. The store adds nothing and silently goes stale. |
| A "global cache" Zustand store that wraps Apollo or TanStack Query calls. | This is reinventing the libraries we already chose. The libraries are the cache layer. |
| Form values held in Zustand. | The form's lifetime is the form. Promoting it to global state means the form's discard semantics are no longer obvious from reading the form. |
| `localStorage` used for anything other than feature flags that survive refresh. | Auth tokens are in httpOnly cookies (`11-auth-flows.md`). Other persistent UI preferences are rare and go through a single typed wrapper, never raw key strings. |
| A custom event bus on top of Zustand to notify components of server updates. | Use `useSubscription` for server events. For local UI events, hoist the handler to a common parent. |
| Filter values held in component state on the page component. | Refresh loses the filters. Bookmark loses the filters. Move them to the URL. |
| A new store imported into the auth flow to "track login state". | Authentication is decided by the server. The Apollo cache holds the current viewer query. The store does not enter this conversation. |
| Drawer open / closed in a global store, with the entity id also in the store. | The entity id belongs in the URL so the drawer survives a refresh and a deep link. The animation phase can stay in the store. |

When in doubt, ask the question from `README.md` of this folder. Will a future change be easier or harder because this rule is followed? Putting server data into Zustand is always the "harder" answer.

## Library versions

For reference and to keep this chapter and `apps/web/package.json` from drifting.

| Library | Version | Role |
|---|---|---|
| `@apollo/client` | ^3.11 | GraphQL server state |
| `@tanstack/react-query` | ^5.56 | REST server state |
| `zustand` | `[NEEDS: zustand version pinned in apps/web/package.json]` | Ephemeral UI state shared across siblings |
| `react-hook-form` | `[NEEDS: react-hook-form version pinned in apps/web/package.json]` | Form state |
| `@hookform/resolvers` | `[NEEDS: hookform resolvers version]` | Zod resolver bridging react-hook-form and zod |
| Motion | `framer-motion` ^11.5 (package now published as `motion`) | Animation, used for drawer slide and other transitions per `00-design-system.md` |

The `[NEEDS]` markers are honest gaps. The current `apps/web/package.json` does not list `zustand` or `react-hook-form` yet because the chapters that introduce them have not landed. When they are pinned, this table is the place that gets updated alongside the dependency change.

## Checklist for "done"

A page or component is shipped when all of these are true.

- [ ] Server data is read through `useQuery` (Apollo) or `useQuery` (TanStack Query), never copied into a store.
- [ ] Anything bookmark-worthy, share-worthy, or refresh-worthy lives in the URL via `useQueryState`.
- [ ] Form values live in `react-hook-form` or a single `useState` in the form component, never in Zustand.
- [ ] Zustand stores hold only ephemeral UI state. Reviewing each store's state shape confirms no server data is in it.
- [ ] Optimistic updates write to the cache that owns the data. On error, the cache rolls back and a `Toast` warn appears.
- [ ] `localStorage` is not touched outside the documented wrapper.
- [ ] The page's state composition is documented in its surface chapter's "State composition" line where one exists, or follows the row in this chapter's per-surface table.

## Gaps

- The `useQueryState` wrapper described above is the intended shape but the implementation has not landed. Surfaces written before the wrapper exists call `useSearchParams` and `router.replace` directly. The migration is tracked in the build plan. `[NEEDS: build-plan task id for use-query-state wrapper]`
- Zustand and react-hook-form are referenced throughout this chapter but not yet pinned in `apps/web/package.json`. The dependency PR is expected to land in the same wave as the first surface that needs them (dispatch board v0.2).
- The decision-log entry for the Apollo + TanStack Query split is referenced from `shared/05-quality-bar.md` but the full decision file under `docs/decisions/` has not been written. `[NEEDS: docs/decisions/NN-apollo-and-tanstack-query.md]`
- The "feature flags via localStorage" exception mentioned in the anti-patterns table is not yet specified. When the first feature flag ships, this chapter gains a small section that names the wrapper file and the supported flag shapes.
- The behavior on impersonation start and end (clearing both Apollo and TanStack Query caches, resetting Zustand stores) is described in `11-auth-flows.md`. This chapter assumes that contract. If it changes, both chapters update together.
