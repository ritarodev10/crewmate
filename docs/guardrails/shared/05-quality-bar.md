# Quality Bar

The guardrails README poses a single question. Will a future change be easier or harder because this rule is followed? This file applies that question to the inside of files. When do you extract a helper, when do you build an abstraction, and when do you leave two pieces of code alone even though they look similar.

Read this before adding a new utility, a base class, a generic, a `lib/` file, or a `shared/` directory under any feature. Most of the time the right answer is to leave the code where it is and rename a variable.

## The reusability paradox

In a codebase that lives long enough, premature abstraction costs more than duplication. CrewMate is six months from its first real customer. The build plan in `docs/BUILD.md` ships features in waves of four to eight tasks running in parallel. An abstraction merged in wave 2 to "save time later" forces every wave-3 agent to learn its conventions before they can ship. A duplicated function merged in wave 2 forces nobody to do anything.

The rule.

> See the same shape three times before extracting it.

Two duplications can stay. The fourth duplication is the trigger. The third is the warning. When you spot the third occurrence, stop and ask whether the underlying domain is actually the same, then extract if the answer is yes.

| Count | Action |
|---|---|
| 1 | Write the code in place. |
| 2 | Write the code in place again. Resist the urge. |
| 3 | Stop. Read both prior callsites. Decide whether they are the same domain rule or just similar shapes. |
| 4+ | If you have not extracted by now, you are accumulating technical debt. Extract. |

The reason the trigger is three and not two is that two is almost always coincidence in this codebase. A worker's full name and a property's display name are both `firstWord + ' ' + lastWord`. They share zero domain meaning. A helper that joins them would be wrong.

There is a softer version of this rule, useful for typed shapes. If two TypeScript types describe the same data, sharing the type is cheap. Sharing the function that operates on the type is the more expensive move and the one that needs the three-callsite trigger. A type alias is free. A behavior is not.

## The DRY trap

DRY is "do not repeat yourself", not "do not repeat structure". Two functions with identical lines that mean different things should stay separate. This is the most common AI-generated regression in this codebase.

The test. Would these two callsites change together if the underlying domain changed? If yes, extract. If no, leave them.

Two examples from this codebase.

**Looks duplicated, must stay separate.**

```ts
// jobs.service.ts
private buildJobLabel(job: Job): string {
  return `${job.propertyName} - ${job.scheduledFor.toISOString()}`;
}

// webhook-deliveries.service.ts
private buildDeliveryLabel(d: WebhookDelivery): string {
  return `${d.endpointUrl} - ${d.attemptedAt.toISOString()}`;
}
```

Identical structure. Different domains. If the audit log later asks for jobs as `"<property>, <time>"`, that is a job-side change. The webhook label keeps its dash. A shared `buildDashLabel` helper would force one of them to lie.

**Looks similar, should be extracted.**

```ts
// jobs.repository.ts and properties.repository.ts and workers.repository.ts
// All three of these contain:
async findManyByTenant(operatorId: string, where: Where) {
  return this.prisma.X.findMany({ where: { ...where, operatorId } });
}
```

Three repositories applying the same tenant scope by hand. The domain rule is one rule. `tenantId` enforcement on every read is part of `shared/04-rbac.md`, not part of jobs. This belongs in a Prisma client extension, the work that F-001 already plans (see `docs/BUILD.md`). Extract.

The discriminator. If the rule in the comment is the same, extract. If only the shape is the same, leave them.

A useful exercise during review. Write the comment that would sit above each piece of code in plain English. If the two comments are the same sentence, you have a single rule expressed twice. If the comments differ, you have two rules that happened to compile to the same characters.

```ts
// Comment A. "Return zero rows if the actor is not allowed to see this tenant's data."
// Comment B. "Return zero rows if the actor is not allowed to see this tenant's data."
// Same sentence. Extract.

// Comment A. "Format a job for the dispatch board card."
// Comment B. "Format a delivery for the webhook log row."
// Different sentences. Leave them.
```

The cheap heuristic. If the variable names inside the two functions diverge once you read past the first line, the functions are not the same. If they stay parallel all the way down, they probably are.

## When to add a helper

A helper is a named function in a `shared/` or `utils/` file. The bar is low but not zero. Every checkbox must be true.

