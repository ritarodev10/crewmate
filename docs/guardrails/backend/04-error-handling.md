# Error handling

Errors are part of the API contract. The wire shape, the status codes, the log lines, and the redaction list are all guardrails. A surprising error response is a bug, not a feature.

This chapter owns the API-side error machinery. Background-queue retries and outbox semantics live in `../shared/02-events.md`. Authorization deny semantics live in `../shared/04-rbac.md`. This file documents how those decisions surface on the wire and in logs.

## Wire shape

Every error response carries the same envelope. One shape across REST and GraphQL, one shape across 4xx and 5xx.

```json
{
  "error": {
    "code": "JOB_INVALID_TRANSITION",
    "message": "A job in status COMPLETED cannot transition to ASSIGNED.",
    "requestId": "01H8X2GZK4Q7P0M5N6V9YBQRST",
    "details": {
      "jobId": "7e2c...",
      "from": "COMPLETED",
      "to": "ASSIGNED"
    }
  }
}
```

The fields.

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | `string` | yes | Stable, SCREAMING_SNAKE_CASE. Clients switch on this. |
| `message` | `string` | yes | One human-readable sentence. Safe to render in the UI. Not localized server-side. |
| `requestId` | `string` | yes | ULID generated per request by the HTTP request-id middleware. Echoed in the `X-Request-Id` response header. |
| `details` | `Record<string, unknown>` | no | Safe, structured context. Never raw payloads, never secrets, never upstream response bodies. |

Rules.

- The `code` is the contract. Adding a new code is a non-breaking change. Renaming or removing a code is breaking and goes through a deprecation window.
- The `message` is human-readable English. The frontend can ignore it and look up its own copy by `code`, or it can render the message as-is in a generic toast.
- The `requestId` is non-optional. Every error response has one, even 500s. The same id appears in every log line for that request.
- `details` is optional and shallow. One level of nesting at most. If the client needs richer structure, define a richer code.

GraphQL errors carry the same shape under `extensions`.

```json
{
  "errors": [
    {
      "message": "A job in status COMPLETED cannot transition to ASSIGNED.",
      "extensions": {
        "code": "JOB_INVALID_TRANSITION",
        "requestId": "01H8X2GZK4Q7P0M5N6V9YBQRST",
        "details": { "jobId": "7e2c...", "from": "COMPLETED", "to": "ASSIGNED" }
      }
    }
  ]
}
```

## Exception hierarchy

Every domain throwable extends one root. The root extends `HttpException` so Nest's filter pipeline still works for any case the global filter does not catch first.

```ts
// core/errors/app.exception.ts
export type ErrorDetails = Record<string, unknown>;

export interface AppExceptionPayload {
  code: string;
  message: string;
  details?: ErrorDetails;
}

export class AppException extends HttpException {
  readonly code: string;
  readonly details?: ErrorDetails;

  constructor(payload: AppExceptionPayload, status: HttpStatus) {
    super({ code: payload.code, message: payload.message }, status);
    this.code = payload.code;
    this.details = payload.details;
  }
}
```

The major subclasses sit one level down. Each one fixes a default status and a default code. Specific cases extend further and override the code.

```ts
// core/errors/*.exception.ts
export class AuthException extends AppException {
  constructor(p: Partial<AppExceptionPayload> = {}) {
    super({ code: p.code ?? 'AUTH_REQUIRED', message: p.message ?? 'Authentication is required.', details: p.details }, HttpStatus.UNAUTHORIZED);
  }
}

export class AuthzException extends AppException {
  constructor(p: Partial<AppExceptionPayload> = {}) {
    super({ code: p.code ?? 'AUTHZ_DENIED', message: p.message ?? 'You do not have permission for this action.', details: p.details }, HttpStatus.FORBIDDEN);
  }
}

export class ValidationException extends AppException {
  constructor(details: { fields: Array<{ path: string; reason: string }> }) {
    super({ code: 'VALIDATION_FAILED', message: 'Request validation failed.', details }, HttpStatus.BAD_REQUEST);
  }
}

export class NotFoundException extends AppException {
  constructor(p: Partial<AppExceptionPayload> = {}) {
    super({ code: p.code ?? 'NOT_FOUND', message: p.message ?? 'Resource not found.', details: p.details }, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends AppException {
  constructor(p: Partial<AppExceptionPayload> = {}) {
    super({ code: p.code ?? 'CONFLICT', message: p.message ?? 'Conflicting state.', details: p.details }, HttpStatus.CONFLICT);
  }
}

export class RateLimitException extends AppException {
  constructor(retryAfterSeconds: number) {
    super({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.', details: { retryAfterSeconds } }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class IntegrationException extends AppException {
  constructor(p: Partial<AppExceptionPayload> = {}) {
    super({ code: p.code ?? 'UPSTREAM_FAILED', message: p.message ?? 'An upstream service failed.', details: p.details }, HttpStatus.BAD_GATEWAY);
  }
}
```

