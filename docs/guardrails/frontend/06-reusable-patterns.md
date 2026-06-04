# 06 — Reusable patterns

The catalog of reusable hooks, helpers, and composition patterns that the web app actually uses. The list looks short. That is intentional. Every entry has earned its place by appearing in at least three real callsites. The first two duplications stayed inline. The third one moved here. Read `shared/05-quality-bar.md` before adding a row to either catalog below.

This chapter is the frontend counterpart to `01-components.md`. The components catalog says what gets rendered. This chapter says what gets reused around the rendering. Hooks for state, helpers for formatting, patterns for composition, and the folder layout that keeps them findable.

Read the chapters that govern the underlying machinery before adding to the catalog.

- `04-state-management.md` for why Zustand is for ephemeral UI only.
- `05-data-fetching.md` for the Apollo + TanStack Query split and the hook envelope shape.
- `shared/05-quality-bar.md` for the three-callsite rule that gates every promotion to this file.

## The promotion rule

A hook or helper does not live in `apps/web/src/hooks/` or `apps/web/src/lib/` until it has three real callers. Until then, the code lives where it is used. The rule mirrors `shared/05-quality-bar.md` and is non-negotiable.

| Count | Where the code lives |
|---|---|
| 1 | Inside the file that needs it. No export. |
| 2 | Still inline. Copy and adapt is fine. Resist the abstraction. |
| 3 | Promote. Move to `hooks/` or `lib/`. Write a unit test. Add a row to this chapter. |
| 4+ | If it has not been promoted by now, you have accumulated debt. Promote before the next feature lands on top of it. |

A `mode` flag added to a helper to serve two callers is the failure pattern. If the two callsites diverge inside the function, they are not the same helper. Split them back.

## Hook catalog

Every hook is exported from `apps/web/src/hooks/<name>.ts` and has a unit test at `apps/web/src/hooks/<name>.spec.ts`. The signature column is the public contract. The callers column is the third-callsite trigger that earned the promotion. Adding a fourth caller does not require a doc change. Adding a fifth still does not. Adding a new hook to this catalog does.

| Hook | File | Signature | Real callers |
|---|---|---|---|
| `useCurrentUser` | `hooks/useCurrentUser.ts` | `() => { user, role, scopes, isLoading }` | Topbar avatar menu, RBAC route guard, RolePill rendering on the member table |
| `useTenant` | `hooks/useTenant.ts` | `() => { operatorId, slug }` | Apollo header link, dispatch board subscription scope, audit log filter default |
| `useDebouncedValue` | `hooks/useDebouncedValue.ts` | `<T>(value: T, delay: number) => T` | Cmd+K search input, members table filter, properties search field |
| `useHotkey` | `hooks/useHotkey.ts` | `(combo: string, handler: KeyHandler, opts?: HotkeyOpts) => void` | Cmd+K palette toggle, Escape closes the focused drawer, J/K row navigation on the dispatch board |
| `useOnlineStatus` | `hooks/useOnlineStatus.ts` | `() => { online: boolean; since: Date }` | Topbar offline band, worker mobile queue replay trigger, dispatch board polling pause |
| `useReducedMotion` | `hooks/useReducedMotion.ts` | `() => boolean` | Skeleton shimmer, dispatch board card pulse, KPI delta arrow flash |
| `useCopyToClipboard` | `hooks/useCopyToClipboard.ts` | `() => { copy(text: string): Promise<void>; copied: boolean }` | Webhook signing secret reveal, JSON viewer "copy payload" button, member invitation link reveal |
| `useSearchParam` | `hooks/useSearchParam.ts` | `<T extends string>(name: string) => [T \| null, (next: T \| null) => void]` | Drawer entity id on detail pages, dashboard date preset, schedule view week anchor |
| `useSearchParams` | `hooks/useSearchParams.ts` | `<T extends ZodSchema>(schema: T) => [z.infer<T>, (next: Partial<z.infer<T>>) => void]` | Members table filters, dispatch board filters, audit log filters |
| `useToast` | `hooks/useToast.ts` | `() => { toast(message, opts?): void; dismiss(id?): void }` | Pretty much every mutation hook, the offline band recovery, the undo-archive flow |
| `useConfirm` | `hooks/useConfirm.ts` | `(opts: ConfirmOptions) => Promise<boolean>` | Delete operator from settings, revoke webhook endpoint, remove member from team |

