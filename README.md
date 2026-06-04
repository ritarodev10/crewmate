# CrewMate

A multi-tenant operations API for coordinating field work across properties and crews. Built for property and hospitality operators who need to assign jobs, track status in real time, and keep the office and the field in sync.

> **Status.** v0.1, actively built. See [Roadmap](#roadmap) for what is and is not in scope.

The authoritative spec of what ships in v0.1 lives in [`docs/FEATURES.md`](./docs/FEATURES.md). The roadmap below is a summary; that file is the source of truth.

---

## What it does

CrewMate gives a small ops team three things.

1. **A dispatch board.** Every job a tenant has scheduled, in flight, or finished, on one screen, updating in real time as workers move through their day.
2. **A worker view.** A phone-sized list of today's jobs per worker, with one-tap status transitions (`Start`, `Arrive`, `Complete`).
3. **A webhook spine.** Every state change emits a signed webhook, so a property-management system or accounting tool can stay in lockstep without polling.

## Architecture at a glance

```
                ┌──────────────────────┐
                │   Web (Next.js 14)   │
                │  Dispatch · Worker   │
                │  Apollo · shadcn     │
                └──────────┬───────────┘
                           │ REST + GraphQL + WebSocket
                ┌──────────▼───────────┐
                │   API  (NestJS 10)   │
                │  Controllers /       │
                │  Resolvers /         │
                │  WebSocket gateways  │
                └──────────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
     │  Services  │  │  EventBus  │  │  Queues  │
     │ (domain)   │  │ (in-proc)  │  │ (BullMQ) │
     └──────┬─────┘  └─────┬──────┘  └────┬─────┘
            │              │              │
     ┌──────▼─────┐        │         ┌────▼──────────┐
     │ Repositories│       │         │ Workers       │
     │  (Prisma)  │        │         │ webhook ·     │
     └──────┬─────┘        │         │ notifications │
            │              │         └────┬──────────┘
     ┌──────▼─────┐        │              │
     │ PostgreSQL │        │         ┌────▼──────┐
     └────────────┘        │         │   Redis   │
                           │         └───────────┘
                           ▼
                    WebSocket fan-out
                    to tenant rooms
```

Three flows worth calling out.

- **Transactional writes** go through repositories with explicit tenant scoping. Every query on a tenant-owned model includes `tenantId`, enforced at the data layer, not at the controller.
- **Side effects fan out via events.** A status transition writes one DB row and emits `job.status.changed`. Listeners forward to the WebSocket gateway (for the dashboard) and to a BullMQ queue (for webhook delivery and notifications). The publisher does not care who is listening.
- **Webhook delivery is its own bounded concern.** Signed payloads, retried with exponential backoff, every attempt logged in `webhook_deliveries`. Failed deliveries surface in the operator UI.

## Stack

| Layer | Choice | Why |
|---|---|---|
| API framework | NestJS 11 | Opinionated structure, DI, batteries for guards, pipes, queues, GraphQL |
| Language | TypeScript (strict) | Catches the bugs the runtime will not |
| DB | PostgreSQL 17 | Boring, sharp, well-understood |
| ORM | Prisma | Type-safe, migrations included, fast iteration |
| Cache and queues | Redis + BullMQ | Same primitive for both, retries and dead-letters out of the box |
| Auth | Passport JWT (access + refresh) | Stateless, easy to test, easy to rotate |
| Realtime | Native NestJS WebSocket gateway | One transport, no extra service to run |
| GraphQL server | `@nestjs/graphql` (code-first, Apollo) | Single source of types with the REST DTOs |
| GraphQL client | Apollo Client (web) | Normalized cache, subscriptions over a WS link |
| Server state (REST) | TanStack Query (web) | Caching, polling, optimistic updates for the non-GraphQL surface (file uploads, third-party calls, REST-only endpoints) |
| Validation | `class-validator` + `class-transformer` | DTOs become the contract |
| Tests | Jest + Supertest | Unit, integration, and e2e in one runner |
| Web | Next.js 15 (App Router) + Tailwind 4 | Server components for dashboards, fast iteration |
| UI components | shadcn/ui (Radix primitives) | Owned in-repo, accessible by default, no design lock-in |
| Client state | Zustand | Small footprint for ephemeral UI where SSR and the Apollo cache do not fit (filters, drag selection, optimistic toggles) |
| Animation | Motion (formerly Framer Motion) | Declarative React animation, consumes the `--motion-*` tokens, honors `useReducedMotion` |
| Logging | pino (structured JSON) | Plays well with CloudWatch and any log aggregator |
| Email | Resend | Transactional email in production via Resend; MailHog locally |
| Containerization | Docker + docker-compose | One command to bring the world up |
| CI | GitHub Actions | Lint, typecheck, test, build, on every PR |
| Package manager | pnpm (workspaces) | Fast, strict, monorepo-native |
| Web deploy | Cloudflare Workers via `@opennextjs/cloudflare` | Edge runtime for the Next.js app; the same Worker also reverse-proxies `/api/*`, `/v1/*`, `/graphql`, and `/ws` to the AWS backend; pushed via `wrangler` from a GitHub Actions workflow |
| API deploy | AWS ECS Fargate behind an ALB | Long-running container for NestJS and the BullMQ worker (same image, different command); no public domain, reachable only through the Cloudflare Worker proxy |

## Project structure

```
crewmate/
├─ apps/
│  ├─ api/                       # NestJS API + BullMQ worker (same image)
│  └─ web/                       # Next.js dashboard + worker view
│     ├─ wrangler.toml           # Cloudflare Workers config for the web
│     └─ src/worker/proxy.ts     # Reverse-proxy handler in the Worker (/api/*, /v1/*, /graphql, /ws → AWS backend)
├─ packages/
│  ├─ contracts/                 # Shared DTOs and GraphQL types
│  └─ ui/                        # Shared React components and tokens
├─ docs/guardrails/              # Architecture, conventions, and AI guardrails
├─ prisma/                       # Schema, migrations, seed
├─ docker/                       # Local infra (postgres, redis, mailhog)
├─ docker-compose.yml
├─ infrastructure/terraform/     # AWS IaC (network, data, compute, secrets)
├─ .github/workflows/
│  ├─ ci.yml                     # Lint, typecheck, test, build on every PR
│  ├─ deploy-api.yml             # Build, push to ECR, roll api + worker on ECS
│  └─ deploy-web.yml             # Build Worker bundle, deploy via wrangler
└─ README.md
```

The API lives under `apps/api/src`, organized by feature module (`auth`, `operators`, `properties`, `workers`, `jobs`, `schedules`, `webhooks`). Every feature follows the same shape, see [`docs/guardrails/shared/00-architecture.md`](./docs/guardrails/shared/00-architecture.md).

## Quickstart

Prereqs.

- Node 22 LTS
- pnpm 10+
- Docker (for Postgres and Redis)

```bash
# 1. Install
pnpm install

# 2. Bring up local infra
docker compose up -d postgres redis

# 3. Set up env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Apply migrations and seed
pnpm --filter @crewmate/api db:migrate
pnpm --filter @crewmate/api db:seed

# 5. Run everything
pnpm dev
```

After step 5.

- API at http://localhost:3000 (REST at `/v1`, GraphQL at `/graphql`, Swagger at `/docs`)
- Web at http://localhost:3001
- Demo credentials printed by the seed script

To reset the world.

```bash
pnpm --filter @crewmate/api db:reset
```

## Demo data

The seed creates one operator (`Brookline Property Co.`), three properties, four workers, and fifteen jobs spread across the four statuses, scheduled across today and tomorrow. Demo users (printed by the seed) cover all three roles.

| Role | Email | Sees |
|---|---|---|
| Admin | `admin@brookline.test` | Everything for the operator |
| Coordinator | `coord@brookline.test` | Dispatch board, can assign and reschedule |
| Worker | `worker1@brookline.test` | Their own day on the worker view |

## Scripts

| Command | Effect |
|---|---|
| `pnpm dev` | Run API and web with hot reload |
| `pnpm --filter @crewmate/api start:dev` | API only |
| `pnpm --filter @crewmate/web dev` | Web only |
| `pnpm test` | Unit tests across the monorepo |
| `pnpm --filter @crewmate/api test:e2e` | API e2e tests (spins up Postgres) |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm typecheck` | `tsc --noEmit` across the monorepo |
| `pnpm build` | Production build for API and web |

## Testing

A light testing layer focused on the most interesting code, not a coverage floor.

- Critical-path unit tests (`*.spec.ts`), colocated. Job state machine, RBAC policy evaluator, refresh-token rotation with replay detection, the signed-webhook payload signer.
- One Supertest integration test that walks the happy worker path end to end against a real Postgres + Redis from docker-compose.
- CI runs both on every PR. No coverage gate, no frontend e2e.

See [`docs/guardrails/backend/03-testing.md`](./docs/guardrails/backend/03-testing.md) for the patterns.

## Observability

Logs are structured JSON via pino, with request ID, tenant ID, and actor ID on every line. Logs ship to CloudWatch in production via the ECS `awslogs` driver. No OpenTelemetry tracing, no Sentry, no PostHog in v0.1.

Permission decisions, webhook attempts, and queue job state share the same correlation ID, so a single request can be followed from ingress through to webhook delivery in one log query.

## AI-assisted development

This repository is built with AI pair-programming as a deliberate part of the workflow. The `docs/guardrails/` folder defines the architecture, conventions, and quality bar that every change must follow. Every AI session starts by attaching that folder as context, and every PR is held to the same review standard as one written by hand.

The point of the guardrails is not to prove that no AI was involved. It is to prove that the architecture, security model, and code quality were decided by a human, in writing, before any code was generated. See [`docs/guardrails/shared/AGENT.md`](./docs/guardrails/shared/AGENT.md) for how the AI is constrained.

## Roadmap

**In v0.1 (this build).**

- Multi-tenant auth with a four-layer authorization model. Tenancy, built-in hierarchical roles (`super_admin → tenant_admin → coordinator → worker`), custom tenant-defined roles, per-grant resource scoping (tenant, region, or property list), and policy-based conditions evaluated at the request, service, and query layer. See [`docs/guardrails/shared/04-rbac.md`](./docs/guardrails/shared/04-rbac.md).
- CRUD for operators, properties, workers, jobs, schedules.
- Job state machine (`Scheduled → En Route → In Progress → Completed → Verified`) where transitions are gated by both the state machine and the actor's role.
- Real-time dispatch board over WebSocket, job detail drawer, optimistic UI on transitions.
- Worker mobile-responsive view (`/today`) with one-tap status transitions.
- Webhook spine with signed payloads, retries, a delivery log UI, and endpoint config UI.
- Permission audit log with a filterable UI and CSV export.
- Email + password auth, 2FA via TOTP, refresh-token rotation with replay detection, invitation and password-reset flows.
- Transactional email via Resend in production (MailHog locally).
- Analytics overview page, team management with custom-role builder, settings surface.
- Single-domain deploy. Everything public lives at `crewmate.ritaro.dev`. One Cloudflare Worker serves the Next.js app (via `@opennextjs/cloudflare`) and reverse-proxies `/api/*`, `/v1/*`, `/graphql`, and `/ws` to the AWS backend. NestJS API and BullMQ worker run on AWS ECS Fargate behind an ALB that has no public domain. RDS, ElastiCache, S3, ECR sit behind the api. Cloudflare runs the authoritative DNS, edge CDN, and TLS. Terraform IaC for AWS, `apps/web/wrangler.toml` plus Wrangler secrets for the Worker. Two GitHub Actions workflows (OIDC to AWS, Cloudflare API token for Workers).
- Critical-path unit tests plus one Supertest integration test. CI runs both on every PR.

**Intentionally out of scope for v0.1.**

- Impersonation, time-bound role grants, field-level masking (RBAC model supports them, surfaces deferred to v0.2).
- Magic-link auth, SSO (SAML / OIDC).
- Bulk import and export beyond the audit-log CSV.
- PWA, service worker, offline queue, push notifications, install prompt. The worker view is a responsive web view.
- Inbound webhooks, webhook health metrics dashboard.
- SMS (Twilio), in-app notification center beyond toasts.
- Custom analytics dashboards, drilldowns, scheduled reports.
- OpenTelemetry tracing, Sentry, PostHog, status page. Pino plus CloudWatch is the v0.1 observability surface.
- Multi-environment (no staging), multi-region, blue-green, disaster-recovery runbook.
- Billing, invoicing, payments (no Stripe). Marketing site. Public API documentation portal.
- Coverage gates, Playwright e2e, performance regression tests, visual regression.
- Dark mode, theming, internationalization, RTL.

The full out-of-scope list with reasons is in [`docs/FEATURES.md`](./docs/FEATURES.md).

## Deployment notes

The production target is a single public domain. Everything answers at `https://crewmate.ritaro.dev`. One Cloudflare Worker serves the Next.js web app via the `@opennextjs/cloudflare` adapter and reverse-proxies four path prefixes (`/api/*`, `/v1/*`, `/graphql`, `/ws`) to the AWS backend. The NestJS API and the BullMQ worker share a Docker image and run on AWS ECS Fargate behind an ALB with no public domain. RDS Postgres 17 (single AZ), ElastiCache Redis 7, and S3 sit behind the api. Cloudflare runs the authoritative DNS, the edge CDN, the WAF, and the TLS via Universal SSL. There is no CloudFront and no ACM certificate for an api subdomain. Cookies are same-origin (no `Domain=` attribute). Caller authenticity to the AWS backend is enforced two ways: a shared `x-cloudflare-secret` header that the Worker injects and a NestJS guard checks, plus an ALB security group ingress restricted to Cloudflare's IP ranges.

Infrastructure is Terraform under `infrastructure/terraform/` for the AWS side and `apps/web/wrangler.toml` plus Wrangler secrets for the Worker side. Deploys run from two GitHub Actions workflows. `deploy-api.yml` uses OIDC to AWS and rolls the api and worker ECS services after running migrations. `deploy-web.yml` uses a scoped Cloudflare API token, builds the Next.js Worker bundle along with the proxy handler at `apps/web/src/worker/proxy.ts`, and ships via `wrangler deploy`. Both are gated by a manual approval on the GitHub `prod` environment. Single region, single AZ, no staging tier. See [`docs/FEATURES.md`](./docs/FEATURES.md) F-120 through F-123 for the full deployment shape.

## About this project

CrewMate is a portfolio build that mirrors a real operational domain. It exists to demonstrate full-stack work end to end. Architecture, API design, data modeling, real-time delivery, design taste in the UI, testing discipline, and a disciplined AI-assisted workflow. The code is meant to be read, not just run. Reviewers are encouraged to start with [`docs/FEATURES.md`](./docs/FEATURES.md) for the full ship list, then the `docs/guardrails/` folder for the rules, then open one feature module (`jobs/` is the densest) to see how those rules play out in practice.

Questions, feedback, or job offers welcome.

— Riza Rohman · [ritaro.dev](https://ritaro.dev) · rizarohman@ritaro.dev
