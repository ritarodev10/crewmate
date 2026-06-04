---
phase: 01-foundation
plan: "14"
type: execute
wave: 4
depends_on:
  - "13"
autonomous: false
files_modified:
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
  - .gitignore
requirements:
  - INFRA-01
  - INFRA-02
  - INFRA-03
  - INFRA-04
  - INFRA-05
  - INFRA-06

user_setup:
  - service: aws
    why: "Terraform apply provisions RDS, ElastiCache, ECS, ECR, ALB, NAT — incurs AWS cost (~$30-50/mo for t4g.micro instances)"
    prereqs:
      - task: "Verify AWS account access with IAM permissions (EC2, ECS, RDS, ElastiCache, S3, IAM, ECR, Secrets Manager, CloudWatch)"
        location: "AWS Console or aws sts get-caller-identity"
      - task: "Set AWS_PROFILE=crewmate or export AWS credentials"
        location: "~/.aws/credentials — profile 'crewmate' per AGENT-SETUP.md"
    env_vars:
      - name: AWS_PROFILE
        source: "~/.aws/credentials — profile named 'crewmate'"
  - service: cloudflare
    why: "wrangler deploy binds the Worker to crewmate.ritaro.dev — requires a Cloudflare account with the ritaro.dev zone"
    prereqs:
      - task: "Generate a scoped Cloudflare API token (Workers:Edit + Zone:Edit on ritaro.dev)"
        location: "Cloudflare Dashboard → My Profile → API Tokens"
      - task: "Run: wrangler secret put BACKEND_ORIGIN (enter the ALB DNS name from Terraform output)"
        location: "apps/web/ directory after terraform apply"
      - task: "Run: wrangler secret put CLOUDFLARE_SHARED_SECRET (enter the same value used for AWS Secrets Manager)"
        location: "apps/web/ directory"
    env_vars:
      - name: CLOUDFLARE_API_TOKEN
        source: "Cloudflare Dashboard → My Profile → API Tokens"

must_haves:
  truths:
    - "All 4 Terraform modules validate without errors (terraform validate)"
    - "terraform plan succeeds in the compute module (no unknown resource errors)"
    - "After terraform apply: curl https://crewmate.ritaro.dev returns the placeholder page (200)"
    - "After terraform apply: curl https://crewmate.ritaro.dev/api/healthz returns 200"
    - "After terraform apply: curl <ALB-direct-DNS>/healthz returns 401 (no shared secret)"
    - "ECS api service status is ACTIVE with 1 running task"
  artifacts:
    - path: "infrastructure/terraform/network/main.tf"
      provides: "VPC, 2 public + 2 private subnets, NAT, security groups with Cloudflare IP allowlist"
      contains: "aws_vpc"
    - path: "infrastructure/terraform/data/main.tf"
      provides: "RDS Postgres 17, ElastiCache Redis 7, S3 buckets"
      contains: "aws_db_instance"
    - path: "infrastructure/terraform/secrets/main.tf"
      provides: "Secrets Manager entries, ECS task IAM role, GitHub OIDC provider + role"
      contains: "aws_iam_openid_connect_provider"
    - path: "infrastructure/terraform/compute/main.tf"
      provides: "ECS cluster, api + worker services, ALB, ECR, CloudWatch log groups"
      contains: "aws_ecs_service"
    - path: "infrastructure/terraform/backend.tf"
      provides: "Local state backend; remote S3 backend documented as comment for Phase 5"
      contains: "local"
    - path: ".gitignore"
      provides: "terraform.tfstate and *.tfstate.backup gitignored"
      contains: "terraform.tfstate"
  key_links:
    - from: "infrastructure/terraform/compute/main.tf"
      to: "infrastructure/terraform/network/outputs.tf"
      via: "module.network.alb_sg_id and subnet IDs passed as variables"
      pattern: "module.network"
    - from: "infrastructure/terraform/compute/main.tf"
      to: "infrastructure/terraform/secrets/outputs.tf"
      via: "module.secrets.ecs_task_role_arn"
      pattern: "module.secrets"
    - from: "infrastructure/terraform/compute/main.tf"
      to: "infrastructure/terraform/data/outputs.tf"
      via: "module.data.db_endpoint, module.data.redis_endpoint"
      pattern: "module.data"