Specific cases extend the right parent.

```ts
// modules/jobs/errors/job-invalid-transition.exception.ts
export class JobInvalidTransitionException extends ConflictException {
  constructor(jobId: string, from: JobStatus, to: JobStatus) {
    super({
      code: 'JOB_INVALID_TRANSITION',
      message: `A job in status ${from} cannot transition to ${to}.`,
      details: { jobId, from, to },
    });
  }
}

// modules/jobs/errors/job-not-found.exception.ts
export class JobNotFoundException extends NotFoundException {
  constructor(jobId: string) {
    super({
      code: 'JOB_NOT_FOUND',
      message: 'Job not found.',
      details: { jobId },
    });
  }
}
```

Rules.

- A new domain exception always extends one of the six major subclasses. It does not extend `AppException` directly.
- The `code` lives on the subclass, hard-coded. Callers do not pass it.
- The `details` payload is shallow and safe. Use the type system to enforce the shape per subclass when it matters.

## Global exception filter

A single Nest filter sits at the app level. It is the only thing that writes the wire envelope. Controllers and services never serialize an error themselves.

```ts
// core/filters/app-exception.filter.ts
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  constructor(private readonly als: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const requestId = this.als.getRequestId() ?? req.headers['x-request-id'] ?? '00000000';

    const mapped = this.map(exception);

    this.log(mapped, exception, requestId, req);

    if (mapped.status === HttpStatus.TOO_MANY_REQUESTS || mapped.status === HttpStatus.SERVICE_UNAVAILABLE) {
      res.setHeader('Retry-After', String(mapped.retryAfter ?? 30));
    }
    res.setHeader('X-Request-Id', String(requestId));

    res.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        requestId,
        details: mapped.details,
      },
    });
  }

  private map(exception: unknown): MappedError {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        code: 'HTTP_ERROR',
        message: exception.message,
        details: undefined,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      details: undefined,
    };
  }

  private log(mapped: MappedError, raw: unknown, requestId: string, req: Request): void {
    const base = {
      requestId,
      code: mapped.code,
      status: mapped.status,
      path: req.originalUrl,
      method: req.method,
      tenantId: this.als.getTenantId(),
      userId: this.als.getUserId(),
    };
    if (mapped.status >= 500) {
      this.logger.error({ ...base, err: raw }, mapped.message);
    } else {
      this.logger.warn(base, mapped.message);
    }
  }
}
```

Rules.

- The filter is registered globally in `main.ts`. It is the last line of defense.
- Log level follows the status. `4xx` is `warn`, `5xx` is `error`. A 401 storm is suspicious but not a pager.
- `requestId` comes from the async-local-storage context (`RequestContextService`). The HTTP middleware that opens the ALS scope is documented in `00-nestjs.md` under request context [NEEDS: RequestContextService chapter cross-link].
- Unknown errors collapse to `INTERNAL_ERROR` with status 500. The original error is logged with `err` so pino's serializer captures the stack. The wire response never carries stack traces.

## The "fail closed" rule

Authorization denials throw. They never return a sanitized success, never return an empty list pretending the resource does not exist, never silently downgrade the operation.

```ts
if (!this.policy.canTransition(actor, job, target)) {
  throw new AuthzException({
    code: 'AUTHZ_DENIED',
    message: 'You cannot transition this job.',
    details: { jobId: job.id, reason: 'policy:JobTransitionPolicy' },
  });
}
```

The filter renders this as `403` with `code: AUTHZ_DENIED`. The audit interceptor described in `../shared/04-rbac.md` records the deny in the audit log before the response is sent.

The one exception is tenant-boundary checks. Returning 403 for "this resource belongs to another tenant" leaks existence. Those throw `NotFoundException` instead, with code `TENANT_BOUNDARY_VIOLATION`. The audit log records the original reason; the wire response is a plain 404.

## Domain error catalog

Every code the API emits is in this table. New codes are added here in the same PR that introduces them.

