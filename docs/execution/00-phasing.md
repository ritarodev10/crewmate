# 00 — Phasing

The build runs as five phases. Each phase has a clear input (what must exist), an output (what counts as done), and a single human-reviewed gate before the next phase starts. Within a phase, work parallelizes aggressively. Across phases, there is no parallelism by design; gates exist so a human can see and approve what changed before the next swarm fans out.

**Deployment is in phase 1, not at the end.** The reason is operational confidence. The most expensive failure mode for a portfolio build is "everything works locally, then the deploy story breaks on the last day." Shipping a deployed empty shell at the start guarantees the deploy pipeline works, lets every subsequent phase push to a real URL on merge, and turns the gate review for phases 2 through 4 into a click-through on the live production site rather than `localhost`. The cost is that phase 1 is heavier and requires AWS plus Cloudflare credentials before the agent can finish it. The cost is paid once.

**How phases are executed.** Each phase runs via `/goal` outer loops (sequential tasks) or the Claude Code `Workflow` tool (three parallel waves: 2.2, 3.1, 4.1). GSD manages task state across sessions through `.planning/STATE.md` and `HANDOFF.json`. See `01-agent-workflow.md` for the mechanics and `03-goal-commands.md` for the copy-paste `/goal` commands.

The task IDs (`T-NNN`) and feature IDs (`F-NNN`) used below are the same IDs from `docs/BUILD.md` and `docs/FEATURES.md`. When GSD generates `.planning/`, it reads this file to derive task structure.

## Phase 1, Foundation and skeleton deploy

**Goal.** A working monorepo locally AND a deployed empty shell at `https://crewmate.ritaro.dev`. Both apps boot to placeholder pages, the schema is migrated, the local infra is up, the CI workflow is green, Fly.io and Cloudflare infrastructure is provisioned, two deploy workflows are wired, and the first production deploy serves the placeholder pages over HTTPS.

**Input.** A fresh clone, plus Fly.io and Cloudflare credentials populated per `docs/AGENT-SETUP.md` Setup status. Specifically: Fly.io account with `FLY_API_TOKEN` stored as a GitHub Actions secret, Cloudflare account with the `ritaro.dev` zone delegated, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` stored as GitHub Actions secrets, and the local docker-compose stack able to start.

**Output.**
- `pnpm install && pnpm dev` brings up the api on `:3000` and the web on `:3001` without errors.
- `docker compose ps` shows postgres, redis, mailhog healthy.
- `pnpm prisma migrate dev` succeeds with the v0.1 schema.
- `pnpm lint && pnpm typecheck && pnpm test` are all green (no production code yet, but the harness runs).
- GitHub Actions CI workflow runs and goes green on a dummy PR.
- Fly.io app `crewmate-api` created. Fly Postgres provisioned (auto-sets `DATABASE_URL`). Upstash Redis free tier provisioned (`rediss://` URL set as Fly secret `REDIS_URL`). `CLOUDFLARE_SHARED_SECRET` and JWT secrets set via `fly secrets set`.
- `fly.toml` checked in alongside `docker/api.Dockerfile`. `release_command` set to `npx prisma migrate deploy`.
- `apps/web/wrangler.toml` checked in alongside the Worker proxy handler at `apps/web/src/worker/proxy.ts`. Wrangler secrets `BACKEND_ORIGIN` (`https://crewmate-api.fly.dev`) and `CLOUDFLARE_SHARED_SECRET` set on the Worker. Cloudflare DNS for `crewmate.ritaro.dev` points at the Worker route.
- Two GitHub Actions deploy workflows live and green. `deploy-api.yml` (`FLY_API_TOKEN` secret) and `deploy-web.yml` (Cloudflare API token), both gated by the `prod` environment manual approval.
- DNS cutover complete. `https://crewmate.ritaro.dev` returns the placeholder login page through the Worker. `https://crewmate.ritaro.dev/api/healthz` returns 200 through the Worker proxy. A direct request to `https://crewmate-api.fly.dev` without the shared secret returns 401.

**Tasks.**

