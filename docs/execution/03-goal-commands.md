# 03 — /goal Commands

One entry per phase/wave. Copy the `/goal` block, paste it into Claude Code, press Enter.

GSD must be initialized (`.planning/` exists) before running any goal.
After each phase completes (`PHASE_N_GATE` appears in the transcript), stop and review before running the next phase.

---

## Phase 1 — Foundation and skeleton deploy

### Wave 1.0 — pnpm workspace + root configs
**GSD task:** `p1-t1`
**Branch:** `task/p1-foundation-pnpm-workspace`

```
/goal
Bootstrap the pnpm monorepo. Done when:
- pnpm install resolves without errors
- package.json, pnpm-workspace.yaml, tsconfig.base.json, .editorconfig, .eslintrc, .prettierrc exist at repo root
- pnpm lint exits 0 on an empty workspace
- pnpm typecheck exits 0 on an empty workspace
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-foundation-pnpm-workspace

Read: docs/guardrails/shared/00-architecture.md, docs/guardrails/shared/01-conventions.md
Files in scope: repo root config files only. Do not touch apps/ or packages/ content yet.
— or stop after 20 turns
```

### Wave 1.0 — docker-compose
**GSD task:** `p1-t2`
**Branch:** `task/p1-docker-compose`

```
/goal
Add docker-compose.yml with postgres 17, redis 7, mailhog services. Done when:
- docker compose up -d exits 0
- docker compose ps shows all three services healthy
- .env.example documents all connection strings
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-docker-compose

Files in scope: docker-compose.yml, .env.example
— or stop after 20 turns
```

### Wave 1.0 — Prisma schema migration
**GSD task:** `p1-t3`
**Branch:** `task/p1-F-001-prisma-schema`

```
/goal
Apply the Prisma schema. Done when:
- prisma/schema.prisma defines all entities in docs/FEATURES.md section 12
- pnpm prisma migrate dev exits 0 against the local postgres from task 1.1
- pnpm prisma generate exits 0
- prisma/seed.ts creates the seed dataset described in docs/BUILD.md layer 2
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-001-prisma-schema

Read: docs/guardrails/backend/01-data.md, prisma/schema.prisma (existing)
Files in scope: prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
— or stop after 20 turns
```

### Wave 1.0 — NestJS api skeleton
**GSD task:** `p1-t4`
**Branch:** `task/p1-F-123-api-skeleton`

```
/goal
Scaffold apps/api. Done when:
- pnpm --filter @crewmate/api dev starts without errors on :3000
- GET /healthz returns 200
- pnpm --filter @crewmate/api lint exits 0
- pnpm --filter @crewmate/api typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-123-api-skeleton

Read: docs/guardrails/backend/00-nestjs.md
Files in scope: apps/api/src/ skeleton only — AppModule, HealthController, main.ts
Do not implement any feature modules yet.
— or stop after 20 turns
```

### Wave 1.0 — Next.js web skeleton
**GSD task:** `p1-t5`
**Branch:** `task/p1-web-skeleton`

```
/goal
Scaffold apps/web. Done when:
- pnpm --filter @crewmate/web dev starts without errors on :3001
- / returns a placeholder page (no 404, no crash)
- pnpm --filter @crewmate/web lint exits 0
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-web-skeleton

Read: docs/guardrails/frontend/00-overview.md
Files in scope: apps/web/ skeleton — layout.tsx, page.tsx, tailwind config, next.config.ts
Do not implement any routes or components yet.
— or stop after 20 turns
```

### Wave 1.0 — Shared packages
**GSD task:** `p1-t6`
**Branch:** `task/p1-shared-packages`

```
/goal
Create placeholder exports for @crewmate/contracts and @crewmate/ui. Done when:
- packages/contracts/src/index.ts exports at least one type (stub is fine)
- packages/ui/src/index.ts exports at least one component (stub is fine)
- pnpm --filter @crewmate/contracts build exits 0
- pnpm --filter @crewmate/ui build exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-shared-packages

Files in scope: packages/contracts/src/, packages/ui/src/
— or stop after 20 turns
```