### useCurrentUser and useTenant

```tsx
export function useCurrentUser() {
  const ctx = useAuthContext();
  return { user: ctx.user, role: ctx.role, scopes: ctx.scopes, isLoading: ctx.status === "pending" };
}

export function useTenant() {
  const { user } = useCurrentUser();
  if (!user) throw new Error("useTenant called before auth resolved");
  return { operatorId: user.operatorId, slug: user.operatorSlug };
}
```

`useCurrentUser` wraps the auth context so route components do not import the context directly. The context shape is allowed to change without churning every callsite.

`useTenant` throws when called pre-auth. Auth pages themselves are the only surface that mounts before the gate; they must not import this hook. The throw is intentional. A silent `undefined` would scope a query to the wrong tenant.

### useDebouncedValue

```tsx
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

Does not debounce the keystroke. Debounces the value that downstream queries read. Components stay responsive; only the network call waits.

### useHotkey

```tsx
// apps/web/src/hooks/useHotkey.ts
type HotkeyOpts = { enabled?: boolean; allowInInputs?: boolean };

export function useHotkey(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  opts: HotkeyOpts = {},
): void;
```

Focus-context aware by default. A `cmd+k` binding fires from anywhere. A `j` binding does not fire when the focused element is an input or a contenteditable, unless `allowInInputs: true`. The combo grammar is `mod+key` where `mod` is one of `cmd`, `shift`, `alt`, `ctrl`, joined with `+`. The hook handles the macOS to Windows translation so callers write `cmd+k` and the binding resolves to `meta+k` on macOS and `ctrl+k` on Windows.

### useOnlineStatus, useReducedMotion, useCopyToClipboard

```tsx
export function useOnlineStatus(): { online: boolean; since: Date };
export function useReducedMotion(): boolean;
export function useCopyToClipboard(): { copy: (text: string) => Promise<void>; copied: boolean };
```

`useOnlineStatus` is a reactive `navigator.onLine` with a `since` timestamp that resets when the value flips. The offline band reads `online`; the reconnect toast reads `since` to compute "Back online after 2m". `since` also triggers the worker mobile queue to replay queued writes.

`useReducedMotion` re-exports Motion's hook so non-Motion consumers (the skeleton shimmer CSS class toggle, the KPI delta arrow flash) read from one entry point.

`useCopyToClipboard` sets `copied` to `true` for 1500ms after a successful write. The hook intentionally does not surface errors. The clipboard API rejects in unfocused windows and on permission denial. In both cases the caller falls back to manual selection, not an error toast.

### useSearchParam

```tsx
export function useSearchParam<T extends string = string>(
  name: string,
): [T | null, (next: T | null) => void];
```

A single URL search param, read and written. The setter replaces the URL via `router.replace` so the back button does not stack one entry per keystroke. Passing `null` removes the param from the URL.

### useSearchParams

```tsx
// apps/web/src/hooks/useSearchParams.ts
import { z } from "zod";

export function useSearchParams<T extends z.ZodTypeAny>(
  schema: T,
): [z.infer<T>, (next: Partial<z.infer<T>>) => void];
```

The multi-param variant. Schema-driven, so the parsed object is typed and validated. Unknown params are dropped. Missing params get their schema default. The setter merges; passing `undefined` for a key clears it.

```tsx
const filterSchema = z.object({
  status: z.enum(["all", "scheduled", "in_progress"]).default("all"),
  property: z.string().optional(),
  q: z.string().optional(),
});

