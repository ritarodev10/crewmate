# Security Conventions

Applies to both `apps/api` (NestJS 11) and `apps/web` (Next.js 15). These are not generic recommendations — every rule here maps to something that exists or will exist in this codebase. When a rule references a class, decorator, env var, or file path, that is the exact name used in the project.

---

## 1. Authentication & Token Security

### Token Design

The auth system uses two tokens with distinct lifetimes and responsibilities:

**Access token** — short-lived, stateless.

- Signed with `JWT_ACCESS_SECRET` (minimum 64 characters — generate with `openssl rand -hex 64`)
- Expires in 15 minutes (`expiresIn: '15m'`)
- Payload shape:

```ts
interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: UserRole;     // 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'WORKER'
  operatorId: string;
  iat: number;
  exp: number;
}
```

- Never contains the user's password hash, PII beyond email, or any revenue/profit figure.

**Refresh token** — long-lived, stateful (revocable).

- Signed with `JWT_REFRESH_SECRET` (different secret from access — minimum 64 characters)
- Expires in 7 days (`expiresIn: '7d'`)
- A bcrypt hash of the token is stored in the `User.refreshTokenHash` column in PostgreSQL
- The plaintext token is never stored — only the hash
- This makes the token revocable: deleting or nulling the DB record invalidates the token regardless of its `exp`

### Cookie Configuration

Both access and refresh tokens are delivered as `httpOnly` cookies. They are never returned in the JSON response body.

```ts
// apps/api/src/auth/auth.service.ts — after successful login or refresh
res.cookie('crewmate_session', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000,           // 15 minutes in milliseconds
});

res.cookie('crewmate_refresh', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth/refresh',     // scoped to the refresh endpoint only
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});
```

`httpOnly: true` — the cookie is inaccessible to JavaScript. `document.cookie` cannot read it. This blocks XSS token theft.

`secure: true` in production — the cookie is only sent over HTTPS. On Railway, all traffic is HTTPS. In local dev this is `false` so `localhost` works without self-signed certs.

`sameSite: 'lax'` — blocks cross-origin POST requests (standard CSRF protection) while allowing navigation-triggered GETs (clicking a link to the app). `'strict'` would break OAuth redirects and third-party link navigation.

`path: '/api/v1/auth/refresh'` for the refresh cookie — the browser only sends this cookie to that specific path. It is not sent on every API request, limiting exposure.

`maxAge` — always explicit. Never use `expires` (absolute date). `maxAge` is relative and survives system clock skew.

### Storage Rule

Never store tokens in `localStorage` or `sessionStorage`. Both are readable by any JavaScript on the same origin. An XSS vulnerability anywhere on the page — even a third-party script — can exfiltrate all values from storage. `httpOnly` cookies are not reachable from JavaScript even if XSS occurs.

This rule applies to the WebSocket token as well. The socket connection in `apps/web/src/lib/socket.ts` reads the access token from the in-memory session (set by the Server Action login flow), not from `localStorage`.

### Refresh Token Rotation

Every call to `POST /api/v1/auth/refresh` must:

1. Read the `crewmate_refresh` cookie
2. Verify the JWT signature and expiry
3. Look up the user record and bcrypt-compare the incoming token against `User.refreshTokenHash`
4. If the hash does not match, the token has already been rotated — disconnect the session (null out `refreshTokenHash`, delete both cookies, return `401`)
5. If it matches, issue a new access token **and** a new refresh token
6. Store the bcrypt hash of the new refresh token in the DB
7. Set both new cookies in the response

Step 4 is the theft-detection mechanism. If an attacker steals a refresh token and uses it, the next legitimate use by the real user fails the hash check. The session is immediately invalidated for everyone.

### Logout

Logout (`POST /api/v1/auth/logout`) must do both:

1. Set both cookies with `maxAge: 0` to delete them from the browser
2. Null out `User.refreshTokenHash` in the database

Doing only one of these leaves a valid token reusable until its natural expiry.

---

## 2. Authorization — RBAC

### Guard Execution Order

In `AppModule`, guards are registered in this order:

```ts
// apps/api/src/app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },     // runs first
  { provide: APP_GUARD, useClass: RolesGuard },       // runs second
  { provide: APP_FILTER, useClass: HttpExceptionFilter },
],
```