---

<objective>
Write all 4 Terraform modules and a root terraform/main.tf that wires them together. Then guide the
manual apply that provisions AWS infrastructure and deploys the first Worker + API image.

This is the only wave with checkpoints: terraform apply incurs real AWS cost and requires the user
to confirm before running.

Purpose: Delivers INFRA-02 (Terraform IaC), INFRA-01/03 (the live deployment), and closes the Phase 1
gate. After this plan completes, all 5 success criteria are verifiable via curl.

Output:
- infrastructure/terraform/network/ — VPC, subnets, NAT, security groups
- infrastructure/terraform/data/ — RDS Postgres 17, ElastiCache Redis 7, S3
- infrastructure/terraform/secrets/ — Secrets Manager, IAM roles, GitHub OIDC
- infrastructure/terraform/compute/ — ECS, ECR, ALB
- infrastructure/terraform/main.tf + backend.tf (local state for Phase 1)
- Phase 1 gate verified: placeholder loads, /api/healthz returns 200, direct ALB returns 401
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@.planning/phases/01-foundation/01-11-SUMMARY.md
@.planning/phases/01-foundation/01-12-SUMMARY.md
@.planning/phases/01-foundation/01-13-SUMMARY.md

@docs/guardrails/shared/03-security.md
@docs/AGENT-SETUP.md
</context>

<interfaces>
<!-- Exact values from CONTEXT.md for all Terraform resources -->

AWS provider version: pin to ~> 5.0 (avoids unexpected breaking changes)
Region: us-east-1

Cloudflare IP allowlist for ALB SG ingress (from CONTEXT.md — include as a Terraform local):
  Use the static list from https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6
  Current IPv4 ranges as of 2026-06 (use these verbatim — update when Cloudflare publishes changes):
  173.245.48.0/20, 103.21.244.0/22, 103.22.200.0/22, 103.31.4.0/22, 141.101.64.0/18,
  108.162.192.0/18, 190.93.240.0/20, 188.114.96.0/20, 197.234.240.0/22, 198.41.128.0/17,
  162.158.0.0/15, 104.16.0.0/13, 104.24.0.0/14, 172.64.0.0/13, 131.0.72.0/22

Variable naming convention (from CONTEXT.md):
  Terraform variable names: plain snake_case (e.g., var.aws_region, var.environment)
  AWS resource names: crewmate_ prefix (e.g., "crewmate_vpc", "crewmate_ecs_cluster")

Module output contract (what each module must output — referenced by compute and by GitHub Actions):

network outputs.tf:
  vpc_id, public_subnet_ids (list), private_subnet_ids (list),
  alb_sg_id, ecs_sg_id, rds_sg_id, redis_sg_id

data outputs.tf:
  db_endpoint, redis_endpoint, assets_bucket_name

secrets outputs.tf:
  ecs_task_role_arn, github_actions_role_arn,
  db_url_secret_arn, redis_url_secret_arn,
  jwt_access_secret_arn, jwt_refresh_secret_arn,
  webhook_signing_secret_arn, cloudflare_shared_secret_arn

compute outputs.tf:
  alb_dns_name, ecr_repo_url, ecs_cluster_name, api_service_name, worker_service_name

Root main.tf variable inputs (passed to each module):
  aws_region = "us-east-1"
  environment = "prod"
  account_id = data.aws_caller_identity.current.account_id
  azs = ["us-east-1a", "us-east-1b"]   # 2 AZs per CONTEXT.md decision

