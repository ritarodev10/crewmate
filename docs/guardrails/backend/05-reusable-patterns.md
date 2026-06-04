# Reusable Patterns

The catalog of shared building blocks the API leans on. Every entry here exists because at least three features were already doing the same thing by hand, and the duplication was making changes harder. Read `../shared/05-quality-bar.md` first. The rule of three lives there, and it governs everything below.

This is not a menu. It is a closed set. New shared utilities are added to the catalog only when they earn it, and the criteria are spelled out at the end of the doc.

## The base repository

A small generic class that wraps Prisma with three concerns every feature needs anyway. Tenant scoping. Soft delete. Audit hooks.

```ts
// core/data/base.repository.ts
export interface RequestContext {
  operatorId: string;
  actorUserId: string;
  requestId: string;
  tx?: Prisma.TransactionClient;
}

export interface ListQuery {
  take?: number;
  skip?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  includeDeleted?: boolean;
}

export interface ModelHooks<TEntity> {
  beforeWrite?(patch: Partial<TEntity>, ctx: RequestContext): void;
  afterWrite?(entity: TEntity, ctx: RequestContext): Promise<void> | void;
}

export abstract class BaseRepository<
  TEntity extends { id: string; operatorId: string; deletedAt?: Date | null },
  TCreate,
  TUpdate,
> {
  protected abstract readonly modelName: keyof PrismaClient;
  protected abstract readonly hooks: ModelHooks<TEntity>;

  constructor(protected readonly prisma: PrismaService) {}

  protected delegate(ctx: RequestContext): any {
    return ((ctx.tx ?? this.prisma) as any)[this.modelName];
  }

  async findById(id: string, ctx: RequestContext): Promise<TEntity | null> {
    return this.delegate(ctx).findFirst({ where: { id, operatorId: ctx.operatorId, deletedAt: null } });
  }

  async list(query: ListQuery, ctx: RequestContext): Promise<{ items: TEntity[]; total: number }> {
    const where = { operatorId: ctx.operatorId, ...(query.includeDeleted ? {} : { deletedAt: null }) };
    const [items, total] = await Promise.all([
      this.delegate(ctx).findMany({
        where,
        take: query.take ?? 20,
        skip: query.skip,
        orderBy: query.orderBy ?? { createdAt: 'desc' },
      }),
      this.delegate(ctx).count({ where }),
    ]);
    return { items, total };
  }

  async create(input: TCreate, ctx: RequestContext): Promise<TEntity> {
    this.hooks.beforeWrite?.(input as Partial<TEntity>, ctx);
    const entity = await this.delegate(ctx).create({ data: { ...input, operatorId: ctx.operatorId } });
    await this.hooks.afterWrite?.(entity, ctx);
    return entity;
  }

  async update(id: string, patch: TUpdate, ctx: RequestContext): Promise<TEntity> {
    this.hooks.beforeWrite?.(patch as Partial<TEntity>, ctx);
    const entity = await this.delegate(ctx).update({
      where: { id, operatorId: ctx.operatorId, deletedAt: null },
      data: patch,
    });
    await this.hooks.afterWrite?.(entity, ctx);
    return entity;
  }

  async softDelete(id: string, ctx: RequestContext): Promise<TEntity> {
    return this.delegate(ctx).update({
      where: { id, operatorId: ctx.operatorId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
```

Notes on the contract.

- `ctx` is mandatory on every public method. `operatorId` enforces tenant scope, `actorUserId` is the audit subject, `requestId` flows from async-local-storage, optional `tx` is how the repository participates in a transaction. The repository never reads tenant from a global.
- Soft delete is invisible by default. `includeDeleted: true` is an explicit opt-in on `list`, none on `findById`. Feature methods that need tombstones declare a named variant (`findByIdIncludingDeleted`).
- Hard delete is not on the base class. Data-retention jobs in `core/retention/` declare a `hardDelete(id)` method on the concrete repository with an explicit comment.

A feature repository extends the base and adds queries with intent.

