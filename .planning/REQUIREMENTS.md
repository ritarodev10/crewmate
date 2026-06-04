# CrewMate — Requirements

All requirements derived from `docs/FEATURES.md`. Every F-NNN feature is on the roadmap. Nothing validated yet — greenfield build.

---

## v1 Requirements

### AUTH — Authentication and session management

- [ ] **AUTH-01** (F-002): User can log in with email and password; wrong credentials return 401 with `AUTH_INVALID_CREDENTIALS`; correct credentials return `{ accessToken, refreshToken }`
- [ ] **AUTH-02** (F-003): System issues JWT access tokens (15m TTL) and refresh tokens (7d TTL) signed with separate secrets; access token payload includes `operatorId` tenancy claim
- [ ] **AUTH-03** (F-003): User can silently refresh an expired access token via `POST /v1/auth/refresh`; expired refresh token redirects to `/login` with a banner
- [ ] **AUTH-04** (F-004): System rotates refresh tokens on use; reuse of an already-rotated token revokes the entire family and forces re-authentication; audit row `refresh.replay` is written
- [ ] **AUTH-05** (F-005): User can enroll in TOTP 2FA via QR code and manual code; post-login verification page shown when 2FA is enabled; recovery codes shown once and downloadable
- [ ] **AUTH-06** (F-006): Tenant admin or coordinator can invite a worker by email; invitation email contains a one-time link valid for 7 days; invitee sets password and lands on `/today` or `/dispatch`
- [ ] **AUTH-07** (F-007): User can request a password reset; receives email with a one-time link (30-minute expiry); after setting new password, user is signed in and redirected

### TENANT — Multi-tenancy and operator management

- [ ] **TENANT-01** (F-001): Every tenant-owned table carries `operator_id`; Prisma client extension injects `operatorId` into every `where` on tenant-owned models; any tenant-owned query made without a resolved `operatorId` throws at runtime
- [ ] **TENANT-02** (F-001): Tenant A cannot see tenant B's data; cross-tenant read returns zero rows (verified by smoke test)
- [ ] **TENANT-03** (F-020): Super-admin can create, list, and edit operators; operator slug uniqueness is enforced; available only at `/v1/operators`

### JOBS — Work orders and job management

- [ ] **JOBS-01** (F-023): Operator or coordinator can create, read, update, and delete jobs; list endpoint supports filters by status, worker, property, and date range with offset pagination
- [ ] **JOBS-02** (F-024): System enforces job state machine: Scheduled → En Route → In Progress → Completed → Verified; cancellation allowed from any non-Verified state by admin or coordinator
- [ ] **JOBS-03** (F-024): Every allowed state transition passes unit tests; every invalid transition returns 409 with `JOB_INVALID_TRANSITION` and a human-readable reason
- [ ] **JOBS-04** (F-024): `POST /v1/jobs/:id/transition` with `{ to: <state> }` writes state change and `OutboxEvent` in the same transaction and emits `job.status.changed`
- [ ] **JOBS-05** (F-021): Operator can create, read, update, and soft-delete properties; each property carries name, kind, optional region, address, and timezone
- [ ] **JOBS-06** (F-022): Operator can create, read, update, and delete workers; workers carry name, phone, optional hourly rate, and optional `user_id` link set after invitation acceptance
- [ ] **JOBS-07** (F-025): Operator can create schedules as recurring templates and materialize them into jobs across a date range; re-running materialize for the same window does not duplicate jobs

### DISPATCH — Dispatch board and real-time assignment

- [ ] **DISPATCH-01** (F-030): WebSocket gateway authenticates clients using the same JWT as REST; each connected socket joins a `tenant:<operatorId>` room; scope-aware filtering sends only relevant events to each coordinator
- [ ] **DISPATCH-02** (F-031): Dispatch board at `/dispatch` renders a four-column kanban (SCHEDULED, EN ROUTE, IN PROGRESS, COMPLETED); VERIFIED jobs roll off after a configurable delay; cards show property, worker, and time chip
- [ ] **DISPATCH-03** (F-031): Dispatch board receives real-time job status updates via WebSocket subscriptions; two coordinators with different scopes see only their own events
- [ ] **DISPATCH-04** (F-032): Clicking a job card opens a right-side drawer (480px desktop / full-width mobile) with header, horizontal stepper, key-value details, activity timeline, and primary actions (Mark Completed, Reassign)
- [ ] **DISPATCH-05** (F-033): Job transitions update the Apollo/TanStack cache immediately (optimistic); server rejection triggers a rollback Toast with the server's reason verbatim

