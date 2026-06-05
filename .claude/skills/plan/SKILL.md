# /plan — Wave Planner

Breaks a wave goal into parallel tasks and writes them into `.planning/STATE.md`. Reads PRD + ROADMAP before planning. Considers `## Discovered` items for triage.

---

## Usage

```
/plan "Phase 0 Wave 2 — app scaffolds"
/plan "Phase 1 Wave 1B — Jobs API"
/plan "Phase 2 2D — Dashboard screen"
```

---

## How You Execute

1. Read `.planning/STATE.md` and `ROADMAP.md`
2. Read relevant PRD screen file(s) for the wave goal
3. Check `## Discovered` in STATE.md — decide if any items belong in this wave
4. Write the wave breakdown directly into STATE.md under the correct phase/wave section
5. Move triaged Discovered items from `## Discovered` into the wave (remove from Discovered)

**Task format:**
```
### Wave N — Label

- [ ] `exact/file/path.ts` — one-line description
- [ ] `exact/file/path.ts` — one-line description
```

**Rules:**
- Tasks in a wave are parallel — if A depends on B, they go in separate waves
- Every task must have a specific file path
- One line per task, no sub-bullets, no acceptance criteria
- Schema changes always get their own wave (they block everything downstream)
- Flag security tasks with ⚠️: `- [ ] ⚠️ \`path/guard.ts\` — JwtAuthGuard + RolesGuard`
- Never reformat existing STATE.md content — only insert the new wave section
