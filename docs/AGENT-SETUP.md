# Agent Setup

What an AI agent (Claude Code or equivalent) needs in order to do meaningful work on CrewMate end to end. Three sections: the tech stack the agent will be working in, what you (the human) need to install or configure on your machine, and the secrets and accounts to provide as the project grows from "running locally" to "shipping to production".

Defaults are listed wherever sensible so you can skim and copy.

---

## Read these first

Before doing any meaningful work on this codebase, every agent attaches the following as context. Non-negotiable.

| File / folder | What it gives you |
|---|---|
| `docs/FEATURES.md` | The authoritative spec of what ships in v0.1. Every feature has a stable `F-NNN` ID with scope, surface, spec links, and acceptance check. Read this first. |
| `docs/guardrails/` | Architecture rules, conventions, RBAC model, testing patterns, security boundaries. Organized into `shared/`, `backend/`, `frontend/` subfolders. |
| `prisma/schema.prisma` | Data model. Already designed. Do not invent shapes; extend the schema and migrate. |
| `docs/BUILD.md` | The implementation, organized by 13 architectural layers. Each layer names what it is, where its code lives, what it depends on, which F-NNN features it realizes, and what done looks like. |
| `docs/execution/` | The order in which the layers get built (5 phases with explicit human gates) and the mechanics of running a swarm of AI agents safely (branches, worktrees, code review, merge). |
| `docs/guardrails/frontend/` | Design system tokens, component catalog, and surface chapters. Every UI task references this. |
| `docs/images/` | Rendered diagrams (architecture, RBAC, job state machine) and UI screens. These are the visual contract. |
| This file | Stack, env vars, secrets, and what the agent will never do unprompted. |

---

## Accounts and credentials at a glance

Everything below is documented in more depth in the sections that follow. This table is the picture you skim first.

| Account or service | What it is for | When you need it | Start at |
|---|---|---|---|
| claude.ai subscription | Running the Claude Code agents (CLI signs in to this) | Now, blocking | claude.ai |
| GitHub | Source control plus Actions for CI and deploy | Soon, before you push the repo | github.com |
| Cloudflare | Workers deploy, DNS, TLS for `ritaro.dev` | Phase 1 deploy wave | cloudflare.com |
| Fly.io | API backend, managed Postgres, Fly secrets | Phase 1 deploy wave | fly.io |
| Upstash | Managed Redis (free tier, `rediss://` URL set as Fly secret) | Phase 1 deploy wave | upstash.com |
| webhook.site | Free public test target so seeded webhook deliveries have somewhere real to land | Optional, used by seed | webhook.site |
| Resend | Production transactional email | When F-070 promotes from Planned to Live | resend.com |
| ChatGPT Plus subscription | Optional, image generation via `codex` for any new UI mock asset | Optional | chat.openai.com |
| MCP servers | Extend the agent with structured tool calls (Context7 docs, Postgres + Redis introspection, browser automation) | Configured per agent runner | see section 2 |

> AWS IaC reference code lives in `infrastructure/terraform/` — not applied to any live environment. It is retained as a portfolio artifact documenting the original AWS architecture.

The agent never signs up for anything on your behalf. Sign up yourself, then drop the resulting credentials where the section below tells you to.

---

## Centralized credentials file (`CREDENTIALS.local.md`)

For a multi-agent build, having every credential scattered across `~/.aws/credentials`, `~/.wrangler/`, shell rc files, AWS Secrets Manager, GitHub Actions secrets, and Wrangler secrets is correct but slow to navigate when an agent is mid-task and needs to confirm a value. The pragmatic shortcut is a single local file at the repo root that lists every secret in one place.

> This is intentionally not a security best practice. It is a usability shortcut for an AI-driven solo build. The file never leaves this machine and never enters git.

**File.** `CREDENTIALS.local.md` at the repo root. Already listed in `.git/info/exclude` next to `COMMIT-PLAN.md`. Treat it as personal scratch paper, not a deliverable.

**What it holds.** Every credential that the project ever asks for: service tokens, account IDs, generated local secrets, demo passwords, webhook test URLs, deploy targets. Each entry follows a fixed shape so the agent can locate values predictably.

**Entry shape.**

```markdown
### <service> — <what for>

- Key: <env var name or label>
- Value: <paste here>
- Where it must also live: <e.g. ~/.aws/credentials [crewmate], GitHub Actions secret, AWS Secrets Manager>
- Created: YYYY-MM-DD
- Rotate by: YYYY-MM-DD or "as needed"
```

**Workflow.**

1. Sign up for a service per the relevant section below.
2. Paste the resulting credential into `CREDENTIALS.local.md` under the matching service block.
3. Also propagate the value to wherever it actually needs to live (CLI credential file, GitHub Actions secret, Secrets Manager, Wrangler secret) per the "Where it must also live" line.
4. When an agent needs the credential at runtime, it reads from the canonical location (env var, credentials file, secret manager), not from `CREDENTIALS.local.md`. The local file is a human-readable index, not a runtime source.

**Hardening when the portfolio ships publicly.**

- `shred -u CREDENTIALS.local.md && touch CREDENTIALS.local.md` after the build if the repo will be made public. The `.git/info/exclude` entry stops accidental commits in the meantime.
- Never copy the file into any other location, any chat transcript, or any cloud sync directory.
- If you reuse this template for another project, regenerate every secret on the new project rather than copying values across.

The file is generated for you the first time the agent runs "set up local env"; the initial version is all placeholders. From then on it is yours to maintain.

---

## Setup status

A snapshot of what is currently present on your machine and in this repo, measured against the expectations of every section below. Sorted by what blocks work today, then what blocks deploy, then optional. Status uses `OK / MISSING / TODO / OPTIONAL / DEFERRED`.

**Last audited.** 2026-06-04 on macOS, shell zsh.

To refresh this section, run the audit script at the bottom and ask the agent to update the tables.

### Local machine and CLIs

