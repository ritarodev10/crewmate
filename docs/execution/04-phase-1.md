# 04 — Phase 1: Foundation and skeleton deploy

**Goal.** A working monorepo locally AND a deployed empty shell at `https://crewmate.ritaro.dev`. Both apps boot to placeholder pages, the schema is migrated, the local infra is up, the CI workflow is green, AWS and Cloudflare infrastructure is provisioned via Terraform plus Wrangler, two deploy workflows are wired, and the first production deploy serves the placeholder pages over HTTPS.

**Gate condition.** Run `pnpm dev` locally; both `:3000` and `:3001` reachable. CI green on a dummy PR. `https://crewmate.ritaro.dev` returns the placeholder page. `curl https://crewmate.ritaro.dev/api/healthz` returns 200. `curl <alb-direct-url>/healthz` without the shared secret returns 401.

**Concurrency cap.** 3 to 4 agents. Many tasks share root configs or have ordering constraints.

**Estimated wall-clock.** ~10h at cap.

---

## Wave 1.0 — Foundation tasks

**Tool:** `/goal` per task
**Concurrency:** 2 to 3 agents (root config tasks are serial-leaning)

Run tasks 1.0a through 1.0c in order. Tasks 1.0d, 1.0e, 1.0f can run in parallel after bootstrap. Task 1.0g runs after 1.0a, 1.0b, and the migration land.

### Task 1.0a — pnpm workspace + root configs

```
/goal
Bootstrap the pnpm monorepo. Done when:
- pnpm install resolves without errors
- package.json, pnpm-workspace.yaml, tsconfig.base.json, .editorconfig, .eslintrc, .prettierrc exist at repo root
- pnpm lint exits 0 on an empty workspace
- pnpm typecheck exits 0 on an empty workspace
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-foundation-pnpm-workspace

Read: docs/guardrails/shared/00-architecture.md, docs/guardrails/shared/01-conventions.md
Files in scope: repo root config files only. Do not touch apps/ or packages/ content yet.
— or stop after 20 turns
```

### Task 1.0b — docker-compose

```
/goal
Add docker-compose.yml with postgres 17, redis 7, mailhog services.
Done when:
- docker compose up -d exits 0
- docker compose ps shows all three services healthy
- .env.example documents all connection strings
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-docker-compose

Files in scope: docker-compose.yml, .env.example
— or stop after 20 turns
```

### Task 1.0c — Prisma schema migration

```
/goal
Apply the Prisma schema. Done when:
- prisma/schema.prisma defines all entities in docs/FEATURES.md section 12
- pnpm prisma migrate dev exits 0 against the local postgres from task 1.0b
- pnpm prisma generate exits 0
- prisma/seed.ts creates the seed dataset described in docs/BUILD.md layer 2
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-001-prisma-schema

Read: docs/guardrails/backend/01-data.md, prisma/schema.prisma (existing)
Files in scope: prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
— or stop after 20 turns
```

### Task 1.0d — NestJS api skeleton (parallel with 1.0e and 1.0f)

```
/goal
Scaffold apps/api. Done when:
- pnpm --filter @crewmate/api dev starts without errors on :3000
- GET /healthz returns 200
- pnpm --filter @crewmate/api lint exits 0
- pnpm --filter @crewmate/api typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-123-api-skeleton

Read: docs/guardrails/backend/00-nestjs.md
Files in scope: apps/api/src/ skeleton only — AppModule, HealthController, main.ts
Do not implement any feature modules yet.
— or stop after 20 turns
```

### Task 1.0e — Next.js web skeleton (parallel with 1.0d and 1.0f)

```
/goal
Scaffold apps/web. Done when:
- pnpm --filter @crewmate/web dev starts without errors on :3001
- / returns a placeholder page (no 404, no crash)
- pnpm --filter @crewmate/web lint exits 0
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-web-skeleton

Read: docs/guardrails/frontend/00-overview.md
Files in scope: apps/web/ skeleton — layout.tsx, page.tsx, tailwind config, next.config.ts
Do not implement any routes or components yet.
— or stop after 20 turns
```

### Task 1.0f — Shared packages (parallel with 1.0d and 1.0e)

```
/goal
Create placeholder exports for @crewmate/contracts and @crewmate/ui. Done when:
- packages/contracts/src/index.ts exports at least one type (stub is fine)
- packages/ui/src/index.ts exports at least one component (stub is fine)
- pnpm --filter @crewmate/contracts build exits 0
- pnpm --filter @crewmate/ui build exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-shared-packages

Files in scope: packages/contracts/src/, packages/ui/src/
— or stop after 20 turns
```

### Task 1.0g — CI workflow (after 1.0a, 1.0b land)

```
/goal
Add .github/workflows/ci.yml. Done when:
- The workflow runs pnpm lint, pnpm typecheck, pnpm test on every PR
- It spins up postgres and redis as service containers
- On a no-op dummy PR the workflow goes green
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-132-ci

Files in scope: .github/workflows/ci.yml only
— or stop after 20 turns
```

**Acceptance.** `pnpm install && pnpm dev` bring up both ports. `pnpm lint && pnpm typecheck` exit 0. CI green on a dummy PR.

---

## Wave 1.1 — Terraform network module

**Tool:** `/goal`
**Concurrency:** 1 (blocks 1.1b)

```
/goal
Write infrastructure/terraform/network/. Done when:
- VPC with public and private subnets across 3 AZs defined
- NAT gateway (single) defined
- Security groups defined including the Cloudflare IP allowlist rule on the ALB SG
- terraform validate exits 0 in the network module directory
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-121-terraform-network

Read: docs/BUILD.md layer 12, docs/guardrails/shared/03-security.md
Files in scope: infrastructure/terraform/network/ only
— or stop after 20 turns
```

