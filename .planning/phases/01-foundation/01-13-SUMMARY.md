---
phase: "01-foundation"
plan: "13"
subsystem: "ci-cd"
tags: [github-actions, ci, cd, oidc, cloudflare-workers, ecs, ecr]
dependency_graph:
  requires: ["01-11", "01-12"]
  provides: ["ci-workflow", "deploy-api-workflow", "deploy-web-workflow"]
  affects: ["phase-1-gate"]
tech_stack:
  added: []
  patterns:
    - "GitHub OIDC for AWS auth (no stored long-lived keys)"
    - "workflow_run trigger for deploy gating on CI success"
    - "environment: prod manual approval gate"
    - "non-interactive prisma migrate deploy via ECS run-task"
key_files:
  created:
    - .github/workflows/deploy-api.yml
    - .github/workflows/deploy-web.yml
  modified:
    - .github/workflows/ci.yml
decisions:
  - "pnpm 10.15.0 and Node 22 locked in all workflow jobs (matches packageManager field in package.json)"
  - "Prisma migrate uses deploy (non-interactive) not dev (interactive/would hang in CI)"
  - "wrangler deploy invoked via pnpm exec to use project's pinned wrangler version"
  - "ECS_PRIVATE_SUBNET_ID used as secret name (plan action section used this name; more descriptive than ECS_SUBNET_ID)"
metrics:
  duration: "108s"
  completed_date: "2026-06-04"
  tasks_completed: 2
  files_changed: 3
---

# Phase 1 Plan 13: GitHub Actions CI + Deploy Workflows Summary

Three GitHub Actions workflows for CI and production deployment: lint/typecheck/test/e2e CI on every PR/push, OIDC-authenticated ECS rolling deploy for the API, and wrangler-based Cloudflare Workers deploy for the web.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 13-T1 | CI workflow | 1ca33b7 | .github/workflows/ci.yml |
| 13-T2 | Deploy workflows | ab90512 | .github/workflows/deploy-api.yml, .github/workflows/deploy-web.yml |

## What Was Built

### ci.yml

Replaced the scaffold ci.yml (Node 20, pnpm 9, postgres 16, single quality+e2e+build structure) with the plan-specified 4-job layout:

- **lint** job: pnpm lint on ubuntu-latest
- **typecheck** job: pnpm typecheck on ubuntu-latest
- **test** job: pnpm test with postgres:17-alpine + redis:7-alpine service containers and full env vars
- **e2e** job: pnpm test:e2e with same containers and pnpm --filter @crewmate/api db:migrate:deploy (non-interactive, CI-safe)

All env var values validated >= 32 characters for Zod validation:
- ci-test-access-secret-at-least-32-characters = 42 chars
- ci-test-refresh-secret-at-least-32-chars-ok = 43 chars
- ci-test-webhook-signing-secret-min-32ch = 40 chars
- ci-test-cloudflare-secret-min-32-chars = 39 chars

Triggers on push and pull_request to main and task/* branches.

### deploy-api.yml

OIDC-only AWS auth deploy workflow:

1. Checkout
2. Configure AWS credentials via aws-actions/configure-aws-credentials@v4 using AWS_DEPLOY_ROLE_ARN (OIDC, no stored keys)
3. ECR login via aws-actions/amazon-ecr-login@v2
4. Docker build from docker/api.Dockerfile, tags :sha-{sha} and :latest, pushes both
5. Prisma migrate deploy as one-shot ECS task (overrides command to npx prisma migrate deploy)
6. Rolling update crewmate-api and crewmate-worker services
7. aws ecs wait services-stable for both services
8. Smoke test: curl -f on /api/healthz and /api/readyz

Gated by environment: prod (requires manual approval in GitHub settings). Triggers only when CI workflow succeeds on main via workflow_run.

### deploy-web.yml

Cloudflare Workers deploy workflow:

1. Checkout + pnpm 10.15.0 + Node 22
2. pnpm install --frozen-lockfile
3. Next.js build: pnpm --filter @crewmate/web build
4. OpenNext bundle: pnpm --filter @crewmate/web exec opennextjs-cloudflare build
5. Wrangler deploy: pnpm --filter @crewmate/web exec wrangler deploy with CLOUDFLARE_API_TOKEN secret
6. Smoke test: curl -f on root and /api/healthz

Same environment: prod gate and workflow_run trigger as deploy-api.

## GitHub Secrets Required

These secrets must be set in GitHub repository settings before deploy workflows can run:

| Secret | Source | Used By |
|--------|--------|---------|
| AWS_DEPLOY_ROLE_ARN | github_actions_role_arn from Terraform secrets module output | deploy-api.yml |
| ECR_REPO_URL | ecr_repo_url from Terraform compute module output | deploy-api.yml (ECR_REGISTRY) |
| ECS_PRIVATE_SUBNET_ID | Private subnet ID from Terraform network module output | deploy-api.yml (prisma migrate step) |
| ECS_SG_ID | ecs_sg_id from Terraform network module output | deploy-api.yml (prisma migrate step) |
| CLOUDFLARE_API_TOKEN | Scoped Cloudflare token (Workers:Edit), NOT a Global API Key | deploy-web.yml |

## Deviations from Plan

None. Plan executed exactly as written.

One naming clarification: the plan interface section listed ECS_SUBNET_ID but the detailed action section used ECS_PRIVATE_SUBNET_ID. Used ECS_PRIVATE_SUBNET_ID as the more descriptive name matching the action section.

## Known Stubs

None. These workflows are infrastructure-as-code that will not execute until:
1. GitHub secrets listed above are configured
2. Terraform-provisioned AWS resources exist (plan 01-14)
3. Cloudflare prod environment approval is configured in GitHub settings

## Self-Check: PASSED

- .github/workflows/ci.yml: FOUND
- .github/workflows/deploy-api.yml: FOUND
- .github/workflows/deploy-web.yml: FOUND
- Commit 1ca33b7: FOUND (ci.yml)
- Commit ab90512: FOUND (deploy-api.yml + deploy-web.yml)
- All 3 YAML files validated as valid YAML (Ruby yaml module)