| Item | Status | Action |
|---|---|---|
| Node 22+ | OK (v22.22.0) | none |
| pnpm 10+ | OK (v10.15.0, pinned in `package.json` `packageManager`) | none |
| Docker CLI | OK (29.1.3) | none |
| Docker daemon running | OK (Docker Desktop, Linux engine). `crewmate-postgres`, `crewmate-redis`, `crewmate-mailhog` all up via `docker compose up -d`. Postgres + Redis report healthy | none. `docker compose down` to stop, `docker compose up -d` to resume |
| git | OK | none |
| `gh` (GitHub CLI) | OK, authed as `ritarodev10` | none |
| `aws` CLI | OK (present for portfolio reference; not used for active deploys). Identity: `arn:aws:iam::382888552421:user/crewmate-deploy` | not blocking; `infrastructure/terraform/` is a portfolio artifact only |
| `flyctl` | TODO | `brew install flyctl`, then `fly auth login` |
| `wrangler` | OK (v4.85.0). Authed via `CLOUDFLARE_API_TOKEN` env var (verified). Default `wrangler whoami` fails because the env var is not yet in `~/.zshrc` and the OAuth flow has not run | add `export CLOUDFLARE_API_TOKEN=...` and `export CLOUDFLARE_ACCOUNT_ID=...` to `~/.zshrc` so wrangler picks them up by default, OR run `wrangler login` for OAuth |
| `claude` | OK, authed | none |
| `codex` | OK, authed | none |
| `playwriter` | OK (v0.2.0) | `playwriter skill` once before first agent use |

### AI agent skills

| Skill | Status |
|---|---|
| `frontend-design` | OK installed |
| `make-interfaces-feel-better` | OK installed |
| `baseline-ui` | OK installed |
| `cloudflare-deploy` | OK installed |
| `codex-openimage` | OK installed |
| `parallel-imagegen` | OK installed |
| `playwriter` | OK installed |
| `mcp-builder` | OK installed |
| `skill-creator` | OK installed |
| `dev-browser` | OK installed |
| Project-local `crewmate-backend` / `crewmate-frontend` / `crewmate-deploy` | OPTIONAL, not created |

### MCP servers

| Server | Status | Action |
|---|---|---|
| `context7` | OK configured | none |
| `git` (Anthropic-hosted) | OK configured | none |
| `excalidraw` | OK configured | none |
| `postgres` | OK configured, points at `postgresql://crewmate:crewmate@localhost:5432/crewmate` | none |
| `redis` | OK configured, points at `redis://localhost:6379` | none |
| `vercel`, `auggie`, `n8n`, `pencil`, `blueberry` | OK configured but unused by CrewMate | leave alone |
| GitHub MCP, Playwright MCP, Puppeteer MCP | OPTIONAL | skip; `gh` + `playwriter` cover the same ground |

### Accounts and external services

| Service | Status | Action |
|---|---|---|
| Anthropic / claude.ai | OK | none for v0.1 |
| OpenAI / ChatGPT Plus | OK (codex authed) | none |
| GitHub | OK, authed as `ritarodev10` | create the `crewmate` repo when ready to push |
| Cloudflare account | OK (ritarodev@gmail.com, account `3373131fbb96ad70dba144829d43f0d4`). Zone `ritaro.dev` ACTIVE — `dig +short NS ritaro.dev` returns `joan.ns.cloudflare.com` + `rocky.ns.cloudflare.com` | none |
| `CLOUDFLARE_API_TOKEN` | OK (in `CREDENTIALS.local.md`). Account-scoped, verified with `wrangler whoami` against the env var | add as GitHub Actions secret when repo is pushed; also add `export CLOUDFLARE_API_TOKEN=...` to `~/.zshrc` so wrangler picks it up by default |
| `CLOUDFLARE_ACCOUNT_ID` | OK (in `CREDENTIALS.local.md`) | same destinations |
| Fly.io account | TODO | sign up at fly.io, run `fly auth login`, create the app with `fly apps create crewmate-api` |
| `FLY_API_TOKEN` | TODO | generate via `fly tokens create deploy -a crewmate-api`; add as GitHub Actions secret `FLY_API_TOKEN` |
| Upstash Redis | TODO | create a free Redis database at upstash.com; set the `rediss://` URL as `fly secrets set REDIS_URL=rediss://...` |
| AWS account (portfolio reference) | OK. Account `382888552421`. IAM user `crewmate-deploy`. `infrastructure/terraform/` is retained as a portfolio artifact and is not applied to any live environment | no deploy action needed; keep credentials local for portfolio reference |
| Resend | DEFERRED (F-070 Planned) | nothing now |
| webhook.site URL | OPTIONAL | grab a URL for the seed when you reach phase 1 seed task |

### Project files

| File | Status | When needed |
|---|---|---|
| `CREDENTIALS.local.md` | OK created | fill in as values arrive |
| `apps/api/.env.example` | OK | reference only |
| `apps/api/.env` | MISSING | generated by "set up local env" agent run |
| `apps/web/.env.example` | OK | reference only |
| `apps/web/.env.local` | MISSING | generated by "set up local env" |
| `docker-compose.yml` | OK | none |
| `.github/workflows/ci.yml` | OK | none |
| `.github/workflows/deploy-api.yml` | MISSING | phase 1 wave 1.3 |
| `.github/workflows/deploy-web.yml` | MISSING | phase 1 wave 1.3 |
| `apps/web/wrangler.toml` + Worker proxy handler | MISSING | phase 1 wave 1.2 |
| `fly.toml` | MISSING | phase 1 wave 1.1 |
| `infrastructure/terraform/` | MISSING | portfolio reference artifact (not applied to any live environment) |
| Git remote `origin` | MISSING (intentional per `COMMIT-PLAN.md`) | push when ready |

### Shell env vars

Values exist; they are not yet exported in `~/.zshrc`. Until they are, you must pass them per-command (e.g. `CLOUDFLARE_API_TOKEN=... wrangler ...`).

