# Security

The MVP is not exempt. Auth, tenant scoping, and input validation are wired from day one.

> **See also.** [`09-RBAC.md`](./09-RBAC.md) is the deep-dive on authorization. Role hierarchy, resource scoping, policy-based ABAC, the permission matrix, audit logging, and how repositories enforce scope. This file covers transport-level security and tenant isolation, that one covers "who can do what".

## Authentication

- Stateless JWT issued by `AuthService` after a password login.
- Access token TTL short (15 minutes). Refresh token TTL longer (7 to 30 days), stored hashed in the DB, rotated on use.
- Algorithm. RS256 in production (JWKS-friendly), HS256 acceptable for the MVP if `JWT_SECRET` is at least 32 bytes.
- Tokens carry only what guards need. `sub` (user id), `operatorId`, `roles`, `iat`, `exp`. No PII.

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
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

## Authorization layers

Three layers, in order.

1. `JwtAuthGuard`. Authenticates the token.
2. `TenantGuard`. Resolves the operator and writes it into `TenantContext`.
3. `RolesGuard`. Checks `@Roles(...)` metadata against `actor.roles`.

```ts
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  @Post()
  @Roles(Role.COORDINATOR, Role.ADMIN)
  async create(...) { ... }
}
```

Rules.

- Default-deny. A route without `@Public()` is authenticated.
- Default-restrictive on roles. A route without `@Roles(...)` is admin-only.
- Cross-tenant access (a platform admin viewing across operators) is a separate route family under `/v1/admin/*` with its own guard.

## Tenant isolation

- Every tenant-scoped Prisma query includes `tenantId`. Lint rule, code review, and tests enforce.
- A repository never receives a raw `where` clause from a controller. The repository owns the tenant constraint.
- "Not found" wins over "forbidden". A request for a resource that belongs to another tenant returns 404, never 403, so existence does not leak.

## Input validation

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Every DTO field has at least one validator. Missing decorators on a DTO field are a review block.
- File uploads validate mimetype, size, and dimensions before any processing.
- Query strings are also DTOs, validated the same way.

## Secrets

- All secrets read through `ConfigService`. No `process.env` outside `core/config`.
- `.env` is gitignored. `.env.example` is committed with placeholder values and inline documentation.
- Production secrets live in the deployment platform's secret store (Doppler, AWS Secrets Manager, Vault). Never in code, never in CI logs.
- A secret rotation runbook lives in `docs/runbooks/secret-rotation.md`.

## Password storage

- Argon2id with sensible defaults (`memory >= 19MiB`, `iterations >= 2`, `parallelism = 1`).
- bcrypt is acceptable if Argon2id is unavailable.
- Never log a password, even hashed.

## Rate limiting

- `@nestjs/throttler` globally, with stricter limits on auth endpoints.
- Defaults. 60 requests per minute per IP on most routes. 5 per minute per IP on `POST /v1/auth/login`.
- Rate limit responses use `429` and include `Retry-After`.

## Webhooks (outgoing)

- Sign every outgoing webhook with an HMAC over the body, using a per-operator secret.
- Include `X-Webhook-Id`, `X-Webhook-Timestamp`, `X-Webhook-Signature` headers.
- Retries are bounded (5 attempts, exponential backoff) and the `webhook_deliveries` table records every attempt.
- Failed deliveries are visible to the operator in the dashboard.

## Inbound webhooks

When the app receives webhooks from third parties.

- Verify the signature before any processing.
- Reject requests older than 5 minutes based on the timestamp header.
- Persist the raw payload (or its hash) for idempotency.

## CORS

- Allowlist of origins, configured per environment.
- `credentials: true` only when needed.
- No `*` origin on authenticated endpoints, ever.

## Headers

- `helmet` enabled with sensible defaults.
- `Strict-Transport-Security` in production.
- `X-Frame-Options: DENY` (the API is not embedded).

## Logging and PII

- Request logger redacts known sensitive fields (`password`, `token`, `authorization`, `cookie`).
- Application logs do not contain raw request bodies.
- Audit logs (who did what) are separate from application logs and retained longer.

## Dependency hygiene

- `pnpm audit` runs in CI. High and critical findings block merge.
- Renovate (or Dependabot) keeps dependencies fresh.
- Pin direct dependencies. Use a lockfile in commits.

## Security review checklist for new endpoints

Before merging a new endpoint, the PR description confirms each.

- [ ] Authentication required (`JwtAuthGuard`) unless explicitly `@Public()`.
- [ ] Tenant scoped (`TenantGuard` + repository includes `tenantId`).
- [ ] Authorized by role (`@Roles(...)`).
- [ ] Input validated (DTO + `ValidationPipe`).
- [ ] Output mapped through a response DTO (no entity leak).
- [ ] Errors return the right status code, never leak existence across tenants.
- [ ] Rate limited if it can be abused.
- [ ] e2e test covers the happy path and at least one auth failure.
