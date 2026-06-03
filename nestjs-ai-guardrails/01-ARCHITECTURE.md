# Architecture

## Layered architecture

Every feature follows the same flow.

```
HTTP / WebSocket / GraphQL
        ↓
   Controller / Resolver / Gateway   (transport, no business logic)
        ↓
        Service                       (business logic, orchestration)
        ↓
        Repository                    (data access, one ORM call per method)
        ↓
        Database / External API
```

Rules.

- **Controllers** validate input shape, call one service method, map the result to a response DTO. No `if` branching on business state.
- **Services** own business rules, side effects, and orchestration across repositories or external clients. Services may depend on other services, but never on controllers.
- **Repositories** wrap the data layer (Prisma). One method, one intent. No business logic inside a repository.
- **Domain types** live next to the service that owns them, not in a global `types/` dump.

## Module structure

```
src/
  app.module.ts                # composition root
  main.ts                      # bootstrap
  core/                        # cross-cutting infra (config, logging, prisma)
    config/
    logger/
    prisma/
  shared/                      # reusable building blocks (guards, decorators, filters)
    guards/
    decorators/
    interceptors/
    filters/
    pipes/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      strategies/
      dto/
      auth.service.spec.ts
    jobs/
      jobs.module.ts
      jobs.controller.ts
      jobs.service.ts
      jobs.repository.ts
      jobs.resolver.ts          # GraphQL, optional
      jobs.gateway.ts           # WebSocket, optional
      dto/
        create-job.dto.ts
        update-job.dto.ts
        job-response.dto.ts
      events/
        job-created.event.ts
      jobs.service.spec.ts
      jobs.controller.e2e-spec.ts
    properties/
    workers/
    ...
  test/                        # e2e harness, factories, fixtures
```

## Dependency rules

Dependencies point inward. Outer layers may import inner layers, never the reverse.

```
core   ←   shared   ←   modules/*
```

- A `core` module never imports from `modules/*`.
- A `shared` utility never imports from a specific feature module.
- One feature module may import another feature module's public surface (its module, service, and DTOs), but never reach into another module's repository or private files.
- If two modules need to share state, the shared piece moves to `core` or `shared`. No back-channels.

## What lives where (cheat sheet)

| Type | Lives in |
|---|---|
| HTTP route handler | `*.controller.ts` |
| GraphQL resolver | `*.resolver.ts` |
| WebSocket gateway | `*.gateway.ts` |
| Business logic | `*.service.ts` |
| Data access | `*.repository.ts` |
| Input shape | `dto/create-*.dto.ts`, `dto/update-*.dto.ts` |
| Output shape | `dto/*-response.dto.ts` |
| Event payload | `events/*.event.ts` |
| Queue processor | `processors/*.processor.ts` |
| Background job consumer | `consumers/*.consumer.ts` |
| Authorization rule | `shared/guards/*.guard.ts` |
| Cross-cutting transform | `shared/interceptors/*.interceptor.ts` |
| Error mapping | `shared/filters/*.filter.ts` |
| Config schema | `core/config/*.schema.ts` |

## When to add a new module

Add a module when a new bounded concept appears (a new aggregate, a new external integration, a new background worker). Do not split a module into two just because a file got large. Split files first, modules only when the responsibility actually splits.
