# Agent Setup

What an AI agent (Claude Code or equivalent) needs in order to do meaningful work on CrewMate end to end. Three sections: the tech stack the agent will be working in, what you (the human) need to install or configure on your machine, and the secrets and accounts to provide as the project grows from "running locally" to "shipping to production".

Defaults are listed wherever sensible so you can skim and copy.

---

## Tech stack

The full stack the agent assumes. Anything not listed here is fair game to introduce only if asked.

### API (`apps/api`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | NestJS 10 | Code is organized by feature module under `apps/api/src` |
| Language | TypeScript (strict) | `tsconfig.base.json` is the source of truth |
| ORM | Prisma | Schema at `prisma/schema.prisma`, migrations in `prisma/migrations` |
| Database | PostgreSQL 16 | Local via Docker, prod via RDS |
| Cache and queues | Redis + BullMQ | Same Redis used for both |
| Auth | Passport JWT (access + refresh) | `JWT_SECRET` required |
| Realtime | Native NestJS WebSocket gateway | Tenant rooms |
| GraphQL server | `@nestjs/graphql` (code-first, Apollo) | Schema generated from decorators |
| Validation | `class-validator` + `class-transformer` | DTOs are the contract |
| Tests | Jest + Supertest | Unit, integration, e2e in one runner |
| Logging | pino (structured JSON) | Request ID, tenant ID, actor ID on every line |
| Tracing | OpenTelemetry | OTLP exporter, lands in CloudWatch by default |

### Web (`apps/web`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components for dashboards |
| Language | TypeScript (strict) | Same `tsconfig.base.json` |
| Styling | Tailwind CSS | Plus tokens shared via `@crewmate/ui` |
| Components | shadcn/ui (Radix primitives) | Owned in repo, not a dependency |
| GraphQL client | Apollo Client | Normalized cache, subscriptions over WS link |
| Server state (REST) | TanStack Query | Caching, polling, optimistic updates for non-GraphQL endpoints |
| Client state | Zustand | Only for ephemeral UI that SSR and Apollo cache do not cover |
| Animation | Motion | Declarative React animation, consumes `--motion-*` tokens, honors `useReducedMotion` |

### Shared (`packages/*`)

| Package | Purpose |
|---|---|
| `@crewmate/contracts` | Shared DTOs and GraphQL types between API and web |
| `@crewmate/ui` | Shared React components and design tokens |

### Tooling

| Tool | Purpose |
|---|---|
| pnpm 9 (workspaces) | Package manager, monorepo native |
| Docker + docker-compose | Local Postgres, Redis, Mailhog |
| GitHub Actions | Lint, typecheck, test, build on every PR |
| ESLint + Prettier | Style enforcement |
| Husky + lint-staged | Pre-commit gates |

### Deployment target

AWS, default path. EKS / App Runner / Fly.io are documented as alternatives.

| Service | Used for |
|---|---|
| ECS Fargate | API container + BullMQ worker container (same image, different command) |
| RDS Postgres | Primary database |
| ElastiCache Redis | Cache and queue broker |
| S3 | Object storage (attachments, exports) |
| SES | Transactional email (when wired) |
| CloudWatch | Logs, metrics, traces |
| ECR | Container registry |

---

## What you need to provide

Grouped by the moment you'll need it. Each item lists whether it's blocking and how to get it.

### 1. Local machine (before the agent can do anything)

| Need | How | Blocking? |
|---|---|---|
| Node 20+ | `nvm install 20` or `brew install node` | Yes |
| pnpm 9+ | `npm i -g pnpm` or `corepack enable && corepack prepare pnpm@latest --activate` | Yes |
| Docker Desktop | Install from docker.com | Yes, for local Postgres and Redis |
| Git | Pre-installed on macOS; `brew install git` to be sure | Yes |

The agent will not install runtimes for you. If any of these are missing it will stop and ask.

### 2. Local environment secrets (before the API starts)

These go in `apps/api/.env` (copy from `apps/api/.env.example`). All can be auto-generated. You only need to keep them stable across restarts so JWTs and webhook signatures keep verifying.

| Variable | Purpose | Default / how to generate |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://crewmate:crewmate@localhost:5432/crewmate` (matches docker-compose) |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` (matches docker-compose) |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Signs refresh tokens | `openssl rand -hex 32` |
| `WEBHOOK_SIGNING_SECRET` | Signs outbound webhook payloads | `openssl rand -hex 32` |
| `SESSION_SECRET` | Cookie signing for session middleware | `openssl rand -hex 32` |
| `NODE_ENV` | `development` locally | `development` |
| `LOG_LEVEL` | `debug` locally, `info` in prod | `debug` |