`JwtAuthGuard` validates the JWT and populates `request.user`. `RolesGuard` reads `request.user.role` and checks it against the `@Roles()` metadata. If `JwtAuthGuard` is removed or bypassed, `RolesGuard` has no user to check — it will pass everything. Never assume `RolesGuard` alone is sufficient protection.

Public routes are marked with `@Public()` on the handler:

```ts
// apps/api/src/auth/auth.controller.ts
@Public()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

The `@Public()` decorator sets a metadata flag that `JwtAuthGuard` reads before attempting verification. Every other route — including routes with no `@Roles()` decorator — requires a valid JWT.

### Roles Decorator

Every protected endpoint that is not accessible to all authenticated users must declare its allowed roles explicitly:

```ts
// Good — roles declared explicitly
@Roles(UserRole.MANAGER, UserRole.SUPER_ADMIN)
@Delete(':id')
async revokeJob(...) { ... }

// Bad — missing @Roles() means any authenticated role can reach this endpoint
@Delete(':id')
async revokeJob(...) { ... }
```

If a route is intentionally accessible to all authenticated roles (e.g., `GET /jobs/:id` for a worker reading their own job), document that intent with a comment. Do not leave `@Roles()` off silently.

### RBAC Matrix

| Endpoint | SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER |
|---|---|---|---|---|
| `POST /auth/login` | open | open | open | open |
| `POST /auth/refresh` | open | open | open | open |
| `POST /auth/logout` | yes | yes | yes | yes |
| `GET /dashboard/summary` | yes | yes | team-scoped | no |
| `GET /dashboard/activity` | yes | yes | team-scoped | no |
| `GET /jobs` | yes | yes | team-scoped | own jobs only |
| `GET /jobs/:id` | yes | yes | team-scoped | own job only |
| `POST /jobs` | yes | yes | no | no |
| `PATCH /jobs/:id/status` | yes | yes | yes (own team) | yes (own job) |
| `PATCH /jobs/:id/progress` | yes | yes | yes (own team) | yes (own job) |
| `PATCH /jobs/:id/cancel` | yes | yes | no | no |
| `GET /workers` | yes | yes | team only | no |
| `GET /workers/:id` | yes | yes | team only | own record |
| `GET /workers/:id/earnings` | yes | yes | team only | own record |
| `GET /revenue` | yes | yes | no | no |
| `GET /search` | yes | yes | scoped (no customers) | no |
| `POST /demo/reset` | yes | no | no | no |

"Scoped" enforcement is row-level and happens in the service layer, not the guard. The guard handles column-level access (can this role reach this route at all). The service handles row-level access (can this user see this specific record).

### `OperatorScopeInterceptor` — Multi-Tenant Isolation

`OperatorScopeInterceptor` is the primary multi-tenant isolation layer. It runs on every request and ensures `operatorId` from the JWT payload is available in the request context. Every Prisma query against a multi-tenant model (`Job`, `Worker`, `Team`, `TeamMember`, `Customer`, `JobStatusEvent`, `JobType`) must include `where: { operatorId }`.

```ts
// Good — operatorId always comes from the JWT, never from the request body
@Get()
async listJobs(@CurrentUser() user: JwtPayload): Promise<PaginatedResponse<JobSummary>> {
  return this.jobsService.listJobs(user.operatorId, user.role, user.sub);
}

// Bad — operatorId from request body is attacker-controlled
@Get()
async listJobs(@Body('operatorId') operatorId: string) {
  return this.jobsService.listJobs(operatorId);
}
```

A user who crafts a request with a different `operatorId` in the body cannot escalate to another tenant's data because the service only receives the `operatorId` from `@CurrentUser()`.

### 404 vs 403 for Cross-Tenant Resources

When a valid UUID is requested but belongs to a different operator, return `404 Not Found`, not `403 Forbidden`. Returning `403` reveals that the resource exists. Returning `404` leaks nothing:

```ts
// apps/api/src/jobs/jobs.service.ts
const job = await this.prisma.job.findFirst({
  where: { id: jobId, operatorId },  // operatorId scope baked into the query
});

if (!job) {
  throw new JobNotFoundError(jobId);  // maps to 404 — doesn't distinguish "wrong tenant" from "doesn't exist"
}
```

---

## 3. Input Validation & Injection Prevention

### Global `ValidationPipe`

Configured in `apps/api/src/main.ts`:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // strip properties not in the DTO
    forbidNonWhitelisted: true, // return 400 if unknown properties are sent
    transform: true,            // coerce query params to their declared types
  }),
);
```

