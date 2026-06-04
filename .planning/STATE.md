---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
status: unknown
last_updated: "2026-06-04T09:25:43.708Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
---

# CrewMate — Project State

**Last updated:** 2026-06-04T09:24:33Z
**Current phase:** 01
**Phase status:** In Progress — stopped at T2 (human cost review checkpoint)
**Active plan:** 01-14 T1a+T1b complete; awaiting human approval for terraform apply
**Session:** 2026-06-04

---

## Phase Progress

| Phase | Status | Plans | Started | Completed |
|-------|--------|-------|---------|-----------|
| 1 — Foundation | In Progress | 5/5 IaC written; awaiting apply | 2026-06-04 | — |
| 2 — UI Screens | Not Started | — | — | — |
| 3 — Backend API | Not Started | — | — | — |
| 4 — Integration | Not Started | — | — | — |
| 5 — Polish | Not Started | — | — | — |

---

## Current Focus

**Phase 1: Foundation**

Goal: Monorepo scaffold + skeleton deploy to crewmate.ritaro.dev live

Requirements in scope: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06

Next action: Human reviews terraform plan (T2), acknowledges ~$82/mo cost, types "apply approved" to trigger T3

---

## Accumulated Context

### Key Decisions

- Plan 01-10 complete: Used separate @typescript-eslint/parser + plugin packages (not unified typescript-eslint) for api ESLint flat config
- Plan 01-10 complete: next.config.ts uses export default (Next.js framework requirement; CLAUDE.md carve-out)
- Plan 01-10 complete: seed.ts schema fields corrected to match prisma/schema.prisma (no role on User, WebhookEndpoint uses secret/isActive/events)
- Plan 01-11 complete: VERSION_NEUTRAL on HealthController keeps /healthz and /readyz at bare paths (not /v1/) when URI versioning defaultVersion is active
- Plan 01-11 complete: .npmrc public-hoist-pattern for @prisma/* required in pnpm monorepo for prisma generate when schema is at workspace root
- Plan 01-11 complete: req.path is /healthz (not /v1/healthz) — confirmed via e2e; CloudflareSecretGuard BYPASS_PATHS works correctly
- Plan 01-12 complete: Local cloudflare-env.d.ts for Worker globals instead of @cloudflare/workers-types to avoid new package dependency (per CLAUDE.md no-new-packages rule)
- Plan 01-12 complete: Worker proxy strips /api prefix before forwarding to BACKEND_ORIGIN (/api/healthz → /healthz); NestJS serves routes without /api prefix
- Plan 01-13 complete: pnpm 10.15.0 and Node 22 locked in all workflow jobs (matches packageManager field in package.json)
- Plan 01-13 complete: Prisma migrate uses deploy (non-interactive) not dev (interactive/would hang in CI)
- Plan 01-13 complete: wrangler deploy invoked via pnpm exec to use project's pinned wrangler version
- Plan 01-13 complete: ECS_PRIVATE_SUBNET_ID used as secret name (more descriptive than ECS_SUBNET_ID)
- Plan 01-14 T1a+T1b complete: Root random_password.db_password breaks circular dependency between data and secrets modules (data needs password for aws_db_instance; secrets needs it for postgresql:// URL)
- Plan 01-14 T1a+T1b complete: ALB is internet-facing (internal=false); security enforced by Cloudflare IP allowlist SG (15 CIDR ranges, for_each) + x-cloudflare-secret header guard
- Build order is UI-first: Phase 2 renders all screens against fixtures before Phase 3 builds the backend. Visual design is signed off before API shapes are committed.
- Single-domain deploy: `https://crewmate.ritaro.dev` — Cloudflare Worker serves Next.js and proxies `/api/*`, `/v1/*`, `/graphql`, `/ws` to AWS ECS Fargate behind a private ALB.
- Deployment is in Phase 1, not at the end. Every gate from Phase 2 onward is a click-through on the live URL.

### Blockers

(none)

### Todos

(none)

---

## Handoff

Plan 01-14 T1a+T1b: All 4 Terraform modules written and validated. Commits: 1105712 (T1a — root config + network module), 6b57508 (T1b — data + secrets + compute modules; terraform validate exits 0).

terraform plan summary: 97 resources to add, 0 to change, 0 to destroy.

STOPPED at T2 checkpoint — human must review the plan and acknowledge ~$82/mo AWS cost.

To continue:
1. cd infrastructure/terraform
2. AWS_PROFILE=crewmate terraform plan -out=tfplan
3. Review output — confirm ALB internal=false, github_actions trust = repo:ritarodev10/crewmate:*, RDS engine_version=17, no hardcoded secrets
4. Type "apply approved" to proceed to T3 (terraform apply + Wrangler secrets + first deploy)
