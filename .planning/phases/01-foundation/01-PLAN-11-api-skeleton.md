---
phase: 01-foundation
plan: "11"
type: execute
wave: 2
depends_on:
  - "10"
files_modified:
  - apps/api/src/core/config/config.schema.ts
  - apps/api/src/core/config/config.module.ts
  - apps/api/src/core/prisma/prisma.service.ts
  - apps/api/src/core/prisma/prisma.module.ts
  - apps/api/src/core/redis/redis.service.ts
  - apps/api/src/core/redis/redis.module.ts
  - apps/api/src/core/core.module.ts
  - apps/api/src/common/guards/cloudflare-secret.guard.ts
  - apps/api/src/modules/health/redis.health.ts
  - apps/api/src/modules/health/prisma.health.ts
  - apps/api/src/modules/health/health.controller.ts
  - apps/api/src/modules/health/health.module.ts
  - apps/api/src/app.module.ts
  - apps/api/.env
autonomous: true
requirements:
  - INFRA-06
  - INFRA-01

must_haves:
  truths:
    - "GET /healthz returns 200 { status: 'ok' } with no x-cloudflare-secret header"
    - "GET /readyz returns 200 { status: 'ok', database: { status: 'up' }, redis: { status: 'up' } } when DB+Redis are reachable"
    - "Any request without x-cloudflare-secret (except /healthz and /readyz) returns 401"
    - "pnpm dev API on :3000 starts without errors"
    - "pnpm --filter @crewmate/api typecheck exits 0"
    - "Missing required env var (e.g. DATABASE_URL) causes boot failure with descriptive error"
  artifacts:
    - path: "apps/api/src/core/config/config.schema.ts"
      provides: "Zod schema + AppConfig type; only valid source of env var shapes"
      exports: ["configSchema", "AppConfig"]
    - path: "apps/api/src/core/prisma/prisma.service.ts"
      provides: "PrismaService extending PrismaClient; onModuleInit / onModuleDestroy"
      exports: ["PrismaService"]
    - path: "apps/api/src/core/redis/redis.service.ts"
      provides: "ioredis Redis instance; REDIS_TOKEN injection token"
      exports: ["RedisService", "REDIS_TOKEN"]
    - path: "apps/api/src/common/guards/cloudflare-secret.guard.ts"
      provides: "CloudflareSecretGuard; bypasses /healthz + /readyz"
      exports: ["CloudflareSecretGuard"]
    - path: "apps/api/src/modules/health/health.controller.ts"
      provides: "GET /healthz (liveness) + GET /readyz (readiness)"
      exports: ["HealthController"]
    - path: "apps/api/src/app.module.ts"
      provides: "AppModule wiring CoreModule + HealthModule; APP_GUARD for CloudflareSecretGuard"
      exports: ["AppModule"]
  key_links:
    - from: "apps/api/src/app.module.ts"
      to: "apps/api/src/core/core.module.ts"
      via: "CoreModule import in AppModule.imports"
      pattern: "CoreModule"
    - from: "apps/api/src/app.module.ts"
      to: "apps/api/src/modules/health/health.module.ts"
      via: "HealthModule import in AppModule.imports"
      pattern: "HealthModule"
    - from: "apps/api/src/app.module.ts"
      to: "apps/api/src/common/guards/cloudflare-secret.guard.ts"
      via: "APP_GUARD provider"
      pattern: "APP_GUARD.*CloudflareSecretGuard"
    - from: "apps/api/src/modules/health/health.controller.ts"
      to: "@nestjs/terminus"
      via: "HealthCheckService.check()"
      pattern: "HealthCheckService"
---

<objective>
Build the NestJS API skeleton: CoreModule (config + Prisma + Redis) + HealthModule (/healthz + /readyz)
+ CloudflareSecretGuard globally applied. When complete, `pnpm dev` starts the API on :3000, /healthz
returns 200, and any request without x-cloudflare-secret returns 401 (except the health routes).

