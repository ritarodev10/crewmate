# CrewMate — Features

The authoritative spec of what ships on crewmate.ritaro.dev. Every feature in this document is on the roadmap and held against the guardrails in `docs/guardrails/`. Items intentionally not on the roadmap are listed in the **Out of scope** section at the end.

Every feature has a stable ID (`F-NNN`). Build plan tasks in `docs/BUILD.md` reference these IDs so the implementation trail is traceable both ways.

## Status legend

| Status | Meaning |
|---|---|
| **Live** | Shipped. Reads and writes real data. Persists across restarts. |
| **Preview** | Visible in the UI. Reads from sample data. Mutations may show success but not always persist to the backend. |
| **Planned** | On the roadmap. Not yet implemented. The feature card describes the intended shape. |
| **Out of scope** | Explicit decision not to build. Listed at the end of this document with reasons. |

Status surfaces in the UI in two places. The sidebar renders a small colored dot next to every nav item. The topbar on each screen renders a labeled status pill with an icon (`Live`, `Preview`, or `Planned`) next to the page title. Both indicators map to the tier table above and to the per-screen mapping in `docs/guardrails/frontend/03-layout-and-navigation.md`. When a feature is promoted between tiers, both indicators and the feature card here are updated in the same change.

## Scope at a glance

| Live | Preview | Planned |
|---|---|---|
| Multi-tenant data layer, four-layer RBAC, built-in roles, scope grants, policy evaluator, permission audit recording | Audit log UI, properties CRUD UI, schedules and schedule week view | Custom tenant-defined roles, custom role creation UI |
| Email and password auth, JWT access plus refresh, refresh-token rotation with replay detection | Settings surfaces (profile, account, notification preferences) | Two-factor authentication via TOTP, password reset flow, full email-driven worker invitation flow |
| Operators, Workers, Jobs with full state machine, transitions API | Webhook endpoint configuration UI, simulated signed-delivery worker, retry schedule honored by the simulator, webhook deliveries log UI | Resend integration with verified sender domain, transactional email templates |
| Realtime dispatch board over WebSocket with tenant rooms, job detail drawer, optimistic transitions, worker mobile-responsive view with one-tap transitions | Analytics overview dashboard | |
| Event bus and outbox writer, REST plus GraphQL surface, validation at boundaries, structured logs to CloudWatch, error contract over the wire | Team management surfaces (members list, invite dialog, member drawer) | |
| Single-domain deploy (web and proxied api at `crewmate.ritaro.dev` on Cloudflare Workers; NestJS api and BullMQ worker on AWS ECS Fargate behind a private ALB), Terraform IaC for AWS, wrangler config for the Worker, two GitHub Actions deploy workflows, health endpoints, critical-path unit tests, integration test, CI test pipeline | | |

For items intentionally not on the roadmap (Stripe, Twilio, PWA, OpenTelemetry, multi-region, dark mode, internationalization, and others), see the **Out of scope** section at the end of this document.

---

## Feature index

Every feature in the catalog below. Use this as the jump-table. Each row links the feature ID to its full card.

| ID | Feature | Section | Status |
|---|---|---|---|
| F-001 | Multi-tenant data layer | Tenancy and identity | Live |
| F-002 | Email + password authentication | Tenancy and identity | Live |
| F-003 | JWT access and refresh tokens | Tenancy and identity | Live |
| F-004 | Refresh-token rotation with replay detection | Tenancy and identity | Live |
| F-005 | Two-factor authentication via TOTP | Tenancy and identity | Planned |
| F-006 | Worker invitation flow | Tenancy and identity | Planned |
| F-007 | Password reset flow | Tenancy and identity | Planned |
| F-010 | Four-layer authorization model | Authorization | Live |
| F-011 | Built-in roles | Authorization | Live |
| F-012 | Custom tenant-defined roles | Authorization | Planned |
| F-013 | Per-grant scope | Authorization | Live |
| F-014 | Policy evaluator | Authorization | Live |
| F-015 | Permission audit log | Authorization | Live |
| F-016 | Audit log UI | Authorization | Preview |
| F-020 | Operators CRUD | Operations | Live |
| F-021 | Properties CRUD | Operations | Preview |
| F-022 | Workers CRUD | Operations | Live |
| F-023 | Jobs CRUD | Operations | Live |
| F-024 | Job state machine | Operations | Live |
| F-025 | Schedules | Operations | Preview |
| F-030 | WebSocket gateway with tenant rooms | Real-time dispatch | Live |
| F-031 | Dispatch board UI | Real-time dispatch | Live |
| F-032 | Job detail drawer | Real-time dispatch | Live |
| F-033 | Optimistic UI on transitions | Real-time dispatch | Live |
| F-040 | Today view | Worker view | Live |
| F-041 | One-tap transitions | Worker view | Live |
| F-050 | Week grid view | Schedule | Preview |
| F-060 | Webhook endpoint configuration | Webhooks | Preview |
| F-061 | Signed delivery worker | Webhooks | Preview |
| F-062 | Retry policy | Webhooks | Preview |
| F-063 | Webhook deliveries log UI | Webhooks | Preview |
| F-070 | Resend email integration | Notifications | Planned |
| F-071 | Email templates | Notifications | Planned |
| F-072 | Notification preferences UI | Notifications | Preview |
| F-080 | Overview dashboard | Analytics | Preview |
| F-090 | Members list | Team management | Preview |
| F-091 | Invite member dialog | Team management | Preview |
| F-092 | Member drawer | Team management | Preview |
| F-093 | Custom role creation UI | Team management | Planned |
| F-100 | Profile | Settings | Preview |
| F-101 | Account (operator-level) | Settings | Preview |
| F-110 | Event bus + outbox | Architecture | Live |
| F-111 | Repository pattern with tenant scoping | Architecture | Live |
| F-112 | REST + GraphQL surface | Architecture | Live |
| F-113 | Validation at boundaries | Architecture | Live |
| F-114 | Structured logging | Architecture | Live |
| F-115 | Error contract over the wire | Architecture | Live |
| F-120 | Production deployment | Deployment | Live |
| F-121 | Infrastructure as code | Deployment | Live |
| F-122 | GitHub Actions deploy workflows | Deployment | Live |
| F-123 | Health endpoints | Deployment | Live |
| F-130 | Critical-path unit tests | Testing | Live |
| F-131 | Integration test | Testing | Live |
| F-132 | CI test pipeline | Testing | Live |
| F-140 | Guardrails as the rules of engagement | AI workflow | Live |
| F-141 | Build plans as executable specs | AI workflow | Live |
| F-142 | UI guide as the visual contract | AI workflow | Live |

