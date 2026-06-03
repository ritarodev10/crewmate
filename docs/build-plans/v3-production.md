# v3 — Production

Everything in v2, plus the v0.2 RBAC features, billing, real email and SMS providers, a PWA worker app, full observability, AWS infrastructure as code, and a CI/CD pipeline that ships to staging and production.

Designed for 15-20 agents in parallel, ~18-24 hours wall-clock. Honest framing: this fits in one long night only with a wide, well-orchestrated swarm. Compress the swarm and it becomes a two-night job.

## Goal

Ship the full system a small ops team could actually use in production for a real operator. The portfolio narrative becomes "this is what a founding engineer ships from zero to revenue", not just "this is what a portfolio project looks like".

### In scope (v2 plus the following)

- **v0.2 RBAC.** Custom tenant-defined roles, time-bound role grants, impersonation with mandatory audit trail, field-level masking on sensitive fields (rates, contact info).
- **Billing.** Stripe Checkout for paid plans, plan-gated feature flags, invoices visible in the operator UI, plan downgrade and cancellation flows.
- **Real notifications.** SES for transactional email, Twilio (or any SMS provider behind an interface) for worker notifications. Per-user preferences. Templated.
- **Audit log UI.** Make the existing `permission_audits` table queryable in the dashboard with filters and CSV export.
- **Bulk import and export.** CSV import for properties and workers, CSV/Parquet export of jobs over a date range.
- **PWA worker app.** Service worker, offline queue for `transition` actions, install prompt, background sync on reconnect, push notifications for new assignments.
- **AWS infrastructure as code.** Terraform (or CDK, pick one in T-901) for ECS Fargate, RDS Postgres, ElastiCache Redis, S3, SES, CloudWatch, ECR, VPC, ALB, ACM, Route 53.
- **CI/CD pipeline.** GitHub Actions with OIDC to AWS, build → push image to ECR → deploy to staging on `main`, deploy to prod on tagged release. Database migrations as an init container.
- **Observability stack.** OpenTelemetry to CloudWatch by default, Sentry for errors, PostHog for product analytics, status page powered by uptime checks against `/healthz` and `/readyz`.
- **Multi-environment.** Dev (local), staging (auto-deployed), prod (tagged-release-deployed). Separate AWS accounts via Organizations or at minimum separate VPCs.

### Out of scope (kept for v4)

- Native mobile apps (PWA is the answer for now).
- Multi-region active-active. Read replicas are in scope; cross-region failover is not.
- A separate analytics warehouse (Snowflake or BigQuery). v3 ships an analytics overview from the operational DB; warehouse export is a future concern.
- Customer-facing white-labeling beyond per-tenant brand color and logo.
- Marketplace, partner API, public docs site.

## Tech stack additions on top of v2

| Layer | Choice | Notes |
|---|---|---|
| Billing | Stripe (Node SDK v17+) | Checkout, customer portal, webhooks |
| Email provider | AWS SES | `@aws-sdk/client-ses` v3 |
| SMS provider | Twilio | Hidden behind `SmsProvider` interface so it can be swapped |
| Push notifications | Web Push (VAPID) | For PWA |
| Error tracking | Sentry (`@sentry/node`, `@sentry/nextjs`) | Latest |
| Product analytics | PostHog (`posthog-node`, `posthog-js`) | Self-hostable, free tier sufficient |
| Service worker / PWA | `@serwist/next` | App Router compatible |
| IaC | Terraform 1.9+ (default) or AWS CDK 2.x (alternative) | Pick in T-901 |
| Container registry | ECR | Provisioned by IaC |
| Compute | ECS Fargate | Two services: `api` and `worker` (BullMQ consumer) |
| Database | RDS Postgres 17 | Multi-AZ in prod, single-AZ in staging |
| Cache + queue | ElastiCache Redis 7 | Single-node in staging, replication group in prod |
| Object storage | S3 | Versioning + lifecycle rules |
| CDN | CloudFront | In front of S3 and Next.js static |
| Edge + DNS | Route 53 + ACM | Wildcard cert per environment |
| Secrets | AWS Secrets Manager | Pulled into ECS task env at start |
| Monitoring | CloudWatch + Container Insights | Logs, metrics, traces |
| Tracing | OTLP to CloudWatch via ADOT collector | Sidecar on each task |
| Status page | Statuspage.io or self-hosted Cachet | Updated by a small Lambda watching ALB health |

