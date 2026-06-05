# Prisma Usage Patterns

---

## PrismaService — Injection Only

`PrismaService` wraps `PrismaClient` and is declared a global NestJS module. Inject it via the constructor. Never instantiate `PrismaClient` directly anywhere in application code.

```ts
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// jobs.service.ts — correct usage
@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}
}
```

No module other than `PrismaModule` touches `PrismaClient` directly.

---

## Operator Scoping — Mandatory

Every query against a multi-tenant model (`Job`, `Worker`, `Team`, `TeamMember`, `Customer`, `JobStatusEvent`, `JobType`) must include `operatorId` in the `where` clause. No exceptions outside `prisma/seed.ts` and admin-only scripts.

```ts
// Good
const job = await this.prisma.job.findFirst({
  where: { id: jobId, operatorId },
});

// Bad — missing operator scope, will leak data across tenants
const job = await this.prisma.job.findUnique({
  where: { id: jobId },
});
```

The `operatorId` comes from the JWT payload extracted by `@CurrentUser()`. It is passed down explicitly from controller to service. Never read it from an environment variable or a hardcoded string in the service layer.

---

## `select` vs `include` — Default to `select`

Use `select` by default. It forces you to be explicit about what columns you fetch and prevents accidentally loading large fields (e.g., `workerPhotos[]`, `customerPhotos[]`) when you don't need them.

```ts
// Good — explicit select, only what is needed for the list view
const jobs = await this.prisma.job.findMany({
  where: { operatorId, status: filters.status },
  select: {
    id: true,
    status: true,
    progressPct: true,
    scheduledFor: true,
    jobType: {
      select: { id: true, label: true },
    },
    customer: {
      select: { id: true, name: true, lat: true, lng: true },
    },
  },
});

// Avoid — loads the full model + all relations
const jobs = await this.prisma.job.findMany({
  where: { operatorId },
  include: { jobType: true, customer: true },
});
```

Use `include` only when you need the joined record in the exact shape Prisma returns it and you are not mapping to a custom response interface. In practice, this is rare — almost all responses are mapped to a custom interface anyway.

---

## Revenue Calculation — Service Layer Only

Do not compute revenue, profit, or earnings in raw SQL or Prisma `$queryRaw`. Always compute in the service layer using the defined formula.

**Formula:**

```ts
// All values in euro cents

function computeJobRevenue(
  estimatedHours: number,
  clientRatePerHour: number,  // cents/hr
  numberOfWorkers: number,
): number {
  return estimatedHours * clientRatePerHour * numberOfWorkers;
}

function computeWorkerEarning(
  estimatedHours: number,
  workerHourlyRate: number,  // cents/hr
): number {
  return estimatedHours * workerHourlyRate;
}

function computePlatformProfit(
  clientCharge: number,
  workerEarnings: number[],  // one per worker
): number {
  return clientCharge - workerEarnings.reduce((sum, e) => sum + e, 0);
}
```

This keeps the DB portable (no PostgreSQL-specific arithmetic in migrations) and keeps the formula testable in unit tests without a DB connection.

---

## Transaction Pattern

Use `prisma.$transaction([...])` for multi-step writes that must be atomic. Do not run multiple separate `await prisma.x.update(...)` calls when they must succeed or fail together.

```ts
// Good — cancel job + update worker status atomically
async cancelJob(
  jobId: string,
  dto: CancelJobDto,
  operatorId: string,
  actorUserId: string,
): Promise<JobDetailResponse> {
  const [updatedJob] = await this.prisma.$transaction([
    this.prisma.job.update({
      where: { id: jobId, operatorId },
      data: {
        status: 'CANCELLED',
        cancelReasonCode: dto.cancelReasonCode,
        cancelReasonNote: dto.cancelReasonNote,
        cancelledBy: actorUserId,
        cancelledAt: new Date(),
      },
      select: { ... },
    }),
    this.prisma.jobStatusEvent.create({
      data: {
        jobId,
        fromStatus: 'IN_PROGRESS',
        toStatus: 'CANCELLED',
        actorUserId,
        occurredAt: new Date(),
        metadata: { cancelReasonCode: dto.cancelReasonCode },
      },
    }),
  ]);

  return toJobDetailResponse(updatedJob);
}
```

For complex transactions with conditional logic, use the interactive transaction form:

```ts
await this.prisma.$transaction(async (tx) => {
  const job = await tx.job.findFirst({ where: { id: jobId, operatorId } });
  if (!job) throw new JobNotFoundError(jobId);
  // ... more logic using tx
});
```

---

## Migration Rules

1. Never edit an existing migration file in `prisma/migrations/`. Once a migration is committed, it is immutable.
2. Always generate new migrations with a descriptive name:
   ```bash
   pnpm prisma migrate dev --name add-team-member-index-on-worker-id
   ```
3. Add a database index for every foreign key that is used in a `WHERE` clause. If you add a FK column to a model, add the index in the same migration:
   ```prisma
   model TeamMember {
     id       String @id @default(cuid())
     teamId   String
     workerId String @unique   // ← unique constraint doubles as index

     @@index([teamId])
   }
   ```
4. Commit the schema change and the generated migration in the same commit. Never commit them separately.
5. Migration files are committed to git. The `prisma/migrations/` folder is not in `.gitignore`.

---

## Seed File (`prisma/seed.ts`)

Seed runs in strict dependency order. Every operation uses `upsert` so the seed is idempotent — running it twice produces the same state.

**Order:**

```ts
// 1. Operator
await prisma.operator.upsert({ where: { id: OPERATOR_ID }, ... });

// 2. JobTypes (8 lookup records)
for (const jt of JOB_TYPES) {
  await prisma.jobType.upsert({ where: { id: jt.id }, ... });
}

// 3. Users (one per role: SUPER_ADMIN, MANAGER, TEAM_LEAD, WORKER ×7)
for (const user of USERS) {
  await prisma.user.upsert({ where: { email: user.email }, ... });
}

// 4. Workers (one Worker record per Worker/TeamLead user)
for (const worker of WORKERS) {
  await prisma.worker.upsert({ where: { id: worker.id }, ... });
}

// 5. Teams
await prisma.team.upsert({ where: { id: TEAM_ALFA_ID }, ... });

// 6. TeamMembers
for (const tm of TEAM_MEMBERS) {
  await prisma.teamMember.upsert({ where: { workerId: tm.workerId }, ... });
}

// 7. Customers (15 Milan addresses)
for (const customer of CUSTOMERS) {
  await prisma.customer.upsert({ where: { id: customer.id }, ... });
}

// 8. Jobs (40+ with mixed statuses + historical jobs for 7-day trend)
for (const job of JOBS) {
  await prisma.job.upsert({ where: { id: job.id }, ... });
}

// 9. JobStatusEvents (history for each job)
for (const event of JOB_STATUS_EVENTS) {
  await prisma.jobStatusEvent.upsert({ where: { id: event.id }, ... });
}
```

Seed is invoked via:
```bash
pnpm db:seed
# which runs: ts-node prisma/seed.ts
```

`POST /demo/reset` in `DemoService` re-runs the job + jobStatusEvent portions of the seed, leaving Users/Workers/Teams/Customers intact (they don't change during a demo).

---

## Soft Deletes

Not used. Hard delete is appropriate for this project. Demo data is pre-seeded and ephemeral. No audit trail is required for deletes.
