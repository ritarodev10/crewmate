# /handoff — Session Handoff

Compacts the current conversation into a handoff document so the next session or agent can continue without re-litigating decisions. Captures what isn't in code, commits, or wave summaries.

---

## Usage

```
/handoff
/handoff "next session: implement Jobs Kanban screen"
/handoff "next session: debug WebSocket not updating UI"
```

If called with an argument, tailor the document toward that next-session focus.

---

## Output

Save to `docs/handoffs/handoff-{YYYYMMDD}-{contextual-name}.md`.

The contextual name describes what this session was about — not what's next. Use kebab-case, 2–4 words.

Examples:
- `docs/handoffs/handoff-20260605-agent-harness-setup.md`
- `docs/handoffs/handoff-20260606-jobs-api-planning.md`
- `docs/handoffs/handoff-20260607-dashboard-screen-debug.md`

---

## Document Structure

```markdown
# Handoff: {contextual name}

**Date:** YYYY-MM-DD
**Session focus:** one line — what this session was actually about
**Next session focus:** one line — what should happen next (from argument, or inferred)

---

## State

> Don't duplicate — reference by path.

- Phase: [read from STATUS.md]
- Active tasks: [read from .planning/STATE.md]
- Last wave summary: `docs/handoffs/` or `.planning/summaries/` — link the file
- Full task breakdown: `.planning/STATE.md`

---

## What Happened This Session

Short bullet list. What was built, decided, or changed. Do not repeat what's already in wave summaries or commits — reference them instead.

---

## Decisions Made

Things decided in conversation that aren't obvious from the code or docs.

| Decision | Why | Alternative considered |
|---|---|---|
| ... | ... | ... |

---

## Tried and Dropped

Approaches that were explored and rejected. The most important section — prevents the next session from repeating the same dead ends.

| Approach | Why dropped |
|---|---|
| ... | ... |

---

## Constraints Discovered

Non-obvious constraints that surfaced this session — framework limitations, API quirks, deploy gotchas, data shape surprises.

- ...

---

## Next Session

What to do first. Be specific — file paths, agent to spawn, command to run.

1. ...
2. ...

**Suggested agents:** cm-frontend / cm-backend / cm-debug / etc.
**Suggested skills:** /plan / /wave-done / /track / etc.
```

---

## Rules

- Never duplicate content in `STATUS.md`, `.planning/STATE.md`, wave summaries, or commits — reference by path
- The "Tried and Dropped" section is mandatory — write "nothing tried and dropped this session" if truly empty, don't omit it
- Redact any secrets, tokens, or credentials that appeared in the conversation
- `docs/handoffs/` is append-only — never edit past handoff files
