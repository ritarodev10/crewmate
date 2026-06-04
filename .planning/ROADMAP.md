# CrewMate — Roadmap

**Status:** Active
**Phases:** 5
**Requirements:** 63

---

## Phases

- [ ] **Phase 1: Foundation** — Monorepo scaffold + skeleton deploy to crewmate.ritaro.dev live
- [ ] **Phase 2: UI Screens** — All screens rendered against fixture data, tsc clean
- [ ] **Phase 3: Backend API** — All API modules + workers implemented and smoke-tested
- [ ] **Phase 4: Integration** — UI wired to real backend, E2E flows working
- [ ] **Phase 5: Polish** — Tests passing, production smoke checklist complete

---

## Phase Details

### Phase 1: Foundation
**Goal:** Monorepo scaffold + skeleton deploy to crewmate.ritaro.dev live
**Status:** Not Started
**Depends on:** Nothing (first phase)
**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. `pnpm dev` brings both the API on :3000 and the web on :3001 without errors; `pnpm lint && pnpm typecheck && pnpm test` all exit 0
  2. CI workflow (`ci.yml`) goes green on a dummy PR with postgres and redis service containers
  3. `https://crewmate.ritaro.dev` returns the placeholder login page through the Cloudflare Worker
  4. `curl https://crewmate.ritaro.dev/api/healthz` returns 200 through the Worker proxy
  5. A direct request to `https://crewmate-api.fly.dev/healthz` without `x-cloudflare-secret` returns 401
**Plans:** 4/5 plans executed
**Plan list:**
- [x] 01-PLAN-10-monorepo.md — Version alignment (NestJS 10→11, Next 14→15, Tailwind 3→4, docker-compose postgres 16→17, seed)
- [x] 01-PLAN-11-api-skeleton.md — NestJS CoreModule + HealthModule + CloudflareSecretGuard
- [x] 01-PLAN-12-web-skeleton.md — Placeholder login page + Worker proxy + wrangler.toml + Dockerfile
- [ ] 01-PLAN-13-ci.md — GitHub Actions: ci.yml + deploy-api.yml + deploy-web.yml
- [ ] 01-PLAN-14-terraform.md — All 4 Terraform modules + manual apply + Phase 1 gate
**Execution:**
- Waves: Wave 1 (plan-10), Wave 2 (plan-11 + plan-12 parallel), Wave 3 (plan-13), Wave 4 (plan-14 + Fly.io deploy)
- Concurrency cap: 2 agents at peak (wave 2)
- Estimated wall-clock: ~10h
- Gate: `pnpm dev` local ports reachable, CI green, `https://crewmate.ritaro.dev` placeholder loads, `/api/healthz` 200, direct `crewmate-api.fly.dev` without secret returns 401

---

### Phase 2: UI Screens
**Goal:** All screens rendered against fixture data, tsc clean
**Status:** Not Started
**Depends on:** Phase 1
**Requirements:** DISPATCH-02, DISPATCH-04, SCHED-01, SCHED-02, WORKER-01, EVENTS-06, TEAM-07, TEAM-08, TEAM-09, TEAM-10, TEAM-11, SETTINGS-01, SETTINGS-02, SETTINGS-03
**Success Criteria** (what must be TRUE):
  1. Every route documented in `docs/guardrails/frontend/` is reachable on the live `https://crewmate.ritaro.dev` URL
  2. Every screen matches its `docs/images/ui/<name>.png` visual reference; no real network errors in the console — all data comes from typed fixtures
  3. Optimistic UI works on the dispatch board: cards move between columns when a transition mock fires and the job detail drawer opens on card click
  4. Worker mobile today view at `/today` renders the date strip and job list; card action buttons are present with a minimum 44px tap target
  5. `pnpm --filter @crewmate/web typecheck` exits 0 across all screen directories
**Plans:** TBD
**Execution:**
- Waves: 2.0 (fixtures + mocks), 2.1 (app shell), 2.2 (screens, 9-agent Workflow), 2.3 (polish)
- Concurrency cap: 9 agents at peak (wave 2.2)
- Estimated wall-clock: ~5–6h
- Gate: Click-through every route on the live URL; visual sign-off against `docs/images/ui/`; no console network errors
**UI hint**: yes

---