## Phases

Wave numbering picks up where v2 left off so a v2 project rolling forward to v3 can resume cleanly.

```
Wave 8  (4)   Custom roles  |  Time-bound grants  |  Impersonation  |  Field-level masking
Wave 9  (4)   Stripe setup  |  Plan-gated feature flags  |  Billing portal UI  |  Stripe webhook handler
Wave 10 (3)   SES provider + email templates  |  SMS provider + templates  |  Notification preferences UI
Wave 11 (3)   Audit log UI + export  |  Bulk import (properties, workers)  |  Bulk export (jobs)
Wave 12 (4)   PWA shell + service worker  |  Offline transition queue  |  Push notifications  |  Install prompt + onboarding
Wave 13 (5)   IaC tool choice + VPC/networking  |  RDS + ElastiCache + S3  |  ECS services + ALB  |  Secrets Manager + IAM roles  |  Route 53 + ACM + CloudFront
Wave 14 (4)   Sentry wiring (api + web)  |  PostHog wiring  |  Structured logs to CloudWatch  |  Status page wiring
Wave 15 (3)   Build + push image workflow  |  Deploy to staging on main  |  Deploy to prod on tag, with migrations
Wave 16 (2)   Disaster recovery runbook + restore drill  |  Load-test against staging
```

## Tasks

> v3 assumes v2's task IDs (T-101..T-603) are complete or are being completed in parallel. The orchestrator can interleave v2 and v3 waves where the dependency graph allows. For brevity, only v3-specific tasks are listed below.

### T-801 — Custom tenant-defined roles

Owner: backend-dev · Depends on: v2 T-107 · Effort: ~4h

Files: `apps/api/src/rbac/custom-roles/*`, `prisma/schema.prisma` (new `CustomRole`, `CustomRolePermission` tables).

Steps:
1. New `custom_roles` table per tenant. Permissions stored as a list of `(action, subject)` pairs.
2. `RoleGrant.role` now references either a system role name or a `custom_role:<uuid>` form.
3. Policy evaluator resolves custom roles before applying scope and policy checks.
4. UI in `/settings/team/roles` to manage custom roles (this gets its own small frontend task, slotted into Wave 5 as a v3 extension or here).
5. Tests for every interaction with the existing four built-in roles.

Acceptance: a tenant_admin can create a role `inspector` with read access to properties and read-only access to jobs, assign it to a user, and that user lands on a sensible default page.

---

### T-802 — Time-bound role grants

Owner: backend-dev · Depends on: T-801 · Effort: ~2h

Files: `apps/api/src/rbac/grants/*`, `prisma/schema.prisma` (the `expires_at` column is already present, used now).

Steps:
1. `RoleGrant` already has `expires_at`. Honor it in the resolver.
2. Add `POST /v1/team/grants` with optional `expiresAt`.
3. A cron job (BullMQ repeatable) sweeps for expired grants and writes a `permission_audits` row of type `grant.expired`.
4. UI badge "expires in Xh" on team rows when a grant is within 24h.

Acceptance: a grant with a 30s expiry stops authorizing after expiry, and an audit row records the expiration.

---

### T-803 — Impersonation

Owner: backend-dev · Depends on: T-801 · Effort: ~3h

Files: `apps/api/src/auth/impersonation/*`.

Steps:
1. `POST /v1/auth/impersonate` (super_admin or tenant_admin only) returns a short-lived token (max 30 min) representing the target user, with `impersonatedBy` claim.
2. Every audit row carries `impersonatedBy` when applicable.
3. The web app shows a red banner across the top while impersonating, with a `Stop impersonating` button.
4. Mandatory exit hook: hitting `/v1/auth/logout` while impersonating returns to the original session, not to login.

Acceptance: impersonation is fully audited and visible in the dashboard chrome.

---

### T-804 — Field-level masking

Owner: backend-dev · Depends on: T-107 · Effort: ~3h

