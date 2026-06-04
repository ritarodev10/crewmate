# Authorization (Complex RBAC)

This is the authorization model for CrewMate. Read this end to end before changing any guard, ability rule, or scoped repository method. It pairs with `./shared/03-security.md`, which covers transport-level security and tenant isolation.

## Why this is more than "if user.role === admin"

A field-ops platform has four overlapping access concerns. Treating them separately is what makes the model defensible.

| Concern | Question it answers | Where it is enforced |
|---|---|---|
| Tenancy | Whose data is this? | `TenantGuard`, plus repository filters |
| Role hierarchy | What job function does this user have? | `AbilityFactory` |
| Resource scoping | Which slice of the tenant's data can this user touch? | `RoleGrant.scope`, evaluated in `AbilityFactory` |
| Policy / ABAC | Under what conditions is this specific action allowed? | CASL `conditions` on each rule |

All four are evaluated for every authenticated request. None of them is optional.

## Concepts

### Actor

```ts
export interface ActorContext {
  userId: string;
  operatorId: string;
  roleGrants: RoleGrant[];     // every grant the user holds inside this operator
  isSuperAdmin: boolean;       // platform-level only
}
```

Built by `JwtStrategy.validate()` from the JWT payload plus a single Redis-cached lookup of the user's active grants.

### Role

System roles are code-defined and live in `src/modules/authz/roles/system-roles.ts`. They are typed, fast, and predictable.

```ts
export const SystemRole = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  COORDINATOR: 'coordinator',
  WORKER: 'worker',
} as const;

export type SystemRoleName = (typeof SystemRole)[keyof typeof SystemRole];
```

Custom tenant-defined roles are data and live in `roles` table (v0.2, not in v0.1). When v0.2 lands, the ability factory resolves both system and custom roles uniformly.

### Role grant

A grant is the link between a user and a role, plus the **scope** at which the role applies.

```ts
export interface RoleGrant {
  id: string;
  userId: string;
  operatorId: string;
  role: SystemRoleName | string;   // string for custom roles in v0.2
  scope: ScopeRef;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date | null;          // null in v0.1, used in v0.2
}

export type ScopeRef =
  | { kind: 'tenant' }
  | { kind: 'region'; regionId: string }
  | { kind: 'properties'; propertyIds: string[] };
```

A single user can hold multiple grants. Example. A user is `coordinator` for two regions and `worker` for a third property. The ability factory merges all grants into one ability.

### Action and subject

Actions are verbs. Subjects are CASL subjects (entity classes or string tags).

```ts
export type Action =
  | 'manage'   // every action
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'transition'      // job-specific
  | 'assign'          // worker-to-job
  | 'reschedule'
  | 'export';

export type Subjects = InferSubjects<
  typeof Job | typeof Property | typeof Worker | typeof Schedule | typeof RoleGrant
> | 'all';
```

### Ability

A `MongoAbility<[Action, Subjects]>` instance, one per request, built from the actor.

## Permission matrix (v0.1 system roles)

The source of truth for what each role can do. Mirror this table in `permission-matrix.spec.ts` so changes here force tests to update.

| Action | super_admin | tenant_admin | coordinator | worker |
|---|---|---|---|---|
| `manage` `all` (this tenant) | ✅ | ✅ (own tenant only) | — | — |
| `read` `Property` | ✅ | ✅ | scoped | scoped (assigned only) |
| `create / update / delete` `Property` | ✅ | ✅ | — | — |
| `read` `Job` | ✅ | ✅ | scoped | assignee only |
| `create` `Job` | ✅ | ✅ | scoped | — |
| `update` `Job` (non-status fields) | ✅ | ✅ | scoped | assignee + only `notes`/`photos` |
| `delete` `Job` | ✅ | ✅ | — | — |
| `transition` `Job` | ✅ | ✅ | scoped, see state matrix | assignee, see state matrix |
| `assign` `Worker` to `Job` | ✅ | ✅ | scoped | — |
| `reschedule` `Job` | ✅ | ✅ | scoped, only if status ∈ `{scheduled, en_route}` | — |
| `read` `Worker` | ✅ | ✅ | scoped | self only |
| `manage` `Worker` | ✅ | ✅ | — | — |
| `read` `RoleGrant` | ✅ | ✅ | — | — |
| `manage` `RoleGrant` | ✅ | ✅ (cannot create super_admin) | — | — |
| `export` data | ✅ | ✅ | — | — |

