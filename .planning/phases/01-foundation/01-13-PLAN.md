---
phase: 01-foundation
plan: "13"
type: execute
wave: 3
depends_on:
  - "11"
  - "12"
files_modified:
  - .github/workflows/ci.yml
  - .github/workflows/deploy-api.yml
  - .github/workflows/deploy-web.yml
autonomous: true
requirements:
  - INFRA-04
  - INFRA-05

must_haves:
  truths:
    - "ci.yml triggers on push/PR to main and task/* branches"
    - "ci.yml runs 4 jobs: lint, typecheck, test, e2e — each with the correct service containers"
    - "ci.yml uses no long-lived AWS access keys (GitHub OIDC only)"
    - "deploy-api.yml is gated by environment: prod (manual approval)"
    - "deploy-web.yml is gated by environment: prod (manual approval)"
    - "Both deploy workflows trigger on workflow_run of ci.yml success on main"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "CI workflow with lint/typecheck/test/e2e jobs and postgres:17 + redis:7 service containers"
      contains: "postgres:17-alpine"
    - path: ".github/workflows/deploy-api.yml"
      provides: "API deploy: OIDC → ECR push → migrate → rolling ECS update"
      contains: "aws-actions/configure-aws-credentials@v4"
    - path: ".github/workflows/deploy-web.yml"
      provides: "Web deploy: OpenNext build → wrangler deploy; Cloudflare API token"
      contains: "wrangler deploy"
  key_links:
    - from: ".github/workflows/deploy-api.yml"
      to: "AWS ECR / ECS"
      via: "aws-actions/configure-aws-credentials@v4 OIDC (no stored keys)"
      pattern: "configure-aws-credentials@v4"
    - from: ".github/workflows/deploy-web.yml"
      to: "Cloudflare Workers"
      via: "wrangler deploy with CLOUDFLARE_API_TOKEN secret"
      pattern: "wrangler deploy"
    - from: ".github/workflows/deploy-api.yml"
      to: ".github/workflows/ci.yml"
      via: "workflow_run trigger requiring ci.yml success"
      pattern: "workflow_run"
---

<objective>
Create the three GitHub Actions workflows: ci.yml (every PR), deploy-api.yml (api deploy, prod gated),
deploy-web.yml (web deploy, prod gated). All AWS auth uses GitHub OIDC — no long-lived access keys
stored in GitHub Secrets.

Purpose: Delivers INFRA-04 (deploy-api.yml) and INFRA-05 (deploy-web.yml). The CI workflow is also
required for Phase 1 gate criterion #2 ("CI workflow goes green on a dummy PR"). Both deploy workflows
are Infrastructure-as-Code — they're checked in now but won't run until the Terraform-provisioned
AWS resources exist (wave 1.4).

Output:
- .github/workflows/ci.yml
- .github/workflows/deploy-api.yml
- .github/workflows/deploy-web.yml
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

@docs/guardrails/shared/03-security.md
</context>

<interfaces>
<!-- Exact shapes from CONTEXT.md "GitHub Actions" section (lines 201-265 of CONTEXT.md) -->

ci.yml trigger:
  on:
    push:
      branches: [main, "task/*"]
    pull_request:
      branches: [main, "task/*"]

ci.yml jobs (4 total, all on ubuntu-latest):
  lint:      pnpm install --frozen-lockfile → pnpm lint
  typecheck: pnpm install --frozen-lockfile → pnpm typecheck
  test:      postgres:17-alpine + redis:7-alpine service containers → pnpm test
  e2e:       postgres:17-alpine + redis:7-alpine service containers → pnpm test:e2e

Service container config (verbatim from CONTEXT.md, lines 214-232):
  services:
    postgres:
      image: postgres:17-alpine
      env:
        POSTGRES_USER: crewmate
        POSTGRES_PASSWORD: crewmate
        POSTGRES_DB: crewmate
      ports: ["5432:5432"]
      options: >-
        --health-cmd "pg_isready -U crewmate"
        --health-interval 5s --health-timeout 5s --health-retries 5
    redis:
      image: redis:7-alpine
      ports: ["6379:6379"]
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 5s --health-timeout 5s --health-retries 5

Environment variables for test + e2e jobs (not stored as secrets — test-only values):
  DATABASE_URL: postgresql://crewmate:crewmate@localhost:5432/crewmate
  REDIS_URL: redis://localhost:6379
  JWT_ACCESS_SECRET: ci-test-access-secret-at-least-32-characters
  JWT_REFRESH_SECRET: ci-test-refresh-secret-at-least-32-chars-ok
  WEBHOOK_SIGNING_SECRET: ci-test-webhook-signing-secret-min-32ch
  CLOUDFLARE_SHARED_SECRET: ci-test-cloudflare-secret-min-32-chars