1. Three or more real callers exist today, not "I will need this later".
2. The helper has a single named responsibility. If the name needs `And`, split it.
3. The helper has its own unit test in a `*.spec.ts` next to it.
4. Callers do not get worse to read. No new parameter exists only to keep the helper generic.
5. The helper does not reach across module boundaries. A helper used in `jobs` and `webhooks` lives in `shared/`, not in `jobs/`.

A helper that adds a `mode` flag so it can serve two callers is a failed helper. The mode flag means the two callers wanted different things and the helper is pretending they wanted the same thing. Split it back.

Example of a helper that earns its place.

```ts
// apps/api/src/shared/scope/resolve-property-scope.ts
export function resolvePropertyScope(actor: ActorContext): string[] {
  // Returns the property ids in the actor's grant. Empty array means
  // tenant-wide. Used by jobs, properties, schedules, analytics.
  ...
}
```

Four callers in the build plan (`F-023`, `F-021`, `F-025`, `F-080`). One responsibility. Tested. No parameter knobs.

## When to add an abstraction

An abstraction is heavier. A base class, a generic type, a factory, a mixin, a higher-order function that returns a class. The bar is higher.

1. Four or more real callers exist today.
2. The variation between callers is in **shape**, not just values. If the only differences are the strings and the model name, that is a generic worth building. If the differences include "this one logs differently" and "this one has a side effect on save", it is not the same shape.
3. The cost of maintaining the abstraction is less than the cost of changing four sites in lockstep when the rule changes.
4. The abstraction can be read in under five minutes by a new agent who has not seen it before. If a reader needs to chase types through three files to know what the abstraction does, it is too clever.

Example of an abstraction that earns its place. The `PolicyEvaluator` in F-014. Five named policies on day one, more arriving in every feature wave. Every policy returns the same `Allow | Deny(reason)` shape. The cost of inlining `canTransitionJob`, `canAssignWorker`, `canVerifyJob`, `canDeleteWorker`, `canIssueInvite` into their callsites would mean copying the audit-write logic five times. The abstraction wins.

Counter-example. A `BaseRepository<T>` that all repositories extend. Tempting after the third repository ships. Then F-023 needs a job-specific bulk filter, F-025 needs schedule materialization, F-080 needs an aggregation query that does not fit any base method. Within a wave, the base class becomes the place where every special case is bolted on, until it has more methods than any individual repository would have. Leave the repositories alone. They look like duplication. They are not. Each one owns a different aggregate.

A second counter-example. A `CrudController<T>` generic that wraps NestJS routing for the five resource controllers in wave 3. It looks like four endpoints repeated five times. It is. Each one then needs custom auth decorators per route, custom filters per resource, custom DTOs, and the generic becomes a series of escape hatches. The repetition was the readability. Keep it.

The takeaway. Abstractions trade lockstep editing for indirection. Indirection costs more in this codebase than lockstep editing because the reviewer reads diffs and not the live source.

## What never gets abstracted

Three categories. Each site has to read clearly on its own.

| Category | Why |
|---|---|
| **Authorization checks** | Every site is a security boundary. A hidden `requireRole` helper inside a wrapper makes the deny path invisible at the callsite. Read `shared/04-rbac.md`. The four layers are enforced where they are checked. |
| **Error messages** | Each callsite knows what its user is doing and can word the error precisely. A `THROW_NOT_FOUND` helper that takes a string strips the context that makes the error useful. Throw a domain exception, write the message inline. |
| **Validation rules at the HTTP boundary** | The DTO owns the input shape. A `validateCreateJobBody` helper called from inside the service is the wrong shape. Validation lives in the DTO with `class-validator` decorators. Inside the service, trust the input. This is already in `shared/01-conventions.md` under "Async and error handling". |

If a code review finds an `auth-utils.ts` or an `errors.ts` that wraps these, the PR is rejected and the work is unwound.

## Naming as the cheap refactor

Renaming a variable is free. Extracting a function is expensive. When code feels muddy, try the cheaper move first.

Before extracting `formatJobLabel`, ask whether the muddiness is actually `const x = job.propertyName + ' - ' + job.scheduledFor.toISOString()`. Rename `x` to `jobLabel` and you have done 80 percent of the work of extracting, without any of the cost.

The order to try things when code feels wrong.

1. Rename the variable.
2. Rename the function.
3. Reorder the lines so the story reads top to bottom.
4. Split the function into two named functions inside the same file.
5. Move one of them to a shared file. Only at this step have you taken on a maintenance cost.