### SCHED — Scheduling and calendar

- [ ] **SCHED-01** (F-050): Schedule view at `/schedule` renders workers in rows and days in columns; each scheduled job is an event block; overflow shows "+N more" when a day has multiple jobs per worker
- [ ] **SCHED-02** (F-050): Schedule view supports week navigation (prev, next, Today jump) and worker/property filters
- [ ] **SCHED-03** (F-025): Schedule materialization is idempotent — running the same `from`/`to` window twice produces no duplicate jobs

### WORKER — Technician mobile experience

- [ ] **WORKER-01** (F-040): Worker today view at `/today` shows a date strip (7 days, today highlighted) and a vertical list of today's jobs ordered by scheduled start; card states: scheduled, in progress, completed, cancelled
- [ ] **WORKER-02** (F-041): Each active job card has a full-width primary action button with a minimum 44px tap target; tapping moves the job through the state machine with optimistic UI

### EVENTS — Real-time events and webhooks

- [ ] **EVENTS-01** (F-110): Every domain state change writes both the state update and an `OutboxEvent` row in the same Prisma transaction; killing the DB mid-transition leaves either both rows or neither
- [ ] **EVENTS-02** (F-110): Outbox relay reads new `OutboxEvent` rows and publishes them to BullMQ (for webhook fan-out) and to the in-process `EventBus` (for WebSocket fan-out)
- [ ] **EVENTS-03** (F-060): Tenant admin can create, read, update, and delete webhook endpoints; each endpoint has a per-endpoint HMAC signing secret generated on create, shown once, hashed at rest, and rotatable; endpoints can be paused
- [ ] **EVENTS-04** (F-061): BullMQ `webhook-delivery` worker signs each outgoing payload with `x-crewmate-signature: t=<ts>,v1=<sig>` and POSTs to the endpoint; every attempt persists a row in `webhook_deliveries` with status, response code, latency, and attempt count
- [ ] **EVENTS-05** (F-062): Failed webhook deliveries are retried on exponential backoff (1m, 5m, 25m, 2h, 12h); after 5 attempts the delivery is marked FAILED and `webhook.delivery.failed` event is emitted
- [ ] **EVENTS-06** (F-063): Webhook deliveries log at `/webhooks` shows a Stripe-style table (status pill, event, endpoint, attempt, timestamp, latency); selecting a row opens a detail panel with raw signed payload and headers; `Retry failed` action re-enqueues
- [ ] **EVENTS-07** (F-070): System sends transactional email via Resend in production and MailHog locally; provider is selected by `NODE_ENV`; `RESEND_API_KEY` stored in env; single sender domain `crewmate.ritaro.dev`
- [ ] **EVENTS-08** (F-071): System renders `worker.invited` and `password.reset` email templates via React Email; optional `webhook.delivery.failed.digest` daily roll-up template

### TEAM — Team and RBAC management

- [ ] **TEAM-01** (F-010): Four-layer authorization enforced: tenancy at data layer, role at request layer, scope at service layer, policy conditions at service/query layer
- [ ] **TEAM-02** (F-011): Four built-in roles exist: `super_admin` (cross-operator), `tenant_admin` (full read/write in one operator), `coordinator` (dispatch and schedule), `worker` (own day only)
- [ ] **TEAM-03** (F-012): Tenant admin can create custom roles with arbitrary `(action, subject)` permission pairs; `RoleGrant.role` accepts built-in names or `custom_role:<uuid>`; policy evaluator resolves custom permissions before scope and policy checks
- [ ] **TEAM-04** (F-013): Three scope shapes per grant — `tenant`, `region`, `property_list`; coordinator scoped to a region sees exactly those properties on `/dispatch`
- [ ] **TEAM-05** (F-014): Named policy registry (`canTransitionJob`, `canAssignWorker`, `canEditCustomRole`, etc.) returns `Allow` or `Deny(reason)`; reason surfaces in API error body and UI Toast copy
- [ ] **TEAM-06** (F-015): Every authorization decision (allow and deny) writes a row to `permission_audits` with `request_id`, `actor_user_id`, `action`, `subject`, `subject_id`, `decision`, `reason`, `created_at`; retained 90 days
- [ ] **TEAM-07** (F-016): Audit log at `/settings/audit` is filterable by date range, actor, subject type, and decision; row click opens a detail Drawer; CSV export downloads a valid file with matching rows
- [ ] **TEAM-08** (F-090): Team members list at `/settings/team` shows avatar, name, email, RolePill, scope chips, and last-active; row click opens member Drawer
- [ ] **TEAM-09** (F-091): Invite member dialog accepts email (required), name (optional), role (built-in or custom), and scope (dependent on role); submitting shows a success Toast
- [ ] **TEAM-10** (F-092): Member Drawer shows grants (role, scope, granted by, granted at), recent audit rows, and notification preferences; actions: Change role, Adjust scope, Revoke access
- [ ] **TEAM-11** (F-093): Custom role creation UI at `/settings/team/roles` shows built-in roles read-only and custom roles as cards; "New role" dialog has a permissions matrix (action × subject checkboxes)