### Wave 1.0 — CI workflow
**GSD task:** `p1-t7`
**Branch:** `task/p1-F-132-ci`

```
/goal
Add .github/workflows/ci.yml. Done when:
- The workflow runs pnpm lint, pnpm typecheck, pnpm test on every PR
- It spins up postgres and redis as service containers
- On a no-op dummy PR the workflow goes green
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-132-ci

Files in scope: .github/workflows/ci.yml only
— or stop after 20 turns
```

### Wave 1.1 — Terraform network module
**GSD task:** `p1-t8`
**Branch:** `task/p1-F-121-terraform-network`

```
/goal
Write infrastructure/terraform/network/. Done when:
- VPC with public and private subnets across 3 AZs defined
- NAT gateway (single) defined
- Security groups defined including the Cloudflare IP allowlist rule on the ALB SG
- terraform validate exits 0 in the network module directory
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-121-terraform-network

Read: docs/BUILD.md layer 12, docs/guardrails/shared/03-security.md
Files in scope: infrastructure/terraform/network/ only
— or stop after 20 turns
```

### Wave 1.1b — Terraform data + secrets modules
**GSD task:** `p1-t9`
**Branch:** `task/p1-F-121-terraform-data-secrets`

```
/goal
Write infrastructure/terraform/data/ and infrastructure/terraform/secrets/. Done when:
- RDS Postgres 17 single-AZ, ElastiCache Redis 7 single node, S3 buckets defined in data/
- Secrets Manager entries and IAM task roles defined in secrets/
- Both modules reference the VPC outputs from the network module
- terraform validate exits 0 in both module directories
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-121-terraform-data-secrets

Read: docs/BUILD.md layer 12
Files in scope: infrastructure/terraform/data/, infrastructure/terraform/secrets/
— or stop after 20 turns
```

### Wave 1.2 — Terraform compute module
**GSD task:** `p1-t10`
**Branch:** `task/p1-F-121-terraform-compute`

```
/goal
Write infrastructure/terraform/compute/. Done when:
- ECS cluster, api service, worker service, task definitions, ALB defined
- ALB security group ingress restricted to Cloudflare IP ranges (from network module SG)
- No ACM certificate for a custom api subdomain
- terraform validate exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-121-terraform-compute

Files in scope: infrastructure/terraform/compute/ only
— or stop after 20 turns
```

### Wave 1.2 — Wrangler config and Worker proxy
**GSD task:** `p1-t11`
**Branch:** `task/p1-F-120-wrangler-proxy`

```
/goal
Write apps/web/wrangler.toml and apps/web/src/worker/proxy.ts. Done when:
- wrangler.toml binds the Worker to crewmate.ritaro.dev
- proxy.ts forwards /api/*, /v1/*, /graphql, /ws to BACKEND_ORIGIN with x-cloudflare-secret header
- WebSocket upgrades on /ws are forwarded via Upgrade: websocket
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-120-wrangler-proxy

Read: docs/BUILD.md layer 12
Files in scope: apps/web/wrangler.toml, apps/web/src/worker/proxy.ts
— or stop after 20 turns
```

### Wave 1.2 — Dockerfile and Cloudflare secret guard
**GSD task:** `p1-t12`
**Branch:** `task/p1-F-120-dockerfile-guard`

```
/goal
Write docker/api.Dockerfile and the global NestJS guard for x-cloudflare-secret. Done when:
- Dockerfile builds the api image with pnpm --filter @crewmate/api build
- A CloudflareSecretGuard is applied globally and rejects requests missing the header
- Health endpoints /healthz and /readyz bypass the guard
- docker build -f docker/api.Dockerfile . exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-120-dockerfile-guard

Read: docs/BUILD.md layer 12, docs/FEATURES.md F-120, F-123
Files in scope: docker/api.Dockerfile, apps/api/src/common/guards/cloudflare-secret.guard.ts
— or stop after 20 turns
```

