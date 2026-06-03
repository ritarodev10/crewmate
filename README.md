# CrewMate

A multi-tenant operations API for coordinating field work across properties and crews. Built for property and hospitality operators who need to assign jobs, track status in real time, and keep the office and the field in sync.

> **Status.** v0.1, actively built. See [Roadmap](#roadmap) for what is and is not in scope.

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
| API framework | NestJS 10 | Opinionated structure, DI, batteries for guards, pipes, queues, GraphQL |
| Language | TypeScript (strict) | Catches the bugs the runtime will not |
| DB | PostgreSQL 16 | Boring, sharp, well-understood |
| ORM | Prisma | Type-safe, migrations included, fast iteration |
| Cache and queues | Redis + BullMQ | Same primitive for both, retries and dead-letters out of the box |
| Auth | Passport JWT (access + refresh) | Stateless, easy to test, easy to rotate |
| Realtime | Native NestJS WebSocket gateway | One transport, no extra service to run |
| GraphQL server | `@nestjs/graphql` (code-first, Apollo) | Single source of types with the REST DTOs |
| GraphQL client | Apollo Client (web) | Normalized cache, subscriptions over a WS link |
| Server state (REST) | TanStack Query (web) | Caching, polling, optimistic updates for the non-GraphQL surface (file uploads, third-party calls, REST-only endpoints) |
| Validation | `class-validator` + `class-transformer` | DTOs become the contract |
| Tests | Jest + Supertest | Unit, integration, and e2e in one runner |
| Web | Next.js 14 (App Router) + Tailwind | Server components for dashboards, fast iteration |
| UI components | shadcn/ui (Radix primitives) | Owned in-repo, accessible by default, no design lock-in |
| Client state | Zustand | Small footprint for ephemeral UI where SSR and the Apollo cache do not fit (filters, drag selection, optimistic toggles) |
| Animation | Motion (formerly Framer Motion) | Declarative React animation, consumes the `--motion-*` tokens, honors `useReducedMotion` |
| Logging | pino (structured JSON) | Plays well with CloudWatch and any log aggregator |
| Tracing | OpenTelemetry (HTTP + Prisma + BullMQ) | Vendor-neutral, exports to CloudWatch, Honeycomb, or Tempo |
| Containerization | Docker + docker-compose | One command to bring the world up |
| CI | GitHub Actions | Lint, typecheck, test, build, on every PR |
| Package manager | pnpm (workspaces) | Fast, strict, monorepo-native |

## Project structure

```
crewmate/
├─ apps/
│  ├─ api/              # NestJS API
│  └─ web/              # Next.js dashboard + worker view
├─ packages/
│  ├─ contracts/        # Shared DTOs and GraphQL types
│  └─ ui/               # Shared React components and tokens
├─ nestjs-ai-guardrails/  # Architecture, conventions, and AI guardrails
├─ prisma/              # Schema, migrations, seed
├─ docker/              # Local infra (postgres, redis, mailhog)
├─ docker-compose.yml
├─ .github/workflows/   # CI
└─ README.md
```

The API lives under `apps/api/src`, organized by feature module (`auth`, `operators`, `properties`, `workers`, `jobs`, `schedules`, `webhooks`). Every feature follows the same shape, see [`nestjs-ai-guardrails/01-ARCHITECTURE.md`](./nestjs-ai-guardrails/01-ARCHITECTURE.md).

## Quickstart

Prereqs.

- Node 20+
- pnpm 9+
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

- Unit tests for every service (`*.spec.ts`), colocated.
- Integration tests for repositories (`*.int-spec.ts`) against a real Postgres in CI.
- e2e tests for every endpoint (`*.e2e-spec.ts`) exercising guards, pipes, and filters.
- Coverage floor 75% overall, 85% on services. CI fails below that.

See [`nestjs-ai-guardrails/07-TESTING.md`](./nestjs-ai-guardrails/07-TESTING.md) for the patterns.

## Observability

Logs are structured JSON via pino, with request ID, tenant ID, and actor ID on every line. Traces go through OpenTelemetry, instrumented at the HTTP, Prisma, and BullMQ layers, and ship to any OTLP backend (CloudWatch on AWS by default). Metrics are exposed at `/metrics` for Prometheus or the CloudWatch agent to scrape.

Permission decisions, webhook attempts, and queue job state share the same correlation ID, so a single request can be followed from ingress through to webhook delivery in one query.

## AI-assisted development

This repository is built with AI pair-programming as a deliberate part of the workflow. The `nestjs-ai-guardrails/` folder defines the architecture, conventions, and quality bar that every change must follow. Every AI session starts by attaching that folder as context, and every PR is held to the same review standard as one written by hand.

The point of the guardrails is not to prove that no AI was involved. It is to prove that the architecture, security model, and code quality were decided by a human, in writing, before any code was generated. See [`nestjs-ai-guardrails/AGENT.md`](./nestjs-ai-guardrails/AGENT.md) for how the AI is constrained.

## Roadmap

**In v0.1 (this build).**

- Multi-tenant auth with a four-layer authorization model. Tenancy, hierarchical roles (`super_admin → tenant_admin → coordinator → worker`), per-grant resource scoping (tenant, region, or property list), and policy-based conditions evaluated at the request, the service, and the query layer. See [`nestjs-ai-guardrails/09-RBAC.md`](./nestjs-ai-guardrails/09-RBAC.md).
- CRUD for operators, properties, workers, jobs, schedules.
- Job state machine (`Scheduled → En Route → In Progress → Completed → Verified`) where transitions are gated by both the state machine and the actor's role.
- Real-time dispatch board over WebSocket.
- Webhook spine with signed payloads, retries, and a delivery log.
- Permission audit log. Every authorization decision (allow and deny) is recorded.
- Dashboard (Next.js) and worker mobile view.
- Seed data, e2e tests, docker-compose, CI.

**Intentionally out of scope for v0.1.**

- Custom tenant-defined roles, time-bound role grants, impersonation, and field-level masking. The RBAC model is designed for them, the implementation is deferred to v0.2. See the "what is intentionally not in v0.1" section of [`09-RBAC.md`](./nestjs-ai-guardrails/09-RBAC.md).
- Billing, invoicing, and payments.
- Email and SMS providers (delivery is stubbed behind a webhook URL).
- Native mobile apps. The worker view is a responsive web view.
- Multi-region deployment, blue-green, geo replication.
- Audit log surfacing in the UI (recorded but not yet rendered).
- Bulk import and export.

Each of these has a known shape and is one or two phases of work, not a research project. Tracked in `docs/roadmap.md`.

## Deployment notes

The production target is AWS. The default path uses ECS Fargate for the API and the BullMQ worker (same image, different command), RDS for Postgres, ElastiCache for Redis, S3 for any object storage, SES for transactional email, and CloudWatch for structured logs, metrics, and traces. The API is stateless, the queue worker is a separate container with the same image, and migrations run as an init container before the API starts.

An EKS / Kubernetes path is documented as an alternative (Helm chart sketched in `docs/deployment.md`), with App Runner and Fly.io listed as cheaper-to-operate fallbacks and the trade-offs spelled out.

## About this project

CrewMate is a portfolio build that mirrors a real operational domain. It exists to demonstrate full-stack work end to end. Architecture, API design, data modeling, real-time delivery, design taste in the UI, testing discipline, and a disciplined AI-assisted workflow. The code is meant to be read, not just run. Reviewers are encouraged to start with the `nestjs-ai-guardrails/` folder, then open one feature module (`jobs/` is the densest) to see how the rules play out in practice.

Questions, feedback, or job offers welcome.

— Riza Rohman · [ritaro.dev](https://ritaro.dev) · rizarohman@ritaro.dev
