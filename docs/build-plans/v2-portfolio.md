# v2 — Portfolio

The full v0.1 spec described in the main README. Multi-tenant, four-layer RBAC, real-time dispatch board, signed-webhook spine, audit log, and all eight UI screens rendered in `docs/images/ui/`.

Designed for 6-10 agents in parallel, ~10-14 hours wall-clock.

## Goal

Deliver the portfolio-grade build a reviewer can clone, run, and read end to end. Every architectural decision documented in `nestjs-ai-guardrails/` is realized in code. Every UI screen in `docs/images/ui/` is implemented to that visual contract. The README's stack table and feature list are no longer aspirational — they're truthful.

### In scope (every bullet from the v0.1 list in the main README)

- Multi-tenant data layer. Every tenant-owned query carries `tenantId`. Enforcement at the repository layer.
- Four-layer authorization. Tenancy, hierarchical role (`super_admin → tenant_admin → coordinator → worker`), per-grant scope (tenant / region / property list), policy conditions evaluated at request, service, and query layers. Matches `nestjs-ai-guardrails/09-RBAC.md`.
- CRUD for operators, properties, workers, jobs, schedules.
- Job state machine: `Scheduled → En Route → In Progress → Completed → Verified`. Transitions gated by the state machine and the actor's role.
- Real-time dispatch board over WebSocket with tenant rooms.
- Webhook spine. Signed payloads, exponential backoff retries, delivery log table, failure visible in the operator UI.
- Permission audit log. Every allow and deny recorded.
- All eight UI screens (login, dispatch board, job detail drawer, schedule, webhook deliveries log, team and roles, analytics overview, worker mobile view) matching the rendered specs in `docs/images/ui/`.
- GraphQL server (code-first, Apollo) and Apollo Client on the web with a normalized cache and a WebSocket link for subscriptions.
- REST endpoints for everything that needs a stable contract for external consumers.
- pino structured logs and OpenTelemetry traces wired through.
- Seed data, e2e tests, integration tests, docker-compose, GitHub Actions CI.

### Out of scope

- Custom tenant-defined roles, time-bound role grants, impersonation, field-level masking. The schema and policy interfaces are ready for them, the implementation is in v3.
- Billing, invoicing, payments.
- Real email and SMS providers. Email is captured by MailHog locally and a stubbed delivery in `OutboxEvent` for any non-local target.
- Native mobile apps. The worker view is a responsive Next.js route, already mobile-shaped.
- Multi-region deployment, blue-green, geo replication.
- Audit log UI surfacing (the rows are written and visible via the API, not the dashboard).
- Bulk import/export, custom analytics dashboards beyond the seeded overview.
- AWS deployment. v2 is local + CI green only.

## Tech stack for v2

Resolve at install. The agent should `pnpm view <pkg> version` before pinning.