### Wave 1.3 — deploy-api.yml
**GSD task:** `p1-t13`
**Branch:** `task/p1-F-122-deploy-api`

```
/goal
Write .github/workflows/deploy-api.yml. Done when:
- Workflow uses OIDC trust to AWS (no long-lived keys)
- Steps: build api image → tag :sha-XXXXXXX and :latest → push to ECR →
  run prisma migrate deploy as one-shot ECS task → rolling update api and worker services
- Workflow is gated by the prod GitHub environment manual approval
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-122-deploy-api

Read: docs/BUILD.md layer 12, docs/FEATURES.md F-122
Files in scope: .github/workflows/deploy-api.yml only
— or stop after 20 turns
```

### Wave 1.3 — deploy-web.yml
**GSD task:** `p1-t14`
**Branch:** `task/p1-F-122-deploy-web`

```
/goal
Write .github/workflows/deploy-web.yml. Done when:
- Workflow builds the Next.js Worker bundle via @opennextjs/cloudflare adapter
- The proxy handler at apps/web/src/worker/proxy.ts is included in the bundle
- wrangler deploy runs with a Cloudflare API token from a GitHub secret
- Workflow is gated by the prod GitHub environment manual approval
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-122-deploy-web

Read: docs/BUILD.md layer 12, docs/FEATURES.md F-122
Files in scope: .github/workflows/deploy-web.yml only
— or stop after 20 turns
```

### Wave 1.4 — First production deploy
**GSD task:** `p1-t15`

This wave is manual. See `04-phase-1.md` wave 1.4 for the step-by-step commands.

**PHASE_1_GATE:** `pnpm dev` local both ports reachable; CI green on dummy PR; `https://crewmate.ritaro.dev` returns placeholder; `curl https://crewmate.ritaro.dev/api/healthz` returns 200; direct ALB request without shared secret returns 401.

---

## Phase 2 — UI with dummy data

### Wave 2.0a — Fixture package
**GSD task:** `p2-t1`
**Branch:** `task/p2-fixtures`

```
/goal
Build the fixtures package at apps/web/src/lib/fixtures/. Done when:
- Typed fixtures exist for: Operator, User, RoleGrant, Property, Worker, Job, Schedule,
  WebhookEndpoint, WebhookDelivery, PermissionAudit
- At least 80 records distributed across entities (proportions per docs/BUILD.md layer 2 seed)
- All fixture types derive from @prisma/client generated types
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-fixtures

Read: prisma/schema.prisma, docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/web/src/lib/fixtures/ only
— or stop after 20 turns
```

### Wave 2.0b — Mock Apollo provider
**GSD task:** `p2-t2`
**Branch:** `task/p2-apollo-mock`

```
/goal
Set up MockedProvider for Apollo. Done when:
- apps/web/src/lib/apollo-mock.tsx wraps the app with ApolloMockProvider in dev
- Mock responses exist for every GraphQL query and mutation in docs/guardrails/frontend/05-data-fetching.md
- Subscriptions return fixture data on connect
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-apollo-mock

Read: docs/guardrails/frontend/05-data-fetching.md, apps/web/src/lib/fixtures/
Files in scope: apps/web/src/lib/apollo-mock.tsx, apps/web/src/lib/msw/
— or stop after 20 turns
```

### Wave 2.0c — Mock TanStack Query + MSW
**GSD task:** `p2-t3`
**Branch:** `task/p2-msw-handlers`

```
/goal
Set up MSW handlers for all REST endpoints. Done when:
- apps/web/src/lib/msw/handlers.ts has a handler for every endpoint in docs/guardrails/backend/02-api.md
- Handlers return fixture data from apps/web/src/lib/fixtures/
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-msw-handlers

Read: docs/guardrails/backend/02-api.md, docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/web/src/lib/msw/ only
— or stop after 20 turns
```

