# 08 — Phase 5: Tests and final polish

**Goal.** The light testing layer is in place; CI runs it on every PR; the final visual and behavioral polish pass is complete. Production has already been live since phase 1; phase 5 verifies and hardens it rather than provisioning it.

**Gate condition.** `pnpm test && pnpm test:e2e` green in CI on a dummy PR. The PROD-SMOKE.md checklist passes against `https://crewmate.ritaro.dev`.

**Concurrency cap.** 4 agents. No IaC ordering constraints, because the IaC was finished in phase 1.

**Estimated wall-clock.** ~3h at cap.

**Input.** Phase 4 gate signed off.

---

## Wave 5.0 — Critical-path tests

**Tool:** `/goal`
**Concurrency:** 2 (wave 5.0 and 5.1 are mutually parallel)

```
/goal
Ensure all four critical-path unit test files plus the one Supertest e2e file pass per
docs/guardrails/backend/03-testing.md. Done when:
- apps/api/src/jobs/state/job-state.spec.ts — full transition matrix
- apps/api/src/rbac/policies/policy-evaluator.spec.ts — representative allow/deny cases
- apps/api/src/auth/refresh-token-rotation.spec.ts — happy path + replay + family revocation
- apps/api/src/webhooks/delivery/sign.spec.ts — HMAC signing and symmetric verify
- apps/api/test/e2e/v0.1-happy-path.e2e-spec.ts — Supertest happy path
- pnpm --filter @crewmate/api test && pnpm --filter @crewmate/api test:e2e both exit 0
- pnpm lint && pnpm typecheck exit 0 across the entire monorepo
- code-reviewer subagent returns no blocking issues
- changes committed to task/p5-F-130-tests

Files in scope: the five test files listed above only
— or stop after 25 turns
```

---

## Wave 5.1 — Deferred polish

**Tool:** `/goal` per item
**Concurrency:** up to 4 (parallel-safe with wave 5.0)

Address any polish items deferred from phase 2.3 visual review or phase 4 wire-up. Dispatched per item; one `/goal` session per polish task. Skip this wave if nothing deferred.

Example template for a single polish item:

```
/goal
Polish <screen or component>. Done when:
- <specific visual or behavioral issue> is resolved
- pnpm --filter @crewmate/web typecheck exits 0
- pnpm --filter @crewmate/web lint exits 0
- code-reviewer subagent returns no blocking issues
- change is committed to task/p5-polish-<slug>

Files in scope: <exact file paths only>
— or stop after 20 turns
```

---

## Wave 5.2 — Production smoke checklist

**Tool:** `/goal`
**Concurrency:** 1 (runs after 5.0 and 5.1 stabilize)

```
/goal
Write docs/execution/PROD-SMOKE.md. Done when:
- The file documents a reproducible click-through plus curl sequence that confirms the
  live app at https://crewmate.ritaro.dev is healthy after any future deploy
- Includes: home page loads, login as seeded admin works, dispatch board renders with data,
  job transition works, webhook test delivery appears in the log within seconds,
  two browsers see the realtime update, /api/healthz returns 200,
  a direct ALB request without the shared secret returns 401
- Each step has a copy-pastable command or click path
- code-reviewer subagent returns no blocking issues
- change is committed to task/p5-F-123-prod-smoke

Read: docs/BUILD.md layer 12, docs/execution/00-phasing.md phase 5 gate
Files in scope: docs/execution/PROD-SMOKE.md only
— or stop after 20 turns
```

---

## Phase 5 gate

`pnpm test && pnpm test:e2e` green in CI on a dummy PR. Visit `https://crewmate.ritaro.dev`; walk the happy path one final time. The PROD-SMOKE.md checklist passes against the live URL.

**`PHASE_5_GATE`** — the portfolio is shipped.
