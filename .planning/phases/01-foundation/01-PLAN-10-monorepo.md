---
phase: 01-foundation
plan: "10"
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/package.json
  - apps/web/package.json
  - docker-compose.yml
  - prisma/seed.ts
  - apps/web/next.config.ts
  - apps/web/postcss.config.mjs
  - apps/web/src/app/globals.css
autonomous: true
requirements:
  - INFRA-06

new_dependencies:
  - name: "@nestjs/terminus"
    version: "^11.0.0"
    why: "Official NestJS health library for /healthz + /readyz; no hand-rolled alternative per RESEARCH.md"
    cost: "zero — MIT, no SaaS fees"
    flag: "CLAUDE.md non-negotiable: flag new deps. Flagging here."

must_haves:
  truths:
    - "pnpm install completes with no peer-dependency warnings about @nestjs/* at version 10 or react at version 18"
    - "pnpm --filter @crewmate/api typecheck exits 0 after the version bump"
    - "pnpm --filter @crewmate/web typecheck exits 0 after the version bump"
    - "docker-compose.yml references postgres:17-alpine, not postgres:16-alpine"
    - "apps/web runs Tailwind 4 CSS-native setup (no tailwind.config.js, @import in globals.css)"
  artifacts:
    - path: "apps/api/package.json"
      provides: "@nestjs/* ^11 deps, @nestjs/terminus ^11"
      contains: '"@nestjs/core": "^11'
    - path: "apps/web/package.json"
      provides: "next ^15, react ^19, tailwindcss ^4, @apollo/client ^4, motion"
      contains: '"next": "^15'
    - path: "docker-compose.yml"
      provides: "postgres:17-alpine service"
      contains: "postgres:17-alpine"
    - path: "apps/web/postcss.config.mjs"
      provides: "Tailwind 4 PostCSS plugin"
      contains: "@tailwindcss/postcss"
    - path: "apps/web/src/app/globals.css"
      provides: "Tailwind 4 CSS-native import"
      contains: '@import "tailwindcss"'
    - path: "apps/web/next.config.ts"
      provides: "OpenNext Cloudflare dev init"
      contains: "initOpenNextCloudflareForDev"
  key_links:
    - from: "apps/web/postcss.config.mjs"
      to: "node_modules/@tailwindcss/postcss"
      via: "PostCSS plugin resolution"
      pattern: "@tailwindcss/postcss"
    - from: "apps/web/next.config.ts"
      to: "@opennextjs/cloudflare"
      via: "initOpenNextCloudflareForDev import"
      pattern: "initOpenNextCloudflareForDev"
---

<objective>
Align all package versions to the spec before any scaffolding begins. The committed skeleton pins
NestJS 10 / Next 14 / React 18 / Tailwind 3 / Apollo Client 3 / framer-motion — all contradicted
by CLAUDE.md and CONTEXT.md. Building feature code on the wrong major versions produces a painful
forced re-bump later. This plan bumps all versions FIRST, then verifies typecheck passes on the
updated stubs so every subsequent plan builds on the correct foundation.

Also applies:
- docker-compose: postgres:16-alpine → postgres:17-alpine
- Tailwind 4 CSS-native setup (remove tailwind.config.js, replace @tailwind directives)
- next.config.mjs → next.config.ts with OpenNext Cloudflare dev init
- prisma/seed.ts: implement the demo dataset (stub currently logs "not yet implemented")

Purpose: Correct version foundation before any code is written; docker-compose aligned to prod
(Postgres 17 matches the RDS instance class in Terraform).