GitHub OIDC trust policy (from CONTEXT.md):
  Principal: token.actions.githubusercontent.com
  Condition: sub matches "repo:ritarodev10/crewmate:*"
  Permissions: ECR push (ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability,
               ecr:InitiateLayerUpload, ecr:UploadLayerPart, ecr:CompleteLayerUpload, ecr:PutImage),
               ECS update (ecs:UpdateService, ecs:DescribeServices, ecs:RunTask, ecs:DescribeTaskDefinition),
               SecretsManager GetSecretValue on "crewmate/*" path only

ECS task definition spec (api service):
  CPU: 256, Memory: 512
  Image: <ecr_repo_url>:latest (updated by deploy workflow)
  Log driver: awslogs to /crewmate/api log group
  Secrets: all 6 Secrets Manager ARNs injected as environment variables
  Port: 3000/tcp
  Command: ["node", "dist/main.js"]

ECS worker service:
  Same image; Command: ["node", "dist/worker.js"] (different entry point)
  CPU: 256, Memory: 512; log to /crewmate/worker

ALB target group:
  Health check path: /readyz
  Healthy threshold: 2, Unhealthy: 3, Interval: 30s, Timeout: 5s

State backend (local for Phase 1):
  terraform {
    backend "local" {
      path = "terraform.tfstate"
    }
  }
  # Remote S3 backend (enable in Phase 5):
  # backend "s3" {
  #   bucket         = "crewmate-tf-state-<account_id>"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "crewmate-tf-lock"
  #   encrypt        = true
  # }
</interfaces>

<tasks>

