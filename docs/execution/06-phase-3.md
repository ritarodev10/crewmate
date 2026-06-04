# 06 — Phase 3: Backend implementation

**Goal.** Every API endpoint and worker from `docs/FEATURES.md` works against `curl` or Postman in production. The UI is not changed in this phase; the mock providers from phase 2 stay in place. Phase 4 swaps them.

**Gate condition.** Manual API smoke script (below) runs clean against the live api. `pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e` both green.

**Concurrency cap.** 7 agents at peak (wave 3.1).

**Estimated wall-clock.** ~6–8h at cap.

**Input.** Phase 2 gate signed off.

**Continuous deploy.** Every merge to `main` triggers `deploy-api.yml`. After the `prod` approval click, `curl` the live api at `https://crewmate.ritaro.dev/api/*`.

---

## Wave 3.0 — Auth, RBAC, tenant scope

**Tool:** `/goal` per task
**Concurrency:** 1 (sequential; each blocks the next, and together they block wave 3.1)

### Task 3.0a — Auth module

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

### Task 3.0b — RBAC guards and audit interceptor

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

### Task 3.0c — Tenant scope Prisma extension

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

---

## Wave 3.1 — Feature APIs (Workflow)

**Tool:** Claude Code `Workflow` tool
**Concurrency:** 7 agents

Save the script below to `.claude/workflows/phase-3-wave-3-1.js` and run it with `/workflows` → select `phase-3-wave-3-1` → run.

Then wrap the run in a goal:

```
/goal
Workflow for wave 3.1 runs to completion: all 7 API module agents commit their branches,
pnpm --filter @crewmate/api typecheck exits 0 across all module directories.
Run the Workflow at .claude/workflows/phase-3-wave-3-1.js.
— or stop after 30 turns
```

```javascript
export const meta = {
  name: 'phase-3-wave-3-1',
  description: 'Build all backend feature API modules in parallel',
  phases: [{ title: 'Build APIs', detail: 'Up to 7 parallel agents, one per feature module' }],
}

const MODULES = [
  {
    label: 'operators-api',
    features: 'F-020',
    dir: 'apps/api/src/operators/',
    endpoints: 'GET /v1/operators, POST /v1/operators, PATCH /v1/operators/:id',
  },
  {
    label: 'properties-api',
    features: 'F-021',
    dir: 'apps/api/src/properties/',
    endpoints: 'GET /v1/properties, POST /v1/properties, PATCH /v1/properties/:id, DELETE /v1/properties/:id',
  },
  {
    label: 'workers-api',
    features: 'F-022',
    dir: 'apps/api/src/workers/',
    endpoints: 'GET /v1/workers, POST /v1/workers, PATCH /v1/workers/:id',
  },
  {
    label: 'jobs-crud-api',
    features: 'F-023',
    dir: 'apps/api/src/jobs/',
    endpoints: 'GET /v1/jobs, POST /v1/jobs, PATCH /v1/jobs/:id — CRUD only, no transition endpoint yet',
  },
  {
    label: 'schedules-api',
    features: 'F-025',
    dir: 'apps/api/src/schedules/',
    endpoints: 'GET /v1/schedules, POST /v1/schedules, POST /v1/schedules/:id/materialize',
  },
  {
    label: 'webhook-endpoints-api',
    features: 'F-060',
    dir: 'apps/api/src/webhooks/endpoints/',
    endpoints: 'GET /v1/webhooks/endpoints, POST, PATCH, DELETE, POST /:id/test',
  },
  {
    label: 'audit-log-api',
    features: 'F-016',
    dir: 'apps/api/src/audit/',
    endpoints: 'GET /v1/audit with filters, GET /v1/audit/export (CSV)',
  },
]

phase('Build APIs')
log(`Launching ${MODULES.length} API module agents (cap: 7).`)

const results = await parallel(MODULES.map(mod => () =>
  agent(
    `You are a backend-dev agent. Build the ${mod.label} NestJS module for CrewMate.