Files: `apps/api/src/common/masking/*`.

Steps:
1. `@Masked('rate')` decorator on DTO fields. Masking interceptor strips or `***`s the value at serialization based on policy.
2. Policy: `rate` and `phone` masked from `worker` role; `phone` visible only to coordinators of the worker's scope.
3. GraphQL field-level masking via a directive.

Acceptance: worker fetching their own teammate's record sees `***-***-1234` for phone, while coordinator sees full.

---

### T-901 — IaC tool decision and VPC

Owner: backend-dev · Depends on: — · Effort: ~3h

Files: `infrastructure/README.md`, `infrastructure/terraform/*` (or `infrastructure/cdk/*`).

Steps:
1. Pick Terraform unless there's an explicit reason for CDK (the project already TypeScript-heavy, CDK would be ergonomic, but Terraform is more portable and reviewable). Default to Terraform.
2. State backend in S3 with DynamoDB lock. Module structure: `network`, `data`, `compute`, `edge`, `secrets`, `observability`.
3. VPC with 3 AZs, public + private subnets, NAT gateways (single in staging, per-AZ in prod for HA).

Acceptance: `terraform plan` succeeds against a fresh state and lists exactly the resources expected.

---

### T-902 — RDS + ElastiCache + S3 module

Owner: backend-dev · Depends on: T-901 · Effort: ~3h · Parallel-safe with T-903, T-904

Files: `infrastructure/terraform/modules/data/*`.

Steps: RDS Postgres 17, db.t4g.medium in staging, db.m6g.large + Multi-AZ in prod. ElastiCache Redis 7, single node staging, replication group in prod. S3 buckets for assets, exports, audit-archive, with versioning + lifecycle.

Acceptance: `terraform apply` in staging brings up the DB and Redis, both accessible from a bastion or via Session Manager port-forward.

---

### T-903 — ECS services + ALB

Owner: backend-dev · Depends on: T-901 · Effort: ~4h · Parallel-safe

Files: `infrastructure/terraform/modules/compute/*`, `docker/api.Dockerfile`, `docker/web.Dockerfile`.

Steps:
1. Two ECS services: `api` (NestJS) and `worker` (BullMQ consumer). Same image, different command.
2. A separate `web` service for the Next.js app, or rely on Vercel/Amplify if the team prefers — default to ECS for consistency.
3. ALB in front, target groups per service, health checks against `/healthz` (liveness) and `/readyz` (readiness, blocks on DB + Redis reachability).
4. Migrations run as a one-shot ECS task on each deploy before the API service is updated.

Acceptance: a manual `docker build` and `aws ecs update-service --force-new-deployment` rolls a new image to staging without dropping traffic.

---

### T-904 — Secrets Manager + IAM roles

Owner: backend-dev · Depends on: T-901 · Effort: ~2h · Parallel-safe

Files: `infrastructure/terraform/modules/secrets/*`.

Steps: secrets created in Secrets Manager, ECS task definitions reference them by ARN, IAM task roles narrowly scoped (RDS connect, ElastiCache, S3 specific buckets, SES SendEmail, SNS Publish if used). No `AdministratorAccess` anywhere.

Acceptance: an `aws iam simulate-principal-policy` for the api task role denies S3 access to any bucket outside the application's set.

---

### T-905 — Route 53 + ACM + CloudFront

Owner: backend-dev · Depends on: T-903 · Effort: ~2h · Parallel-safe

Files: `infrastructure/terraform/modules/edge/*`.

Steps: hosted zone per environment, ACM cert (us-east-1 for CloudFront, regional for ALB), CloudFront distribution pointed at the ALB plus an S3 origin for static assets.

Acceptance: HTTPS endpoint at `https://staging.crewmate.<your-domain>` returns the login page.

---

### T-1001 — SES email provider + templates

Owner: backend-dev · Depends on: v2 T-302, T-904 · Effort: ~3h

Files: `apps/api/src/notifications/email/*`, `apps/api/src/notifications/email/templates/*.mjml`.