### Phase 3: Backend API
**Goal:** All API modules + workers implemented and smoke-tested
**Status:** Not Started
**Depends on:** Phase 2
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, TENANT-01, TENANT-02, TENANT-03, JOBS-01, JOBS-02, JOBS-03, JOBS-04, JOBS-05, JOBS-06, JOBS-07, DISPATCH-01, SCHED-03, EVENTS-01, EVENTS-02, EVENTS-03, EVENTS-04, EVENTS-05, EVENTS-07, EVENTS-08, TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06, INFRA-07, INFRA-08, INFRA-09, INFRA-10, INFRA-11
**Success Criteria** (what must be TRUE):
  1. The manual API smoke script (login → list jobs → transition job → check audit → trigger webhook → create custom role) runs clean against the live `https://crewmate.ritaro.dev/api/*`
  2. `POST /v1/auth/login` with correct credentials returns `{ accessToken, refreshToken }`; replaying a rotated refresh token revokes the family and returns 401
  3. A tenant-scoped query made without a resolved `operatorId` throws at runtime; tenant A cannot read tenant B's data (cross-tenant read returns zero rows)
  4. `POST /v1/jobs/:id/transition` with a valid `{ to }` writes the state change and an `OutboxEvent` in the same transaction and emits `job.status.changed`; an invalid transition returns 409 with `JOB_INVALID_TRANSITION`
  5. BullMQ webhook delivery worker POSTs a signed payload to the seeded webhook.site endpoint and a `webhook_deliveries` row is written with status, response code, and attempt count
**Plans:** TBD
**Execution:**
- Waves: 3.0 (auth + RBAC + tenant), 3.1 (feature APIs, 7-agent Workflow), 3.2 (state machine + events + WS + queue), 3.3 (GraphQL), 3.4 (custom roles + Resend), 3.5 (tests)
- Concurrency cap: 7 agents at peak (wave 3.1)
- Estimated wall-clock: ~6–8h
- Gate: API smoke script passes on live URL; `pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e` both green

---

### Phase 4: Integration
**Goal:** UI wired to real backend, E2E flows working
**Status:** Not Started
**Depends on:** Phase 3
**Requirements:** DISPATCH-03, DISPATCH-05, WORKER-02
**Success Criteria** (what must be TRUE):
  1. Logging in at `https://crewmate.ritaro.dev` with the seeded admin credentials completes successfully; every screen renders real data with no fixture imports in the production bundle
  2. Two browser windows logged in as different coordinators: transitioning a job in one window causes the dispatch board in the other window to update in real time via `wss://crewmate.ritaro.dev/ws`
  3. Optimistic job transitions on the dispatch board update the Apollo cache immediately; a server-rejected transition rolls back and shows a Toast with the server's reason verbatim
  4. Worker one-tap transition from `/today` fires `POST /v1/jobs/:id/transition`, updates the card state optimistically, and the card rolls back on server error
**Plans:** TBD
**Execution:**
- Waves: 4.0 (real client config), 4.1 (screen wiring, 9-agent Workflow), 4.2 (subscription verification, manual), 4.3 (fixture cleanup)
- Concurrency cap: 9 agents at peak (wave 4.1)
- Estimated wall-clock: ~3h
- Gate: Full happy path on live URL; real-time WebSocket update confirmed across two browsers; webhook test delivery appears in log within seconds
**UI hint**: yes

---

### Phase 5: Polish
**Goal:** Tests passing, production smoke checklist complete
**Status:** Not Started
**Depends on:** Phase 4
**Requirements:** INFRA-12, INFRA-13, INFRA-14
**Success Criteria** (what must be TRUE):
  1. All four critical-path unit tests pass: job state machine (full transition matrix), RBAC policy evaluator (allow/deny cases), refresh-token rotation (replay detection), webhook payload signer (HMAC format)
  2. The single Supertest integration test (login → fetch jobs → transition to In Progress → Completed → logout) passes against real postgres and redis from docker-compose
  3. `pnpm test && pnpm test:e2e` both exit 0 in CI on a dummy PR; `pnpm lint && pnpm typecheck` exit 0 across the entire monorepo
  4. `docs/execution/PROD-SMOKE.md` exists with a reproducible checklist; walking it against `https://crewmate.ritaro.dev` confirms the live app is healthy
**Plans:** TBD
**Execution:**
- Waves: 5.0 (critical-path tests), 5.1 (deferred polish, parallel with 5.0), 5.2 (prod smoke doc)
- Concurrency cap: 4 agents
- Estimated wall-clock: ~3h
- Gate: `pnpm test && pnpm test:e2e` green in CI; PROD-SMOKE.md checklist passes against live URL