Purpose: Delivers INFRA-06 (health endpoints) and the ALB shared-secret enforcement (INFRA-01).
These are the two Phase 1 acceptance criteria that require running server code.

Output:
- apps/api/src/core/ — config, prisma, redis modules (CoreModule)
- apps/api/src/common/guards/cloudflare-secret.guard.ts
- apps/api/src/modules/health/ — HealthModule + controller + two custom indicators
- apps/api/src/app.module.ts — wired with CoreModule + HealthModule + APP_GUARD
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@.planning/phases/01-foundation/01-10-SUMMARY.md

@apps/api/src/main.ts
@apps/api/src/app.module.ts
@apps/api/package.json
@docs/guardrails/shared/AGENT.md
@docs/guardrails/shared/00-architecture.md
@docs/guardrails/shared/01-conventions.md
@docs/guardrails/backend/00-nestjs.md
</context>

<interfaces>
<!-- Exact contracts the executor implements against -->

From main.ts (already wired — do NOT re-add):
  - app.useLogger(app.get(Logger))          ← nestjs-pino Logger
  - app.enableVersioning(URI, default '1')  ← /v1/ prefix on versioned routes
  - ValidationPipe with whitelist/forbidNonWhitelisted/transform
  - ClassSerializerInterceptor
  - app.enableCors(config.get('CORS_ORIGIN'))
  - SwaggerModule.setup('docs', ...)
  main.ts reads: const port = config.get('PORT', { infer: true });
  AppConfig type must be importable from './core/config/config.schema'

ConfigService usage pattern (from CONTEXT.md):
  // Correct — only valid pattern in this codebase
  this.config.get('CLOUDFLARE_SHARED_SECRET', { infer: true })
  // Banned — never use
  process.env.CLOUDFLARE_SHARED_SECRET

Zod config schema (exact shape from CONTEXT.md — do not deviate):
  export const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    WEBHOOK_SIGNING_SECRET: z.string().min(32),
    CLOUDFLARE_SHARED_SECRET: z.string().min(32),
    CORS_ORIGIN: z.string().optional(),
  });
  export type AppConfig = z.infer<typeof configSchema>;

