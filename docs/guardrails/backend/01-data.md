# Data Layer

## ORM choice

Prisma. One ORM, one set of types, one migration tool.

## Repository pattern

Every feature module that touches the database has a `*.repository.ts` that wraps Prisma calls. Services never call `prisma` directly.

```ts
@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(id: string, tenantId: string): Promise<Job | null> {
    return this.prisma.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async create(
    data: Prisma.JobCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Job> {
    const client = tx ?? this.prisma;
    return client.job.create({ data });
  }
}
```

Rules.

- One repository method per intent. Do not pass a generic `where` from the service.
- Every read accepts `tenantId` as a parameter, or the repository pulls it from `TenantContext`. Never trust the caller to remember.
- Soft-deleted rows (`deletedAt != null`) are always filtered out at the repository level. Exceptions live behind named methods like `findOneByIdIncludingDeleted`.
- Every write method optionally accepts a `tx` so it can participate in a transaction.

## Tenant scoping

Multi-tenancy is enforced in two layers.

1. **`TenantGuard`** runs on every authenticated route. It resolves the operator from the JWT and writes it into a request-scoped `TenantContext`.
2. **Repositories** read from `TenantContext` (or accept `tenantId` explicitly) and add `tenantId` to every Prisma `where`.

A query without a `tenantId` filter on a tenant-scoped model is a security bug. Lint or codereview catches it.

```ts
// core/context/tenant.context.ts
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private _operatorId: string | null = null;

  set operatorId(id: string) {
    if (this._operatorId) throw new Error('tenant already set');
    this._operatorId = id;
  }

  get operatorId(): string {
    if (!this._operatorId) throw new Error('tenant not set on this request');
    return this._operatorId;
  }
}
```

## Transactions

Use `prisma.$transaction` whenever two or more writes must succeed together.

```ts
async assignJobToWorker(jobId: string, workerId: string): Promise<Job> {
  return this.prisma.$transaction(async (tx) => {
    const job = await this.jobs.update(jobId, { workerId }, tx);
    await this.schedules.addEntry(workerId, job, tx);
    await this.events.emitInTx('job.assigned', { jobId, workerId }, tx);
    return job;
  });
}
```

Rules.

- Pass the `tx` client into every repository call inside the transaction. Anything that does not accept `tx` cannot participate, fix the signature.
- Keep transactions short. Network calls (webhooks, external APIs) live outside, fired after commit.
- Outbox pattern for cross-boundary events. Write the event row inside the transaction, a worker drains the outbox to BullMQ. See `./shared/02-events.md`.

## N+1

- Reach for `include` and `select` on the same query, not loops of single lookups.
- For GraphQL field resolvers, use DataLoader.
- If a list endpoint runs more than two queries, it is wrong.

## Migrations

- One migration per logical change. Never edit a migration after it has been applied to any shared environment.
- Migrations are reviewed like code. Destructive changes (drop column, drop table, narrow type) require an explicit sign-off comment in the PR.
- Generate the SQL with `prisma migrate dev --create-only`, then read the SQL before applying.
- Backfills live in their own migration, separate from schema changes. Never do schema + backfill in one step in production.

## Indexes

- Foreign keys are indexed. Prisma adds these by default on relations, verify.
- Anything used in a `where`, `orderBy`, or `groupBy` of a hot query gets an index.
- Composite indexes mirror the query order. `@@index([tenantId, status, scheduledFor])` for "all jobs for tenant T in status S ordered by time".

## Seeds and fixtures

- A seed script lives in `prisma/seed.ts` and creates a small but believable dataset (one operator, three properties, three workers, ten jobs across statuses).
- Reviewers should be able to `pnpm db:reset && pnpm db:seed && pnpm start` and see the app fully populated.
- Factories for tests live in `test/factories/*.factory.ts`. They produce overrideable objects, not Prisma writes.

## Raw SQL

Avoid. When unavoidable (a performance-critical aggregation, a window function), isolate it in the repository, comment why, and add a test that runs against a real Postgres in CI.

```ts
// PERFORMANCE: a Prisma groupBy generates two queries here.
// One window function over jobs is ~10x faster on the dashboard.
async getDailyThroughput(tenantId: string): Promise<DailyThroughput[]> {
  return this.prisma.$queryRaw<DailyThroughput[]>`
    SELECT ...
  `;
}
```

## Banned

- Calling `this.prisma.X` from inside a service. Go through the repository.
- A `findMany` without a `take` (or a documented reason). Unbounded reads are a bug waiting to happen.
- `prisma.$executeRawUnsafe`. Always parameterized.
- Returning Prisma types out of a service. Map to a domain type or response DTO at the boundary.
