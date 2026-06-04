# CrewMate Build

The implementation, organized by architectural layer. Each section describes one layer of the system: what it is, where its code lives, what it depends on, the features it realizes, and what counts as "done" for that layer.

This document is the *how*. For the *what*, see `docs/FEATURES.md`. For the *when* (execution order, phases, gates, parallelism), see `docs/execution/00-phasing.md`. For the *who and how-they-work* (agents, branches, worktrees, code review), see `docs/execution/01-agent-workflow.md`.

The layers below are the architectural decomposition. They are not built top-to-bottom in this order — the execution phasing reorders them so UI lands against fixtures first, then backend, then they wire together. The layered framing here exists so any single contributor (human or agent) can locate their work in the system shape.

## Layer map

```
                ┌──────────────────────────────────────────────┐
                │  12 Deploy and infrastructure                │
                │  (single domain on Cloudflare Workers,       │
                │   Worker proxies api paths to Fly.io,        │
                │   IaC reference, CI)                         │
                └────────────────────┬─────────────────────────┘
                                     │
   ┌─────────────────────────────────┴────────────────────────────┐
   │                          10 Observability                     │
   │               (pino, Fly.io log drain, request id)            │
   └─────────────────────────────────┬────────────────────────────┘
                                     │
   ┌──────────────────────┐   ┌──────┴───────┐   ┌──────────────────┐
   │   8 UI surfaces      │   │ 7 API surface│   │  9 Notifications │
   │ (Next.js, Apollo,    │◀──│  (REST +     │──▶│  (Resend, React  │
   │  TanStack, screens)  │   │   GraphQL +  │   │   Email)         │
   └──────────────────────┘   │   WebSocket) │   └──────────────────┘
                              └──────┬───────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
        ┌───────▼─────┐   ┌─────────▼────────┐   ┌──────▼──────────┐
        │ 4 Domain    │   │ 5 State machine  │   │ 6 Realtime +    │
        │ feature     │   │   and events     │   │   background    │
        │ modules     │   │ (event bus,      │   │ workers         │
        │             │   │  outbox writer)  │   │ (WS gateway,    │
        │             │   │                  │   │  BullMQ)        │
        └───────┬─────┘   └─────────┬────────┘   └────────┬────────┘
                │                   │                     │
                └───────────────────┼─────────────────────┘
                                    │
                       ┌────────────▼──────────────┐
                       │   3 Auth and RBAC         │
                       │ (JWT, refresh rotation,   │
                       │  guards, policy)          │
                       └────────────┬──────────────┘
                                    │
                       ┌────────────▼──────────────┐
                       │   2 Schema and migrations │
                       │ (Prisma, tenant scoping)  │
                       └────────────┬──────────────┘
                                    │
                       ┌────────────▼──────────────┐
                       │   1 Foundation            │
                       │ (monorepo, infra, CI)     │
                       └───────────────────────────┘
```

Layer 11 (testing) cuts across all layers and is built alongside them, not after.

---

## 1. Foundation

The monorepo and the local infrastructure. Where everything else attaches.

**Code lives in.** The root of the repo. `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.gitignore`, `.editorconfig`, root ESLint and Prettier config, Husky hooks.

**Depends on.** Nothing.

**Realizes.** No direct features. Enables everything else.

**Done when.**
- `pnpm install` resolves cleanly.
- `pnpm dev` brings up the api on `:3000` and the web on `:3001`.
- `docker compose up -d` brings up postgres, redis, mailhog healthy.
- `pnpm lint && pnpm typecheck && pnpm test` all green on the empty harness.
- GitHub Actions CI workflow runs and goes green on a no-op PR.

**Reads.** `docs/guardrails/shared/00-architecture.md`, `docs/guardrails/shared/01-conventions.md`.

---

## 2. Schema and migrations

The data model. Prisma is the source of truth; every other layer reads from it.

**Code lives in.** `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`.

**Depends on.** Layer 1 (Postgres must be reachable).