CloudflareSecretGuard pattern (from RESEARCH.md Pattern 1):
  BYPASS_PATHS = new Set(['/healthz', '/readyz'])
  Reads x-cloudflare-secret header from req
  ConfigService.get('CLOUDFLARE_SHARED_SECRET', { infer: true })
  Throws UnauthorizedException({message:'Unauthorized'}) on missing/wrong secret
  IMPORTANT: health routes in HealthController use @Controller() with NO prefix and NO version
  (they don't have @Version() or the global default version prefix). Verify req.path is
  exactly '/healthz' and '/readyz' — not '/v1/healthz'. If versioning rewrites paths,
  use Reflector + a @SkipGuard() decorator instead. Smoke-test during task verify.

HealthController pattern (from 00-nestjs.md lines 201-224):
  @Controller()        ← NO prefix — routes at bare /healthz and /readyz
  export class HealthController {
    constructor(
      private readonly health: HealthCheckService,
      private readonly db: PrismaHealthIndicator,
      private readonly redis: RedisHealthIndicator,
    ) {}
    @Get('healthz') @HealthCheck()
    liveness() { return this.health.check([]); }
    @Get('readyz') @HealthCheck()
    readiness() {
      return this.health.check([
        () => this.db.pingCheck('database'),
        () => this.redis.pingCheck('redis'),
      ]);
    }
  }

Terminus indicators (custom — Terminus has no built-in Prisma or ioredis indicator):
  Each extends HealthIndicator, returns HealthIndicatorResult, throws HealthCheckError on fail.
  Prisma: this.prisma.$queryRaw`SELECT 1` wrapped in Promise.race 2s timeout.
  Redis: this.redisClient.ping() wrapped in Promise.race 2s timeout.
  (Full implementations in RESEARCH.md "Code Examples" section.)

APP_GUARD registration pattern (from RESEARCH.md Pattern 1):
  // In AppModule providers array:
  { provide: APP_GUARD, useClass: CloudflareSecretGuard }

Folder layout (create from scratch — nothing exists under src/core/ yet):
  apps/api/src/
  ├── core/
  │   ├── config/
  │   │   ├── config.schema.ts   (Zod schema + AppConfig type)
  │   │   └── config.module.ts   (ConfigModule.forRoot with Zod validate)
  │   ├── prisma/
  │   │   ├── prisma.service.ts  (PrismaService extends PrismaClient)
  │   │   └── prisma.module.ts   (exports PrismaService)
  │   ├── redis/
  │   │   ├── redis.service.ts   (creates ioredis client; exports REDIS_TOKEN)
  │   │   └── redis.module.ts    (provides + exports REDIS_TOKEN)
  │   └── core.module.ts         (imports ConfigModule, PrismaModule, RedisModule; exports all)
  ├── common/
  │   └── guards/
  │       └── cloudflare-secret.guard.ts
  └── modules/
      └── health/
          ├── prisma.health.ts
          ├── redis.health.ts
          ├── health.controller.ts
          └── health.module.ts
</interfaces>

<tasks>

<task type="auto" id="11-T1" tdd="true">
  <name>Task 1: CoreModule (config + Prisma + Redis) and CloudflareSecretGuard</name>
  <read_first>
    - apps/api/src/main.ts (see how ConfigService is used; imports from './core/config/config.schema')
    - apps/api/src/app.module.ts (current empty stub — will be edited in T2)
    - apps/api/package.json (verify @nestjs/config@^4, ioredis@^5 are present after wave 1.0)
    - docs/guardrails/shared/01-conventions.md (no default exports, no process.env, naming rules)
    - docs/guardrails/backend/00-nestjs.md (ConfigModule pattern, Guards section)
    - .planning/phases/01-foundation/01-CONTEXT.md (config schema, guard spec)
    - .planning/phases/01-foundation/01-RESEARCH.md (Pattern 1: guard; Common Pitfalls #4)
  </read_first>
  <files>
    apps/api/src/core/config/config.schema.ts,
    apps/api/src/core/config/config.module.ts,
    apps/api/src/core/prisma/prisma.service.ts,
    apps/api/src/core/prisma/prisma.module.ts,
    apps/api/src/core/redis/redis.service.ts,
    apps/api/src/core/redis/redis.module.ts,
    apps/api/src/core/core.module.ts,
    apps/api/src/common/guards/cloudflare-secret.guard.ts,
    apps/api/test/cloudflare-secret.guard.spec.ts
  </files>
  <behavior>
    - Test 1: CloudflareSecretGuard returns true when x-cloudflare-secret header matches config value
    - Test 2: CloudflareSecretGuard throws UnauthorizedException when x-cloudflare-secret header is missing
    - Test 3: CloudflareSecretGuard throws UnauthorizedException when x-cloudflare-secret header is wrong
    - Test 4: CloudflareSecretGuard returns true (bypasses) for GET /healthz with NO secret header
    - Test 5: CloudflareSecretGuard returns true (bypasses) for GET /readyz with NO secret header
  </behavior>
  <action>
    Create the following files (all are new — the src/core/ directory does not exist):

    --- apps/api/src/core/config/config.schema.ts ---
    import { z } from 'zod';

    export const configSchema = z.object({
      NODE_ENV: z.enum(['development', 'test', 'production']),
      PORT: z.coerce.number().int().positive().default(3000),
      DATABASE_URL: z.string().url(),
      REDIS_URL: z.string().url(),
      JWT_ACCESS_SECRET: z.string().min(32),
      JWT_REFRESH_SECRET: z.string().min(32),
      WEBHOOK_SIGNING_SECRET: z.string().min(32),
      CLOUDFLARE_SHARED_SECRET: z.string().min(32),
      CORS_ORIGIN: z.string().optional(),
    });

    export type AppConfig = z.infer<typeof configSchema>;

    --- apps/api/src/core/config/config.module.ts ---
    Use @nestjs/config ConfigModule.forRoot() with:
      isGlobal: true
      validate: (config) => configSchema.parse(config)
      expandVariables: false
    Export nothing explicitly (ConfigModule makes ConfigService globally available).
    Named export: ConfigCoreModule.

    --- apps/api/src/core/prisma/prisma.service.ts ---
    PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy:
      onModuleInit(): await this.$connect()
      onModuleDestroy(): await this.$disconnect()
    Named export only. No console.log — use no logging here (logger not yet injected).

    --- apps/api/src/core/prisma/prisma.module.ts ---
    @Module({ providers: [PrismaService], exports: [PrismaService] })
    Named export: PrismaModule.

    --- apps/api/src/core/redis/redis.service.ts ---
    Create ioredis client using REDIS_URL from ConfigService:
      const REDIS_TOKEN = 'REDIS_CLIENT';
      RedisService factory: reads 'REDIS_URL' from ConfigService, creates new Redis(url).
      Export both the service class and REDIS_TOKEN constant.
    Pattern: use a factory provider in redis.module.ts that injects ConfigService and returns
    the Redis instance, bound to REDIS_TOKEN.

    --- apps/api/src/core/redis/redis.module.ts ---
    Provide the Redis client via factory:
      {
        provide: REDIS_TOKEN,
        inject: [ConfigService],
        useFactory: (config: ConfigService<AppConfig, true>) =>
          new Redis(config.get('REDIS_URL', { infer: true })),
      }
    Export REDIS_TOKEN. Import ConfigCoreModule (or rely on global ConfigModule).

    --- apps/api/src/core/core.module.ts ---
    @Global() @Module({
      imports: [ConfigCoreModule, PrismaModule, RedisModule],
      exports: [ConfigCoreModule, PrismaModule, RedisModule],
    })
    Named export: CoreModule.
    @Global() ensures PrismaService and REDIS_TOKEN are available app-wide without re-importing.

    --- apps/api/src/common/guards/cloudflare-secret.guard.ts ---
    Implement exactly per RESEARCH.md Pattern 1 (reproduced here for no-ambiguity):

    import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
    import { ConfigService } from '@nestjs/config';
    import type { Request } from 'express';
    import type { AppConfig } from '../../core/config/config.schema';

    const BYPASS_PATHS = new Set(['/healthz', '/readyz']);

    @Injectable()
    export class CloudflareSecretGuard implements CanActivate {
      constructor(private readonly config: ConfigService<AppConfig, true>) {}

      canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request>();
        if (BYPASS_PATHS.has(req.path)) return true;
        const provided = req.header('x-cloudflare-secret');
        const expected = this.config.get('CLOUDFLARE_SHARED_SECRET', { infer: true });
        if (!provided || provided !== expected) {
          throw new UnauthorizedException({ message: 'Unauthorized' });
        }
        return true;
      }
    }

    PITFALL: health routes are registered on the bare controller with @Controller() (no prefix).
    NestJS URI versioning applies the /v1 prefix only to routes that are versioned. Bare @Get()
    routes on a @Controller() without version are NOT prefixed. So req.path will be '/healthz'
    and '/readyz'. Verify this in the tests (Test 4 + Test 5 above).

    --- apps/api/test/cloudflare-secret.guard.spec.ts ---
    Jest unit test covering the 5 behavior cases above. Use NestJS TestingModule to create a
    minimal module with CloudflareSecretGuard and a mock ConfigService that returns a known
    CLOUDFLARE_SHARED_SECRET. Create mock ExecutionContext objects with the needed request shape.

    RULE: tests go in apps/api/test/ per the jest config rootDir (it includes test/**).
    File must match: *.spec.ts (jest testRegex: .*\.spec\.ts$).
  </action>
  <verify>
    <automated>
      # Check all files created
      test -f apps/api/src/core/config/config.schema.ts
      test -f apps/api/src/core/config/config.module.ts
      test -f apps/api/src/core/prisma/prisma.service.ts
      test -f apps/api/src/core/prisma/prisma.module.ts
      test -f apps/api/src/core/redis/redis.service.ts
      test -f apps/api/src/core/redis/redis.module.ts
      test -f apps/api/src/core/core.module.ts
      test -f apps/api/src/common/guards/cloudflare-secret.guard.ts
      test -f apps/api/test/cloudflare-secret.guard.spec.ts
      # No process.env usage
      ! grep "process\.env" apps/api/src/core/config/config.schema.ts
      ! grep "process\.env" apps/api/src/common/guards/cloudflare-secret.guard.ts
      # BYPASS_PATHS in guard
      grep "BYPASS_PATHS" apps/api/src/common/guards/cloudflare-secret.guard.ts
      # Run the guard unit tests (RED→GREEN cycle)
      pnpm --filter @crewmate/api test -- --testPathPattern=cloudflare-secret
    </automated>
  </verify>
  <acceptance_criteria>
    - apps/api/src/core/config/config.schema.ts exports configSchema and AppConfig type
    - apps/api/src/core/config/config.schema.ts contains CLOUDFLARE_SHARED_SECRET field in Zod schema
    - apps/api/src/common/guards/cloudflare-secret.guard.ts contains BYPASS_PATHS with /healthz and /readyz
    - apps/api/src/common/guards/cloudflare-secret.guard.ts does NOT contain process.env
    - apps/api/src/core/core.module.ts contains @Global() decorator
    - pnpm --filter @crewmate/api test -- --testPathPattern=cloudflare-secret exits 0 with 5 passing tests
    - pnpm --filter @crewmate/api typecheck exits 0 (all new files type-check cleanly)
  </acceptance_criteria>
  <done>
    CoreModule files created; CloudflareSecretGuard implemented; guard unit tests pass (5/5).
  </done>
</task>

<task type="auto" id="11-T2" tdd="true">
  <name>Task 2: HealthModule (/healthz + /readyz) and AppModule wiring</name>
  <read_first>
    - apps/api/src/app.module.ts (current empty stub — this task fills it)
    - apps/api/src/core/core.module.ts (just created in T1 — import path needed)
    - apps/api/src/common/guards/cloudflare-secret.guard.ts (just created in T1)
    - docs/guardrails/backend/00-nestjs.md (lines 192-225 — HealthController + indicator pattern)
    - .planning/phases/01-foundation/01-RESEARCH.md (Terminus code examples section)
    - apps/api/.env (must exist for integration test — create if missing)
  </read_first>
  <files>
    apps/api/src/modules/health/redis.health.ts,
    apps/api/src/modules/health/prisma.health.ts,
    apps/api/src/modules/health/health.controller.ts,
    apps/api/src/modules/health/health.module.ts,
    apps/api/src/app.module.ts,
    apps/api/.env,
    apps/api/test/health.e2e-spec.ts
  </files>
  <behavior>
    - Test 1: GET /healthz returns 200 with body { status: 'ok' } regardless of DB/Redis state
    - Test 2: GET /readyz returns 200 when DB and Redis are reachable
    - Test 3: GET /readyz returns 503 when DB is unreachable (connection refused)
    - Test 4: GET /healthz succeeds with NO x-cloudflare-secret header (guard bypassed)
    - Test 5: GET /readyz succeeds with NO x-cloudflare-secret header (guard bypassed)
    - Test 6: GET /v1/non-health-route without x-cloudflare-secret returns 401
  </behavior>
  <action>
    1. Create apps/api/src/modules/health/prisma.health.ts — exact implementation from
       RESEARCH.md "Code Examples" section:
       - Extends HealthIndicator from @nestjs/terminus
       - Injects PrismaService
       - pingCheck(key): runs this.prisma.$queryRaw`SELECT 1` in a 2s Promise.race timeout
       - Returns this.getStatus(key, true) on success
       - Throws HealthCheckError('DB down', this.getStatus(key, false)) on failure

    2. Create apps/api/src/modules/health/redis.health.ts — exact implementation from
       RESEARCH.md "Code Examples" section:
       - Extends HealthIndicator from @nestjs/terminus
       - Injects the Redis client via @Inject(REDIS_TOKEN) (not a class injection — it's a token)
       - pingCheck(key): runs this.client.ping() in a 2s Promise.race timeout
       - Returns this.getStatus(key, res === 'PONG') on success
       - Throws HealthCheckError('Redis down', this.getStatus(key, false)) on failure

    3. Create apps/api/src/modules/health/health.controller.ts:
       @Controller() — NO prefix. This is critical: bare controller means routes are at
       /healthz and /readyz (not /v1/healthz). The URI versioning default applies only to
       versioned routes.
       Implement exactly per 00-nestjs.md lines 201-225 (reproduced in Interfaces section above).

    4. Create apps/api/src/modules/health/health.module.ts:
       @Module({
         imports: [TerminusModule],
         providers: [PrismaHealthIndicator, RedisHealthIndicator],
         controllers: [HealthController],
       })
       TerminusModule from @nestjs/terminus. PrismaService injected via CoreModule (global).
       RedisHealthIndicator needs REDIS_TOKEN — RedisModule is global via CoreModule.

    5. Edit apps/api/src/app.module.ts — replace the commented-out skeleton:
       @Module({
         imports: [CoreModule, HealthModule],
         providers: [
           { provide: APP_GUARD, useClass: CloudflareSecretGuard },
         ],
       })
       export class AppModule {}
       Import APP_GUARD from '@nestjs/core'.
       Leave all the commented-out feature module imports as comments (Phase 3 will add them).
       DO NOT add anything already in main.ts (ValidationPipe, Logger, versioning, etc.).

    6. Create apps/api/.env with local dev values:
       NODE_ENV=development
       PORT=3000
       DATABASE_URL=postgresql://crewmate:crewmate@localhost:5432/crewmate
       REDIS_URL=redis://localhost:6379
       JWT_ACCESS_SECRET=dev-access-secret-at-least-32-characters-long
       JWT_REFRESH_SECRET=dev-refresh-secret-at-least-32-chars-ok
       WEBHOOK_SIGNING_SECRET=dev-webhook-signing-secret-min-32-chars
       CLOUDFLARE_SHARED_SECRET=dev-cloudflare-shared-secret-min-32ch
       CORS_ORIGIN=http://localhost:3001
       Verify that JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, WEBHOOK_SIGNING_SECRET, and
       CLOUDFLARE_SHARED_SECRET are each at least 32 characters (Zod .min(32) enforces this).

    7. Create apps/api/test/health.e2e-spec.ts:
       e2e tests using @nestjs/testing + supertest. Create the full NestJS application in
       beforeAll(), connect to real Postgres and Redis via the env vars (tests run with service
       containers in CI). Test the 6 behaviors above.
       File must match .e2e-spec.ts suffix (test regex: .e2e-spec.ts$).

    NAMING RULES (from 01-conventions.md):
    - No default exports. Use named exports everywhere.
    - No any. No console.log.
    - File names: kebab-case. Class names: PascalCase.
  </action>
  <verify>
    <automated>
      # Check files
      test -f apps/api/src/modules/health/health.controller.ts
      test -f apps/api/src/modules/health/health.module.ts
      test -f apps/api/src/modules/health/prisma.health.ts
      test -f apps/api/src/modules/health/redis.health.ts
      test -f apps/api/test/health.e2e-spec.ts
      # app.module.ts wired
      grep "CoreModule" apps/api/src/app.module.ts
      grep "HealthModule" apps/api/src/app.module.ts
      grep "APP_GUARD" apps/api/src/app.module.ts
      grep "CloudflareSecretGuard" apps/api/src/app.module.ts
      # Health controller has no prefix
      grep '@Controller()' apps/api/src/modules/health/health.controller.ts
      ! grep '@Controller(' apps/api/src/modules/health/health.controller.ts | grep -v '@Controller()'
      # Typecheck
      pnpm --filter @crewmate/api typecheck
      # Unit test (guard — from T1) still passes
      pnpm --filter @crewmate/api test -- --testPathPattern=cloudflare-secret
    </automated>
  </verify>
  <acceptance_criteria>
    - apps/api/src/modules/health/health.controller.ts contains @Controller() with no argument (bare controller)
    - apps/api/src/modules/health/health.controller.ts contains @Get('healthz') and @Get('readyz')
    - apps/api/src/app.module.ts contains CoreModule in imports
    - apps/api/src/app.module.ts contains HealthModule in imports
    - apps/api/src/app.module.ts contains APP_GUARD provider bound to CloudflareSecretGuard
    - apps/api/.env contains CLOUDFLARE_SHARED_SECRET with value of at least 32 characters
    - apps/api/test/health.e2e-spec.ts exists and tests /healthz (200) and /readyz (200/503)
    - pnpm --filter @crewmate/api typecheck exits 0
    - pnpm --filter @crewmate/api test -- --testPathPattern=cloudflare-secret exits 0 (5 tests passing)
    - With docker compose up: pnpm --filter @crewmate/api test:e2e exits 0 (6 e2e tests passing)
    - No file under apps/api/src/ contains process.env (grep -r process\.env apps/api/src/ returns nothing)
    - No file under apps/api/src/ contains console.log (grep -r console\.log apps/api/src/ returns nothing)
  </acceptance_criteria>
  <done>
    HealthModule complete; /healthz + /readyz endpoints working; AppModule wired; CloudflareSecretGuard
    globally applied; all guard unit tests and health e2e tests pass.
  </done>
</task>

</tasks>

<verification>
Run from repo root after both tasks complete:
  pnpm --filter @crewmate/api typecheck                          # must exit 0
  pnpm --filter @crewmate/api test                               # must exit 0 (guard spec)
  pnpm --filter @crewmate/api test:e2e                           # must exit 0 (health e2e — requires docker compose up)
  grep -r "process\.env" apps/api/src/                          # must return nothing
  grep -r "console\.log" apps/api/src/                          # must return nothing
  grep "APP_GUARD" apps/api/src/app.module.ts                   # must match
  grep "CloudflareSecretGuard" apps/api/src/app.module.ts       # must match
</verification>

<success_criteria>
1. pnpm dev starts API on :3000 without errors
2. curl -s http://localhost:3000/healthz returns 200 { "status": "ok" }
3. curl -s http://localhost:3000/readyz returns 200 when docker compose services are up
4. curl -s http://localhost:3000/v1/any-route returns 401 (no x-cloudflare-secret)
5. pnpm --filter @crewmate/api typecheck exits 0
6. pnpm --filter @crewmate/api test exits 0 (5 guard unit tests)
7. pnpm --filter @crewmate/api test:e2e exits 0 (6 health e2e tests)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-11-SUMMARY.md` documenting:
- Exact file paths created
- Whether the health controller needed @Version() workaround or bare @Controller() worked
- Confirmation that req.path is /healthz (not /v1/healthz) — important for next phases
- Any Terminus 11 API differences from the RESEARCH.md code examples
- Test counts and pass status
</output>