---

## Wave 1.1b — Terraform data + secrets modules

**Tool:** `/goal` per task
**Concurrency:** 2 (parallel after 1.1 lands)

```
/goal
Write infrastructure/terraform/data/ and infrastructure/terraform/secrets/. Done when:
- RDS Postgres 17 single-AZ, ElastiCache Redis 7 single node, S3 buckets defined in data/
- Secrets Manager entries and IAM task roles defined in secrets/
- Both modules reference the VPC outputs from the network module
- terraform validate exits 0 in both module directories
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-121-terraform-data-secrets

Read: docs/BUILD.md layer 12
Files in scope: infrastructure/terraform/data/, infrastructure/terraform/secrets/
— or stop after 20 turns
```

---

## Wave 1.2 — Compute, Cloudflare config, Dockerfile

**Tool:** `/goal` per task
**Concurrency:** 3 (parallel after 1.1b lands)

### Task 1.2a — Terraform compute module

```
/goal
Write infrastructure/terraform/compute/. Done when:
- ECS cluster, api service, worker service, task definitions, ALB defined
- ALB security group ingress restricted to Cloudflare IP ranges (from network module SG)
- No ACM certificate for a custom api subdomain
- terraform validate exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-121-terraform-compute

Files in scope: infrastructure/terraform/compute/ only
— or stop after 20 turns
```

### Task 1.2b — Wrangler config and Worker proxy handler (parallel with 1.2a)

```
/goal
Write apps/web/wrangler.toml and apps/web/src/worker/proxy.ts. Done when:
- wrangler.toml binds the Worker to crewmate.ritaro.dev
- proxy.ts forwards /api/*, /v1/*, /graphql, /ws to BACKEND_ORIGIN with x-cloudflare-secret header
- WebSocket upgrades on /ws are forwarded via Upgrade: websocket
- pnpm --filter @crewmate/web typecheck exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-120-wrangler-proxy

Read: docs/BUILD.md layer 12
Files in scope: apps/web/wrangler.toml, apps/web/src/worker/proxy.ts
— or stop after 20 turns
```

### Task 1.2c — Dockerfile and Cloudflare secret guard (parallel with 1.2a and 1.2b)

```
/goal
Write docker/api.Dockerfile and the global NestJS guard for x-cloudflare-secret. Done when:
- Dockerfile builds the api image with pnpm --filter @crewmate/api build
- A CloudflareSecretGuard is applied globally and rejects requests missing the header
- Health endpoints /healthz and /readyz bypass the guard
- docker build -f docker/api.Dockerfile . exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-120-dockerfile-guard

Read: docs/BUILD.md layer 12, docs/FEATURES.md F-120, F-123
Files in scope: docker/api.Dockerfile, apps/api/src/common/guards/cloudflare-secret.guard.ts
— or stop after 20 turns
```

---

## Wave 1.3 — GitHub Actions deploy workflows

**Tool:** `/goal` per task
**Concurrency:** 2 (parallel after 1.2 lands)

### Task 1.3a — deploy-api.yml

```
/goal
Write .github/workflows/deploy-api.yml. Done when:
- Workflow uses OIDC trust to AWS (no long-lived keys)
- Steps: build api image → tag :sha-XXXXXXX and :latest → push to ECR →
  run prisma migrate deploy as one-shot ECS task → rolling update api and worker services
- Workflow is gated by the prod GitHub environment manual approval
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-122-deploy-api

Read: docs/BUILD.md layer 12, docs/FEATURES.md F-122
Files in scope: .github/workflows/deploy-api.yml only
— or stop after 20 turns
```

### Task 1.3b — deploy-web.yml (parallel with 1.3a)

```
/goal
Write .github/workflows/deploy-web.yml. Done when:
- Workflow builds the Next.js Worker bundle via @opennextjs/cloudflare adapter
- The proxy handler at apps/web/src/worker/proxy.ts is included in the bundle
- wrangler deploy runs with a Cloudflare API token from a GitHub secret
- Workflow is gated by the prod GitHub environment manual approval
- code-reviewer subagent returns no blocking issues
- change is committed to task/p1-F-122-deploy-web

Read: docs/BUILD.md layer 12, docs/FEATURES.md F-122
Files in scope: .github/workflows/deploy-web.yml only
— or stop after 20 turns
```

---

## Wave 1.4 — First production deploy

**Tool:** Manual. Do not use Goal or Workflow for this step.
**Concurrency:** 1 (final serial step)

Execute manually and verify each step.

```bash
# Apply AWS infrastructure
cd infrastructure/terraform
terraform init
terraform plan -out=tfplan
# Review plan. Confirm no destructive actions on existing resources.
terraform apply tfplan

# Set Wrangler secrets
cd apps/web
wrangler secret put BACKEND_ORIGIN
wrangler secret put CLOUDFLARE_SHARED_SECRET

# Push to main (triggers both deploy workflows)
git push origin main

# After manual approval in GitHub → prod environment:
# 1. Confirm https://crewmate.ritaro.dev returns the placeholder page
# 2. Confirm https://crewmate.ritaro.dev/api/healthz returns 200
# 3. Confirm direct request to the ALB URL without x-cloudflare-secret returns 401
```

---

## Phase 1 gate

Run `pnpm dev` locally; both `:3000` and `:3001` reachable. CI green on a dummy PR. Visit `https://crewmate.ritaro.dev`; the placeholder page loads. `curl https://crewmate.ritaro.dev/api/healthz` returns 200. `curl <alb-direct-url>/healthz` without the shared secret returns 401.

**`PHASE_1_GATE`** — after this condition appears, stop, verify the above, then start phase 2 by running the first `/goal` from `05-phase-2.md` or `03-goal-commands.md`.

Run `/compact` before starting phase 2.