| Wave | Task | Realizes | Parallelism |
|---|---|---|---|
| 1.0 | Bootstrap pnpm workspace, root configs, lint + format setup | foundation | — |
| 1.0 | docker-compose with postgres, redis, mailhog | foundation | parallel with 1.0 bootstrap |
| 1.0 | Apply Prisma schema migration, generate client | F-001 | after bootstrap |
| 1.0 | NestJS api skeleton, single placeholder controller, `/healthz` endpoint | F-123 | parallel |
| 1.0 | Next.js web skeleton, single placeholder login page | foundation | parallel |
| 1.0 | `@crewmate/contracts` and `@crewmate/ui` placeholder exports | foundation | parallel |
| 1.0 | GitHub Actions CI workflow with postgres + redis service containers | F-132 | after 1.0 bootstraps land |
| 1.1 | Fly.io app creation. `fly apps create crewmate-api`. `fly.toml` with `release_command: npx prisma migrate deploy` and health check on `/healthz`. `docker/api.Dockerfile` for the api image (used for both api and worker processes) | F-120, F-121 | — |
| 1.1b | Fly Postgres provisioned and attached to `crewmate-api` (auto-sets `DATABASE_URL`). Upstash Redis free tier created; `REDIS_URL` set as Fly secret. JWT secrets, webhook signing secret, and `CLOUDFLARE_SHARED_SECRET` set via `fly secrets set` | F-121 | after 1.1 |
| 1.1b | NestJS global guard that checks `x-cloudflare-secret` against the Fly secret value and bypasses health endpoints | F-120, F-123 | parallel with Fly secrets setup |
| 1.2 | Wrangler config and Worker proxy handler. `apps/web/wrangler.toml`, plus `apps/web/src/worker/proxy.ts` that forwards `/api/*`, `/v1/*`, `/graphql`, `/ws` to `BACKEND_ORIGIN` (`https://crewmate-api.fly.dev`) with the shared-secret header. Cloudflare DNS record for `crewmate.ritaro.dev`. Wrangler secrets set | F-120, F-121 | after 1.1b |
| 1.3 | `deploy-api.yml` with `FLY_API_TOKEN` GitHub secret and `prod` environment manual approval. Runs `flyctl deploy --remote-only`; Fly.io builds the image remotely, runs the `release_command` migration, and rolls the machines. Smoke-tests `https://crewmate-api.fly.dev/healthz` and `/readyz` | F-122 | after 1.2 |
| 1.3 | `deploy-web.yml` with a Cloudflare API token and `prod` environment manual approval. Builds the Next.js Worker bundle via `@opennextjs/cloudflare`, packaging the proxy handler at `apps/web/src/worker/proxy.ts` into the bundle, then `wrangler deploy` | F-122 | parallel with deploy-api.yml |
| 1.4 | First production deploy. Both pipelines through the `prod` gate. DNS cutover. Production smoke `https://crewmate.ritaro.dev` returns the placeholder login page. `https://crewmate.ritaro.dev/api/healthz` returns 200. Direct requests to `https://crewmate-api.fly.dev` without the shared secret return 401 | F-120 | manual, final step |

**Parallelism within phase 1.**

- Wave 1.0 (foundation tasks) edits root configs and is serial-leaning. 2 to 3 agents.
- Wave 1.1 (Fly.io app + Dockerfile) blocks 1.1b.
- Wave 1.1b (Fly Postgres, Upstash Redis, Fly secrets, NestJS guard) is mutually parallel once the app exists.
- Wave 1.2 (Wrangler config + Worker proxy) needs 1.1b (needs `BACKEND_ORIGIN` value).
- Wave 1.3 (deploy workflows) needs 1.2. Both workflows are mutually parallel.
- Wave 1.4 (first deploy) is the final serial step and exercises both pipelines.

**Parallelism cap.** 3 to 4 agents. Many tasks share root configs or have ordering constraints.

**Gate.** Run `pnpm dev` locally and confirm both ports reachable. Then visit `https://crewmate.ritaro.dev` and confirm the placeholder page loads. Then `curl -f https://crewmate-api.fly.dev/healthz -H "x-cloudflare-secret: <secret>"` returns 200. Then `curl https://crewmate-api.fly.dev/healthz` without the shared secret returns 401. Then `curl https://crewmate.ritaro.dev/api/healthz` returns 200 through the Worker proxy. CI green on a dummy PR.