<task type="auto" id="14-T1">
  <name>Task 1: Write all 4 Terraform modules + root main.tf + backend.tf</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md (Terraform modules section, detailed specs for each)
    - .planning/phases/01-foundation/01-RESEARCH.md (Terraform section, GitHub OIDC resource)
    - docs/AGENT-SETUP.md (AWS profile name, what's already provisioned if anything)
    - .gitignore (verify terraform.tfstate is ignored — add if missing)
  </read_first>
  <files>
    infrastructure/terraform/backend.tf,
    infrastructure/terraform/main.tf,
    infrastructure/terraform/variables.tf,
    infrastructure/terraform/outputs.tf,
    infrastructure/terraform/network/main.tf,
    infrastructure/terraform/network/variables.tf,
    infrastructure/terraform/network/outputs.tf,
    infrastructure/terraform/data/main.tf,
    infrastructure/terraform/data/variables.tf,
    infrastructure/terraform/data/outputs.tf,
    infrastructure/terraform/secrets/main.tf,
    infrastructure/terraform/secrets/variables.tf,
    infrastructure/terraform/secrets/outputs.tf,
    infrastructure/terraform/compute/main.tf,
    infrastructure/terraform/compute/variables.tf,
    infrastructure/terraform/compute/outputs.tf,
    .gitignore
  </files>
  <action>
    Create the infrastructure/terraform/ directory structure. All 4 modules and the root config
    are created from scratch (the directory does not exist yet).

    Structure:
      infrastructure/terraform/
      ├── backend.tf         (local state + remote S3 as comment)
      ├── main.tf            (root — calls all 4 modules, passes outputs as inputs)
      ├── variables.tf       (root variables: aws_region, environment)
      ├── outputs.tf         (root outputs: expose key values like alb_dns_name)
      ├── network/
      │   ├── main.tf        (VPC, subnets, NAT, SGs)
      │   ├── variables.tf
      │   └── outputs.tf
      ├── data/
      │   ├── main.tf        (RDS, ElastiCache, S3)
      │   ├── variables.tf
      │   └── outputs.tf
      ├── secrets/
      │   ├── main.tf        (Secrets Manager, IAM roles, OIDC)
      │   ├── variables.tf
      │   └── outputs.tf
      └── compute/
          ├── main.tf        (ECS, ECR, ALB, CloudWatch)
          ├── variables.tf
          └── outputs.tf

    PROVIDER SETUP (in root main.tf or a providers.tf):
      terraform {
        required_version = ">= 1.5"
        required_providers {
          aws = {
            source  = "hashicorp/aws"
            version = "~> 5.0"
          }
        }
      }
      provider "aws" {
        region = var.aws_region
      }
      data "aws_caller_identity" "current" {}

    NETWORK MODULE (most critical — blocks all others):
      aws_vpc "crewmate_vpc": cidr_block="10.0.0.0/16", enable_dns_hostnames=true, enable_dns_support=true
      2 public subnets (10.0.1.0/24, 10.0.2.0/24) in us-east-1a + us-east-1b
      2 private subnets (10.0.10.0/24, 10.0.11.0/24) in us-east-1a + us-east-1b
      aws_internet_gateway attached to VPC
      aws_eip for NAT (single NAT gateway — not HA)
      aws_nat_gateway in first public subnet
      Route tables: public (IGW), private (NAT gateway)
      aws_route_table_association for all 4 subnets

      Security groups:
        alb_sg: ingress port 80 from Cloudflare IP allowlist (local.cloudflare_ipv4_cidrs)
                ingress port 443 from Cloudflare IP allowlist
                egress all
        ecs_sg: ingress port 3000 from alb_sg
                egress all
        rds_sg: ingress port 5432 from ecs_sg
                egress all (outbound not needed but keep minimal)
        redis_sg: ingress port 6379 from ecs_sg
                  egress all

      Cloudflare IP allowlist as a local:
        locals {
          cloudflare_ipv4_cidrs = [
            "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
            "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
            "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
            "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
          ]
        }
      Use for_each or count over the list for aws_security_group_rule resources (cleaner than
      multiple aws_security_group inline ingress blocks).

    DATA MODULE:
      aws_db_subnet_group: uses private subnet IDs from network module
      aws_db_instance "crewmate_postgres":
        engine = "postgres", engine_version = "17"
        instance_class = "db.t4g.micro"
        allocated_storage = 20, storage_type = "gp3"
        db_name = "crewmate", username = "crewmate"
        password = random_password or managed_master_user — see below
        vpc_security_group_ids = [rds_sg_id from network module]
        db_subnet_group_name = aws_db_subnet_group.crewmate.name
        skip_final_snapshot = true (dev/portfolio — no final snapshot)
        backup_retention_period = 7
        multi_az = false (single AZ per CONTEXT.md decision)

      NOTE on RDS password: for Phase 1, generate it via random_password resource and store the
      full DATABASE_URL in Secrets Manager. The `random_password` resource requires hashicorp/random
      provider — add to required_providers.

      aws_elasticache_subnet_group: uses private subnets
      aws_elasticache_cluster "crewmate_redis":
        engine = "redis", engine_version = "7.0"
        node_type = "cache.t4g.micro"
        num_cache_nodes = 1
        security_group_ids = [redis_sg_id]
        subnet_group_name = aws_elasticache_subnet_group.crewmate.name

      S3 buckets:
        aws_s3_bucket "crewmate_assets": name = "crewmate-assets-${var.account_id}"
        aws_s3_bucket "crewmate_audit_archive": name = "crewmate-audit-archive-${var.account_id}"
        aws_s3_bucket_versioning: disabled for both (cost per CONTEXT.md)
        aws_s3_bucket_public_access_block: block all public access on both

    SECRETS MODULE:
      Secrets Manager entries (7 total):
        aws_secretsmanager_secret + aws_secretsmanager_secret_version for each:
          crewmate/db_url — full postgresql:// URL using RDS endpoint + random password
          crewmate/redis_url — redis:// URL using ElastiCache endpoint
          crewmate/jwt_access_secret — random 64-char hex (use random_id or random_bytes)
          crewmate/jwt_refresh_secret — same
          crewmate/webhook_signing_secret — same
          crewmate/cloudflare_shared_secret — random 64-char hex; MUST match Wrangler secret

      ECS task execution IAM role (allows ECS to pull secrets and push logs):
        aws_iam_role "crewmate_ecs_execution": trust policy for ecs-tasks.amazonaws.com
        Attach managed policies: AmazonECSTaskExecutionRolePolicy + AmazonSSMReadOnlyAccess
        aws_iam_role_policy inline: secretsmanager:GetSecretValue on crewmate/* ARNs

      ECS task IAM role (what the app can do at runtime — currently minimal):
        aws_iam_role "crewmate_ecs_task": trust policy for ecs-tasks.amazonaws.com
        aws_iam_role_policy inline: S3 PutObject/GetObject on assets bucket

      GitHub Actions OIDC:
        aws_iam_openid_connect_provider "github":
          url = "https://token.actions.githubusercontent.com"
          client_id_list = ["sts.amazonaws.com"]
          thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] (GitHub OIDC thumbprint)

        aws_iam_role "crewmate_github_actions":
          trust policy allows token.actions.githubusercontent.com with condition:
            StringLike sub "repo:ritarodev10/crewmate:*"
          Permissions inline policy:
            ECR: ecr:GetAuthorizationToken (on *), plus ECR repo actions on crewmate-api repo
            ECS: ecs:UpdateService, ecs:DescribeServices, ecs:RunTask, ecs:DescribeTaskDefinition
                 on crewmate cluster/services/task-definitions
            SecretsManager: GetSecretValue on crewmate/* ARN path

    COMPUTE MODULE:
      aws_ecr_repository "crewmate_api":
        name = "crewmate-api"
        image_tag_mutability = "MUTABLE"
        force_delete = true (allows destroy even with images — safe for portfolio)
      aws_ecr_lifecycle_policy: keep last 10 `:sha-*` images + `:latest`
        Policy JSON: rules to expire untagged after 1 day; keep last 10 sha-* tagged

      aws_cloudwatch_log_group: "/crewmate/api" + "/crewmate/worker" (retention 14 days — portfolio cost)

      ALB:
        aws_lb "crewmate_alb": internal=true (NOT internet-facing — Worker → ALB is internal)
          subnets = private_subnet_ids (ALB is in private subnets; Cloudflare connects via Workers → public internet → CF edge → Workers → ALB)
          WAIT: review this. The ALB must be reachable from the Cloudflare Worker. Workers make
          outbound HTTPS requests to the origin (BACKEND_ORIGIN). If the ALB is internal (no public
          IP), the Worker cannot reach it directly. CORRECTION: make the ALB internet-facing but
          restrict ingress to Cloudflare IPs only via SG.
          Decision (from CONTEXT.md): ALB is HTTP:80 only (no TLS), internet-facing.
          aws_lb "crewmate_alb": internal=false, load_balancer_type="application"
          subnets = public_subnet_ids (ALB needs public subnets to receive inbound from Workers)
          security_groups = [alb_sg_id] (restricts to Cloudflare IPs only)

        aws_lb_listener "http": port=80, protocol="HTTP", forward to target group
        aws_lb_target_group "crewmate_api_tg":
          port=3000, protocol="HTTP", vpc_id
          health_check: path="/readyz", healthy_threshold=2, unhealthy_threshold=3,
                         interval=30, timeout=5, matcher="200"

      ECS:
        aws_ecs_cluster "crewmate": name = "crewmate"
        aws_ecs_task_definition "crewmate_api":
          family = "crewmate-api"
          cpu = "256", memory = "512"
          network_mode = "awsvpc"
          requires_compatibilities = ["FARGATE"]
          execution_role_arn = crewmate_ecs_execution role ARN
          task_role_arn = crewmate_ecs_task role ARN
          container_definitions JSON: [{
            name: "api",
            image: "<ecr_repo_url>:latest",
            portMappings: [{containerPort: 3000}],
            logConfiguration: {logDriver: "awslogs", options: {
              awslogs-group: "/crewmate/api", awslogs-region: "us-east-1", awslogs-stream-prefix: "api"
            }},
            secrets: [
              {name: "DATABASE_URL", valueFrom: db_url_secret_arn},
              {name: "REDIS_URL", valueFrom: redis_url_secret_arn},
              {name: "JWT_ACCESS_SECRET", valueFrom: jwt_access_secret_arn},
              {name: "JWT_REFRESH_SECRET", valueFrom: jwt_refresh_secret_arn},
              {name: "WEBHOOK_SIGNING_SECRET", valueFrom: webhook_signing_secret_arn},
              {name: "CLOUDFLARE_SHARED_SECRET", valueFrom: cloudflare_shared_secret_arn},
            ]
          }]

        aws_ecs_task_definition "crewmate_worker": same as api but command=["node","dist/worker.js"],
          log to /crewmate/worker

        aws_ecs_service "crewmate_api":
          cluster = aws_ecs_cluster.crewmate.id
          task_definition = aws_ecs_task_definition.crewmate_api.arn
          desired_count = 1 (no autoscaling Phase 1)
          launch_type = "FARGATE"
          network_configuration: subnets=private_subnet_ids, security_groups=[ecs_sg_id], assign_public_ip=false
          load_balancer: target_group_arn, container_name="api", container_port=3000

        aws_ecs_service "crewmate_worker": same but no load_balancer block

    GITIGNORE: Ensure .gitignore at repo root includes:
      # Terraform state (local Phase 1 — state is local, never committed)
      infrastructure/terraform/terraform.tfstate
      infrastructure/terraform/terraform.tfstate.backup
      infrastructure/terraform/.terraform/
      infrastructure/terraform/.terraform.lock.hcl  # actually COMMIT this — it pins provider versions

    After creating all files, run from infrastructure/terraform/:
      terraform init
      terraform validate (all 4 modules must validate cleanly)
      terraform fmt -recursive (enforce formatting)
  </action>
  <verify>
    <automated>
      # All module files exist
      test -f infrastructure/terraform/backend.tf
      test -f infrastructure/terraform/main.tf
      test -f infrastructure/terraform/network/main.tf
      test -f infrastructure/terraform/data/main.tf
      test -f infrastructure/terraform/secrets/main.tf
      test -f infrastructure/terraform/compute/main.tf
      # Key resources present
      grep "aws_vpc" infrastructure/terraform/network/main.tf
      grep "aws_db_instance" infrastructure/terraform/data/main.tf
      grep "aws_iam_openid_connect_provider" infrastructure/terraform/secrets/main.tf
      grep "aws_ecs_service" infrastructure/terraform/compute/main.tf
      grep "aws_lb " infrastructure/terraform/compute/main.tf
      # ALB is internet-facing (required for Worker to reach it)
      grep "internal.*false" infrastructure/terraform/compute/main.tf
      # State file gitignored
      grep "terraform.tfstate" .gitignore
      # Validate (requires terraform CLI)
      cd infrastructure/terraform && terraform init -backend=false && terraform validate
    </automated>
  </verify>
  <acceptance_criteria>
    - All 16 Terraform files exist (4 modules x 3 files + backend.tf + main.tf + variables.tf + outputs.tf)
    - infrastructure/terraform/network/main.tf contains "aws_vpc" resource
    - infrastructure/terraform/data/main.tf contains "aws_db_instance" resource
    - infrastructure/terraform/secrets/main.tf contains "aws_iam_openid_connect_provider" resource
    - infrastructure/terraform/compute/main.tf contains "aws_ecs_service" resource
    - infrastructure/terraform/compute/main.tf contains internal = false (ALB is internet-facing)
    - infrastructure/terraform/backend.tf contains 'backend "local"' and remote S3 as a comment
    - terraform validate exits 0 for all modules (cd infrastructure/terraform && terraform validate)
    - .gitignore contains "terraform.tfstate" entry
    - No Terraform file contains hardcoded passwords, secrets, or access keys
  </acceptance_criteria>
  <done>All 4 Terraform modules written and validated; state config in place; .gitignore updated.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking" id="14-T2">
  <name>Checkpoint: Terraform plan review and cost acknowledgment</name>
  <files>infrastructure/terraform/</files>
  <action>
    Run: AWS_PROFILE=crewmate terraform -chdir=infrastructure/terraform plan -out=tfplan
    Review the output for correct resource types, naming, and no hardcoded secrets.
    Acknowledge the ~$80/mo cost estimate before proceeding with apply.
  </action>
  <verify>
    <automated>MANUAL — user reviews terraform plan output and confirms resource list</automated>
  </verify>
  <done>User has reviewed the plan and typed "apply approved"</done>
  <what-built>
    All 4 Terraform modules validated. Before running `terraform apply`, the user must review
    the plan output and acknowledge the monthly AWS cost (~$30-50/mo for portfolio use).

    Resources that incur cost:
    - NAT Gateway: ~$32/mo (single AZ)
    - RDS db.t4g.micro Postgres 17: ~$14/mo
    - ElastiCache cache.t4g.micro Redis 7: ~$11/mo
    - ECS Fargate 256/512 x2 services: ~$8/mo idle
    - ALB: ~$16/mo base
    Total estimate: ~$80/mo (varies with traffic)

    To review before approving:
    1. cd infrastructure/terraform
    2. terraform init
    3. terraform plan -out=tfplan
    4. Review the plan output — verify resource names use "crewmate_" prefix
    5. Confirm ALB is internet-facing (not internal)
    6. Confirm github_actions_role trust policy limits to repo:ritarodev10/crewmate:*
  </what-built>
  <how-to-verify>
    Run:
      AWS_PROFILE=crewmate terraform -chdir=infrastructure/terraform plan -out=tfplan

    Check the plan output for:
    - aws_lb with internal = false
    - aws_ecs_service.crewmate_api and crewmate_worker
    - aws_iam_openid_connect_provider.github
    - aws_db_instance with engine_version = "17"
    - No resource names without the crewmate_ prefix
    - No hardcoded secrets in the plan (secrets come from random_password resources)
  </how-to-verify>
  <resume-signal>
    Type "apply approved" to proceed with terraform apply, or describe issues found in the plan.
    If cost is too high, type "skip apply" to commit the Terraform code without applying.
  </resume-signal>
</task>

<task type="checkpoint:human-action" gate="blocking" id="14-T3">
  <name>Human action: terraform apply + wrangler secrets + first deploy</name>
  <files>infrastructure/terraform/, apps/web/wrangler.toml</files>
  <action>
    Run terraform apply, set Wrangler secrets (BACKEND_ORIGIN, CLOUDFLARE_SHARED_SECRET),
    set GitHub Secrets (AWS_DEPLOY_ROLE_ARN, ECR_REPO_URL, ECS_PRIVATE_SUBNET_ID, ECS_SG_ID,
    CLOUDFLARE_API_TOKEN), push first API image to ECR, deploy web Worker to Cloudflare.
    Run all 4 smoke test curls from the how-to-verify section.
  </action>
  <verify>
    <automated>MANUAL — human runs terraform apply and 4 smoke test curls; reports exit codes</automated>
  </verify>
  <done>
    All 4 smoke tests pass: crewmate.ritaro.dev returns HTML, /api/healthz returns 200,
    /api/readyz returns 200, direct ALB URL returns 401.
  </done>
  <what-built>
    Terraform modules are validated and the plan is approved. The user must now run apply and
    configure secrets — these steps require human credentials and cannot be automated.
  </what-built>
  <how-to-verify>
    Run the following steps in order:

    STEP 1: Apply infrastructure
      AWS_PROFILE=crewmate terraform -chdir=infrastructure/terraform apply tfplan

    STEP 2: Capture outputs
      terraform -chdir=infrastructure/terraform output
      Note: alb_dns_name, ecr_repo_url, github_actions_role_arn, cloudflare_shared_secret_arn

    STEP 3: Get the CLOUDFLARE_SHARED_SECRET value (matches what's in Secrets Manager)
      AWS_PROFILE=crewmate aws secretsmanager get-secret-value \
        --secret-id crewmate/cloudflare_shared_secret \
        --query SecretString --output text

    STEP 4: Set Wrangler secrets (run from apps/web/)
      cd apps/web
      wrangler secret put BACKEND_ORIGIN
        → Enter: http://<alb_dns_name>  (from step 2 output)
      wrangler secret put CLOUDFLARE_SHARED_SECRET
        → Enter: <value from step 3>

    STEP 5: Set GitHub Secrets (in GitHub repo Settings → Secrets → Actions):
      AWS_DEPLOY_ROLE_ARN  → github_actions_role_arn from terraform output
      ECR_REPO_URL         → ecr_repo_url from terraform output
      ECS_PRIVATE_SUBNET_ID → one private subnet ID from terraform output
      ECS_SG_ID            → ecs_sg_id from terraform output
      CLOUDFLARE_API_TOKEN → scoped token from Cloudflare Dashboard → API Tokens

    STEP 6: Build and push the first API image (triggers deploy-api.yml manually once or run locally)
      AWS_PROFILE=crewmate aws ecr get-login-password --region us-east-1 | \
        docker login --username AWS --password-stdin <ecr_repo_url>
      docker build -f docker/api.Dockerfile . -t <ecr_repo_url>:latest
      docker push <ecr_repo_url>:latest
      aws ecs update-service --cluster crewmate --service crewmate-api --force-new-deployment

    STEP 7: Trigger first web deploy (manually run deploy-web.yml in GitHub Actions UI or locally)
      cd apps/web
      pnpm build
      opennextjs-cloudflare build
      CLOUDFLARE_API_TOKEN=<token> wrangler deploy

    STEP 8: Run gate smoke tests
      curl -f https://crewmate.ritaro.dev                        # must return HTML
      curl -f https://crewmate.ritaro.dev/api/healthz            # must return 200
      curl -f https://crewmate.ritaro.dev/api/readyz             # must return 200 (after api starts)
      curl -I http://<alb_dns_name>/healthz                      # must return 401 (no shared secret)
  </how-to-verify>
  <resume-signal>
    Once all 4 smoke test curls succeed, type "gate passed" with the outputs from each curl command.
    Include the ALB DNS name so it can be recorded in the SUMMARY.
    If any step fails, describe the error and the executor will help diagnose.
  </resume-signal>
</task>

</tasks>

<verification>
Phase 1 gate verification (run these after human-action checkpoint completes):
  curl -f https://crewmate.ritaro.dev                   # returns placeholder page HTML
  curl -f https://crewmate.ritaro.dev/api/healthz        # returns 200 {"status":"ok"}
  curl -f https://crewmate.ritaro.dev/api/readyz          # returns 200 {"status":"ok",...}
  curl -I http://<ALB-direct-url>/healthz                 # returns 401 Unauthorized

Local gate (must already be green before wave 1.4):
  pnpm dev     # API :3000 + web :3001 without errors
  pnpm lint    # exits 0
  pnpm typecheck  # exits 0
  pnpm test    # exits 0

CI gate (push a dummy commit to a task/* branch, verify ci.yml goes green).
</verification>

<success_criteria>
1. terraform validate exits 0 for all 4 modules
2. ALB is internet-facing with Cloudflare IP allowlist security group
3. After apply: ECS api service running with 1 task (aws ecs describe-services shows RUNNING)
4. curl https://crewmate.ritaro.dev returns the placeholder page (200)
5. curl https://crewmate.ritaro.dev/api/healthz returns 200 {"status":"ok"}
6. curl http://<ALB-direct-url>/healthz returns 401 (x-cloudflare-secret missing)
7. Phase 1 gate: ALL 5 criteria from ROADMAP.md success criteria are TRUE
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-14-SUMMARY.md` documenting:
- ALB DNS name (record for future reference)
- ECR repo URL
- GitHub Actions role ARN
- Terraform apply output (resource counts)
- Smoke test curl output verbatim
- Confirmation all 5 Phase 1 gate criteria are met
- Monthly cost estimate (actual AWS pricing page numbers)
</output>