deploy-api.yml trigger + structure (from CONTEXT.md lines 238-253):
  on:
    workflow_run:
      workflows: ["CI"]
      types: [completed]
      branches: [main]

  jobs:
    deploy:
      if: ${{ github.event.workflow_run.conclusion == 'success' }}
      environment: prod
      runs-on: ubuntu-latest
      permissions:
        id-token: write   # REQUIRED for OIDC
        contents: read
      steps:
        1. actions/checkout@v4
        2. aws-actions/configure-aws-credentials@v4
              role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
              aws-region: us-east-1
        3. aws-actions/amazon-ecr-login@v2
        4. docker build -f docker/api.Dockerfile . -t $ECR_REPO:sha-${{ github.sha }} -t $ECR_REPO:latest
              ECR_REPO = ${{ secrets.ECR_REPO_URL }}
        5. docker push $ECR_REPO:sha-${{ github.sha }} && docker push $ECR_REPO:latest
        6. aws ecs run-task (prisma migrate deploy as one-shot task — see details below)
        7. aws ecs update-service --force-new-deployment --cluster crewmate --service crewmate-api
        8. aws ecs update-service --force-new-deployment --cluster crewmate --service crewmate-worker
        9. aws ecs wait services-stable --cluster crewmate --services crewmate-api crewmate-worker
        10. curl -f https://crewmate.ritaro.dev/api/healthz
        11. curl -f https://crewmate.ritaro.dev/api/readyz

Prisma migrate step (step 6) detail:
  aws ecs run-task \
    --cluster crewmate \
    --task-definition crewmate-api \
    --overrides '{"containerOverrides":[{"name":"api","command":["node","-e","require(\"child_process\").execSync(\"pnpm prisma migrate deploy\",{stdio:\"inherit\"})"]}]}' \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.ECS_SUBNET_ID }}],securityGroups=[${{ secrets.ECS_SG_ID }}],assignPublicIp=DISABLED}"
  Alternative: use the @prisma/migrate deploy command directly if node_modules are in the image.
  The exact command depends on the Dockerfile. Use:
    command: ["npx", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]
  or inline the prisma binary from dist.

deploy-web.yml trigger + structure (from CONTEXT.md lines 255-265):
  Same workflow_run trigger as deploy-api. Same prod gate.
  Steps:
    1. actions/checkout@v4
    2. actions/setup-node@v4 with node-version: '22'
    3. Install pnpm (use corepack enable or actions/setup-pnpm)
    4. pnpm install --frozen-lockfile
    5. pnpm --filter @crewmate/web build
    6. pnpm --filter @crewmate/web exec opennextjs-cloudflare build
       (or: npx opennextjs-cloudflare build inside apps/web/)
    7. wrangler deploy (from apps/web/ directory or with --config apps/web/wrangler.toml)
       Uses: CLOUDFLARE_API_TOKEN secret (scoped token — not a Global API Key)
    8. curl -f https://crewmate.ritaro.dev
    9. curl -f https://crewmate.ritaro.dev/api/healthz

GitHub Secrets referenced (these must be set by the user before deploy workflows can run):
  AWS_DEPLOY_ROLE_ARN    — github_actions_role_arn from Terraform secrets module output
  ECR_REPO_URL           — ecr_repo_url from Terraform compute module output
  ECS_SUBNET_ID          — a private subnet ID from Terraform network module output
  ECS_SG_ID              — ecs_sg_id from Terraform network module output
  CLOUDFLARE_API_TOKEN   — scoped Cloudflare token for Workers deployment
</interfaces>

<tasks>

