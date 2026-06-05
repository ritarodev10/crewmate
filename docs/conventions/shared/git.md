# Git Conventions

---

## Branch Naming

Format: `{type}/{short-kebab-description}`

| Prefix | When to use |
|---|---|
| `feat/` | New user-visible feature |
| `fix/` | Bug fix |
| `chore/` | Config, tooling, dependency updates, non-code changes |
| `docs/` | Documentation only |
| `refactor/` | Code restructure with no behavior change |
| `test/` | Adding or fixing tests only |

```
feat/workforce-screen
feat/job-detail-drawer
feat/websocket-gateway
fix/worker-card-team-chip
fix/operator-scope-leak
chore/prisma-team-member-index
docs/api-conventions
refactor/jobs-service-earnings
test/jobs-controller-e2e
```

Branch names are lowercase, no uppercase, no spaces, no slashes after the type prefix except the one separator.

---

## Conventional Commits

Format: `type(scope): subject`

### Types

| Type | When to use |
|---|---|
| `feat` | New feature visible to end users |
| `fix` | Bug fix |
| `chore` | Tooling, configs, CI, non-functional housekeeping |
| `docs` | Documentation changes only |
| `refactor` | Code change with no behavior change, no new tests needed |
| `test` | Adding or correcting tests |
| `perf` | Performance improvement with measurable evidence |

### Scopes

| Scope | What it covers |
|---|---|
| `api` | Anything in `apps/api/src/` |
| `web` | Anything in `apps/web/src/` |
| `prisma` | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` |
| `ci` | `.github/workflows/`, `railway.toml`, `wrangler.toml` |
| `docs` | `docs/` directory |

### Subject Rules

- Imperative mood: "add", "fix", "update", "remove" — not "added", "fixing", "updated"
- Max 72 characters for the subject line
- No period at the end
- Lowercase first word after the colon

### Examples Specific to This Project

```
feat(api): add GET /search endpoint with scope filtering
feat(api): implement operator-scope interceptor for all queries
feat(api): add job cancellation endpoint with reason codes
feat(web): implement kanban board with real-time column moves
feat(web): add worker earnings card with today/week/month/lifetime tabs
feat(web): wire Socket.io client to update map pins on job.status.changed
fix(web): correct team chip display on worker card for solo workers
fix(api): prevent job completion when progressPct is below 100
fix(prisma): correct TeamMember unique constraint on workerId
chore(prisma): add index on Job.operatorId and Job.status
chore(prisma): add TeamMember index on workerId for earnings queries
chore(ci): add Railway deploy step to deploy-api workflow
refactor(api): extract revenue calculation from jobs service to shared util
test(api): add e2e tests for job status transition validation
```

### Body (Optional)

Add a body when the why is not obvious from the subject. Separate body from subject with a blank line. Wrap at 72 characters.

```
feat(api): add cursor-based pagination to jobs endpoint

Replaced offset pagination because job lists can grow unbounded.
Cursor is the last job's createdAt as a base64-encoded timestamp.
Frontend must update its useJobs hook to pass the cursor param.
```

---

## One Logical Change Per Commit

Do not mix concerns in a single commit. Each of these should be a separate commit:

- Adding a Prisma migration
- Seeding new data
- Adding a new endpoint
- Adding tests for that endpoint

Wrong:
```
feat(prisma): add Team model, seed team data, and add GET /teams endpoint
```

Right:
```
chore(prisma): add Team and TeamMember models
chore(prisma): seed Team Alfa with lead and 3 members
feat(api): add GET /teams endpoint scoped to operator
```

---

## What Never to Commit

```
.env
.env.local
.env.production
apps/web/.env.local
apps/api/.env

.next/
node_modules/
dist/
build/

*.log
prisma/migrations/    ← never commit migration files without the schema change in the same commit
```

The `.gitignore` at the repo root covers most of these. If you see a generated file that is not ignored, add it to `.gitignore` — do not commit it and rely on reviewers to catch it.

---

## Pull Request Rules

- **Squash merge only** into `main`. The PR title becomes the single merge commit message — it must follow conventional commit format.
- PR title format: same as commit subject — `type(scope): subject`
- CI must pass (lint + typecheck + tests) before merge. Do not merge a red CI.
- Keep PRs small: a PR that touches more than ~400 lines of application code (excluding generated files) is likely doing too much. Split it.
- Link the relevant ticket or planning doc in the PR description if one exists.

### PR Title Examples

```
feat(api): add revenue aggregation endpoint with 7-day trend
fix(web): prevent double-click job start from sending duplicate requests
chore(prisma): backfill estimatedHours on existing job rows
```
