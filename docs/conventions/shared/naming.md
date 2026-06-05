# Naming Conventions

Applies to both `apps/api` and `apps/web`. Consistent naming reduces the cognitive cost of reading unfamiliar code. Follow these rules without exception — don't be creative with names.

---

## Files

All files use `kebab-case` regardless of what they contain.

```
# Backend
jobs.module.ts
jobs.controller.ts
jobs.service.ts
jobs.dto.ts
jwt-auth.guard.ts
operator-scope.interceptor.ts
current-user.decorator.ts

# Frontend
worker-card.tsx
job-detail-drawer.tsx
use-jobs.ts
use-auth-store.ts
query-keys.ts
api-client.ts
```

The rule: the filename is the `kebab-case` version of the thing it exports.

---

## Folders

All folders use `kebab-case`.

```
apps/api/src/
  auth/
  jobs/
  workers/
  dashboard/
  revenue/
  job-types/    ← kebab for compound names
  common/
  prisma/
  ws/
  config/
```

Next.js route groups and dynamic segments follow Next.js conventions:

```
apps/web/src/app/
  (auth)/          ← route group, parentheses preserved
  (app)/           ← route group
    dashboard/
    jobs/
    workforce/
  worker/
    jobs/
      [id]/        ← dynamic segment, brackets preserved
```

---

## Variables and Functions

`camelCase` for all variables, function names, and object properties in TypeScript.

```ts
const activeWorkers = 9;
const clientChargePerHour = 72;

function calculatePlatformProfit(clientCharge: number, workerCosts: number): number {
  return clientCharge - workerCosts;
}

const revenueByType = await prisma.job.groupBy({ ... });
```

---

## Classes, Interfaces, and Types

`PascalCase` without exception.

```ts
class JobsService { ... }
class JwtAuthGuard { ... }

interface JobResponse { ... }
interface WorkerSummary { ... }

type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type CancelCode = 'CUSTOMER_CANCELLED' | 'EQUIPMENT_UNAVAILABLE' | ...;
```

---

## Constants

`SCREAMING_SNAKE_CASE` for true compile-time constants — values that never change, have semantic meaning as identifiers, and would be equivalent to a C `#define`:

```ts
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const WS_NAMESPACE = '/';
export const OPERATOR_ROOM_PREFIX = 'operator:';
```

`camelCase` for runtime configuration objects, even if they are `const`, because they are structured data not scalar identifiers:

```ts
export const jwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
} satisfies JwtConfig;
```

---

## React Components

`PascalCase` named exports. The filename is `kebab-case` and matches the component name.

```
worker-card.tsx   →   export function WorkerCard(...)
job-detail-drawer.tsx   →   export function JobDetailDrawer(...)
kpi-cards.tsx   →   export function KpiCards(...)
```

Never use default exports for components. Named exports make refactoring and grep easier.

```ts
// Good
export function WorkerCard({ worker, onSelect }: WorkerCardProps) { ... }

// Bad
export default function WorkerCard(...) { ... }
```

---

## NestJS File Suffixes

Every NestJS file ends with a descriptive suffix that indicates its role:

```
*.module.ts       — NestJS module class
*.controller.ts   — HTTP route handlers
*.service.ts      — Business logic
*.guard.ts        — Route guards (JwtAuthGuard, RolesGuard, CloudflareSecretGuard)
*.dto.ts          — Data transfer objects (class-validator decorated)
*.decorator.ts    — Custom parameter or method decorators
*.interceptor.ts  — NestJS interceptors (OperatorScopeInterceptor)
*.filter.ts       — Exception filters (HttpExceptionFilter)
*.strategy.ts     — Passport strategies (jwt.strategy.ts, jwt-refresh.strategy.ts)
*.gateway.ts      — Socket.io gateways (events.gateway.ts)
```

---

## Prisma Models and Fields

Model names: `PascalCase` singular. Never plural.

```prisma
model Job { ... }
model Worker { ... }
model JobType { ... }
model TeamMember { ... }
model JobStatusEvent { ... }
```