| Layer | Choice | Major | Notes |
|---|---|---|---|
| Runtime | Node | 22 LTS | |
| Package manager | pnpm | 10 | Workspaces |
| Language | TypeScript | 5.6+ | strict, isolatedModules |
| API framework | NestJS | 11 | Modules per feature |
| ORM | Prisma | 6 | Migrations via `prisma migrate` |
| Database | PostgreSQL | 17 | Local via Docker, prod via RDS in v3 |
| Cache + queues | Redis | 7.4+ | Single Redis serves both |
| Queues | BullMQ | 5 | Webhook delivery, notification stub |
| Auth | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `argon2` | latest | Argon2 for password hashing |
| Realtime | Native NestJS WebSocket gateway | 11 | No socket.io, native ws |
| GraphQL server | `@nestjs/graphql` (code-first) + Apollo Server 4 | 13+ for `@nestjs/graphql` | |
| GraphQL client | `@apollo/client` | 4 | Normalized cache, WS subscriptions |
| Server state (REST) | `@tanstack/react-query` | 5 | Non-GraphQL endpoints, file uploads, polling, optimistic updates |
| Validation | `class-validator`, `class-transformer`, `zod` | latest | Zod at the http/ws boundary, class-validator for DTO classes |
| Tests | Jest | 30 | + Supertest for HTTP, `@nestjs/testing` for modules |
| Logging | pino + `nestjs-pino` | 9 (pino) | JSON in prod, pretty in dev |
| Tracing | `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` | 1.x SDK, 0.50+ auto-instr | OTLP exporter, defaults to console in dev |
| Web framework | Next.js | 15 (App Router) | React Server Components for dashboards |
| React | React | 19 | |
| Styling | Tailwind CSS | 4 | Plus shared tokens via `@crewmate/ui` |
| UI components | shadcn/ui (on Radix) | rolling | Vendored under `apps/web/src/components/ui` |
| Client state | Zustand | 5 | Ephemeral UI only, never as a server-state cache |
| Animation | `motion` (rebrand of framer-motion) | 11+ | Declarative animation, consumes `--motion-*` tokens, honors `useReducedMotion` |
| Forms | react-hook-form + zod | latest | |
| Charts | Recharts or tremor (pick one) | latest | For analytics overview |
| Local infra | Docker + docker-compose | latest | Postgres, Redis, MailHog |
| CI | GitHub Actions | — | Postgres + Redis service containers |

## Phases

Tasks inside a wave are parallel-safe. A wave starts only after the prior wave's last task lands.

```
Wave 0  (1)   Bootstrap
Wave 1  (3)   DB schema + migrations  |  Web bootstrap + shadcn install  |  CI workflow
Wave 2  (4)   Auth API  |  Login + layout UI  |  RBAC scaffolding (guards, decorators, audit) |  Tenant-scoping pipe
Wave 3  (7)   Operators API  |  Properties API  |  Workers API  |  Jobs API  |  Schedules API  |  Webhooks endpoints config API  |  Audit log read API
Wave 4  (4)   Job state machine  |  Event bus + Outbox writer  |  WebSocket gateway with tenant rooms  |  BullMQ webhook delivery worker
Wave 5  (8)   Dispatch board UI  |  Job detail drawer  |  Schedule view  |  Worker mobile view  |  Webhook log UI  |  Team management UI  |  Analytics overview UI  |  Login (rebrand polish if not done in Wave 2)
Wave 6  (3)   GraphQL server resolvers  |  Apollo Client + WS link  |  Subscription wiring for dispatch board
Wave 7  (3)   Integration tests across modules  |  End-to-end happy path  |  Performance smoke on the dispatch board (1k jobs)
```

## Tasks

### T-101 — Bootstrap monorepo and tooling

Owner: generalist · Depends on: — · Effort: ~1h

Files: root configs, `apps/{api,web}/package.json`, `packages/{contracts,ui}/package.json`, `pnpm-workspace.yaml`.

Steps:
1. Verify Node 22 LTS, pnpm 10. `pnpm install` and resolve any peer warnings.
2. `docker compose up -d postgres redis mailhog` confirms all three are healthy.
3. `.env.example` files generated to align with `docs/AGENT-SETUP.md`. Fresh secrets via `openssl rand -hex 32`.
4. ESLint + Prettier + Husky pre-commit hook wired (`pnpm lint-staged` runs on staged files).
5. `commitlint` configured for Conventional Commits.

Acceptance: `pnpm lint`, `pnpm typecheck`, `pnpm test` all exit 0 on the skeleton, and a junk file with a bad commit message fails the hook.

---

### T-102 — Apply full Prisma schema and seed scaffolding

Owner: backend-dev · Depends on: T-101 · Effort: ~1.5h

Files: `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`.

Steps:
1. The current `prisma/schema.prisma` is already complete for v2. Validate with `pnpm prisma validate`.
2. `pnpm prisma migrate dev --name 001_v2_baseline` to materialize migrations.
3. Skeleton `seed.ts` that wires the seed driver but creates only the operator. Per-domain seeding is added in each feature task.

