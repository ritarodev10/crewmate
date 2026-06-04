---
phase: 01-foundation
plan: "12"
type: execute
wave: 2
depends_on:
  - "10"
files_modified:
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/page.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/worker/proxy.ts
  - apps/web/wrangler.toml
  - apps/web/open-next.config.ts
  - apps/web/.env.local
  - docker/api.Dockerfile
autonomous: true
requirements:
  - INFRA-01
  - INFRA-03
  - INFRA-05

must_haves:
  truths:
    - "http://localhost:3001 serves the placeholder login page (styled, not bare HTML)"
    - "The placeholder page shows CrewMate branding with an email + password stub form"
    - "apps/web/wrangler.toml exists and references crewmate.ritaro.dev custom domain"
    - "apps/web/src/worker/proxy.ts routes /api/*, /v1/*, /graphql, /ws to BACKEND_ORIGIN with x-cloudflare-secret header"
    - "docker/api.Dockerfile builds the NestJS API image"
    - "pnpm --filter @crewmate/web typecheck exits 0"
  artifacts:
    - path: "apps/web/src/app/layout.tsx"
      provides: "Root layout with Tailwind 4 CSS provider (globals.css import)"
      exports: ["default RootLayout"]
    - path: "apps/web/src/app/page.tsx"
      provides: "Placeholder login page — CrewMate logo, email/password form, styled with Tailwind 4"
      exports: ["default HomePage"]
    - path: "apps/web/src/worker/proxy.ts"
      provides: "Custom Cloudflare Worker entry; proxies /api/* etc. to BACKEND_ORIGIN"
      exports: ["default ExportedHandler"]
    - path: "apps/web/wrangler.toml"
      provides: "Wrangler config binding Worker to crewmate.ritaro.dev"
      contains: "crewmate.ritaro.dev"
    - path: "apps/web/open-next.config.ts"
      provides: "OpenNext Cloudflare config (defineCloudflareConfig)"
      exports: ["default defineCloudflareConfig result"]
    - path: "docker/api.Dockerfile"
      provides: "Multi-stage NestJS image for ECR"
      contains: "pnpm --filter @crewmate/api build"
  key_links:
    - from: "apps/web/wrangler.toml"
      to: "apps/web/src/worker/proxy.ts"
      via: "main field in wrangler.toml"
      pattern: "main.*worker/proxy"
    - from: "apps/web/src/worker/proxy.ts"
      to: "@opennextjs/cloudflare generated handler"
      via: "import openNextHandler"
      pattern: "openNextHandler|open-next"
    - from: "apps/web/src/app/layout.tsx"
      to: "apps/web/src/app/globals.css"
      via: "import './globals.css'"
      pattern: "globals.css"
---

<objective>
Build the Next.js web skeleton: placeholder login page, root layout with Tailwind 4, Cloudflare
Worker proxy file, wrangler.toml config, OpenNext config, and the API Dockerfile. This plan runs
in parallel with wave 1.1 (api-skeleton) — they touch completely different files.

Purpose: Delivers the web-side artifacts for INFRA-01 (Worker proxies to ALB), INFRA-03 (wrangler.toml
+ proxy handler checked in), and INFRA-05 (deploy-web.yml can build the Worker bundle). The
placeholder page at / gives the Phase 1 gate criterion #3 ("https://crewmate.ritaro.dev returns the
placeholder login page").

Output:
- apps/web/src/app/layout.tsx — updated root layout with Tailwind CSS import
- apps/web/src/app/page.tsx — styled placeholder login page
- apps/web/src/worker/proxy.ts — custom Cloudflare Worker entry with API proxy
- apps/web/wrangler.toml — Worker config bound to crewmate.ritaro.dev
- apps/web/open-next.config.ts — OpenNext Cloudflare config
- apps/web/.env.local — local dev env vars
- docker/api.Dockerfile — multi-stage build for the NestJS API image
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@.planning/phases/01-foundation/01-10-SUMMARY.md

@apps/web/src/app/layout.tsx
@apps/web/src/app/page.tsx
@apps/web/src/app/globals.css
@apps/web/package.json
@docs/guardrails/shared/AGENT.md
@docs/guardrails/frontend/README.md
@docs/guardrails/frontend/00-design-system.md
</context>

<interfaces>
<!-- Exact contracts the executor works against -->

Wrangler config (from RESEARCH.md Pattern 4 — exact shape):
  name = "crewmate-web"
  main = "src/worker/proxy.ts"
  compatibility_date = "2024-12-30"
  compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]
  [assets]
  directory = ".open-next/assets"
  binding = "ASSETS"
  [[routes]]
  pattern = "crewmate.ritaro.dev/*"
  custom_domain = true

