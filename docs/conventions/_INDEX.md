# CrewMate — Conventions Index

All code conventions for the CrewMate monorepo. Each file is specific to the stack in use: NestJS 11, Next.js 15, TypeScript 5 strict, Prisma 6, PostgreSQL 17, Redis 7, Socket.io, pnpm workspaces.

---

## Shared (applies to both `apps/api` and `apps/web`)

| File | Description |
|---|---|
| [shared/typescript.md](shared/typescript.md) | TypeScript strict-mode rules, type vs interface, generics, path aliases, null handling |
| [shared/naming.md](shared/naming.md) | File, folder, variable, function, and event naming patterns across the entire codebase |
| [shared/git.md](shared/git.md) | Branch naming, conventional commits, PR rules, what never to commit |
| [shared/security.md](shared/security.md) | Auth tokens, RBAC, input validation, HTTP headers, rate limiting, secrets, WebSocket security |

---

## Frontend (`apps/web`)

| File | Description |
|---|---|
| [frontend/_INDEX.md](frontend/_INDEX.md) | Navigation index for all frontend convention files |
| [frontend/directory-structure.md](frontend/directory-structure.md) | Feature-based `apps/web/src/` directory tree, `_components/` scoping rules, file placement decisions |
| [frontend/components.md](frontend/components.md) | Server vs Client Components, file structure, props rules, shadcn/ui usage, naming exports |
| [frontend/state.md](frontend/state.md) | TanStack Query for server state, Zustand for client state, decision table for where data lives |
| [frontend/styling.md](frontend/styling.md) | Tailwind CSS 4 tokens, `cn()` usage, color rules, shadow scale, shadcn/ui extension patterns |
| [frontend/routing.md](frontend/routing.md) | App Router route groups, page conventions, data fetching pattern, middleware, loading/error states |
| [frontend/performance.md](frontend/performance.md) | Navigation prefetch strategy, optimistic updates, drawer pre-loading, image optimization, bundle size rules, skeleton hierarchy |

---

## Backend (`apps/api`)

| File | Description |
|---|---|
| [backend/directory-structure.md](backend/directory-structure.md) | Full `apps/api/src/` directory tree and module layout rules |
| [backend/modules.md](backend/modules.md) | NestJS controller/service/DTO patterns, guards, interceptors, exception filters |
| [backend/api.md](backend/api.md) | REST conventions: envelopes, status codes, RBAC matrix, filtering, pagination |
| [backend/prisma.md](backend/prisma.md) | PrismaService usage, operator scoping, select vs include, transactions, seed patterns |
| [backend/websocket.md](backend/websocket.md) | Socket.io gateway, room strategy, all 4 event payload shapes |
