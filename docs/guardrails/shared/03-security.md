# Security

v0.1 security guardrails. Only what actually ships to crewmate.ritaro.dev and matters for a portfolio. Scope is bounded by `docs/FEATURES.md`. Authorization (roles, scope, policies, audit) lives in `./04-rbac.md`. This file is transport, secrets, tokens, webhooks, and tenant isolation.

> **See also.** [`./04-rbac.md`](./04-rbac.md) for the four-layer RBAC model, custom roles (F-012), per-grant scope (F-013), policy evaluator (F-014), and audit log (F-015 / F-016).

## Threats this chapter addresses

Four obvious threats. The controls below map directly to them.

- **Cross-tenant data leak.** A request authenticated for operator A reaches data owned by operator B. Addressed by the tenant-scoped Prisma extension (F-001) and the repository pattern (F-111), plus the "not found wins over forbidden" rule.
- **Credential theft.** Stolen passwords or stolen tokens. Addressed by Argon2id hashing (F-002), short-lived access tokens with httpOnly cookies (F-003), and 2FA via TOTP (F-005).
- **Replayed refresh tokens.** An attacker uses an old refresh token after the legitimate user has rotated. Addressed by hashed refresh tokens with `family_id` and replay-detection that revokes the entire family (F-004).
- **Unsigned webhook spoof.** A third party forges an event POST to a tenant's endpoint. Addressed by HMAC SHA-256 signing with a per-endpoint secret and a timestamped signature header (F-061).

Anything beyond these four is either out of scope for v0.1 (see the last section) or covered by a different chapter.

## Authentication