For the web app (`apps/web/.env.local`):

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | REST + GraphQL base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3000` |

If you want the agent to generate these for you on first run, just say "set up local env" and it will write the file with fresh secrets.

### 3. Optional integrations (deferrable, the project runs without them)

The agent will mock these until you decide to wire them. If you want real ones, drop the credentials below into `apps/api/.env`.

| Integration | Variables | Where to get |
|---|---|---|
| Outbound email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Use [Mailhog](https://github.com/mailhog/MailHog) (already in docker-compose) for local. For real, pick one of: AWS SES, Resend, Postmark, Mailgun |
| Webhook destination for testing | `WEBHOOK_TEST_URL` | Free endpoint at [webhook.site](https://webhook.site) — paste your unique URL |
| Sentry (error tracking) | `SENTRY_DSN` | Free tier at sentry.io, create a Node project, copy DSN |
| PostHog (product analytics) | `POSTHOG_API_KEY`, `POSTHOG_HOST` | Free tier at posthog.com |

None of these block local development. The agent will use stub implementations and log to console until you provide real values.

### 4. Source control and CI (when you're ready to push)

| Need | Why | How |
|---|---|---|
| GitHub repo | Hosting and CI | Create at github.com/new — push the project as a new repo |
| GitHub Actions secrets | CI workflows | Settings → Secrets and variables → Actions |

The CI workflow (`.github/workflows/ci.yml`) reads `DATABASE_URL` and a few others from a service container, so no secrets are required just to make CI green. You'll only add secrets when you want CI to deploy.

### 5. Deployment to AWS (when you're ready to ship)

These are needed only when the agent is asked to provision or deploy. Until then, leave them out.

| Need | What for | Notes |
|---|---|---|
| AWS account | All cloud services | Sign up at aws.amazon.com — free tier is enough for v0.1 |
| IAM user or role | Programmatic access | Create an IAM user with `AdministratorAccess` to start, narrow later. Or use OIDC from GitHub Actions (preferred, no long-lived keys) |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | For Terraform / CDK / GitHub Actions | Only if not using OIDC. Stored as GitHub Actions secrets, never committed |
| `AWS_REGION` | Default region | `us-east-1` or `eu-west-1` are common picks |
| Domain name | Custom domain for the app | Buy via Route 53, Cloudflare, or any registrar |
| ACM certificate | HTTPS | The agent will request one via ACM in your chosen region |
| `ECR_REPOSITORY` | Container registry | The agent will create this if missing |

The agent will not spin up paid AWS resources without confirming with you first. Anything that would incur cost is gated behind an explicit "yes, proceed" from you.

### 6. Observability backends (optional, mostly free tiers)

These slot in at deployment time. CloudWatch is the default and requires nothing extra beyond the AWS credentials above.

| Backend | When to use |
|---|---|
| CloudWatch | Default. Logs, metrics, traces. Free for moderate volume |
| Honeycomb | Better trace exploration. Free tier exists |
| Datadog | More complete but paid |
| Grafana Cloud + Tempo | Open-source-friendly path |

If you go with any non-CloudWatch backend, you'll add its `OTEL_EXPORTER_OTLP_ENDPOINT` and auth header to the API env.

---

## Quick-start recipe for the agent

If you want the fastest path to "I can ask the agent to build features", here's the minimum sequence:

1. Install Node, pnpm, Docker.
2. Tell the agent: "set up local env". It will:
   - Copy `.env.example` files
   - Generate fresh secrets
   - Bring up Postgres and Redis via docker-compose
   - Run migrations and seed data
   - Print demo credentials
3. Open http://localhost:3001 (web) and http://localhost:3000/docs (API Swagger).
4. From here, the agent can build and modify features without needing anything else from you, until you decide to ship.

Everything in section 3 onward is "later" work. You do not need to gather it up front.

---

## What the agent will never do unprompted

For your own peace of mind:

- Push to any remote
- Create or delete cloud resources
- Modify your `~/.aws/credentials` or your global git config
- Add billable third-party dependencies without flagging cost
- Skip pre-commit hooks or commit signing
- Force-push, amend published commits, or delete branches

Anything in that list will be proposed first, with the trade-off named, and the agent will wait for an explicit "go".
