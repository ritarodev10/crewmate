# /wave-done — Wave Summary

Runs after a wave completes. Reads git diff, generates `.planning/summaries/{wave}.md`, checks for convention drift, marks STATE.md tasks done.

---

## Usage

```
/wave-done "Wave 1 — Foundation Files"
/wave-done "1B"
```

---

## How You Execute

### 1 — Get the changes

```bash
git log --oneline -5              # find the right range if wave spanned multiple commits
git diff HEAD~1 --name-only       # files changed in last commit
git diff HEAD~1                   # full diff
```

If work is uncommitted, use `git diff` instead of `git diff HEAD~1`.

### 2 — Read changed files

Group by domain: `apps/api/` → backend, `apps/web/` → frontend, `prisma/` → schema.

### 3 — Check convention drift

Load the relevant convention docs and compare each changed file against them:

| Domain | Convention docs |
|---|---|
| `apps/api/**` | `docs/conventions/backend/api.md`, `modules.md`, `prisma.md` |
| `apps/web/**` | `docs/conventions/frontend/components.md`, `state.md`, `routing.md`, `performance.md` |
| `prisma/**` | `docs/conventions/backend/prisma.md` |
| Any | `docs/conventions/shared/typescript.md`, `naming.md`, `security.md` |

A drift is any deviation from convention. If the reason is visible in the code or a comment, include it. If unexplained, flag it as such — don't invent a reason.

### 4 — Write summary

Create `.planning/summaries/sum-{YYYYMMDD}-{contextual-name}.md`.

The contextual name should describe what was actually built — not the wave number. Use kebab-case, 2–4 words.

Examples:
- `sum-20260605-monorepo-scaffold.md`
- `sum-20260605-jobs-api.md`
- `sum-20260606-dashboard-screen.md`
- `sum-20260606-auth-module.md`

---

Content:

```markdown
# Wave Summary: {wave name}

**Date:** YYYY-MM-DD
**Phase:** Phase N
**Commits:** {hash or range, or "uncommitted"}

## Files Changed

| File | Change | Why |
|---|---|---|
| `path/to/file.ts` | created | what it does |
| `path/to/file.ts` | modified | what changed and why |

## Convention Drift

| File | Convention | Deviation | Reason |
|---|---|---|---|
| `file.ts:45` | `backend/api.md — money in cents` | used float | framework coercion in ORM layer |

_No drift detected._ ← use this line if fully compliant, don't omit the section

## Notes

Non-obvious decisions, tradeoffs, or constraints encountered during this wave.
```

### 5 — Update STATE.md

Mark each completed task `[x]`. If partially done, mark `[~]`. Never reformat — only change the specific checkbox lines.

---

## Rules

- Summary files are append-only — never edit past summaries
- The drift section is always present — either a table or "No drift detected"
- Don't invent drift that isn't there, don't omit drift that is