Legend.

- ✅ = unconditional within the actor's tenant.
- `scoped` = subject to the grant's `ScopeRef` (region or property list).
- `assignee` = the actor must be the job's `workerId`.
- `self only` = the subject must be the actor.

### Job transition matrix (state machine + role)

Transitions are the densest case. Roles cannot transition a job into a state the state machine forbids, and the state machine cannot move into a state the role is not allowed to drive into.

| From → To | tenant_admin | coordinator | worker (assignee) |
|---|---|---|---|
| `scheduled → en_route` | ✅ | ✅ | ✅ |
| `en_route → in_progress` | ✅ | — | ✅ |
| `in_progress → completed` | ✅ | — | ✅ |
| `completed → verified` | ✅ | ✅ | — |
| any → `cancelled` (only from `scheduled`) | ✅ | ✅ | — |

A transition outside this table is a `409 InvalidStatusTransitionException`, not a `403`.

## Building the ability

```ts
// src/modules/authz/ability.factory.ts
@Injectable()
export class AbilityFactory {
  for(actor: ActorContext): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (actor.isSuperAdmin) {
      can('manage', 'all');
      return build({ detectSubjectType });
    }

    for (const grant of actor.roleGrants) {
      this.applyGrant(grant, actor, { can, cannot });
    }

    return build({ detectSubjectType });
  }

  private applyGrant(
    grant: RoleGrant,
    actor: ActorContext,
    builder: { can: typeof can; cannot: typeof cannot },
  ): void {
    const { can, cannot } = builder;
    const tenantScope = { operatorId: actor.operatorId };

    switch (grant.role) {
      case SystemRole.TENANT_ADMIN: {
        can('manage', 'all', tenantScope);
        cannot('manage', RoleGrant, { role: SystemRole.SUPER_ADMIN });
        break;
      }

      case SystemRole.COORDINATOR: {
        const propertyFilter = this.propertyFilterFromScope(grant.scope);

        can('read', Property, { ...tenantScope, ...propertyFilter });
        can(['create', 'read', 'update'], Job, { ...tenantScope, ...propertyFilter });
        can('assign', Job, { ...tenantScope, ...propertyFilter });
        can('reschedule', Job, {
          ...tenantScope,
          ...propertyFilter,
          status: { $in: [JobStatus.SCHEDULED, JobStatus.EN_ROUTE] },
        });
        can('transition', Job, {
          ...tenantScope,
          ...propertyFilter,
          status: { $in: [JobStatus.SCHEDULED, JobStatus.COMPLETED] },
        });
        can('read', Worker, tenantScope);
        break;
      }

      case SystemRole.WORKER: {
        const workerSelf = { workerId: actor.userId };

        can('read', Job, { ...tenantScope, ...workerSelf });
        can('update', Job, { ...tenantScope, ...workerSelf }, [
          'notes',                 // field-level allowlist (v0.2 enforces this)
          'photos',
        ]);
        can('transition', Job, {
          ...tenantScope,
          ...workerSelf,
          status: {
            $in: [JobStatus.SCHEDULED, JobStatus.EN_ROUTE, JobStatus.IN_PROGRESS],
          },
        });
        can('read', Property, this.workerPropertyFilter(actor));
        can('read', Worker, { id: actor.userId });
        break;
      }
    }
  }

  private propertyFilterFromScope(scope: ScopeRef): Record<string, unknown> {
    switch (scope.kind) {
      case 'tenant':
        return {};
      case 'region':
        return { regionId: scope.regionId };
      case 'properties':
        return { id: { $in: scope.propertyIds } };
    }
  }

  private workerPropertyFilter(actor: ActorContext): Record<string, unknown> {
    // Workers can read properties only for jobs assigned to them.
    // Implementation note. AbilityFactory does not query, the repository
    // narrows reads by joining jobs WHERE workerId = actor.userId.
    return { hasAssignedJobsForWorkerId: actor.userId };
  }
}
```

Notes on the implementation.

- One grant translates into multiple ability rules. The factory does the merge.
- Tenant scoping is applied **on every rule**. A bug here is a tenant leak.
- `cannot` rules override `can`. Use them to encode hard limits (e.g., a tenant admin cannot grant `super_admin`).
- Conditions are MongoDB-style queries, which CASL evaluates on plain objects in memory **and** translates to ORM `where` clauses via `accessibleBy()`.

