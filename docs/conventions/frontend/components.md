# Component Conventions

React component patterns for `apps/web/`. Covers Server vs Client Components, file structure, props, composition, shadcn/ui usage, and naming.

---

## Server vs Client Components

Next.js 15 App Router defaults every component to a Server Component. Only add `'use client'` when the component needs it.

### When to Keep as Server Component (no directive)

- `page.tsx` files — always Server Components
- `layout.tsx` files that render static shell chrome (sidebar, topbar wrapper)
- Components that only compose other components and pass props down without hooks or event handlers

### When to Add `'use client'`

Add the directive when the component uses any of:

- React hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`)
- TanStack Query hooks (`useQuery`, `useMutation`, `useQueryClient`)
- Zustand store hooks (`useAuthStore`, `useDemoStore`, `useTeamsStore`)
- Browser APIs (`window`, `document`, `navigator`, `localStorage`)
- Event handlers (`onClick`, `onChange`, `onSubmit`, `onKeyDown`)
- Third-party client libraries (Mapbox GL, Recharts, Socket.io client)

### Boundary Pattern

The `page.tsx` Server Component renders one or more Client Component boundaries. Each Client Component owns its data fetching via TanStack Query.

```tsx
// app/(app)/jobs/page.tsx — Server Component
import { KanbanBoard } from './_components/kanban-board';

export const metadata = { title: 'Jobs | CrewMate' };

export default function JobsPage() {
  return <KanbanBoard />;
}
```

```tsx
// app/(app)/jobs/_components/kanban-board.tsx — Client Component
'use client';

import { useJobs } from '../_hooks/use-jobs';
import { JobCard } from './job-card';

export function KanbanBoard() {
  const { data: jobs, isFetching } = useJobs();
  // ... render kanban columns
}
```

Never put `'use client'` on `page.tsx`. Never call hooks or attach event handlers in `page.tsx`.

---

## File Structure (in order)

Every component file follows this exact order:

```tsx
// 1. 'use client' directive (only if needed)
'use client';

// 2. Imports — grouped and ordered:
//    a. External packages (react, next, third-party)
//    b. Internal types
//    c. Internal components
//    d. Internal hooks
//    e. Internal utilities
import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader } from '@web/components/ui/sheet';
import type { JobResponse } from '@web/types/api';
import { StatusBadge } from '@web/components/status-badge';
import { useJobs } from '../_hooks/use-jobs';
import { cn } from '@web/lib/utils';

// 3. Types/interfaces for props
interface KanbanBoardProps {
  initialFilters?: JobFilters;
}

// 4. The component function (named export)
export function KanbanBoard({ initialFilters }: KanbanBoardProps) {
  // hooks first
  const { data: jobs, isFetching } = useJobs(initialFilters);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // derived values
  const scheduledJobs = jobs?.filter((j) => j.status === 'SCHEDULED') ?? [];

  // handlers
  const handleCardClick = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
  }, []);

  // render
  return (
    <div className="flex gap-4">
      {/* ... */}
    </div>
  );
}

// 5. Sub-components (only if <30 lines AND never used elsewhere)
function ColumnHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-[--color-text-primary]">{title}</h3>
      <span className="tabular-nums text-xs text-[--color-text-muted]">{count}</span>
    </div>
  );
}
```

---

## Props Rules

### Always Define a Props Interface

Every component that accepts props must have an explicit `interface` (or `type` for unions) defined above the component function. Never use inline object types in the function signature.

```tsx
// Good
interface WorkerCardProps {
  worker: WorkerSummary;
  onSelect: (id: string) => void;
  isCompact?: boolean;
}

export function WorkerCard({ worker, onSelect, isCompact = false }: WorkerCardProps) {
  // ...
}

// Bad — inline type
export function WorkerCard({ worker, onSelect }: { worker: WorkerSummary; onSelect: (id: string) => void }) {
  // ...
}
```

### No Unknown Props Spreading

Never spread unknown props onto DOM elements. This leaks arbitrary attributes into the DOM and causes React hydration warnings.

```tsx
// Bad
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}
export function Button({ label, ...props }: ButtonProps) {
  return <button {...props}>{label}</button>; // Unknown attrs leak to DOM
}