OpenNext config (from RESEARCH.md Pattern 4):
  // apps/web/open-next.config.ts
  import { defineCloudflareConfig } from '@opennextjs/cloudflare';
  export default defineCloudflareConfig({});

Worker proxy env interface:
  interface Env {
    BACKEND_ORIGIN: string;           // wrangler secret — e.g. http://crewmate-alb-xxxx.us-east-1.elb.amazonaws.com
    CLOUDFLARE_SHARED_SECRET: string; // wrangler secret
    ASSETS: Fetcher;                  // from [assets] binding
  }

Worker proxy routing decision (from RESEARCH.md Open Questions #1):
  Decision: Worker STRIPS the /api prefix before forwarding to BACKEND_ORIGIN.
  So: /api/healthz → strips /api → /healthz on origin (NestJS serves /healthz, not /api/healthz)
  /api/* → strips /api → /*, forward to BACKEND_ORIGIN
  /v1/*  → forward as-is (no strip — NestJS serves /v1/*)
  /graphql → forward as-is
  /ws → forward as-is (WebSocket upgrade)
  Anything else → openNextHandler (Next.js)

  IMPORTANT: /api prefix is edge-only. NestJS serves /healthz, /readyz, /v1/* directly.
  Proxy must rewrite /api/X → /X before forwarding.

Worker proxy implementation skeleton (from RESEARCH.md Pattern 2, updated with path rewrite):
  PROXY_PREFIXES = ['/api/', '/v1/', '/graphql', '/ws']
  isProxied(pathname) checks prefix membership
  For /api/* prefixed requests: strip /api from pathname before building target URL
  For non-/api proxied: forward pathname as-is
  Add x-cloudflare-secret header to all proxied requests
  WebSocket: if Upgrade: websocket, return the upstream response directly (do not clone/mutate)

Next.js layout.tsx — update existing file:
  Keep: metadata export, html/body shell, lang="en"
  Add: import './globals.css' (Tailwind 4 entry)
  Keep default export (Next.js requires it for layouts)

Next.js placeholder login page — update apps/web/src/app/page.tsx:
  Styled with Tailwind 4 classes. Mobile-responsive.
  Elements:
    - CrewMate wordmark / logo (text-based if no SVG yet: text-2xl font-bold text-brand-600)
    - Tagline: "Coordinate field work across properties and crews."
    - Email input: type="email" placeholder="your@email.com"
    - Password input: type="password" placeholder="Password"
    - "Sign in" button: full-width, brand blue background
    - "Stub — authentication coming in Phase 3" note (small text, muted color)
  Layout: centered card on desktop (max-w-sm mx-auto), full-width on mobile.
  NO functionality — form is a stub, no onSubmit handler.
  Keep default export (Next.js requires it for page.tsx).

API Dockerfile (multi-stage):
  Stage 1 (base): node:22-alpine, install pnpm globally
  Stage 2 (deps): COPY root package.json, pnpm-workspace.yaml, pnpm-lock.yaml
                  COPY apps/api/package.json + packages/*/package.json
                  RUN pnpm install --frozen-lockfile --prod=false
  Stage 3 (builder): FROM deps, COPY all source, RUN pnpm --filter @crewmate/api build
  Stage 4 (runner): node:22-alpine, copy dist/ + node_modules from builder, CMD ["node", "dist/main.js"]
  WORKDIR /app in all stages.
  .dockerignore: node_modules, .next, coverage, dist, *.md, .git
</interfaces>

<tasks>

<task type="auto" id="12-T1">
  <name>Task 1: Next.js layout, placeholder login page, and .env.local</name>
  <read_first>
    - apps/web/src/app/layout.tsx (current skeleton — update, don't replace from scratch)
    - apps/web/src/app/page.tsx (current bare stub — replace with styled page)
    - apps/web/src/app/globals.css (already updated in wave 1.0 to Tailwind 4 — do not revert)
    - apps/web/package.json (verify motion and @apollo/client ^4 are present after wave 1.0)
    - docs/guardrails/frontend/00-design-system.md (color tokens, type scale, spacing)
    - .planning/phases/01-foundation/01-CONTEXT.md (placeholder page spec)
  </read_first>
  <files>
    apps/web/src/app/layout.tsx,
    apps/web/src/app/page.tsx,
    apps/web/.env.local
  </files>
  <action>
    1. LAYOUT: Edit apps/web/src/app/layout.tsx.
       Import './globals.css' (must be present for Tailwind 4 styles to load).
       Keep: import type { Metadata } from 'next'; metadata export; html/body with lang="en".
       Add: className="antialiased" to body for font rendering.
       Keep default export (Next.js framework requirement).

    2. PLACEHOLDER PAGE: Replace apps/web/src/app/page.tsx with a styled stub login page.
       Requirements from CONTEXT.md: Tailwind 4 + shadcn/ui, CrewMate logo/wordmark, stub email +
       password fields, submit button, mobile-responsive at all breakpoints.

       Do NOT use shadcn/ui components for this page — they require the shadcn CLI to vendor them
       into apps/web/src/components/ui/, which hasn't been set up yet. Use plain HTML + Tailwind 4
       classes directly. shadcn setup is a Phase 2 task.

       Layout structure:
         <main> centered on page (min-h-screen, flex, items-center, justify-center, bg-gray-50)
           <div> card (w-full, max-w-sm, bg-white, rounded-2xl, shadow-lg, px-8, py-10)
             <div> logo area
               <h1> CrewMate (text-2xl, font-bold, tracking-tight, text-gray-900)
               <p> tagline (text-sm, text-gray-500, mt-1)
             <form> (mt-8, space-y-4) — no onSubmit, method not set
               <div>
                 <label htmlFor="email" Email
                 <input type="email" id="email" name="email" placeholder="your@email.com"
                        (w-full, rounded-lg, border, border-gray-300, px-3, py-2, text-sm,
                         focus:outline-none, focus:ring-2, focus:ring-blue-500)
               <div>
                 <label htmlFor="password" Password
                 <input type="password" id="password" name="password" placeholder="Password"
                        (same classes)
               <button type="submit"
                 (w-full, rounded-lg, bg-blue-600, text-white, py-2.5, text-sm, font-medium,
                  hover:bg-blue-700, transition-colors)
                 Sign in
             <p> stub note — small, muted: "Authentication coming in Phase 3." (text-xs, text-gray-400, mt-6, text-center)

       Keep default export (Next.js framework requirement for page.tsx files).

       NOTE: `use client` directive NOT needed — this is a server component stub. No interactive state.

    3. ENV.LOCAL: Create apps/web/.env.local:
       NEXT_PUBLIC_API_URL=http://localhost:3000
       NEXT_PUBLIC_WS_URL=ws://localhost:3000
       This file is gitignored by default (.gitignore already has *.local). Confirm in .gitignore.
  </action>
  <verify>
    <automated>
      # Layout imports globals.css
      grep "globals.css" apps/web/src/app/layout.tsx
      # Page has styled content
      grep "CrewMate" apps/web/src/app/page.tsx
      grep "type=\"email\"" apps/web/src/app/page.tsx
      grep "type=\"password\"" apps/web/src/app/page.tsx
      # .env.local exists
      test -f apps/web/.env.local
      grep "NEXT_PUBLIC_API_URL" apps/web/.env.local
      # Web typecheck
      pnpm --filter @crewmate/web typecheck
    </automated>
  </verify>
  <acceptance_criteria>
    - apps/web/src/app/layout.tsx contains import './globals.css'
    - apps/web/src/app/page.tsx contains "CrewMate" text (branding present)
    - apps/web/src/app/page.tsx contains type="email" and type="password" input elements
    - apps/web/src/app/page.tsx contains a submit button
    - apps/web/.env.local contains NEXT_PUBLIC_API_URL=http://localhost:3000
    - apps/web/.env.local contains NEXT_PUBLIC_WS_URL=ws://localhost:3000
    - pnpm --filter @crewmate/web typecheck exits 0
    - pnpm --filter @crewmate/web dev starts on port 3001 without errors (smoke only — do not leave running)
  </acceptance_criteria>
  <done>
    Placeholder login page styled and typecheck-clean; .env.local present.
  </done>
</task>

<task type="auto" id="12-T2">
  <name>Task 2: Worker proxy, wrangler.toml, OpenNext config, and API Dockerfile</name>
  <read_first>
    - apps/web/package.json (verify @opennextjs/cloudflare and wrangler are present after wave 1.0)
    - apps/web/next.config.ts (just created in wave 1.0 — verify initOpenNextCloudflareForDev present)
    - .planning/phases/01-foundation/01-RESEARCH.md (Pattern 2: proxy; Pattern 4: wrangler; Open Questions #1)
    - .planning/phases/01-foundation/01-CONTEXT.md (Worker proxy routing, wrangler spec, Dockerfile spec)
    - docs/guardrails/shared/03-security.md (shared secret, x-cloudflare-secret header)
  </read_first>
  <files>
    apps/web/src/worker/proxy.ts,
    apps/web/wrangler.toml,
    apps/web/open-next.config.ts,
    docker/api.Dockerfile
  </files>
  <action>
    1. WORKER PROXY: Create apps/web/src/worker/proxy.ts.
       Create the directory apps/web/src/ directory structure first (src/worker/).

       The proxy file is the one allowed place in this codebase for a `export default` object
       — it satisfies the Cloudflare Workers exported handler contract (not a CLAUDE.md violation).

       ```ts
       // apps/web/src/worker/proxy.ts
       // @ts-expect-error -- generated at opennextjs-cloudflare build time; not present in dev
       import openNextHandler from '../../.open-next/worker.js';

       interface Env {
         BACKEND_ORIGIN: string;
         CLOUDFLARE_SHARED_SECRET: string;
         ASSETS: Fetcher;
       }

       const DIRECT_PREFIXES = ['/v1/', '/graphql', '/ws'];

       function isApiProxy(pathname: string): boolean {
         return pathname === '/api' || pathname.startsWith('/api/');
       }

       function isDirectProxy(pathname: string): boolean {
         return DIRECT_PREFIXES.some((p) =>
           p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/'),
         );
       }

       export default {
         async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
           const url = new URL(request.url);
           const { pathname } = url;

           if (isApiProxy(pathname)) {
             // Strip /api prefix before forwarding to origin
             // /api/healthz → /healthz, /api/v1/jobs → /v1/jobs
             const originPath = pathname.slice('/api'.length) || '/';
             const target = new URL(originPath + url.search, env.BACKEND_ORIGIN);
             const headers = new Headers(request.headers);
             headers.set('x-cloudflare-secret', env.CLOUDFLARE_SHARED_SECRET);

             if (request.headers.get('Upgrade') === 'websocket') {
               return fetch(target.toString(), request);
             }
             return fetch(target.toString(), new Request(target.toString(), { ...request, headers }));
           }

           if (isDirectProxy(pathname)) {
             const target = new URL(pathname + url.search, env.BACKEND_ORIGIN);
             const headers = new Headers(request.headers);
             headers.set('x-cloudflare-secret', env.CLOUDFLARE_SHARED_SECRET);

             if (request.headers.get('Upgrade') === 'websocket') {
               return fetch(target.toString(), request);
             }
             return fetch(target.toString(), new Request(target.toString(), { ...request, headers }));
           }

           // Everything else → Next.js
           return openNextHandler.fetch(request, env, ctx);
         },
       } satisfies ExportedHandler<Env>;
       ```

       NOTE on the @ts-expect-error: The .open-next/worker.js file is generated at build time by
       `opennextjs-cloudflare build`. It does not exist in the repo. The @ts-expect-error suppresses
       the "cannot find module" TypeScript error in the dev environment. This is the standard pattern
       per RESEARCH.md Pattern 2.

       NOTE on WebSocket forwarding: For WS upgrades, pass the original request object through
       without cloning (don't spread or reconstruct headers). The Workers runtime handles WS
       natively. Phase 1 only needs the route to forward; real WS auth is Phase 3.

    2. WRANGLER CONFIG: Create apps/web/wrangler.toml — exact shape from RESEARCH.md Pattern 4:
       name = "crewmate-web"
       main = "src/worker/proxy.ts"
       compatibility_date = "2024-12-30"
       compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]

       [assets]
       directory = ".open-next/assets"
       binding = "ASSETS"

       [[routes]]
       pattern = "crewmate.ritaro.dev/*"
       custom_domain = true

       DO NOT include BACKEND_ORIGIN or CLOUDFLARE_SHARED_SECRET in this file.
       These are secrets set via `wrangler secret put` (never committed).

    3. OPENNEXT CONFIG: Create apps/web/open-next.config.ts:
       import { defineCloudflareConfig } from '@opennextjs/cloudflare';
       export default defineCloudflareConfig({});

    4. DOCKERFILE: Create docker/api.Dockerfile.
       Create the docker/ directory if it doesn't exist.
       Multi-stage build:

       FROM node:22-alpine AS base
       RUN npm install -g pnpm@10.15.0
       WORKDIR /app

       FROM base AS deps
       COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
       COPY apps/api/package.json apps/api/
       COPY packages/contracts/package.json packages/contracts/
       COPY packages/ui/package.json packages/ui/
       RUN pnpm install --frozen-lockfile

       FROM deps AS builder
       COPY . .
       RUN pnpm --filter @crewmate/api build

       FROM node:22-alpine AS runner
       WORKDIR /app
       ENV NODE_ENV=production
       COPY --from=builder /app/apps/api/dist ./dist
       COPY --from=builder /app/node_modules ./node_modules
       COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
       COPY --from=builder /app/packages ./packages
       EXPOSE 3000
       CMD ["node", "dist/main.js"]

       NOTE: The runner stage copies both root node_modules and apps/api/node_modules because
       pnpm's virtual store layout requires both. If the image build fails with missing modules,
       copy the full /app directory from builder instead (simpler but larger image).

    Also create docker/.dockerignore (not a standard name but create it alongside):
    Actually — create .dockerignore at repo root for `docker build -f docker/api.Dockerfile .`:
    Check if .dockerignore already exists at repo root. If not, create it:
      node_modules
      .next
      coverage
      dist
      .git
      *.md
      .env*
      !apps/api/.env.example
  </action>
  <verify>
    <automated>
      # Worker proxy exists
      test -f apps/web/src/worker/proxy.ts
      grep "x-cloudflare-secret" apps/web/src/worker/proxy.ts
      grep "BACKEND_ORIGIN" apps/web/src/worker/proxy.ts
      grep "isApiProxy\|/api" apps/web/src/worker/proxy.ts
      # /api prefix strip
      grep "slice.*'/api'" apps/web/src/worker/proxy.ts
      # Wrangler config
      test -f apps/web/wrangler.toml
      grep "crewmate.ritaro.dev" apps/web/wrangler.toml
      grep "src/worker/proxy.ts" apps/web/wrangler.toml
      grep "nodejs_compat" apps/web/wrangler.toml
      # OpenNext config
      test -f apps/web/open-next.config.ts
      grep "defineCloudflareConfig" apps/web/open-next.config.ts
      # Dockerfile
      test -f docker/api.Dockerfile
      grep "@crewmate/api build" docker/api.Dockerfile
      # Typecheck (proxy.ts has @ts-expect-error — typecheck must still pass)
      pnpm --filter @crewmate/web typecheck
    </automated>
  </verify>
  <acceptance_criteria>
    - apps/web/src/worker/proxy.ts exists and contains x-cloudflare-secret header injection
    - apps/web/src/worker/proxy.ts contains logic to strip /api prefix before forwarding (slice or replace)
    - apps/web/src/worker/proxy.ts contains WebSocket upgrade handling
    - apps/web/wrangler.toml exists and contains "crewmate.ritaro.dev"
    - apps/web/wrangler.toml contains "main = \"src/worker/proxy.ts\""
    - apps/web/wrangler.toml contains "nodejs_compat" in compatibility_flags
    - apps/web/wrangler.toml does NOT contain BACKEND_ORIGIN or CLOUDFLARE_SHARED_SECRET (these are secrets)
    - apps/web/open-next.config.ts exists and contains "defineCloudflareConfig"
    - docker/api.Dockerfile exists and contains "pnpm --filter @crewmate/api build"
    - docker/api.Dockerfile uses node:22-alpine base image
    - pnpm --filter @crewmate/web typecheck exits 0
  </acceptance_criteria>
  <done>
    Worker proxy with /api prefix stripping; wrangler.toml bound to crewmate.ritaro.dev; OpenNext
    config; API Dockerfile — all checked in.
  </done>
</task>

</tasks>

<verification>
Run from repo root after both tasks complete:
  pnpm --filter @crewmate/web typecheck             # must exit 0
  test -f apps/web/wrangler.toml                    # must exist
  test -f apps/web/src/worker/proxy.ts              # must exist
  test -f docker/api.Dockerfile                     # must exist
  grep "crewmate.ritaro.dev" apps/web/wrangler.toml # must match
  grep "x-cloudflare-secret" apps/web/src/worker/proxy.ts  # must match
  grep "slice" apps/web/src/worker/proxy.ts         # must match (api prefix strip)
</verification>

<success_criteria>
1. http://localhost:3001 serves the placeholder login page (styled, CrewMate wordmark, form stub)
2. pnpm --filter @crewmate/web typecheck exits 0
3. apps/web/wrangler.toml references crewmate.ritaro.dev and src/worker/proxy.ts
4. apps/web/src/worker/proxy.ts injects x-cloudflare-secret and strips /api prefix
5. apps/web/open-next.config.ts exists with defineCloudflareConfig
6. docker/api.Dockerfile exists and targets pnpm --filter @crewmate/api build
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-12-SUMMARY.md` documenting:
- Placeholder page screenshot approach (or visual description)
- Worker proxy routing decisions (especially /api strip vs direct)
- Any TypeScript issues with the @ts-expect-error for the OpenNext handler import
- Dockerfile build verification result (docker build -f docker/api.Dockerfile . exit code)
</output>