**Realizes.** F-001 (multi-tenant data layer, via the schema's tenant columns and the Prisma client extension built in layer 3).

**Done when.**
- The schema migrates cleanly with `pnpm prisma migrate dev`.
- All entities listed in `docs/FEATURES.md` exist in the schema (Operator, User, RoleGrant, PermissionAudit, Property, Worker, Job, Schedule, WebhookEndpoint, WebhookDelivery, OutboxEvent, RefreshToken, CustomRole, IdempotencyRecord placeholder unused).
- Seed creates one operator (Brookline Property Co.) plus 3 users plus 4 workers plus 3 properties plus 15 jobs plus 1 webhook endpoint pointing at a webhook.site URL.
- `pnpm prisma migrate reset --force && pnpm db:seed` prints the demo credentials.

**Reads.** `docs/guardrails/backend/01-data.md`, the existing `prisma/schema.prisma`.

---

## 3. Auth and RBAC

The gate every protected request passes through. Tenancy enforcement, role checks, scope checks, policy evaluation, audit recording.

**Code lives in.** `apps/api/src/auth/`, `apps/api/src/rbac/`, `apps/api/src/common/prisma/tenant-scope.extension.ts`, `apps/api/src/common/interceptors/audit.interceptor.ts`, `apps/api/src/common/decorators/`.

**Depends on.** Layers 1 and 2.

**Realizes.** F-001, F-002, F-003, F-004, F-005, F-006, F-007, F-010, F-011, F-012, F-013, F-014, F-015.

**Components.**

| Component | Purpose |
|---|---|
| `AuthService` | Login, refresh, logout, me. Argon2id for password verification. |
| `RefreshTokenRepository` | Hashed storage of refresh tokens with `family_id` for rotation detection. |
| `JwtStrategy` | Passport strategy that verifies the access token and resolves the actor. |
| `JwtAuthGuard` | Applied globally; routes opt out with `@Public()`. |
| `RolesGuard` | Reads `@Roles(...)` decorator. Compares to actor's role grants. |
| `ScopeGuard` | Reads `@Scoped('property' | 'region' | 'tenant')`. Resolves the requested subject and checks scope. |
| `PolicyEvaluator` | Service registry of named policies (`canTransitionJob`, `canAssignWorker`, etc.). Returns `Allow` or `Deny(reason)`. |
| `AuditInterceptor` | Writes a `permission_audits` row on every protected request. |
| `TenantScopePrismaExtension` | Injects `operatorId` into every `where` on tenant-owned models. Fails closed. |
| `TotpService` | 2FA enrollment + verification (RFC 6238). |
| `InvitationService` | Issues one-time invitation tokens; consumed by the invitation acceptance flow. |
| `PasswordResetService` | Issues one-time reset tokens; consumed by the reset flow. |
| `CustomRoleService` | CRUD for tenant-defined roles. Permissions stored as `(action, subject)` pairs. Policy evaluator resolves these. |

**Done when.**
- Every auth endpoint listed in F-002 through F-007 works against `curl`.
- A 4-layer authorization test passes: tenancy isolation, role check, scope check, policy condition. Verified by smoke-testing across the four built-in roles plus one custom role.
- A refresh-token replay simulation revokes the family.
- A cross-tenant read returns zero rows.
- Every protected request writes a row to `permission_audits` with the right `decision` and `reason`.

**Reads.** `docs/guardrails/shared/04-rbac.md` (the contract), `docs/guardrails/backend/05-reusable-patterns.md` (base service + decorators), `docs/guardrails/backend/04-error-handling.md` (the AUTHZ_DENIED contract).

---

## 4. Domain feature modules

The CRUD surfaces that the app's operations live on. Each feature module follows the same shape: controller, service, repository, DTOs, tests.

**Code lives in.** `apps/api/src/operators/`, `apps/api/src/properties/`, `apps/api/src/workers/`, `apps/api/src/jobs/`, `apps/api/src/schedules/`, `apps/api/src/webhooks/endpoints/`, `apps/api/src/audit/`.

**Depends on.** Layer 3 (auth + RBAC).

**Realizes.** F-020 (operators), F-021 (properties), F-022 (workers), F-023 (jobs), F-025 (schedules), F-060 (webhook endpoint configuration), F-016 (audit log read API; the UI lives in layer 8).

**Module shape.** Every feature module has the same structure.

```
apps/api/src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   └── <feature>-response.dto.ts
├── policies/
│   └── <action>.policy.ts
└── <feature>.spec.ts
```

The repository extends `BaseRepository<T>` from `docs/guardrails/backend/05-reusable-patterns.md`. The service follows the validate/authorize/transact/emit/return shape.

**Done when.** Every endpoint in F-020 through F-025, F-060, and F-016 works against `curl` with scope-aware filtering verified across the four built-in roles plus a custom role.

**Reads.** `docs/guardrails/backend/02-api.md`, `docs/guardrails/backend/05-reusable-patterns.md`, `docs/FEATURES.md` for the per-feature scope.

---

## 5. Job state machine and events

The mechanism by which a state change becomes a side effect. Atomic state writes plus the outbox pattern.

**Code lives in.** `apps/api/src/jobs/state/job-state.ts`, `apps/api/src/events/event-bus.ts`, `apps/api/src/events/outbox.service.ts`, `apps/api/src/events/outbox-relay.ts`.

**Depends on.** Layer 4 (jobs module).

**Realizes.** F-024 (job state machine), F-110 (event bus + outbox).

**Key pieces.**

| Piece | Purpose |
|---|---|
| `canTransition(from, to, actorRole)` | Pure function. Returns `Allow` or `Deny(reason)`. Exhaustive over the 5-state machine. |
| `JobsService.transition()` | Calls `canTransition`, opens a transaction, writes the state change AND an `OutboxEvent` row in the same transaction, returns the updated job. |
| `EventBus` (NestJS `EventEmitter2`) | In-process pub-sub for the realtime gateway and any other in-app listeners. |
| `OutboxRelay` | A small loop that reads new `OutboxEvent` rows, publishes them to BullMQ for webhook fan-out, and emits to the in-process `EventBus` for realtime fan-out. |

**Done when.**
- Every allowed transition in the state machine passes a unit test; every invalid transition returns 409 with `JOB_INVALID_TRANSITION` and a reason.
- Killing Postgres mid-transition leaves either both rows (state change + outbox) or neither.
- An outbox event written by `JobsService.transition()` triggers a webhook delivery attempt within seconds and a realtime push within milliseconds.

**Reads.** `docs/guardrails/shared/02-events.md`, `docs/guardrails/backend/05-reusable-patterns.md` (the `emitInTx` helper).

---

## 6. Realtime and background workers

The asynchronous side. WebSocket fan-out to browsers; BullMQ workers for webhook delivery and notification dispatch.

**Code lives in.** `apps/api/src/realtime/`, `apps/api/src/webhooks/delivery/`, `apps/api/src/queues/`, `apps/api/src/notifications/email/` (the worker side; the API side is layer 9).

**Depends on.** Layer 5 (events + outbox).

**Realizes.** F-030 (WebSocket gateway), F-061 (signed delivery worker), F-062 (retry policy), F-063 (the data behind the deliveries log UI).

**Components.**

| Component | Purpose |
|---|---|
| `RealtimeGateway` | Native NestJS WebSocket gateway. Authenticates on upgrade. Each socket joins `tenant:<operatorId>` on connect. |
| `RealtimeBroadcaster` | Subscribes to in-process events, filters by scope, broadcasts to the right tenant room. |
| `WebhookDeliveryWorker` | BullMQ consumer for the `webhook-delivery` queue. Signs the payload with the endpoint's HMAC secret, POSTs, persists each attempt to `webhook_deliveries`, retries on exponential backoff (1m, 5m, 25m, 2h, 12h). Emits `webhook.delivery.failed` on final failure. |
| `NotificationEmailWorker` | BullMQ consumer for the `notification-email` queue. Hands off to the Resend or MailHog provider from layer 9. |

**Done when.**
- Two browsers connected as different coordinators see only events that match their scope.
- A webhook delivery to webhook.site succeeds and persists a row.
- A webhook delivery to an unreachable URL retries the prescribed schedule and lands as `FAILED` in `webhook_deliveries` with the right attempt count.
- A worker invitation email lands in MailHog locally.

**Reads.** `docs/guardrails/backend/00-nestjs.md` (gateway and worker patterns), `docs/guardrails/shared/03-security.md` (HMAC signing format).

---

## 7. API surfaces

The contract between the backend and any client. REST for stable external use, GraphQL for the web app's read and mutation surface.

**Code lives in.** `apps/api/src/<feature>/<feature>.controller.ts` (REST), `apps/api/src/graphql/` (GraphQL), `apps/api/src/health/health.controller.ts`, the generated SDL at `packages/contracts/src/schema.graphql`.

**Depends on.** Layers 4, 5, 6.

**Realizes.** F-112 (REST + GraphQL), F-115 (error contract), F-123 (health endpoints).

**Key pieces.**

| Piece | Purpose |
|---|---|
| REST controllers | Per feature module. Versioned under `/v1/`. Validated via `class-validator` DTOs plus Zod at the boundary. |
| GraphQL resolvers | Code-first via `@nestjs/graphql`. Subscriptions wired to the in-process event bus. SDL generated to `packages/contracts/src/schema.graphql` and committed. |
| Global exception filter | Translates every thrown error into the wire shape `{ code, message, requestId, details? }`. |
| `HealthController` | `GET /healthz` (liveness) and `GET /readyz` (readiness, DB + Redis ping). Fly.io health checks use `/readyz`. |

**Done when.**
- Every REST endpoint in F-020 through F-080 responds with the documented shape.
- GraphQL SDL committed and matches the resolvers.
- A thrown `JobInvalidTransitionException` renders as 409 with `JOB_INVALID_TRANSITION` and a reason.
- `/healthz` returns 200; `/readyz` returns 200 when DB and Redis are reachable.

**Reads.** `docs/guardrails/backend/02-api.md`, `docs/guardrails/backend/04-error-handling.md`.

---

## 8. UI surfaces

The Next.js app. Every screen documented in `docs/guardrails/frontend/` plus the data and state management that feeds them.

**Code lives in.** `apps/web/src/app/` (routes), `apps/web/src/components/` (domain components), `apps/web/src/lib/` (Apollo, query, motion, auth), `apps/web/src/stores/` (Zustand), `apps/web/src/hooks/`, `packages/ui/src/` (shared components and tokens), `packages/contracts/src/` (shared types).

**Depends on.** Layer 7 for real data. For phase 2 builds, depends instead on the fixtures + mock providers (see `docs/execution/00-phasing.md`, phase 2).

**Realizes.** F-031, F-032, F-040, F-041, F-050, F-060 (the endpoint config UI half), F-063, F-080, F-090, F-091, F-092, F-093, F-100, F-101, F-016 (the audit log UI), F-072.

**Stack.**

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| React | 19 |
| Styling | Tailwind 4 |
| Components | shadcn/ui (vendored under `apps/web/src/components/ui`) |
| GraphQL client | Apollo Client 4 |
| REST + non-GraphQL state | TanStack Query 5 |
| Ephemeral UI state | Zustand 5 |
| Animation | Motion (rebrand of framer-motion) |
| Forms | react-hook-form + zod |

**Screens.** Every screen in `docs/guardrails/frontend/` chapters 02 through 17 ships. The visual contract is the rendered image in `docs/images/ui/<screen>.png`.

**Done when.**
- Every route documented in `docs/FEATURES.md` is reachable.
- Every screen matches its rendered image within a tight visual tolerance.
- Real-time updates work on the dispatch board across two browsers.
- Worker mobile transitions work from a phone-sized viewport.
- The custom roles UI creates roles that the API accepts and the policy evaluator honors.

**Reads.** All of `docs/guardrails/frontend/`. `docs/images/ui/`. `docs/FEATURES.md`.

---

## 9. Notifications

Transactional email via Resend in production, MailHog locally.

**Code lives in.** `apps/api/src/notifications/email/email-provider.interface.ts`, `apps/api/src/notifications/email/resend.provider.ts`, `apps/api/src/notifications/email/smtp.provider.ts`, `apps/api/src/notifications/email/templates/` (React Email source).

**Depends on.** Layer 6 (the `NotificationEmailWorker` consumes from the queue).

**Realizes.** F-070 (Resend integration), F-071 (templates), F-072 (preferences UI cross-link).

**Templates (v0.1).**

| Template | Trigger | Recipient |
|---|---|---|
| `worker.invited` | F-006 invitation flow | The invited worker |
| `password.reset` | F-007 password reset request | The requester |
| `webhook.delivery.failed.digest` (optional) | Daily roll-up of failed deliveries per endpoint | Tenant admin |

**Done when.**
- `EmailProvider` interface is selected by `NODE_ENV`. `ResendProvider` in prod, `SmtpProvider` in dev.
- Inviting a worker locally lands the email in MailHog.
- Inviting a worker in staging or prod delivers via Resend within seconds.

**Reads.** `docs/guardrails/backend/00-nestjs.md` (the provider pattern subsection).

---

## 10. Observability

Pino structured logs shipped to stdout (picked up by Fly.io's log infrastructure). No OpenTelemetry, no Sentry, no PostHog in v0.1.

**Code lives in.** `apps/api/src/common/logger/`, `apps/api/src/common/request-context/` (async-local-storage for the request id), `apps/api/src/common/interceptors/logging.interceptor.ts`.

**Depends on.** Layer 1 (for the runtime), layer 12 (for the Fly.io log infrastructure in production).

**Realizes.** F-114.

**What gets logged.**

- Every request line includes `requestId`, `operatorId`, `actorUserId` (where known), route, status, duration.
- Every error includes the same context plus the stack.
- Sensitive fields are redacted (passwords, JWT contents, signing secrets, full third-party payloads).
- Logs go to stdout in JSON format. Fly.io captures them and makes them available via `fly logs`.

**Done when.**
- A single request can be filtered by `requestId` across api and worker logs via `fly logs`.
- The redaction list is enforced; passwords never appear in log lines.

**Reads.** `docs/guardrails/backend/04-error-handling.md` (the redaction list), `docs/guardrails/shared/03-security.md`.

---

## 11. Testing

A thin layer that runs alongside the other layers, not after them.

**Code lives in.** `apps/api/src/**/*.spec.ts` (unit tests), `apps/api/test/e2e/v0.1-happy-path.e2e-spec.ts` (the one integration test).

**Depends on.** The layer being tested.

**Realizes.** F-130 (critical-path unit tests), F-131 (one Supertest integration test), F-132 (CI runs them).

**What is tested.**

| Test file | Why this file |
|---|---|
| `jobs/state/job-state.spec.ts` | Exhaustive over the state machine matrix. The single most interesting piece of code. |
| `rbac/policies/policy-evaluator.spec.ts` | Representative allow/deny cases per built-in policy. |
| `auth/refresh-token-rotation.spec.ts` | Happy path plus replay detection plus family revocation. |
| `webhooks/delivery/sign.spec.ts` | HMAC signing produces the documented header format and verifies symmetrically. |
| `apps/api/test/e2e/v0.1-happy-path.e2e-spec.ts` | Supertest: login as worker, fetch today's jobs, transition through to Completed, log out. |

**Done when.** `pnpm test` and `pnpm test:e2e` both green. CI runs them on every PR.

**Reads.** `docs/guardrails/backend/03-testing.md`.

---

## 12. Deploy and infrastructure

Production target is a single public domain. All traffic enters at `https://crewmate.ritaro.dev`. A single Cloudflare Worker serves the Next.js app and reverse-proxies four path prefixes (`/api/*`, `/v1/*`, `/graphql`, `/ws`) to the Fly.io backend. The Fly.io backend (NestJS API and BullMQ worker) is reachable at `https://crewmate-api.fly.dev`; the Worker is the only intended caller. Fly.io provides HTTPS natively — no separate load balancer or ACM certificate is needed. Single environment (prod only). `fly.toml` plus Fly.io secrets for the API. `apps/web/wrangler.toml` plus Wrangler secrets for the Worker. GitHub Actions runs two deploy workflows on push to `main`, both gated by a manual approval in the `prod` environment.

> AWS IaC reference code lives in `infrastructure/terraform/` — not applied to any live environment. It is retained as a portfolio artifact documenting the AWS architecture that was superseded by Fly.io.

**Code lives in.** `fly.toml`, `docker/api.Dockerfile`, `apps/web/wrangler.toml`, `apps/web/src/worker/proxy.ts`, `.github/workflows/deploy-api.yml`, `.github/workflows/deploy-web.yml`.

**Depends on.** Every layer above being implemented and tested locally.

**Realizes.** F-120 (production deployment), F-121 (infrastructure as code), F-122 (GitHub Actions deploy workflows), F-123 (health endpoints, shared with layer 7).

**Components.**

| Component | Service |
|---|---|
| Next.js web | Cloudflare Workers (via `@opennextjs/cloudflare`) |
| API proxy logic (`/api/*`, `/v1/*`, `/graphql`, `/ws`) | The same Cloudflare Worker, a small `fetch`-based router |
| NestJS API | Fly.io (`crewmate-api.fly.dev`), HTTPS native |
| BullMQ worker | Fly.io, same image as the API (different process command) |
| Postgres | Fly Postgres (managed by Fly, `DATABASE_URL` auto-set) |
| Redis | Upstash Redis free tier (`rediss://` URL set as Fly secret) |
| Container builds | Fly.io remote build from `fly.toml` + `docker/api.Dockerfile` (no separate registry) |
| DNS, edge cache, WAF, TLS | Cloudflare |
| Secrets (API) | Fly.io secrets (`fly secrets set`) — DB URL, JWT secrets, webhook signing secret, `CLOUDFLARE_SHARED_SECRET` |
| Secrets (Cloudflare) | Wrangler secrets (`BACKEND_ORIGIN`, `CLOUDFLARE_SHARED_SECRET`) |
| Logs (api + worker) | Fly.io log infrastructure (stdout captured, viewable via `fly logs`) |
| Logs (web) | Cloudflare Workers logs and trace events |

Cookies are same-origin. They are set with `Secure; HttpOnly; SameSite=Lax` and no `Domain=` attribute. No cross-subdomain configuration is needed. CORS is not needed for browser requests to `/api/*` (same origin); the Worker's `fetch` call to the Fly.io backend is server-to-server.

Caller authenticity to the Fly.io backend is enforced by the Worker injecting an `x-cloudflare-secret: <random>` header on every proxied request; a global NestJS guard rejects requests without it. Defense in depth.

**Worker proxy handler.** A small TypeScript file at `apps/web/src/worker/proxy.ts` is packaged into the Worker bundle by the `@opennextjs/cloudflare` adapter. It matches the four path prefixes (`/api/*`, `/v1/*`, `/graphql`, `/ws`), attaches the `x-cloudflare-secret` header, and forwards the request to `BACKEND_ORIGIN` (`https://crewmate-api.fly.dev`). WebSocket upgrades on `/ws` are forwarded via Workers' native WebSocket support (the `Upgrade: websocket` header is preserved and the response's `webSocket` is returned with status 101). Every other request falls through to the Next.js handler.

**`fly.toml` key settings.**

| Setting | Value |
|---|---|
| `app` | `crewmate-api` |
| `[build] dockerfile` | `docker/api.Dockerfile` |
| `[deploy] release_command` | `npx prisma migrate deploy` |
| `[http_service] internal_port` | `3000` |
| `[http_service] force_https` | `true` |

**AWS IaC reference (portfolio artifact).**

The `infrastructure/terraform/` directory contains the original Terraform modules (`network`, `data`, `secrets`, `compute`) that describe the AWS architecture (VPC, RDS, ElastiCache, ECS, ALB). These modules are **not applied to any live environment** and exist as a portfolio reference only.

**Deploy workflows.**

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-api.yml` | Push to `main` after `ci.yml` is green. `FLY_API_TOKEN` from GitHub secret. | Runs `flyctl deploy --remote-only` from the repo root, which builds the image on Fly.io, runs `prisma migrate deploy` via the `release_command` in `fly.toml`, and rolls the api and worker machines. Smoke-tests `https://crewmate-api.fly.dev/healthz` and `/readyz`. Gated by the GitHub `prod` environment approval. |
| `deploy-web.yml` | Push to `main` after `ci.yml` is green. Cloudflare API token from a GitHub secret. | Runs `pnpm --filter @crewmate/web build` then `pnpm --filter @crewmate/web opennextjs-cloudflare`, packaging the proxy handler at `apps/web/src/worker/proxy.ts` into the Worker bundle, then `wrangler deploy` from `apps/web/`. Smoke-tests `https://crewmate.ritaro.dev` returns the login page and `https://crewmate.ritaro.dev/api/healthz` returns 200. Gated by the same `prod` environment approval. |

No long-lived deploy keys committed anywhere. The Cloudflare side uses a scoped API token; the Fly.io side uses `FLY_API_TOKEN`, both stored as GitHub Actions secrets.

**Done when.** `https://crewmate.ritaro.dev` returns the login page over HTTPS. `https://crewmate.ritaro.dev/api/healthz` returns 200 through the Worker proxy. A direct request to `https://crewmate-api.fly.dev` without the shared secret returns 401. The seeded admin can log in. Subscription updates work across two browsers over `wss://crewmate.ritaro.dev/ws`. A webhook test delivery from `/settings/webhooks` lands in the deliveries log.

**Reads.** `docs/AGENT-SETUP.md` (deploy section), `docs/guardrails/shared/03-security.md`.

---

## Cross-references

- `docs/FEATURES.md` — feature catalog (`F-NNN`). Every layer above lists the features it realizes.
- `docs/execution/00-phasing.md` — execution order. Reorders these layers into 5 build phases with parallelism caps and gates. Deploy (layer 12) ships in phase 1 so every later phase pushes to `https://crewmate.ritaro.dev` on merge.
- `docs/execution/01-agent-workflow.md` — how agents pick up work from a layer and ship it.
- `docs/guardrails/` — the rules every layer must respect.
- `docs/images/` — visual contracts for UI surfaces (layer 8) and architecture diagrams (this file is its written counterpart).