### Wave 2.1 — App shell
**GSD task:** `p2-t4`
**Branch:** `task/p2-app-shell`

```
/goal
Build the app shell. Done when:
- apps/web/src/app/layout.tsx renders sidebar + topbar on every authenticated route
- Sidebar has nav items for every route in docs/guardrails/frontend/03-layout-and-navigation.md
- Status dots render per the tier mapping in 03-layout-and-navigation.md
- Mobile shell exists at apps/web/src/app/(worker)/layout.tsx
- Every route in docs/FEATURES.md feature index is reachable (placeholder pages ok)
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p2-app-shell

Read: docs/guardrails/frontend/03-layout-and-navigation.md,
      docs/guardrails/frontend/01-components.md,
      docs/guardrails/frontend/02-design-system.md
Files in scope: apps/web/src/app/layout.tsx, apps/web/src/components/shell/
— or stop after 20 turns
```

### Wave 2.2 — All screens (Workflow)
**GSD task:** `p2-t5` (covers all 9 screen agents)
**Workflow file:** `.claude/workflows/phase-2-wave-2-2.js`

```
/goal
Workflow for wave 2.2 runs to completion: all 9 screen agents commit their branches,
pnpm --filter @crewmate/web typecheck exits 0 across all screen directories.
Run the Workflow at .claude/workflows/phase-2-wave-2-2.js.
— or stop after 30 turns
```

**PHASE_2_GATE:** Click through every route on `https://crewmate.ritaro.dev`. Every screen matches its `docs/images/ui/` reference. Optimistic UI works on the dispatch board. No console network errors.

---

## Phase 3 — Backend implementation

### Wave 3.0a — Auth module
**GSD task:** `p3-t1`
**Branch:** `task/p3-F-002-auth`

```
/goal
Implement apps/api/src/auth/. Done when:
- POST /v1/auth/login with correct credentials returns { accessToken, refreshToken }
- POST /v1/auth/login with wrong password returns 401 with AUTH_INVALID_CREDENTIALS
- POST /v1/auth/refresh rotates the token and returns a new pair
- POST /v1/auth/refresh with a replayed old token returns 401 and revokes the family
- pnpm --filter @crewmate/api test exits 0 for auth/refresh-token-rotation.spec.ts
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-002-auth

Read: docs/guardrails/frontend/11-auth-flows.md, docs/guardrails/shared/03-security.md,
      docs/guardrails/backend/04-error-handling.md, docs/FEATURES.md F-002 to F-004
Files in scope: apps/api/src/auth/ only
— or stop after 20 turns
```

### Wave 3.0b — RBAC guards and audit interceptor
**GSD task:** `p3-t2`
**Branch:** `task/p3-F-010-rbac`

```
/goal
Implement apps/api/src/rbac/ and the audit interceptor. Done when:
- JwtAuthGuard applied globally, @Public() decorator opts routes out
- RolesGuard, ScopeGuard, PolicyEvaluator wired
- AuditInterceptor writes a permission_audits row on every protected request
- A protected route called without a token returns 401
- A protected route called with the wrong role returns 403 with AUTHZ_DENIED
- pnpm --filter @crewmate/api test exits 0 for rbac/policies/policy-evaluator.spec.ts
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-010-rbac

Read: docs/guardrails/shared/04-rbac.md, docs/guardrails/backend/05-reusable-patterns.md,
      docs/FEATURES.md F-010 to F-015
Files in scope: apps/api/src/rbac/, apps/api/src/common/interceptors/audit.interceptor.ts,
                apps/api/src/common/decorators/
— or stop after 20 turns
```

### Wave 3.0c — Tenant scope Prisma extension
**GSD task:** `p3-t3`
**Branch:** `task/p3-F-001-tenant-scope`

