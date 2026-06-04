# Testing

Tests in v0.1 are deliberately a thin layer focused on critical paths. The goal is to express intent on the parts of the system that are interesting to read, not to chase a coverage number. See `docs/FEATURES.md` F-130 through F-132 for the scope decision.

## What we test, and why

Five to seven test files total. Each one is well-named, well-structured, and serves as a reading sample.

| File | Type | Why it exists |
|---|---|---|
| `jobs/job-status.machine.spec.ts` | Unit | Full transition matrix for the job state machine. |
| `rbac/policy-evaluator.spec.ts` | Unit | Representative allow/deny cases for the four-layer authorization model. |
| `auth/refresh-token.service.spec.ts` | Unit | Refresh-token rotation and the replay-detection branch. |
| `webhooks/webhook-signer.spec.ts` | Unit | HMAC payload signing produces the expected header for a known input. |
| `app.e2e-spec.ts` | Supertest | One happy-path walkthrough (F-131). |

We do not test framework code, ORM internals, trivial getters, or anything Prisma owns. Repository-level integration tests are not required in v0.1; the tenant-scoping behavior is exercised by the single happy-path test.

## File layout

Specs are colocated with the code they cover. Shared test plumbing lives under `test/`.

```
src/modules/jobs/
  job-status.machine.ts
  job-status.machine.spec.ts
src/modules/rbac/
  policy-evaluator.ts
  policy-evaluator.spec.ts
src/modules/auth/
  refresh-token.service.ts
  refresh-token.service.spec.ts
src/modules/webhooks/
  webhook-signer.ts
  webhook-signer.spec.ts
test/
  app.e2e-spec.ts
  app.factory.ts
  factories/
    job.factory.ts
    worker.factory.ts
  helpers/
    auth.helper.ts
```

## Unit test pattern

Arrange, Act, Assert. One behavior per `it`.

```ts
describe('JobsService', () => {
  let service: JobsService;
  let repo: jest.Mocked<JobsRepository>;
  let events: jest.Mocked<EventEmitter2>;
  let clock: ClockService;

  beforeEach(async () => {
    repo = createMock<JobsRepository>();
    events = createMock<EventEmitter2>();
    clock = new FixedClockService(new Date('2026-06-01T09:00:00Z'));

    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: JobsRepository, useValue: repo },
        { provide: EventEmitter2, useValue: events },
        { provide: ClockService, useValue: clock },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  describe('create', () => {
    it('persists the job and emits job.created', async () => {
      // Arrange
      const dto = buildCreateJobDto();
      const actor = buildActor();
      repo.create.mockResolvedValue(buildJob({ id: 'job-1' }));

      // Act
      const result = await service.create(dto, actor);

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ propertyId: dto.propertyId }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        'job.created',
        expect.objectContaining({ jobId: 'job-1' }),
      );
      expect(result.id).toBe('job-1');
    });

    it('throws JobValidationException when scheduledFor is in the past', async () => {
      const dto = buildCreateJobDto({ scheduledFor: '2026-05-01T00:00:00Z' });
      await expect(service.create(dto, buildActor())).rejects.toBeInstanceOf(
        JobValidationException,
      );
    });
  });
});
```

Rules.

- Mock collaborators, not the system under test.
- Use `@golevelup/ts-jest` `createMock` for deep mocks. Hand-rolled mocks are fine for small surfaces.
- One assertion per behavior (multiple `expect` lines are fine, one logical claim).
- Test names are sentences. `it('throws JobValidationException when ...')`.
- Use **factories** (`buildJob`, `buildCreateJobDto`) for inputs. Never inline a 30-line fixture.

## Integration test pattern

One Supertest walkthrough that boots a real Nest application against a real Postgres and Redis via docker-compose. It exercises the worker happy path end to end. No other integration tests in v0.1.

```ts
describe('App (e2e) worker happy path', () => {
  let app: INestApplication;
  let db: PrismaService;

  beforeAll(async () => {
    app = await buildTestApp();
    db = app.get(PrismaService);
    await db.resetForTests();
    await seedWorkerWithOneScheduledJob(db);
  });

  afterAll(async () => {
    await app.close();
  });

  it('login, fetch jobs, transition through to Completed, log out', async () => {
    const http = request(app.getHttpServer());

    const login = await http
      .post('/v1/auth/login')
      .send({ email: 'worker@example.com', password: 'correct-horse' })
      .expect(200);

    const token = login.body.accessToken;
    const auth = { Authorization: `Bearer ${token}` };

    const jobs = await http.get('/v1/jobs?assignedToMe=true').set(auth).expect(200);
    expect(jobs.body.items).toHaveLength(1);
    const jobId = jobs.body.items[0].id;

    await http
      .post(`/v1/jobs/${jobId}/transition`)
      .set(auth)
      .send({ to: 'IN_PROGRESS' })
      .expect(200);

    await http
      .post(`/v1/jobs/${jobId}/transition`)
      .set(auth)
      .send({ to: 'COMPLETED' })
      .expect(200);

    await http.post('/v1/auth/logout').set(auth).expect(204);
  });
});
```

Rules.

- One Nest app per file, reset the DB once before the walkthrough.
- Authenticate via the real auth flow, not by stubbing `req.user`.
- Assert the response shape and at least one persisted state change.

## Coverage

Coverage is not gated in v0.1. Tests live to express intent on critical paths, not to satisfy a percentage.

## Factories

Factories return overrideable objects. They never hit the database.

```ts
// test/factories/job.factory.ts
export const buildJob = (overrides: Partial<Job> = {}): Job => ({
  id: randomUUID(),
  tenantId: 'tenant-1',
  propertyId: 'property-1',
  workerId: null,
  status: JobStatus.SCHEDULED,
  scheduledFor: new Date('2026-06-01T09:00:00Z'),
  createdAt: new Date('2026-05-31T00:00:00Z'),
  updatedAt: new Date('2026-05-31T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});
```

A separate helper (`createJob`) persists. The two are not the same.

## What not to test

- Framework code (`@Module`, `@Controller` wiring).
- Prisma queries via mocks (`prisma.job.findFirst` returns `mockResolvedValue(...)` then "tests" call). That tests the mock, not the code. Test repositories against a real DB.
- Private methods. Test them through the public method that calls them.
- Trivial getters and constructors.

## Mocking time

Inject `ClockService`. In tests, use `FixedClockService` or `AdjustableClockService`.

```ts
const clock = new AdjustableClockService(new Date('2026-06-01T09:00:00Z'));
clock.advance({ hours: 2 });
```

Do not use `jest.useFakeTimers()` in service tests. Reserve for code that calls `setTimeout` directly.

## CI

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, in that order.
- `pnpm test:e2e` runs against a Postgres and Redis started by docker-compose service containers in GitHub Actions.
- No coverage gate, no perf tests, no load tests, no frontend e2e (Playwright and Cypress stay out of scope, see `docs/FEATURES.md` F-132 and the "Out of scope" section).
