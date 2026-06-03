# NestJS Patterns

## Module shape

Every feature module follows the same template.

```ts
@Module({
  imports: [
    // Other Nest modules this feature depends on. Keep this list short and explicit.
    PrismaModule,
    EventEmitterModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsRepository,
    // Local-only providers (state machines, mappers) live here too.
    JobStatusMachine,
  ],
  exports: [
    // Only export what other modules legitimately need. Default to nothing.
    JobsService,
  ],
})
export class JobsModule {}
```

Rules.

- A module's `exports` are its public surface. Anything not exported is private.
- A module that exposes nothing externally should not appear in another module's `imports`.
- Use `forFeature` patterns (Prisma, BullMQ) inside the feature module, not in `AppModule`.

## Dependency injection

- **Constructor injection only.** No `@Inject` on properties.
- Mark dependencies `private readonly`. They are immutable after construction.

```ts
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly jobs: JobsRepository,
    private readonly events: EventEmitter2,
    private readonly clock: ClockService,
  ) {}
}
```

- Inject interfaces via tokens when you genuinely need swappable implementations. Do not invent an interface for a single concrete provider.
- Custom providers (`useFactory`, `useValue`, `useClass`) belong in the module file, not scattered.

## Global pipes, filters, and interceptors

Registered once in `main.ts` or `AppModule`.

```ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // strip unknown fields
    forbidNonWhitelisted: true,// reject unknown fields with 400
    transform: true,           // hydrate DTOs into class instances
    transformOptions: { enableImplicitConversion: false },
  }),
);

app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

- `whitelist: true` is non-negotiable. Unknown fields must be stripped or rejected.
- `transform: true` lets controllers receive real DTO instances, not plain objects.
- `ClassSerializerInterceptor` enforces `@Expose` and `@Exclude` on response DTOs.

## Controllers

A controller method is three to six lines. If it is longer, business logic has leaked in.

```ts
@Controller({ path: 'jobs', version: '1' })
@UseGuards(JwtAuthGuard, TenantGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  @Roles(Role.COORDINATOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateJobDto,
    @CurrentUser() actor: ActorContext,
  ): Promise<JobResponseDto> {
    const job = await this.jobs.create(dto, actor);
    return JobResponseDto.fromDomain(job);
  }
}
```

Rules.

- Versioned routes from day one. Use Nest's URI versioning.
- Guards declared at the controller level when they apply to every route. Specific overrides per method.
- Map domain objects to response DTOs at the boundary. Never `return entity` directly.

## Guards

- Each guard does exactly one check.
- Order matters. `JwtAuthGuard` first (authenticates), then `TenantGuard` (scopes), then `RolesGuard` (authorizes action).
- A guard never mutates the response. If you need to attach data to the request, use a Nest interceptor or a custom decorator.

## Interceptors

Use interceptors for cross-cutting transforms.

- `LoggingInterceptor` for structured request and response logs.
- `TimeoutInterceptor` to cap long-running handlers.
- `TransformInterceptor` if you want a uniform `{ data, meta }` envelope at the API edge.

Do not put authorization, validation, or business logic in an interceptor.

## Exception filters

- Domain exceptions extend `HttpException` and carry a stable error code.
- Map Prisma errors centrally in `PrismaExceptionFilter`. Controllers and services never `catch` Prisma errors.

```ts
export class JobNotFoundException extends NotFoundException {
  constructor(jobId: string) {
    super({ code: 'JOB_NOT_FOUND', message: `Job ${jobId} was not found` });
  }
}
```

## Custom decorators

Build a small set, no more. The common ones.

```ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user;
  },
);

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
```

If a decorator is used in one place, inline the logic instead.

## Lifecycle hooks

- `onModuleInit` for setup that requires DI (e.g., warming a cache, registering listeners).
- `onModuleDestroy` for cleanup (closing custom connections).
- Never put a `setInterval` in a constructor. Use `@Cron` from `@nestjs/schedule`.

## Configuration

- One `ConfigModule` at the root with a Joi or Zod schema validating every env var at boot.
- `ConfigService.get<T>(key, { infer: true })` everywhere. Never `process.env`.
- Secrets stay in `.env` (gitignored) and in the deployment platform's secret store.

```ts
// core/config/config.schema.ts
export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
});

export type AppConfig = z.infer<typeof configSchema>;
```

If a required env var is missing, the app must fail at boot, not at first request.

## GraphQL (when enabled)

- Code-first with `@nestjs/graphql` and the Apollo driver.
- One resolver per aggregate, mirroring the REST controller.
- DTOs and types are shared between REST and GraphQL when possible (via shared response DTOs).
- N+1 is solved with DataLoader, not by hoping.

## WebSocket gateway

- One gateway per feature when realtime is part of the feature.
- Authenticate the connection in `handleConnection` using the same JWT strategy as HTTP.
- Rooms are scoped by tenant. A client subscribed to `tenant:{operatorId}:jobs` only sees its operator's events.