Steps:
1. `EmailProvider` interface. SES implementation. MailHog implementation for dev. Pick at boot based on env.
2. Templates in MJML, compiled at build time. Templates: `worker.invited`, `job.assigned`, `webhook.delivery.failed.digest`.
3. Outbox events tagged `notify.email` are routed here.

Acceptance: in staging, inviting a worker delivers a real email to a test inbox.

---

### T-1002 — SMS provider (Twilio) + templates

Owner: backend-dev · Depends on: T-1001 · Effort: ~2h

Files: `apps/api/src/notifications/sms/*`.

Steps: `SmsProvider` interface with Twilio implementation. Concise templates. Same outbox-event routing pattern.

Acceptance: in staging, transitioning a job assigned to a worker with SMS-enabled preferences sends a text.

---

### T-1003 — Notification preferences UI

Owner: frontend-dev · Depends on: T-1001, T-1002 · Effort: ~2h

Files: `apps/web/src/app/(app)/settings/notifications/*`.

Steps: per-user UI to toggle email and SMS on each notification kind. Reasonable defaults preset.

Acceptance: changing a preference persists and is honored by the next notification.

---

### T-1101 — Audit log UI + export

Owner: frontend-dev · Depends on: v2 T-207 · Effort: ~3h

Files: `apps/web/src/app/(app)/settings/audit/*`.

Steps: searchable, filterable table backed by the `/v1/audit` endpoint. CSV export. Tenant_admin and super_admin only.

Acceptance: a known recent deny event is findable within three filter operations.

---

### T-1102 — Bulk import (properties, workers)

Owner: backend-dev · Depends on: v2 T-202, T-203 · Effort: ~3h

Files: `apps/api/src/imports/*`, `apps/web/src/app/(app)/imports/*`.

Steps: upload CSV → server validates row by row → returns a per-row pass/fail report → on confirm, performs the create in a transaction (or background job for large files). Streaming so 50k rows don't OOM.

Acceptance: a 10k-row property import completes; row 7,432 with a bad timezone fails with a precise message.

---

### T-1103 — Bulk export (jobs)

Owner: backend-dev · Depends on: v2 T-204 · Effort: ~2h

Files: `apps/api/src/exports/*`.

Steps: `POST /v1/exports/jobs` with a date range produces a signed S3 URL within a configurable TTL (5 min default). Stream rows from Postgres directly to S3 to avoid memory blowups.

Acceptance: a 12-month export job for a busy operator completes and the URL downloads a valid CSV.

---

### T-1201 — PWA shell and service worker

Owner: frontend-dev · Depends on: v2 T-404 · Effort: ~3h

Files: `apps/web/public/manifest.webmanifest`, `apps/web/public/sw-config.ts`, `apps/web/next.config.mjs` (extended via `@serwist/next`).

Steps: serwist setup. Precache the worker view route shell, static assets, and the most recent jobs payload. App-shell architecture so `/today` still renders offline (with stale data + offline indicator).

Acceptance: airplane mode → `/today` renders previously-cached jobs with an "Offline" banner.

---

### T-1202 — Offline transition queue

Owner: frontend-dev · Depends on: T-1201 · Effort: ~4h

Files: `apps/web/src/lib/offline-queue.ts`, `apps/web/src/sw/*`.

Steps:
1. IndexedDB-backed queue of pending `transition` actions.
2. Service worker `sync` event drains the queue on reconnect.
3. UI shows pending count on the action button ("Mark Arrived (pending)").
4. Conflict handling: if the server reports a stale state, queued action is dropped with a toast.

Acceptance: kill the wifi → tap Start, Arrive, Complete → restore wifi → all three land on the server in order, dispatch board shows the final state.

---

### T-1203 — Push notifications

Owner: backend-dev + frontend-dev · Depends on: T-1201 · Effort: ~3h

Files: `apps/api/src/notifications/push/*`, `apps/web/src/lib/push.ts`, `apps/web/src/sw/*` (extended).

Steps: VAPID keys in Secrets Manager. `POST /v1/push/subscriptions` registers a browser. Worker job sends pushes for `job.assigned` and `job.status.changed.urgent` (when an assigned job is in the next 30 minutes).

Acceptance: assigning a job while the worker's tab is closed delivers a push that wakes the worker view.