| Variable | Status | Action |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | value in `CREDENTIALS.local.md`, not in shell | add `export CLOUDFLARE_API_TOKEN=<value>` to `~/.zshrc` |
| `CLOUDFLARE_ACCOUNT_ID` | value in `CREDENTIALS.local.md`, not in shell | add `export CLOUDFLARE_ACCOUNT_ID=3373131fbb96ad70dba144829d43f0d4` to `~/.zshrc` |
| `FLY_API_TOKEN` | TODO | generate via `fly tokens create deploy -a crewmate-api`; add `export FLY_API_TOKEN=<value>` to `~/.zshrc` and as a GitHub Actions secret |

### What blocks each phase

| Phase | Blockers right now |
|---|---|
| Phase 1 Foundation + skeleton deploy | Create Fly.io account, run `fly auth login`, create the `crewmate-api` app, provision Fly Postgres, provision Upstash Redis, generate `FLY_API_TOKEN`. Persist `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `FLY_API_TOKEN` in `~/.zshrc`. Add `FLY_API_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets when repo is pushed. (Cloudflare zone, Docker Desktop + compose stack, postgres + redis MCPs are DONE.) |
| Phase 2 UI with dummy data | nothing once phase 1 lands; merges auto-deploy via `deploy-web.yml` |
| Phase 3 Backend | add `postgres` and `redis` MCPs to `~/.claude.json` (not strictly required but high-leverage); merges auto-deploy via `deploy-api.yml` |
| Phase 4 Wire up | nothing extra; merges auto-deploy via whichever side changed |
| Phase 5 Tests and final polish | nothing extra; production has been live since phase 1 |

### Shortest path to "agent can start phase 1"

Phase 1 ships the deploy infrastructure, so the prerequisites are heavier than a pure local setup. Status as of the audit date.

| # | Step | Status |
|---|---|---|
| 1 | `corepack prepare pnpm@10 --activate` (and bump `package.json` `packageManager` to `pnpm@10.x`) | DONE |
| 2 | Open Docker Desktop AND `docker compose up -d` | DONE. All three services up; postgres + redis healthy |
| 3 | Install `flyctl` via `brew install flyctl` or `curl -L https://fly.io/install.sh | sh` | TODO |
| 4 | Sign up for Fly.io; run `fly auth login`; create app with `fly apps create crewmate-api`; provision Fly Postgres via `fly postgres create` and attach it; create Upstash Redis free tier and set `fly secrets set REDIS_URL=rediss://...`; generate deploy token via `fly tokens create deploy -a crewmate-api` | TODO |
| 5 | Sign up for Cloudflare; add the `ritaro.dev` zone; generate the scoped API token | DONE (account `3373131fbb96ad70dba144829d43f0d4`, zone ACTIVE, token verified via `wrangler whoami`) |
| 6 | Persist credentials. Add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `FLY_API_TOKEN` to `~/.zshrc`. Paste the Fly.io deploy token and Cloudflare API token into the matching GitHub Actions secrets when the repo is pushed | TODO (env vars to zshrc now; GitHub Actions secrets after `gh repo create`) |
| 7 | Add the `postgres` and `redis` blocks to `~/.claude.json` `mcpServers` per the snippet in section 2 below | DONE (restart Claude Code to pick them up) |
| 8 | Run `playwriter skill` once | TODO, run on first playwriter use |

If you want to start phase 1 work locally first and add the deploy waves later in the same phase, the minimum to begin is steps 1, 2, 7, 8. The agent can land the foundation tasks (monorepo, docker-compose, schema, CI workflow) without cloud credentials; you provide them before wave 1.1.

### How to re-audit

Run this from the repo root to regenerate the status snapshot.

```bash
echo "=== CLIs ===" ; for t in node pnpm docker git gh aws wrangler claude codex playwriter; do command -v "$t" >/dev/null 2>&1 && printf "  %-10s OK  (%s)\n" "$t" "$($t --version 2>&1 | head -1)" || printf "  %-10s MISSING\n" "$t"; done
echo "=== Auth ===" ; gh auth status 2>&1 | head -2 ; aws sts get-caller-identity 2>&1 | head -2 ; wrangler whoami 2>&1 | head -2 ; docker info >/dev/null 2>&1 && echo "docker OK" || echo "docker NOT RUNNING"
echo "=== Skills ===" ; for s in frontend-design make-interfaces-feel-better baseline-ui cloudflare-deploy codex-openimage parallel-imagegen playwriter mcp-builder; do [ -e ~/.claude/skills/$s ] && echo "  OK   $s" || echo "  MISS $s"; done
echo "=== MCPs ===" ; python3 -c "import json; d=json.load(open('$HOME/.claude.json')); [print('  '+k) for k in d.get('mcpServers',{})]" 2>/dev/null
echo "=== Project files ===" ; for f in apps/api/.env apps/web/.env.local CREDENTIALS.local.md apps/web/wrangler.toml infrastructure/terraform .github/workflows/deploy-api.yml .github/workflows/deploy-web.yml; do [ -e "$f" ] && echo "  OK   $f" || echo "  MISS $f"; done
```

Paste the output back to the agent and ask it to update this section.

---

## Tech stack

The full stack the agent assumes. Anything not listed here is fair game to introduce only if asked.

### API (`apps/api`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | NestJS 11 | Code is organized by feature module under `apps/api/src` |
| Language | TypeScript 5.6+ (strict) | `tsconfig.base.json` is the source of truth |
| ORM | Prisma 6 | Schema at `prisma/schema.prisma`, migrations in `prisma/migrations` |
| Database | PostgreSQL 17 | Local via Docker, prod via RDS |
| Cache and queues | Redis + BullMQ | Same Redis used for both |
| Auth | Passport JWT (access + refresh) | `JWT_SECRET` required |
| Realtime | Native NestJS WebSocket gateway | Tenant rooms |
| GraphQL server | `@nestjs/graphql` (code-first, Apollo) | Schema generated from decorators |
| Validation | `class-validator` + `class-transformer` | DTOs are the contract |
| Tests | Jest + Supertest | Unit, integration, e2e in one runner |
| Logging | pino (structured JSON) | Request ID, tenant ID, actor ID on every line |
| Email | Resend | Transactional email in production via Resend; MailHog locally |

