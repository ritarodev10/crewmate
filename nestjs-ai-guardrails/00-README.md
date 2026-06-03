# NestJS AI Guardrails

A small, opinionated playbook that any AI assistant (Claude, Cursor, Copilot, Codex) must follow when generating or editing code in this repository. These files exist for one reason. They keep AI-generated code architecturally consistent, testable, and easy for a human to review at speed.

## How to use

1. Drop this folder at the repo root, or under `docs/`.
2. At the start of every AI session, paste the contents of `AGENT.md`, or attach this folder as context. Cursor and Claude Code can be pointed at the folder directly.
3. When the AI deviates, point it back to the specific rule that was violated, not "you broke the rules". Specificity makes the correction stick.
4. Treat these as living documents. When a real-world decision is made (a new pattern, a new ban), update the file the same day.

## File index

- `01-ARCHITECTURE.md` — layered architecture, module structure, folder layout, dependency rules.
- `02-CONVENTIONS.md` — naming, file structure, imports, **code comment formatting**, banned patterns.
- `03-NESTJS.md` — DI, modules, pipes, guards, interceptors, lifecycle hooks.
- `04-DATA.md` — Prisma patterns, repositories, transactions, tenant scoping, migrations.
- `05-API.md` — DTOs, validation, error responses, REST and GraphQL contracts.
- `06-EVENTS.md` — EventEmitter, BullMQ, event naming, idempotency, retries.
- `07-TESTING.md` — unit tests, e2e tests, mocking, coverage targets.
- `08-SECURITY.md` — JWT auth, transport security, tenant isolation, secrets, rate limiting.
- `09-RBAC.md` — complex authorization. Role hierarchy, resource scoping, policy-based ABAC via CASL, permission matrix, audit log, repository scoping with `accessibleBy()`.
- `AGENT.md` — the prompt to feed an AI assistant at the start of each session.

## Hard rules (override everything else)

1. **Never bypass a rule silently.** If a rule blocks the task, leave a `// TODO(guardrail): <reason>` and ask the human.
2. **Small files, single responsibility.** A file longer than 250 lines is a signal to split.
3. **No premature abstraction.** Do not introduce a base class, generic, or wrapper for a single caller.
4. **No dead code.** Delete unused exports, do not comment code out.
5. **No `any`.** Prefer `unknown` and narrow, or model the shape with a type or schema.
6. **Tests are not optional** on services and controllers. New behavior ships with at least one test.
7. **No commented-out code, no scaffolded TODOs left behind.** Either finish, delete, or open an issue.
8. **Match the existing pattern before inventing a new one.** If a similar feature exists, copy its shape.

## Definition of done

A change is done only when all of these are true.

- Code compiles with `tsc --noEmit` and passes `eslint`.
- All new public methods have at least one unit test, and any new endpoint has at least one e2e test.
- DTOs use `class-validator` and are typed end to end.
- No `console.log` left behind. Use the configured logger.
- README or relevant doc updated if a public contract changed.
- The diff matches the smallest scope that solves the task.