// Good — pick specific props
interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}
export function ActionButton({ label, onClick, disabled, className }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn('rounded-md px-4 py-2', className)}
    >
      {label}
    </button>
  );
}
```

The exception is shadcn/ui wrapper components that intentionally forward a known subset of props to the underlying Radix primitive. In those cases, use `React.ComponentPropsWithoutRef<typeof Primitive>` and document which props are forwarded.

### Boolean Prop Naming

Boolean props that represent component state must be prefixed with `is`, `has`, or `can`. The exceptions are HTML-standard attributes (`disabled`, `required`, `checked`, `hidden`).

```tsx
// Good
interface StatusBadgeProps {
  status: JobStatus;
  isAnimated?: boolean;
  hasTooltip?: boolean;
}

// Bad
interface StatusBadgeProps {
  status: JobStatus;
  animated?: boolean;  // ambiguous — is this a verb or adjective?
  tooltip?: boolean;   // confusing — is this the tooltip content or a flag?
}
```

---

## Composition Over Configuration

### Prefer Children and Slots Over Boolean Props

When a component starts accumulating boolean flags that toggle internal sections on or off, refactor to use `children` or named slot props.

```tsx
// Bad — growing boolean prop list
<Card
  showHeader
  showFooter
  showActions
  showAvatar
  isCompact
  hasBorder
/>

// Good — composition with children
<Card>
  <CardHeader>
    <Avatar src={worker.avatarUrl} />
    <CardTitle>{worker.name}</CardTitle>
  </CardHeader>
  <CardContent>{/* ... */}</CardContent>
  <CardFooter>
    <ActionButton label="View Details" onClick={handleClick} />
  </CardFooter>
</Card>
```

### Extract Variant Union Types

If a component has 4 or more boolean variant props, consolidate them into a single `variant` union type.

```tsx
// Bad — too many booleans
interface BadgeProps {
  isScheduled?: boolean;
  isInProgress?: boolean;
  isCompleted?: boolean;
  isCancelled?: boolean;
}

