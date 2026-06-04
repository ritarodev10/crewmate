---
phase: "01"
plan: "12"
subsystem: web
tags: [next.js, cloudflare-workers, tailwind, proxy, dockerfile]
dependency_graph:
  requires: ["01-10"]
  provides: [web-placeholder-page, cloudflare-worker-proxy, api-dockerfile]
  affects: [deploy-web, cloudflare-worker-bundle]
tech_stack:
  added: []
  patterns:
    - "Cloudflare Worker ExportedHandler with /api prefix strip before forwarding to BACKEND_ORIGIN"
    - "Minimal local cloudflare-env.d.ts for Worker globals (ExportedHandler, ExecutionContext, Fetcher)"
    - "OpenNext Cloudflare config with defineCloudflareConfig"
    - "Multi-stage Docker build: base→deps→builder→runner with pnpm workspace layout"
key_files:
  created:
    - apps/web/src/app/page.tsx
    - apps/web/src/worker/proxy.ts
    - apps/web/src/worker/cloudflare-env.d.ts
    - apps/web/wrangler.toml
    - apps/web/open-next.config.ts
    - docker/api.Dockerfile
    - .dockerignore
  modified:
    - apps/web/src/app/layout.tsx
    - pnpm-lock.yaml
decisions:
  - "Local cloudflare-env.d.ts used instead of @cloudflare/workers-types to avoid adding a new package (CLAUDE.md non-negotiable); the full package will be added in Phase 2 when wrangler generate-types is available"
  - "WebSocket upgrade forwards original request unchanged to preserve the Upgrade header"
  - "/api prefix stripped before forwarding to NestJS (which serves /healthz not /api/healthz)"
metrics:
  duration: "6 minutes"
  completed_date: "2026-06-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 2
---

# Phase 01 Plan 12: Web Skeleton Summary

Next.js placeholder login page with CrewMate branding, Cloudflare Worker proxy with /api prefix stripping, wrangler.toml bound to crewmate.ritaro.dev, OpenNext config, and multi-stage NestJS API Dockerfile.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 12-T1 | Next.js layout, placeholder login page, .env.local | 0de236f | layout.tsx, page.tsx, pnpm-lock.yaml |
| 12-T2 | Worker proxy, wrangler.toml, OpenNext config, API Dockerfile | 69517b8 | proxy.ts, cloudflare-env.d.ts, wrangler.toml, open-next.config.ts, api.Dockerfile, .dockerignore |

## What Was Built

**Placeholder login page** (`apps/web/src/app/page.tsx`): Styled server component with a centered card layout (max-w-sm, rounded-2xl, shadow-lg). Contains CrewMate wordmark, tagline, email/password form fields, and a sign-in button. No interactivity — form is a stub. Typecheck-clean with no `use client` directive.

**Root layout update** (`apps/web/src/app/layout.tsx`): Added `antialiased` class to `<body>`. The `globals.css` import was already present from plan 01-10.

**Worker proxy** (`apps/web/src/worker/proxy.ts`): Custom Cloudflare Worker entry implementing:
- `/api/*` → strip `/api` prefix, forward to `BACKEND_ORIGIN` (e.g. `/api/healthz` → `/healthz`)
- `/v1/*`, `/graphql`, `/ws` → forward as-is to `BACKEND_ORIGIN`
- WebSocket upgrades → pass original request unchanged
- `x-cloudflare-secret` header injected on all proxied requests
- Everything else → `openNextHandler.fetch()` (Next.js SSR)

**Wrangler config** (`apps/web/wrangler.toml`): Binds worker to `crewmate.ritaro.dev`, uses `src/worker/proxy.ts` as main, `nodejs_compat` + `global_fetch_strictly_public` flags, `[assets]` binding for `.open-next/assets`. No secrets in the file.

**OpenNext config** (`apps/web/open-next.config.ts`): Minimal `defineCloudflareConfig({})` — no custom options needed at this stage.

**API Dockerfile** (`docker/api.Dockerfile`): Four-stage build (base/deps/builder/runner) using `node:22-alpine` and `pnpm@10.15.0`. Runner stage copies `dist/`, `node_modules/`, `apps/api/node_modules/`, and `packages/` to support pnpm's virtual store layout.

**`.dockerignore`**: Created at repo root for `docker build -f docker/api.Dockerfile .` context.

**`apps/web/.env.local`**: Created with `NEXT_PUBLIC_API_URL=http://localhost:3000` and `NEXT_PUBLIC_WS_URL=ws://localhost:3000`. File is gitignored per `.gitignore` pattern `*.local` — not tracked in git.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added cloudflare-env.d.ts for missing Worker global types**
- **Found during:** Task 2 typecheck
- **Issue:** `Fetcher`, `ExecutionContext`, and `ExportedHandler` are Cloudflare Workers globals not present in TypeScript's default lib or the project's current `lib: ["dom", "dom.iterable", "esnext"]`. `@cloudflare/workers-types` is not installed.
- **Fix:** Created `apps/web/src/worker/cloudflare-env.d.ts` with minimal ambient declarations for the three types. Avoided installing a new package (CLAUDE.md: no new npm packages without approval). The file is intentionally minimal — the plan calls for `wrangler types` to be run in a later phase which will generate the full bindings file.
- **Files modified:** `apps/web/src/worker/cloudflare-env.d.ts` (created)
- **Commit:** 69517b8

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `apps/web/src/app/page.tsx` | 12 | `<form>` with no `onSubmit` | Intentional — authentication is Phase 3; this is the placeholder per plan spec |
| `apps/web/.env.local` | — | Not committed to git | Gitignored per `.gitignore`; exists locally for dev server |

The stub login form intentionally provides no functionality — it satisfies the Phase 1 gate ("placeholder login page at `https://crewmate.ritaro.dev`") without requiring any auth infrastructure.

## Self-Check: PASSED

- `apps/web/src/app/page.tsx` — FOUND
- `apps/web/src/app/layout.tsx` — FOUND (antialiased added)
- `apps/web/src/worker/proxy.ts` — FOUND
- `apps/web/src/worker/cloudflare-env.d.ts` — FOUND
- `apps/web/wrangler.toml` — FOUND
- `apps/web/open-next.config.ts` — FOUND
- `docker/api.Dockerfile` — FOUND
- `.dockerignore` — FOUND
- Commit 0de236f — FOUND
- Commit 69517b8 — FOUND
- `pnpm --filter @crewmate/web typecheck` — EXIT 0