| Code | HTTP | Class | Thrown when | Client behavior |
|---|---|---|---|---|
| `AUTH_REQUIRED` | 401 | `AuthException` | No token, expired token, malformed token. | Redirect to login or refresh the token. |
| `AUTH_INVALID_CREDENTIALS` | 401 | `AuthException` | `POST /v1/auth/login` with wrong email or password. | Show invalid credentials copy. Do not reveal which field failed. |
| `AUTH_TOKEN_REVOKED` | 401 | `AuthException` | Refresh token has been rotated or revoked. | Force logout. |
| `AUTHZ_DENIED` | 403 | `AuthzException` | Policy evaluator returned false for an authenticated actor. | Show permission denied copy. Audit log already recorded the deny. |
| `VALIDATION_FAILED` | 400 | `ValidationException` | DTO validation pipe rejected the body or query. | Show field-level errors from `details.fields`. |
| `NOT_FOUND` | 404 | `NotFoundException` | Generic missing resource that has no domain-specific code. | Show generic not-found copy. |
| `JOB_NOT_FOUND` | 404 | `JobNotFoundException` | Lookup by id returned null inside the tenant scope. | Surface job-specific copy. |
| `TENANT_BOUNDARY_VIOLATION` | 404 | `NotFoundException` | Authenticated user accessed a resource owned by another tenant. | Render as 404 in the UI. Never as 403. |
| `JOB_INVALID_TRANSITION` | 409 | `JobInvalidTransitionException` | `canTransition(from, to)` returned false. | Show "this action is not available in the current state" copy. Refresh the job. |
| `CONFLICT` | 409 | `ConflictException` | Generic state conflict not covered by a specific code. | Refresh and retry on user input. |
| `UNIQUE_CONSTRAINT` | 409 | `ConflictException` | Prisma `P2002` mapped by `PrismaExceptionFilter`. | Show field-level "already exists" copy. |
| `RATE_LIMITED` | 429 | `RateLimitException` | `@nestjs/throttler` rejected the request. | Wait `Retry-After` seconds, then retry. |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | `AuthException` | Inbound webhook signature check failed. v0.1 has no inbound webhooks but the slot is reserved. | Caller is a third party. The wire shape still applies. |
| `UPSTREAM_FAILED` | 502 | `IntegrationException` | An external service call failed in a way that is not the client's fault. | Generic retry-later copy. |
| `UPSTREAM_TIMEOUT` | 504 | `IntegrationException` | An external call exceeded its deadline. | Generic retry-later copy. |
| `SERVICE_UNAVAILABLE` | 503 | `AppException` | A dependency (Redis, DB) is unreachable on a health-critical path. | Wait `Retry-After` seconds, then retry. |
| `INTERNAL_ERROR` | 500 | `AppException` (filter fallback) | An unexpected exception reached the global filter. | Generic error copy. Report the `requestId` to support. |

Codes follow `DOMAIN_NOUN_REASON` shape. New domain codes prefix the domain (`JOB_`, `WORKER_`, `WEBHOOK_`). Generic codes have no prefix.

## Retry semantics

What the API tells the client about retrying.

| Status | Retryable | Notes |
|---|---|---|
| 200, 201 | n/a | Success. |
| 400 | no | The client must fix the request. |
| 401 | conditionally | Retry once after refreshing the token. Then stop. |
| 403 | no | A retry will not help. |
| 404 | no | Resource is gone or out of scope. |
| 409 | conditionally | Refresh the resource and decide. |
| 429 | yes | Honor `Retry-After`. |
| 5xx | yes for idempotent reads, no for mutations in v0.1 | Exponential backoff on reads. |

Mutation retries are deferred. The v0.1 scale does not warrant replay protection at the API layer, so the client treats a 5xx on a mutation as fail-and-surface. See `docs/FEATURES.md` for the scope decision.

The filter sets `Retry-After` on `429` and `503` responses. On `5xx` responses where the cause is a recovered upstream, the filter does not promise a retry; the client decides.

BullMQ's own retry policy is documented in `00-nestjs.md` and `../shared/02-events.md`. This chapter only covers what the HTTP surface tells clients.

## Background jobs

Errors thrown inside a BullMQ worker do not reach the HTTP filter. A separate worker-level filter handles them.

```ts
// core/filters/worker-exception.filter.ts
@Injectable()
export class WorkerExceptionFilter {
  private readonly logger = new Logger(WorkerExceptionFilter.name);

  handle(queue: string, job: Job, err: unknown): void {
    const code = err instanceof AppException ? err.code : 'WORKER_UNKNOWN_ERROR';
    this.logger.error(
      {
        queue,
        jobId: job.id,
        attempt: job.attemptsMade,
        code,
        err,
      },
      'Worker job failed',
    );
  }
}
```