---

## 1. Tenancy and identity

### F-001: Multi-tenant data layer

**Status.** Live.
**Scope.** Every tenant-owned table (`Property`, `Worker`, `Job`, `Schedule`, `WebhookEndpoint`, `OutboxEvent`, `PermissionAudit`, `RoleGrant`, etc.) carries `operator_id`. The Prisma client is wrapped in a tenant-scope extension that injects `operatorId` into every `where` on tenant-owned models. Failing closed: any tenant-owned query made without a resolved `operatorId` throws.

**Surface.** No direct UI. Underpins every other feature.
**Spec.** `docs/guardrails/backend/01-data.md`, `docs/guardrails/shared/04-rbac.md` (layer 1).
**Build.** `docs/BUILD.md` layer 3 (the Prisma client extension is built alongside auth and RBAC).
**Acceptance.** Smoke test creates a job in tenant A and confirms tenant B sees an empty list.

### F-002: Email + password authentication

**Status.** Live.
**Scope.** Email plus password login. Passwords hashed with Argon2id (64MB memory, 3 iterations). One operator per email.
**Surface.** `POST /v1/auth/login`, login screen at `/login`.
**Spec.** `docs/guardrails/frontend/11-auth-flows.md`, `docs/images/ui/login.png`.
**Acceptance.** Wrong password returns 401 with `AUTH_INVALID_CREDENTIALS`. Correct credentials return `{ accessToken, refreshToken }`.

### F-003: JWT access and refresh tokens

**Status.** Live.
**Scope.** Access token TTL 15 minutes, refresh token TTL 7 days. Both signed with separate secrets. Tenancy claim (`operatorId`) included in the access token.
**Surface.** `POST /v1/auth/refresh`, httpOnly cookies on the web.
**Spec.** `docs/guardrails/frontend/11-auth-flows.md`.
**Acceptance.** Expired access token transparently refreshed; expired refresh redirects to `/login` with a banner.

### F-004: Refresh-token rotation with replay detection

**Status.** Live.
**Scope.** Refresh tokens stored hashed in a `refresh_tokens` table with `family_id`. On reuse of an old token, the entire family is revoked and the user is forced to re-authenticate. An audit row of type `refresh.replay` is written.
**Surface.** Same `POST /v1/auth/refresh` endpoint; replay returns 401 plus side-effect revocation.
**Spec.** `docs/guardrails/frontend/11-auth-flows.md`, `docs/guardrails/shared/03-security.md`.
**Acceptance.** Replay test simulates use of an already-rotated token, returns 401, and the family is gone from the DB.

### F-005: Two-factor authentication via TOTP

**Status.** Planned.
**Scope.** Time-based one-time password (RFC 6238). Enrollment with QR code and manual code. Verification page after login when 2FA is enabled. Recovery codes shown once, downloadable, copyable.
**Surface.** Settings under `/settings/profile`, the enrollment modal, the post-login verification page.
**Spec.** `docs/guardrails/frontend/11-auth-flows.md`, `docs/guardrails/frontend/19-settings.md`.
**Acceptance.** User enrolls, scans, enters code, then on next login is prompted for OTP before reaching the app.

### F-006: Worker invitation flow

**Status.** Planned.
**Scope.** The intended shape is an email-driven acceptance flow. A tenant admin or coordinator invites a worker by email. The invitation email contains a one-time link valid for 7 days. The landing page asks the invitee to set a password, confirm name, and accept the role and scope shown read-only. On submit, the invitee lands on `/today` (worker) or `/dispatch` (coordinator). On the current roadmap version, the seed script provisions worker users directly with passwords printed to the seed output; the email-driven acceptance path is not yet wired.
**Surface.** Invite dialog inside `/settings/team` (surface present, see F-091), acceptance page at `/invite/:token` (Planned), email via Resend (Planned, see F-070).
**Spec.** `docs/guardrails/frontend/11-auth-flows.md`, `docs/guardrails/frontend/18-team-and-rbac.md`.
**Acceptance.** End to end: invite from team page, email lands in MailHog locally (or Resend in prod), click link, set password, sign in.

### F-007: Password reset flow

**Status.** Planned.
**Scope.** Three steps. Step 1 request page (email input only). Step 2 reset email with a one-time link, 30-minute expiry. Step 3 reset form (new password plus confirm). On submit, user is signed in and redirected. The current roadmap version has no public reset flow; password recovery is handled by an operator reissuing credentials through the seed script.
**Surface.** `/forgot`, email via Resend, `/reset/:token`.
**Spec.** `docs/guardrails/frontend/11-auth-flows.md`.
**Acceptance.** Request, receive email, follow link, set new password, signed in.