```ts
// modules/jobs/jobs.repository.ts
@Injectable()
export class JobsRepository extends BaseRepository<
  Job,
  Prisma.JobUncheckedCreateInput,
  Prisma.JobUncheckedUpdateInput
> {
  protected readonly modelName = 'job' as const;
  protected readonly hooks: ModelHooks<Job> = {
    beforeWrite: (patch) => {
      if (patch.status && !JOB_STATUSES.includes(patch.status)) {
        throw new InvalidJobStatusException(patch.status);
      }
    },
  };

  async findScheduledForWorker(workerId: string, day: Date, ctx: RequestContext): Promise<Job[]> {
    return this.delegate(ctx).findMany({
      where: {
        operatorId: ctx.operatorId,
        workerId,
        scheduledFor: { gte: startOfDay(day), lt: endOfDay(day) },
        deletedAt: null,
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }
}
```

The base repository owns the boring CRUD. The feature repository owns named queries. If a feature method is just a thinly-wrapped `findMany`, delete it and call `list`.

## The base service

A thinner abstraction than the repository. Services orchestrate use cases, they do not own the database. The base captures the shared shape, not the business rules.

```ts
// core/service/base.service.ts
export abstract class BaseService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly events: EventBus,
    protected readonly logger: Logger,
  ) {}

  // Runs a use case inside a Prisma transaction. The new ctx exposes `tx`
  // to repositories so every write inside the callback shares the client.
  protected async withTransaction<T>(
    ctx: RequestContext,
    work: (tx: Prisma.TransactionClient, txCtx: RequestContext) => Promise<T>,
  ): Promise<T> {
    if (ctx.tx) return work(ctx.tx, ctx); // Reuse instead of nesting.
    return this.prisma.$transaction(async (tx) => work(tx, { ...ctx, tx }));
  }
}
```

The standard use-case shape inside a service. Validate, authorize, transact, emit, return.

```ts
async transitionJob(jobId: string, to: JobStatus, ctx: RequestContext): Promise<Job> {
  // 1. Authorize and load.
  const job = await this.jobs.findById(jobId, ctx);
  if (!job) throw new JobNotFoundException(jobId);
  this.policies.assert('canTransitionJob', { actor: ctx, subject: job, to });

  // 2. Validate business invariants.
  if (!this.statusMachine.canTransition(job.status, to)) {
    throw new InvalidJobTransitionException(job.status, to);
  }

  // 3. Transact. Outbox row commits with the write.
  return this.withTransaction(ctx, async (tx, txCtx) => {
    const next = await this.jobs.update(jobId, { status: to, ...this.statusMachine.sideEffects(to) }, txCtx);
    await this.jobStatusEvents.create(
      { jobId, fromStatus: job.status, toStatus: to, actorUserId: ctx.actorUserId },
      txCtx,
    );
    await this.events.emitInTx(tx, txCtx, new JobStatusChangedEvent(next, job.status));
    return next;
  });
}
```

Rules for services.

- A service never reaches into another feature's repository directly. If `JobsService` needs a worker, it goes through `WorkersService` or reacts to a worker event. Never `this.prisma.worker.findFirst`.
- Cross-feature coordination uses events whenever the coupling can be one-way. A job assignment writes a `job.assigned` event; `SchedulesModule` subscribes. No circular imports.
- Services log at non-obvious decision points only (skipped a step, hit a fallback). The `LoggingInterceptor` already wraps the request.
- Services return domain entities, never response DTOs and never raw Prisma shapes. The controller maps at the edge.

## Custom decorators

A small fixed set in `core/decorators/`. Each has a unit test and at least three controller callers.

```ts
// core/decorators/index.ts

export interface AuthenticatedUser {
  id: string;
  operatorId: string;
  email: string;
  roles: ReadonlyArray<string>;
}

// Extracts the authenticated user from the request. The full user object.
export const CurrentUser = createParamDecorator(
  (_d, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  },
);

// Extracts the operatorId only. Used when the controller does not need the user.
export const Tenant = createParamDecorator((_d, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (!req.user?.operatorId) throw new UnauthorizedException();
  return req.user.operatorId;
});

// Role gate. Read by RolesGuard against the actor's role grants.
export const ROLES_KEY = 'rbac:roles';
export const Roles = (...roles: Array<'coordinator' | 'tenant_admin' | 'worker' | 'auditor'>) =>
  SetMetadata(ROLES_KEY, roles);

// Scope gate. Declares the dimension the route operates on.
export const SCOPE_KEY = 'rbac:scope';
export const Scoped = (scope: 'property' | 'region' | 'tenant') => SetMetadata(SCOPE_KEY, scope);

// Policy gate. References a CASL ability declared in core/rbac/policies.ts.
export const POLICY_KEY = 'rbac:policy';
export const Policy = (ability: PolicyAbility) => SetMetadata(POLICY_KEY, ability);

// Reads the request id from async-local-storage so background work spawned
// inside the handler shares the same id without threading it explicitly.
export const RequestId = createParamDecorator((): string => {
  const id = requestContext.getStore()?.requestId;
  if (!id) throw new Error('request id not initialized');
  return id;
});

// Reads the Idempotency-Key header. Optional. Validates shape, never the value.
// Currently unused in v0.1 (mutation idempotency is deferred); kept as a clean
// header reader so a future API-layer replay-protection feature can plug in
// without changing controller signatures.
export const IdempotencyKey = createParamDecorator((_d, ctx: ExecutionContext): string | null => {
  const raw = ctx.switchToHttp().getRequest<Request>().header('idempotency-key');
  if (!raw) return null;
  if (raw.length < 8 || raw.length > 128) {
    throw new BadRequestException({
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key must be 8 to 128 characters',
    });
  }
  return raw;
});
```

