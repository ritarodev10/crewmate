---
phase: "01-foundation"
plan: "14"
subsystem: infrastructure
tags: [terraform, aws, ecs, rds, elasticache, alb, ecr, iam, oidc, cloudwatch]
dependency_graph:
  requires:
    - "01-13"   # GitHub Actions workflows must exist before apply
  provides:
    - INFRA-01  # ALB + shared secret guard enforcement (infrastructure side)
    - INFRA-02  # Terraform IaC: all 4 modules
    - INFRA-03  # Cloudflare Worker target (ALB DNS)
    - INFRA-04  # ECR repo + ECS api service for deploy-api.yml
    - INFRA-05  # ECR repo target for deploy-web.yml
    - INFRA-06  # ECS task definitions with /readyz health check
  affects:
    - Phase 5   # S3 backend migration and remote state
tech_stack:
  added:
    - terraform >= 1.5 (hashicorp/tap/terraform 1.15.5 installed via brew)
    - hashicorp/aws ~> 5.100.0 (provider pinned in .terraform.lock.hcl)
    - hashicorp/random ~> 3.9.0 (for random_password + random_id)
  patterns:
    - Root-level random_password breaks circular dependency between data and secrets modules
    - for_each over Cloudflare CIDR list generates per-CIDR security group rules (avoids inline block limit)
    - internet-facing ALB with Cloudflare IP allowlist + NestJS x-cloudflare-secret guard = defense in depth
key_files:
  created:
    - infrastructure/terraform/backend.tf
    - infrastructure/terraform/main.tf
    - infrastructure/terraform/variables.tf
    - infrastructure/terraform/outputs.tf
    - infrastructure/terraform/network/main.tf
    - infrastructure/terraform/network/variables.tf
    - infrastructure/terraform/network/outputs.tf
    - infrastructure/terraform/data/main.tf
    - infrastructure/terraform/data/variables.tf
    - infrastructure/terraform/data/outputs.tf
    - infrastructure/terraform/secrets/main.tf
    - infrastructure/terraform/secrets/variables.tf
    - infrastructure/terraform/secrets/outputs.tf
    - infrastructure/terraform/compute/main.tf
    - infrastructure/terraform/compute/variables.tf
    - infrastructure/terraform/compute/outputs.tf
    - infrastructure/terraform/.terraform.lock.hcl
  modified:
    - .gitignore (added terraform state and .terraform/ entries)
decisions:
  - "Root-level random_password.db_password avoids circular dependency: data module needs password for aws_db_instance, secrets module needs it for postgresql:// URL in Secrets Manager"
  - "ALB is internet-facing (internal=false) — Cloudflare Worker calls it from outside AWS; security is enforced by ALB SG (Cloudflare IP allowlist) + CloudflareSecretGuard (shared secret header)"
  - "for_each over Cloudflare CIDR list for SG rules — cleaner than inline ingress blocks, avoids the 60-rule limit on inline rules"
  - "ecs_task_execution_role separate from ecs_task_role — execution role pulls secrets+logs at startup; task role is runtime app permissions (S3 only)"
  - "Terraform installed via hashicorp/tap brew tap — not pre-installed on this machine"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 17
  files_modified: 1
---

# Phase 1 Plan 14: Terraform Infrastructure Modules Summary

All 4 Terraform modules written, formatted, and validated. `terraform validate` exits 0. `terraform plan` shows 97 resources to add with no errors. The plan is ready for human cost review before `terraform apply`.

## What Was Built

VPC-to-ECS infrastructure-as-code for the CrewMate production environment using 4 Terraform modules wired by a root configuration.

**Root config (`infrastructure/terraform/`):**
- `backend.tf`: local state for Phase 1; remote S3 backend documented as comment for Phase 5 migration
- `main.tf`: AWS + random providers pinned, all 4 modules wired, root `random_password.db_password` to break circular dependency
- `variables.tf`: `aws_region` (default: us-east-1), `environment` (default: prod)
- `outputs.tf`: exposes alb_dns_name, ecr_repo_url, cluster/service names, github_actions_role_arn, ecs_sg_id, private_subnet_ids

**network module:**
- VPC 10.0.0.0/16, DNS enabled
- 2 public subnets (10.0.1.0/24, 10.0.2.0/24 in us-east-1a/b) + 2 private subnets (10.0.10.0/24, 10.0.11.0/24)
- Single NAT gateway in first public subnet (cost-optimized)
- ALB SG: ingress 80+443 from 15 Cloudflare IPv4 CIDRs via `for_each` (no inline rule limit)
- ECS SG: ingress 3000 from ALB SG; RDS SG: ingress 5432 from ECS SG; Redis SG: ingress 6379 from ECS SG

**data module:**
- RDS Postgres 17, db.t4g.micro, 20 GB gp3, 7-day backup, single-AZ, no public access
- ElastiCache Redis 7, cache.t4g.micro, single node
- S3 crewmate-assets-{account_id} and crewmate-audit-archive-{account_id}, versioning disabled, all public access blocked

