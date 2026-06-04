# CrewMate — Claude Context

Field service operations platform. NestJS 11 API + Next.js 15 web, deployed as a single domain on Cloudflare Workers (web) + Fly.io (api). pnpm monorepo.

## Read before touching any code

```
docs/guardrails/shared/AGENT.md        ← operating rules for all agents. Read first, always.
docs/guardrails/README.md              ← reading order by domain
docs/FEATURES.md                       ← authoritative feature spec (F-NNN IDs)
docs/BUILD.md                          ← 12 architectural layers, what each owns
docs/execution/00-phasing.md           ← 5 build phases and their gates
docs/execution/01-agent-workflow.md    ← branch naming, worktrees, review, merge
```

## Your task brief

If `.task-brief.md` exists in your working directory, read it before anything else. It names:
- the files you may touch (stay inside scope or the reviewer rejects)
- the F-NNN features you realize
- the acceptance check you must pass before declaring done

## Stack

| Side | Key choices |
|---|---|
| API | NestJS 11, TypeScript strict, Prisma 6, PostgreSQL 17, Redis + BullMQ, Passport JWT, `@nestjs/graphql` code-first |
| Web | Next.js 15 App Router, React 19, Tailwind 4, shadcn/ui, Apollo Client 4, TanStack Query 5, Zustand 5, Motion |
| Shared | `@crewmate/contracts` (DTOs + GraphQL types), `@crewmate/ui` (tokens + components) |
| Deploy | Cloudflare Workers via `@opennextjs/cloudflare` (web), Fly.io (api — `fly.toml` at repo root) |

## Monorepo layout

```
apps/api/        NestJS API
apps/web/        Next.js web
packages/
  contracts/     Shared types and GraphQL SDL
  ui/            Shared components and design tokens
prisma/          Schema, migrations, seed
infrastructure/  Terraform modules
docs/            Guardrails, build plan, execution docs, images
```

## Non-negotiables

- Every tenant-scoped query includes `operatorId`. No exceptions.
- No `any`. No `console.log`. No `process.env` outside `core/config`. No default exports.
- Touch only files listed in your task brief's "Files in scope". Out-of-scope edits fail review.
- No new npm packages without flagging cost and asking first.
- Never push to `main` directly. Every task ships via a reviewed PR.
- Never skip pre-commit hooks or force-push.
- Never create or delete cloud resources without explicit approval.

## Backend guardrails reading order

1. `docs/guardrails/shared/AGENT.md`
2. `docs/guardrails/shared/00-architecture.md`
3. `docs/guardrails/shared/01-conventions.md`
4. `docs/guardrails/backend/00-nestjs.md`
5. `docs/guardrails/backend/01-data.md`
6. `docs/guardrails/backend/02-api.md`
7. `docs/guardrails/shared/02-events.md`
8. `docs/guardrails/backend/03-testing.md`
9. `docs/guardrails/shared/03-security.md`
10. `docs/guardrails/shared/04-rbac.md`

## Frontend guardrails reading order

1. `docs/guardrails/shared/AGENT.md`
2. `docs/guardrails/frontend/README.md`
3. `docs/guardrails/frontend/00-design-system.md`
4. `docs/guardrails/frontend/01-components.md`
5. The specific surface chapter for the screen you're building (e.g. `14-dispatch-board.md`)
6. `docs/guardrails/frontend/05-data-fetching.md` if the screen fetches data
7. `docs/guardrails/shared/04-rbac.md` if the screen renders role-gated content

## Local dev

```bash
docker compose up -d                   # postgres :5432, redis :6379, mailhog :8025
pnpm install
pnpm prisma migrate dev
pnpm db:seed
pnpm dev                               # api :3000, web :3001
```

## Key env vars

`apps/api/.env` — `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEBHOOK_SIGNING_SECRET`
`apps/web/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3000`, `NEXT_PUBLIC_WS_URL=ws://localhost:3000`