### SETTINGS — Settings and configuration

- [ ] **SETTINGS-01** (F-100): User can view and edit profile (avatar, name, password change, 2FA management, language, timezone); "Sign out from all devices" action revokes all refresh token families
- [ ] **SETTINGS-02** (F-101): Tenant admin can view operator name/slug, set timezone default and default job duration, and trigger a multi-step operator delete requiring the slug typed verbatim
- [ ] **SETTINGS-03** (F-072): User can toggle per-notification-kind email preferences at `/settings/notifications`; toggles persist through the API and are read by the Resend send paths

### INFRA — Infrastructure and deployment

- [x] **INFRA-01** (F-120): Production deployment at `https://crewmate.ritaro.dev`; Cloudflare Worker serves Next.js and proxies `/api/*`, `/v1/*`, `/graphql`, `/ws` to the AWS ALB; direct ALB requests without `x-cloudflare-secret` return 401
- [ ] **INFRA-02** (F-121): Terraform manages AWS — `network` (VPC, subnets, NAT, security groups with Cloudflare IP allowlist), `data` (RDS Postgres 17, ElastiCache Redis 7, S3), `secrets` (Secrets Manager, IAM task roles), `compute` (ECS cluster, api/worker services, ALB)
- [ ] **INFRA-03** (F-121): `apps/web/wrangler.toml` and Worker proxy handler (`apps/web/src/worker/proxy.ts`) are checked in; Wrangler secrets `BACKEND_ORIGIN` and `CLOUDFLARE_SHARED_SECRET` are set on the Worker
- [ ] **INFRA-04** (F-122): `deploy-api.yml` builds api image, pushes to ECR, runs `prisma migrate deploy` as a one-shot ECS task, rolling-updates api and worker services; gated by `prod` environment approval
- [ ] **INFRA-05** (F-122): `deploy-web.yml` builds the Next.js Worker bundle via `@opennextjs/cloudflare` (including the proxy handler) and runs `wrangler deploy`; gated by `prod` environment approval
- [x] **INFRA-06** (F-123): `GET /healthz` returns 200 (liveness); `GET /readyz` checks DB + Redis and returns 200 (healthy) or 503 (degraded) within 5 seconds; ALB target group health check uses `/readyz`; shared-secret check bypassed for health endpoints
- [ ] **INFRA-07** (F-112): REST surface under `/v1/*` with `class-validator` DTO validation; code-first GraphQL under `/graphql` with subscriptions; SDL committed to `packages/contracts/src/schema.graphql`
- [ ] **INFRA-08** (F-113): Every HTTP and WebSocket boundary validates input before any business logic; the API never reasons about untyped payloads
- [ ] **INFRA-09** (F-114): Pino structured logging in production (JSON), pretty in dev; every log line carries `requestId`, `tenantId`, `actorUserId`; request ID propagated via async-local-storage; logs ship to CloudWatch via ECS `awslogs` driver
- [ ] **INFRA-10** (F-115): Every error response has shape `{ code, message, requestId, details? }`; global exception filter logs and renders the contract; thrown `AppException` subclasses map to documented error codes
- [ ] **INFRA-11** (F-111): All Prisma access goes through repository classes extending `BaseRepository<T>`; tenant scoping injected at data layer, never at controller
- [ ] **INFRA-12** (F-130): Critical-path unit tests: job state machine (full transition matrix), RBAC policy evaluator (allow/deny cases), auth refresh-token rotation (replay detection), webhook payload signer (HMAC format verification)
- [ ] **INFRA-13** (F-131): Single Supertest integration test exercises happy path: login as worker → fetch today's jobs → transition first job to In Progress → transition to Completed → logout; runs against real Postgres and Redis via docker-compose
- [ ] **INFRA-14** (F-132): `ci.yml` GitHub Actions workflow runs unit and integration tests on every PR; no coverage gate

