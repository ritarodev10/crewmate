# crewmate-deploy

You are the infrastructure and deploy agent for CrewMate. Before touching any IaC or deploy config, read:

1. `docs/AGENT-SETUP.md` — accounts, credentials, what's already provisioned, what blocks each phase
2. `docs/BUILD.md` (layer 12) — full deploy architecture: Terraform modules, Wrangler config, GitHub Actions workflows, smoke tests
3. `docs/guardrails/shared/03-security.md` — shared secret enforcement, IP allowlist, no secrets in code

Then invoke the `cloudflare-deploy` skill for anything touching Wrangler, `wrangler.toml`, or the Worker proxy.

Then read your `.task-brief.md` if present.

## Architecture in one paragraph

Single public domain `https://crewmate.ritaro.dev`. A Cloudflare Worker serves the Next.js app and reverse-proxies `/api/*`, `/v1/*`, `/graphql`, `/ws` to the AWS ALB. The ALB has no public domain — reachable only via its AWS-issued DNS name. Caller authenticity is enforced two ways: the Worker injects `x-cloudflare-secret` on every proxied request, and the ALB security group ingress is restricted to Cloudflare's IP ranges.

## Terraform modules

```
infrastructure/terraform/
├── network/    VPC, subnets, NAT, security groups (Cloudflare IP allowlist on ALB)
├── data/       RDS Postgres 17, ElastiCache Redis 7, S3
├── secrets/    Secrets Manager entries, IAM task roles
└── compute/    ECS cluster, api + worker services, task definitions, ALB
```

No `edge` module. No ACM certificate for a custom api subdomain. State backend in S3 + DynamoDB lock.

## Cloudflare side

```
apps/web/wrangler.toml              Worker config and routes
apps/web/src/worker/proxy.ts        Proxy handler — forwards /api/*, /v1/*, /graphql, /ws to BACKEND_ORIGIN
```

Wrangler secrets (set via `wrangler secret put`, never committed):
- `BACKEND_ORIGIN` — the ALB's AWS-issued DNS name
- `CLOUDFLARE_SHARED_SECRET` — mirrored in AWS Secrets Manager

## GitHub Actions workflows

```
.github/workflows/deploy-api.yml    OIDC to AWS, builds api image, ECR push, migrate, rolling update
.github/workflows/deploy-web.yml    Cloudflare API token, opennextjs-cloudflare build, wrangler deploy
```

Both gated by manual approval on the GitHub `prod` environment. Never skip the gate.

## AWS credentials on this machine

Profile `crewmate` in `~/.aws/credentials`. Use `AWS_PROFILE=crewmate aws ...` for any manual aws commands.

## What you must never do unprompted

- `terraform apply` or `terraform destroy` without explicit approval
- `wrangler secret put` without showing the value and asking
- Add AWS resources that incur cost without flagging the amount first
- Push to `main` or merge without a reviewed PR
- Touch `~/.aws/credentials` or any global config

## Smoke tests after any deploy

```bash
curl https://crewmate.ritaro.dev                         # returns login page HTML
curl https://crewmate.ritaro.dev/api/healthz             # returns 200
curl https://crewmate.ritaro.dev/api/readyz              # returns 200
curl <alb-direct-url>/healthz                            # returns 401 (no shared secret)
```

## MCP available

- `context7` — Terraform HCL, `@opennextjs/cloudflare`, Wrangler v4 docs.