---

### T-1204 — Install prompt and worker onboarding

Owner: frontend-dev · Depends on: T-1201 · Effort: ~1.5h

Files: `apps/web/src/components/install-prompt.tsx`.

Steps: detect `beforeinstallprompt`, show a non-blocking banner on `/today` after a first session, dismissable.

Acceptance: on an Android Chrome session a real install prompt appears and installs to the home screen.

---

### T-1301 — Stripe setup and plans

Owner: backend-dev · Depends on: — · Effort: ~3h

Files: `apps/api/src/billing/*`, `prisma/schema.prisma` (new `Plan`, `Subscription`, `Invoice` tables).

Steps:
1. Stripe products and prices configured via Stripe CLI script committed to repo (`scripts/stripe/seed.ts`).
2. Plans: `starter` (10 workers, 100 jobs/mo), `growth` (50 workers, 1000 jobs/mo), `scale` (unlimited).
3. Operator on create defaults to a free trial of `growth` for 14 days.

Acceptance: `pnpm stripe:seed` produces the products in the Stripe test account; `Subscription` row exists for the seeded operator.

---

### T-1302 — Plan-gated feature flags

Owner: backend-dev · Depends on: T-1301 · Effort: ~2h

Files: `apps/api/src/billing/feature-flags.ts`, `packages/contracts/src/billing.ts`.

Steps: `requiresPlan('growth')` decorator on routes. Returns 402 Payment Required with a JSON pointer to the upgrade URL when blocked.

Acceptance: starter-plan operator hitting `POST /v1/imports/properties` gets 402 with a meaningful body.

---

### T-1303 — Billing portal UI

Owner: frontend-dev · Depends on: T-1301 · Effort: ~3h

Files: `apps/web/src/app/(app)/settings/billing/*`.

Steps: current plan card, upgrade buttons that call `POST /v1/billing/checkout-session`, list of past invoices, cancel link. Redirects to Stripe Customer Portal for card management.

Acceptance: upgrade flow round-trips via Stripe Checkout and updates the local `Subscription` row via webhook.

---

### T-1304 — Stripe webhook handler

Owner: backend-dev · Depends on: T-1301 · Effort: ~2h

Files: `apps/api/src/billing/webhooks/*`.

Steps: handler for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Verify signatures. Idempotent.

Acceptance: replaying the same webhook does not double-update; CLI `stripe trigger` for each event lands a correct local row.

---

### T-1401 — Sentry wiring (API + web)

Owner: backend-dev + frontend-dev · Depends on: — · Effort: ~1.5h

Files: `apps/api/src/observability/sentry.ts`, `apps/web/sentry.client.config.ts`, `apps/web/sentry.server.config.ts`.

Steps: DSN in env. Source maps uploaded on build via `@sentry/webpack-plugin`. Release tag = git sha.

Acceptance: a thrown error in staging shows up in Sentry within ~30s with a readable stack and a release attached.

---

### T-1402 — PostHog wiring

Owner: backend-dev + frontend-dev · Depends on: — · Effort: ~1.5h

Files: `apps/api/src/observability/posthog.ts`, `apps/web/src/lib/posthog.ts`.

Steps: server-side capture for `job.transition`, `webhook.delivered`, `subscription.changed`. Client-side for page views and key UI events. User identification via the JWT's `userId`, with `operatorId` as a group.

Acceptance: events visible in PostHog within a session, segmented by operator.

---

### T-1403 — Structured logs to CloudWatch

Owner: backend-dev · Depends on: T-903 · Effort: ~1h

Files: `apps/api/src/observability/logger.ts` (extended).

Steps: pino JSON output, ECS log driver `awslogs`, single log group per service, retention 30 days in staging, 90 in prod. Log streams keyed by task ARN. Correlation id header `x-request-id` propagated.

Acceptance: a single request can be filtered across api and worker logs by `x-request-id` in CloudWatch Logs Insights.

---

### T-1404 — Status page

Owner: backend-dev · Depends on: T-903, T-1403 · Effort: ~2h

Files: `infrastructure/terraform/modules/observability/status-page/*`.