### Web (`apps/web`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components for dashboards |
| Language | TypeScript 5.6+ (strict) | Same `tsconfig.base.json` |
| React | React 19 | |
| Styling | Tailwind CSS 4 | Plus tokens shared via `@crewmate/ui` |
| Components | shadcn/ui (Radix primitives) | Owned in repo, not a dependency |
| GraphQL client | Apollo Client | Normalized cache, subscriptions over WS link |
| Server state (REST) | TanStack Query | Caching, polling, optimistic updates for non-GraphQL endpoints |
| Client state | Zustand | Only for ephemeral UI that SSR and Apollo cache do not cover |
| Animation | Motion | Declarative React animation, consumes `--motion-*` tokens, honors `useReducedMotion` |
| Workers adapter | `@opennextjs/cloudflare` | Adapts the Next.js build for the Cloudflare Workers runtime; produces the bundle deployed by `wrangler` |

### Shared (`packages/*`)

| Package | Purpose |
|---|---|
| `@crewmate/contracts` | Shared DTOs and GraphQL types between API and web |
| `@crewmate/ui` | Shared React components and design tokens |

### Tooling

| Tool | Purpose |
|---|---|
| pnpm 10 (workspaces) | Package manager, monorepo native |
| Docker + docker-compose | Local Postgres, Redis, Mailhog |
| GitHub Actions | Lint, typecheck, test, build on every PR |
| ESLint + Prettier | Style enforcement |
| Husky + lint-staged | Pre-commit gates |
| wrangler | Cloudflare Workers CLI for local dev and deploy of the web app |

### Production deployment

All public traffic enters at one domain, `https://crewmate.ritaro.dev`. A single Cloudflare Worker serves the Next.js app and reverse-proxies four path prefixes (`/api/*`, `/v1/*`, `/graphql`, `/ws`) to the Fly.io backend at `https://crewmate-api.fly.dev`. The Fly.io backend is the only intended caller target; Fly.io provides HTTPS natively (no ALB or ACM certificate needed). Cookies are same-origin with no `Domain=` attribute. Single environment (prod only). Outbound email goes through Resend in production.

> AWS IaC reference code lives in `infrastructure/terraform/` — not applied to any live environment.

| Component | Service |
|---|---|
| Next.js web | Cloudflare Workers (via `@opennextjs/cloudflare`) |
| API proxy logic (`/api/*`, `/v1/*`, `/graphql`, `/ws`) | The same Cloudflare Worker, a small `fetch`-based router |
| NestJS API | Fly.io (`crewmate-api.fly.dev`), HTTPS native |
| BullMQ worker | Fly.io, same image as the API (different process command) |
| Postgres | Fly Postgres (managed by Fly, `DATABASE_URL` auto-set) |
| Redis | Upstash Redis free tier (`rediss://` URL set as Fly secret) |
| Container builds | Fly.io remote build from `fly.toml` + `docker/api.Dockerfile` |
| DNS, edge cache, WAF, TLS | Cloudflare |
| Secrets (API) | Fly.io secrets (`fly secrets set`) — DB URL, JWT secrets, webhook signing secret, `CLOUDFLARE_SHARED_SECRET` |
| Secrets (Cloudflare) | Wrangler secrets (`BACKEND_ORIGIN`, `CLOUDFLARE_SHARED_SECRET`) |
| Logs (api + worker) | Fly.io log infrastructure (stdout, viewable via `fly logs`) |
| Logs (web) | Cloudflare Workers logs and trace events |

Caller authenticity to the Fly.io backend is enforced by the Worker injecting an `x-cloudflare-secret` header on every proxied request; a global NestJS guard rejects requests without it. Defense in depth.

---

## What you need to provide

Grouped by the moment you'll need it. Each item lists whether it's blocking and how to get it.

### 1. Local machine (before the agent can do anything)

| Need | How | Blocking? | Check command | Pass criterion |
|---|---|---|---|---|
| Node 22 LTS | `nvm install 22` or `brew install node` | Yes | `node --version` | Output starts with `v22.` |
| pnpm 10+ | `npm i -g pnpm` or `corepack enable && corepack prepare pnpm@latest --activate` | Yes | `pnpm --version` | Output starts with `10.` or higher |
| Docker Desktop | Install from docker.com | Yes, for local Postgres and Redis | `docker info` | Exits 0; shows the server line |
| Git | Pre-installed on macOS; `brew install git` to be sure | Yes | `git --version` | Exits 0 |

The agent will not install runtimes for you. If any of these are missing it will stop and ask.

### 2. AI agent tooling

The agent runner is the program that actually drives the build. CrewMate is built and documented to run under Claude Code; any equivalent agent runner that can read the guardrails and respect the workflow in `docs/execution/01-agent-workflow.md` will work too.

| Tool | What it does | How to set up | Check command | Pass criterion |
|---|---|---|---|---|
| Claude Code (Anthropic) | The coding agent. Reads the repo, writes code, runs tests, opens PRs. | Install via `npm install -g @anthropic-ai/claude-code` (or the desktop app). Run `claude` once; it walks you through signing in with your Anthropic or claude.ai account. Credentials are stored under `~/.claude/`. | `claude --version` then `claude` | Version prints; `claude` either opens or prompts auth |
| `codex` (OpenAI, optional) | Spawned for image generation tasks (the `codex-openimage` skill). Generates UI mocks, OG cards, diagrams. | Install via `npm install -g @openai/codex`. Run `codex login` and authorize against your ChatGPT subscription. | `codex --version` and `codex whoami` | Version prints; whoami shows the signed-in account |
| MCP servers (optional) | Extend the agent with first-party connectors. Context7 for live docs lookup, GitHub MCP for PR and issue management, Figma MCP for design files, Playwright or Puppeteer MCP for browser automation. | Configure per agent runner. Claude Code reads `~/.claude/mcp.json` (or the project-local `.mcp.json`). Each MCP server has its own setup (GitHub needs a PAT, Figma needs a personal access token, Context7 needs no auth). | Tool-specific. Context7 needs no auth. GitHub MCP needs `gh auth status` to pass. Figma MCP needs the personal access token set. | Each has its own check; see the MCP server's own docs |