Rules.

- Every processor wires this filter via the `WorkerHost` `onFailed` hook. No silent catches inside the processor body.
- Failures are visible through structured pino logs in CloudWatch, grouped by `queue` and `code`. No Prometheus, no dedicated metrics pipeline in v0.1 (see F-114).
- Jobs that exhaust the retry schedule are marked failed in BullMQ and the failure event is emitted per `../shared/02-events.md`. The deliveries log UI (F-063) is the operator-facing surface for webhook failures; other queues are inspected from logs.

## Webhook delivery

Outbound webhook failures do not surface to the original API caller (the original write already succeeded). They publish a `webhook.delivery.failed` event with the failure reason, the attempt count, and the next-retry timestamp. The event taxonomy and payload are defined in `../shared/02-events.md`. This chapter does not duplicate them; it only notes that the same error catalog applies to the worker that drives delivery, and the dashboard surfaces failed deliveries to the operator.

## Observability hooks

Every error log line carries.

| Field | Source |
|---|---|
| `requestId` | ALS context, set by request-id middleware. |
| `tenantId` | ALS context, set by `TenantGuard`. |
| `userId` | ALS context, set by `JwtAuthGuard`. |
| `code` | The mapped wire code. |
| `status` | The HTTP status. |
| `path`, `method` | From the request. |
| `err` (5xx only) | The raw error, serialized by pino. |

Pino is configured with a redaction list. The list is centralized in `core/logging/redactions.ts`.

```ts
// core/logging/redactions.ts
export const REDACTION_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-webhook-signature"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.refreshToken',
  '*.password',
  '*.passwordHash',
  '*.refreshToken',
  '*.signingSecret',
  '*.apiKey',
  'upstream.requestBody',
  'upstream.responseBody',
];
```

Rules.

- Passwords (plain or hashed), JWT contents, signing secrets, and full inbound third-party payloads never appear in logs.
- A new sensitive field added anywhere requires a redaction update in the same PR.
- Errors are logged via pino with the request id, route, actor, and operator. Sentry can be added later by tapping the same write site. OpenTelemetry tracing is out of scope for v0.1 (see `docs/FEATURES.md`, F-114).

## Testing errors

Every domain exception class has a unit test asserting three things.

| Assertion | What it pins |
|---|---|
| The HTTP status | The wire contract. |
| The `code` | The client switch contract. |
| The log level the filter would write | Operational behavior. |

```ts
// modules/jobs/errors/job-invalid-transition.exception.spec.ts
describe('JobInvalidTransitionException', () => {
  it('renders 409 with code JOB_INVALID_TRANSITION', () => {
    const err = new JobInvalidTransitionException('job-1', JobStatus.COMPLETED, JobStatus.ASSIGNED);
    expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(err.code).toBe('JOB_INVALID_TRANSITION');
    expect(err.details).toEqual({ jobId: 'job-1', from: 'COMPLETED', to: 'ASSIGNED' });
  });
});
```

E2E tests cover the error path at least once per controller. A controller that has not produced an error response in its e2e suite is missing a test.

```ts
// modules/jobs/jobs.controller.e2e-spec.ts
it('returns 409 JOB_INVALID_TRANSITION when transitioning a completed job', async () => {
  const job = await factories.job.completed();
  const res = await api()
    .post(`/v1/jobs/${job.id}/transition`)
    .set(authFor(coordinator))
    .send({ to: 'ASSIGNED' });
  expectError(res, 'JOB_INVALID_TRANSITION');
});
```

The `expectError` helper lives in `test/helpers/errors.helper.ts`.

```ts
// test/helpers/errors.helper.ts
export function expectError(res: request.Response, code: string): void {
  expect(res.body).toMatchObject({
    error: {
      code,
      message: expect.any(String),
      requestId: expect.any(String),
    },
  });
  expect(res.headers['x-request-id']).toEqual(res.body.error.requestId);
}
```

Rules.

- `expectError` asserts the wire shape and the request-id echo. It does not assert the status, because the calling test already does that explicitly.
- E2E tests do not test every error code per controller. They test at least one, and the unit tests cover the rest.
- A new error code with no test is a review block.

## Banned

- Returning a 200 with `{ ok: false, error: ... }`. The status code is the error.
- Catching `AppException` inside a service to translate it. Translation happens at the boundary, in the filter.
- Logging the raw request body. The redaction list exists for a reason; the request body bypasses it.
- Adding a new error code that is not in the catalog table in this file.
- Throwing a string. Throw an `AppException` subclass or let an unknown error reach the filter.