## Enforcement (PEP)

### Decorator + guard

```ts
// src/shared/authz/require-ability.decorator.ts
export const RequireAbility = (action: Action, subject: SubjectTag) =>
  SetMetadata(REQUIRED_ABILITY_KEY, { action, subject });

// src/shared/authz/policies.guard.ts
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilities: AbilityFactory,
    private readonly audit: PermissionAuditService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<RequiredAbility | undefined>(
      REQUIRED_ABILITY_KEY,
      ctx.getHandler(),
    );
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const ability = this.abilities.for(req.user);
    const allowed = ability.can(required.action, required.subject);

    await this.audit.record({
      actor: req.user,
      action: required.action,
      subject: required.subject,
      subjectId: req.params.id ?? null,
      decision: allowed ? 'allow' : 'deny',
      reason: allowed ? 'matched-rule' : 'no-matching-rule',
      requestId: req.id,
    });

    if (!allowed) throw new ForbiddenException({ code: 'NOT_ALLOWED' });
    return true;
  }
}
```

### Controller usage

```ts
@UseGuards(JwtAuthGuard, TenantGuard, PoliciesGuard)
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  @RequireAbility('create', 'Job')
  async create(@Body() dto: CreateJobDto, @CurrentUser() actor: ActorContext) { ... }

  @Patch(':id/transition')
  @RequireAbility('transition', 'Job')
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionJobDto,
    @CurrentUser() actor: ActorContext,
  ) {
    return this.jobs.transition(id, dto.to, actor);
  }
}
```

### Instance-level enforcement (in the service)

The guard only checks "can this actor in principle do `transition Job`". The service must also check "is this specific job within the actor's scope, and is the transition allowed by the state machine for this role".

```ts
// src/modules/jobs/jobs.service.ts
async transition(
  jobId: string,
  next: JobStatus,
  actor: ActorContext,
): Promise<JobResponseDto> {
  const job = await this.jobs.findOneByIdOrThrow(jobId, actor.operatorId);

  // Instance-level ability check. The guard already allowed the action in principle,
  // but the specific job must also pass the conditions on the rule.
  const ability = this.abilities.for(actor);
  ForbiddenError.from(ability).throwUnlessCan('transition', subject('Job', job));

  // State machine narrows further.
  this.stateMachine.assertCanTransition(job.status, next, actor);

  return this.transitionInTx(job, next, actor);
}
```

`ForbiddenError.from(ability).throwUnlessCan(...)` is CASL's helper. It throws if the ability denies the operation, and it includes the failing rule for the audit log.

### Repository scoping

List endpoints push the actor's ability into the query. Never `findMany` first and filter in memory.

```ts
// src/modules/jobs/jobs.repository.ts
async listForActor(
  actor: ActorContext,
  filter: ListJobsFilter,
): Promise<Job[]> {
  const ability = this.abilities.for(actor);
  const accessible = accessibleBy(ability, 'read').Job;     // -> Prisma where

  return this.prisma.job.findMany({
    where: {
      AND: [
        accessible,                                          // scope enforced here
        { tenantId: actor.operatorId },                      // tenancy, belt and braces
        filter.toPrismaWhere(),
      ],
    },
    take: filter.limit,
    cursor: filter.cursor,
  });
}
```

Two layers of defense. The ability filter narrows the query. The explicit `tenantId` clause is a backstop in case a rule is misconfigured. Both must be present.

## Permission audit log

Every guard decision and every instance-level check writes one row.

```sql
CREATE TABLE permission_audits (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  request_id      UUID NOT NULL,
  actor_user_id   UUID NOT NULL,
  action          TEXT NOT NULL,
  subject         TEXT NOT NULL,
  subject_id      UUID,
  decision        TEXT NOT NULL CHECK (decision IN ('allow', 'deny')),
  reason          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON permission_audits (tenant_id, created_at DESC);
CREATE INDEX ON permission_audits (actor_user_id, created_at DESC);
```

Rules.

- Writes are asynchronous via the `permission-audit` queue. A slow audit must not slow down the request.
- Retention is 90 days for `allow`, 365 days for `deny`. Denies are the security signal.
- Surfacing in the UI is v0.2.
- Audit failure does not block the request, but it does log an error and increment a metric.