`whitelist: true` alone strips unknown fields silently. `forbidNonWhitelisted: true` additionally rejects the request with a `400`. Use both together — silently stripping is better than crashing, but rejecting unknown fields helps catch misformed requests early.

`transform: true` coerces query params from `string` (all URL params arrive as strings) to the type declared on the DTO. Without this, `@IsInt()` on a query DTO will always fail because the value arrives as `"42"` not `42`.

### DTO Validation Examples

```ts
// apps/api/src/jobs/dto/update-job-progress.dto.ts
import { IsIn } from 'class-validator';

export class UpdateJobProgressDto {
  @IsIn([0, 25, 50, 75, 100])
  progressPct: number;
}
```

```ts
// apps/api/src/jobs/dto/cancel-job.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { CancelCode } from '@api/common/types';

export class CancelJobDto {
  @IsEnum(CancelCode)
  cancelReasonCode: CancelCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReasonNote?: string;
}
```

```ts
// apps/api/src/jobs/dto/list-jobs.dto.ts
import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListJobsDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  worker?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
```

Never validate inline in the controller body or service. All validation belongs in DTOs with `class-validator` decorators.

### Prisma — Parameterized Queries by Default

Prisma's query builder (`findMany`, `findFirst`, `create`, `update`, `delete`) always uses parameterized queries. User input passed to these methods is never interpolated into SQL — it is bound as a parameter. This is the default behavior and requires no special handling.

The one dangerous method is `prisma.$queryRaw`. If raw SQL is ever needed, use the tagged template literal form:

```ts
// Good — Prisma.sql is a tagged template that parameterizes values automatically
const result = await this.prisma.$queryRaw<Row[]>(
  Prisma.sql`SELECT id, name FROM "Customer" WHERE "operatorId" = ${operatorId} LIMIT ${limit}`
);

// Banned — string concatenation creates SQL injection
const result = await this.prisma.$queryRaw(`SELECT * FROM "Job" WHERE id = '${jobId}'`);
```

`prisma.$queryRawUnsafe()` is banned outright. There is no use case in this codebase that requires it. If you encounter a review comment requesting it, escalate — it is not a valid pattern here.

### URL Parameter Ownership Checks

A valid CUID in a URL param (`:id`) does not prove the requesting user has access to that resource. Always verify ownership in the service before returning data:

```ts
// apps/api/src/workers/workers.service.ts
async getWorkerEarnings(workerId: string, operatorId: string, requestingUserId: string, requestingRole: UserRole) {
  const worker = await this.prisma.worker.findFirst({
    where: { id: workerId, operatorId },  // operatorId scopes this automatically
  });

  if (!worker) throw new WorkerNotFoundError(workerId);

  // Additional row-level check for WORKER role: can only read own record
  if (requestingRole === 'WORKER' && worker.userId !== requestingUserId) {
    throw new WorkerNotFoundError(workerId);  // 404, not 403 — don't leak existence
  }

  // ... return earnings
}
```

---

## 4. HTTP Security Headers (Backend)

Install `helmet` (the NestJS-compatible version ships with `@nestjs/common` — the underlying package is `helmet`):

```ts
// apps/api/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,                          // CSP is managed at the Cloudflare edge
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudflare Workers to proxy assets
    }),
  );

  app.enableCors({
    origin: process.env.WEB_URL,  // e.g. https://crewmate.ritaro.dev — never '*'
    credentials: true,            // required for cookie transport
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');
  // ... rest of bootstrap
}
```

`origin: process.env.WEB_URL` — only the Cloudflare Workers frontend domain is allowed. Any cross-origin request from another domain is rejected before it reaches a route handler. Never set `origin: '*'` — that would allow any origin to make credentialed requests (cookies would still be blocked by same-origin policy, but it removes an important defense layer).

`credentials: true` — required for the browser to send the `crewmate_session` cookie on cross-origin requests from `apps/web` to `apps/api`. Without this, cookies are silently dropped.

### Headers Set by Helmet