---

## Out of Scope

- **Native mobile apps (iOS/Android)** — responsive `/today` web route is sufficient
- **PWA, service worker, offline mode, push notifications** — real ops work, not needed for portfolio showcase
- **Stripe billing, plans, invoices** — no customers
- **Twilio SMS, in-app notification center** — email-only covers the surface
- **Impersonation** — custom roles carry access-delegation without impersonation chrome
- **Time-bound role grants** — `expires_at` column exists but no UI or sweep job
- **Inbound webhooks, webhook health metrics dashboard** — outbound spine only
- **Custom analytics dashboards, drilldowns, scheduled reports** — overview is sufficient
- **OpenTelemetry tracing** — Pino + CloudWatch is enough at this scale
- **Sentry error tracking** — structured logs with request ID; cheap to add later
- **PostHog product analytics** — no users to track
- **Multi-environment (dev/staging/prod)** — local docker-compose + one prod env
- **Multi-region, blue-green, geo replication** — single region
- **Dark mode / theming** — single light theme
- **Internationalization, RTL** — English only; `t()` wrapper for future swap
- **Playwright or Cypress e2e** — one Supertest integration test (F-131) covers happy path
- **Visual regression testing, Storybook** — manual review against `docs/images/ui/` is the contract
- **Coverage gates** — tests measure intent, not lines covered
- **SEO, OG metadata, sitemap, marketing site** — authenticated app only

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| AUTH-01 | 3 | TBD |
| AUTH-02 | 3 | TBD |
| AUTH-03 | 3 | TBD |
| AUTH-04 | 3 | TBD |
| AUTH-05 | 3 | TBD |
| AUTH-06 | 3 | TBD |
| AUTH-07 | 3 | TBD |
| TENANT-01 | 3 | TBD |
| TENANT-02 | 3 | TBD |
| TENANT-03 | 3 | TBD |
| JOBS-01 | 3 | TBD |
| JOBS-02 | 3 | TBD |
| JOBS-03 | 3 | TBD |
| JOBS-04 | 3 | TBD |
| JOBS-05 | 3 | TBD |
| JOBS-06 | 3 | TBD |
| JOBS-07 | 3 | TBD |
| DISPATCH-01 | 3 | TBD |
| DISPATCH-02 | 2 | TBD |
| DISPATCH-03 | 4 | TBD |
| DISPATCH-04 | 2 | TBD |
| DISPATCH-05 | 4 | TBD |
| SCHED-01 | 2 | TBD |
| SCHED-02 | 2 | TBD |
| SCHED-03 | 3 | TBD |
| WORKER-01 | 2 | TBD |
| WORKER-02 | 4 | TBD |
| EVENTS-01 | 3 | TBD |
| EVENTS-02 | 3 | TBD |
| EVENTS-03 | 3 | TBD |
| EVENTS-04 | 3 | TBD |
| EVENTS-05 | 3 | TBD |
| EVENTS-06 | 2 | TBD |
| EVENTS-07 | 3 | TBD |
| EVENTS-08 | 3 | TBD |
| TEAM-01 | 3 | TBD |
| TEAM-02 | 3 | TBD |
| TEAM-03 | 3 | TBD |
| TEAM-04 | 3 | TBD |
| TEAM-05 | 3 | TBD |
| TEAM-06 | 3 | TBD |
| TEAM-07 | 2 | TBD |
| TEAM-08 | 2 | TBD |
| TEAM-09 | 2 | TBD |
| TEAM-10 | 2 | TBD |
| TEAM-11 | 2 | TBD |
| SETTINGS-01 | 2 | TBD |
| SETTINGS-02 | 2 | TBD |
| SETTINGS-03 | 2 | TBD |
| INFRA-01 | 1 | 01-11 |
| INFRA-02 | 1 | TBD |
| INFRA-03 | 1 | TBD |
| INFRA-04 | 1 | TBD |
| INFRA-05 | 1 | TBD |
| INFRA-06 | 1 | 01-11 |
| INFRA-07 | 3 | TBD |
| INFRA-08 | 3 | TBD |
| INFRA-09 | 3 | TBD |
| INFRA-10 | 3 | TBD |
| INFRA-11 | 3 | TBD |
| INFRA-12 | 5 | TBD |
| INFRA-13 | 5 | TBD |
| INFRA-14 | 5 | TBD |
