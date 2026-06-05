# TypeScript Conventions

Applies to both `apps/api` (NestJS 11) and `apps/web` (Next.js 15). The root `tsconfig.base.json` sets the baseline; each app extends it.

---

## Compiler Options — Non-Negotiable

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

`noUncheckedIndexedAccess` means `array[0]` is `T | undefined`, not `T`. Always guard array access or use `.find()` with a null check.

`exactOptionalPropertyTypes` means `{ foo?: string }` does not accept `{ foo: undefined }`. If a property can be explicitly set to `undefined`, type it as `foo: string | undefined`, not `foo?: string`.

---

## `interface` vs `type`

Use `interface` for:
- Object shapes that represent entities, API response bodies, DTO shapes, or component props
- Anything that might be extended

```ts
// Good — object shape
interface JobResponse {
  id: string;
  status: JobStatus;
  progressPct: number;
  customer: CustomerSummary;
}

// Good — component props
interface WorkerCardProps {
  worker: WorkerSummary;
  onSelect: (id: string) => void;
}
```

Use `type` for:
- Union types
- Intersection types
- Utility type aliases
- Function signatures that are not methods on an interface

```ts
// Good — union
type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Good — utility alias
type PartialJob = Partial<JobResponse>;

// Good — function type alias
type EventHandler<T> = (payload: T) => void;
```

Never use `interface` to describe a union or a function type standalone.

---

## No `any`

`any` disables the type checker and is banned. There are two correct alternatives:

**`unknown` + type narrowing** when you genuinely don't know the incoming type (e.g., parsing external JSON, exception catch blocks):

```ts
// Good
function parseMetadata(raw: unknown): JobMetadata {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'cancelReasonCode' in raw
  ) {
    return raw as JobMetadata;
  }
  throw new Error('Invalid metadata shape');
}

// Good — catch blocks always receive unknown in TypeScript 4+
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
}
```

**`satisfies` operator** when you have a value that should conform to a type but you want TypeScript to infer the narrowest type:

```ts
// Good — config object keeps literal types while being checked against the interface
const cancelReasonLabels = {
  CUSTOMER_CANCELLED: 'Customer requested cancellation',
  EQUIPMENT_UNAVAILABLE: 'Equipment not available',
  WORKER_NO_SHOW: 'Worker did not show up',
  ACCESS_DENIED: 'Could not access the property',
  DUPLICATE_JOB: 'Entered in error / duplicate',
  EMERGENCY_RECALL: 'Worker recalled for emergency',
} satisfies Record<CancelCode, string>;
```

---

## Enums

Do not use TypeScript `enum`. They compile to IIFEs and cause issues with tree-shaking and Prisma interop.

Use `const` string union types instead:

```ts
// Good
export type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkerStatus = 'IDLE' | 'ON_JOB' | 'OFF_DUTY';
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'WORKER';
export type CancelCode =
  | 'CUSTOMER_CANCELLED'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'WORKER_NO_SHOW'
  | 'ACCESS_DENIED'
  | 'DUPLICATE_JOB'
  | 'EMERGENCY_RECALL';
```

These live in `apps/web/src/types/api.ts` (frontend) and are mirrored by Prisma-generated types on the backend. The Prisma schema uses native PostgreSQL enums — TypeScript union types mirror their values exactly.

The one exception: if a string literal union needs to be iterated at runtime (e.g., to populate a dropdown), export a `const` array alongside the type:

```ts
export const CANCEL_CODES = [
  'CUSTOMER_CANCELLED',
  'EQUIPMENT_UNAVAILABLE',
  'WORKER_NO_SHOW',
  'ACCESS_DENIED',
  'DUPLICATE_JOB',
  'EMERGENCY_RECALL',
] as const;

export type CancelCode = (typeof CANCEL_CODES)[number];
```

---

## Return Types

Always explicit on exported functions and class methods. Infer on local callbacks and private helpers where the return type is obvious from a single expression.

```ts
// Good — explicit on exported service method
export async function getJobById(id: string): Promise<JobResponse> { ... }

// Good — explicit on NestJS controller handler
@Get(':id')
async getJob(@Param('id') id: string): Promise<ApiResponse<JobResponse>> { ... }

// Fine — infer on local callback
const jobIds = jobs.map((j) => j.id); // string[] inferred, no annotation needed
```

---

## Null Handling

Prefer optional chaining and nullish coalescing. Never use the non-null assertion operator (`!`) in production code.

```ts
// Good
const city = job.customer?.address?.city ?? 'Unknown';
const rate = jobType?.clientRatePerHour ?? 0;

// Banned in production code
const city = job.customer!.address!.city;
```

The non-null assertion (`!`) is allowed only in test files (`.spec.ts`) where you are setting up known-good fixtures. If you find yourself reaching for `!` in production code, it means a type is wrong — fix the type.

---

## Generics

Keep generics minimal. Only introduce a type parameter when the function genuinely needs to be polymorphic.

```ts
// Good — generic is necessary here
interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    cursor?: string;
  };
}

// Bad — unnecessary abstraction
function getFirst<T extends { id: string }>(items: T[]): T | undefined {
  return items[0];
}
// Just write: jobs[0] ?? null — or type the specific array
```

Do not add constraints like `T extends object` just to make the type parameter "safe". If the generic is only ever used with one concrete type, remove it and use that type directly.

---

## Path Aliases

Configured in each app's `tsconfig.json`:

```jsonc
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@api/*": ["./src/*"]
    }
  }
}

// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@web/*": ["./src/*"]
    }
  }
}
```

Usage:

```ts
// In apps/api/src — correct
import { PrismaService } from '@api/prisma/prisma.service';
import { JwtAuthGuard } from '@api/common/guards/jwt-auth.guard';

// In apps/web/src — correct
import type { JobResponse } from '@web/types/api';
import { useJobs } from '@web/hooks/use-jobs';
```

Never use relative paths that climb more than one directory (`../../..`). Use the alias instead.

---

## Shared Types Between Apps

The canonical shared type file is `apps/web/src/types/api.ts`. It contains TypeScript interfaces and union types that mirror the Prisma schema and API response shapes.

Frontend code imports types exclusively from this file — never from Prisma-generated types directly.

Backend code uses Prisma-generated types from `@prisma/client` and maps them to response shapes using TypeScript interfaces defined locally in each module's `*.types.ts` or inline in the service. The backend does not import from `apps/web/`.

The two must stay in sync manually. When the Prisma schema changes, update `apps/web/src/types/api.ts` in the same PR.