You do not need every tool. The minimum is Claude Code. Everything else expands what the agent can do but is optional.

Cost notes.

- Claude Code on a paid claude.ai subscription has generous monthly limits for personal use. On a metered Anthropic API key the cost is per-token and varies by model. The build plans estimate roughly 100 to 150 agent hours total; this lands well under a single month of Claude Pro.
- `codex` on ChatGPT Plus consumes image quota at no incremental cost. On a metered OpenAI API key, image generation is around $0.04 to $0.25 per image depending on quality. The repo's existing 11 rendered images cost approximately $2.20.
- MCP servers are free in themselves; only their underlying services have costs (GitHub PAT is free, Figma is free for personal use).

#### Credential locations

Where the agent tooling stores its login state on disk.

| Tool | Where its credentials live | Manually writable? |
|---|---|---|
| Claude Code | `~/.claude/` (managed by the CLI) | No, use `claude` to sign in |
| `codex` | `~/.codex/` (managed by the CLI) | No, use `codex login` |
| MCP servers | Configured per agent runner. Claude Code reads `~/.claude/mcp.json` and per-project `.mcp.json`. | Yes, MCP server entries are user-editable JSON |

#### Skills the agents use

CrewMate intentionally does not use Figma. Every UI screen is built directly from the chapters in `docs/guardrails/frontend/` and the rendered reference images in `docs/images/ui/`. The skills below are the design, platform, and verification skills the agents reach for instead.

**Frontend vs backend asymmetry.** The frontend gets both guardrails AND a stack of design skills (`frontend-design`, `make-interfaces-feel-better`, `baseline-ui`) because aesthetic decisions — restraint, rhythm, micro-interactions — are hard to fully encode in markdown. The backend gets ONLY guardrails (no off-the-shelf NestJS / Prisma skill is installed or widely available); architectural decisions like module shape, repository pattern, outbox, and the four-layer RBAC are completely encoded in `docs/guardrails/backend/` and `docs/guardrails/shared/`. The "backend skill" is the discipline of reading those files at the top of every backend task per the reading order in `docs/guardrails/shared/AGENT.md`. If you want an explicit Skill-tool trigger for this, see "Project-local skills" at the bottom of this subsection.

| Skill | What it gives the agent | When invoked | Setup / check |
|---|---|---|---|
| `frontend-design` | Distinctive, production-grade UI implementation with strong art direction. Avoids generic "AI slop" defaults. | Any phase 2 task that builds a screen or new component | Pre-installed. `ls ~/.claude/skills/frontend-design/SKILL.md` |
| `make-interfaces-feel-better` | Micro-interaction polish: hover states, optical alignment, motion timing, shadow craft, tabular numbers, image outlines. | Any UI task after the structural layout is in place; phase 2.3 polish wave | Pre-installed. `ls ~/.claude/skills/make-interfaces-feel-better/SKILL.md` |
| `baseline-ui` | Opinionated UI baseline that rejects generic patterns before they ship. Acts like a lint pass for design. | Cross-cutting on every UI PR | Pre-installed. `ls ~/.claude/skills/baseline-ui/SKILL.md` |
| `cloudflare-deploy` | Workers, `wrangler.toml`, route binding, secrets, KV / D1 if needed. The deploy half of layer 12. | Phase 1 wave 1.2 (Wrangler config) and wave 1.3 (`deploy-web.yml`) | Pre-installed. `ls ~/.claude/skills/cloudflare-deploy/SKILL.md` |
| `codex-openimage` or `parallel-imagegen` | Generate UI mocks, OG cards, architecture diagrams via `codex` background workers. | Any new screen mock or asset request; one-off diagram updates in `docs/images/` | Pre-installed. Requires `codex` CLI authed; see section 2 above. `parallel-imagegen` supersedes `codex-openimage` when you want unlimited parallelism with no concurrency cap |
| `playwriter` | Drive your real Chrome from JS snippets in a stateful sandbox. Use for click-through smoke tests, two-browser realtime checks, and visual diff against the reference images. | Phase 1 first-deploy smoke, phase 2 visual gate, phase 4 wire-up gate, every gate from phase 2 onward (all happen on the live URL) | Install the `playwriter` CLI. Run `playwriter skill` once before first use so the agent loads the up-to-date doc |
| `mcp-builder` | Scaffold a new MCP server if you decide to build one for CrewMate (e.g. a webhook-test MCP). | Only if a custom MCP is needed; not used in v0.1 | Pre-installed. `ls ~/.claude/skills/mcp-builder/SKILL.md` |

Skills explicitly not used by this project.

| Skill | Why not |
|---|---|
| `figma-use`, `figma-implement-design`, `figma-code-connect`, `figma-create-design-system-rules`, `figma-create-new-file` | CrewMate's design source of truth lives in `docs/guardrails/frontend/` and `docs/images/ui/`. No Figma files exist for this project |
| `industrial-brutalist-ui`, `minimalist-ui`, `high-end-visual-design` | These impose specific aesthetic systems. CrewMate has its own tokens in `docs/guardrails/frontend/00-design-system.md`; an aesthetic skill would override them |
| `redesign-existing-projects` | This is greenfield. Nothing to redesign |