const [filters, setFilters] = useSearchParams(filterSchema);
setFilters({ status: "scheduled" }); // property and q preserved
```

### useToast

```tsx
export function useToast() {
  return {
    toast: (msg: string, opts?: ToastOpts) => sonner(msg, applyVariant(opts)),
    dismiss: (id?: string | number) => sonner.dismiss(id),
  };
}
```

Re-export of sonner with the project's variants pre-applied. The `applyVariant` step maps the five variants from `01-components.md` onto sonner's options, sets the per-variant duration, and applies the icon. Callers never reach for sonner directly so the variant rules cannot be bypassed.

### useConfirm

```tsx
// apps/web/src/hooks/useConfirm.ts
type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "primary";
  typeToConfirm?: string;
};

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean>;
```

Opens the `ConfirmDialog` from `01-components.md` and returns a promise that resolves `true` when the user confirms and `false` on cancel or escape. Pairs naturally with mutations.

```tsx
const confirm = useConfirm();
const { mutate } = useDeleteOperator();

async function handleDelete() {
  const ok = await confirm({
    title: "Delete operator Acme Hospitality?",
    description: "412 jobs and 28 workers will be archived.",
    confirmLabel: "Delete operator",
    confirmVariant: "danger",
    typeToConfirm: "Acme Hospitality",
  });
  if (ok) mutate();
}
```

## Helper catalog

Helpers are pure functions where possible and live in `apps/web/src/lib/<name>.ts` (or `packages/ui/src/lib/<name>.ts` when shared with the UI package). Same promotion rule applies. Three callsites is the trigger.

| Helper | File | Signature | Real callers |
|---|---|---|---|
| `cn` | `packages/ui/src/lib/cn.ts` | `(...inputs: ClassValue[]) => string` | Every component in the catalog |
| `formatRelativeTime` | `lib/time/formatRelativeTime.ts` | `(date: Date, now?: Date) => string` | Dispatch JobCard timestamp, audit log row, webhook delivery row |
| `formatTimeRange` | `lib/time/formatTimeRange.ts` | `(start: Date, end: Date, tz: string) => string` | Dispatch JobCard, schedule grid block, job detail drawer header |
| `initials` | `lib/format/initials.ts` | `(name: string) => string` | Avatar, member table cell, assigned-worker chip |
| `avatarColor` | `lib/format/avatarColor.ts` | `(id: string) => AvatarHue` | Avatar, member chip, worker assignment dropdown |
| `groupBy` | `lib/collections/groupBy.ts` | `<T, K extends PropertyKey>(items: T[], keyFn: (item: T) => K) => Record<K, T[]>` | Dispatch board column grouping, audit log day grouping, schedule view by-worker grouping |
| `chunk` | `lib/collections/chunk.ts` | `<T>(items: T[], size: number) => T[][]` | Table pagination math, KPI card multi-row arrangement, webhook payload pagination |
| `getPolicyDeniedReason` | `lib/errors/getPolicyDeniedReason.ts` | `(error: unknown) => string \| null` | Mutation toasts, drawer error banner, role grant dialog |

### cn

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

The Tailwind class merger. Lives in `packages/ui/` rather than `apps/web/` because the future shared library needs it too.

### formatRelativeTime and formatTimeRange

```ts
export function formatRelativeTime(date: Date, now?: Date): string;
export function formatTimeRange(start: Date, end: Date, tz: string): string;
```

`formatRelativeTime` returns "in 12m", "5m ago", "yesterday at 4:12 PM", or the absolute date when the delta exceeds 7 days. Voice rules from `00-design-system.md` are baked in. Never returns ISO timestamps. The optional `now` exists for tests.

`formatTimeRange` returns "10:30 to 11:15" when start and end fall on the same day, "Mon 10:30 to Wed 11:15" when they span days. The `tz` is the operator's timezone, read from `useTenant`. Always the tenant timezone, never the browser timezone.

### initials and avatarColor

```ts
const HUES = ["plum", "teal", "clay", "sage", "slate", "wine"] as const;
export type AvatarHue = (typeof HUES)[number];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function avatarColor(id: string): AvatarHue {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return HUES[Math.abs(h) % HUES.length]!;
}
```

`initials` returns first and last initials, uppercased, always one or two characters. `avatarColor` is stable across reloads. Same id always gets the same hue. Palette is the six colors defined in `00-design-system.md` under Avatars.

### groupBy and chunk

```ts
export function groupBy<T, K extends PropertyKey>(items: T[], keyFn: (item: T) => K): Record<K, T[]>;
export function chunk<T>(items: T[], size: number): T[][];
```

A small replacement for lodash. We do not depend on lodash for size reasons. These two are the only collection helpers that earned a row. `chunk` is never used as a substitute for a virtualized list; for that, see `05-data-fetching.md`.

### getPolicyDeniedReason

```ts
export function getPolicyDeniedReason(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { reason?: string; statusCode?: number };
  if (e.statusCode === 403 && typeof e.reason === "string") return e.reason;
  return null;
}
```

The API returns 403 responses with a `reason` field that names the policy that denied the call (`policy:cannot_transition_to_completed`, `policy:scope_missing_property`). `null` is the signal to fall back to a generic "You don't have access" message. A string is the signal to surface the specific reason in the banner or toast.

## Composition patterns

Four patterns. Two are encouraged, two are documented anti-patterns. The set does not grow without a guardrail change.

### Compound components

The shadcn pattern. A parent owns state and renders structural children that receive props via context.

```tsx
<Card>
  <Card.Header>
    <Card.Title>Top properties</Card.Title>
    <Card.Subtitle>Last 30 days</Card.Subtitle>
  </Card.Header>
  <Card.Body>...</Card.Body>
