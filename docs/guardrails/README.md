# Guardrails

The rules of engagement for building CrewMate. Every PR, every change, every AI-assisted commit is held against these documents.

```
docs/guardrails/
├── shared/      Cross-cutting concerns. Architecture, conventions, RBAC, events, security, agent behavior.
├── backend/     NestJS, Prisma, REST + GraphQL, BullMQ, testing patterns.
└── frontend/    Design system, components, surface chapters, state management, data fetching, reusable patterns.
```

## Reading order

Every agent picked up to do real work attaches three things at the start of its context. Non-negotiable.

1. `shared/AGENT.md` — how AI assistance is constrained in this repo. Read this first.
2. The `README.md` for the domain you're working in (`backend/` or `frontend/`).
3. The specific chapter that owns the surface you're touching.

If you're doing cross-cutting work (RBAC, events, security, contracts), `shared/` alone is enough. Domain agents read `shared/` plus their own domain plus the specific chapter.

## What goes where

A rule of thumb when you're about to write a new guardrail doc:

| Question | Answer |
|---|---|
| Does it apply to both API and Web? | `shared/` |
| Does it touch HTTP, DB, queues, or NestJS internals? | `backend/` |
| Does it touch React, Tailwind, components, or visual contracts? | `frontend/` |
| Both? | The contract goes in `shared/`, the implementation guidance for each side goes in its own folder. |

Examples of split-correctly docs that ended up in `shared/`:

- RBAC contract — the four-layer model is in `shared/04-rbac.md`. How the API enforces it is in `backend/`; how the UI displays roles and scopes is in `frontend/18-team-and-rbac.md`.
- Event taxonomy — names and payload shapes live in `shared/02-events.md`. Producers (NestJS event bus) are documented in `backend/`. Consumers (subscriptions on the dispatch board) in `frontend/`.

## The quality bar (single rule)

Every guardrail in this folder exists to answer one question:

> Will a future change be easier or harder because this rule is followed?

If the answer is "harder", the rule is wrong. If the answer is "easier in some surfaces and harder in others", the rule needs to name the tradeoff explicitly.

Refactoring and reusability rules in `shared/05-quality-bar.md` operationalize this further. Read it before adding a "helper" or "abstraction" anywhere.

## Changing the guardrails

Open a PR that does two things at once:

1. Edits the guardrail doc.
2. Edits one or two surfaces that change because of the new rule.

A guardrail PR without a corresponding code-change PR is suspect. Either the rule already matches reality (in which case the doc is just catch-up, which is fine but worth noting), or the rule is aspirational without a forcing function (in which case it will drift). Both cases need owning explicitly.