```
/goal
Implement apps/api/src/common/prisma/tenant-scope.extension.ts. Done when:
- Every where clause on a tenant-owned model has operatorId injected automatically
- A query made without a resolved operatorId throws a TenantScopeViolation error
- Smoke test: create a job under operatorId A, query as operatorId B, result is empty
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-001-tenant-scope

Read: docs/guardrails/backend/01-data.md, docs/FEATURES.md F-001
Files in scope: apps/api/src/common/prisma/ only
— or stop after 20 turns
```

### Wave 3.1 — All feature APIs (Workflow)
**GSD task:** `p3-t4` (covers all 7 API module agents)
**Workflow file:** `.claude/workflows/phase-3-wave-3-1.js`

```
/goal
Workflow for wave 3.1 runs to completion: all 7 API module agents commit their branches,
pnpm --filter @crewmate/api typecheck exits 0 across all module directories.
Run the Workflow at .claude/workflows/phase-3-wave-3-1.js.
— or stop after 30 turns
```

### Wave 3.2a — Job state machine
**GSD task:** `p3-t5`
**Branch:** `task/p3-F-024-job-state-machine`

```
/goal
Implement apps/api/src/jobs/state/ and the transition endpoint. Done when:
- POST /v1/jobs/:id/transition with a valid { to } returns the updated job
- Every invalid transition returns 409 with JOB_INVALID_TRANSITION and a reason
- An OutboxEvent row is written in the same transaction as the state change
- pnpm --filter @crewmate/api test exits 0 for jobs/state/job-state.spec.ts
  with the full transition matrix covered
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-024-job-state-machine

Read: docs/guardrails/shared/02-events.md, docs/FEATURES.md F-024, F-110
Files in scope: apps/api/src/jobs/state/, apps/api/src/events/outbox.service.ts
— or stop after 20 turns
```

### Wave 3.2b — Event bus and outbox relay
**GSD task:** `p3-t6`
**Branch:** `task/p3-F-110-event-bus`

```
/goal
Implement apps/api/src/events/. Done when:
- EventBus (EventEmitter2) publishes domain events in-process
- OutboxRelay reads new OutboxEvent rows and publishes them to BullMQ
- Killing postgres mid-transition leaves either both rows (state + outbox) or neither
- pnpm --filter @crewmate/api test exits 0 for event bus unit test
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-110-event-bus

Read: docs/guardrails/shared/02-events.md, docs/guardrails/backend/05-reusable-patterns.md
Files in scope: apps/api/src/events/ only
— or stop after 20 turns
```

### Wave 3.2c — WebSocket gateway
**GSD task:** `p3-t7`
**Branch:** `task/p3-F-030-websocket`

```
/goal
Implement apps/api/src/realtime/. Done when:
- NestJS WebSocket gateway authenticates on upgrade using the same JWT as REST
- Each socket joins tenant:<operatorId> on connect
- RealtimeBroadcaster filters outbox events by scope and broadcasts to the right room
- Two clients connected as different coordinators each receive only their scoped events
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-030-websocket

Read: docs/guardrails/backend/00-nestjs.md, docs/FEATURES.md F-030
Files in scope: apps/api/src/realtime/ only
— or stop after 20 turns
```

### Wave 3.2d — BullMQ webhook delivery worker
**GSD task:** `p3-t8`
**Branch:** `task/p3-F-061-webhook-worker`

```
/goal
Implement apps/api/src/webhooks/delivery/. Done when:
- WebhookDeliveryWorker consumes the webhook-delivery queue
- Payload is signed with HMAC per docs/guardrails/shared/03-security.md format
- Each attempt is persisted in webhook_deliveries with status, code, latency, attempt count
- A delivery to an unreachable URL retries on the exponential schedule (1m, 5m, 25m, 2h, 12h)
- pnpm --filter @crewmate/api test exits 0 for webhooks/delivery/sign.spec.ts
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-061-webhook-worker

Read: docs/guardrails/shared/02-events.md, docs/guardrails/shared/03-security.md,
      docs/FEATURES.md F-061, F-062
Files in scope: apps/api/src/webhooks/delivery/ only
— or stop after 20 turns
```