---

## 2. Authorization (RBAC)

### F-010: Four-layer authorization model

**Status.** Live.
**Scope.** Tenancy enforced at the data layer (F-001), role checked at the request layer, scope checked at the service layer, policy conditions evaluated at the service or query layer. See the diagram at `docs/images/diagrams/rbac-model.png`.
**Surface.** NestJS decorators `@Roles`, `@Scoped`, `@Policy`. Policy evaluator service.
**Spec.** `docs/guardrails/shared/04-rbac.md`.
**Acceptance.** A protected route protected by `@Roles('worker')` rejects an `admin` token with 403 and writes a `permission_audits` row of `decision: 'deny'`.

### F-011: Built-in roles

**Status.** Live.
**Scope.** Four system role names. `super_admin` sees across operators (used for support and CrewMate-internal accounts). `tenant_admin` has full read and write inside one operator. `coordinator` runs the dispatch board and schedules. `worker` sees only their own day.
**Surface.** Role names hardcoded in `@crewmate/contracts`. UI renders via the `RolePill` component (`docs/guardrails/frontend/01-components.md`).
**Spec.** `docs/guardrails/shared/04-rbac.md`, `docs/guardrails/frontend/18-team-and-rbac.md`.

### F-012: Custom tenant-defined roles

**Status.** Planned.
**Scope.** Tenant admins create roles with arbitrary permission combinations. Permissions stored as `(action, subject)` pairs in a `custom_roles` table. `RoleGrant.role` accepts either a built-in name or `custom_role:<uuid>`. The policy evaluator resolves the custom role's permissions before applying scope and policy.
**Surface.** API endpoints under `/v1/team/roles`. UI at `/settings/team/roles` (Card grid of built-in and custom roles, "New role" dialog with permissions matrix; see F-093).
**Spec.** `docs/guardrails/shared/04-rbac.md`, `docs/guardrails/frontend/18-team-and-rbac.md`.
**Acceptance.** A tenant admin creates a role `inspector` with read on `properties` and read on `jobs`, assigns it to a user, that user logs in and reaches the expected pages without 403s on the read paths and with 403s on the write paths.

### F-013: Per-grant scope