| Header | Value | What it protects |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing responses. Without this, a server returning `text/plain` that contains JavaScript could be executed in older browsers. |
| `X-Frame-Options` | `DENY` | Prevents this app from being embedded in an `<iframe>`. Eliminates clickjacking attacks where an attacker renders the app invisibly over their own page. |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | Tells browsers to only connect over HTTPS for the next 180 days. Prevents SSL stripping attacks. Railway enforces HTTPS already, but HSTS additionally protects against MitM during the initial connection. |
| `X-XSS-Protection` | `0` | Disables the browser's built-in XSS auditor. This is intentional — the auditor has caused false positives and can be exploited. Modern XSS protection belongs in a proper CSP, not this header. |
| `Referrer-Policy` | `no-referrer` | Prevents the `Referer` header from leaking the full URL (including query params that may contain IDs) when navigating to external sites. |

---

## 5. Rate Limiting

Use `@nestjs/throttler` with a Redis store so limits survive pod restarts and scale across multiple Railway instances:

```ts
// apps/api/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [
      { name: 'default', ttl: 60_000, limit: 100 },  // 100 req/min per IP
      { name: 'auth',    ttl: 60_000, limit: 5 },    // 5 req/min per IP
    ],
    storage: new ThrottlerStorageRedisService(redis), // redis = ioredis client from RedisModule
  }),
}),
```

Apply the `auth` throttle profile to the login and refresh endpoints:

```ts
// apps/api/src/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Public()
@Throttle({ auth: { limit: 5, ttl: 60_000 } })
@Post('login')
async login(@Body() dto: LoginDto) { ... }

@Public()
@Throttle({ auth: { limit: 5, ttl: 60_000 } })
@Post('refresh')
async refresh(@Req() req: Request) { ... }
```

5 login attempts per minute per IP is the practical limit for legitimate users (a human typing their password) while still blocking automated brute-force tools that can attempt thousands per second.

The demo reset endpoint gets its own limit to prevent accidental or malicious rapid-fire resets during a live demo:

```ts
// apps/api/src/demo/demo.controller.ts
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Post('reset')
@Roles(UserRole.SUPER_ADMIN)
async resetDemo(@CurrentUser() user: JwtPayload) { ... }
```

The `APP_GUARD` for throttling is registered globally alongside `JwtAuthGuard` and `RolesGuard`. It runs before route handlers.

---

## 6. Secrets & Environment Variables

### Required Backend Variables (`apps/api/.env`)

| Variable | Purpose | Minimum length / format |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway provides this) | — |
| `REDIS_URL` | Redis connection string for throttler and session store | — |
| `JWT_ACCESS_SECRET` | Signs access tokens | 64+ chars (`openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | Signs refresh tokens — must differ from access secret | 64+ chars (`openssl rand -hex 64`) |
| `CLOUDFLARE_SHARED_SECRET` | Validated by `CloudflareSecretGuard` on all non-public routes | 32+ random chars |
| `WEB_URL` | Allowed CORS origin; the Cloudflare Workers domain | e.g. `https://crewmate.ritaro.dev` |
| `NODE_ENV` | Controls cookie `secure` flag and logging | `production` on Railway |

### Required Frontend Variables (`apps/web/.env.local`)

| Variable | Purpose | Client-exposed? |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for API calls and WebSocket connection | Yes — intentionally public |

`NEXT_PUBLIC_*` variables are inlined into the JavaScript bundle by Next.js at build time. Any variable with this prefix is readable by anyone who views the page source. The only variable that should ever carry this prefix is `NEXT_PUBLIC_API_URL` because the API URL is not a secret — it must be known to make requests from the browser.

Never add `NEXT_PUBLIC_JWT_SECRET`, `NEXT_PUBLIC_CLOUDFLARE_SECRET`, `NEXT_PUBLIC_DATABASE_URL`, or any similar variable. Doing so exposes the secret to every visitor.

### Startup Validation

All required env vars are validated at application startup using Zod in `apps/api/src/config/config.module.ts`. The app must not start with missing or malformed secrets — a misconfigured Railway deployment should fail fast during boot rather than serve partial functionality:

```ts
// apps/api/src/config/config.module.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  CLOUDFLARE_SHARED_SECRET: z.string().min(32),
  WEB_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${result.error.toString()}`);
  }
  return result.data;
}
```

`validateEnv` is passed to `ConfigModule.forRoot({ validate: validateEnv })` in `AppModule`.

### Secret Rotation

`CLOUDFLARE_SHARED_SECRET` and both JWT secrets can be rotated by updating the Railway environment variable and redeploying. No code change is required. After rotating:

- All existing access tokens are immediately invalidated (new secret, existing signatures no longer verify)
- All existing refresh tokens are invalidated (same reason)
- Users must log in again — this is intentional and acceptable for a security rotation

Document rotations in the Railway deployment history. Do not rotate silently.

---

## 7. Frontend Security (Next.js)

### XSS Prevention

React escapes all JSX text content and attribute values by default. `<p>{userInput}</p>` where `userInput = '<script>alert(1)</script>'` renders as the literal string, not as a script tag.

`dangerouslySetInnerHTML` is forbidden in this codebase. It opts out of React's escaping and injects raw HTML into the DOM. The only allowed exception is Mapbox popup content on the dashboard map — if a popup must render HTML (e.g., to include a formatted address), sanitize with `DOMPurify` before injecting:

```ts
// apps/web/src/app/(app)/dashboard/_components/map-view.tsx
import DOMPurify from 'dompurify';