</Card>
```

Use when the parent owns shared state, the children need flexible ordering, and the children's count is variable. `Card`, `Dialog`, `Drawer`, `Table`, and the upcoming `Stepper` all use this pattern.

Do not use it when the parent does not actually own state. A pair of `<List>` and `<List.Item>` where the parent is just a div is a fake compound. Use a `<ul>` and `<li>` and stop.

### Slot pattern via Radix asChild

When a wrapper needs to forward props onto its child without rendering an extra DOM node. The motivating case is forwarding `Button` styling onto a Next `Link`.

```tsx
import Link from "next/link";

<Button asChild variant="primary">
  <Link href="/dispatch/new">New job</Link>
</Button>
```

The `Button` does not render a `<button>` underneath the `Link`. Radix's `Slot` clones the `Link` and merges the styling props onto it. The DOM is a single `<a>` element. Accessibility stays right, the link is keyboard-operable, the styling is the same as a normal button.

Use `asChild` when the wrapper needs to push behavior onto a polymorphic child. Do not use it as a clever way to nest two components when a plain `className` would do.

### Render props

Almost never used. The hook pattern replaces it.

```tsx
// Anti-pattern. Do not write this.
<DataFetcher url="/jobs">
  {({ data, isPending }) => (
    isPending ? <Skeleton /> : <JobList jobs={data} />
  )}
</DataFetcher>

