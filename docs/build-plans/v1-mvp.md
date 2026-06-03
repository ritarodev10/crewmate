# v1 — MVP

The thinnest working slice that proves the loop. A small ops team can log in, see jobs on a board, a worker can log in on their phone-sized view, transition a job through three states, and see it reflected on the board after a refresh.

Designed for 2-3 agents in parallel, ~4-6 hours wall-clock.

## Goal

Ship a single-tenant CrewMate where authentication, jobs, properties, workers, and a basic dispatch board are functional end to end. No realtime, no webhooks, no GraphQL, no RBAC layering beyond admin-vs-worker.

The point is to have something to demo and to use as the foundation for v2.

### In scope

- Email + password auth with JWT access + refresh tokens.
- One operator hardcoded in the seed (`Brookline Property Co.`).
- Two roles only, `admin` and `worker`, enforced via a single guard.
- Properties CRUD.
- Workers CRUD (a worker record is linked to a user).
- Jobs CRUD with a 3-state machine (`Scheduled` → `In Progress` → `Completed`).
- Dispatch board page (basic table grouped by status, refresh button, no WebSocket).
- Worker view page (mobile-shaped layout, today's jobs, one-tap transitions).
- Login page.
- Seed data so the demo works on a fresh clone.
- Jest unit tests for the job state machine and the auth flow.
- One supertest e2e for the happy path.

### Out of scope

- Multi-tenant scoping (every query just runs against the one operator).
- 4-layer RBAC, scopes, policies, audit log.
- Schedules entity, regions, custom roles.
- Webhooks, OutboxEvent, BullMQ workers.
- Realtime / WebSocket gateway.
- GraphQL server and client.
- shadcn/ui, Zustand, Apollo Client. Plain Tailwind and `fetch` only.
- Email, SMS, observability backends.
- CI workflow beyond `pnpm lint && pnpm typecheck && pnpm test`.
- Deployment.

## Tech stack for v1

Verify each at install time with `pnpm view <pkg> version`.

| Layer | Choice | Major |
|---|---|---|
| Runtime | Node | 22 LTS |
| Package manager | pnpm | 10 |
| Language | TypeScript (strict) | 5.6+ |
| API framework | NestJS | 11 |
| ORM | Prisma | 6 |
| Database | PostgreSQL (via Docker) | 17 |
| Auth | `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt` + `bcrypt` | latest |
| Validation | `class-validator` + `class-transformer` | latest |
| Web framework | Next.js (App Router) | 15 |
| React | React | 19 |
| Styling | Tailwind CSS | 4 |
| Tests | Jest + Supertest | 30 (Jest), latest (Supertest) |
| Local infra | Docker + docker-compose | latest |

## Phases

Wave 0 must complete before wave 1. Inside a wave all tasks run in parallel.

```
Wave 0 (1 task)      Bootstrap
Wave 1 (2 parallel)  DB schema slimmed for v1   |   Web bootstrap
Wave 2 (2 parallel)  API auth                   |   Web layout + auth UI
Wave 3 (3 parallel)  Properties API   |   Workers API   |   Jobs API + state machine
Wave 4 (3 parallel)  Dispatch board UI   |   Worker view UI   |   Seed data
Wave 5 (1 task)      End-to-end smoke + polish
```

## Tasks

### T-001 — Bootstrap repo and tooling

Owner: generalist · Depends on: — · Effort: ~1h

Files: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `docker-compose.yml`, `.env.example`, `.gitignore`, `.editorconfig`, `apps/api/package.json`, `apps/web/package.json`.

Steps:
1. Verify Node 22 LTS active (`node -v`). If not, `nvm use 22`.
2. `pnpm install` to install whatever is already declared.
3. Confirm `docker compose up -d postgres redis` brings up healthy containers (redis stays even though v1 doesn't use it, so v2 doesn't regress).
4. Generate `apps/api/.env` and `apps/web/.env.local` from the `.env.example` files, filling `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `WEBHOOK_SIGNING_SECRET` with `openssl rand -hex 32`.
5. `pnpm lint && pnpm typecheck` should both exit 0 (skeleton state).

Acceptance: `docker compose ps` shows postgres healthy and `pnpm --filter @crewmate/api typecheck` exits 0.

---

### T-002 — Slim Prisma schema to v1 set

Owner: backend-dev · Depends on: T-001 · Effort: ~1h

Files: `prisma/schema.prisma`, `prisma/migrations/*`.

Steps:
1. Read the existing `prisma/schema.prisma`. Keep `Operator`, `User`, `Property`, `Worker`, `Job`. Comment out `RoleGrant`, `PermissionAudit`, `Schedule`, `WebhookEndpoint`, `OutboxEvent`, leaving them in the file under a `// v2:` header so we don't rebuild them in v2.
2. On `User` keep `isSuperAdmin` and add `role` (string, `"admin" | "worker"`).
3. On `Job`, narrow `status` to the three v1 states. Document the enum values in a comment.
4. `pnpm --filter @crewmate/api db:migrate` to run the migration, named `001_v1_baseline`.
5. `pnpm --filter @crewmate/api prisma:generate`.

Acceptance: `psql $DATABASE_URL -c '\dt'` lists `operators`, `users`, `properties`, `workers`, `jobs` only.

---

### T-003 — Web bootstrap

Owner: frontend-dev · Depends on: T-001 · Effort: ~1h

Files: `apps/web/next.config.mjs`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/lib/api.ts`.

Steps:
1. Install Next 15, React 19, Tailwind 4. Confirm `pnpm --filter @crewmate/web dev` starts on port 3001.
2. Tailwind 4 config with the brand palette as CSS variables (`--ink: #1a1a1a`, `--accent: #1f3a5f`, `--amber: #d4a24c`, `--bone: #fafaf7`).
3. `apps/web/src/lib/api.ts` exports a typed `fetch` wrapper that attaches the access token from a cookie and refreshes on 401.

Acceptance: `pnpm --filter @crewmate/web dev` renders an empty page at `http://localhost:3001` with the Tailwind reset applied.

---

### T-004 — Auth module

Owner: backend-dev · Depends on: T-002 · Effort: ~2h

Files: `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/dto/*.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`, `apps/api/src/auth/guards/jwt-auth.guard.ts`, `apps/api/src/auth/guards/roles.guard.ts`, `apps/api/src/auth/decorators/roles.decorator.ts`, `apps/api/src/auth/*.spec.ts`.

Steps:
1. Build NestJS auth module. Endpoints `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`.
2. JWT access token (15 min), refresh token (7 days). Refresh tokens stored hashed in the user row or a `refresh_tokens` table — go with the table to keep revocation simple. Add it to the Prisma schema if needed.
3. `RolesGuard` reads a `@Roles('admin' | 'worker')` decorator on the route.
4. Unit tests for login (success, wrong password, unknown user) and refresh (success, expired, revoked).

Acceptance: `pnpm --filter @crewmate/api test -- auth` exits 0 and `curl -X POST http://localhost:3000/v1/auth/login -d '{"email":"admin@brookline.test","password":"password123"}' -H 'content-type: application/json'` returns `{ accessToken, refreshToken }`.

---

### T-005 — Web layout + login page

Owner: frontend-dev · Depends on: T-003, T-004 · Effort: ~2h

Files: `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/nav.tsx`, `apps/web/src/lib/auth-client.ts`.

Steps:
1. Login page styled to match `docs/images/ui/login.png`. Navy left panel, headline `Coordinate field work without the chaos.`, customer-logo placeholders, sign-in card on the right.
2. On submit, `POST /v1/auth/login`, set `access_token` and `refresh_token` as httpOnly cookies (server action), redirect to `/dispatch`.
3. App layout component for the dashboard area with the sidebar. Sidebar items linked to `/dispatch`, `/properties`, `/workers`. Worker role gets redirected to `/today` if they hit `/dispatch`.

Acceptance: `pnpm --filter @crewmate/web build` succeeds and visiting `/login` then logging in lands on `/dispatch` (or `/today` if worker).

---

### T-006 — Properties API

Owner: backend-dev · Depends on: T-004 · Effort: ~2h · Parallel-safe with: T-007, T-008

Files: `apps/api/src/properties/*`, `apps/api/src/properties/*.spec.ts`.

Steps:
1. NestJS module with controller, service, repository (Prisma-backed). Endpoints `GET /v1/properties`, `GET /v1/properties/:id`, `POST /v1/properties`, `PATCH /v1/properties/:id`, `DELETE /v1/properties/:id` (soft delete via `deletedAt`).
2. Validation DTOs.
3. Admin-only via `@Roles('admin')` on write routes. Read open to both roles.
4. Unit tests for the service and one supertest e2e for create + read.

Acceptance: `pnpm --filter @crewmate/api test -- properties` exits 0 and `curl -H "authorization: bearer $TOKEN" http://localhost:3000/v1/properties` returns the seeded list.

---

### T-007 — Workers API

Owner: backend-dev · Depends on: T-004 · Effort: ~2h · Parallel-safe with: T-006, T-008

Files: `apps/api/src/workers/*`, `apps/api/src/workers/*.spec.ts`.

Steps:
1. Same shape as T-006 but for `Worker`.
2. Endpoint `POST /v1/workers/:id/invite` creates a `User` with role `worker` and a temporary password. Return the temp password in the response (v1 only, dev convenience).
3. Tests.

Acceptance: as T-006.

---

### T-008 — Jobs API + state machine

Owner: backend-dev · Depends on: T-004 · Effort: ~3h · Parallel-safe with: T-006, T-007

Files: `apps/api/src/jobs/*`, `apps/api/src/jobs/job-state.ts`, `apps/api/src/jobs/*.spec.ts`.

Steps:
1. CRUD endpoints as T-006.
2. Transition endpoint `POST /v1/jobs/:id/transition` with body `{ to: 'IN_PROGRESS' | 'COMPLETED' }`.
3. `job-state.ts` exports a pure function `canTransition(from, to, actorRole): boolean | string` that returns `true` or a reason. Only the assigned worker can move `Scheduled` → `In Progress` → `Completed`. Admin can cancel.
4. Unit tests for every valid and invalid transition.
5. Reference `docs/images/diagrams/job-state-machine.png` for the allowed edges. v1 uses only the first three states.

Acceptance: `pnpm --filter @crewmate/api test -- jobs` exits 0. Invalid transitions return HTTP 409 with a reason.

---

### T-009 — Dispatch board UI

Owner: frontend-dev · Depends on: T-005, T-008 · Effort: ~3h · Parallel-safe with: T-010

Files: `apps/web/src/app/(app)/dispatch/page.tsx`, `apps/web/src/app/(app)/dispatch/_components/*`.

Steps:
1. Server-rendered table grouped by status (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`).
2. Each row shows property name, scheduled time, assigned worker, and status pill.
3. A `Refresh` button at the top (no realtime in v1).
4. Reference `docs/images/ui/dispatch-board.png` for layout intent. v1 simplification is fine — three sections instead of four, no amber active-dot.
5. Admin-only page (worker role redirects to `/today`).

Acceptance: visiting `/dispatch` as admin renders the seeded jobs grouped by status.

---

### T-010 — Worker view UI

Owner: frontend-dev · Depends on: T-005, T-008 · Effort: ~3h · Parallel-safe with: T-009

Files: `apps/web/src/app/(app)/today/page.tsx`, `apps/web/src/app/(app)/today/_components/*`.

Steps:
1. Worker logs in, lands on `/today`, sees their assigned jobs for the current date.
2. Each job is a card with property, time, status pill, and a primary action button (`Start` → moves to `In Progress`, `Mark Completed` → moves to `Completed`).
3. Layout shaped for mobile width. Reference `docs/images/ui/worker-mobile.png`.
4. Action button POSTs to `/v1/jobs/:id/transition`, re-fetches on success.

Acceptance: logging in as `worker1@brookline.test` lands on `/today` with that worker's seed jobs and the Start button on each visible.

---

### T-011 — Seed data

Owner: backend-dev · Depends on: T-006, T-007, T-008 · Effort: ~1h · Parallel-safe with: T-009, T-010

Files: `prisma/seed.ts`.

Steps:
1. One operator `Brookline Property Co.`.
2. One admin user `admin@brookline.test` / `password123`.
3. Three workers, each with a user account, `worker1`..`worker3@brookline.test`, password `password123`.
4. Three properties.
5. Twelve jobs distributed across today and tomorrow, mixing statuses.
6. Print demo credentials at the end.

Acceptance: `pnpm --filter @crewmate/api db:reset && pnpm --filter @crewmate/api db:seed` runs cleanly and prints credentials.

---

### T-012 — End-to-end smoke + polish

Owner: generalist · Depends on: T-009, T-010, T-011 · Effort: ~2h

Files: `apps/api/test/v1-smoke.e2e-spec.ts`, plus any final polish across the stack.

Steps:
1. e2e test that walks: login as worker, fetch today's jobs, transition the first one to `In Progress`, transition to `Completed`, log out.
2. Cross-check the dispatch board shows the right counts.
3. `pnpm lint && pnpm typecheck && pnpm test` all green.
4. Update `README.md` `Status` line to `v1.0 shipped` if everything passes.

Acceptance: `pnpm --filter @crewmate/api test:e2e -- v1-smoke` exits 0.

## Definition of done for v1

A human runs the following and gets a green path through:

```bash
git clean -fdX                                                      # clean slate
pnpm install
docker compose up -d postgres
pnpm --filter @crewmate/api db:migrate
pnpm --filter @crewmate/api db:seed                                 # prints creds
pnpm dev                                                            # starts api + web

# In another terminal:
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @crewmate/api test:e2e
```

Then, in a browser:

1. Visit `http://localhost:3001/login`, log in as the seeded admin, see seeded jobs on `/dispatch`.
2. Log out. Log in as `worker1@brookline.test`, see today's jobs on `/today`, click `Start` on one, then `Mark Completed`, refresh the dispatch board as admin, see the status updated.

If both of those work, v1 is shipped.
