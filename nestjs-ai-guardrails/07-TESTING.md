# Testing

## What we test, and why

| Layer | Test type | Goal |
|---|---|---|
| Service | Unit | Pin down business rules. Fastest signal. |
| Repository | Integration (against a real Postgres in CI) | Catch query and schema bugs. |
| Controller / Resolver / Gateway | e2e | Exercise the full request path including guards, pipes, and filters. |
| Pure utilities | Unit | Lock down edge cases. |
| Migrations | Smoke test in CI | Apply against a fresh DB on every PR. |

We do not test framework code, ORM internals, or trivial getters.

## File layout

```
src/modules/jobs/
  jobs.service.ts
  jobs.service.spec.ts          # unit
  jobs.controller.ts
  jobs.controller.e2e-spec.ts   # e2e
  jobs.repository.ts
  jobs.repository.int-spec.ts   # integration (real DB)
test/
  setup.ts
  app.factory.ts
  factories/
    job.factory.ts
    worker.factory.ts
  helpers/
    auth.helper.ts
    db.helper.ts
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

## e2e test pattern

A real Nest application, a real database, a real HTTP request.

```ts
describe('JobsController (e2e)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let auth: AuthHelper;

  beforeAll(async () => {
    app = await buildTestApp();
    db = app.get(PrismaService);
    auth = new AuthHelper(app);
  });

  beforeEach(async () => {
    await db.resetForTests();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/jobs creates a job and returns 201', async () => {
    const { token, operator } = await auth.signInAsCoordinator();
    const property = await createProperty({ operatorId: operator.id });

    const response = await request(app.getHttpServer())
      .post('/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        propertyId: property.id,
        type: 'INSPECTION',
        scheduledFor: '2026-06-02T09:00:00Z',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'SCHEDULED',
      propertyId: property.id,
    });

    const stored = await db.job.findFirstOrThrow({ where: { id: response.body.id } });
    expect(stored.tenantId).toBe(operator.id);
  });

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .post('/v1/jobs')
      .send({})
      .expect(401);
  });

  it('rejects coordinator from another tenant with 404', async () => {
    // 404, not 403, because we do not leak existence
    ...
  });
});
```

Rules.

- One Nest app per file, reset the DB between tests.
- Authenticate via the real auth flow (the helper signs a token through the actual `AuthService`), not by stubbing `req.user`.
- Assert the response shape and the persisted state.
- Cover the happy path, one authorization case, and at least one validation case per endpoint.

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

## Coverage targets

- Services. 85% lines, 90% branches on business rules.
- Controllers. 70% lines via e2e tests.
- Overall. 75% lines minimum. CI fails below that.

Coverage is a floor, not a goal. A 100%-covered function with no meaningful assertions is worse than a 60%-covered function with strong ones.

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
- `pnpm test:e2e` runs against a Postgres container started by docker-compose or GitHub Actions services.
- Coverage report uploaded as an artifact, summary commented on the PR.