// Use this instead.
function JobsPage() {
  const { data, isPending } = useJobsQuery();
  if (isPending) return <Skeleton />;
  return <JobList jobs={data} />;
}
```

Render props were a pre-hooks workaround for sharing stateful logic. Hooks do the same job without the JSX gymnastics. If a code review finds a render-prop pattern in this codebase, the reviewer asks for the hook version. Documented as an anti-pattern here so the answer to "why not" lives in one place.

### Higher-order components

Avoided. If you find yourself reaching for `withAuth(Page)` or `withTenant(Component)`, a hook is the right answer. The hook is `useCurrentUser` or `useTenant`. The HOC adds an indirection that hides the dependency from the call signature, which the future-agent test from `shared/05-quality-bar.md` fails.

There is one exception. Next's `getServerSideProps`-equivalent route wrappers are not HOCs in this sense; they are framework conventions. The rule applies to user-land wrappers that the codebase invents.

## The data hook pattern

Every data hook in the app returns the same envelope shape. The wrapping client (Apollo or TanStack Query) is hidden inside the hook; the caller does not import either library directly.

```ts
type DataEnvelope<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};
```

Apollo's `useQuery` returns `{ data, loading, error, refetch }`. TanStack Query returns `{ data, isPending, isError, error, refetch }`. The wrapper hook normalizes both into the same envelope so consumers do not care which client backs the read.

```ts
// apps/web/src/features/jobs/hooks/useJob.ts
export function useJob(id: string): DataEnvelope<JobDto> {
  const result = useQuery(JOB_QUERY, { variables: { id } });
  return {
    data: result.data?.job,
    isPending: result.loading,
    isError: !!result.error,
    error: result.error ?? null,
    refetch: () => { result.refetch(); },
  };
}
```

The benefit is the `<DataState>` helper. It takes the envelope, picks the right feedback state from `08-feedback-states.md`, and renders the children only when `data` is defined.

```tsx
<DataState query={useJob(jobId)} skeleton={<DrawerSkeleton />}>
  {(job) => <JobDrawerBody job={job} />}
