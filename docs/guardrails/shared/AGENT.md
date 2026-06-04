# AGENT.md

This is the prompt to feed an AI assistant at the start of every coding session in this repository. Paste it (or attach the `docs/guardrails/` folder) before asking for code.

---

You are pair-programming on a NestJS backend. Before generating or editing any code, read and internalize the following guardrails. They override your default behavior.

## Read these first

In order.

1. `README.md (in docs/guardrails)` — hard rules and the definition of done.
2. `./shared/00-architecture.md` — layered architecture, folder layout, dependency rules.
3. `./shared/01-conventions.md` — naming, file structure, imports, **code comment formatting**, banned patterns.
4. `./backend/00-nestjs.md` — modules, DI, pipes, guards, interceptors, lifecycle.
5. `./backend/01-data.md` — Prisma patterns, repositories, transactions, tenant scoping.
6. `./backend/02-api.md` — DTOs, validation, error responses, REST and GraphQL contract.
7. `./shared/02-events.md` — EventEmitter, BullMQ, naming, idempotency.
8. `./backend/03-testing.md` — unit, e2e, factories, coverage targets.
9. `./shared/03-security.md` — auth, transport security, tenant isolation, validation, secrets.
10. `./shared/04-rbac.md` — role hierarchy, resource scoping, policy-based authorization via CASL, permission matrix, audit log.

## Operating rules

**Before you write code.**

1. Restate the task in your own words in two sentences. Include the affected module and the layers you will touch (controller, service, repository, DTO, test).
2. List the files you will create or edit, with their paths.
3. If the task is ambiguous, ask one clarifying question. If the task is unambiguous, proceed.

**While you write code.**

4. Match the existing pattern before inventing a new one. Read a neighboring feature module first if the codebase already has examples.
5. Touch the minimum surface needed. If a refactor is tempting, mention it but do not do it unless asked.
6. Follow the naming rules in `./shared/01-conventions.md` exactly. File names, identifiers, suffixes.
7. Every new service method has at least one unit test. Every new endpoint has at least one e2e test.
8. Comments explain why, never what. JSDoc on public services only. No file headers. No restating the code in prose.
9. No `any`. No `console.log`. No `process.env` outside `core/config`. No default exports.
10. Tenant scoping is non-negotiable. Every query on a tenant-scoped model includes `tenantId`.

**After you write code.**

11. Show the diff. List the tests you added and what they cover.
12. Confirm against the "Definition of done" in `00-README.md`. If any item fails, fix it before declaring done.
13. If a hard rule blocked the task, do not work around it. Stop and surface the conflict.

## Output format

When you produce code, structure the response in this order.

1. **Task understanding** (two sentences).
2. **Plan** (bulleted list of files and changes).
3. **Code** (one fenced block per file, with the path on the first line as a comment or above the block).
4. **Tests** (separate fenced blocks, paths labeled).
5. **Notes** (any deviation, any TODO, any assumption that should be confirmed).

## When in doubt

- Default to the simpler, more explicit option.
- Default to deleting code you did not need to add.
- Default to asking, not guessing, when the task could be interpreted two ways.

This codebase is reviewed by a human who reads diffs in detail. Optimize for a reviewer who wants to spend 60 seconds per file and walk away confident.
