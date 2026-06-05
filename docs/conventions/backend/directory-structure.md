# Backend Directory Structure

`apps/api/src/` organized by feature module. Each module is a self-contained folder. Cross-cutting concerns live in `common/`. Infrastructure lives in `prisma/`, `config/`, and `ws/`.

---

## Module Folder Rule

A feature module folder contains exactly these files at minimum:

```
{name}/
  {name}.module.ts
  {name}.controller.ts
  {name}.service.ts
```

Add sub-folders only when the module has **2 or more** of that artifact type:

- `dto/` — add when the module has 2+ DTO classes (e.g., `create-job.dto.ts` and `update-job-status.dto.ts`)
- `guards/` — add only if the module defines its own guards distinct from `common/`
- `decorators/` — add only if the module defines 2+ decorators that are not globally shared

When there is only one DTO, put it directly in the module folder as `{name}.dto.ts`. Don't create a `dto/` sub-folder for a single file.

---

## Full Expected Tree (when complete)

```
apps/api/src/
│
├── main.ts                           Entry point — global prefix /api/v1, pipes, filters, guards
├── app.module.ts                     Root module — imports all feature modules
│
├── config/
│   ├── config.module.ts              ConfigModule.forRoot with Zod validation
│   └── env.schema.ts                 Zod schema for all required env vars
│
├── prisma/
│   ├── prisma.module.ts              Global module — exports PrismaService
│   └── prisma.service.ts             Singleton PrismaClient, onModuleInit / onModuleDestroy
│
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts         Extends AuthGuard('jwt') — applied globally in app.module
│   │   ├── roles.guard.ts            Checks @Roles() metadata against JWT payload role
│   │   └── cloudflare-secret.guard.ts  Validates x-cloudflare-secret header
│   ├── decorators/
│   │   ├── roles.decorator.ts        @Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
│   │   ├── current-user.decorator.ts @CurrentUser() extracts JwtPayload from request
│   │   └── public.decorator.ts       @Public() skips JwtAuthGuard on a route
│   ├── interceptors/
│   │   └── operator-scope.interceptor.ts  Injects operatorId from JWT into every service call
│   ├── filters/
│   │   └── http-exception.filter.ts  Global filter — maps all exceptions to error envelope
│   └── pipes/
│       └── parse-cuid.pipe.ts        Validates :id params are valid CUID format
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts            POST /auth/login, POST /auth/refresh
│   ├── auth.service.ts               validateUser, login, refreshTokens
│   ├── auth.dto.ts                   LoginDto, RefreshDto
│   ├── jwt.strategy.ts               Passport JWT access token strategy
│   └── jwt-refresh.strategy.ts       Passport JWT refresh token strategy
│
├── jobs/
│   ├── jobs.module.ts
│   ├── jobs.controller.ts            GET /jobs, GET /jobs/:id, POST /jobs, PATCH /jobs/:id/status,
│   │                                 PATCH /jobs/:id/progress, PATCH /jobs/:id/cancel
│   ├── jobs.service.ts               All job business logic and revenue calculation helpers
│   └── dto/
│       ├── create-job.dto.ts         templateId, assigneeId, scheduledFor
│       ├── update-job-status.dto.ts  status (validated transition)
│       ├── update-job-progress.dto.ts  progressPct (0 | 25 | 50 | 75 | 100)
│       └── cancel-job.dto.ts         cancelReasonCode, cancelReasonNote?
│
├── workers/
│   ├── workers.module.ts
│   ├── workers.controller.ts         GET /workers, GET /workers/:id, GET /workers/:id/earnings
│   ├── workers.service.ts            Worker list, detail, earnings aggregation
│   └── workers.dto.ts                WorkerFiltersDto (query params)
│
├── dashboard/
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts       GET /dashboard/summary, GET /dashboard/activity
│   └── dashboard.service.ts          KPI aggregation, activity feed query
│
├── revenue/
│   ├── revenue.module.ts
│   ├── revenue.controller.ts         GET /revenue
│   └── revenue.service.ts            Summary, 7-day trend, per-type breakdown
│
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts          GET /search?q=&scope[]=
│   └── search.service.ts             Full-text across jobs, workers, customers (RBAC scoped)
│
├── demo/
│   ├── demo.module.ts
│   ├── demo.controller.ts            POST /demo/reset
│   └── demo.service.ts               Wipes job state, re-seeds from templates
│
└── ws/
    ├── ws.module.ts
    └── events.gateway.ts             Socket.io gateway — operator:{id} rooms, 4 emitted events
```

---

## Key Layout Rules

**`src/prisma/`** — One file only: `PrismaService`. No queries, no business logic. Declared as a global module so every feature module can inject it without importing `PrismaModule` explicitly.

**`src/common/`** — Only artifacts that are used by **two or more** feature modules. If something is only used in `jobs/`, it stays in `jobs/`. Move it to `common/` when a second module needs it.

**`src/ws/`** — Only the gateway. The gateway is a class injected into services — services call `this.eventsGateway.emit(...)`. No business logic in the gateway.

**`src/config/`** — Env var parsing and validation using Zod. The Zod schema in `env.schema.ts` is the single source of truth for all required environment variables. The app will fail at startup if any required var is missing.

**`src/auth/`** — Passport strategies live here, not in `common/`. Guards that enforce auth (`JwtAuthGuard`) live in `common/` because every other module applies them.

---

## `main.ts` Bootstrap Configuration

```ts
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalFilters(new HttpExceptionFilter());
```

`whitelist: true` strips properties from the request body that are not declared in the DTO. `transform: true` coerces query params to their declared types (e.g., `?limit=20` becomes `number`).