---

## Traceability

| REQ-ID | Description | Phase |
|--------|-------------|-------|
| AUTH-01 | Email/password login, 401 on wrong credentials, returns token pair | 3 |
| AUTH-02 | JWT access tokens (15m TTL) and refresh tokens (7d TTL) with `operatorId` claim | 3 |
| AUTH-03 | Silent refresh via `POST /v1/auth/refresh`; expired refresh redirects to /login | 3 |
| AUTH-04 | Refresh token rotation; replay of rotated token revokes family | 3 |
| AUTH-05 | TOTP 2FA enrollment, verification page, recovery codes | 3 |
| AUTH-06 | Worker invitation flow — email link, 7-day expiry, password set on accept | 3 |
| AUTH-07 | Password reset — one-time link, 30-minute expiry, email via Resend | 3 |
| TENANT-01 | `operator_id` on every tenant table; Prisma extension injects it; throws without resolved ID | 3 |
| TENANT-02 | Cross-tenant read returns zero rows | 3 |
| TENANT-03 | Super-admin operators CRUD with slug uniqueness at `/v1/operators` | 3 |
| JOBS-01 | Jobs CRUD with status/worker/property/date-range filters and offset pagination | 3 |
| JOBS-02 | Job state machine: Scheduled → En Route → In Progress → Completed → Verified; cancel from any non-Verified | 3 |
| JOBS-03 | Every allowed transition passes unit tests; invalid transitions return 409 with `JOB_INVALID_TRANSITION` | 3 |
| JOBS-04 | `POST /v1/jobs/:id/transition` writes state change + `OutboxEvent` in same transaction, emits `job.status.changed` | 3 |
| JOBS-05 | Properties CRUD with soft delete | 3 |
| JOBS-06 | Workers CRUD with optional `user_id` link | 3 |
| JOBS-07 | Schedules as recurring templates; idempotent materialization into jobs | 3 |
| DISPATCH-01 | WebSocket gateway — JWT auth, tenant rooms, scope-aware event filtering | 3 |
| DISPATCH-02 | Dispatch board UI at `/dispatch` — four-column kanban against fixture data | 2 |
| DISPATCH-03 | Dispatch board receives real-time job updates via WebSocket subscriptions; scope-aware per coordinator | 4 |
| DISPATCH-04 | Job detail drawer — right-side, stepper, details, activity timeline, primary actions | 2 |
| DISPATCH-05 | Optimistic job transitions with Apollo/TanStack cache update; rollback Toast on server reject | 4 |
| SCHED-01 | Schedule week grid view at `/schedule` — workers in rows, days in columns, event blocks | 2 |
| SCHED-02 | Schedule view week navigation and worker/property filters | 2 |
| SCHED-03 | Schedule materialization idempotency — same window produces no duplicate jobs | 3 |
| WORKER-01 | Worker today view at `/today` — date strip, vertical job list, card states | 2 |
| WORKER-02 | One-tap job transitions from worker mobile view with 44px tap target and optimistic UI | 4 |
| EVENTS-01 | Outbox pattern — state change + `OutboxEvent` written in same Prisma transaction | 3 |
| EVENTS-02 | Outbox relay publishes to BullMQ and in-process EventBus | 3 |
| EVENTS-03 | Webhook endpoints CRUD — HMAC signing secret, shown once, hashed at rest, rotatable, pausable | 3 |
| EVENTS-04 | BullMQ webhook delivery worker — signed payload, attempt rows in `webhook_deliveries` | 3 |
| EVENTS-05 | Webhook retry on exponential backoff (1m, 5m, 25m, 2h, 12h); max 5 attempts, then FAILED | 3 |
| EVENTS-06 | Webhook deliveries log UI at `/webhooks` — Stripe-style table, payload viewer, retry action | 2 |
| EVENTS-07 | Transactional email via Resend (prod) / MailHog (local); provider selected by `NODE_ENV` | 3 |
| EVENTS-08 | React Email templates: `worker.invited`, `password.reset`, optional digest | 3 |
| TEAM-01 | Four-layer authorization: tenancy → role → scope → policy | 3 |
| TEAM-02 | Four built-in roles: `super_admin`, `tenant_admin`, `coordinator`, `worker` | 3 |
| TEAM-03 | Custom roles with `(action, subject)` permission pairs; policy evaluator resolves them | 3 |
| TEAM-04 | Three scope shapes per grant: `tenant`, `region`, `property_list` | 3 |
| TEAM-05 | Named policy evaluator returning `Allow` or `Deny(reason)` | 3 |
| TEAM-06 | Permission audit log — every authorization decision to `permission_audits`, retained 90 days | 3 |
| TEAM-07 | Audit log UI at `/settings/audit` — date/actor/subject/decision filters, detail drawer, CSV export | 2 |
| TEAM-08 | Team members list at `/settings/team` — avatar, name, email, RolePill, scope chips, last-active | 2 |
| TEAM-09 | Invite member dialog — email, name, role, scope; success Toast | 2 |
| TEAM-10 | Member Drawer — grants, audit rows, notification preferences; role/scope/revoke actions | 2 |
| TEAM-11 | Custom role creation UI at `/settings/team/roles` — permissions matrix | 2 |
| SETTINGS-01 | Profile settings at `/settings/profile` — avatar, name, password, 2FA, timezone, sign-out-all | 2 |
| SETTINGS-02 | Account settings at `/settings/account` — operator name/slug, timezone, job duration, danger zone | 2 |
| SETTINGS-03 | Notification preferences UI at `/settings/notifications` — per-kind email toggles | 2 |
| INFRA-01 | Production deployment at `https://crewmate.ritaro.dev`; Worker proxies to Fly.io; direct Fly.io URL returns 401 | 1 |
| INFRA-02 | Terraform AWS IaC — network, data, secrets, compute modules (portfolio artifact; not applied to live env) | 1 |
| INFRA-03 | `wrangler.toml` and `apps/web/src/worker/proxy.ts` checked in; Wrangler secrets set | 1 |
| INFRA-04 | `deploy-api.yml` — flyctl deploy (remote build on Fly.io), migrate, roll api; gated by `prod` approval | 1 |
| INFRA-05 | `deploy-web.yml` — `@opennextjs/cloudflare` build + `wrangler deploy`; gated by `prod` approval | 1 |
| INFRA-06 | `GET /healthz` (liveness) and `GET /readyz` (DB + Redis readiness); ALB uses `/readyz`; guard bypassed for health | 1 |
| INFRA-07 | REST `/v1/*` with DTO validation; code-first GraphQL `/graphql` with subscriptions; SDL in `packages/contracts` | 3 |
| INFRA-08 | Every HTTP and WebSocket boundary validates input before any business logic | 3 |
| INFRA-09 | Pino structured logging — `requestId`, `tenantId`, `actorUserId` on every line; ships to CloudWatch | 3 |
| INFRA-10 | Uniform error contract `{ code, message, requestId, details? }`; global exception filter | 3 |
| INFRA-11 | Repository pattern — all Prisma access through `BaseRepository<T>` subclasses | 3 |
| INFRA-12 | Critical-path unit tests: state machine, policy evaluator, refresh rotation, webhook signer | 5 |
| INFRA-13 | Single Supertest integration test: login → fetch jobs → transition → Completed → logout | 5 |
| INFRA-14 | `ci.yml` runs unit and integration tests on every PR | 5 |

