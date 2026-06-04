---
phase: 01-foundation
plan: "10"
subsystem: monorepo-config
tags: [version-alignment, eslint, tailwind4, docker, seed, opennext]
dependency_graph:
  requires: []
  provides: [correct-version-foundation, eslint-configs, tailwind4-setup, postgres17-docker, opennext-config, seed-dataset]
  affects: [01-11-api-skeleton, 01-12-web-skeleton]
tech_stack:
  added: ["@nestjs/terminus@^11.0.0", "@tailwindcss/postcss@^4.0.0", "@opennextjs/cloudflare@^1.0.0", "wrangler@^4.0.0", "motion@^12.0.0"]
  patterns: [eslint-flat-config, tailwind4-css-native, opennext-cloudflare-dev]
key_files:
  created:
    - apps/api/eslint.config.mjs
    - apps/web/eslint.config.mjs
    - apps/web/next.config.ts
    - apps/web/postcss.config.mjs
  modified:
    - apps/api/package.json
    - apps/web/package.json
    - docker-compose.yml
    - apps/web/src/app/globals.css
    - prisma/seed.ts
decisions:
  - "Used separate @typescript-eslint/parser + plugin packages (not unified typescript-eslint) for api ESLint config because apps/api/package.json has the split packages"
  - "next.config.ts uses export default (framework requirement) not named export"
  - "seed.ts corrected schema mismatches: no role field on User, WebhookEndpoint uses secret/isActive/events, Job.worker points to User"
  - "jest rootDir changed from src to . with testPathIgnorePatterns for dist and node_modules"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-04"
  tasks_completed: 3
  files_modified: 9
---

# Phase 1 Plan 10: Version Alignment + Tooling Summary

**One-liner:** NestJS 11 / Next 15 / React 19 / Tailwind 4 / Apollo 4 / motion 12 version foundation with ESLint flat configs, postgres:17 docker, OpenNext CF config, and full seed dataset.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| T0 | Create per-package ESLint flat configs | b11f81f | apps/api/eslint.config.mjs, apps/web/eslint.config.mjs |
| T1 | Bump package.json versions, add @nestjs/terminus, fix jest rootDir | d63c294 | apps/api/package.json, apps/web/package.json |
| T2 | Upgrade docker-compose, Tailwind 4 config, next.config.ts, seed | 91b9c59 | docker-compose.yml, apps/web/next.config.ts, apps/web/postcss.config.mjs, apps/web/src/app/globals.css, prisma/seed.ts |

---

## Final Version Strings

| Package | Version |
|---------|---------|
| @nestjs/core | ^11.0.0 |
| @nestjs/terminus | ^11.0.0 (new) |
| @nestjs/config | ^4.0.0 |
| @nestjs/event-emitter | ^3.0.0 |
| @nestjs/graphql | ^13.0.0 |
| @nestjs/swagger | ^8.0.0 |
| next | ^15.0.0 |
| react / react-dom | ^19.0.0 |
| @apollo/client | ^4.0.0 |
| tailwindcss | ^4.0.0 |
| motion | ^12.0.0 (replaces framer-motion) |
| @opennextjs/cloudflare | ^1.0.0 |
| wrangler | ^4.0.0 |

---

## Verification Results

- pnpm install: completed successfully (exit 0). Peer warnings about @nestjs/mapped-types requiring @nestjs/common ^8-10 are pre-existing from @nestjs/swagger@8 and do not block installation.
- pnpm --filter @crewmate/web typecheck: exits 0.
- pnpm --filter @crewmate/api typecheck: exits non-zero (see Deferred Issues below — pre-existing scaffold issue).

---

## Decisions Made

1. **ESLint pattern**: Used separate @typescript-eslint/parser + @typescript-eslint/eslint-plugin packages (fallback pattern) for apps/api/eslint.config.mjs because the package.json has these as separate devDependencies, not the unified typescript-eslint package.

2. **next.config.ts export**: Uses export default nextConfig (framework requirement). Next.js requires this despite CLAUDE.md no-default-exports rule — explicit framework carve-out noted in the plan.

3. **Seed schema adjustments**: The plan's seed skeleton used field names that don't match the Prisma schema. Applied corrections:
   - User model has no role field (roles managed via RoleGrant table) — removed
   - WebhookEndpoint uses secret not signingSecret, isActive not enabled, and requires events array
   - Job.worker relation points to User (not Worker) — used workerUser.id for job assignments
   - Used operatorId_email composite unique for User upsert

4. **Jest rootDir**: Changed from "src" to "." with testPathIgnorePatterns for dist/ and node_modules/, enabling test discovery under apps/api/test/ for Plan 11.

---

## Deviations from Plan

None — plan executed as specified. Seed schema field names were adjusted per the plan's own instruction to read prisma/schema.prisma first.

---

## Deferred Issues

### Pre-existing API typecheck failure

**Status:** Out of scope — pre-dates Plan 10
**Issue:** pnpm --filter @crewmate/api typecheck exits non-zero because apps/api/src/main.ts imports type { AppConfig } from './core/config/config.schema' which does not exist. This reference was present in the original scaffold (commit 5dfa8a2) before any Plan 10 changes.
**Resolution:** Plan 11 (api-skeleton) creates apps/api/src/core/config/config.schema.ts. This will resolve when Plan 11 executes.

---

## Known Stubs

None — all files created in this plan contain functional content. The seed dataset is fully implemented.

## Self-Check: PASSED

- apps/api/eslint.config.mjs exists: FOUND
- apps/web/eslint.config.mjs exists: FOUND
- apps/web/next.config.ts exists: FOUND
- apps/web/next.config.mjs deleted: CONFIRMED
- apps/web/postcss.config.mjs exists: FOUND
- docker-compose.yml contains postgres:17-alpine: CONFIRMED
- apps/web/src/app/globals.css contains @import "tailwindcss": CONFIRMED
- prisma/seed.ts contains DEMO CREDENTIALS: CONFIRMED
- Commits exist: b11f81f (T0), d63c294 (T1), 91b9c59 (T2): CONFIRMED