## Testing the permission matrix

One spec file owns the entire matrix. It is the source of truth for "what is supposed to be allowed".

```ts
// src/modules/authz/permission-matrix.spec.ts
describe('Permission matrix', () => {
  const cases: PermissionCase[] = [
    ['tenant_admin', 'create', 'Job', { tenantScope: true }, 'allow'],
    ['coordinator', 'create', 'Job', { propertyInScope: true }, 'allow'],
    ['coordinator', 'create', 'Job', { propertyInScope: false }, 'deny'],
    ['coordinator', 'transition', 'Job', { from: 'completed', to: 'verified' }, 'allow'],
    ['coordinator', 'transition', 'Job', { from: 'en_route', to: 'in_progress' }, 'deny'],
    ['worker', 'transition', 'Job', { assignee: true, from: 'en_route', to: 'in_progress' }, 'allow'],
    ['worker', 'transition', 'Job', { assignee: false, from: 'en_route', to: 'in_progress' }, 'deny'],
    ['worker', 'read', 'Job', { assignee: true }, 'allow'],
    ['worker', 'read', 'Job', { assignee: false }, 'deny'],
    // ...
  ];

  test.each(cases)('%s %s %s with %o => %s', (role, action, subject, ctx, expected) => {
    const actor = buildActor({ role, ctx });
    const ability = factory.for(actor);
    const decision = ability.can(action, buildSubject(subject, ctx)) ? 'allow' : 'deny';
    expect(decision).toBe(expected);
  });
});
```

Coverage target. 100% of the matrix rows have a passing test. The matrix table in this file and the test file change together in the same PR.

## Operator and admin endpoints

Two endpoints carry their own special considerations.

- `POST /v1/role-grants`. Tenant admin grants a role to a user with a scope. The body validates that the grant cannot exceed the actor's own permissions. A tenant admin cannot grant `super_admin`.
- `DELETE /v1/role-grants/:id`. Revokes a grant. Active sessions for that user are invalidated by bumping a `grantsVersion` claim in the JWT, which `JwtStrategy.validate()` checks on every request.

## What is intentionally not in v0.1

Each is one or two phases of work. Keeping them documented is part of the design.

1. **Custom tenant-defined roles.** Stored in `roles` table with a permission list. The ability factory loads them dynamically and applies the same rule patterns.
2. **Time-bound grants (`expiresAt`).** A grant past `expiresAt` is ignored by the factory. A nightly job emits `grant.expired` events.
3. **Impersonation.** A `super_admin` or `tenant_admin` can request an "act-as" token for another user. Every action under that token logs `actorId` and `effectiveUserId`. The token has a short TTL.
4. **Field-level masking.** CASL supports per-field rules. The response DTO mapper consults the ability and omits or masks fields the actor is not allowed to see (e.g., hourly rate on `Worker`).
5. **Externalized policy service.** Move ability evaluation to Cerbos or OpenFGA when the rule set outgrows what a single team can keep in their head.

## Banned patterns

- `if (user.role === '...')` inside a service. Always go through `ability.can(...)` or `ForbiddenError.from(ability).throwUnlessCan(...)`.
- A list endpoint that calls `findMany` without `accessibleBy(ability, 'read').X`. Filtering in memory after the fetch is a data leak.
- A guard that throws `403` with a message that reveals the existence of a resource the actor is not allowed to see. Return `404` if the resource is outside the actor's scope.
- Caching the entire ability object indefinitely. Cache the role grants for 60 seconds, rebuild the ability per request.
- Mixing `tenant_admin` and `super_admin` checks. They are different concerns, do not collapse them.
- Writing audit log entries synchronously inside the request path. Queue them.

## Definition of done for a new endpoint

The PR description confirms each item.

- [ ] `@RequireAbility(action, subject)` on the handler.
- [ ] An instance-level `throwUnlessCan` in the service for any resource the handler touches.
- [ ] If the endpoint lists rows, the repository uses `accessibleBy()`.
- [ ] The permission matrix table in this file is updated.
- [ ] `permission-matrix.spec.ts` covers the new action with at least one `allow` and one `deny` row.
- [ ] e2e test covers an authenticated forbidden path returning `403` (or `404` if the resource is outside scope).