Phase 1 is heavier than the original 6-task Foundation because the deploy work moves here. The trade is that every gate from phase 2 onward is a click-through on the live URL.

---

## Phase 2, UI with dummy data

**Goal.** Every screen documented in `docs/guardrails/frontend/` renders against fixture data shaped by the Prisma schema. No real backend wiring. The reviewer (you) clicks through the whole product visually on the live production URL before any backend code is real.

**Why this order.** The visual design is the most expensive thing to change late. By rendering every screen first against fixtures, the design is reviewed and signed off before backend work commits to API shapes that match the design. Backend agents in phase 3 will read the same fixture types from `@crewmate/contracts` and implement endpoints that produce the same shape.

**Continuous deploy.** Every merge to `main` in phase 2 triggers `deploy-web.yml`, which pushes the new bundle to the Cloudflare Worker behind the `prod` environment approval. You can review each PR's deployed result at `https://crewmate.ritaro.dev` instead of waiting until the end of the phase. Approving the `prod` deploy and walking the live URL is the merge step.

**Input.** Phase 1 gate signed off. Deploy workflows live.

**Output.**
- Every route from `docs/FEATURES.md` is reachable in `apps/web`.
- All data on screen comes from typed fixtures in `apps/web/src/lib/fixtures/`, never from a real network call.
- Fixture shapes are derived from `prisma/schema.prisma` types (use `@prisma/client` types directly, or generate them into `@crewmate/contracts`).
- Both Apollo Client and TanStack Query are configured with mock providers (MSW for REST, `MockedProvider` for Apollo) that return fixtures for every documented operation.
- Optimistic UI works against the mocks. Mutations update the fixture cache so the user sees state changes.
- Every screen passes the visual checklist against the rendered image in `docs/images/ui/`.
- Every merge auto-deploys to `https://crewmate.ritaro.dev` via `deploy-web.yml` after the `prod` approval click.

**Tasks.**

| Wave | Task | Realizes | Parallelism |
|---|---|---|---|
| 2.0 | Fixtures package. Typed fixtures for Operators, Properties, Workers, Users, Jobs, Schedules, WebhookEndpoints, WebhookDeliveries, RoleGrants, PermissionAudits. Around 80 records distributed realistically. | foundation for all UI | 1 |
| 2.0 | Mock Apollo Client setup. `MockedProvider` wrapper at the app root, mock responses for every documented GraphQL query, mutation, and subscription. | foundation for all UI | 1 |
| 2.0 | Mock TanStack Query setup. MSW handlers for every REST endpoint in `docs/guardrails/backend/02-api.md`. | foundation for all UI | 1 |
| 2.1 | App shell. Sidebar, topbar, page grid, breadcrumbs. Mobile shell for the worker view. | F-110 (architecture), referenced by every screen | 1 (blocks 2.2) |
| 2.2 | Login screen. Form posts to a mock handler that sets a local cookie. | F-002 | 1 |
| 2.2 | Dispatch board UI with kanban + optimistic UI on transition. | F-031 | 1 |
| 2.2 | Job detail drawer. | F-032 | 1 |
| 2.2 | Schedule week view. | F-050 | 1 |
| 2.2 | Worker mobile today view at `/today`. | F-040, F-041 | 1 |
| 2.2 | Webhook deliveries log with payload viewer. | F-063 | 1 |
| 2.2 | Team management page (list, invite dialog, member drawer, custom roles sub-page). | F-090 to F-093 | 1 |
| 2.2 | Analytics overview with KPI cards, stacked area chart, bar chart, sparklines. | F-080 | 1 |
| 2.2 | Settings pages (profile, notifications, properties, webhook endpoints, audit log, account). | F-100, F-101, F-016, F-060, F-072 | 1 to 2 |
| 2.3 | Visual review polish. Any screen that needs a second pass after the gate review. | — | up to 9 |

**Parallelism within phase 2.**