### Wave 3.3 — GraphQL resolvers
**GSD task:** `p3-t9`
**Branch:** `task/p3-F-112-graphql`

```
/goal
Implement apps/api/src/graphql/. Done when:
- GraphQL resolvers exist for all entities in the SDL
- Subscriptions wired to the in-process EventBus
- SDL generated to packages/contracts/src/schema.graphql and committed
- GET /graphql returns the playground (dev) or schema (prod)
- pnpm --filter @crewmate/api typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-112-graphql

Read: docs/guardrails/backend/02-api.md, docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/api/src/graphql/, packages/contracts/src/schema.graphql
— or stop after 20 turns
```

### Wave 3.4a — Custom roles backend
**GSD task:** `p3-t10`
**Branch:** `task/p3-F-012-custom-roles`

```
/goal
Implement custom roles backend (F-012). Done when:
- POST /v1/team/roles creates a custom role with (action, subject) permission pairs
- PolicyEvaluator resolves custom role permissions before scope and policy checks
- An operator admin creates a role, assigns it to a user, and that user can reach
  read endpoints and is blocked on write endpoints for that role's permissions
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-012-custom-roles

Read: docs/guardrails/shared/04-rbac.md, docs/FEATURES.md F-012
Files in scope: apps/api/src/team/roles/ only
— or stop after 20 turns
```

### Wave 3.4b — Resend email integration
**GSD task:** `p3-t11`
**Branch:** `task/p3-F-070-resend-email`

```
/goal
Implement Resend email integration (F-070, F-071). Done when:
- EmailProvider interface exists with ResendProvider and SmtpProvider implementations
- NODE_ENV=test routes to SmtpProvider pointing at MailHog :1025
- worker.invited template renders without error and delivers to MailHog locally
- password.reset template renders without error
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-070-resend-email

Read: docs/guardrails/backend/00-nestjs.md, docs/FEATURES.md F-070, F-071
Files in scope: apps/api/src/notifications/email/ only
— or stop after 20 turns
```

**PHASE_3_GATE:** Manual API smoke from `00-phasing.md` phase 3 gate section. `pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e` both green.

---

## Phase 4 — Wire UI to backend

### Wave 4.0a — Apollo Client real config
**GSD task:** `p4-t1`
**Branch:** `task/p4-F-112-apollo-real`

```
/goal
Wire Apollo Client to the real api. Done when:
- apps/web/src/lib/apollo-client.ts points to http://localhost:3000/graphql in dev
- HTTP link has an auth header interceptor that reads the access token from cookies
- WebSocket link handles wss://localhost:3000/graphql for subscriptions
- Auth refresh link retries once on 401 using POST /v1/auth/refresh before redirecting to /login
- The MockedProvider wrapper from phase 2 is removed from the production code path
  (move to __tests__ or feature-flag behind NEXT_PUBLIC_MOCK=true)
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p4-F-112-apollo-real

Read: docs/guardrails/frontend/05-data-fetching.md, docs/FEATURES.md F-112
Files in scope: apps/web/src/lib/apollo-client.ts, apps/web/src/lib/apollo-mock.tsx
— or stop after 20 turns
```

### Wave 4.0b — TanStack Query real config
**GSD task:** `p4-t2`
**Branch:** `task/p4-F-112-query-real`

```
/goal
Wire TanStack Query to the real api. Done when:
- apps/web/src/lib/query-client.ts is configured with fetchWithAuth that attaches the
  access token and handles 401 refresh
- MSW handlers are removed from the production code path
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p4-F-112-query-real

Read: docs/guardrails/frontend/05-data-fetching.md
Files in scope: apps/web/src/lib/query-client.ts, apps/web/src/lib/msw/
— or stop after 20 turns
```