Steps: scheduled Lambda (or EventBridge → ECS task) probes `/readyz` on each environment. Updates a Cachet self-hosted status page, or pushes to Statuspage.io API. Public URL.

Acceptance: a deliberate failure of the readiness probe is reflected on the status page within 2 minutes.

---

### T-1501 — Build and push image workflow

Owner: generalist · Depends on: T-903 · Effort: ~2h

Files: `.github/workflows/deploy.yml`.

Steps:
1. OIDC trust between GitHub Actions and the AWS account. No long-lived keys.
2. On every push to `main`: build api + web images, tag with `:sha-XXXXXXX` and `:staging`, push to ECR.
3. Run migrations as a one-shot ECS task. Rolling update of api, worker, web services.
4. Smoke test against the staging URL after rollout (curl `/healthz`, log in, transition a seeded job).

Acceptance: pushing a no-op commit to `main` triggers a clean staging deploy in under 12 minutes including smoke.

---

### T-1502 — Production deploy on tag

Owner: generalist · Depends on: T-1501 · Effort: ~1h

Files: `.github/workflows/deploy.yml` (extended).

Steps: on a `v*.*.*` tag, repeat the staging flow against prod, with an additional manual approval gate via GitHub environments.

Acceptance: cutting `v0.1.0` after a green staging deploys to prod after one click.

---

### T-1601 — Disaster recovery runbook and restore drill

Owner: backend-dev · Depends on: T-902, T-1502 · Effort: ~2h

Files: `docs/runbooks/DR.md`.

Steps: documented and exercised plan for the four most likely incidents — RDS down, ECS service crash loop, Redis eviction storm, webhook backlog blowup. The drill is to restore staging from an RDS snapshot and time the result.

Acceptance: full restore from snapshot to a warm service in under 30 minutes; runbook updated with actual numbers.

---

### T-1602 — Load test against staging

Owner: perf-tester · Depends on: T-1501 · Effort: ~2h

Files: `apps/api/test/load/*`, `docs/PERF-NOTES.md` (extended).

Steps: k6 (or artillery) load test that walks 100 concurrent users through the worker happy path, plus 10 admins on the dispatch board with subscriptions open. Run for 15 minutes against staging.

Acceptance: API p95 latency under 250ms, no error rate spikes, no worker queue backlog growth.

## Definition of done for v3

```bash
# Local
git clean -fdX
pnpm install
docker compose up -d
pnpm prisma migrate reset --force
pnpm --filter @crewmate/api db:seed
pnpm dev
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @crewmate/api test:e2e
pnpm --filter @crewmate/api test:perf

# Staging
git push origin main          # triggers deploy.yml
# Wait for the workflow → smoke job passes

# Production
git tag v0.1.0 && git push --tags
# Approve the gate in the GitHub UI
# Wait for the workflow → smoke job passes
```

Then in browsers:

1. Log in to staging as super_admin → impersonate a tenant_admin → red impersonation banner visible across the chrome.
2. Create a custom role `inspector`, assign to a user, log in as that user → access scoped correctly.
3. Trigger a billing upgrade → Stripe Checkout completes → dashboard reflects the new plan.
4. Open the worker PWA on a phone, install it, kill wifi, tap through Start → Arrive → Complete on a job, restore wifi → all three sync.
5. Inspect Sentry for the dummy error you intentionally threw, PostHog for the events you fired, CloudWatch Logs Insights for the matching request id, and the status page for green checks.
6. Run the load test against staging, watch the p95 stay under 250ms.

If all six pass, v3 is shipped.

## Risk callouts

- **AWS budget.** v3 stands up real infra. Set a billing alarm at $50/month for staging and $200/month for prod before T-902 runs. The agent will not provision paid resources without that alarm in place.
- **Stripe live keys.** The plan uses test keys throughout. Switching to live keys is a deliberate human action, gated behind a separate task `T-1305-live-keys` that is intentionally not in this plan.
- **Twilio cost.** SMS is per-message billable. Keep the staging environment on a small allowlist of test numbers.
- **DNS propagation.** T-905 includes ACM validation via DNS records. If the domain is registered outside Route 53, expect a 15-30 minute propagation delay that will block the wave 13 completion.