If you find yourself at step five often, the underlying issue is usually that the **service** is too wide. Split the service. A service that does five things benefits more from being two services than from having more helpers.

A worked example. `jobs.service.ts` grows to 800 lines as F-023 lands and F-024 adds the state machine. The instinct is to extract `job-status.helpers.ts`. A better move first. Rename `update` to `updateMetadata` and `transition` to `transitionStatus`. Reorder the methods so create-flow is at the top, transition-flow in the middle, query-flow at the bottom. The file is still 800 lines but it now reads top to bottom. If after that the file still feels wrong, split the service into `JobsService` and `JobsTransitionService` rather than `jobs-helpers.ts`. Services have boundaries, helpers do not.

## Comments rule

The codebase strongly prefers self-explanatory names. Comments earn their place by explaining **why**, never **what**.

This rule already lives in `shared/01-conventions.md`. It is restated here because it is part of the refactoring discipline. A reviewer who finds a comment that just repeats the code deletes it. A reviewer who finds a comment that explains a non-obvious business rule, an invariant, or a workaround leaves it.

Quick test.

```ts
// Bad. Restates the code.
// Loop over the jobs
for (const job of jobs) { ... }

// Bad. The function name says this.
// This function transitions a job to the next status
async transitionStatus(...) { ... }

// Good. Explains an invariant.
// Outbox row must be written in the same transaction as the status
// change. If you split this, the dispatch board can show a state
// the database does not have.
await this.prisma.$transaction(async (tx) => { ... });
```

If the comment vanishes and a reader could still answer the same question, the comment was not earning its place.

## The future agent test

Before extracting a helper, simulate the future. A different agent picks up your helper a month from now while implementing a different task. They see the helper name in an import. They have not read the helper's source.

Can they use it correctly?

If yes, the helper is finished. If no, one of these is true and must be fixed before the helper ships.

1. The name does not describe the contract. Rename it.
2. The helper has hidden side effects. Either make them visible by renaming (`writeAndLogAudit`) or split them.
3. The helper requires a specific call order with other helpers. Either combine them or document the order with a `@throws` and a precondition in JSDoc.
4. The helper's return shape is ambiguous. Tighten the return type. `Promise<JobResponseDto>` is good, `Promise<any>` is failure, `Promise<Record<string, unknown>>` is the failure with a costume.

The test for "can the agent use this without reading the source" is roughly the same as "can the reviewer read the diff in 60 seconds and walk away confident", which is the standard set in `shared/AGENT.md`.

## Refactor cadence

Big refactors are dangerous in this codebase because the build plan expects features to land in waves with parallel agents. A refactor commit that lands in the middle of a feature PR forces every other reviewer in that wave to re-read code they had already approved.

The rules.

| Rule | Reason |
|---|---|
| Refactors are PRs of their own. | A reviewer can read a refactor diff knowing the goal is "no behavior change". Mixing a refactor into a feature PR makes the reviewer prove both. |
| Refactors do not run in the same wave as a feature that touches the refactored code. | Two agents editing the same lines in parallel waves is the classic cause of merge regressions. |
| A refactor PR has the same definition of done as a feature PR. Lint, typecheck, tests, all green. The diff has zero new TODO markers. | Refactors that leave debris are not refactors, they are excavations. |
| Refactor commits use the `refactor:` Conventional Commits prefix and reference no task id unless one was opened specifically for the refactor. | Searchable later. |

When you spot a refactor opportunity while implementing a feature, write it down. Add it as a note in the PR description, or open a follow-up task in `docs/BUILD.md`. Do not bundle it.

## Dead code

Deleted, not commented out.

If a thing is "for later", it lives in a `docs/BUILD.md` task description, not in source. The build plan is the inventory of future work. The source tree is the inventory of code that ships.

| What to do | What not to do |
|---|---|
| `git rm path/to/file.ts` | `// const old = ...` |
| Reference the deletion in the PR description. | Leave it commented for "history". |
| Open a v3 task if the deletion was premature. | Hide a TODO inside a commented block. |

Git history is the history. The working tree is not a museum.

A single exception. A scaffolded stub that the next wave will fill in is allowed if it has a `TODO(task-id)` marker. The stub must compile, return a sensible default or throw a `NotImplementedException`, and reference the task that will complete it. See the format in `shared/01-conventions.md` under "TODO, FIXME, HACK markers".