**Project-local skills (optional).** If you want a Skill-tool trigger for backend work (so an agent can type `/crewmate-backend` instead of you having to remember to attach the guardrails folder), create `.claude/skills/crewmate-backend/SKILL.md` in the repo. The body just lists the guardrail reading order from `docs/guardrails/shared/AGENT.md`. Same pattern works for `.claude/skills/crewmate-frontend/SKILL.md` (wraps the frontend guardrails + says which design skills to combine with) and `.claude/skills/crewmate-deploy/SKILL.md` (wraps the deploy chapter + invokes `cloudflare-deploy`). None of these exist yet; they are a nice-to-have, not a blocker. The agent can also read the guardrails directly without a Skill wrapper.

#### MCP servers

MCP servers extend the agent with structured tool calls into outside systems. Configured per agent runner. For Claude Code, the global config lives at `~/.claude.json` under the `mcpServers` key (or `~/.claude/mcp.json` on older versions); project-local overrides live at `.mcp.json` in the repo root.

| Server | Side | What it gives the agent | Use when | Setup |
|---|---|---|---|---|
| `context7` | Both | Live, version-aware documentation lookup for NestJS, Prisma, Next.js, Apollo Client, TanStack Query, Tailwind 4, Motion, BullMQ, Wrangler, OpenNext, etc. | The agent is about to touch a library API and should not guess from training data. The highest-leverage MCP for the project, frontend or backend | Command `npx -y @upstash/context7-mcp@latest`. No auth |
| `postgres` | Backend | Read-only SQL over the dev Postgres. Lets the agent inspect rows, verify migrations applied, count seeded records, debug a tenant-scope query that returns nothing. | Phase 1 schema work, phase 3 backend feature implementation, debugging an RBAC leak | Command `npx -y @modelcontextprotocol/server-postgres postgresql://crewmate:crewmate@localhost:5432/crewmate`. Local dev only; never point this at production |
| `redis` | Backend | Read-only inspection of the dev Redis. Lets the agent peek at BullMQ queue keys, see queued and failed jobs, watch retry counters, check rate-limit buckets. | Phase 3 BullMQ work (webhook delivery worker, retry policy), debugging a stuck job | Command `npx -y @modelcontextprotocol/server-redis redis://localhost:6379`. Local dev only |
| `git` (Anthropic-hosted HTTP) | Both | Structured git operations beyond what shell `git` exposes cleanly. | Inspecting history, diffing branches, generating PR descriptions from commit ranges | Type `http`, URL `https://mcp.git.anthropic.com`. No auth |
| `excalidraw` | Both | Generate and edit architecture and flow diagrams that get committed to `docs/images/diagrams/`. | When a new layer in `docs/BUILD.md` warrants a diagram, or the RBAC / state machine diagrams need to change | Local stdio server at `~/.mcp/excalidraw/start.sh` |
| GitHub MCP (optional) | Both | Issue and PR management as a structured tool surface. | If you want the agent to triage issues automatically or comment back to reviewers via structured calls | Requires a GitHub PAT with `repo` and `read:org` scopes |
| Playwright / Puppeteer MCP (optional) | Frontend | Headless browser MCP. Alternative to the `playwriter` skill if you want the agent to drive a fresh Chromium rather than your real Chrome. | Visual regression on PRs in CI-style flows | Per-server install; pick one of Playwright or Puppeteer, not both, and don't run alongside `playwriter` |

MCP servers explicitly not used by this project.

| Server | Why not |
|---|---|
| `claude_ai_Figma` (and the related `figma-use`, `figma-generate-design`, `figma-code-connect` flow) | No Figma in this project; design is markdown plus rendered PNGs |
| `vercel` | Deploy target is Cloudflare Workers, not Vercel |
| `n8n` | No workflow automation in CrewMate's scope |
| `auggie`, `blueberry`, `pencil` | General-purpose; not load-bearing for this build |

**Minimal `~/.claude.json` `mcpServers` snippet** to enable the load-bearing ones (frontend + backend).

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://crewmate:crewmate@localhost:5432/crewmate"
      ]
    },
    "redis": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-redis",
        "redis://localhost:6379"
      ]
    },
    "git": {
      "type": "http",
      "url": "https://mcp.git.anthropic.com"
    },
    "excalidraw": {
      "type": "stdio",
      "command": "/Users/<you>/.mcp/excalidraw/start.sh"
    }
  }
}
```

Backend MCPs (`postgres`, `redis`) point at the docker-compose dev instances. Never repoint them at production. The agent treats them as read-only inspection surfaces; mutations still go through the API and Prisma migrations.

### 3. CLI credentials (global, not project secrets)

These are the credentials the agent uses on your behalf via command-line tools. They live in your home directory by convention, not in the project. The agent reads them, never writes them, and never modifies them without asking.

| CLI tool | What for | Auth command | Check command | Credential location (writable?) |
|---|---|---|---|---|
| `gh` | GitHub PRs, issues, repo create | `gh auth login` | `gh auth status` | `~/.config/gh/hosts.yml` (managed by gh, do not edit by hand) |
| `flyctl` | Fly.io deploy and management | `fly auth login` | `fly auth whoami` | `~/.fly/` (managed by flyctl). Alternative: `FLY_API_TOKEN` env var for CI |
| `aws` | Portfolio reference only (`infrastructure/terraform/`) | `aws configure` | `aws sts get-caller-identity` | `~/.aws/credentials` and `~/.aws/config` (writable) |
| `wrangler` | Cloudflare Workers deploy and local dev | `wrangler login` | `wrangler whoami` | `~/.wrangler/` (managed by wrangler). Alternative: env vars `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your shell rc |
| `docker` | Building images locally | `docker login` (only when pushing) | `docker info` | `~/.docker/config.json` (managed by docker login) |
| `claude` | The agent runner | `claude` (first-run prompt) | `claude --version` | `~/.claude/` (managed by the CLI) |
| `codex` (optional) | Image generation | `codex login` | `codex whoami` | `~/.codex/` (managed by the CLI) |

The agent expects these to be authenticated before it can do work that touches them. If you ask the agent to open a PR and `gh auth status` returns "not logged in", it will stop and ask you to authenticate rather than trying to handle credentials itself.