Usage in a controller.

```ts
@Post(':id/transition')
@Roles('coordinator', 'tenant_admin')
@Scoped('property')
@Policy('canTransitionJob')
async transition(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: TransitionJobDto,
  @CurrentUser() actor: AuthenticatedUser,
  @RequestId() requestId: string,
): Promise<JobResponseDto> {
  const ctx: RequestContext = { operatorId: actor.operatorId, actorUserId: actor.id, requestId };
  return toJobResponseDto(await this.jobs.transitionJob(id, dto.to, ctx));
}
```

The decorators are small on purpose. Each does one thing, all are composable, none encode business logic. Anything more clever belongs in a guard, an interceptor, or a service.

## Cross-cutting interceptors

Four interceptors, registered once in `AppModule`, in this order. Order is part of the contract.

```ts
app.useGlobalInterceptors(
  app.get(RequestIdInterceptor),
  app.get(TenantScopeInterceptor),
  app.get(LoggingInterceptor),
  app.get(AuditInterceptor),
);
```

### RequestIdInterceptor

Establishes the request id in async-local-storage at the entry point. Reads `X-Request-Id` if present, generates a UUID if not. Every downstream log line, audit row, and outbox event carries this id.

```ts
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const requestId = ctx.switchToHttp().getRequest<Request>().header('x-request-id') ?? randomUUID();
    return new Observable((sub) => {
      requestContext.run({ requestId }, () => next.handle().subscribe(sub));
    });
  }
}
```

### TenantScopeInterceptor

Reads the operator from the authenticated user and binds it on the request-scoped Prisma client extension. The extension throws `TenantScopeViolation` if a query against a tenant-scoped model omits `operatorId`. Repositories never have to remember the filter on a `findFirst`. Cross-link `01-data.md` for the extension itself.

```ts
@Injectable({ scope: Scope.REQUEST })
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (req.user) this.prisma.bindTenant(req.user.operatorId);
    return next.handle();
  }
}
```

### LoggingInterceptor

