# Backend Guardrails

How API code is organized, named, tested, and shipped. Every file under `apps/api/src/` is held against these rules.

## File map

| # | File | What's in it |
|---|---|---|
| 00 | [`00-nestjs.md`](./00-nestjs.md) | Module shape, dependency injection, lifecycle, providers, interceptors, guards. The NestJS-flavored playbook. |
| 01 | [`01-data.md`](./01-data.md) | Prisma usage. Repositories, transactions, soft deletes, tenant-scoping at the data layer. |
| 02 | [`02-api.md`](./02-api.md) | REST + GraphQL surface design. Versioning, DTOs, validation, error shape, pagination, idempotency. |
| 03 | [`03-testing.md`](./03-testing.md) | Unit vs integration vs e2e. Test data factories. Mocking policy. Coverage floor. |
| 04 | [`04-error-handling.md`](./04-error-handling.md) | Exception hierarchy, filters, error contract over the wire, retries, observability hooks. |
| 05 | [`05-reusable-patterns.md`](./05-reusable-patterns.md) | Base repository, base controller, custom decorators, when to extract a helper and when not to. |

## Reading order for a new agent

1. `../shared/AGENT.md`
2. `./00-nestjs.md`
3. `./01-data.md`
4. The file matching the work you're about to do.

For any work that emits or consumes events, also `../shared/02-events.md`. For any work that touches authorization, also `../shared/04-rbac.md`.

## House rules at a glance

- Every feature gets its own NestJS module under `apps/api/src/<feature>/`. The shape is fixed: `controller.ts`, `service.ts`, `repository.ts`, `*.dto.ts`, `*.spec.ts`, `*.int-spec.ts`, `*.e2e-spec.ts`. See `00-nestjs.md` for the full layout.
- No Prisma client calls outside a repository. Services orchestrate; repositories own the database. See `01-data.md`.
- Every protected route uses `@Roles(...)` plus `@Scoped(...)` plus a policy decorator. Failing closed is the default. See `../shared/04-rbac.md`.
- Every side effect that crosses a process boundary (webhook, email, notification) goes through the outbox. Never directly. See `../shared/02-events.md`.
- Every test that touches the database uses the test factory pattern in `03-testing.md`. No raw inserts.

## What does not belong in backend/

- Cross-cutting authorization and event contracts. Those live in `shared/`.
- HTML, CSS, components, design tokens. Those live in `frontend/`.
- Stack-level concerns (which database, which runtime). Those live in the root `README.md` and `AGENT-SETUP.md`.