Field names: `camelCase`.

```prisma
model Job {
  id               String    @id @default(cuid())
  operatorId       String
  jobTypeId        String
  progressPct      Int       @default(0)
  clientRatePerHour Int
  cancelReasonCode  CancelCode?
  scheduledFor     DateTime
  createdAt        DateTime  @default(now())
}
```

Enum values in `schema.prisma`: `SCREAMING_SNAKE_CASE` to match how they will appear as constants in application code.

```prisma
enum JobStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## API Routes

`kebab-case`, plural nouns, no trailing slash.

```
GET  /api/v1/jobs
GET  /api/v1/jobs/:id
GET  /api/v1/job-types
GET  /api/v1/workers
GET  /api/v1/workers/:id/earnings
GET  /api/v1/dashboard/summary
GET  /api/v1/dashboard/activity
GET  /api/v1/revenue
GET  /api/v1/search
POST /api/v1/auth/login
POST /api/v1/demo/reset
```

Do not nest routes beyond one level. `/workers/:id/earnings` is fine. `/workers/:id/jobs/:jobId/status` is not — the inner resource has its own top-level route (`/jobs/:jobId/status`).

---

## Socket.io Event Names

Format: `entity.action` using dot notation, all lowercase. Use the most specific entity name.

```
job.status.changed      — job transitioned to a new status
job.progress.updated    — job progressPct updated without a status change
job.cancelled           — job was revoked (separate from status.changed for clarity)
worker.status.changed   — worker IDLE / ON_JOB / OFF_DUTY changed
```

---

## Zustand Stores

`use{Entity}Store` pattern. Located in `apps/web/src/stores/`.

```
useAuthStore        — JWT tokens, current user, role
useDemoStore        — demo actor switcher state, active actor
useJobsUiStore      — kanban filter state, selected job id for drawer
```

---

## TanStack Query Keys

Always array form. Keys defined as constants in `apps/web/src/lib/query-keys.ts`.

```ts
export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    list: (filters: JobFilters) => ['jobs', filters] as const,
    detail: (id: string) => ['jobs', id] as const,
  },
  workers: {
    all: ['workers'] as const,
    detail: (id: string) => ['workers', id] as const,
    earnings: (id: string) => ['workers', id, 'earnings'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
  revenue: ['revenue'] as const,
  search: (query: string, scopes: string[]) => ['search', query, scopes] as const,
} as const;
```

Never inline string arrays as query keys outside this file.

---

## Boolean Variables

Prefix with `is`, `has`, `can`, or `should`. The prefix signals that the value is boolean without needing to inspect the type.

```ts
const isLoading = query.isLoading;
const hasError = query.isError;
const canRevoke = role === 'MANAGER' || role === 'SUPER_ADMIN';
const shouldShowRevenue = role !== 'WORKER';
const isCompleted = job.status === 'COMPLETED';
const hasTeamMembers = team.members.length > 0;
```

---

## Event Handler Functions

Prefix with `handle` + the event or action name. Used in React component props and internal component methods.

```ts
function handleJobClick(jobId: string) { ... }
function handleStatusChange(newStatus: JobStatus) { ... }
function handleRevokeConfirm(code: CancelCode, note?: string) { ... }
function handleProgressStep(pct: ProgressPct) { ... }
function handleDemoActorSwitch(userId: string) { ... }
```

---

## CSS Custom Properties

Naming follows a `--{category}-{name}` or `--{category}-{name}-{modifier}` pattern.

```css
/* Colors */
--color-surface
--color-surface-raised
--color-text-primary
--color-text-muted
--color-accent
--color-status-scheduled
--color-status-in-progress
--color-status-completed
--color-status-cancelled

/* Shadows */
--shadow-sm
--shadow-md
--shadow-lg
--shadow-card

/* Border radius */
--radius-sm
--radius-md
--radius-lg
--radius-full

/* Spacing (if not using Tailwind scale directly) */
--space-1
--space-2
--space-4
```