Wraps every controller invocation in a pino span. Records the route, the actor, the request id, the duration, and the resulting status. Errors are logged with the exception code and a stack hash, not the full stack.

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const start = process.hrtime.bigint();
    const route = `${req.method} ${req.route?.path ?? req.path}`;
    return next.handle().pipe(
      tap({
        next: () => this.logger.info({ route, durMs: ms(start) }, 'request.ok'),
        error: (err) =>
          this.logger.error({ route, durMs: ms(start), code: err.code ?? err.name }, 'request.err'),
      }),
    );
  }
}
```

### AuditInterceptor

Writes one row to `permission_audits` per protected request. Reads the policy decision the `PolicyGuard` stored on the request and persists the actor, subject, action, and decision. Failures are logged but never break the response. This is the only writer of `permission_audits`. No feature module writes audit rows directly.

```ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audits: PermissionAuditsRepository) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const decision = req.policyDecision;
    if (!decision) return next.handle();
    return next.handle().pipe(
      tap({
        next: () => this.write(req, decision, 'allow').catch(noop),
        error: () => this.write(req, decision, 'deny').catch(noop),
      }),
    );
  }
}
```

## The DTO pattern

Three DTOs per surface, no more, no less, and only on surfaces where the cost is paid back.

| DTO | Purpose | Where |
|---|---|---|
| `CreateXDto` | Validates a create body | `modules/<feature>/dto/create-x.dto.ts` |
| `UpdateXDto` | Validates a partial update | `modules/<feature>/dto/update-x.dto.ts` |
| `XResponseDto` | Shapes the response | `modules/<feature>/dto/x-response.dto.ts` |

The response DTO is what hits the wire. Entities never leak out. Mapping lives in a tiny `toXResponseDto` function colocated with the controller.

```ts
// modules/jobs/dto/job-response.dto.ts
export interface JobResponseDto {
  id: string;
  propertyId: string;
  status: JobStatus;
  scheduledFor: string;
  worker: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function toJobResponseDto(
  job: Job & { worker?: Pick<User, 'id' | 'name'> | null },
): JobResponseDto {
  return {
    id: job.id,
    propertyId: job.propertyId,
    status: job.status as JobStatus,
    scheduledFor: job.scheduledFor.toISOString(),
    worker: job.worker ? { id: job.worker.id, name: job.worker.name } : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
```

Mapping rules. Never spread the entity, map field by field so the reviewer can see at a glance what is exposed. Dates serialize to ISO 8601, decimals to strings (preserves precision), enums to their string name. The function is pure (no async, no DB calls). One mapper per response DTO. If the same entity ships in two shapes (compact list, full detail), declare two response DTOs and two mappers.

When the DTO pattern is overkill. Internal admin endpoints with a single field, health endpoints, anything where request and response are the same primitive. The pattern earns its keep when the surface is public, evolving, or read by more than one team.

## Idempotency

Idempotency keys for mutations are deferred. The scale of v0.1 does not require replay protection at the API layer. Add later if needed.

## Pagination

One helper in `core/pagination/`. Offset pagination is the sole shape for v0.1 lists. `PageInfo` and `Paginated<T>` live in `@crewmate/contracts` and are imported by both ends.

```ts
export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface Paginated<T> { items: T[]; pageInfo: PageInfo; }
```

```ts
// core/pagination/paginate-page.ts
export function paginatePage(params: { page?: number; pageSize?: number; max?: number }) {
  const max = params.max ?? 100;
  const pageSize = Math.min(params.pageSize ?? 20, max);
  const page = Math.max(params.page ?? 1, 1);
  return {
    take: pageSize,
    skip: (page - 1) * pageSize,
    respond: <T>(items: T[], total: number): Paginated<T> => ({
      items,
      pageInfo: { page, pageSize, total, hasNextPage: page * pageSize < total },
    }),
  };
}
```

Repositories accept the take and skip, they do not import the helper. The controller is the only place where the request query is parsed and the envelope is built.

Rules. Default `pageSize` is 20, hard cap 100, routes that need more document why. A list endpoint returning more than 1000 rows total is a bug. Add a filter, add a search, or split the resource. Cursor pagination is intentionally out of scope for v0.1; offset is enough at this scale, and a future cursor helper can join this section without churning callers.

## Soft delete

At the schema level. The list of models with soft delete is fixed in `prisma/schema.prisma`, not configured at runtime.

- `Operator`, `User`, `Property`, `Worker`, `Job` carry `deletedAt`.
- `Schedule`, `RoleGrant`, `JobStatusEvent`, `PermissionAudit`, `OutboxEvent`, `WebhookDelivery` do not. They are append-only or derived.

Repository methods exclude soft-deleted rows by default. The base repository does this in `findById`, `list`, `update`, `softDelete`. Feature repositories follow suit on their custom queries (always `deletedAt: null` in the `where`). Opt-in for tombstones is explicit per method, never a flag passed around.

```ts
async findByIdIncludingDeleted(id: string, ctx: RequestContext) {
  return this.delegate(ctx).findFirst({ where: { id, operatorId: ctx.operatorId } });
}
```

Hard delete is its own method. It lives only on repositories that need it, and only data-retention jobs in `core/retention/` call it. A hard delete in a feature service is a code-review block.

```ts
// modules/users/users.repository.ts
// Called by core/retention/users-retention.job.ts after the 90-day grace.
async hardDelete(id: string, ctx: RequestContext): Promise<void> {
  await this.delegate(ctx).delete({ where: { id, operatorId: ctx.operatorId } });
}
```

## Transactions

Multi-write use cases run inside `prisma.$transaction`. The base service exposes `withTransaction(ctx, work)` so the transactional client is re-injected into the context and propagated to every repository inside the callback. Without this, a repository called inside a transaction silently uses the global client and the writes are not atomic.

```ts
return this.withTransaction(ctx, async (tx, txCtx) => {
  const job = await this.jobs.update(jobId, { workerId, status: 'ASSIGNED' }, txCtx);
  const schedule = await this.schedules.upsertForDay(workerId, job.scheduledFor, txCtx);
  await this.events.emitInTx(tx, txCtx, new JobAssignedEvent(job, schedule));
  return job;
});
```

Rules. Every repository write accepts a `ctx` whose `tx` is honored if present. Network calls inside a transaction are banned (webhooks, third-party APIs, S3 uploads happen after commit via the outbox). Transactions are short, holding a row for more than a second is a bug. Nested transactions are not real, `withTransaction` reuses an existing `tx` rather than opening a savepoint.

## Event emission

Every domain transition writes the row and the outbox event in the same transaction. The helper `emitInTx` wraps both writes plus the in-process `EventBus` publish, so the caller does not have to know about the outbox table.

```ts
// core/events/event-bus.ts
@Injectable()
export class EventBus {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  async emitInTx(tx: Prisma.TransactionClient, ctx: RequestContext, event: DomainEvent): Promise<void> {
    await this.outbox.create(
      { operatorId: ctx.operatorId, eventName: event.name, payload: event.toPayload() },
      { ...ctx, tx },
    );
    // In-process listeners fire after commit via runAfterCommit.
    runAfterCommit(tx, () => this.emitter.emit(event.name, event));
  }
}
```

The outbox worker drains `outbox_events` where `processed = false`, fans them out to `WebhookDelivery` jobs, and marks them processed. The schema for `OutboxEvent` is already in `prisma/schema.prisma`.

Rules. Domain code never emits to BullMQ directly, the outbox is the single seam between the database and the external world. In-process listeners are wired up in the module that owns the side effect, not in the publisher module. Cross-link `../shared/02-events.md` for event naming and payload shapes.

## When to extract a custom decorator or helper

The reusability rule is in `../shared/05-quality-bar.md`. Restated here so it is impossible to miss.

A new shared abstraction is justified only when all four are true.

1. Three real callers minimum. Not two callers and a planned third. Three callers in committed code.
2. Single responsibility. The abstraction does one thing. If the description needs an "and", split it.
3. Its own unit test. The shared utility is tested in isolation, not only through the features that use it.
4. The alternative is repetitive boilerplate at the route or service level. If the duplication is one line, the abstraction loses.

If even one of the four fails, the answer is to leave the duplication in place and revisit later. Duplication is cheaper than the wrong abstraction.

Promoting a new helper to the catalog. Move the code into `core/<name>/` (folder named for the concept, not the implementation). Add a section to this doc with the public API and rules. Cross-link from the features that adopted it so a search for the helper's name hits the doc first. Call out any helper on the seam between two layers (a decorator that talks to the database, for example); most such seams are accidents and want to be unwound.

## What is intentionally not abstracted

Some duplication is the right answer. The list is short on purpose.

| Not abstracted | Why |
|---|---|
| Authorization checks at the controller level | Each route declares its own `@Roles`, `@Scoped`, `@Policy`. The decoration is the documentation. A wrapper that hides the check makes RBAC harder to audit. |
| Error messages per endpoint | Each endpoint composes its own message because each endpoint has its own audience. Exception codes are shared, messages are local. |
| Validation rules across DTOs | `CreateJobDto` and `UpdateJobDto` repeat field validators. A shared base makes them harder to evolve independently. Update DTOs accept a different field set on purpose. |
| Response shapes across features | Two response DTOs that happen to have the same fields stay separate. Coupling them by hoisting means a change in one feature breaks the other. |
| Pagination defaults per route | Each list endpoint declares its own `take` and `max`. A global default hides the choice. |
| Role names | `coordinator`, `tenant_admin`, `worker`, `auditor` are string literals in `@Roles()` calls. A central enum was tried and dropped because it forced every test to import it for one line and made the role list less greppable. |

The pattern is the same in every case. Duplication is small, divergence is real, the abstraction would cost more than it saves. When in doubt, leave the duplication and write a test for the divergence.

[NEEDS: confirm whether `runAfterCommit` ships in `prisma-extension-runafter` or we are vendoring it. Helper is referenced above, implementation not landed.]

[NEEDS: a worked `hardDelete` example from a retention job once the first one is written.]