// Good — single variant prop
type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface StatusBadgeProps {
  status: JobStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'SCHEDULED' && 'bg-[--color-status-scheduled-bg] text-[--color-status-scheduled]',
        status === 'IN_PROGRESS' && 'bg-[--color-status-in-progress-bg] text-[--color-status-in-progress]',
        status === 'COMPLETED' && 'bg-[--color-status-completed-bg] text-[--color-status-completed]',
        status === 'CANCELLED' && 'bg-[--color-status-cancelled-bg] text-[--color-status-cancelled]',
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
```

---

## shadcn/ui Usage

### Never Modify `components/ui/`

Files inside `components/ui/` are generated by `npx shadcn add <component>` and will be overwritten on updates. Never hand-edit them.

To customize behavior or apply project-specific defaults, create a wrapper:

```tsx
// components/status-badge.tsx — project wrapper
'use client';

import { Badge } from '@web/components/ui/badge';
import { cn } from '@web/lib/utils';
import type { JobStatus } from '@web/types/api';

const statusStyles: Record<JobStatus, string> = {
  SCHEDULED: 'bg-[--color-status-scheduled-bg] text-[--color-status-scheduled] border-transparent',
  IN_PROGRESS: 'bg-[--color-status-in-progress-bg] text-[--color-status-in-progress] border-transparent',
  COMPLETED: 'bg-[--color-status-completed-bg] text-[--color-status-completed] border-transparent',
  CANCELLED: 'bg-[--color-status-cancelled-bg] text-[--color-status-cancelled] border-transparent',
};

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
```

### Use `cn()` for All Conditional Classes

`cn()` is exported from `lib/utils.ts`. It combines `clsx` (conditional class logic) with `tailwind-merge` (deduplication of conflicting Tailwind classes). Always use it for conditional or merged classes.

```tsx
// Good
<div className={cn(
  'rounded-xl border border-[--color-border] p-5',
  isActive && 'border-[--color-primary]',
  className,
)} />

// Bad — string template literal
<div className={`rounded-xl border p-5 ${isActive ? 'border-blue-500' : 'border-gray-200'}`} />

// Bad — array join
<div className={['rounded-xl', 'border', isActive && 'border-blue-500'].filter(Boolean).join(' ')} />
```

### shadcn Drawer/Sheet Pattern

The project uses shadcn's `Sheet` component for side drawers. Wrap it with project defaults:

```tsx
// components/job-detail-drawer.tsx
'use client';

import { Sheet, SheetContent } from '@web/components/ui/sheet';

interface JobDetailDrawerProps {
  jobId: string | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: JobDetailDrawerProps) {
  return (
    <Sheet open={jobId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[480px] p-0">
        {/* Drawer sections */}
      </SheetContent>
    </Sheet>
  );
}
```

---

## Naming and Exports

### Named Exports Only

Every component uses a named export. No default exports. This makes auto-import more reliable and refactoring easier because the exported name matches the file name.

```tsx
// Good
export function KpiCards() { /* ... */ }

// Bad
export default function KpiCards() { /* ... */ }
```

The only exception is `page.tsx` and `layout.tsx` files, which Next.js requires to have a default export.

```tsx
// page.tsx — required default export by Next.js
export default function DashboardPage() { /* ... */ }
```

### One Component Per File

Each file exports one component. The only exception is tiny sub-components under 30 lines that are used exclusively by the main component in that file and would not make sense as standalone files.

If a sub-component grows beyond 30 lines or is needed by a second component, extract it to its own file.

### File Naming

- Component files: `kebab-case.tsx` (e.g., `kpi-cards.tsx`, `job-card.tsx`, `worker-detail-drawer.tsx`)
- Hook files: `kebab-case.ts` starting with `use-` (e.g., `use-dashboard.ts`, `use-websocket.ts`)
- Utility files: `kebab-case.ts` (e.g., `api-client.ts`, `query-keys.ts`)
- Type files: `kebab-case.ts` (e.g., `api.ts`)
- Store files: `kebab-case.ts` ending with `-store` (e.g., `auth-store.ts`, `demo-store.ts`)

Component function names use `PascalCase` and match the file name converted from kebab-case:

| File | Export |
|---|---|
| `kpi-cards.tsx` | `export function KpiCards()` |
| `job-detail-drawer.tsx` | `export function JobDetailDrawer()` |
| `worker-picker-modal.tsx` | `export function WorkerPickerModal()` |

---

## Loading, Empty, and Error States

Every Client Component that fetches data must handle three states:

### Loading State

Use skeleton placeholders that match the shape of the final content. Use `isFetching` (not just `isLoading`) to show skeleton overlays on refetches.

```tsx
if (isLoading) {
  return <KpiCardsSkeleton />;
}
```

For refetch skeletons, overlay a translucent skeleton on top of stale data:

```tsx
<div className="relative">
  {isFetching && !isLoading && (
    <div className="absolute inset-0 z-10 bg-[--color-surface]/60">
      <KpiCardsSkeleton />
    </div>
  )}
  <KpiCardsContent data={data} />
</div>
```

### Empty State

When the query returns an empty array, show a clear message with one next action.

```tsx
if (data?.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-[--color-text-muted]">No jobs found for today.</p>
    </div>
  );
}
```

### Error State

Use `onError` in the TanStack Query hook to trigger a toast notification. Do not render inline error UI in the component unless the error is specific to that component's context (e.g., form validation).

```tsx
const { data } = useQuery({
  queryKey: queryKeys.jobs.all,
  queryFn: fetchJobs,
  meta: { errorMessage: 'Failed to load jobs' },
});
```

---

## Accessibility

### Keyboard Navigation

- All interactive elements must be reachable via `Tab`
- Modals and drawers must trap focus while open
- `Escape` closes the topmost overlay (modal > drawer > dropdown)
- Radio groups use arrow key navigation (native HTML behavior, do not override)

### ARIA Labels

- Icon-only buttons must have `aria-label` (e.g., `<button aria-label="Close drawer">`)
- Progress rings must have `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Status badges should have `aria-label` that includes the full status text

### Contrast

- All text must meet WCAG AA contrast ratios against its background
- The warm color tokens in `DESIGN-SYSTEM.md` have been verified against `--color-canvas` and `--color-surface-card`
- Never use `--color-text-muted` for critical information — it is for supplementary metadata only

### Interactive Hit Areas

Every clickable element must have a minimum 40x40px hit area. If the visible element is smaller (e.g., a 24px icon button), extend the hit area with padding or a pseudo-element.