---

## Gates

| Gate | Condition | Who approves |
|------|-----------|--------------|
| Phase 1 → 2 | `PHASE_1_GATE`: `pnpm dev` local ports reachable, CI green on dummy PR, `https://crewmate.ritaro.dev` placeholder loads, `/api/healthz` 200, direct `crewmate-api.fly.dev` without shared secret returns 401 | Human |
| Phase 2 → 3 | `PHASE_2_GATE`: every route reachable on live URL, every screen matches `docs/images/ui/` reference, optimistic UI works, no console network errors, visual design signed off | Human |
| Phase 3 → 4 | `PHASE_3_GATE`: API smoke script passes on live URL, `pnpm --filter @crewmate/api test && test:e2e` both green | Human |
| Phase 4 → 5 | `PHASE_4_GATE`: full happy path on live URL, real-time WebSocket update confirmed across two browsers, webhook test delivery appears in log within seconds | Human |
| Phase 5 → Done | `PHASE_5_GATE`: `pnpm test && pnpm test:e2e` green in CI, PROD-SMOKE.md checklist passes against `https://crewmate.ritaro.dev` | Human |

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/5 | In Progress|  |
| 2. UI Screens | 0/0 | Not started | — |
| 3. Backend API | 0/0 | Not started | — |
| 4. Integration | 0/0 | Not started | — |
| 5. Polish | 0/0 | Not started | — |
