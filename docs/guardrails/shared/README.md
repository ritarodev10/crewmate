# Shared Guardrails

Cross-cutting concerns. Anything that both the API and the Web depend on lives here, so that neither side can change it unilaterally.

## File map

| # | File | What's in it |
|---|---|---|
| — | [`AGENT.md`](./AGENT.md) | How AI assistance is constrained in this repo. Read first. |
| 00 | [`00-architecture.md`](./00-architecture.md) | The big picture. Layers, boundaries, why this codebase looks the way it does. |
| 01 | [`01-conventions.md`](./01-conventions.md) | Naming, file layout, commit shape, code style across both apps. |
| 02 | [`02-events.md`](./02-events.md) | Domain event taxonomy. Names, payloads, who produces, who consumes. The bridge between API and Web. |
| 03 | [`03-security.md`](./03-security.md) | Threat model, secrets handling, signing, encryption at rest, headers. |
| 04 | [`04-rbac.md`](./04-rbac.md) | The four-layer authorization model. Tenancy, role, scope, policy. The single source of truth. |
| 05 | [`05-quality-bar.md`](./05-quality-bar.md) | When to refactor, when to abstract, when to leave duplicated code. The reusability philosophy. |

## How to use

If you're writing API or Web code that touches:

- **Tenancy or authorization** — read `04-rbac.md` end to end. Half the bugs in multi-tenant systems are leaks through this layer.
- **Domain events** — read `02-events.md`. Adding a new event is a contract change between API and Web; do it intentionally.
- **Secrets, signing, or anything that goes over the wire** — read `03-security.md`.
- **A new abstraction or helper** — read `05-quality-bar.md` first. Most of the time the right answer is "don't".

## What does not belong here

- Framework-specific patterns (NestJS modules, Next.js routing) go in `backend/` or `frontend/`.
- UI visual contracts and component anatomy stay in `frontend/`.
- DB schema and migration patterns stay in `backend/`.

If you're tempted to put something in `shared/` that only one side will ever touch, put it in that side's folder instead. `shared/` stays useful by staying small.
