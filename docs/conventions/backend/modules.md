# NestJS Module Patterns

---

## Module Setup

Import `PrismaModule` globally in `AppModule`. Feature modules never need to import `PrismaModule` directly:

```ts
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,          // global: true is set inside PrismaModule
    AuthModule,
    JobsModule,
    WorkersModule,
    DashboardModule,
    RevenueModule,
    SearchModule,
    DemoModule,
    WsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },     // global auth
    { provide: APP_GUARD, useClass: RolesGuard },       // global RBAC
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

Do not use `forwardRef`. If two modules need each other, extract the shared dependency into `common/` or a third module. Circular references are a design smell.

---

## Controllers — Thin by Rule

A controller does exactly two things:
1. Declares the route shape (method, path, guards, decorators)
2. Calls the service and returns the result

No business logic. No Prisma queries. No if/else on domain state.

```ts
// Good
@Get(':id')
@Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.TEAM_LEAD)
async getJob(
  @Param('id', ParseCuidPipe) id: string,
  @CurrentUser() user: JwtPayload,
): Promise<ApiResponse<JobDetailResponse>> {
  const job = await this.jobsService.getJobById(id, user.operatorId);
  return { data: job };
}

// Bad — controller doing business logic
@Get(':id')
async getJob(@Param('id') id: string) {
  const job = await this.prisma.job.findUnique({ where: { id } });
  if (!job) throw new NotFoundException();
  if (job.status === 'CANCELLED') {
    // ... business logic here is wrong
  }
  return job;
}
```

Never call `PrismaClient` or `PrismaService` from a controller. That is the service's job.

---

## Services — All Logic Lives Here

One service per module. The service:
- Executes all database queries via the injected `PrismaService`
- Enforces business rules and valid state transitions
- Maps Prisma model results to plain response objects (interfaces, not Prisma types)
- Throws domain-appropriate errors — **never** NestJS HTTP exceptions

```ts
// Good — service throws a domain error, not an HTTP exception
async updateJobStatus(
  jobId: string,
  dto: UpdateJobStatusDto,
  operatorId: string,
  actorUserId: string,
): Promise<JobDetailResponse> {
  const job = await this.prisma.job.findFirst({
    where: { id: jobId, operatorId },
  });

  if (!job) {
    throw new JobNotFoundError(jobId);
  }

  if (!isValidTransition(job.status, dto.status)) {
    throw new InvalidStatusTransitionError(job.status, dto.status);
  }
  // ...
}

// Bad — service throws HTTP exception
if (!job) throw new NotFoundException(`Job ${jobId} not found`);
```

HTTP exceptions are mapped by the global `HttpExceptionFilter` from domain errors. Define domain errors in `common/errors/` if multiple modules need them, or inline in the service if only one module throws them.

Return plain TypeScript objects typed with response interfaces. Never return a Prisma model instance (`Prisma.JobGetPayload<...>`) directly from a service method — always map it to a defined interface.

---

## DTOs

Request DTOs use `class-validator` decorators. The global `ValidationPipe` with `whitelist: true` handles the rest.

```ts
// cancel-job.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelJobDto {
  @IsEnum(CancelCode)
  cancelReasonCode: CancelCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReasonNote?: string;
}
```

```ts
// update-job-progress.dto.ts
import { IsIn } from 'class-validator';

export class UpdateJobProgressDto {
  @IsIn([0, 25, 50, 75, 100])
  progressPct: number;
}
```

Response shapes are TypeScript interfaces only — no class, no decorators. They live in the service file or a co-located `*.types.ts` file within the module. They must match the interfaces in `apps/web/src/types/api.ts`.

---

## Guards

Three guards used in this project:

**`JwtAuthGuard`** — registered globally in `AppModule` via `APP_GUARD`. Applies to every route automatically. Mark public routes with `@Public()` (the decorator sets metadata that `JwtAuthGuard` checks before running):

```ts
// auth.controller.ts
@Public()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