</DataState>
```

`DataState` is a real component in `packages/ui/`. It handles the pending, error, and empty branches uniformly. Without the envelope normalization, this component would need a discriminator or two versions.

## The mutation hook pattern

Every mutation hook exports the same shape.

```ts
type MutationEnvelope<TInput, TOutput> = {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  isPending: boolean;
  error: Error | null;
};
```

`mutate` is fire-and-forget. `mutateAsync` returns a promise for callers that need to wait. `isPending` drives the button loading state. `error` drives the form-level banner or toast.

On success, the hook invalidates the relevant cache keys. The invalidation contract is part of the hook, not the caller. A component never calls `queryClient.invalidateQueries` directly; that is the mutation hook's job.

```ts
// apps/web/src/features/team/hooks/useInviteMember.ts
export function useInviteMember(): MutationEnvelope<InviteInput, MemberDto> {
  const apollo = useApolloClient();
  const result = useMutation(INVITE_MUTATION, {
    onCompleted: () => {
      apollo.refetchQueries({ include: ["MembersList"] });
    },
  });
  return {
    mutate: (input) => { void result[0]({ variables: { input } }); },
    mutateAsync: async (input) => (await result[0]({ variables: { input } })).data!.invite,
    isPending: result[1].loading,
    error: result[1].error ?? null,
  };
}
```

Implementation details for both clients are in `05-data-fetching.md`. The contract is here. Cross-link liberally; the two chapters are read together.

## The error boundary pattern

Two layers, both required.

| Layer | Where | Catches |
|---|---|---|
| Route-level | `app/<route>/error.tsx` (Next App Router) | Anything that escapes the page render or any descendant that did not have its own boundary |
| Entity-level | Inside the `Drawer` wrapper and the `Dialog` wrapper | Anything that escapes the drawer or dialog body, so the rest of the page stays usable |

Both boundaries render an `ErrorState` from `08-feedback-states.md`. The route-level uses the full-page error layout. The entity-level uses the drawer-error or dialog-error layout depending on which it wraps.

```tsx
// apps/web/src/app/dispatch/error.tsx
"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function DispatchError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      icon="AlertOctagon"
      title="Something broke loading the board."
      description="We've been notified. Try again."
      action={{ label: "Retry", onClick: reset }}
    />
  );
}
```

The drawer wrapper has its own boundary built in. Anything thrown from the drawer body renders inside the drawer, not the route.

The boundaries do not log to the console. They forward to Sentry via the `lib/observability/reportError.ts` adapter. The console is reserved for the dev server; in production, errors go to Sentry and never to `console.error`.

## Folder layout

Where reusable code lives. The layout below is the only allowed shape; PRs that introduce a new top-level folder under `apps/web/src/` are rejected.

| Path | What lives here |
|---|---|
| `apps/web/src/hooks/` | Domain-agnostic hooks. The catalog above. |
| `apps/web/src/lib/` | Domain-agnostic helpers and adapters. `apollo/`, `query/`, `motion/`, `auth/`, `time/`, `format/`, `collections/`, `errors/`, `observability/`. |
| `apps/web/src/stores/` | Zustand stores. Ephemeral UI only. See `04-state-management.md`. |
| `apps/web/src/components/<domain>/` | Domain-specific components used by more than one route. `team/`, `jobs/`, `webhooks/`. |
| `apps/web/src/components/ui/` | Vendored shadcn primitives. Edited only to adjust styling to match `00-design-system.md`. |
| `apps/web/src/app/<route>/_components/` | Components scoped to one route. The leading underscore signals "do not import from outside this route". |
| `apps/web/src/app/<route>/_hooks/` | Hooks scoped to one route. Same import rule. |
| `packages/ui/src/` | Components and helpers shared with future projects. `cn`, `Avatar`, `Button`, `DataState`. |

The `_components/` and `_hooks/` prefix is enforced by an ESLint rule. Anything under a leading-underscore folder is import-banned from outside that folder's parent route. The boundary stops random cross-route imports from settling into the codebase.

## When to promote from feature-local to lib

The lifecycle of a piece of reusable code.

1. **First usage.** Lives in `apps/web/src/app/<route>/_components/` or `_hooks/`. Not exported.
2. **Second usage.** Still feature-local. Copy and adapt is fine. The two copies may diverge. Resist the urge to abstract; the rule from `shared/05-quality-bar.md` says two is coincidence.
3. **Third usage.** Stop. Read both prior callsites. Decide whether the underlying domain is the same. If yes, promote to `apps/web/src/hooks/` or `apps/web/src/lib/`. If no, write a third inline copy.

Promotion checklist. Every item is required.

- [ ] Three real callsites today, not "I'll need this later".
- [ ] Single named responsibility. If the name needs `And`, split it.
- [ ] Unit test next to the implementation.
- [ ] One-paragraph doc comment that explains the contract, not the implementation.
- [ ] Row added to this chapter under the appropriate catalog.
- [ ] The original three callsites updated to import from the new home in the same PR.

The last item is non-negotiable. A promotion PR that adds the helper but leaves the callsites inline has done half the work and locked in the duplication. The promotion is only complete when the duplicates are gone.

## What gets duplicated on purpose

Three categories where the duplication is the right answer. Resist the abstraction reflex.

### Status pill mapping per surface

Each surface owns its own `statusToPillVariant` mapping because the visual semantics differ even when the underlying status names overlap. A `pending` job is not visually the same as a `pending` webhook delivery is not the same as a `pending` invitation. A shared mapping would force one of them to lie.

```ts
// apps/web/src/app/dispatch/_lib/jobStatusPill.ts
export function jobStatusPillVariant(status: JobStatus): PillVariant {
  switch (status) {
    case "scheduled": return "neutral";
    case "in_progress": return "progress";
    case "completed": return "success";
    case "failed": return "danger";
    case "cancelled": return "neutral";
  }
}