- Wave 2.0 (fixtures + mock providers) blocks wave 2.2 because every UI route reads from the fixture cache. Run 2.0 first as a 3-agent burst.
- Wave 2.1 (app shell) blocks wave 2.2 because every page renders inside the shell. Land it before fanning out.
- Wave 2.2 (screens) is mutually parallel-safe. Each task owns a different route under `apps/web/src/app/` and a different feature folder under `apps/web/src/components/<feature>/`. Up to 9 agents can work concurrently. This wave runs as a Workflow.

**Parallelism cap.** 9 agents at peak (wave 2.2).

**Gate.** Visit `https://crewmate.ritaro.dev`. Click through every route on the live site. Confirm:
- Every screen documented in `docs/guardrails/frontend/` is reachable.
- Every screen matches its `docs/images/ui/<name>.png` reference within a tight visual tolerance.
- Optimistic UI on transitions feels right. Cards move between columns on the dispatch board. Status pills update. Worker mobile cards transition.
- No real network errors in the console. Only mock-provider activity.
- The reviewer (you) signs off the visual design. This is the most important gate of the whole build.

---

## Phase 3, Backend implementation

**Goal.** Every API endpoint and worker from `docs/FEATURES.md` works against `curl` or Postman in production. The UI is not changed in this phase; the mock providers from phase 2 stay in place. Phase 4 swaps them.

**Continuous deploy.** Every merge to `main` triggers `deploy-api.yml`, which runs `flyctl deploy --remote-only` (Fly.io builds the image remotely, runs `prisma migrate deploy` via the `release_command`, and rolls the machines). After the `prod` approval click, you can `curl` the live api at `https://crewmate.ritaro.dev/api/*`.

**Input.** Phase 2 gate signed off.

**Output.**
- All features F-001 through F-080 functioning at the API level.
- `pnpm --filter @crewmate/api test` passes the critical-path unit tests.
- The single Supertest happy-path integration test (F-131) passes.
- Webhook delivery worker processes a real signed delivery to webhook.site (seeded endpoint).
- Resend email integration sends a test email locally to MailHog and is wired for prod.
- Every endpoint returns the documented response shape from `@crewmate/contracts`.
- Audit log rows are written on every protected request.
- The api is running on Fly.io, reachable through the Worker proxy at `https://crewmate.ritaro.dev/api/*`.

**Tasks.**

| Wave | Task | Realizes | Parallelism |
|---|---|---|---|
| 3.0 | Auth module. Login, refresh, logout, me, 2FA enrollment + verify, password reset, invitation acceptance backend. | F-002 to F-007 | 1 |
| 3.0 | RBAC scaffolding. Guards, decorators, audit interceptor. | F-010, F-014, F-015 | 1 |
| 3.0 | Tenant scope Prisma extension. | F-001 | 1 |
| 3.1 | Operators API. | F-020 | 1 |
| 3.1 | Properties API. | F-021 | 1 |
| 3.1 | Workers API. | F-022 | 1 |
| 3.1 | Jobs API CRUD without transition endpoint. | F-023 | 1 |
| 3.1 | Schedules API. | F-025 | 1 |
| 3.1 | Webhook endpoints config API. | F-060 | 1 |
| 3.1 | Audit log read API + CSV export endpoint. | F-016 | 1 |
| 3.2 | Job state machine and transition endpoint. | F-024 | 1 |
| 3.2 | Event bus and outbox writer. | F-110 | 1 |
| 3.2 | WebSocket gateway with tenant rooms. | F-030 | 1 |
| 3.2 | BullMQ webhook delivery worker. | F-061, F-062 | 1 |
| 3.3 | GraphQL server resolvers and subscription wiring. | F-112 | 1 |
| 3.4 | Custom roles backend. | F-012 | 1 |
| 3.4 | Resend email integration with React Email templates. | F-070, F-071 | 1 |

**Parallelism within phase 3.**

