---
phase: 01-foundation
plan: "11"
subsystem: api
tags: [nestjs, config, prisma, redis, health-check, terminus, guards, cloudflare]

dependency_graph:
  requires:
    - phase: 01-10
      provides: correct-version-foundation, nestjs11-deps, terminus-installed
  provides:
    - CoreModule (config + prisma + redis globally available)
    - CloudflareSecretGuard (APP_GUARD, bypasses /healthz + /readyz)
    - HealthModule (/healthz liveness, /readyz readiness with DB + Redis checks)
    - AppModule wired and ready for feature modules
    - apps/api/.env local dev values
  affects:
    - 01-12-web-skeleton
    - 01-13-infra
    - 01-14-ci-cd
    - phase-03-backend-api

tech-stack:
  added: []
  patterns:
    - Zod schema for env validation at boot (fail-fast)
    - pnpm .npmrc public-hoist-pattern for @prisma/* to enable prisma generate in monorepo
    - VERSION_NEUTRAL on HealthController to keep routes at bare /healthz and /readyz
    - APP_GUARD CloudflareSecretGuard globally applied
    - Custom Terminus indicators (PrismaHealthIndicator + RedisHealthIndicator with 2s timeout)

key-files:
  created:
    - apps/api/src/core/config/config.schema.ts
    - apps/api/src/core/config/config.module.ts
    - apps/api/src/core/prisma/prisma.service.ts
    - apps/api/src/core/prisma/prisma.module.ts
    - apps/api/src/core/redis/redis.service.ts
    - apps/api/src/core/redis/redis.module.ts
    - apps/api/src/core/core.module.ts
    - apps/api/src/common/guards/cloudflare-secret.guard.ts
    - apps/api/src/common/guards/cloudflare-secret.guard.spec.ts
    - apps/api/src/modules/health/prisma.health.ts
    - apps/api/src/modules/health/redis.health.ts
    - apps/api/src/modules/health/health.controller.ts
    - apps/api/src/modules/health/health.module.ts
    - apps/api/test/health.e2e-spec.ts
    - apps/api/test/setup.ts
    - apps/api/.env
    - .npmrc
  modified:
    - apps/api/src/app.module.ts
    - apps/api/test/jest-e2e.json
    - apps/api/tsconfig.json

key-decisions:
  - "Used VERSION_NEUTRAL on HealthController instead of bare @Controller() so health routes stay at /healthz and /readyz when URI versioning with defaultVersion is active"
  - "Added .npmrc with public-hoist-pattern[]=@prisma/* to enable prisma generate in pnpm monorepo where schema lives outside the api package"
  - "req.path is /healthz (not /v1/healthz) when VERSION_NEUTRAL is used — confirmed by e2e tests"
  - "Merged worktree-agent-aa2441ddf8d481347 (plan 01-10) into this worktree as plan-10 commits were not yet merged to main"

patterns-established:
  - "Pattern: REDIS_TOKEN injection token for ioredis Redis client via factory provider"
  - "Pattern: CloudflareSecretGuard uses BYPASS_PATHS Set for exact path matching (req.path)"
  - "Pattern: Custom Terminus indicators extend HealthIndicator, use Promise.race 2s timeout"
  - "Pattern: VERSION_NEUTRAL for infrastructure routes that must not receive the /v1/ prefix"

requirements-completed: [INFRA-06, INFRA-01]

duration: ~45min
completed: 2026-06-04
---

# Phase 1 Plan 11: API Skeleton Summary

**NestJS API skeleton: CoreModule (Zod config + Prisma + Redis) + CloudflareSecretGuard globally applied + HealthModule (/healthz + /readyz) with custom Terminus indicators, all wired in AppModule.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-06-04T08:00:00Z
- **Completed:** 2026-06-04T08:45:00Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- CoreModule with Zod env validation (fail-fast), PrismaService, and Redis factory provider globally available app-wide
- CloudflareSecretGuard (APP_GUARD) enforcing x-cloudflare-secret on all routes, bypassing /healthz and /readyz
- HealthModule with VERSION_NEUTRAL routes at /healthz (liveness) and /readyz (readiness: DB + Redis with 2s timeouts)
- 5 guard unit tests + 5 health e2e tests passing; typecheck passing
- req.path verified to be /healthz (not /v1/healthz) — guard BYPASS_PATHS works correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: CoreModule + CloudflareSecretGuard** - `1a8452c` (feat)
2. **Task 2: HealthModule + AppModule wiring** - `8d77f2d` (feat)

## Files Created/Modified

- `apps/api/src/core/config/config.schema.ts` - Zod schema + AppConfig type
- `apps/api/src/core/config/config.module.ts` - ConfigCoreModule with forRoot Zod validation
- `apps/api/src/core/prisma/prisma.service.ts` - PrismaService extending PrismaClient
- `apps/api/src/core/prisma/prisma.module.ts` - PrismaModule exporting PrismaService
- `apps/api/src/core/redis/redis.service.ts` - REDIS_TOKEN constant + redisFactory
- `apps/api/src/core/redis/redis.module.ts` - RedisModule with factory provider
- `apps/api/src/core/core.module.ts` - @Global() CoreModule importing all sub-modules
- `apps/api/src/common/guards/cloudflare-secret.guard.ts` - CloudflareSecretGuard with BYPASS_PATHS
- `apps/api/src/common/guards/cloudflare-secret.guard.spec.ts` - 5 guard unit tests
- `apps/api/src/modules/health/prisma.health.ts` - PrismaHealthIndicator (SELECT 1, 2s timeout)
- `apps/api/src/modules/health/redis.health.ts` - RedisHealthIndicator (ping, 2s timeout)
- `apps/api/src/modules/health/health.controller.ts` - VERSION_NEUTRAL /healthz + /readyz
- `apps/api/src/modules/health/health.module.ts` - HealthModule importing TerminusModule
- `apps/api/src/app.module.ts` - Wired: CoreModule + HealthModule + APP_GUARD
- `apps/api/test/health.e2e-spec.ts` - 5 e2e tests (healthz/readyz + guard bypass)
- `apps/api/test/setup.ts` - reflect-metadata import for e2e
- `apps/api/test/jest-e2e.json` - Added forceExit: true
- `apps/api/tsconfig.json` - rootDir changed from ./src to ./ to include test/ files
- `apps/api/.env` - Local dev env vars (gitignored)
- `.npmrc` - public-hoist-pattern for @prisma/* to fix prisma generate in pnpm monorepo

## Decisions Made

1. **VERSION_NEUTRAL on HealthController**: NestJS URI versioning with `defaultVersion: '1'` would apply `/v1/` prefix to unversioned routes. Using `VERSION_NEUTRAL` explicitly excludes the health routes from versioning, keeping them at bare `/healthz` and `/readyz`. This satisfies the bypass path check in CloudflareSecretGuard (`req.path === '/healthz'`).

2. **public-hoist-pattern in .npmrc**: pnpm isolates packages per workspace member. `prisma generate` reads the schema from `prisma/schema.prisma` (workspace root) but `@prisma/client` was only installed in `apps/api`. Adding `public-hoist-pattern[]=@prisma/*` to `.npmrc` hoists prisma packages to the workspace root's `node_modules`, resolving the auto-install failure.

3. **Merged plan-10 branch before executing**: This worktree was created before plan-10's commits were merged to main. The plan-10 worktree (`worktree-agent-aa2441ddf8d481347`) was merged in to get NestJS 11 + @nestjs/terminus dependency.

4. **Test 6 adjusted**: The plan's Test 6 ("GET /v1/non-health-route returns 401") relies on APP_GUARD running for non-existent routes. In NestJS, APP_GUARD only fires for matched routes; unmatched routes return 404 without running guards. Test 6 was updated to verify the guard allows requests with the correct secret header (guard integration) while unit tests cover the 401 rejection path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HealthController VERSION_NEUTRAL**
- **Found during:** Task 2 (e2e test verification)
- **Issue:** With URI versioning + `defaultVersion: '1'`, `@Controller()` routes get `/v1/` prefix. `/healthz` was returning 404 in the versioned test setup.
- **Fix:** Changed `@Controller()` to `@Controller({ version: VERSION_NEUTRAL })` to explicitly exclude health routes from versioning
- **Files modified:** `apps/api/src/modules/health/health.controller.ts`
- **Verification:** e2e tests pass with `enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` active; req.path is `/healthz` not `/v1/healthz`
- **Committed in:** `8d77f2d` (Task 2 commit)

**2. [Rule 1 - Bug] tsconfig.json rootDir fix**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** `rootDir: ./src` with `include: test/**/*` caused TypeScript error TS6059 — test files not under rootDir
- **Fix:** Changed `rootDir` from `./src` to `./` to encompass both `src/` and `test/`
- **Files modified:** `apps/api/tsconfig.json`
- **Verification:** `pnpm --filter @crewmate/api typecheck` exits 0
- **Committed in:** `8d77f2d` (Task 2 commit)

**3. [Rule 3 - Blocking] Added .npmrc for pnpm @prisma/* hoisting**
- **Found during:** Task 1 (typecheck verification — Prisma client not generated)
- **Issue:** `prisma generate` failed in pnpm monorepo because `@prisma/client` wasn't resolvable from the schema directory
- **Fix:** Created `.npmrc` with `public-hoist-pattern[]=@prisma/*` and re-ran `pnpm install` to hoist prisma packages to workspace root
- **Files modified:** `.npmrc`, `pnpm-lock.yaml`
- **Verification:** `prisma generate` succeeded; `PrismaClient` type available in api workspace
- **Committed in:** `1a8452c` (Task 1 commit)

**4. [Rule 3 - Blocking] Merged plan-10 branch**
- **Found during:** Task 1 (pnpm install — NestJS 10 was in package.json, @nestjs/terminus missing)
- **Issue:** This worktree was created from initial commit, before plan-10 version bumps were merged
- **Fix:** Ran `git merge worktree-agent-aa2441ddf8d481347` to get plan-10 changes (NestJS 11 + terminus)
- **Files modified:** `apps/api/package.json`, `apps/web/package.json`, + plan-10 files
- **Verification:** `@nestjs/terminus@^11.0.0` in deps; `@nestjs/core@^11.0.0` confirmed
- **Committed in:** merge commit (pre-existing branch state)

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and to unblock execution. VERSION_NEUTRAL is actually the correct pattern for infrastructure routes. No scope creep.

## Issues Encountered

- **pnpm monorepo + prisma generate**: Classic pnpm isolation issue where `prisma generate` couldn't resolve `@prisma/client` from the schema directory. Fixed with `.npmrc` hoisting.
- **NestJS URI versioning + bare @Controller()**: With `defaultVersion: '1'`, ALL unversioned routes including `@Controller()` get the `/v1/` prefix. `VERSION_NEUTRAL` is the correct fix to exempt infrastructure routes.
- **Multiple background e2e test processes**: The background task mechanism spawned multiple jest processes. Used `--forceExit` and direct `node_modules/.bin/jest` invocation to get clean results.

## User Setup Required

None — `apps/api/.env` is created with local dev values. `pnpm dev` should start the API on :3000 after `docker compose up -d postgres redis`.

## Next Phase Readiness

- API skeleton is ready: `pnpm dev` starts API on :3000
- `/healthz` returns 200 (no secret needed)
- `/readyz` returns 200 when docker compose services are up
- All requests without `x-cloudflare-secret` return 401 (except health routes)
- CoreModule (config + Prisma + Redis) globally available for feature modules in Phase 3
- AppModule ready to accept feature modules (commented-out slots already in place)

---
*Phase: 01-foundation*
*Completed: 2026-06-04*

## Known Stubs

None — all implemented functionality is complete and verified.

## Self-Check: PASSED

Files verified:
- `apps/api/src/core/config/config.schema.ts` - FOUND
- `apps/api/src/core/core.module.ts` - FOUND
- `apps/api/src/common/guards/cloudflare-secret.guard.ts` - FOUND
- `apps/api/src/modules/health/health.controller.ts` - FOUND
- `apps/api/src/app.module.ts` - FOUND (wired)
- `.npmrc` - FOUND
- Commit `1a8452c` - FOUND
- Commit `8d77f2d` - FOUND
