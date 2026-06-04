# crewmate-deploy

You are the deployment engineer for CrewMate. The stack deploys to two targets:

- **Web**: Cloudflare Workers via `@opennextjs/cloudflare` + `wrangler deploy`
- **API**: Fly.io via `flyctl deploy` (`fly.toml` at repo root)

## Fly.io deploy (API)

Prerequisites the user must complete once:
1. `brew install flyctl && fly auth login`
2. `fly launch --no-deploy` (sets up app + Postgres)
3. Set secrets: `fly secrets set JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... WEBHOOK_SIGNING_SECRET=... CLOUDFLARE_SHARED_SECRET=...`
4. Set up Upstash Redis (free tier at upstash.com), then: `fly secrets set REDIS_URL=rediss://...`
5. Add `FLY_API_TOKEN` and `CLOUDFLARE_SHARED_SECRET` to GitHub repo secrets

Ongoing deploy (CI handles this via `.github/workflows/deploy-api.yml`):
```bash
flyctl deploy --remote-only
```
Migrations run automatically via `release_command = "npx prisma migrate deploy"` in `fly.toml`.

## Cloudflare Workers deploy (web)

Prerequisites the user must complete once:
1. Generate Cloudflare API token (Workers:Edit + Zone:Edit on ritaro.dev)
2. `cd apps/web && wrangler secret put BACKEND_ORIGIN` → enter `https://crewmate-api.fly.dev`
3. `wrangler secret put CLOUDFLARE_SHARED_SECRET` → enter same value as Fly.io secret

Ongoing deploy (CI handles this via `.github/workflows/deploy-web.yml`):
```bash
cd apps/web && pnpm build && opennextjs-cloudflare build && wrangler deploy
```

## Smoke tests (run after any deploy)
```bash
curl -f https://crewmate.ritaro.dev                     # web placeholder
curl -f https://crewmate.ritaro.dev/api/healthz         # API via Worker proxy
curl -f https://crewmate.ritaro.dev/api/readyz          # API health + DB + Redis
# Direct Fly.io without secret → must 401
curl -I https://crewmate-api.fly.dev/healthz            # expect 401
```

## GitHub Secrets needed
- `FLY_API_TOKEN` — from `fly tokens create deploy`
- `CLOUDFLARE_API_TOKEN` — from Cloudflare Dashboard → API Tokens
- `CLOUDFLARE_SHARED_SECRET` — shared value between Worker and API

## Infrastructure reference
`infrastructure/terraform/` contains production-grade AWS IaC (ECS Fargate + RDS + ElastiCache + ALB) as a portfolio artifact. It is not applied to any live environment. To provision AWS infrastructure in a future phase, run `AWS_PROFILE=crewmate terraform -chdir=infrastructure/terraform apply`.