- Wave 3.0 (auth + RBAC + tenant pipe) blocks wave 3.1 because every feature API depends on them.
- Wave 3.1 (feature APIs) is mutually parallel-safe. Each task owns one feature module under `apps/api/src/<feature>/`. Up to 7 agents concurrently. This wave runs as a Workflow.
- Wave 3.2 (state machine, event bus, WS, queue) depends on wave 3.1 (specifically jobs and webhook endpoints). Up to 4 in parallel.
- Wave 3.3 (GraphQL) depends on the feature APIs being shaped.
- Wave 3.4 (custom roles, Resend) is parallel-safe with 3.3.

**Parallelism cap.** 7 agents at peak (wave 3.1).

**Gate.** Manual API smoke against the live api. With the seed loaded:

```bash
# Login as admin against the production api
TOKEN=$(curl -s -X POST https://crewmate.ritaro.dev/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@brookline.test","password":"password123"}' \
  | jq -r .accessToken)

# List jobs (admin sees all)
curl -s -H "authorization: bearer $TOKEN" https://crewmate.ritaro.dev/api/v1/jobs | jq '.[] | {id, status, propertyId}'

# Transition a job through the state machine
curl -X POST -H "authorization: bearer $TOKEN" \
  https://crewmate.ritaro.dev/api/v1/jobs/<id>/transition \
  -d '{"to":"IN_PROGRESS"}'

# Check audit
curl -s -H "authorization: bearer $TOKEN" https://crewmate.ritaro.dev/api/v1/audit | jq

# Trigger a webhook test delivery
curl -X POST -H "authorization: bearer $TOKEN" \
  https://crewmate.ritaro.dev/api/v1/webhooks/endpoints/<id>/test

# Create a custom role
curl -X POST -H "authorization: bearer $TOKEN" \
  https://crewmate.ritaro.dev/api/v1/team/roles \
  -d '{"name":"inspector","permissions":[{"action":"read","subject":"properties"}]}'
```

Test command. `pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e` both green.

---

## Phase 4, Wire UI to backend

**Goal.** Replace the mock providers from phase 2 with real Apollo Client and TanStack Query hooks pointing at the api from phase 3. Every screen renders real data. Mutations hit real endpoints. Subscriptions deliver live updates over WebSocket. End-to-end on the live production URL.

**Continuous deploy.** Every merge to `main` triggers both `deploy-api.yml` and `deploy-web.yml` (whichever side changed). After the `prod` approval clicks, the live `https://crewmate.ritaro.dev` shows the wired screens against the real api.

**Input.** Phase 3 gate signed off.

**Output.**
- `apps/web/src/lib/apollo-client.ts` and `apps/web/src/lib/query-client.ts` are wired to the relative `/api` path (the Worker handles routing to AWS).
- Every screen that previously read from fixtures now reads from the real api.
- The fixtures package is moved under a `__tests__` folder for the integration test; the production bundle no longer ships fixtures.
- Optimistic UI continues to work. Cache invalidation and subscription updates verified manually on the live URL.
- Dispatch board updates in two browser windows simultaneously, confirming real WebSocket fan-out over `wss://crewmate.ritaro.dev/ws`.

**Tasks.**

| Wave | Task | Realizes | Parallelism |
|---|---|---|---|
| 4.0 | Apollo Client real configuration. HTTP link, WebSocket link, auth refresh link, tenant boundary cache clearing. | F-112 | 1 |
| 4.0 | TanStack Query real configuration. `fetchWithAuth` wrapper. Defaults per `docs/guardrails/frontend/05-data-fetching.md`. | F-112 | 1 |
| 4.1 | Wire login screen to real `POST /v1/auth/login`. | F-002 | 1 |
| 4.1 | Wire dispatch board to real GraphQL query + subscription. | F-031 | 1 |
| 4.1 | Wire job detail drawer. | F-032 | 1 |
| 4.1 | Wire schedule view. | F-050 | 1 |
| 4.1 | Wire worker mobile today view + transitions. | F-040, F-041 | 1 |
| 4.1 | Wire webhook deliveries log + endpoint config. | F-060, F-063 | 1 |
| 4.1 | Wire team management + custom roles. | F-090, F-093 | 1 |
| 4.1 | Wire analytics. | F-080 | 1 |
| 4.1 | Wire settings sub-pages. | F-100, F-101, F-016, F-072 | 1 to 2 |
| 4.2 | Subscription wiring verification across two browsers on the live URL. | F-031 + F-030 | 1 |
| 4.3 | Remove fixtures from production bundle (move to `__tests__`). | — | 1 |

