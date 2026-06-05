# /track — Session State Tracker

Updates `STATUS.md` and `.planning/STATE.md` to keep project state current across sessions. Lightweight — reads both files, makes the requested update, writes back.

---

## Commands

### `/track done <task>`
Mark a task complete in `.planning/STATE.md`. Changes `[ ]` or `[~]` → `[x]` for the matching task.

```
/track done "CLAUDE.md"
/track done "GET /jobs endpoint"
/track done "Phase 0"
```

If marking an entire phase done, also update `STATUS.md` — move it to "Completed Phases" and advance "Current Phase".

---

### `/track active <task>`
Mark a task as in progress. Changes `[ ]` → `[~]` and adds it to "Active Right Now" in `STATUS.md`.

```
/track active "apps/api/ NestJS scaffold"
```

---

### `/track blocked <task> -- <reason>`
Mark a task as blocked. Changes to `[!]` in `.planning/STATE.md` and adds to "Blocked" in `STATUS.md`.

```
/track blocked "deploy-api.yml" -- "RAILWAY_TOKEN secret not set in GitHub"
```

---

### `/track unblocked <task>`
Clear a block. Returns `[!]` → `[ ]` and removes from "Blocked" in `STATUS.md`.

---

### `/track session <summary>`
Write a session summary to `STATUS.md`. Updates "Last Session" with today's date and the provided summary. Call this at the end of every working session.

```
/track session "Completed Phase 0 Wave 1. Monorepo scaffold, Prisma schema, and shared types file done. Wave 2 (app scaffolds) is next."
```

---

### `/track add <task>`
Add a task to the `## Discovered` section in `.planning/STATE.md`. Use mid-wave when a new idea or bug surfaces and you don't want to interrupt current execution.

```
/track add "bug: Worker earnings wrong when job is cancelled mid-progress"
/track add "idea: add job count badge to sidebar nav items"
/track add "GET /workers/:id/timeline endpoint — needed for drawer"
```

Appends as `- [ ] {task}` under `## Discovered`. Prefix with `bug:` or `idea:` if helpful for triage. These get reviewed and assigned to a wave the next time `/plan` runs.

---

### `/track next`
Read-only. Reports the next unfinished task(s) from `.planning/STATE.md` based on current phase and wave. No writes.

---

### `/track status`
Read-only. Prints the full contents of `STATUS.md` and a summary of `.planning/STATE.md` (counts per phase: done/active/blocked/todo). No writes.

---

## How You Execute

1. Read `STATUS.md` and `.planning/STATE.md`
2. Apply the requested change (checkbox update, section update, or log entry)
3. Write the updated file(s) back
4. Confirm what changed in one line

**Rules:**
- Never reformat or restructure the files — only change the specific lines needed
- For `/track done` on a phase-level item, also add a row to the "Completed Phases" table in `STATUS.md`
- For `/track session`, always use today's date in `YYYY-MM-DD` format
- The Notes/Decisions log in `.planning/STATE.md` is append-only — never edit past entries
- If the task string is ambiguous (matches multiple lines), list the matches and ask which one
