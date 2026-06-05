# REST API Conventions

---

## Base URL

All routes are prefixed with `/api/v1/` set in `main.ts`:

```ts
app.setGlobalPrefix('api/v1');
```

Full example: `https://api.crewmate.ritaro.dev/api/v1/jobs`

---

## Response Envelopes

### Single Item

```json
{
  "data": {
    "id": "cuid_abc123",
    "status": "IN_PROGRESS",
    "progressPct": 50
  }
}
```

### Paginated List

```json
{
  "data": [
    { "id": "cuid_abc123", "status": "SCHEDULED" },
    { "id": "cuid_def456", "status": "IN_PROGRESS" }
  ],
  "meta": {
    "total": 2,
    "cursor": "MjAyNS0xMC0wNVQxMjowMDowMC4wMDBa"
  }
}
```

`cursor` is omitted when there are no more pages. `total` is the count of items in the current page, not the grand total (grand totals are expensive and not needed for the demo).

### Error

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition job from COMPLETED to IN_PROGRESS",
    "details": {
      "fromStatus": "COMPLETED",
      "toStatus": "IN_PROGRESS"
    }
  }
}
```

`details` is optional. Include it when the error involves field-level context (e.g., validation failures map field names to error messages).

---

## HTTP Status Codes

| Status | When to use |
|---|---|
| `200 OK` | GET and PATCH that return a body |
| `201 Created` | POST that creates a resource |
| `204 No Content` | DELETE — returns no body |
| `400 Bad Request` | Request body or query param fails DTO validation |
| `401 Unauthorized` | No token or token is expired/invalid |
| `403 Forbidden` | Valid token but role does not have access |
| `404 Not Found` | Resource ID does not exist within the operator's scope |
| `409 Conflict` | Invalid job status transition (e.g., COMPLETED → IN_PROGRESS) |
| `422 Unprocessable Entity` | Business rule violation (e.g., completing a job at progressPct < 100) |

The 400/409/422 distinction matters. Use it:
- `400` — the request is structurally invalid (wrong types, missing required field, enum value not recognized)
- `409` — the request is valid but conflicts with current state (invalid state machine transition)
- `422` — the request is valid and the state transition is allowed, but a business precondition is not met

---

## Dates

All datetime values in responses are ISO 8601 UTC strings. Never timestamps or locale strings.

```json
{
  "scheduledFor": "2025-10-05T09:00:00.000Z",
  "startedAt": "2025-10-05T09:03:12.000Z",
  "completedAt": null
}
```

The frontend formats dates for display. The API never localizes.

---

## Monetary Amounts

All monetary amounts are stored and transmitted as **integer euro cents**.

```json
{
  "clientRatePerHour": 7200,
  "workerEarning": 8400,
  "clientCharge": 21600,
  "platformProfit": 13200
}
```

`€72.00/hr` is stored as `7200`. `€84.00` is `8400`.

The frontend formats cents to display strings: `(amount / 100).toFixed(2)` → `"84.00"` → `"€84.00"`.

Never transmit decimal euro amounts. Floating-point arithmetic on currency produces subtle bugs.

---

## RBAC Matrix

| Endpoint | SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER |
|---|---|---|---|---|
| `POST /auth/login` | open | open | open | open |
| `GET /dashboard/summary` | yes | yes | team-scoped | no |
| `GET /dashboard/activity` | yes | yes | team-scoped | no |
| `GET /jobs` | yes | yes | team-scoped | own jobs |
| `GET /jobs/:id` | yes | yes | team-scoped | own job only |
| `POST /jobs` | yes | yes | no | no |
| `PATCH /jobs/:id/status` | yes | yes | yes (own team) | yes (own job) |
| `PATCH /jobs/:id/progress` | yes | yes | yes (own team) | yes (own job) |
| `PATCH /jobs/:id/cancel` | yes | yes | no | no |
| `GET /workers` | yes | yes | team only | no |
| `GET /workers/:id` | yes | yes | team only | own record |
| `GET /workers/:id/earnings` | yes | yes | team only | own record |
| `GET /revenue` | yes | yes | team-scoped | no |
| `GET /search` | yes | yes | scoped* | no |
| `POST /demo/reset` | yes | no | no | no |

`scoped*` for search: TEAM_LEAD gets workers scoped to their team; customer results are not returned.

Enforcement:
- Route-level access (can this role reach this endpoint at all) → `@Roles()` decorator + `RolesGuard`
- Row-level access (can this user see this specific record) → implemented in the service via `operatorId` + role checks

---

## Filtering

All filters are optional query parameters, combinable:

```
GET /api/v1/jobs?status=IN_PROGRESS&worker=cuid_abc&type=HVAC_REPAIR
GET /api/v1/workers?status=ON_JOB
GET /api/v1/search?q=luca&scope[]=workers&scope[]=jobs
```

Query param names match the Prisma field name (`status`, `workerId` → abbreviated to `worker` for brevity in URLs, `jobTypeId` → abbreviated to `type`).

All filter params are validated in the controller's query DTO using `class-validator`. Unknown query params are stripped by `whitelist: true` on the global `ValidationPipe`.

---

## Nesting Limit

No nested resource URLs beyond one level.

```
# Allowed
GET /workers/:id/earnings

# Not allowed — use the top-level resource instead
GET /workers/:id/jobs/:jobId/status
# Use:
PATCH /jobs/:jobId/status
```

The one-level rule prevents combinatorial explosion in route definitions and keeps route guards simple.

---

## Specific Endpoint Notes

**`PATCH /jobs/:id/status`** — accepts `{ status: JobStatus }`. Returns `409` if the transition is invalid per the state machine:

```
Valid transitions:
  SCHEDULED   → IN_PROGRESS
  IN_PROGRESS → COMPLETED     (only when progressPct === 100)
  SCHEDULED   → CANCELLED     (MANAGER/ADMIN only)
  IN_PROGRESS → CANCELLED     (MANAGER/ADMIN only)
```

**`PATCH /jobs/:id/progress`** — accepts `{ progressPct: 0 | 25 | 50 | 75 | 100 }`. Returns `409` if `progressPct` would decrease (steps are forward-only). This does not change job status — use the status endpoint to complete the job.

**`PATCH /jobs/:id/cancel`** — accepts `{ cancelReasonCode: CancelCode, cancelReasonNote?: string }`. Available only to MANAGER and SUPER_ADMIN. Sets `job.cancelledBy = actorUserId`, `job.cancelledAt = now()`, `job.status = CANCELLED`. Returns `409` if the job is already COMPLETED.

**`GET /dashboard/summary`** — returns:
```json
{
  "data": {
    "totalJobsToday": 12,
    "activeWorkers": 4,
    "onTimeRate": 0.83,
    "revenueToday": 345600,
    "profitToday": 187200
  }
}
```

**`GET /revenue`** — returns:
```json
{
  "data": {
    "summary": {
      "totalRevenue": 2304000,
      "totalProfit": 1248000,
      "profitMarginPct": 0.54,
      "jobsCompleted": 38
    },
    "trend": [
      { "date": "2025-09-29", "revenue": 345600, "profit": 187200 },
      ...
    ],
    "byType": [
      {
        "jobTypeId": "cuid_hvac",
        "label": "HVAC Repair",
        "jobCount": 8,
        "revenue": 518400,
        "profit": 281600,
        "marginPct": 0.54
      },
      ...
    ]
  }
}
```