```ts
// GOOD. Stub with a marker pointing at the next task.
// TODO(F-110): wire to outbox writer when the event bus lands.
async emit(event: DomainEvent): Promise<void> {
  throw new NotImplementedException('event bus arrives in F-110');
}

// BAD. Stub with no reference. Will rot.
async emit(event: DomainEvent): Promise<void> {
  // do nothing for now
}
```

A stub without a task id is a leak. The build plan is the truth source. Stubs that do not trace back to it get deleted in review.

## The decision log

Architectural decisions that are non-obvious go in `docs/decisions/<NN>-<title>.md`. The folder is created on demand. Numbering is two-digit, zero-padded, in commit order.

What counts as non-obvious.

- A choice that looks wrong at first read but is right for a reason that lives in another part of the system.
- A trade-off where the alternative was discussed and rejected.
- A coupling that an outside reader would call odd.

Examples that this codebase needs decision-log entries for.

| Decision | Why it is not obvious |
|---|---|
| Apollo Client and TanStack Query both live in the web app. | A typical project picks one. CrewMate uses Apollo for GraphQL with subscriptions and TanStack Query for REST and file uploads. The split is intentional. See `docs/BUILD.md` tech stack table. |
| Outbox pattern for events rather than direct queue publish from services. | Direct publish loses events on Postgres crash mid-transaction. Outbox plus relay is the safer pattern. See `F-110`. |
| Zustand is allowed only for ephemeral UI state, never as a server-state cache. | Most React stacks use Zustand for everything. CrewMate splits server state into Apollo + TanStack Query and reserves Zustand for things like "is the drawer open". The rule prevents the slow drift where Zustand becomes a cache layer. |
| Job state machine lives in `apps/api/src/jobs/state/job-state.ts` as a pure function, not as a method on the entity. | Pure functions are exhaustively testable. The trade is that the function takes the actor role as a parameter rather than reading it from a request scope. See `F-024`. |

The format is short. Two paragraphs of context, one paragraph of decision, one paragraph of consequences. No essays. The audience is a future agent who is about to undo the decision without understanding it.

A decision-log entry is not a place to defend the choice. It is a place to record the trade. If a later wave wants to revisit the decision, the entry tells them what they would be giving up. The entry stays in the tree forever, never edited after merge. If the decision is reversed, a new entry supersedes it and links back.

A working template.

```md
# 03 Apollo + TanStack Query split

## Context
What the system looked like when this came up. What alternatives were on the table.

## Decision
What we chose. One paragraph. Active voice.

## Consequences
What this costs us. What it buys us. What a future agent should know before reversing it.
```

## Code review acceptance gates

Echoing the rule from the build plan and from `shared/AGENT.md`. Every PR meets all of the following before it can merge.

1. `pnpm lint` exits zero.
2. `pnpm typecheck` exits zero.
3. `pnpm test` exits zero.
4. New code has tests at the appropriate level. New service methods have a unit test. New endpoints have an e2e test. New components have at least a smoke test that they render.
5. The commit message follows Conventional Commits and references the task id when one exists. `feat(jobs): add transition endpoint (F-024)`.
6. The PR description names the files touched and any deviation from the task spec.
7. No new `any`, no new `console.log`, no new default export. The banned-patterns list in `shared/01-conventions.md` is the canonical list.
8. No new helper or abstraction violates this document.

A PR that fails any of these is rejected with a one-line review pointing at the failing rule. Re-roll, do not bargain.

## Summary table

| Question | Answer |
|---|---|
| When do I extract a helper? | Three real callers, single responsibility, has a test, callers do not get worse to read. |
| When do I build an abstraction? | Four real callers, the variation is in shape not values, an outside reader can understand it in five minutes. |
| What never gets abstracted? | Authorization checks, error messages, HTTP boundary validation. |
| Two functions look identical, do I merge them? | Only if the domain rule is the same. If the comments would differ, leave them. |
| Code feels muddy, what do I do first? | Rename the variable. Then the function. Extracting is the last move, not the first. |
| Can I bundle a refactor with my feature PR? | No. Refactor PRs are separate. |
| What do I do with code that is "for later"? | Delete it. The build plan in `docs/BUILD.md` is the inventory. |
| Where do non-obvious architectural decisions go? | `docs/decisions/<NN>-<title>.md`. Created on demand. |
| What is the single rule behind everything in this file? | Will a future change be easier or harder because this rule is followed? |