#### AWS credential file format

Exact contents of `~/.aws/credentials` for a static-key setup.

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[crewmate]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

And `~/.aws/config`.

```ini
[default]
region = us-east-1
output = json

[profile crewmate]
region = us-east-1
output = json
```

Use a named profile like `[crewmate]` so this project's credentials do not collide with other AWS accounts you have. Then call AWS commands with `AWS_PROFILE=crewmate aws ...` or set `export AWS_PROFILE=crewmate` for the session.

#### Cloudflare credential alternatives

Three ways to give `wrangler` and Cloudflare API tooling access.

1. `wrangler login` (browser flow, recommended for personal dev). Wrangler stores its OAuth token under `~/.wrangler/`.
2. Environment variables (recommended for CI). `export CLOUDFLARE_API_TOKEN=...` and `export CLOUDFLARE_ACCOUNT_ID=...` in your shell rc.
3. Per-project `.dev.vars` under `apps/web/` for Wrangler dev mode. This file is git-ignored. Useful for local-only secrets that the Worker needs at dev time (`BACKEND_ORIGIN`, `CLOUDFLARE_SHARED_SECRET`).

#### One-time per-service notes

**Anthropic (Claude Code).** Sign up at claude.ai for a paid subscription. Run `claude` once and authorize the CLI against that subscription.

**GitHub.** Sign up at github.com. After you log in, run `gh auth login` and choose HTTPS, then authenticate with a browser. The token gh stores has `repo`, `workflow`, and `read:org` scopes by default; that is enough for everything the agents do.

**Cloudflare.** Sign up at cloudflare.com. Add the `ritaro.dev` zone (Sites, Add a Site, then point your registrar at the assigned Cloudflare nameservers). The first time you run `wrangler login`, a browser opens and you authorize the local CLI. The token wrangler stores covers Workers Scripts:Edit and Zone:DNS:Edit on the zones in your account.

**AWS (portfolio reference only).** The `infrastructure/terraform/` directory contains the original Terraform modules as a portfolio artifact. They are not applied to any live environment. The existing `~/.aws/credentials` profile `[crewmate]` is retained for local reference. No AWS deploy actions are needed for active development.

**Docker Desktop.** No login required for local dev. Fly.io performs remote builds from `docker/api.Dockerfile`; no local image push to a registry is needed.

**codex (optional).** Sign up for ChatGPT Plus at chat.openai.com if you want to use ChatGPT quota for image generation. Run `codex login` and authorize the CLI against the subscription.

### 4. Local environment secrets (before the API starts)

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

| Variable | Purpose | Local default | Production value |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | REST + GraphQL base path | `http://localhost:3000` | `/api` (relative; the Worker handles routing) |
| `NEXT_PUBLIC_WS_URL` | WebSocket path | `ws://localhost:3000` | `/ws` (relative; the Worker proxies the upgrade) |

The production values are baked into the Worker bundle at build time by `deploy-web.yml`. Because the entire public surface is a single origin (`https://crewmate.ritaro.dev`), the web app uses relative paths and the Worker routes them.

If you want the agent to generate these for you on first run, just say "set up local env" and it will write the file with fresh secrets.

#### Check command

The check that secrets are actually loaded is simply that the api boots.

```bash
pnpm --filter @crewmate/api start:dev
```

If it prints a startup log line with `[Nest] LOG ... AppModule dependencies initialized`, the secrets are loaded. If it crashes with `Cannot find environment variable JWT_ACCESS_SECRET`, the env file is missing or incomplete.

One-liner to regenerate fresh secrets.

```bash
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
WEBHOOK_SIGNING_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)" >> apps/api/.env
```

### 5. Optional integrations (deferrable, the project runs without them)

The agent will mock these until you decide to wire them. If you want real ones, drop the credentials below into `apps/api/.env`.

| Integration | Variables | Where to get | Check command |
|---|---|---|---|
| Outbound email (local) | n/a, MailHog runs in docker-compose | n/a | `curl -s http://localhost:8025` returns the MailHog HTML page |
| Outbound email (prod, Planned) | `RESEND_API_KEY`, `EMAIL_FROM` | resend.com | `curl -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains` returns a JSON list |
| Webhook destination | `WEBHOOK_TEST_URL` | webhook.site | Paste the URL into a browser; the page shows incoming requests live |

None of these block local development. The agent will use stub implementations and log to console until you provide real values.

Resend is currently Planned per F-070 in `docs/FEATURES.md`. The end-to-end setup steps (sign up at resend.com, verify a sending domain on the `ritaro.dev` zone with the DNS records Resend hands you, generate an API key, store it as the GitHub Actions secret `RESEND_API_KEY` and the AWS Secrets Manager entry of the same name) will land here when the feature is promoted to Live.

### 6. Source control and CI (when you're ready to push)

The repo is already initialized locally on `main` with an initial commit. To push it somewhere:

| Need | Why | How |
|---|---|---|
| GitHub repo | Hosting and CI | `gh repo create crewmate --private --source=. --remote=origin --push` or create at github.com/new and `git remote add origin ...` |
| GitHub Actions secrets | CI workflows that need credentials | Repo Settings, then Secrets and variables, then Actions |

The CI workflow at `.github/workflows/ci.yml` reads `DATABASE_URL` and a few others from a service container, so no secrets are required just to make CI green. You'll only add secrets when you want CI to deploy.

### 7. Deployment (when you're ready to ship)

Production lives on one public domain, `https://crewmate.ritaro.dev`, served by a Cloudflare Worker that also reverse-proxies api paths to the Fly.io backend. The lists below cover both sides. Items are needed only when the agent is asked to provision or deploy.

**Fly.io (api and worker).**

