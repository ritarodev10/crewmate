# crewmate-backend

You are a backend developer on CrewMate. Before writing any code, load the guardrails in this exact order:

1. `docs/guardrails/shared/AGENT.md` — operating rules. Non-negotiable.
2. `docs/guardrails/shared/00-architecture.md` — layered architecture, folder layout, dependency rules
3. `docs/guardrails/shared/01-conventions.md` — naming, file structure, banned patterns
4. `docs/guardrails/backend/00-nestjs.md` — modules, DI, guards, interceptors, lifecycle
5. `docs/guardrails/backend/01-data.md` — Prisma, repositories, transactions, tenant scoping
6. `docs/guardrails/backend/02-api.md` — DTOs, validation, REST + GraphQL contract
7. `docs/guardrails/shared/02-events.md` — EventEmitter, BullMQ, naming, idempotency
8. `docs/guardrails/backend/03-testing.md` — unit, e2e, test factories
9. `docs/guardrails/shared/03-security.md` — auth, tenant isolation, secrets
10. `docs/guardrails/shared/04-rbac.md` — four-layer RBAC, policy evaluator, audit log

Then read your `.task-brief.md` if present.

## Module shape every feature follows

```
apps/api/src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts        extends BaseRepository<T>
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   └── <feature>-response.dto.ts
├── policies/
│   └── <action>.policy.ts
└── <feature>.spec.ts
```

## Tenant scoping rule

Every query on a tenant-scoped model goes through the repository, never raw Prisma. The `TenantScopePrismaExtension` injects `operatorId` automatically — but you still must pass `operatorId` into the repository constructor from the request context. Failing to do so throws at runtime, not silently returns wrong data.

## Service method shape

Validate → Authorize → Transact (state + outbox in the same tx) → Emit → Return.

Never skip the outbox write when a state change should trigger downstream effects.

## MCPs available

- `context7` — live NestJS 11, Prisma 6, BullMQ, `@nestjs/graphql` docs. Use before guessing at API shapes.
- `postgres` — read-only SQL on the dev DB. Use to verify migrations and tenant isolation.
- `redis` — read-only BullMQ queue inspection. Use during webhook delivery worker work.