Acceptance: `pnpm prisma migrate reset --force` runs clean and `psql $DATABASE_URL -c '\dt'` lists all tables including `permission_audits`, `outbox_events`, `webhook_endpoints`.

---

### T-103 — Web bootstrap with shadcn and Apollo wiring stubs

Owner: frontend-dev · Depends on: T-101 · Effort: ~2h · Parallel-safe with: T-102

Files: `apps/web/next.config.mjs`, `apps/web/tailwind.config.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/ui/*` (shadcn vendored), `apps/web/src/lib/apollo-client.ts` (stub), `packages/ui/src/tokens.css`.

Steps:
1. Next.js 15 + React 19 + Tailwind 4. Confirm dev server boots on 3001.
2. `pnpx shadcn@latest init` then add a starter set: `button`, `input`, `card`, `table`, `badge`, `dialog`, `dropdown-menu`, `tabs`, `tooltip`, `sheet`, `avatar`, `separator`. Vendor under `apps/web/src/components/ui`.
3. Brand tokens in `packages/ui/src/tokens.css`. Import into `apps/web/src/app/globals.css`.
4. Apollo Client stub. The link, cache, and provider are set up but not yet wired to a server (server work is T-301). The web app should render with the provider mounted.
5. Zustand stub store `apps/web/src/stores/ui.ts` for ephemeral UI state.

Acceptance: `pnpm --filter @crewmate/web build` succeeds. shadcn `button` renders on a test page.

---

### T-104 — GitHub Actions CI

Owner: generalist · Depends on: T-101 · Effort: ~1h · Parallel-safe with: T-102, T-103

Files: `.github/workflows/ci.yml`.

Steps:
1. Single workflow on push and PR. Job matrix not needed.
2. Service containers for Postgres 17 and Redis 7. Wait-for-it loop on both.
3. Steps: checkout, setup-node@v4 with Node 22, pnpm install, lint, typecheck, build, test, prisma migrate, e2e test.
4. Cache pnpm store between runs.

Acceptance: a dummy PR shows the workflow running and going green.

---

### T-105 — Auth API + refresh tokens + audit hooks

Owner: backend-dev · Depends on: T-102 · Effort: ~3h

Files: `apps/api/src/auth/*`, `apps/api/src/auth/strategies/*`, `apps/api/src/auth/guards/*`, `apps/api/src/auth/decorators/*`, plus `prisma/schema.prisma` if a `RefreshToken` table is added (it should be).

Steps:
1. Endpoints `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`.
2. Argon2 for password hashing (`argon2id`, 64MB memory, 3 iterations).
3. Refresh tokens stored hashed in a new `refresh_tokens` table with `family_id` for rotation detection. On reuse, revoke the whole family.
4. Tenancy claim in the JWT (`operatorId`).
5. Audit hook: on every auth-related action (`login.success`, `login.failure`, `refresh.success`, `refresh.replay`, `logout`), write a row to `permission_audits`.
6. Unit tests for the rotation logic and replay detection. Supertest e2e for the happy path.

Acceptance: e2e test that simulates a refresh-token replay attack returns 401 and revokes the family.

---

### T-106 — Login + layout UI

Owner: frontend-dev · Depends on: T-103, T-105 · Effort: ~3h