| Need | What for | Notes | Where to find | Check command |
|---|---|---|---|---|
| Fly.io account | API hosting, managed Postgres, secrets | Sign up at fly.io. Free allowances cover v0.1 | fly.io dashboard | `fly auth whoami` shows your email |
| `flyctl` CLI | All Fly.io operations | `brew install flyctl` or `curl -L https://fly.io/install.sh \| sh` | — | `fly version` |
| `fly apps create crewmate-api` | Creates the app | Run once from the repo root | Fly.io dashboard, Apps | `fly apps list` shows `crewmate-api` |
| Fly Postgres | Managed Postgres (`DATABASE_URL` auto-set) | `fly postgres create` then `fly postgres attach` to the app | Fly.io dashboard, Postgres | `fly postgres list` |
| Upstash Redis | Managed Redis (free tier) | Create at upstash.com; set `fly secrets set REDIS_URL=rediss://...` | upstash.com console | `fly secrets list` shows `REDIS_URL` |
| `FLY_API_TOKEN` | `flyctl deploy` from GitHub Actions | `fly tokens create deploy -a crewmate-api`. Store as GitHub Actions secret `FLY_API_TOKEN` | Fly.io dashboard, Tokens | `fly tokens list` |

Fly.io provides HTTPS natively at `crewmate-api.fly.dev`. No ALB, no ACM certificate, no VPC setup needed.

Per-account sign-up notes.

**Fly.io account.** Sign up at fly.io. Install `flyctl`. Run `fly auth login` (browser flow). Create the app with `fly apps create crewmate-api`. Provision Fly Postgres (`fly postgres create`, then `fly postgres attach --app crewmate-api`). Provision Upstash Redis at upstash.com (free tier) and set `fly secrets set REDIS_URL=rediss://<upstash-url>`. Set the remaining secrets: `fly secrets set JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... WEBHOOK_SIGNING_SECRET=... CLOUDFLARE_SHARED_SECRET=...`. Generate a deploy token with `fly tokens create deploy -a crewmate-api` and store it as the GitHub Actions secret `FLY_API_TOKEN`. Used by `.github/workflows/deploy-api.yml`.

**Cloudflare (web, proxy, and DNS).**

| Need | What for | Notes | Where to find in the dashboard | Check command |
|---|---|---|---|---|
| Cloudflare account | Workers, DNS, TLS for the public site | Sign up at cloudflare.com. Free plan covers v0.1 | Top-right account menu | `wrangler whoami` shows your email and account |
| Verified zone for `ritaro.dev` | Authoritative DNS | One-time setup in the Cloudflare dashboard; point your registrar to the assigned Cloudflare nameservers | Websites, Add a Site | `dig NS ritaro.dev` shows the assigned Cloudflare nameservers |
| `CLOUDFLARE_API_TOKEN` | `wrangler deploy` from GitHub Actions | Token scoped to Workers Scripts:Edit and Zone:DNS:Edit on the `ritaro.dev` zone. Stored as a GitHub Actions secret | My Profile, API Tokens, Create Token, Custom token | `curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify` returns `success: true` |
| `CLOUDFLARE_ACCOUNT_ID` | `wrangler deploy` from GitHub Actions | Visible in the Cloudflare dashboard. Stored as a GitHub Actions secret | Workers and Pages overview page, right sidebar | `wrangler whoami` includes the account ID |

The Wrangler-stored OAuth token sits under `~/.wrangler/` on your machine. If you ever need to switch Cloudflare accounts or hand a machine to someone else, run `wrangler logout` to clear that directory and then `wrangler login` to re-authenticate from scratch.

Per-account sign-up notes.

**Cloudflare account.** Sign up at cloudflare.com. Add the `ritaro.dev` zone via Websites, Add a Site. Cloudflare assigns two nameservers; copy them and paste them at your domain registrar so Cloudflare becomes authoritative for DNS. Wait for the zone status to flip to Active (usually minutes, sometimes hours). Generate an API token via My Profile, API Tokens, Create Token, Custom token. Scope it to Workers Scripts:Edit and Zone:DNS:Edit on the `ritaro.dev` zone only. Copy the resulting token into the GitHub Actions secret `CLOUDFLARE_API_TOKEN`. Grab the account id from the Workers and Pages overview page (right sidebar) and store it as `CLOUDFLARE_ACCOUNT_ID`. Used by `.github/workflows/deploy-web.yml`.

The agent will not spin up paid resources on either cloud without confirming with you first. Anything that would incur cost is gated behind an explicit "yes, proceed" from you.

#### Wrangler secrets

These are set on the Cloudflare Worker with `wrangler secret put <name>` (run from `apps/web/`).

| Secret | Purpose |
|---|---|
| `BACKEND_ORIGIN` | The Fly.io API URL: `https://crewmate-api.fly.dev`. The Worker uses this in its proxy `fetch` calls. |
| `CLOUDFLARE_SHARED_SECRET` | The value the Worker injects as `x-cloudflare-secret` on every proxied request. Mirrored on the Fly.io side. |

#### Fly.io secrets

These are set on the Fly.io app with `fly secrets set <NAME>=<value>` (run from the repo root).

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | Fly Postgres connection string (auto-set when Fly Postgres is attached to the app). |
| `REDIS_URL` | Upstash Redis `rediss://` connection string. |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens. |
| `JWT_REFRESH_SECRET` | Signs refresh tokens. |
| `WEBHOOK_SIGNING_SECRET` | Signs outbound webhook payloads. |
| `CLOUDFLARE_SHARED_SECRET` | Mirror of the Wrangler secret. The NestJS global guard compares incoming `x-cloudflare-secret` headers against this value and rejects requests without a match. |

### 8. Observability backend

Fly.io's log infrastructure is the observability backend in v0.1. Structured pino logs go to stdout and are captured by Fly.io; viewable with `fly logs -a crewmate-api`. Logs carry request, tenant, and actor IDs on every line. No OpenTelemetry tracing, no Sentry, no PostHog, no status page. Future swaps are cheap because the logger is the only contact surface.

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

Everything in section 5 onward is "later" work. You do not need to gather it up front.

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
