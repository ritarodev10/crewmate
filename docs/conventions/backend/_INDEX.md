# Backend Conventions

Covers `apps/api/` — NestJS 11, TypeScript 5 strict, Prisma 6, PostgreSQL 17, Redis 7, Socket.io.

---

| File | Description |
|---|---|
| [directory-structure.md](directory-structure.md) | Full `apps/api/src/` tree, module folder layout rules, when to add sub-folders |
| [modules.md](modules.md) | Controller/service/DTO patterns, guards, interceptors, exception filters, RBAC |
| [api.md](api.md) | REST response envelopes, status codes, RBAC matrix, filtering, pagination rules |
| [prisma.md](prisma.md) | PrismaService usage, operator scoping, select vs include, transactions, seed order |
| [websocket.md](websocket.md) | Socket.io gateway setup, room strategy, all 4 event shapes, emit from service layer |
