# API Contract

## DTOs

Three flavors, named explicitly.

| Purpose | Naming | Where it lives |
|---|---|---|
| Input for create | `CreateXDto` | `dto/create-x.dto.ts` |
| Input for update | `UpdateXDto` | `dto/update-x.dto.ts` |
| Output to client | `XResponseDto` | `dto/x-response.dto.ts` |

```ts
// dto/create-job.dto.ts
export class CreateJobDto {
  @IsUUID()
  propertyId!: string;

  @IsEnum(JobType)
  type!: JobType;

  @IsISO8601()
  scheduledFor!: string;

  @IsOptional()
  @IsUUID()
  workerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
```

Rules.

- Use `class-validator` decorators on every field. `whitelist: true` strips anything not declared.
- Use `class-transformer` for nested DTOs (`@Type(() => NestedDto)`).
- Update DTOs use `PartialType(CreateJobDto)` only when the update truly accepts every create field. Otherwise spell it out.
- DTOs never contain methods that talk to the database. Pure data + validation.

## Response DTOs

Response DTOs are not entities. They are explicit shapes that the API promises to the client.

```ts
export class JobResponseDto {
  id!: string;
  propertyId!: string;
  status!: JobStatus;
  scheduledFor!: string;
  worker!: { id: string; name: string } | null;
  createdAt!: string;
  updatedAt!: string;

  static fromDomain(job: Job & { worker?: Worker | null }): JobResponseDto {
    return {
      id: job.id,
      propertyId: job.propertyId,
      status: job.status,
      scheduledFor: job.scheduledFor.toISOString(),
      worker: job.worker
        ? { id: job.worker.id, name: job.worker.name }
        : null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
```

Rules.

- Dates leave the API as ISO 8601 strings, never as `Date` objects or unix timestamps.
- Never spread an entity into a response (`return { ...entity }`). Map field by field.
- Internal fields (`deletedAt`, `tenantId`, audit columns) never appear in a response unless the consumer needs them.
- Sensitive fields (password hashes, refresh tokens) never appear in a response, full stop.

## Errors

One error shape across the whole API.

```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Job 7e2c... was not found",
    "details": { "jobId": "7e2c..." }
  },
  "timestamp": "2026-05-31T08:42:11.000Z",
  "path": "/v1/jobs/7e2c..."
}
```

- `code` is a stable, SCREAMING_SNAKE_CASE string. Clients switch on this.
- `message` is human-readable, not user-facing copy. The frontend localizes its own copy.
- `details` is optional and may include safe context.
- HTTP status is set by the exception (`NotFoundException` returns 404, `ForbiddenException` returns 403, and so on).

Validation errors return 400 with a `details.fields` array enumerating per-field issues.

## Pagination

Cursor-based by default for any list that can grow.

Request.

```
GET /v1/jobs?limit=20&cursor=eyJpZCI6Ii4uLiJ9
```

Response.

```json
{
  "data": [ ... ],
  "pageInfo": {
    "nextCursor": "eyJpZCI6Ii4uLiJ9",
    "hasNextPage": true
  }
}
```

- Limit has a default (20) and a hard cap (100).
- Cursor is opaque (base64-encoded JSON). Clients do not parse it.
- Offset pagination is allowed only for admin-facing tables that will never exceed a few thousand rows.

## Versioning

- URI versioning. `/v1/jobs`, never `/jobs` without a version.
- A version is alive until it is deprecated in writing with a sunset date. Breaking changes go to `/v2`.

## OpenAPI

- `@nestjs/swagger` annotations on every controller and DTO.
- `swagger.json` is generated in CI and committed to the repo (or published as a build artifact).
- Every endpoint has at least one example response.

```ts
@ApiTags('jobs')
@ApiBearerAuth()
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  @Post()
  @ApiOperation({ summary: 'Create a job' })
  @ApiCreatedResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(...) { ... }
}
```

## GraphQL (when enabled)

- Code-first. `@ObjectType`, `@InputType`, `@Field`.
- One resolver per aggregate. Mutations are verbs (`createJob`, `transitionJob`), queries are nouns (`job`, `jobs`).
- Errors via a typed union or via standard GraphQL errors with stable `extensions.code`.
- Public schema (`schema.gql`) is committed to the repo.

## REST conventions

| Action | Method | Path |
|---|---|---|
| List | GET | `/v1/jobs` |
| Get one | GET | `/v1/jobs/:id` |
| Create | POST | `/v1/jobs` |
| Replace | PUT | `/v1/jobs/:id` |
| Partial update | PATCH | `/v1/jobs/:id` |
| Delete (soft) | DELETE | `/v1/jobs/:id` |
| Custom action | POST | `/v1/jobs/:id/transition` |

- Plural resource names.
- Actions that do not fit CRUD are POST under the resource with a verb path segment.
- Idempotent endpoints (`PUT`, `DELETE`) return 200 with the current state, not 204, so the client never has to refetch.

## HTTP status codes

- 200 OK for successful reads and updates.
- 201 Created for successful creates, with a `Location` header.
- 204 No Content reserved for endpoints with truly no payload (rare).
- 400 Bad Request for validation failures.
- 401 Unauthorized for missing or invalid auth.
- 403 Forbidden for authenticated but not allowed.
- 404 Not Found for missing resources, including resources the caller is not allowed to see (do not leak existence).
- 409 Conflict for state-machine violations and unique-key collisions.
- 422 Unprocessable Entity is not used. Validation failures are 400.
- 429 Too Many Requests for rate-limited responses.
- 500 only for true server bugs.