<task type="auto" id="13-T1">
  <name>Task 1: ci.yml — lint, typecheck, test, e2e with service containers</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md (GitHub Actions section, lines 201-232)
    - .planning/phases/01-foundation/01-RESEARCH.md (CI service containers section)
    - apps/api/package.json (verify test and test:e2e script names; verify db:migrate:deploy script exists)
    - package.json at root (verify lint, typecheck, test script names)
  </read_first>
  <files>.github/workflows/ci.yml</files>
  <action>
    Create .github/workflows/ directory if it doesn't exist.
    Create .github/workflows/ci.yml:

    name: CI
    on:
      push:
        branches: [main, "task/*"]
      pull_request:
        branches: [main, "task/*"]

    jobs:
      lint:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: pnpm/action-setup@v4
            with:
              version: "10.15.0"
          - uses: actions/setup-node@v4
            with:
              node-version: "22"
              cache: "pnpm"
          - run: pnpm install --frozen-lockfile
          - run: pnpm lint

      typecheck:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: pnpm/action-setup@v4
            with:
              version: "10.15.0"
          - uses: actions/setup-node@v4
            with:
              node-version: "22"
              cache: "pnpm"
          - run: pnpm install --frozen-lockfile
          - run: pnpm typecheck

      test:
        runs-on: ubuntu-latest
        services:
          postgres:
            image: postgres:17-alpine
            env:
              POSTGRES_USER: crewmate
              POSTGRES_PASSWORD: crewmate
              POSTGRES_DB: crewmate
            ports:
              - "5432:5432"
            options: >-
              --health-cmd "pg_isready -U crewmate"
              --health-interval 5s
              --health-timeout 5s
              --health-retries 5
          redis:
            image: redis:7-alpine
            ports:
              - "6379:6379"
            options: >-
              --health-cmd "redis-cli ping"
              --health-interval 5s
              --health-timeout 5s
              --health-retries 5
        env:
          DATABASE_URL: postgresql://crewmate:crewmate@localhost:5432/crewmate
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: ci-test-access-secret-at-least-32-characters
          JWT_REFRESH_SECRET: ci-test-refresh-secret-at-least-32-chars-ok
          WEBHOOK_SIGNING_SECRET: ci-test-webhook-signing-secret-min-32ch
          CLOUDFLARE_SHARED_SECRET: ci-test-cloudflare-secret-min-32-chars
          NODE_ENV: test
        steps:
          - uses: actions/checkout@v4
          - uses: pnpm/action-setup@v4
            with:
              version: "10.15.0"
          - uses: actions/setup-node@v4
            with:
              node-version: "22"
              cache: "pnpm"
          - run: pnpm install --frozen-lockfile
          - run: pnpm test

      e2e:
        runs-on: ubuntu-latest
        services:
          postgres:  [same as test job above]
          redis:     [same as test job above]
        env:         [same as test job above]
        steps:
          - uses: actions/checkout@v4
          - uses: pnpm/action-setup@v4 (same as above)
          - uses: actions/setup-node@v4 (same as above)
          - run: pnpm install --frozen-lockfile
          - run: pnpm --filter @crewmate/api db:migrate:deploy
          - run: pnpm test:e2e

    NOTE: The e2e job runs `db:migrate:deploy` (maps to `prisma migrate deploy`) — NOT `db:migrate`
    (which maps to `prisma migrate dev`). `prisma migrate dev` is interactive and will hang in CI.
    `prisma migrate deploy` is non-interactive and designed for CI/CD environments. Verify the
    `db:migrate:deploy` script exists in apps/api/package.json before writing the workflow; if it
    is missing, the executor for plan 11 must add it.

    VALIDATION: all env var values in the ci.yml must be >= 32 characters for Zod validation:
    - ci-test-access-secret-at-least-32-characters = 42 chars ✓
    - ci-test-refresh-secret-at-least-32-chars-ok = 43 chars ✓
    - ci-test-webhook-signing-secret-min-32ch = 40 chars ✓
    - ci-test-cloudflare-secret-min-32-chars = 39 chars ✓
    Count characters before writing to verify >= 32.
  </action>
  <verify>
    <automated>
      test -f .github/workflows/ci.yml
      grep "postgres:17-alpine" .github/workflows/ci.yml
      grep "redis:7-alpine" .github/workflows/ci.yml
      grep "pnpm lint" .github/workflows/ci.yml
      grep "pnpm typecheck" .github/workflows/ci.yml
      grep "pnpm test" .github/workflows/ci.yml
      grep "pnpm test:e2e" .github/workflows/ci.yml
      grep "pnpm/action-setup" .github/workflows/ci.yml
      # e2e job uses non-interactive migrate deploy (not interactive migrate dev)
      grep "db:migrate:deploy" .github/workflows/ci.yml
      ! grep "db:migrate[^:]" .github/workflows/ci.yml
      # No long-lived AWS keys
      ! grep "AWS_ACCESS_KEY_ID" .github/workflows/ci.yml
      ! grep "AWS_SECRET_ACCESS_KEY" .github/workflows/ci.yml
      # YAML syntax validation
      python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>&1
    </automated>
  </verify>
  <acceptance_criteria>
    - .github/workflows/ci.yml exists
    - ci.yml contains 4 jobs: lint, typecheck, test, e2e
    - ci.yml contains "postgres:17-alpine" in service containers (test and e2e jobs)
    - ci.yml contains "redis:7-alpine" in service containers
    - ci.yml triggers on push and pull_request to main and task/* branches
    - ci.yml does NOT contain AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
    - CLOUDFLARE_SHARED_SECRET env var value in ci.yml is exactly 39+ characters (Zod min 32)
    - Python YAML parse of ci.yml exits 0 (valid YAML syntax)
    - e2e job uses "pnpm --filter @crewmate/api db:migrate:deploy" (non-interactive prisma migrate deploy)
    - e2e job does NOT use "db:migrate" without the ":deploy" suffix (interactive prisma migrate dev would hang)
  </acceptance_criteria>
  <done>CI workflow with 4 jobs, Postgres 17 + Redis 7 service containers, no stored AWS keys, non-interactive migrate deploy in e2e.</done>
</task>

<task type="auto" id="13-T2">
  <name>Task 2: deploy-api.yml and deploy-web.yml (OIDC + prod gate)</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md (deploy workflows section, lines 238-265)
    - .planning/phases/01-foundation/01-RESEARCH.md (GitHub Actions OIDC code example)
    - docker/api.Dockerfile (just created — verify build command is correct)
    - apps/web/wrangler.toml (just created — verify config path)
  </read_first>
  <files>
    .github/workflows/deploy-api.yml,
    .github/workflows/deploy-web.yml
  </files>
  <action>
    1. CREATE .github/workflows/deploy-api.yml:
       name: Deploy API

       on:
         workflow_run:
           workflows: ["CI"]
           types: [completed]
           branches: [main]

       jobs:
         deploy:
           if: ${{ github.event.workflow_run.conclusion == 'success' }}
           environment: prod
           runs-on: ubuntu-latest
           permissions:
             id-token: write
             contents: read
           steps:
             - uses: actions/checkout@v4

             - name: Configure AWS credentials via OIDC
               uses: aws-actions/configure-aws-credentials@v4
               with:
                 role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
                 aws-region: us-east-1

             - name: Login to ECR
               id: ecr-login
               uses: aws-actions/amazon-ecr-login@v2

             - name: Build and push API image
               env:
                 ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
                 ECR_REPOSITORY: crewmate-api
                 IMAGE_TAG: sha-${{ github.sha }}
               run: |
                 docker build -f docker/api.Dockerfile . \
                   -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
                   -t $ECR_REGISTRY/$ECR_REPOSITORY:latest
                 docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
                 docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

             - name: Run Prisma migrate deploy
               env:
                 ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
               run: |
                 aws ecs run-task \
                   --cluster crewmate \
                   --task-definition crewmate-api \
                   --overrides '{"containerOverrides":[{"name":"api","command":["npx","prisma","migrate","deploy","--schema","prisma/schema.prisma"]}]}' \
                   --launch-type FARGATE \
                   --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.ECS_PRIVATE_SUBNET_ID }}],securityGroups=[${{ secrets.ECS_SG_ID }}],assignPublicIp=DISABLED}" \
                   --wait

             - name: Rolling update API and worker services
               run: |
                 aws ecs update-service --force-new-deployment \
                   --cluster crewmate --service crewmate-api
                 aws ecs update-service --force-new-deployment \
                   --cluster crewmate --service crewmate-worker

             - name: Wait for services to stabilize
               run: |
                 aws ecs wait services-stable \
                   --cluster crewmate \
                   --services crewmate-api crewmate-worker

             - name: Smoke test
               run: |
                 curl -f https://crewmate.ritaro.dev/api/healthz
                 curl -f https://crewmate.ritaro.dev/api/readyz

    2. CREATE .github/workflows/deploy-web.yml:
       name: Deploy Web

       on:
         workflow_run:
           workflows: ["CI"]
           types: [completed]
           branches: [main]

       jobs:
         deploy:
           if: ${{ github.event.workflow_run.conclusion == 'success' }}
           environment: prod
           runs-on: ubuntu-latest
           permissions:
             contents: read
           steps:
             - uses: actions/checkout@v4

             - uses: pnpm/action-setup@v4
               with:
                 version: "10.15.0"

             - uses: actions/setup-node@v4
               with:
                 node-version: "22"
                 cache: "pnpm"

             - run: pnpm install --frozen-lockfile

             - name: Build Next.js
               run: pnpm --filter @crewmate/web build

             - name: Build Cloudflare Worker bundle
               run: pnpm --filter @crewmate/web exec opennextjs-cloudflare build
               working-directory: apps/web

             - name: Deploy to Cloudflare Workers
               run: pnpm --filter @crewmate/web exec wrangler deploy
               working-directory: apps/web
               env:
                 CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

             - name: Smoke test
               run: |
                 curl -f https://crewmate.ritaro.dev
                 curl -f https://crewmate.ritaro.dev/api/healthz

    SECURITY RULES:
    - No long-lived AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in either file (enforced by CONTEXT.md)
    - CLOUDFLARE_API_TOKEN used only in deploy-web.yml (scoped token — NOT the Global API Key)
    - All secrets referenced as ${{ secrets.NAME }} — never hardcoded
  </action>
  <verify>
    <automated>
      test -f .github/workflows/deploy-api.yml
      test -f .github/workflows/deploy-web.yml
      grep "aws-actions/configure-aws-credentials@v4" .github/workflows/deploy-api.yml
      grep "aws-actions/amazon-ecr-login@v2" .github/workflows/deploy-api.yml
      grep "id-token: write" .github/workflows/deploy-api.yml
      grep "environment: prod" .github/workflows/deploy-api.yml
      grep "environment: prod" .github/workflows/deploy-web.yml
      grep "workflow_run" .github/workflows/deploy-api.yml
      grep "workflow_run" .github/workflows/deploy-web.yml
      grep "wrangler deploy" .github/workflows/deploy-web.yml
      grep "CLOUDFLARE_API_TOKEN" .github/workflows/deploy-web.yml
      # No stored AWS keys in any workflow
      ! grep "AWS_ACCESS_KEY_ID" .github/workflows/deploy-api.yml
      ! grep "AWS_ACCESS_KEY_ID" .github/workflows/deploy-web.yml
      ! grep "AWS_SECRET_ACCESS_KEY" .github/workflows/deploy-api.yml
      # YAML syntax validation
      python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-api.yml'))"
      python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-web.yml'))"
    </automated>
  </verify>
  <acceptance_criteria>
    - .github/workflows/deploy-api.yml exists
    - .github/workflows/deploy-web.yml exists
    - deploy-api.yml contains "aws-actions/configure-aws-credentials@v4" (OIDC, not stored keys)
    - deploy-api.yml contains "id-token: write" permission (required for OIDC)
    - deploy-api.yml contains "environment: prod" (manual approval gate)
    - deploy-api.yml contains "workflow_run" trigger referencing "CI" workflow
    - deploy-api.yml contains aws ecs wait services-stable step
    - deploy-api.yml contains smoke test curl of /api/healthz and /api/readyz
    - deploy-web.yml contains "environment: prod" (manual approval gate)
    - deploy-web.yml contains "wrangler deploy" step
    - deploy-web.yml uses CLOUDFLARE_API_TOKEN secret (not a global API key)
    - Neither deploy workflow contains AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
    - Python YAML parse of both files exits 0 (valid YAML)
  </acceptance_criteria>
  <done>deploy-api.yml and deploy-web.yml with OIDC auth, prod gates, smoke tests.</done>
</task>

</tasks>

<verification>
After both tasks complete:
  test -f .github/workflows/ci.yml
  test -f .github/workflows/deploy-api.yml
  test -f .github/workflows/deploy-web.yml
  python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci.yml', '.github/workflows/deploy-api.yml', '.github/workflows/deploy-web.yml']]"
  ! grep "AWS_ACCESS_KEY_ID" .github/workflows/deploy-api.yml .github/workflows/ci.yml
  grep "postgres:17-alpine" .github/workflows/ci.yml
  grep "environment: prod" .github/workflows/deploy-api.yml
  grep "environment: prod" .github/workflows/deploy-web.yml
  grep "db:migrate:deploy" .github/workflows/ci.yml
</verification>

<success_criteria>
1. All 3 workflow files exist and parse as valid YAML
2. ci.yml has 4 jobs (lint, typecheck, test, e2e) with Postgres 17 + Redis 7 service containers
3. No long-lived AWS keys in any workflow (OIDC-only for deploy-api.yml)
4. Both deploy workflows gate on environment: prod (manual approval)
5. deploy-api.yml includes OIDC credential step with id-token: write permission
6. deploy-web.yml deploys via wrangler using CLOUDFLARE_API_TOKEN secret
7. e2e job uses db:migrate:deploy (non-interactive prisma migrate deploy, not prisma migrate dev)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-13-SUMMARY.md` documenting:
- GitHub Secrets that must be created before deploy workflows can run
  (AWS_DEPLOY_ROLE_ARN, ECR_REPO_URL, ECS_PRIVATE_SUBNET_ID, ECS_SG_ID, CLOUDFLARE_API_TOKEN)
- Any YAML syntax issues encountered
- Confirmation that all 3 files parse as valid YAML
</output>