**`RolesGuard`** — registered globally. Does nothing if no `@Roles()` decorator is present on the handler or controller. Apply `@Roles()` to restrict a route to specific roles:

```ts
@Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
@Delete(':id')
async revokeJob(...) { ... }
```

**`CloudflareSecretGuard`** — validates the `x-cloudflare-secret` header on all non-public, non-health routes. Applied globally to ensure that only traffic proxied through Cloudflare Workers (which injects the secret) can reach the Railway API directly. The secret value comes from `process.env.CLOUDFLARE_SHARED_SECRET`.

---

## `@CurrentUser()` Decorator

Extracts the JWT payload from `request.user` (populated by Passport after `JwtAuthGuard` runs):

```ts
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload;
  },
);
```

`JwtPayload` interface:

```ts
interface JwtPayload {
  sub: string;          // userId
  email: string;
  role: UserRole;
  operatorId: string;
}
```

---

## `OperatorScopeInterceptor`

Injects `operatorId` from the JWT payload into every outgoing service call so queries are always scoped. This is the defense-in-depth guard — the service also scopes its queries, but the interceptor ensures `operatorId` is always available in the request context.

In practice, services receive `operatorId` as a parameter (passed explicitly from the controller via `@CurrentUser()`). The interceptor is applied globally as a safeguard to log any request where `operatorId` would be missing.

```ts
// jobs.controller.ts
async getJobs(@CurrentUser() user: JwtPayload): Promise<...> {
  return this.jobsService.listJobs(user.operatorId, user.role, user.sub);
}
```

Never pass a hardcoded `operatorId` or query without one. Every Prisma query that touches a multi-tenant model (`Job`, `Worker`, `Team`, `Customer`) must include `where: { operatorId }`.

---

## Exception Filter

One global `HttpExceptionFilter` maps all exceptions to a consistent error envelope:

```ts
// http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json({
        error: {
          code: toErrorCode(status),
          message: typeof body === 'string' ? body : (body as any).message,
          details: typeof body === 'object' ? (body as any).details : undefined,
        },
      });
      return;
    }

    // Unhandled — log and return 500
    console.error(exception);
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  }
}
```

---

## Pagination

Cursor-based, not offset. Default limit: 20. Max limit: 100.

Query params: `?cursor=<opaque-string>&limit=<number>`

The cursor is the `createdAt` timestamp of the last item in the previous page, base64-encoded. The service decodes it and uses it in a `where: { createdAt: { lt: decodedCursor } }` clause with `orderBy: { createdAt: 'desc' }`.

```ts
// jobs.service.ts
async listJobs(
  operatorId: string,
  filters: JobFiltersDto,
  cursor?: string,
  limit = DEFAULT_PAGE_LIMIT,
): Promise<PaginatedResponse<JobSummary>> {
  const take = Math.min(limit, MAX_PAGE_LIMIT);
  const decodedCursor = cursor
    ? new Date(Buffer.from(cursor, 'base64').toString())
    : undefined;

  const jobs = await this.prisma.job.findMany({
    where: {
      operatorId,
      ...(filters.status && { status: filters.status }),
      ...(decodedCursor && { createdAt: { lt: decodedCursor } }),
    },
    orderBy: { createdAt: 'desc' },
    take: take + 1,   // fetch one extra to determine if there is a next page
    select: { ... },
  });

  const hasMore = jobs.length > take;
  const items = hasMore ? jobs.slice(0, take) : jobs;
  const nextCursor = hasMore
    ? Buffer.from(items.at(-1)!.createdAt.toISOString()).toString('base64')
    : undefined;

  return {
    data: items.map(toJobSummary),
    meta: { total: items.length, cursor: nextCursor },
  };
}
```

The `!` non-null assertion on `items.at(-1)` is acceptable here because we just confirmed `hasMore` is true, meaning `items` is non-empty.