### Wave 4.1 — All screen wirings (Workflow)
**GSD task:** `p4-t3` (covers all 9 wiring agents)
**Workflow file:** `.claude/workflows/phase-4-wave-4-1.js`

```
/goal
Workflow for wave 4.1 runs to completion: all 9 wiring agents commit their branches,
pnpm --filter @crewmate/web typecheck exits 0 across all screen directories.
Run the Workflow at .claude/workflows/phase-4-wave-4-1.js.
— or stop after 30 turns
```

### Wave 4.2 — Subscription verification
**GSD task:** `p4-t4`

Manual. Open two browser windows logged in as different coordinators. Transition a job in window A. Confirm the dispatch board in window B updates via WebSocket. No `/goal` or Workflow needed.

### Wave 4.3 — Fixture cleanup
**GSD task:** `p4-t5`
**Branch:** `task/p4-fixture-cleanup`

```
/goal
Move fixture data out of the production bundle. Done when:
- apps/web/src/lib/fixtures/ is moved to apps/web/src/__tests__/fixtures/
- No import of fixtures/ exists in any file under apps/web/src/app/ or apps/web/src/components/
- pnpm --filter @crewmate/web build exits 0 without fixture imports in the bundle
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p4-fixture-cleanup

Files in scope: apps/web/src/lib/fixtures/ (move target), any import sites in app/ or components/
— or stop after 20 turns
```

**PHASE_4_GATE:** Full happy path walk with real seeded data. Two browsers, job transition via subscription. Webhook test delivery appears in the log within seconds.

---

## Phase 5 — Tests and final polish

### Wave 5.0 — Critical-path tests
**GSD task:** `p5-t1`
**Branch:** `task/p5-F-130-tests`

```
/goal
Ensure all four critical-path unit test files plus the one Supertest e2e file pass per
docs/guardrails/backend/03-testing.md. Done when:
- apps/api/src/jobs/state/job-state.spec.ts — full transition matrix
- apps/api/src/rbac/policies/policy-evaluator.spec.ts — representative allow/deny cases
- apps/api/src/auth/refresh-token-rotation.spec.ts — happy path + replay + family revocation
- apps/api/src/webhooks/delivery/sign.spec.ts — HMAC signing and symmetric verify
- apps/api/test/e2e/v0.1-happy-path.e2e-spec.ts — Supertest happy path
- pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e both exit 0
- pnpm lint && pnpm typecheck exit 0 across the entire monorepo
- code-reviewer subagent returns no blocking issues
- changes committed to task/p5-F-130-tests

Files in scope: the five test files listed above only
— or stop after 25 turns
```

### Wave 5.1 — Deferred polish
**GSD task:** `p5-t2`

Address any polish items deferred from phase 2.3 visual review or phase 4 wire-up. Dispatched per item; one `/goal` session per polish task. Skip this wave if nothing deferred.

### Wave 5.2 — Production smoke checklist
**GSD task:** `p5-t3`
**Branch:** `task/p5-F-123-prod-smoke`

```
/goal
Write docs/execution/PROD-SMOKE.md. Done when:
- The file documents a reproducible click-through plus curl sequence that confirms the
  live app at https://crewmate.ritaro.dev is healthy after any future deploy
- Includes: home page loads, login as seeded admin works, dispatch board renders with data,
  job transition works, webhook test delivery appears in the log within seconds,
  two browsers see the realtime update, /api/healthz returns 200,
  a direct ALB request without the shared secret returns 401
- Each step has a copy-pastable command or click path
- code-reviewer subagent returns no blocking issues
- change is committed to task/p5-F-123-prod-smoke

Read: docs/BUILD.md layer 12, docs/execution/00-phasing.md phase 5 gate
Files in scope: docs/execution/PROD-SMOKE.md only
— or stop after 20 turns
```

**PHASE_5_GATE:** `pnpm test && pnpm test:e2e` green in CI on a dummy PR. The PROD-SMOKE.md checklist passes against `https://crewmate.ritaro.dev`. The portfolio is shipped.