- Stateless JWT issued by `AuthService` after a password login (F-002).
- Access token TTL 15 minutes. Refresh token TTL 7 days (F-003). Both signed with separate secrets pulled from AWS Secrets Manager in production.
- Tokens carry only what guards need. `sub` (user id), `operatorId`, `roles`, `iat`, `exp`. No PII.
- The web app stores both tokens in httpOnly cookies (F-003). JavaScript never reads the token. CSRF posture is documented below.

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.['cm_at'] ?? null,
      ]),
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload): ActorContext {
    return {
      userId: payload.sub,
      operatorId: payload.operatorId,
      roles: payload.roles,
    };
  }
}
```

## Password storage

Argon2id with the parameters fixed in F-002.

| Parameter | Value |
|---|---|
| Algorithm | Argon2id |
| Memory cost | 64 MB |
| Iterations | 3 |
| Parallelism | 1 |

The argon2 library reads these as `{ type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 }`. Do not lower them for any reason short of a measured production hot spot, in which case raise the question in a PR and re-benchmark.

Passwords are never logged, never echoed in API responses, never included in error messages.

## Refresh-token rotation

Per F-004. Refresh tokens live in a `refresh_tokens` table, hashed, with a `family_id`. On every refresh call the server issues a new token, marks the old one used, and links the new one to the same family. If a request presents an already-used token, the entire family is revoked, the user is forced to re-authenticate, and a `refresh.replay` row is written to `permission_audits`.

The cookie names are `cm_at` for access and `cm_rt` for refresh. Both `HttpOnly`, both `Secure` in production, both `SameSite=Lax` (see CSRF section). The refresh cookie path is scoped to `/v1/auth/refresh` so it is not sent on every API call.

## Tenant isolation

- Every tenant-scoped Prisma query carries `operatorId`. The Prisma client is wrapped in a tenant-scope extension that injects it; missing it throws. F-001 is the contract, F-111 is the implementation pattern.
- Repositories never receive a raw `where` clause from a controller. The repository owns the tenant constraint.
- "Not found" wins over "forbidden". A request for a resource that belongs to another tenant returns 404, never 403, so existence does not leak.

## Input validation

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Zod at the HTTP and WebSocket boundary per F-113. `class-validator` on the NestJS DTOs that hit the controller. Validation runs before any business logic.
- Every DTO field has at least one validator. Missing decorators on a DTO field are a review block.
- Query strings are also DTOs, validated the same way.

## Webhooks (outgoing)

Signing is the spine of F-061.

- Every outgoing webhook POST carries a `x-crewmate-signature: t=<ts>,v1=<sig>` header.
- `t` is a unix timestamp in seconds. `v1` is `HMAC_SHA256(secret, t + "." + rawBody)` hex-encoded.
- Consumers verify by recomputing the signature from the secret and the raw body, comparing in constant time, and rejecting requests where `now - t > 300` seconds.
- Each endpoint has its own signing secret. Generated on create. Shown to the operator exactly once via a one-time reveal in `/settings/webhooks`. Stored hashed at rest with the same Argon2id parameters as user passwords. Rotation is a single endpoint action that issues a new secret, shows it once, and invalidates the old one.

```ts
function sign(secret: string, body: string): string {
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', secret)
    .update(`${t}.${body}`)
    .digest('hex');
  return `t=${t},v1=${sig}`;
}
```

The deliveries log (F-063) shows the raw signed payload so an integrator can debug verification against a real request. The full payload of a delivered webhook is the operator's own outbound data and is safe to retain. Inbound payloads from third parties are out of scope for v0.1 (see the last section).

## Transport and edge

- TLS terminates at the ALB (F-120). ACM provides the certificate.
- CloudFront sits in front of the ALB. Default managed CloudFront protections are the floor. Anything beyond (custom WAF rules, IP allowlisting) is out of scope for v0.1.
- `Strict-Transport-Security` is set in production by the application. `helmet` is enabled with default headers.
- `X-Frame-Options: DENY` on the API. The API is not embedded.

## CORS

- Allowlist of origins, configured per environment via `WEB_ORIGIN`.
- `credentials: true` so the browser sends the httpOnly cookies.
- No `*` origin on authenticated endpoints, ever.

## CSRF

The web app uses httpOnly cookies for both access and refresh tokens (F-003). The v0.1 CSRF posture has three rules.

- All cookies set with `SameSite=Lax`. Modern browsers will not attach them on cross-site `POST`, `PUT`, `PATCH`, `DELETE` requests, which covers the realistic CSRF surface.
- The web origin is a single first-party domain (crewmate.ritaro.dev). No cross-subdomain auth.
- This is documented as "sufficient for v0.1". A double-submit cookie scheme is the future upgrade path if a second first-party origin is added.

No CSRF token middleware in v0.1. The rule above is the contract.

## Secrets

- All secrets read through `ConfigService`. No `process.env` outside `core/config`.
- `.env` is gitignored. `.env.example` is committed with placeholder values and inline documentation.
- Production secrets live in AWS Secrets Manager and are pulled into the ECS task environment at start (F-120). Never in code, never in CI logs.
- The redaction list. The following are never written to logs, error responses, audit rows, or any persisted artifact:
  - User passwords (plain or hashed)
  - JWT contents (the full token string and any decoded claims beyond `sub` and `operatorId`)
  - Webhook signing secrets (plain or hashed)
  - Full inbound payloads from third parties (record a hash for idempotency, not the body)
- The request logger redacts known sensitive fields (`password`, `token`, `authorization`, `cookie`, `x-crewmate-signature`) at the pino transport level so it cannot be bypassed by an upstream `logger.info(obj)` call.

## Rate limiting

> **TODO (deferred).** v0.1 does not ship application-level rate limiting. CloudFront and ALB defaults are the floor. A `@nestjs/throttler` config with stricter limits on `POST /v1/auth/login` and `POST /v1/auth/refresh` is the planned follow-up.

## Logging and PII

- Pino structured logs per F-114. Every line carries `requestId`, `tenantId`, `actorUserId` when available.
- Application logs do not contain raw request bodies.
- Audit logs (F-015, who did what) are separate from application logs and retained 90 days.

## Dependency hygiene

- GitHub Dependabot defaults are enabled on the repo. High and critical findings get a PR; the team triages on a normal review cadence.
- Lockfile (`pnpm-lock.yaml`) is committed. Direct dependencies are pinned.

## Security review checklist for new endpoints

Before merging a new endpoint, the PR description confirms each.

- [ ] Authentication required (`JwtAuthGuard`) unless explicitly `@Public()`.
- [ ] Tenant scoped (`TenantGuard` plus repository includes `operatorId`).
- [ ] Authorized by role (`@Roles(...)`) and, where relevant, scope (`@Scoped(...)`) and policy (`@Policy(...)`).
- [ ] Input validated (DTO + `ValidationPipe`, Zod at the boundary).
- [ ] Output mapped through a response DTO (no entity leak).
- [ ] Errors follow the contract in `backend/04-error-handling.md` and do not leak existence across tenants.
- [ ] Any new secret is added to `.env.example` and to AWS Secrets Manager.
- [ ] A test covers the happy path and at least one auth failure.

## What is intentionally not in v0.1 security

The portfolio scope is `docs/FEATURES.md`. The following are explicitly deferred and should not show up in code review feedback as missing.

- **WAF rules beyond CloudFront defaults.** No custom AWS WAF rule set. No managed rule subscriptions.
- **IP allowlisting.** No admin-only IP gates. No country blocks.
- **Automated dependency scanning beyond GitHub Dependabot defaults.** No Snyk, no `pnpm audit` CI gate, no SBOM generation.
- **Secret rotation jobs.** Manual rotation via AWS Secrets Manager is the v0.1 story. No scheduled Lambda, no rotation runbook drill.
- **Penetration tests, SOC 2, or any compliance framework.** Not in v0.1.
- **On-call paging, escalation matrices, runbooks.** CloudWatch alarms on `/readyz` exist per F-123. Beyond that is real-ops work and out of scope.
- **SLOs, SLAs, error budgets.** No availability target is published. The deploy is single-AZ per F-120.
- **Multi-region or HA failover.** Single region, single AZ.
- **Sentry, OpenTelemetry, status page.** Out per F-114 and the FEATURES.md out-of-scope table.

Anything in this list that becomes a real requirement gets added to `docs/FEATURES.md` first, then to this chapter.
