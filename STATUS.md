# CrewMate — Project Status

> Single source of truth for session continuity. Updated by `/track` at the end of every session or after a significant task completes. Read by `cm-orchestrator` at the start of every session.

---

## Current Phase

**Phase 0 — Scaffold + Deploy Pipeline**
Status: `IN PROGRESS`

---

## Last Session

**Date:** 2026-06-05
**Summary:** Agent harness complete (12 agents, 7 skills, PLAYBOOK.md, MCP wiring). CLAUDE.md written. Ports locked (web :6200, API :6201). credentials.md created (git-excluded). Phase 0 Wave 1 started — CLAUDE.md done, pnpm monorepo next.
**Completed by:** cm-orchestrator

---

## Active Right Now

Phase 0 Wave 1 — Foundation Files (monorepo root, docker-compose, prisma schema, shared API types) — IN PROGRESS

---

## Blocked

_Nothing blocked._

---

## Next Up

Start Phase 0 — in order:
1. Create `CLAUDE.md` (agent context file)
2. Scaffold pnpm monorepo (`pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`)
3. NestJS 11 app scaffold (`apps/api/`)
4. Next.js 15 app scaffold (`apps/web/`)
5. Prisma schema (`prisma/schema.prisma`) — the shared contract

Full task breakdown: `.planning/STATE.md`

---

## Completed Phases

_None yet._

---

## Quick Reference

| Thing | Location |
|---|---|
| Full task breakdown | `.planning/STATE.md` |
| Phase roadmap | `ROADMAP.md` |
| PRD screens | `docs/PRD/screens/` |
| Agent roster | `.claude/agents/_INDEX.md` |
| Conventions | `docs/conventions/_INDEX.md` |