**Parallelism within phase 4.**

- Wave 4.0 (real client configuration) blocks wave 4.1.
- Wave 4.1 (per-screen wiring) is mutually parallel-safe. Each task touches one screen folder. This wave runs as a Workflow.
- Wave 4.2 (subscription verification) depends on 4.1 dispatch board landing first.
- Wave 4.3 (fixture cleanup) runs last.

**Parallelism cap.** 9 agents at peak (wave 4.1).

**Gate.** Open `https://crewmate.ritaro.dev`. Log in as the seeded admin. Walk the full happy path on the live site. Open two browsers as different roles. Transition a job in one and watch the other update via subscription over `wss://crewmate.ritaro.dev/ws`. Visit `/webhooks` and trigger a test delivery. See it appear in the log within seconds.

---

## Phase 5, Tests and final polish

**Goal.** The light testing layer is in place; CI runs it on every PR; the final visual and behavioral polish pass is complete. Production has already been live since phase 1; phase 5 verifies and hardens it rather than provisioning it.

**Input.** Phase 4 gate signed off.

**Output.**
- Critical-path unit tests per `docs/guardrails/backend/03-testing.md` (F-130).
- The one Supertest integration test passing (F-131).
- CI runs them on every PR (F-132).
- Any polish items deferred from phase 2.3 are resolved.
- Production smoke documented as a reproducible checklist.

**Tasks.**

| Wave | Task | Realizes | Parallelism |
|---|---|---|---|
| 5.0 | Critical-path unit tests written (state machine, policy evaluator, refresh rotation, webhook signer). Lint and typecheck pass across the monorepo. | F-130 | 2 |
| 5.0 | The single Supertest integration test. | F-131 | 1 |
| 5.1 | Any deferred polish items from phase 2.3 or phase 4. | — | up to 4 |
| 5.2 | Production smoke checklist documented in `docs/execution/PROD-SMOKE.md`. The commands a reviewer runs to confirm the deployed app is healthy after any future change. | F-123 | 1 |

**Parallelism within phase 5.**

- Wave 5.0 (tests) and wave 5.1 (polish) are mutually parallel.
- Wave 5.2 (smoke checklist) runs after 5.0 and 5.1 stabilize.

**Parallelism cap.** 4 agents. No IaC ordering constraints, because the IaC was finished in phase 1.

**Gate.** `pnpm test && pnpm test:e2e` green in CI on a dummy PR. Visit `https://crewmate.ritaro.dev`; walk the happy path one final time. The portfolio is shipped.

---

## Cross-phase rules

- A phase does not begin until the previous phase's gate is explicitly signed off by you.
- Within a phase, agents run in parallel up to the cap specified for that phase.
- No agent ever pushes to `main` directly; every task lands via a reviewed pull request (see `01-agent-workflow.md`).
- Every merge to `main` from phase 2 onward triggers the deploy workflow for whichever side changed (api or web). The `prod` environment manual approval gate stays in place; the human clicks to release.
- No agent touches files outside the scope of its task. The task card lists the files; the reviewer agent enforces the scope.
- Agents respect `docs/guardrails/shared/AGENT.md` at all times.

## Cost summary

| Phase | Tasks | Agent hours, serial | Wall-clock with cap |
|---|---|---|---|
| 1 | ~15 | ~28h | ~10h |
| 2 | ~13 | ~28h | ~5-6h |
| 3 | ~17 | ~38h | ~6-8h |
| 4 | ~10 | ~14h | ~3h |
| 5 | ~5 | ~8h | ~3h |
| Total | ~60 | ~116h | ~27-30h |

Counting reviewer agent time, total is roughly 1.5x the implementer agent hours. Wall-clock figures assume the parallelism caps are saturated and reviewer agents run alongside implementers. The total is across several days of focused work, not one sitting. Phase 1 is now the longest single phase because deploy infrastructure moves here, but the trade is that every later phase deploys continuously and every gate happens on the live URL.