CONTEXT FILES — read these before writing any code:
1. docs/guardrails/shared/AGENT.md
2. docs/guardrails/backend/02-api.md
3. docs/guardrails/backend/05-reusable-patterns.md
4. docs/guardrails/backend/04-error-handling.md
5. docs/FEATURES.md — only the card(s) for ${mod.features}
6. prisma/schema.prisma — the entities your module works with

FILES IN SCOPE — only create or edit files inside:
- ${mod.dir}

FILES OUT OF SCOPE — do not touch auth/, rbac/, other feature modules, or prisma/.

MODULE SHAPE — every module must follow this structure exactly:
${mod.dir}
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.repository.ts
  dto/create-<feature>.dto.ts
  dto/update-<feature>.dto.ts
  dto/<feature>-response.dto.ts
  <feature>.spec.ts

ENDPOINTS TO IMPLEMENT: ${mod.endpoints}

REQUIREMENTS:
- Repository extends BaseRepository<T> per docs/guardrails/backend/05-reusable-patterns.md
- Controller uses @Roles, @Scoped, @Policy decorators from the RBAC layer
- Validation via class-validator DTOs at the controller boundary
- Error responses follow docs/guardrails/backend/04-error-handling.md shape
- No direct Prisma access outside the repository

ACCEPTANCE:
- pnpm --filter @crewmate/api typecheck exits 0
- pnpm --filter @crewmate/api lint exits 0
- At least one spec test per module exercises the happy path

Return "DONE: ${mod.label}" when acceptance passes.`,
    { label: mod.label, phase: 'Build APIs' }
  )
))

const passed = results.filter(r => r && r.includes('DONE'))
log(`API modules passed: ${passed.length} / ${MODULES.length}`)
if (passed.length < MODULES.length) {
  log(`Incomplete: ${MODULES.map(m => m.label).filter(l => !passed.some(r => r.includes(l))).join(', ')}`)
}
return { passed: passed.length, total: MODULES.length }
```

---

## Wave 3.2 — State machine, event bus, WebSocket, BullMQ

**Tool:** `/goal` per task
**Concurrency:** up to 4 (run in order; 3.2a and 3.2b block the others)

### Task 3.2a — Job state machine and transition endpoint

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

### Task 3.2b — Event bus and outbox relay

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

### Task 3.2c — WebSocket gateway

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

### Task 3.2d — BullMQ webhook delivery worker

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

---

## Wave 3.3 — GraphQL resolvers

**Tool:** `/goal`
**Concurrency:** 1

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

---

## Wave 3.4 — Custom roles + Resend (parallel-safe)

**Tool:** `/goal` per task
**Concurrency:** 2 (parallel-safe with each other and with 3.3)

### Task 3.4a — Custom roles backend

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

### Task 3.4b — Resend email integration

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

---

## Wave 3.5 — Tests

**Tool:** `/goal` per test file
**Concurrency:** 2 (parallel-safe)

### Task 3.5a — Job state transition test file

```
/goal
Write apps/api/src/jobs/state/job-state.spec.ts. Done when:
- Every allowed transition in the 5-state machine has a passing test
- Every invalid transition has a test asserting 409 + JOB_INVALID_TRANSITION
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-130-job-state-spec

Files in scope: apps/api/src/jobs/state/job-state.spec.ts only
— or stop after 20 turns
```

### Task 3.5b — Supertest happy-path integration test

```
/goal
Write the Supertest integration test at apps/api/test/e2e/v0.1-happy-path.e2e-spec.ts.
Done when:
- Test logs in as the seeded worker, fetches today's jobs, transitions the first job
  through to Completed, then logs out
- pnpm --filter @crewmate/api test:e2e exits 0 against a real postgres + redis from docker-compose
- code-reviewer subagent returns no blocking issues
- change is committed to task/p3-F-131-e2e-spec

Files in scope: apps/api/test/e2e/v0.1-happy-path.e2e-spec.ts only
— or stop after 20 turns
```

---

## Phase 3 gate

Manual API smoke. With the seed loaded, run:

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

`pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e` both green.

**`PHASE_3_GATE`** — after this condition appears, stop, run the smoke script, then start phase 4 by running the first `/goal` from `07-phase-4.md` or `03-goal-commands.md`.

Run `/compact` before starting phase 4.