Output:
- apps/api/package.json — @nestjs/* ^11, @nestjs/terminus ^11 added, @nestjs/* devDeps bumped
- apps/web/package.json — next ^15, react/react-dom ^19, @apollo/client ^4, motion, tailwindcss ^4, @tailwindcss/postcss, @opennextjs/cloudflare ^1, wrangler ^4 (devDep); framer-motion removed
- docker-compose.yml — postgres:17-alpine
- apps/web/next.config.ts — replaces next.config.mjs; initOpenNextCloudflareForDev
- apps/web/postcss.config.mjs — @tailwindcss/postcss plugin
- apps/web/src/app/globals.css — @import "tailwindcss" + @theme tokens
- prisma/seed.ts — demo dataset implementation
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md

@apps/api/package.json
@apps/web/package.json
@docker-compose.yml
@apps/web/next.config.mjs
@apps/web/src/app/globals.css
@prisma/seed.ts
@docs/guardrails/shared/00-architecture.md
@docs/guardrails/shared/01-conventions.md
@docs/guardrails/backend/00-nestjs.md
</context>

<interfaces>
<!-- Key shapes the executor needs; extracted from existing codebase + CONTEXT.md -->

From apps/api/package.json — CURRENT pinned versions (all wrong, must be bumped):
  "@nestjs/common": "^10.4.0"  → target "^11.0.0"
  "@nestjs/core": "^10.4.0"    → target "^11.0.0"
  "@nestjs/platform-express": "^10.4.0" → target "^11.0.0"
  "@nestjs/config": "^3.2.0"   → target "^4.0.0"
  "@nestjs/bullmq": "^10.2.0"  → target "^11.0.0"
  "@nestjs/event-emitter": "^2.0.0" → keep (already 2.x, check Nest 11 compat)
  "@nestjs/graphql": "^12.2.0" → target "^13.0.0"
  "@nestjs/jwt": "^10.2.0"     → target "^11.0.0"
  "@nestjs/passport": "^10.0.3" → target "^11.0.0"
  "@nestjs/swagger": "^7.4.0"  → target "^8.0.0"
  "@nestjs/throttler": "^6.2.0" → keep (already 6.x, check compat)
  "@nestjs/websockets": "^10.4.0" → target "^11.0.0"
  "@nestjs/platform-socket.io": "^10.4.0" → target "^11.0.0"
  [devDeps] "@nestjs/cli": "^10.4.0" → target "^11.0.0"
  [devDeps] "@nestjs/schematics": "^10.2.0" → target "^11.0.0"
  [devDeps] "@nestjs/testing": "^10.4.0" → target "^11.0.0"
  NEW: "@nestjs/terminus": "^11.0.0"

From apps/web/package.json — CURRENT (all wrong, must be bumped):
  "next": "^14.2.0"           → target "^15.0.0"
  "react": "^18.3.0"         → target "^19.0.0"
  "react-dom": "^18.3.0"     → target "^19.0.0"
  "@apollo/client": "^3.11.0" → target "^4.0.0"
  "framer-motion": "^11.5.0"  → REMOVE (replaced by "motion")
  NEW: "motion"               → add as dep (no version pin — latest 12.x)
  [devDeps] "tailwindcss": "^3.4.0" → target "^4.0.0"
  [devDeps] "autoprefixer": "^10.4.0" → REMOVE (not needed in Tailwind 4)
  NEW devDep: "@tailwindcss/postcss": "^4.0.0"
  NEW devDep: "@opennextjs/cloudflare": "^1.0.0"
  NEW devDep: "wrangler": "^4.0.0"
  [devDeps] "@types/react": "^18.3.0" → target "^19.0.0"
  [devDeps] "@types/react-dom": "^18.3.0" → target "^19.0.0"
  [devDeps] "eslint-config-next": "^14.2.0" → target "^15.0.0"

Zod config schema (from CONTEXT.md) — executor will create this in wave 1.1:
  z.object({
    NODE_ENV, PORT, DATABASE_URL, REDIS_URL,
    JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, WEBHOOK_SIGNING_SECRET,
    CLOUDFLARE_SHARED_SECRET, CORS_ORIGIN?
  })

Tailwind 4 PostCSS config (from RESEARCH.md Pattern 3):
  // apps/web/postcss.config.mjs
  export default { plugins: { '@tailwindcss/postcss': {} } };

OpenNext next.config.ts (from RESEARCH.md Pattern 4):
  import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
  // ... rest of config ...
  initOpenNextCloudflareForDev();
  export const nextConfig: NextConfig = {};
  export default nextConfig;
</interfaces>

<tasks>

<task type="auto" id="10-T1">
  <name>Task 1: Bump package.json versions (api + web) and add @nestjs/terminus</name>
  <read_first>
    - apps/api/package.json (current pinned versions — must see exact strings before editing)
    - apps/web/package.json (current deps — must see framer-motion, tailwindcss ^3 to remove)
    - .planning/phases/01-foundation/01-RESEARCH.md (Standard Stack table — verified registry versions)
  </read_first>
  <files>apps/api/package.json, apps/web/package.json</files>
  <action>
    NEW DEPENDENCY FLAG: Adding @nestjs/terminus@^11.0.0 — this is the official NestJS health
    library. MIT license. No SaaS fees. Required for INFRA-06 per RESEARCH.md "Don't Hand-Roll" table.

    Edit apps/api/package.json — update ALL @nestjs/* packages in dependencies and devDependencies
    to the following target versions:

    dependencies (change only the version strings, preserve all other fields):
      "@nestjs/bullmq":          "^11.0.0"
      "@nestjs/common":          "^11.0.0"
      "@nestjs/config":          "^4.0.0"
      "@nestjs/core":            "^11.0.0"
      "@nestjs/event-emitter":   "^3.0.0"
      "@nestjs/graphql":         "^13.0.0"
      "@nestjs/jwt":             "^11.0.0"
      "@nestjs/passport":        "^11.0.0"
      "@nestjs/platform-express":"^11.0.0"
      "@nestjs/platform-socket.io":"^11.0.0"
      "@nestjs/swagger":         "^8.0.0"
      "@nestjs/throttler":       "^6.2.0"   (keep — already 6.x, peer-safe)
      "@nestjs/websockets":      "^11.0.0"
      ADD "@nestjs/terminus":    "^11.0.0"  (new dep — flagged above)

    devDependencies:
      "@nestjs/cli":        "^11.0.0"
      "@nestjs/schematics": "^11.0.0"
      "@nestjs/testing":    "^11.0.0"

    Edit apps/web/package.json — update version strings:

    dependencies:
      "next":           "^15.0.0"
      "react":          "^19.0.0"
      "react-dom":      "^19.0.0"
      "@apollo/client": "^4.0.0"
      REMOVE "framer-motion" entirely
      ADD "motion": "*"   (latest 12.x; no range pin — spec says "motion", registry is 12.40.0)

    devDependencies:
      "tailwindcss":    "^4.0.0"
      REMOVE "autoprefixer" entirely (not used in Tailwind 4)
      ADD "@tailwindcss/postcss": "^4.0.0"
      ADD "@opennextjs/cloudflare": "^1.0.0"
      ADD "wrangler": "^4.0.0"
      "@types/react":     "^19.0.0"
      "@types/react-dom": "^19.0.0"
      "eslint-config-next": "^15.0.0"

    After editing both files, run from repo root:
      pnpm install

    pnpm install will regenerate the lockfile. If there are peer-dep warnings about mismatched
    ranges, resolve them by pinning the offending package's version in the same package.json.
    The install MUST complete without errors (warnings about optional peers are acceptable).
  </action>
  <verify>
    <automated>
      # Verify api version strings
      grep '"@nestjs/core"' apps/api/package.json | grep '"\\^11'
      grep '"@nestjs/terminus"' apps/api/package.json
      # Verify web version strings
      grep '"next"' apps/web/package.json | grep '"\\^15'
      grep '"react"' apps/web/package.json | grep '"\\^19'
      grep '@apollo/client' apps/web/package.json | grep '"\\^4'
      grep '"motion"' apps/web/package.json
      # Verify removals
      ! grep 'framer-motion' apps/web/package.json
      ! grep 'autoprefixer' apps/web/package.json
      # Verify install succeeded
      ls node_modules/.pnpm 2>/dev/null | head -1
    </automated>
  </verify>
  <acceptance_criteria>
    - apps/api/package.json contains "@nestjs/core": "^11 (exact: grep finds the string)
    - apps/api/package.json contains "@nestjs/terminus"
    - apps/web/package.json contains "next": "^15
    - apps/web/package.json contains "react": "^19
    - apps/web/package.json contains "@apollo/client": "^4
    - apps/web/package.json contains "motion"
    - apps/web/package.json does NOT contain "framer-motion"
    - apps/web/package.json does NOT contain "autoprefixer"
    - apps/web/package.json contains "@tailwindcss/postcss"
    - apps/web/package.json contains "@opennextjs/cloudflare"
    - apps/web/package.json contains "wrangler"
    - pnpm install completes with exit code 0
  </acceptance_criteria>
  <done>All package.json files updated to spec-target versions; pnpm install clean.</done>
</task>

<task type="auto" id="10-T2">
  <name>Task 2: Upgrade docker-compose, Tailwind 4 web config, next.config.ts, and implement seed</name>
  <read_first>
    - docker-compose.yml (current postgres:16-alpine — must see the exact image line to edit)
    - apps/web/next.config.mjs (current config — will be replaced by next.config.ts)
    - apps/web/src/app/globals.css (current Tailwind v3 directives — must replace)
    - prisma/seed.ts (current stub — see TODO comments before implementing)
    - .planning/phases/01-foundation/01-CONTEXT.md (seed dataset spec and docker-compose spec)
    - .planning/phases/01-foundation/01-RESEARCH.md (Tailwind 4 pattern, OpenNext pattern)
  </read_first>
  <files>
    docker-compose.yml,
    apps/web/next.config.ts,
    apps/web/postcss.config.mjs,
    apps/web/src/app/globals.css,
    prisma/seed.ts
  </files>
  <action>
    1. DOCKER-COMPOSE: Edit docker-compose.yml.
       Change line: `image: postgres:16-alpine`
       To:          `image: postgres:17-alpine`
       No other changes. All healthchecks, volumes, env vars remain identical.

    2. NEXT CONFIG: Delete apps/web/next.config.mjs. Create apps/web/next.config.ts:
       ```ts
       import type { NextConfig } from 'next';
       import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

       initOpenNextCloudflareForDev();

       const nextConfig: NextConfig = {
         // No output: 'export' or output: 'standalone'.
         // @opennextjs/cloudflare handles bundling.
       };

       export { nextConfig as default };
       ```
       IMPORTANT: No default export — use named re-export to comply with CLAUDE.md "no default exports"
       rule. The one exception is the Worker file (Workers contract); next.config.ts is not a Worker file.
       Actually: Next.js requires `export default` for next.config.ts — use it here. This is a
       framework requirement, not a CLAUDE.md violation.

    3. POSTCSS CONFIG: Create apps/web/postcss.config.mjs:
       ```js
       export default { plugins: { '@tailwindcss/postcss': {} } };
       ```
       If a postcss.config.js or postcss.config.mjs already exists, replace it entirely.
       Remove any reference to `tailwindcss` or `autoprefixer` PostCSS plugins (v3 config).

    4. TAILWIND CSS: Replace apps/web/src/app/globals.css entirely:
       ```css
       @import "tailwindcss";

       @theme {
         /* Brand color tokens — extend as the design system grows */
         --color-brand-600: #2563eb;
         --color-brand-700: #1d4ed8;
         --color-surface:   #ffffff;
         --color-muted:     #6b7280;

         /* Typography */
         --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
       }

       html,
       body {
         height: 100%;
       }

       body {
         background-color: var(--color-surface);
         font-family: var(--font-sans);
       }
       ```
       The old `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` lines MUST be
       removed — they are Tailwind v3 syntax and will throw with v4.

    5. SEED IMPLEMENTATION: Edit prisma/seed.ts to implement the demo dataset per CONTEXT.md:
       ```ts
       // CrewMate seed script.
       import { PrismaClient } from '@prisma/client';
       import argon2 from 'argon2';

       const prisma = new PrismaClient();

       async function main(): Promise<void> {
         // Operator
         const operator = await prisma.operator.upsert({
           where: { slug: 'brookline-property-co' },
           update: {},
           create: { name: 'Brookline Property Co.', slug: 'brookline-property-co' },
         });

         // Users: admin, coordinator, worker
         const adminHash = await argon2.hash('AdminPass123!');
         const coordHash = await argon2.hash('CoordPass123!');
         const workerHash = await argon2.hash('WorkerPass123!');

         const adminUser = await prisma.user.upsert({
           where: { email: 'admin@brookline.demo' },
           update: {},
           create: {
             email: 'admin@brookline.demo',
             name: 'Alex Admin',
             passwordHash: adminHash,
             operatorId: operator.id,
             role: 'TENANT_ADMIN',
           },
         });

         const coordUser = await prisma.user.upsert({
           where: { email: 'coordinator@brookline.demo' },
           update: {},
           create: {
             email: 'coordinator@brookline.demo',
             name: 'Casey Coordinator',
             passwordHash: coordHash,
             operatorId: operator.id,
             role: 'COORDINATOR',
           },
         });

         const workerUser = await prisma.user.upsert({
           where: { email: 'worker@brookline.demo' },
           update: {},
           create: {
             email: 'worker@brookline.demo',
             name: 'Jordan Worker',
             passwordHash: workerHash,
             operatorId: operator.id,
             role: 'WORKER',
           },
         });

         // Properties
         const prop1 = await prisma.property.upsert({
           where: { id: '00000000-0000-0000-0000-000000000001' },
           update: {},
           create: {
             id: '00000000-0000-0000-0000-000000000001',
             name: '42 Maple Street',
             kind: 'RESIDENTIAL',
             address: '42 Maple Street, Brookline, MA 02445',
             timezone: 'America/New_York',
             operatorId: operator.id,
           },
         });

         const prop2 = await prisma.property.upsert({
           where: { id: '00000000-0000-0000-0000-000000000002' },
           update: {},
           create: {
             id: '00000000-0000-0000-0000-000000000002',
             name: '100 Commerce Drive',
             kind: 'COMMERCIAL',
             address: '100 Commerce Drive, Brookline, MA 02445',
             timezone: 'America/New_York',
             operatorId: operator.id,
           },
         });

         const prop3 = await prisma.property.upsert({
           where: { id: '00000000-0000-0000-0000-000000000003' },
           update: {},
           create: {
             id: '00000000-0000-0000-0000-000000000003',
             name: '7 Park Lane',
             kind: 'RESIDENTIAL',
             address: '7 Park Lane, Brookline, MA 02446',
             timezone: 'America/New_York',
             operatorId: operator.id,
           },
         });

         // Workers
         const worker1 = await prisma.worker.upsert({
           where: { id: '00000000-0000-0000-1000-000000000001' },
           update: {},
           create: {
             id: '00000000-0000-0000-1000-000000000001',
             name: 'Jordan Worker',
             phone: '+16175550101',
             operatorId: operator.id,
             userId: workerUser.id,
           },
         });

         await prisma.worker.upsert({
           where: { id: '00000000-0000-0000-1000-000000000002' },
           update: {},
           create: {
             id: '00000000-0000-0000-1000-000000000002',
             name: 'Sam Rivera',
             phone: '+16175550102',
             operatorId: operator.id,
           },
         });

         await prisma.worker.upsert({
           where: { id: '00000000-0000-0000-1000-000000000003' },
           update: {},
           create: {
             id: '00000000-0000-0000-1000-000000000003',
             name: 'Morgan Chen',
             phone: '+16175550103',
             operatorId: operator.id,
           },
         });

         await prisma.worker.upsert({
           where: { id: '00000000-0000-0000-1000-000000000004' },
           update: {},
           create: {
             id: '00000000-0000-0000-1000-000000000004',
             name: 'Taylor Brooks',
             phone: '+16175550104',
             operatorId: operator.id,
           },
         });

         // 15 Jobs spread across statuses
         // IMPORTANT: Read prisma/schema.prisma to verify exact field names (scheduledAt, status enum
         // values, etc.) before writing this block. If the schema uses different casing, adjust.
         // The seed should use upsert with deterministic UUIDs for idempotency.
         // Create 5 SCHEDULED, 3 EN_ROUTE, 4 IN_PROGRESS, 3 COMPLETED across the 3 properties and 4 workers.

         // Webhook endpoint pointing at webhook.site for demo
         await prisma.webhookEndpoint.upsert({
           where: { id: '00000000-0000-0000-2000-000000000001' },
           update: {},
           create: {
             id: '00000000-0000-0000-2000-000000000001',
             url: 'https://webhook.site/placeholder-crewmate-demo',
             signingSecret: 'demo-signing-secret-not-production-safe',
             operatorId: operator.id,
             enabled: true,
           },
         });

         process.stdout.write('\n=== DEMO CREDENTIALS ===\n');
         process.stdout.write(`Admin:       admin@brookline.demo / AdminPass123!\n`);
         process.stdout.write(`Coordinator: coordinator@brookline.demo / CoordPass123!\n`);
         process.stdout.write(`Worker:      worker@brookline.demo / WorkerPass123!\n`);
         process.stdout.write('========================\n\n');
       }

       main()
         .catch((err: unknown) => {
           process.stderr.write(`[seed] failed: ${String(err)}\n`);
           process.exit(1);
         })
         .finally(() => prisma.$disconnect());
       ```

       CRITICAL before implementing seed: read prisma/schema.prisma in full to verify:
       - Exact model names (Worker, Property, WebhookEndpoint, Job — check capitalization)
       - Exact field names (passwordHash vs password_hash, scheduledAt vs scheduled_at)
       - Enum values (RESIDENTIAL/COMMERCIAL, SCHEDULED/EN_ROUTE, TENANT_ADMIN/COORDINATOR/WORKER)
       - Required fields vs optional fields for each model
       Adjust the seed code to match the schema exactly. The skeleton above uses common field names —
       verify each one before submitting.

       NOTE: `console.log` is banned per CLAUDE.md. Use `process.stdout.write()` for the credential
       output and `process.stderr.write()` for errors. This is the seed script, not API code, but
       maintain consistency.
  </action>
  <verify>
    <automated>
      # Docker postgres version
      grep "postgres:17-alpine" docker-compose.yml
      # next.config.ts exists, .mjs is gone
      test -f apps/web/next.config.ts
      ! test -f apps/web/next.config.mjs
      grep "initOpenNextCloudflareForDev" apps/web/next.config.ts
      # PostCSS config
      grep "@tailwindcss/postcss" apps/web/postcss.config.mjs
      # Tailwind 4 CSS
      grep '@import "tailwindcss"' apps/web/src/app/globals.css
      ! grep "@tailwind base" apps/web/src/app/globals.css
      # Seed is not a stub
      ! grep "not yet implemented" prisma/seed.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - docker-compose.yml contains "postgres:17-alpine" (grep exits 0)
    - apps/web/next.config.ts exists and contains "initOpenNextCloudflareForDev"
    - apps/web/next.config.mjs does NOT exist
    - apps/web/postcss.config.mjs exists and contains "@tailwindcss/postcss"
    - apps/web/src/app/globals.css contains @import "tailwindcss" (Tailwind 4 syntax)
    - apps/web/src/app/globals.css does NOT contain "@tailwind base" (v3 removed)
    - prisma/seed.ts does NOT contain "not yet implemented"
    - prisma/seed.ts contains "DEMO CREDENTIALS" (credential output present)
    - pnpm --filter @crewmate/api typecheck exits 0 (stub files still compile)
    - pnpm --filter @crewmate/web typecheck exits 0 (stub files still compile after version bump)
  </acceptance_criteria>
  <done>
    docker-compose on Postgres 17; Tailwind 4 CSS-native setup; next.config.ts with OpenNext init;
    seed dataset implemented; both app typechecks pass.
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run from repo root:
  pnpm install                                    # must exit 0
  pnpm --filter @crewmate/api typecheck           # must exit 0
  pnpm --filter @crewmate/web typecheck           # must exit 0
  grep "postgres:17-alpine" docker-compose.yml    # must match
  grep '"@nestjs/terminus"' apps/api/package.json # must match
  grep '"next": "\^15' apps/web/package.json      # must match

These confirm the version foundation is correct before wave 1.1 begins.
</verification>

<success_criteria>
1. pnpm install completes without errors; no peer warnings about @nestjs/* at version 10 or react at 18
2. pnpm --filter @crewmate/api typecheck exits 0
3. pnpm --filter @crewmate/web typecheck exits 0
4. docker-compose.yml contains postgres:17-alpine
5. apps/web/src/app/globals.css uses @import "tailwindcss" (Tailwind 4 syntax)
6. apps/web/next.config.ts exists with initOpenNextCloudflareForDev call
7. prisma/seed.ts implements the demo dataset (not a stub)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-10-SUMMARY.md` documenting:
- Exact final version strings for @nestjs/*, next, react, tailwindcss, @apollo/client, motion
- Any peer-dep resolution decisions made during pnpm install
- Confirmation that both typechecks passed
- Whether seed.ts was adjusted to match prisma/schema.prisma field names
</output>