Files: `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/login/actions.ts`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/sidebar.tsx`, `apps/web/src/components/topbar.tsx`.

Steps:
1. Login screen pixel-faithful to `docs/images/ui/login.png`.
2. Server action sets httpOnly cookies on success, redirects per role.
3. Authenticated layout with sidebar + topbar (matching the chrome visible in all `docs/images/ui/*.png` desktop screens).
4. Active nav state via `usePathname()`.

Acceptance: human compare against `docs/images/ui/login.png`. Lighthouse accessibility score 95+ on the login page.

---

### T-107 — RBAC scaffolding

Owner: backend-dev · Depends on: T-102, T-105 · Effort: ~3h · Parallel-safe with: T-106

Files: `apps/api/src/rbac/*`, `apps/api/src/rbac/policies/*`, `apps/api/src/common/decorators/scopes.decorator.ts`, `apps/api/src/common/guards/scope.guard.ts`, `apps/api/src/common/interceptors/audit.interceptor.ts`.

Steps:
1. Implement the four layers per `nestjs-ai-guardrails/09-RBAC.md`. Tenancy enforced at the repository layer (next task). Role + scope + policy enforced via NestJS guards and an audit interceptor.
2. `@Roles('coordinator', 'tenant_admin')` decorator at the route level.
3. `@Scoped('property')` decorator that resolves the scope from the request and rejects if the actor's role grant does not cover it.
4. `PolicyEvaluator` service with named policies (`canTransitionJob`, `canAssignWorker`, etc.) registered per feature. Returns `Allow | Deny(reason)`.
5. Audit interceptor writes a `permission_audits` row on every allow and deny, with the resolved subject id where possible.

Acceptance: a route protected by `@Roles('worker')` rejects an `admin` token; the deny is visible in `permission_audits`.

---

### T-108 — Tenant scoping pipe and Prisma client extension

Owner: backend-dev · Depends on: T-102, T-105 · Effort: ~2h · Parallel-safe with: T-106, T-107

Files: `apps/api/src/common/prisma/prisma.service.ts`, `apps/api/src/common/prisma/tenant-scope.extension.ts`, `apps/api/src/common/pipes/tenant.pipe.ts`.

Steps:
1. PrismaService with a request-scoped client extension that injects `operatorId` into every `where` clause for tenant-owned models.
2. Failing closed — if the request has no `operatorId` claim and the model is tenant-owned, the query throws.
3. Unit tests with a fake operator id that prove cross-tenant reads return zero rows.

Acceptance: a smoke test creating a job in tenant A and then querying as tenant B returns an empty list.

---

### T-201 — Operators API (super_admin only)

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~1.5h · Parallel-safe with all other T-2NN

Files: `apps/api/src/operators/*`.

Steps: Module + service + controller + tests. Endpoints: `GET /v1/operators`, `POST /v1/operators` (super_admin only), `PATCH /v1/operators/:id`. Slug uniqueness enforced.

Acceptance: super_admin can list operators; tenant_admin gets 403.

---

### T-202 — Properties API

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~2h · Parallel-safe with T-201, T-203…T-207

Files: `apps/api/src/properties/*`.

Steps: Module + service + repository + controller + DTOs + tests. CRUD with soft delete. `@Scoped('property')` on the read routes so coordinators only see their granted properties.

Acceptance: e2e — a coordinator scoped to two properties sees exactly those.

---

### T-203 — Workers API

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~2h · Parallel-safe

Files: `apps/api/src/workers/*`.

Steps: CRUD. `POST /v1/workers/:id/invite` creates a paired `User` with `role=worker`, emits an `OutboxEvent` of type `user.invited`. Stub email goes to MailHog locally.

Acceptance: invited worker appears in MailHog UI at `http://localhost:8025`.

---

### T-204 — Jobs API

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~2.5h · Parallel-safe

Files: `apps/api/src/jobs/*`.

Steps: CRUD endpoints. The transition endpoint moves to T-301. Filtering by status, assigned worker, date range, property.

Acceptance: list endpoint supports `?status=IN_PROGRESS&from=...&to=...` and respects scope.

---

### T-205 — Schedules API

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~2h · Parallel-safe

Files: `apps/api/src/schedules/*`.

Steps: A `Schedule` is a recurring template that materializes into Jobs. Endpoints to create, edit, pause, and explode a schedule into jobs for a date range. Reference `docs/images/ui/schedule.png` for what the UI expects to render.

Acceptance: `POST /v1/schedules/:id/materialize?from=...&to=...` creates jobs and is idempotent.

---

### T-206 — Webhook endpoints config API

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~1.5h · Parallel-safe

Files: `apps/api/src/webhooks/endpoints/*`.

Steps: CRUD for `WebhookEndpoint` rows. Generate a per-endpoint signing secret on create, return once, store hashed. Provide a `POST /v1/webhooks/endpoints/:id/test` that enqueues a synthetic delivery.

Acceptance: test delivery shows up in the queue and ends up in `webhook_deliveries`.

---

### T-207 — Audit log read API

Owner: backend-dev · Depends on: T-107, T-108 · Effort: ~1h · Parallel-safe

Files: `apps/api/src/audit/*`.

Steps: `GET /v1/audit` paginated, filterable by actor, subject, decision, date range. Tenant_admin and super_admin only.

Acceptance: e2e returns audit rows written by the auth-replay test from T-105.

---

### T-301 — Job state machine + transition endpoint

Owner: backend-dev · Depends on: T-204, T-107 · Effort: ~2h

Files: `apps/api/src/jobs/state/job-state.ts`, `apps/api/src/jobs/jobs.controller.ts` (extended), `apps/api/src/jobs/policies/*`.

Steps:
1. Pure `canTransition(from, to, actorRole, jobContext): Allow | Deny(reason)`.
2. All five edges from `docs/images/diagrams/job-state-machine.png`. Worker can move forward through SCHEDULED → EN_ROUTE → IN_PROGRESS → COMPLETED. Coordinator moves COMPLETED → VERIFIED. Admin can cancel from any non-VERIFIED state.
3. Transition endpoint emits a domain event (next task) on success.
4. Tests covering every allowed and disallowed edge.

Acceptance: unit tests exhaustively cover the matrix; invalid transitions return 409 with the reason in the body.

---

### T-302 — Event bus + outbox writer

Owner: backend-dev · Depends on: T-301 · Effort: ~2h

Files: `apps/api/src/events/*`, `apps/api/src/events/outbox.service.ts`.

Steps:
1. In-process EventBus (NestJS `EventEmitter2` is fine).
2. Outbox pattern. Each domain emit writes an `OutboxEvent` row in the same transaction as the state change. A small relay loop publishes to BullMQ for webhook fan-out.
3. Events: `job.created`, `job.assigned`, `job.status.changed`, `worker.invited`, `webhook.endpoint.created`.

Acceptance: a job transition writes both the new status and the outbox row in a single transaction (kill Postgres mid-flight test).

---

### T-303 — WebSocket gateway + tenant rooms

Owner: backend-dev · Depends on: T-302, T-105 · Effort: ~2h · Parallel-safe with T-304

Files: `apps/api/src/realtime/*`.

Steps:
1. Native NestJS WebSocket gateway, no socket.io.
2. Auth on the upgrade request using the same JWT as REST.
3. Each socket joins a `tenant:<operatorId>` room on connect.
4. Listen for `job.status.changed`, `job.assigned`, `webhook.delivery.*` events. Fan out to the right tenant room.
5. Drop scope-violating events. Tenant_admin sees all tenant events; coordinator and worker filter by their scope.

Acceptance: a test client connected as coordinator A receives a status-change event only when the changed job's property is in scope.

---

### T-304 — BullMQ webhook delivery worker

Owner: backend-dev · Depends on: T-302, T-206 · Effort: ~2.5h · Parallel-safe with T-303

Files: `apps/api/src/webhooks/delivery/*`, `apps/api/src/webhooks/delivery/sign.ts`.

Steps:
1. BullMQ queue `webhook-delivery`. Worker consumes outbox-relayed jobs.
2. Sign payload with the endpoint's HMAC secret, header `x-crewmate-signature: t=<ts>,v1=<sig>`.
3. Retry with exponential backoff (`1m, 5m, 25m, 2h, 12h`).
4. Persist every attempt in `webhook_deliveries` with status, response code, latency, attempt count.
5. On final failure, emit `webhook.delivery.failed` event.

Acceptance: a delivery to `http://nonexistent.localhost` retries the prescribed number of times and ends as `FAILED` in `webhook_deliveries`.

---

### T-401 — Dispatch board UI (with realtime)

Owner: frontend-dev · Depends on: T-106, T-204, T-303 · Effort: ~4h · Parallel-safe with all other T-4NN

Files: `apps/web/src/app/(app)/dispatch/*`, `apps/web/src/app/(app)/dispatch/_components/*`.

Steps:
1. Match `docs/images/ui/dispatch-board.png` exactly. Four columns, soft-gray panels, cards with property, worker pill, time chip, amber dot on the active in-progress job.
2. Initial data via server component + REST. Subscriptions via Apollo + WS link (Apollo wiring in T-501).
3. Optimistic UI on transitions, rollback on server reject.

Acceptance: open two browsers as admin, transition a job in one, the other reflects within ~500ms without a refresh.

---

### T-402 — Job detail drawer

Owner: frontend-dev · Depends on: T-401 · Effort: ~3h · Parallel-safe

Files: `apps/web/src/app/(app)/dispatch/_components/job-drawer.tsx`.

Steps: shadcn `Sheet` from the right. Header, status pill, horizontal stepper, details k/v, activity log timeline, action buttons. Match `docs/images/ui/job-detail.png`.

Acceptance: clicking a card opens the drawer; clicking `Mark Completed` transitions and updates the stepper.

---

### T-403 — Schedule week view

Owner: frontend-dev · Depends on: T-106, T-205 · Effort: ~4h · Parallel-safe

Files: `apps/web/src/app/(app)/schedule/*`.

Steps: weekly grid with workers in rows, days in columns, event blocks per job. Color rules per `docs/images/ui/schedule.png`.

Acceptance: rendering the seeded week matches the visual reference closely.

---

### T-404 — Worker mobile view

Owner: frontend-dev · Depends on: T-106, T-204, T-303, T-301 · Effort: ~3h · Parallel-safe

Files: `apps/web/src/app/(app)/today/*`.

Steps: mobile-shaped layout per `docs/images/ui/worker-mobile.png`. Date strip, current job card with amber border + `Mark Arrived`/`Mark Completed` action, scheduled cards, completed cards with checkmark. Bottom tab bar. Realtime updates via subscription.

Acceptance: walk through Start → Arrive → Complete on the worker view and see the dispatch board update in another window.

---

### T-405 — Webhook deliveries log UI

Owner: frontend-dev · Depends on: T-106, T-206, T-304 · Effort: ~3h · Parallel-safe

Files: `apps/web/src/app/(app)/webhooks/*`.

Steps: table per `docs/images/ui/webhook-log.png`. Filter chips. Selected-row right panel with the raw signed payload and headers. `Retry failed` action.

Acceptance: a failed delivery is visible with its payload; `Retry failed` re-enqueues.

---

### T-406 — Team and roles UI

Owner: frontend-dev · Depends on: T-106, T-201, T-203 · Effort: ~3h · Parallel-safe

Files: `apps/web/src/app/(app)/settings/team/*`.

Steps: member list with role pills, scope column, pending invitations card. Match `docs/images/ui/team-management.png`.

Acceptance: inviting a worker creates the user + worker + role grant in one flow and the row appears.

---

### T-407 — Analytics overview UI

Owner: frontend-dev · Depends on: T-106, T-204 · Effort: ~3h · Parallel-safe

Files: `apps/web/src/app/(app)/dashboard/*`, `apps/api/src/analytics/*` (a small read-only aggregation service).

Steps: 3 KPI cards, stacked area chart for status over time, horizontal bars for properties, sparkline list for workers. Match `docs/images/ui/analytics.png`. Aggregate via SQL views or pre-computed jobs.

Acceptance: the seeded data renders a non-empty version of each chart.

---

### T-501 — GraphQL server: resolvers and schema

Owner: backend-dev · Depends on: T-202 through T-207 · Effort: ~4h

Files: `apps/api/src/graphql/*`.

Steps:
1. Code-first `@nestjs/graphql`. Resolvers per domain.
2. Subscription `jobStatusChanged(operatorId, propertyId?)` backed by the same event bus that drives WebSocket.
3. Generated SDL committed at `packages/contracts/src/schema.graphql`.

Acceptance: `pnpm graphql:codegen` produces matching TS types in `@crewmate/contracts`.

---

### T-502 — Apollo Client + WS link

Owner: frontend-dev · Depends on: T-103, T-501 · Effort: ~2h

Files: `apps/web/src/lib/apollo-client.ts`, `apps/web/src/lib/apollo-provider.tsx`.

Steps: HTTP link for queries and mutations, WebSocket link for subscriptions. Auth link reads the access token cookie. Type-safe operations via `graphql-codegen`.

Acceptance: a sample subscription in the dispatch board fires on a transition.

---

### T-503 — Wire dispatch board to subscriptions

Owner: frontend-dev · Depends on: T-401, T-502 · Effort: ~1.5h

Files: `apps/web/src/app/(app)/dispatch/_components/*` (extended).

Steps: replace polling/refresh with a `useSubscription` and merge updates into the Apollo cache. Optimistic-update plumbing through.

Acceptance: dispatch board updates without manual refresh on transitions from any client.

---

### T-601 — Integration test pass

Owner: code-reviewer + backend-dev · Depends on: all of Wave 5 + Wave 6 · Effort: ~2h

Files: `apps/api/test/integration/*`.

Steps: integration tests against a real Postgres for each repository, focused on multi-tenant isolation and RBAC denials.

Acceptance: every domain has at least one integration test that creates data in tenant A and asserts tenant B cannot read it.

---

### T-602 — End-to-end happy path

Owner: generalist · Depends on: T-601 · Effort: ~2h

Files: `apps/api/test/e2e/v2-happy-path.e2e-spec.ts`.

Steps: full walk — login as coordinator → create job → assign worker → worker logs in on `/today` → start, arrive, complete → coordinator verifies → webhook delivery succeeds → analytics rolls up.

Acceptance: e2e exits 0 in CI.

---

### T-603 — Performance smoke on the dispatch board

Owner: perf-tester · Depends on: T-503 · Effort: ~1.5h

Files: `apps/api/test/perf/dispatch-1k-jobs.ts`, `docs/PERF-NOTES.md`.

Steps: seed 1000 jobs across one operator, load the dispatch board, measure initial server-component render time, first subscription event latency. Record findings in `docs/PERF-NOTES.md`.

Acceptance: dispatch board initial render under 1s on a developer laptop with 1k jobs; first subscription event under 200ms.

## Definition of done for v2

```bash
git clean -fdX
pnpm install
docker compose up -d postgres redis mailhog
pnpm prisma migrate reset --force
pnpm --filter @crewmate/api db:seed
pnpm dev

# In another terminal:
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @crewmate/api test:e2e
pnpm --filter @crewmate/api test:perf
```

Then in a browser, walk through:

1. Login as tenant_admin → dispatch board renders 15+ seed jobs across 4 columns with the active in-progress job marked amber.
2. Open the job detail drawer → stepper shows current state.
3. Open another browser as `worker1@brookline.test` → `/today` shows the worker's jobs.
4. Transition `Start → Arrive → Complete` on the worker view → admin's board updates without refresh, stepper advances.
5. Coordinator verifies the completed job → webhook delivery row appears in `/webhooks` with `Delivered 200`.
6. Force-fail a webhook by editing the endpoint URL to something unreachable → row goes through retry attempts and lands as `Failed` after the schedule.
7. Visit `/dashboard` → analytics charts non-empty.
8. Visit `/settings/team` → invite a worker → MailHog at `:8025` shows the invitation email.

If all eight pass, v2 is shipped and the portfolio README is no longer aspirational.
