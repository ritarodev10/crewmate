# CrewMate — Agent Context

Field service operations platform. Portfolio project demonstrating real-world SaaS engineering: multi-tenant REST API, real-time WebSocket updates, schema-first full-stack development, and production deploy pipeline.

---

## Stack

| Layer | Technology |
|---|---|
| API | NestJS 11, TypeScript 5, Fastify adapter |
| Database | PostgreSQL 17 (Railway), Prisma 6 ORM |
| Cache / Queue | Redis 7 (Railway) |
| Frontend | Next.js 15 App Router, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui, CSS custom properties |
| State | TanStack Query v5 (server), Zustand v5 (client) |
| Auth | JWT — httpOnly cookies, Passport.js |
| Deploy | API → Railway, Web → Cloudflare Workers (OpenNext) |
| Package manager | **pnpm** workspaces — never npm or yarn |
| Node | 22 LTS |

---

## Monorepo Layout

```
crewmate/
├── apps/
│   ├── api/                  # NestJS API
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── {module}/     # jobs/, workers/, auth/, dashboard/, etc.
│   └── web/                  # Next.js 15
│       └── src/
│           ├── app/
│           │   ├── (app)/    # authenticated routes
│           │   ├── (auth)/   # login
│           │   └── worker/   # mobile worker view
│           ├── components/   # shared components (used by 2+ pages)
│           ├── hooks/        # shared hooks
│           ├── stores/       # Zustand stores
│           ├── types/        # api.ts — interfaces mirroring Prisma schema
│           └── lib/          # query client, utils
├── prisma/
│   ├── schema.prisma         # THE CONTRACT — source of truth for both tracks
│   └── seed.ts
├── docker/
│   └── api.Dockerfile        # 4-stage build
├── .github/workflows/        # ci.yml, deploy-api.yml, deploy-web.yml
├── docs/
│   ├── PRD/                  # screens/, SYSTEM-MAP.md, SEED-DATA.md
│   └── conventions/          # shared/, frontend/, backend/
├── .planning/
│   ├── STATE.md              # task tracking (checkboxes)
│   └── summaries/            # wave summaries (auto-generated)
├── docs/handoffs/            # session handoff docs
├── STATUS.md                 # current phase + session continuity
├── ROADMAP.md                # phase/wave breakdown
└── CLAUDE.md                 # this file
```

---

## Critical Guardrails

These apply to every agent in every context. No exceptions.

**Security**
- `operatorId` always from JWT payload — never from request body or query params
- Every non-health endpoint requires `JwtAuthGuard` + `RolesGuard`
- Validate `x-cloudflare-secret` header on all routes via `CloudflareSecretGuard`
- DTOs always use `whitelist: true, forbidNonWhitelisted: true`

**Data**
- All money values in **integer cents** — no floats anywhere
- `prisma/schema.prisma` is the single contract — both API and web types derive from it
- Every Prisma query must scope by `operatorId` — no cross-tenant data leaks
- Never use `$queryRawUnsafe`

**TypeScript**
- No `any` — use `unknown` and narrow, or define the type
- Strict mode on everywhere
- Path aliases: `@api/*` → `apps/api/src/*`, `@web/*` → `apps/web/src/*`

**Frontend**
- Server Components by default — `'use client'` only when you need browser APIs, event handlers, or hooks
- In Next.js 15, `params` is a Promise — always `await params`
- All API responses shaped as `{ data: T }` — unwrap on the client
- Named exports only for components — never default export

**Process**
- Schema changes always get their own wave — they block everything downstream
- Run `pnpm` — never `npm` or `yarn`

---

## Key Files

| What | Where |
|---|---|
| Current phase + session state | `STATUS.md` |
| Task breakdown (all phases) | `.planning/STATE.md` |
| Phase/wave roadmap | `ROADMAP.md` |
| PRD screens | `docs/PRD/screens/` |
| Entity relationships | `docs/PRD/SYSTEM-MAP.md` |
| Seed data spec | `docs/PRD/SEED-DATA.md` |
| Convention index | `docs/conventions/_INDEX.md` |
| Agent roster | `.claude/agents/_INDEX.md` |
| Execution playbook | `.claude/PLAYBOOK.md` |
| Credentials + env vars | `docs/credentials.md` (git-excluded — local only) |

---

## Convention Loading Order

Agents load conventions via `@file` refs in their own system prompts. If you need to check a rule, start here:

1. `docs/conventions/shared/` — applies everywhere (TypeScript, naming, security, git)
2. `docs/conventions/backend/` — NestJS modules, API shapes, Prisma, WebSocket
3. `docs/conventions/frontend/` — directory structure, components, state, routing, performance

---

## Dev Commands

## Local Ports

| Service | Port |
|---|---|
| Web (Next.js) | `6200` |
| API (NestJS) | `6201` |
| Postgres | `5432` |
| Redis | `6379` |

---

## Dev Commands

```bash
pnpm install                        # install all workspaces
pnpm dev                            # start api + web in parallel
pnpm --filter api dev               # api only (port 6201)
pnpm --filter web dev               # web only (port 6200)
pnpm --filter api test              # api unit tests
pnpm --filter api test:e2e          # api e2e tests
pnpm --filter web lint              # web lint
pnpm typecheck                      # typecheck all workspaces
docker-compose up -d                # start postgres + redis locally
npx prisma migrate dev              # run migrations
npx prisma db seed                  # seed demo data
npx prisma studio                   # inspect DB in browser
```

---

## Deploy Targets

| Service | Platform | Trigger |
|---|---|---|
| API | Railway | push to `main` via `deploy-api.yml` |
| Web | Cloudflare Workers | push to `main` via `deploy-web.yml` |
| DB | Railway (Postgres 17) | managed |
| Cache | Railway (Redis 7) | managed |

Production URL: `crewmate.ritaro.dev`
API URL: `api.crewmate.ritaro.dev` → Railway (CNAME to Railway service URL)
CF Worker calls `api.crewmate.ritaro.dev`, injects `x-cloudflare-secret` — API rejects requests without it

**Credentials, tokens, and infrastructure IDs:** see `docs/credentials.md` (git-excluded)