// apps/web/src/app/webhooks/_lib/deliveryStatusPill.ts
export function deliveryStatusPillVariant(status: DeliveryStatus): PillVariant {
  switch (status) {
    case "pending": return "info";
    case "delivered": return "success";
    case "retrying": return "progress";
    case "failed": return "danger";
  }
}
```

Same shape, different rules. Each rule lives next to the surface that uses it.

### Empty state copy

Each surface writes its own empty state copy. The full list is in `08-feedback-states.md` under "Empty states per surface". A shared `emptyState({ entity, action })` helper would generate generic phrases like "No jobs found" instead of the documented "Nothing scheduled. Add a job to start the day." Voice is per-surface.

### Form schemas

A zod schema per form, living next to the form. The shared pieces can be composed via `.extend()`, but the per-form schema is the canonical definition.

```ts
// apps/web/src/app/settings/team/_components/InviteForm.tsx
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["coordinator", "worker"]),
  propertyIds: z.array(z.string().cuid()).optional(),
});
```

The temptation is to extract `inviteSchema` to a `schemas/` folder so it can be reused by the API contract. Resist. The API contract has its own schema next to its DTO. Sharing the schema across the network boundary couples the client to the server's exact validation, which becomes a problem the first time the API wants to add a server-only field (a captcha token, a referrer id) without churning the client.

If the client and server schemas ever need to agree on more than the field names, that agreement lives in `packages/contracts/` as a typed payload, not as a shared zod schema.

## Cross-references

Patterns from this chapter that are implemented or constrained elsewhere.

| Pattern | Reference |
|---|---|
| Zustand store rules | `04-state-management.md` |
| Apollo + TanStack Query split | `05-data-fetching.md` |
| Data hook envelope and `DataState` | `05-data-fetching.md` |
| Mutation hook invalidation contract | `05-data-fetching.md` |
| Status pill semantics | `01-components.md` and the surface chapter |
| Empty state copy per surface | `08-feedback-states.md` |
| Error state choreography | `08-feedback-states.md` |
| Motion tokens used by `useReducedMotion` | `00-design-system.md` |
| Auth context behind `useCurrentUser` | `11-auth-flows.md` |
| Tenant scoping rules behind `useTenant` | `shared/04-rbac.md` |
| Three-callsite promotion rule | `shared/05-quality-bar.md` |
| Comment style on helper docstrings | `shared/01-conventions.md` |

## Checklist for "done"

A reusable pattern is shipped when all of these are true.

- [ ] Three real callsites exist today.
- [ ] The hook or helper lives in the folder that matches its scope.
- [ ] A unit test sits next to the implementation.
- [ ] A row is added to the catalog table in this chapter.
- [ ] The original callsites import from the new home in the same PR.
- [ ] Data hooks return the documented envelope.
- [ ] Mutation hooks return the documented envelope and invalidate the right keys.
- [ ] No new HOC. No new render-prop component.
- [ ] No `mode` flag added to an existing helper to serve a new caller.
- [ ] Folder layout is unchanged or the change is documented in this chapter.

## Gaps

- The `<DataState>` component referenced under "The data hook pattern" is not yet vendored in `packages/ui/`. `[NEEDS: DataState implementation and Storybook entry]`
- `useHotkey` does not yet have a documented behavior for chord sequences (`g d` for go-to-dispatch). The current intent is to add chord support when the third chord-needing surface lands. `[NEEDS: chord behavior spec]`
- `useSearchParams` (the schema variant) does not yet specify the encoding for array values. The placeholder is repeated keys (`?status=a&status=b`). Comma-joining is also on the table.
- The promotion checklist requires updating the original callsites in the same PR. This is enforced by review, not by tooling. `[NEEDS: lint rule that flags duplicate exports]`
- The error boundary forwarding to Sentry references `lib/observability/reportError.ts`, which is currently a stub that calls `console.error` in dev. Production wiring lands with the observability task.
- `getPolicyDeniedReason` reads the API's 403 `reason` field. The exact field name is owned by `shared/04-rbac.md`. If that contract changes, this helper changes with it.
- No documented pattern yet for "this hook needs to be SSR-safe but `navigator` is not defined on the server". Current convention is to read `typeof navigator === "undefined"` inside the hook and return a sensible default. `[NEEDS: SSR-safety pattern]`