**secrets module:**
- 6 Secrets Manager secrets: db_url, redis_url, jwt_access_secret, jwt_refresh_secret, webhook_signing_secret, cloudflare_shared_secret
- All secrets populated with random values (random_password or random_id — no hardcoded values anywhere)
- ECS execution role: AmazonECSTaskExecutionRolePolicy + AmazonSSMReadOnlyAccess + secretsmanager:GetSecretValue on `crewmate/*`
- ECS task role: S3 PutObject/GetObject on assets bucket
- GitHub OIDC provider + crewmate_github_actions role (trust: `repo:ritarodev10/crewmate:*`; perms: ECR push + ECS update + GetSecretValue on `crewmate/*`)

**compute module:**
- ECR crewmate-api, MUTABLE tags, lifecycle: expire untagged after 1 day, keep last 10 sha-* tagged
- CloudWatch log groups /crewmate/api and /crewmate/worker (14-day retention)
- ALB crewmate-alb: internet-facing, HTTP:80 only (Cloudflare terminates TLS at edge)
- Target group: /readyz healthcheck, healthy threshold 2, unhealthy 3, interval 30s, timeout 5s
- ECS cluster crewmate, Fargate capacity provider
- api task definition: 256 CPU/512MB, node dist/main.js, all 6 secrets injected as env vars
- worker task definition: 256 CPU/512MB, node dist/worker.js, same secrets
- api service: desired 1, private subnets, attached to ALB
- worker service: desired 1, private subnets, no ALB (processes queue jobs)

## Verification

```
terraform validate: Success! The configuration is valid.
terraform plan: Plan: 97 to add, 0 to change, 0 to destroy.
```

All 16 Terraform files exist (4 modules × 3 files + 4 root files). `.terraform.lock.hcl` committed (pins provider versions).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Circular dependency between data and secrets modules**
- **Found during:** T1b — writing secrets/main.tf
- **Issue:** The data module needs `random_password.result` to set the RDS master password (`aws_db_instance.password`). The secrets module needs the same password to construct the `postgresql://...` DATABASE_URL string. Putting the password in either module creates a circular input-output dependency.
- **Fix:** Generated `random_password.db_password` at root scope in `main.tf`. Both the data module (receives it as `var.db_password`) and the secrets module (same) consume it as a variable. No circular dependency.
- **Files modified:** `infrastructure/terraform/main.tf`, `infrastructure/terraform/data/variables.tf`, `infrastructure/terraform/data/main.tf`, `infrastructure/terraform/secrets/variables.tf`, `infrastructure/terraform/secrets/main.tf`
- **Commit:** 6b57508

**2. [Rule 3 - Blocking] Terraform not installed on machine**
- **Found during:** T1b verification step
- **Issue:** `terraform` binary not found in PATH. The plan requires `terraform init && terraform validate` to pass before stopping.
- **Fix:** Installed via `brew tap hashicorp/tap && brew install hashicorp/tap/terraform` (version 1.15.5 installed to `/opt/homebrew/bin/terraform`). This is a local tooling install, not a cloud resource — no cost, no approval needed.
- **Files modified:** None (system install)

## Pre-apply Checklist (for human review at T2 checkpoint)

Before running `terraform apply`, verify:

- [ ] ALB is `internal = false` (required for Cloudflare Worker → AWS routing)
- [ ] GitHub OIDC trust limits to `repo:ritarodev10/crewmate:*`
- [ ] RDS `skip_final_snapshot = true` is acceptable (portfolio project, no final snapshot cost)
- [ ] All resource names use `crewmate_` prefix or `crewmate-` hyphenated form
- [ ] No hardcoded passwords or secrets in any `.tf` file (verified: all use `random_password` or `random_id`)
- [ ] `terraform.tfstate` is gitignored (verified)
- [ ] `.terraform.lock.hcl` IS committed (verified — pins provider versions)

## Monthly Cost Estimate (from plan)

| Resource | Approximate monthly cost |
|---|---|
| NAT Gateway (single AZ) | ~$32/mo |
| RDS db.t4g.micro Postgres 17 | ~$14/mo |
| ElastiCache cache.t4g.micro Redis 7 | ~$11/mo |
| ECS Fargate 256/512 × 2 services (idle) | ~$8/mo |
| ALB base charge | ~$16/mo |
| S3 + CloudWatch Logs | ~$1-2/mo |
| **Total estimate** | **~$82/mo** |

## Next Steps (human-gated)

**T2 (checkpoint:human-verify):** Review terraform plan output, confirm resource names and IAM trust policy, acknowledge monthly cost.

**T3 (checkpoint:human-action):** Run `terraform apply`, set Wrangler secrets (BACKEND_ORIGIN, CLOUDFLARE_SHARED_SECRET), set GitHub Actions secrets, push first API image to ECR, deploy web Worker, run 4 smoke test curls.

## Known Stubs

None — all Terraform resources reference real AWS services. The ECS tasks will start but fail until a real API image is pushed to ECR (expected: T3 task covers this).

## Self-Check: PASSED

Files created check:
- infrastructure/terraform/backend.tf: FOUND
- infrastructure/terraform/main.tf: FOUND
- infrastructure/terraform/network/main.tf: FOUND
- infrastructure/terraform/data/main.tf: FOUND
- infrastructure/terraform/secrets/main.tf: FOUND
- infrastructure/terraform/compute/main.tf: FOUND

Commits:
- 1105712: T1a root config + network module
- 6b57508: T1b data + secrets + compute modules + terraform validate