// Good — sanitize before injecting
const popupHtml = DOMPurify.sanitize(
  `<strong>${job.customerName}</strong><br/>${job.addressLine}`
);
new mapboxgl.Popup().setHTML(popupHtml).addTo(map);

// Banned everywhere else
<div dangerouslySetInnerHTML={{ __html: unsanitizedContent }} />
```

If a new UI element seems to require `dangerouslySetInnerHTML`, find another approach (render it as React nodes, use a markdown library that sanitizes, etc.).

### CSRF

Not a concern for this app's API calls. The API authenticates via JWT bearer token in the `Authorization` header (or the `crewmate_session` httpOnly cookie validated by `JwtAuthGuard`). The `sameSite: 'lax'` cookie flag blocks cross-origin POST requests from sending the cookie. The `x-cloudflare-secret` header provides an additional per-request check that cross-origin attackers cannot forge. No additional CSRF token is needed.

### Console Logging of Sensitive Data

Never log JWT tokens, user PII (email, name), or financial figures (`clientCharge`, `platformProfit`, `profitMarginPct`) to `console.log` in production. Use a development guard:

```ts
// Good
if (process.env.NODE_ENV === 'development') {
  console.log('Auth response:', authData);
}

// Bad — logs token in production
console.log('Login success, token:', accessToken);
```

Any console statement that touches auth state or revenue data must be behind this guard. TanStack Query's `onError` can log API error codes without logging the full response body.

### Middleware JWT Verification

The Next.js middleware at `apps/web/src/middleware.ts` checks the `crewmate_session` cookie on every `(app)` route and every `worker` route. The cookie value must be **verified** (signature checked against `JWT_ACCESS_SECRET`), not merely decoded.

Decoding without verification means an attacker can craft a JWT with any payload and bypass the middleware check by simply changing the `role` field to `MANAGER`. Verification checks the HMAC signature — a JWT with a tampered payload will have an invalid signature and fail.

```ts
// apps/web/src/middleware.ts
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('crewmate_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    const { payload } = await jwtVerify(token, secret); // throws if signature invalid or expired
    // proceed with payload.role for routing decisions
  } catch {
    // expired, tampered, or malformed — treat as unauthenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

The `jose` library is the correct choice for Edge Runtime (Cloudflare Workers) because it is Web Crypto API based and does not use Node.js `crypto` module. `jsonwebtoken` will not work in the Cloudflare Workers edge runtime.

Note: the middleware JWT check is a routing gate, not the authoritative auth check. The API (`JwtAuthGuard`) performs the definitive check on every request. If middleware is misconfigured or bypassed, no protected API data is exposed because the API re-validates independently.

### Open Redirect Prevention

The login Server Action in `apps/web/src/app/(auth)/login/_actions.ts` must not redirect to an arbitrary `?redirect=` query parameter after successful authentication. An open redirect allows phishing attacks where the victim is sent to a legitimate-looking login URL that then redirects to an attacker's site.

After login, redirect to a destination from this allowlist only:

```ts
// apps/web/src/app/(auth)/login/_actions.ts
const ALLOWED_REDIRECT_DESTINATIONS = ['/dashboard', '/worker'] as const;
type AllowedRedirect = (typeof ALLOWED_REDIRECT_DESTINATIONS)[number];

function getSafeRedirectPath(role: UserRole, requestedPath?: string): AllowedRedirect {
  const roleDefaults: Record<UserRole, AllowedRedirect> = {
    SUPER_ADMIN: '/dashboard',
    MANAGER: '/dashboard',
    TEAM_LEAD: '/dashboard',
    WORKER: '/worker',
  };

  // Only honor the requested path if it's in the allowlist AND matches the user's role
  if (
    requestedPath &&
    ALLOWED_REDIRECT_DESTINATIONS.includes(requestedPath as AllowedRedirect)
  ) {
    return requestedPath as AllowedRedirect;
  }

  return roleDefaults[role];
}
```

Never do `redirect(searchParams.get('next') ?? '/dashboard')` without this check.

---

## 8. WebSocket Security

### Connection Authentication

JWT verification happens in `handleConnection` in `apps/api/src/ws/events.gateway.ts`. The client passes the access token in `socket.auth.token`. If the token is absent, expired, or invalid, the connection is closed immediately:

```ts
// apps/api/src/ws/events.gateway.ts
handleConnection(client: Socket): void {
  const token = client.handshake.auth.token as string | undefined;

  if (!token) {
    client.disconnect();
    return;
  }

  try {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    client.data.operatorId = payload.operatorId;
    client.data.userId = payload.sub;
    void client.join(`operator:${payload.operatorId}`);
  } catch {
    client.disconnect();  // expired, tampered, or malformed
  }
}
```

The WebSocket connection uses the same `JWT_ACCESS_SECRET` as the REST API. Reconnection with a new token is the client's responsibility when the access token expires. The frontend's `getSocket()` in `apps/web/src/lib/socket.ts` should detect disconnect events and reinitiate the connection with a refreshed token.

### Room Isolation

All server-to-client events are emitted to the `operator:{operatorId}` room:

```ts
// events.gateway.ts
emit<T extends WsEventName>(operatorId: string, event: T, payload: WsEventPayload[T]): void {
  this.server.to(`operator:${operatorId}`).emit(event, payload);
}
```

A client from OperatorA (room `operator:op-001`) never receives events intended for OperatorB (room `operator:op-002`). The room name is derived from the verified JWT payload — the client cannot forge it.

Never use `this.server.emit()` (broadcast to all) or `socket.broadcast.emit()` in a domain event. These bypass room isolation.

### Connection Limits

Configure Socket.io with conservative limits to prevent resource exhaustion:

```ts
// apps/api/src/ws/events.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL,
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket'],          // disable long-polling — reduces attack surface
  maxHttpBufferSize: 1e6,             // 1 MB max message size
  pingTimeout: 60_000,               // 60s before considering a connection dead
  pingInterval: 25_000,              // ping every 25s to keep connection alive
})
```

`maxHttpBufferSize: 1e6` caps each incoming message at 1 MB. Without this, a client can send an arbitrarily large payload that ties up memory and CPU. In practice, this app's gateway is listen-only (`handleConnection` and `handleDisconnect` only — no `@SubscribeMessage` handlers for domain events), so the limit is a safeguard against unexpected messages.

### What Is Never Emitted

The following data is never emitted in WebSocket events regardless of the requesting client's role:

- Revenue figures (`clientCharge`, `platformProfit`, `profitMarginPct`)
- Worker hourly rates (`workerHourlyRate`)
- Full customer PII (only `lat`/`lng` needed for map updates)
- Refresh tokens or access tokens

These fields are only available via REST endpoints that enforce `@Roles()` at the route level. The four defined event payloads in `apps/api/src/ws/events.types.ts` (`JobStatusChangedPayload`, `JobProgressUpdatedPayload`, `JobCancelledPayload`, `WorkerStatusChangedPayload`) contain no financial data.

---

## 9. CloudflareSecretGuard

`CloudflareSecretGuard` is registered globally and validates the `x-cloudflare-secret` header on all non-public routes. It ensures that requests reaching the Railway API have been proxied through the Cloudflare Workers frontend — direct requests to the Railway API URL without this header are rejected.

```ts
// apps/api/src/common/guards/cloudflare-secret.guard.ts
@Injectable()
export class CloudflareSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = request.headers['x-cloudflare-secret'];

    if (secret !== process.env.CLOUDFLARE_SHARED_SECRET) {
      throw new UnauthorizedException('Missing or invalid Cloudflare secret');
    }
    return true;
  }
}
```

The `apps/web` Cloudflare Worker injects this header on every outbound fetch to the API. The header value is stored in `CLOUDFLARE_SHARED_SECRET` (backend env var) and in the Cloudflare Worker's secret store (not a `NEXT_PUBLIC_*` variable — it is never exposed to the browser).

When testing locally, set `CLOUDFLARE_SHARED_SECRET` in `apps/api/.env` and include the header in requests from `apps/web/.env.local` (as a non-public server-side env var consumed only by Server Actions and Route Handlers).

Public routes (marked with `@Public()`) skip `CloudflareSecretGuard` in addition to `JwtAuthGuard`.

---

## 10. Demo-Specific Security Notes

### Demo Reset Endpoint

`POST /api/v1/demo/reset` re-seeds job and jobStatusEvent data. It must be protected:

```ts
// apps/api/src/demo/demo.controller.ts
@Post('reset')
@Roles(UserRole.SUPER_ADMIN)  // only SUPER_ADMIN can reset
@Throttle({ default: { limit: 10, ttl: 60_000 } })
async resetDemo(@CurrentUser() user: JwtPayload): Promise<void> {
  await this.demoService.resetDemoData();
}
```

`JwtAuthGuard` and `RolesGuard` apply globally — the `@Roles()` decorator is sufficient. Do not mark this route `@Public()`.

### Demo Actor Switcher

The demo actor switcher sets a `demo_actor` cookie to change which user persona is active in the UI (MANAGER, TEAM_LEAD, WORKER views). This cookie is handled entirely in the Next.js middleware for routing decisions and in `apps/web` for UI state.

The `demo_actor` cookie value is never forwarded to the NestJS API as an identity claim. The API always validates the real `crewmate_session` JWT. If a user sets `demo_actor` to `MANAGER` while their real JWT says `WORKER`, the API rejects any MANAGER-only request with `403`.

The actor switch is a portfolio demo UX feature, not an auth bypass.

### Demo Credentials

Seed users use the password `demo1234`. This is intentionally weak for demo accessibility. Acceptable trade-offs for a portfolio demo:

- The app is on a publicly accessible URL — anyone can log in
- The database contains synthetic data only — no real user PII or financial data
- Rate limiting (5 login attempts/min per IP) still applies

Document this clearly if the project is reviewed: the weak password is a deliberate demo choice, not a security oversight.

---

## 11. Security Anti-Patterns Reference

| Anti-pattern | Location risk | Correct approach |
|---|---|---|
| `prisma.$queryRawUnsafe(userInput)` | SQL injection | Use `Prisma.sql` tagged template with `prisma.$queryRaw` |
| String interpolation in `$queryRaw` | SQL injection | Same — use `Prisma.sql` |
| `operatorId` from `@Body()` | Tenant data leak to other operators | Read only from `@CurrentUser()` → JWT payload |
| `dangerouslySetInnerHTML` without `DOMPurify` | XSS | Forbidden; use `DOMPurify.sanitize()` for the Mapbox popup exception |
| Token in `localStorage` or `sessionStorage` | XSS-readable token theft | `httpOnly` cookie only — set server-side in `auth.service.ts` |
| `NEXT_PUBLIC_JWT_SECRET` or `NEXT_PUBLIC_CLOUDFLARE_SECRET` | Secret bundled into client JS | Never use `NEXT_PUBLIC_` prefix for secrets |
| `cors({ origin: '*' })` | Allows any origin to make credentialed requests | `origin: process.env.WEB_URL` — explicit single origin |
| No rate limit on `POST /auth/login` | Unlimited brute-force attempts | `@Throttle({ auth: { limit: 5, ttl: 60_000 } })` |
| Redirect to `?next=searchParams.get('next')` | Open redirect to attacker-controlled URL | Validate against `ALLOWED_REDIRECT_DESTINATIONS` allowlist |
| `jwtDecode()` in middleware without verification | Tampered payload accepted as valid | Use `jwtVerify()` from `jose` — checks HMAC signature |
| `RolesGuard` without `JwtAuthGuard` | Any unauthenticated request passes role check | Both guards must be active — `JwtAuthGuard` populates `request.user` |
| `this.server.emit(event, payload)` in gateway | Broadcasts financial/operational data to all operators | `this.server.to('operator:{id}').emit()` — room-scoped only |
| Logout without nulling `refreshTokenHash` | Refresh token remains valid after logout | Always null DB hash AND delete cookies |