**Status.** Live.
**Scope.** Three scope shapes per grant. `tenant` (all of the operator's data), `region` (one region of properties), `property_list` (an explicit set of properties). Coordinators are typically scoped to a region; workers to a single property. Scope stored as JSON on `RoleGrant` with a Zod schema in `@crewmate/contracts`.
**Surface.** `@Scoped('property' | 'region' | 'tenant')` decorator on routes; scope chips on the team page.
**Spec.** `docs/guardrails/shared/04-rbac.md`.
**Acceptance.** Coordinator scoped to two properties sees exactly those two on `/dispatch`; the third returns empty.

### F-014: Policy evaluator

**Status.** Live.
**Scope.** Named policies registered per feature (`canTransitionJob`, `canAssignWorker`, `canEditCustomRole`, etc.). Each returns `Allow` or `Deny(reason)`. Reasons surface in the API error body and inform UI copy.
**Surface.** `PolicyEvaluator` service in NestJS, `@Policy('canX')` decorator.
**Spec.** `docs/guardrails/shared/04-rbac.md`, `docs/guardrails/backend/04-error-handling.md`.
**Acceptance.** Attempting a disallowed transition returns 409 with `JOB_INVALID_TRANSITION` and a human-readable reason; the UI Toast shows that reason verbatim.

### F-015: Permission audit log

**Status.** Live.
**Scope.** Every authorization decision (allow and deny) writes a row to `permission_audits`. Columns: `request_id`, `actor_user_id`, `action`, `subject`, `subject_id`, `decision`, `reason`, `created_at`. Retained 90 days.
**Surface.** Automatic via an `AuditInterceptor` on every protected route. Cross-link to F-016.
**Spec.** `docs/guardrails/shared/04-rbac.md`, `docs/guardrails/backend/05-reusable-patterns.md`.

### F-016: Audit log UI

**Status.** Preview.
**Scope.** A filterable table of audit rows at `/settings/audit`. Filters by date range, actor, subject type, decision. Each row click opens a Drawer with the full audit detail. CSV export via a server-rendered file response (no background job needed at this scale). The UI reads from the seeded audit dataset; filter and export wiring against the live API is the work that moves this card to Live.
**Surface.** UI at `/settings/audit`. API at `GET /v1/audit`. Tenant admin and super admin only.
**Spec.** `docs/guardrails/frontend/19-settings.md`, `docs/guardrails/frontend/12-data-display.md`.
**Acceptance.** A known recent deny event is findable within three filter operations; CSV export downloads a valid file with matching rows.

---

## 3. Operations domain

### F-020: Operators CRUD

**Status.** Live.
**Scope.** Super-admin only. Create, list, and edit operators. Slug uniqueness enforced.
**Surface.** `/v1/operators`, no UI on the roadmap yet (super-admin actions via API only).
**Spec.** `docs/guardrails/backend/02-api.md`.

### F-021: Properties CRUD

**Status.** Preview.
**Scope.** Full CRUD with soft delete. Each property carries name, kind, region (optional), address, timezone. The API layer is Live and used by the dispatch board and schedule. The `/settings/properties` UI renders the list and edit forms against seeded data; persistence of edits through the UI is the work that moves this card to Live.
**Surface.** REST and GraphQL. UI at `/settings/properties` (Card grid) and `/settings/properties/[id]` (edit).
**Spec.** `docs/guardrails/frontend/19-settings.md`.

### F-022: Workers CRUD

**Status.** Live.
**Scope.** Workers represented by `Worker` rows with optional `user_id` link (set after invitation acceptance). Includes name, phone, hourly rate (optional).
**Surface.** REST and GraphQL. UI at `/settings/team` (members table includes workers) and on the worker invitation flow (F-006).
**Spec.** `docs/guardrails/frontend/18-team-and-rbac.md`.

### F-023: Jobs CRUD

**Status.** Live.
**Scope.** Jobs CRUD with the state machine in F-024. Filters by status, worker, property, date range. Cursor pagination on the list endpoint is out of scope; offset is enough.
**Surface.** REST and GraphQL. Listing on dispatch board (F-031) and worker mobile (F-040).
**Spec.** `docs/guardrails/backend/02-api.md`.

### F-024: Job state machine

**Status.** Live.
**Scope.** Five states. `Scheduled` → `En Route` → `In Progress` → `Completed` → `Verified`. Transitions are gated by both the state machine and the actor's role. Cancellation possible from any non-Verified state by an admin or coordinator. The diagram at `docs/images/diagrams/job-state-machine.png` is the visual contract.
**Surface.** `POST /v1/jobs/:id/transition` with `{ to: <state> }`. Emits `job.status.changed` domain event.
**Spec.** `docs/guardrails/backend/02-api.md`.
**Acceptance.** Every allowed transition exercised in unit tests; every invalid transition returns 409 with `JOB_INVALID_TRANSITION` and a reason.

### F-025: Schedules

**Status.** Preview.
**Scope.** A `Schedule` is a recurring template. Materialization explodes a schedule into Jobs across a date range. Idempotent: re-running materialize for the same window does not double-create. The schema and materialization logic are present and seeded; the API endpoints exist and serve from the seed. The work to graduate this to Live is to enable schedule creation and edit through the API in production and have the UI write through to it.
**Surface.** REST endpoints on `/v1/schedules`. Materialization at `POST /v1/schedules/:id/materialize?from=&to=`. UI at `/schedule` (F-050).
**Spec.** `docs/guardrails/frontend/16-schedule-view.md`.

---

## 4. Real-time dispatch

### F-030: WebSocket gateway with tenant rooms

**Status.** Live.
**Scope.** Native NestJS WebSocket gateway. Each socket joins a `tenant:<operatorId>` room on connect, authenticated against the same JWT used by REST. Subscriptions for `job.status.changed`, `job.assigned`, `webhook.delivery.*`. Scope-aware filtering so a coordinator only receives events for their scoped properties.
**Surface.** `wss://crewmate.ritaro.dev/ws` (proxied by the Cloudflare Worker to the AWS backend) plus the local `ws://localhost:3000`.
**Spec.** `docs/guardrails/shared/02-events.md`, `docs/guardrails/backend/00-nestjs.md`.
**Acceptance.** Two browsers connected as different coordinators see only events that match their scope.

### F-031: Dispatch board UI

**Status.** Live.
**Scope.** Four-column kanban at `/dispatch`. Columns: SCHEDULED, EN ROUTE, IN PROGRESS, COMPLETED. VERIFIED jobs roll off the board after a configurable delay. Cards show property, worker, and a time chip; active in-progress job per worker has an amber dot. Real-time updates via WebSocket subscriptions; optimistic UI on transitions with rollback Toast on error.
**Surface.** Route `/dispatch`. Visual contract at `docs/images/ui/dispatch-board.png`.
**Spec.** `docs/guardrails/frontend/14-dispatch-board.md`.

### F-032: Job detail drawer

**Status.** Live.
**Scope.** Right-side drawer at 480px desktop and full-width mobile. Header (title, status pill, close), horizontal stepper, details key and value, activity timeline, primary actions (Mark Completed, Reassign).
**Surface.** Triggered by clicking a job card on the dispatch board or schedule. Visual contract at `docs/images/ui/job-detail.png`.
**Spec.** `docs/guardrails/frontend/12-data-display.md`, `docs/guardrails/frontend/14-dispatch-board.md`.

### F-033: Optimistic UI on transitions

**Status.** Live.
**Scope.** Transitions update the cache (Apollo for the GraphQL surface, TanStack Query for any REST that surfaces them) immediately; revert with a Toast on server reject.
**Surface.** Cross-cutting on the dispatch board, worker view, and detail drawer.
**Spec.** `docs/guardrails/frontend/05-data-fetching.md`.

---

## 5. Worker view (mobile-responsive web)

### F-040: Today view

**Status.** Live.
**Scope.** Mobile-shaped responsive route at `/today`. Header with date strip (7 days, today highlighted). Vertical list of today's jobs ordered by scheduled start. Card states: scheduled (default, primary action "Start"), in progress (amber left border, primary action "Mark Arrived" or "Mark Completed" depending on substate), completed (muted card with check icon, no action), cancelled (danger pill, dimmed).
**Surface.** Route `/today`. Visual contract at `docs/images/ui/worker-mobile.png`. Not a PWA; no service worker, no install prompt, no push.
**Spec.** `docs/guardrails/frontend/15-worker-mobile.md`.

### F-041: One-tap transitions

**Status.** Live.
**Scope.** Full-width primary button on each active card. Tap moves the job through the state machine. Optimistic UI per F-033. Tap target at least 44px.
**Surface.** Same `/today` route.
**Spec.** `docs/guardrails/frontend/15-worker-mobile.md`.

---

## 6. Schedule

### F-050: Week grid view

**Status.** Preview.
**Scope.** Workers in rows, days in columns. Rounded event blocks per scheduled job. Color rules: brand fill default, amber fill for priority, thin red outline only for overdue. Stacking with "+N more" overflow when a day has multiple jobs per worker. Week navigation (prev, next, "Today" jump). Worker and property filters. The view reads from the seeded schedule and renders to the visual contract; drag-to-reschedule is documented but not on the current roadmap. Live promotion follows F-025 going Live.
**Surface.** Route `/schedule`. Visual contract at `docs/images/ui/schedule.png`.
**Spec.** `docs/guardrails/frontend/16-schedule-view.md`.

---

## 7. Webhooks

### F-060: Webhook endpoint configuration

**Status.** Preview.
**Scope.** Per-tenant `WebhookEndpoint` rows. CRUD with per-endpoint HMAC signing secret (generated on create, shown once, hashed at rest, rotatable). Event subscriptions via checkbox list. Endpoint can be paused. "Test delivery" action enqueues a synthetic event and routes the user into the deliveries log filtered to that delivery. On the current roadmap version, the UI at `/settings/webhooks` renders the endpoint list and the edit form against the seeded endpoint; saving a new or edited endpoint surfaces a success Toast in the UI without writing through to a persistent store. The seed creates one endpoint pointing at a free webhook.site URL so the deliveries log (F-063) populates with signed deliveries out of the box.
**Surface.** REST at `/v1/webhooks/endpoints`. UI at `/settings/webhooks` (list and detail page).
**Spec.** `docs/guardrails/frontend/17-webhooks-and-events.md`.

### F-061: Signed delivery worker

**Status.** Preview.
**Scope.** The intended shape is a BullMQ queue `webhook-delivery` whose worker consumes outbox-relayed events, signs the payload with the endpoint's HMAC (`x-crewmate-signature: t=<ts>,v1=<sig>`), and POSTs to the endpoint. Every attempt is persisted in `webhook_deliveries` with status, response code, latency, and attempt count. On the current roadmap version, the `webhook_deliveries` schema is real, the rows are real, and the signature format is real, but the rows are written by a seeded delivery simulator on a fixed interval rather than by a live BullMQ consumer reading from the outbox. The visible behavior in the deliveries log (F-063) is end-to-end faithful.
**Surface.** Backend worker container in production (same image as API, different command). No direct UI.
**Spec.** `docs/guardrails/shared/02-events.md`, `docs/guardrails/backend/00-nestjs.md`.

### F-062: Retry policy

**Status.** Preview.
**Scope.** Exponential backoff schedule: 1m, 5m, 25m, 2h, 12h. Maximum 5 attempts. On final failure, emits `webhook.delivery.failed` event. Failed deliveries surface in F-063. The documented schedule is honored by the seeded simulator described in F-061; back-pressure and dead-letter handling are stubs until the BullMQ consumer is wired in.
**Spec.** `docs/guardrails/backend/04-error-handling.md`, `docs/guardrails/shared/02-events.md`.

### F-063: Webhook deliveries log UI

**Status.** Preview.
**Scope.** Stripe-style table at `/webhooks`. Columns: status pill, event, endpoint, attempt, timestamp, latency. Filters by event name, time window, status. Selected row opens a pinned right-side detail panel with the raw signed payload (JsonViewer) and headers. `Retry failed` action re-enqueues. The table is wired to the live `webhook_deliveries` table; the rows themselves come from the simulator in F-061 rather than a live consumer.
**Surface.** Route `/webhooks`. Visual contract at `docs/images/ui/webhook-log.png`.
**Spec.** `docs/guardrails/frontend/17-webhooks-and-events.md`.

---

## 8. Notifications

### F-070: Resend email integration

**Status.** Planned.
**Scope.** Outbound transactional email via Resend. Single sender domain `crewmate.ritaro.dev` (DNS verified via DKIM, SPF, DMARC). `RESEND_API_KEY` in env. `EmailProvider` interface with two implementations: `ResendProvider` for production, `SmtpProvider` (pointed at MailHog) for local dev. Provider selected by `NODE_ENV`.
**Surface.** Internal service `NotificationsService.sendEmail(template, data, to)`. No direct UI.
**Spec.** `docs/guardrails/backend/00-nestjs.md`, `docs/guardrails/shared/02-events.md`.
**Acceptance.** Inviting a worker in production delivers a real email via Resend within ~5 seconds; local dev delivers to MailHog at `:8025`.

### F-071: Email templates

**Status.** Planned.
**Scope.** Three templates planned. Authored in React Email (the Resend-friendly templating library) so the rendering pipeline is one repo, not a separate templating service.

| Template | Trigger | Recipient |
|---|---|---|
| `worker.invited` | F-006 invitation flow | Invited worker |
| `password.reset` | F-007 reset request | User who requested |
| `webhook.delivery.failed.digest` (optional) | Daily roll-up of failed deliveries per endpoint | Tenant admin |

The third template is optional and may land in a later milestone if the first two land cleanly.

**Spec.** `docs/guardrails/backend/00-nestjs.md`.

### F-072: Notification preferences UI

**Status.** Preview.
**Scope.** Per-user toggles on `/settings/notifications`. Rows: notification kinds (Worker invited, Password reset notification, Webhook delivery failed digest, Weekly summary). Columns: Email only on the current roadmap (no SMS column, no Push column). The toggles render against seeded preferences; persisting toggle state through the API and wiring it into the Resend send paths (F-070) is the work that promotes this card to Live.
**Surface.** Route `/settings/notifications`.
**Spec.** `docs/guardrails/frontend/19-settings.md`.

---

## 9. Analytics

### F-080: Overview dashboard

**Status.** Preview.
**Scope.** Single page at `/dashboard`. Three KPI cards (Jobs completed, On-time rate, Avg job duration) with delta vs previous period. Wide stacked area chart "Jobs by status over time". Two-column section below with horizontal bar chart "Top properties by job volume" and a sparkline list "Workers, last 7 days". Date range picker (presets and custom). CSV export of the raw data. The page renders from precomputed sample aggregates; replacing those with live aggregation queries against the operations data is the promotion path.
**Surface.** Route `/dashboard`. Visual contract at `docs/images/ui/analytics.png`.
**Spec.** `docs/guardrails/frontend/13-dashboard-and-analytics.md`.

---

## 10. Team management

### F-090: Members list

**Status.** Preview.
**Scope.** Table at `/settings/team`. Columns: Member (avatar, name, email), Role (RolePill), Scope (chips), Last active. Row click opens member Drawer. Scope chip click filters the list by that scope. The table reads from seeded users and grants; wiring filter state to a live query and updating "Last active" from session telemetry is the promotion path.
**Surface.** Route `/settings/team`. Visual contract at `docs/images/ui/team-management.png`.
**Spec.** `docs/guardrails/frontend/18-team-and-rbac.md`.

### F-091: Invite member dialog

**Status.** Preview.
**Scope.** Dialog opened from the "Invite member" primary button. Fields: email (required), name (optional), role (Select of built-in and custom roles), scope (Combobox dependent on role). On submit, the dialog surfaces a success Toast; the actual queued invitation send depends on F-070 going Live and the acceptance flow in F-006 being wired.
**Spec.** `docs/guardrails/frontend/18-team-and-rbac.md`.

### F-092: Member drawer

**Status.** Preview.
**Scope.** Right-side Drawer with header (avatar, name, email, role pill), Grants section (each grant with role, scope, granted by, granted at), Activity section (recent audit rows), Notification preferences section (read-only here, edited in own settings). Actions: Change role, Adjust scope, Revoke access. The drawer renders from seeded grants and audits; the three actions surface success in the UI and write to a local in-memory store rather than persisting through the API.
**Spec.** `docs/guardrails/frontend/18-team-and-rbac.md`.

### F-093: Custom role creation UI

**Status.** Planned.
**Scope.** Sub-page at `/settings/team/roles`. Built-in roles listed read-only at the top. Custom roles as Cards below with name, permission summary, and member count. "New role" dialog with permissions matrix (action × subject checkboxes). Realizes F-012.
**Surface.** Route `/settings/team/roles`.
**Spec.** `docs/guardrails/frontend/18-team-and-rbac.md`.

---

## 11. Settings (overview)

| Sub-page | Owner feature |
|---|---|
| `/settings/profile` | F-100 Profile |
| `/settings/notifications` | F-072 Notification preferences |
| `/settings/team` | F-090 Members list |
| `/settings/team/roles` | F-093 Custom roles |
| `/settings/properties` | F-021 Properties |
| `/settings/webhooks` | F-060 Webhook endpoints |
| `/settings/audit` | F-016 Audit log UI |
| `/settings/account` | F-101 Account (operator-level) |

### F-100: Profile

**Status.** Preview.
**Scope.** Identity (avatar, name, email read-only with change-email confirmation flow). Password change. Two-factor management (link to F-005, Planned). Language and timezone. "Sign out from all devices" action. Form rendering and validation are wired; persistence of profile edits through the API is the work that promotes this card to Live.
**Spec.** `docs/guardrails/frontend/19-settings.md`.

### F-101: Account (operator-level)

**Status.** Preview.
**Scope.** Tenant admin only. Operator name and slug (read-only). Timezone default. Default job duration. Danger zone with "Delete operator" multi-step ConfirmDialog requiring the operator name typed verbatim. The Danger zone action surfaces the confirm flow and a success Toast; wiring the actual operator-delete pathway through the API is the work that promotes this card to Live.
**Spec.** `docs/guardrails/frontend/19-settings.md`.

---

## 12. Architecture features (no direct UI, foundational)

### F-110: Event bus + outbox

**Status.** Live.
**Scope.** In-process `EventEmitter2`-based bus for domain events. Each domain transition writes the state change and an `OutboxEvent` row in the same Prisma transaction. A relay loop publishes outbox events to BullMQ for webhook fan-out and to the WebSocket gateway for realtime fan-out.
**Spec.** `docs/guardrails/shared/02-events.md`.
**Acceptance.** Killing Postgres mid-transition leaves either both rows or neither.

### F-111: Repository pattern with tenant scoping

**Status.** Live.
**Scope.** Every Prisma access goes through a repository class extending `BaseRepository<T>`. Tenant scoping is injected at the data layer, not the controller. Cross-feature reads go through the appropriate repository, never directly through Prisma.
**Spec.** `docs/guardrails/backend/01-data.md`, `docs/guardrails/backend/05-reusable-patterns.md`.

### F-112: REST + GraphQL surface

**Status.** Live.
**Scope.** REST under `/v1/*` for stable external contracts (webhooks, integrations). GraphQL under `/graphql` for the web app's read and mutation surface, including subscriptions over WebSocket. Code-first NestJS GraphQL; Apollo Client on the web. SDL committed to `packages/contracts/src/schema.graphql`. No federation, no subgraph.
**Spec.** `docs/guardrails/backend/02-api.md`, `docs/guardrails/frontend/05-data-fetching.md`.

### F-113: Validation at boundaries

**Status.** Live.
**Scope.** Zod schemas at the HTTP and WebSocket boundary. `class-validator` and `class-transformer` for the NestJS DTOs that hit the controller. Validation runs before any business logic; the API never reasons about untyped payloads.
**Spec.** `docs/guardrails/backend/02-api.md`.

### F-114: Structured logging

**Status.** Live.
**Scope.** Pino in production (JSON), pretty in dev. Every log line carries `requestId`, `tenantId`, `actorUserId` when available. Request ID propagated via async-local-storage. Logs ship to CloudWatch via the ECS `awslogs` driver. No OpenTelemetry tracing, no Sentry, no PostHog on the current roadmap.
**Spec.** `docs/guardrails/backend/00-nestjs.md`, `docs/guardrails/backend/04-error-handling.md`.

### F-115: Error contract over the wire

**Status.** Live.
**Scope.** Every error response shape: `{ code, message, requestId, details? }`. Exception hierarchy under `AppException`. Global filter logs and renders the contract. UI consumes via the mapping table in `frontend/09-error-handling.md`.
**Spec.** `docs/guardrails/backend/04-error-handling.md`, `docs/guardrails/frontend/09-error-handling.md`.

---

## 13. Deployment and infrastructure

### F-120: Production deployment

**Status.** Live.
**Scope.** Single-domain production deployment. The entire public surface is `https://crewmate.ritaro.dev`. A single Cloudflare Worker serves the Next.js app and reverse-proxies four path prefixes (`/api/*`, `/v1/*`, `/graphql`, `/ws`) to the AWS backend. The AWS backend (NestJS API and BullMQ worker behind an ALB, Postgres on RDS, Redis on ElastiCache, object storage on S3, image registry on ECR) has no public domain; the Worker is the only intended caller. Caller authenticity is enforced via a shared `x-cloudflare-secret` header and an ALB security group ingress restricted to Cloudflare's IP ranges. Cookies are same-origin (no `Domain=` attribute needed). Cloudflare Universal SSL (free) terminates TLS at the edge.
**Surface.** Single URL: `https://crewmate.ritaro.dev`.
**Spec.** `docs/AGENT-SETUP.md` (deploy section), `docs/BUILD.md` (layer 12).
**Acceptance.** `https://crewmate.ritaro.dev` returns the login page. `https://crewmate.ritaro.dev/api/healthz` returns 200 via the proxied path. Direct requests to the AWS ALB without the shared secret return 401.

### F-121: Infrastructure as code

**Status.** Live.
**Scope.** Terraform manages the AWS side. The Cloudflare side is configured via `apps/web/wrangler.toml` plus one-time Cloudflare dashboard setup for the DNS zone. Terraform modules: `network` (VPC, subnets, NAT, security groups including the Cloudflare IP allowlist on the ALB security group), `data` (RDS, ElastiCache, S3), `secrets` (Secrets Manager, IAM task roles, the `CLOUDFLARE_SHARED_SECRET` entry), `compute` (ECS cluster, API + worker services, ALB). No `edge` module. No ACM certificate for a custom api subdomain. State backend in S3 with DynamoDB lock.
**Surface.** `infrastructure/terraform/` for AWS, `apps/web/wrangler.toml` plus Wrangler secrets for the Worker.
**Spec.** `docs/BUILD.md` layer 12.
**Acceptance.** `terraform apply` from a fresh state brings up the AWS side reachable at the ALB's AWS-issued URL. `wrangler deploy` from `apps/web/` brings up the Worker. End-to-end the site at `https://crewmate.ritaro.dev` answers.

### F-122: GitHub Actions deploy workflows

**Status.** Live.
**Scope.** Two deploy workflows on push to main. `deploy-api.yml` uses OIDC trust to AWS, builds the api image, pushes to ECR, runs `prisma migrate deploy` as a one-shot ECS task, rolling-updates api and worker services. `deploy-web.yml` builds the Next.js Worker bundle via the `@opennextjs/cloudflare` adapter (including the proxy handler for `/api/*`, `/v1/*`, `/graphql`, `/ws`), then runs `wrangler deploy` with a Cloudflare API token from a GitHub secret. Both gated by a manual approval on the GitHub `prod` environment.
**Surface.** `.github/workflows/deploy-api.yml`, `.github/workflows/deploy-web.yml`.
**Spec.** `docs/BUILD.md` layer 12.
**Acceptance.** A push to main triggers both workflows. After approval, both deploy within ~10 minutes. The smoke job confirms `https://crewmate.ritaro.dev` returns the login page and `https://crewmate.ritaro.dev/api/healthz` returns 200.

### F-123: Health endpoints

**Status.** Live.
**Scope.** `GET /healthz` (liveness) and `GET /readyz` (readiness, checks DB plus Redis) on the api. The ALB target group health check uses `/readyz` against the ALB's AWS-issued URL. Browsers reach these endpoints via the Worker proxy at `https://crewmate.ritaro.dev/api/healthz` and `/api/readyz`. The shared-secret check is bypassed for the health endpoints so the ALB target group probe can reach them directly.
**Surface.** `/healthz`, `/readyz` on the api; reachable in browsers via `https://crewmate.ritaro.dev/api/healthz`.
**Spec.** `docs/guardrails/backend/00-nestjs.md`.
**Acceptance.** `https://crewmate.ritaro.dev/api/healthz` returns 200 from prod. Killing the RDS connection makes `/readyz` return 503 within 5 seconds.

---

## 14. Testing

### F-130: Critical-path unit tests

**Status.** Live.
**Scope.** Jest. Test files colocated as `*.spec.ts`. Coverage focused on the most interesting code:

- Job state machine (`canTransition`) with the full transition matrix.
- RBAC policy evaluator with a representative set of allow and deny cases.
- Auth refresh-token rotation with the replay-detection branch.
- The signed-webhook payload signer.

Target: 3 to 5 unit test files total. Each is well-named, well-structured, and serves as a reading sample.

**Spec.** `docs/guardrails/backend/03-testing.md`.

### F-131: Integration test

**Status.** Live.
**Scope.** Single Supertest e2e test that exercises the happy path: login as worker, fetch today's jobs, transition the first one to In Progress, transition to Completed, log out. Runs against a real Postgres and Redis via docker-compose. Not a full test pyramid; one walkthrough.
**Spec.** `docs/guardrails/backend/03-testing.md`.

### F-132: CI test pipeline

**Status.** Live.
**Scope.** The `ci.yml` workflow runs unit and integration tests on every PR. No coverage gate. No perf tests. No frontend e2e (Playwright stays off the roadmap).
**Spec.** `docs/BUILD.md`.

---

## 15. AI-assisted workflow

### F-140: Guardrails as the rules of engagement

**Status.** Live.
**Scope.** `docs/guardrails/` contains shared, backend, and frontend subfolders that every AI session attaches as context. The rules in there are non-negotiable for any AI-generated code that ships.
**Spec.** `docs/guardrails/README.md`.

### F-141: Build plans as executable specs

**Status.** Live.
**Scope.** `docs/BUILD.md` is the architectural decomposition. Each layer references the feature IDs in this document it realizes. The execution phasing in `docs/execution/00-phasing.md` reorders the layers into wave-based phases with task IDs that map back to features.
**Spec.** `docs/BUILD.md`.

### F-142: UI guide as the visual contract

**Status.** Live.
**Scope.** `docs/guardrails/frontend/` (19 chapters) defines the design system, components, and every surface. The rendered screens in `docs/images/ui/` are the pixel-faithful contract.

---

## Out of scope (with reasons)

| Feature | Reason |
|---|---|
| Impersonation | Custom roles (F-012) carry the access-delegation story already; impersonation adds chrome (banner, exit hooks) for marginal gain. |
| Time-bound role grants | Schema supports `expires_at` already; no UI or sweep job is on the roadmap. |
| Field-level masking | Cheap to add later; no surfaces currently need it. |
| Stripe billing, plans, invoices | No customers, no value. The Settings sidebar omits a Billing entry entirely. |
| Twilio SMS, in-app notification center | Email-only via Resend covers the notification surface. |
| PWA, service worker, offline transition queue, push notifications, install prompt | Real engineering for real users in the field. A responsive `/today` route is enough. |
| Inbound webhooks, webhook health metrics dashboard | The signed-outbound spine is the spine; inbound is a different problem. |
| Bulk import or export beyond the audit-log CSV | The audit CSV is the only one F-016 needs. |
| Custom analytics dashboards, drilldowns, scheduled reports | Overview is enough. |
| OpenTelemetry tracing | Pino plus CloudWatch is enough observability for the current scale. OTel collector is real ops. |
| Sentry error tracking | Same reasoning. Structured logs to CloudWatch carry the request id. Future swap is cheap. |
| PostHog product analytics | No users to track. |
| Status page (Cachet, Statuspage.io) | CloudWatch alarms on `/readyz` are enough. |
| Multi-environment (dev, staging, prod) | One prod env. Local dev via docker-compose. Push-to-main deploys after approval. |
| Multi-region, blue-green, geo replication | Single region. |
| Disaster recovery runbook and restore drill | Backups via RDS snapshots are enabled. Drill is real-ops work. |
| Coverage gates (75% or 85% floors) | Tests measure intent, not lines covered. |
| Playwright or Cypress e2e on the frontend | One Supertest integration test (F-131) covers the happy path. |
| Performance regression tests, load tests, k6 | Not warranted at the current scale. |
| Visual regression testing, Storybook | Manual review against the rendered images in `docs/images/ui/` is the contract. |
| SEO and OG metadata, sitemap, marketing site | Authenticated app only. No public surface to optimize. |
| Theming, dark mode | Single light theme. Reduced-motion is supported per `13-accessibility-and-motion.md`. |
| Internationalization, RTL | Single-locale (English). Copy wrapped in a `t()` helper for future swap. |

---

## How this document is used

- **When building.** Each task in `docs/BUILD.md` references one or more `F-NNN` IDs. The task is complete only when its referenced features pass their acceptance check in this document.
- **When reviewing.** The Status field is the contract. Reviewers cross-check the PR against the feature ID and the feature's current tier. A PR that ships behavior promotes the card from Planned to Preview or from Preview to Live by updating the Status line here and the sidebar dot mapping in `docs/guardrails/frontend/03-layout-and-navigation.md` in the same change. A PR that ships behavior not in this document either updates the document or is out of scope (reject or split).
- **When walking the system end to end.** Read the sections in order. The sidebar dots in the app mirror the Status field on each card.

## Cross-references

- Architecture rules and conventions: [`docs/guardrails/`](./guardrails/README.md)
- Implementation by architectural layer: [`docs/BUILD.md`](./BUILD.md)
- Execution order, gates, and parallelism: [`docs/execution/`](./execution/README.md)
- Visual contracts (rendered screens and diagrams): [`docs/images/`](./images/)
- Local setup and secrets: [`docs/AGENT-SETUP.md`](./AGENT-SETUP.md)
- Project narrative and quickstart: [`README.md`](../README.md)
