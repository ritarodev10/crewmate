# crewmate-frontend

You are a frontend developer on CrewMate. Before writing any code, load the guardrails in this exact order:

1. `docs/guardrails/shared/AGENT.md` — operating rules. Non-negotiable.
2. `docs/guardrails/frontend/README.md` — reading order and domain map
3. `docs/guardrails/frontend/00-design-system.md` — tokens, color, type, spacing. Use only what's here.
4. `docs/guardrails/frontend/01-components.md` — component catalog. Never invent a component that's already listed.
5. The specific surface chapter for the screen you're building:
   - `/dispatch` → `14-dispatch-board.md`
   - `/today` → `15-worker-mobile.md`
   - `/schedule` → `16-schedule-view.md`
   - `/webhooks` → `17-webhooks-and-events.md`
   - `/settings/team` → `18-team-and-rbac.md`
   - `/settings/*` → `19-settings.md`
   - `/dashboard` → `13-dashboard-and-analytics.md`
   - auth flows → `11-auth-flows.md`
6. `docs/guardrails/frontend/05-data-fetching.md` — Apollo + TanStack Query patterns, optimistic UI
7. `docs/guardrails/shared/04-rbac.md` — if the screen renders role-gated content

Then read your `.task-brief.md` if present.

## Design skills to invoke alongside this skill

- `frontend-design` — invoke on every screen build task. Prevents generic AI-default UI.
- `baseline-ui` — invoke as a self-review pass before marking a task done. Acts as design lint.
- `make-interfaces-feel-better` — invoke for polish wave tasks (phase 2.3) and after wiring in phase 4.

## Visual contract

Every screen has a reference image at `docs/images/ui/<screen>.png`. Your output must match it within a tight visual tolerance. If no image exists for your screen, ask before proceeding.

## Stack constraints

- Tailwind 4 only. No inline styles. No CSS modules. No arbitrary values unless the design token doesn't cover it.
- shadcn/ui components live in `apps/web/src/components/ui/` — vendored, not a package import.
- Motion for all animations. Honor `useReducedMotion`. Use `--motion-*` tokens from the design system.
- `react-hook-form` + zod for every form. No uncontrolled inputs.
- Apollo `MockedProvider` / MSW for phase 2 (fixture data). Real hooks in phase 4.

## Route layout

```
apps/web/src/app/
├── (auth)/
│   └── login/
├── (app)/
│   ├── dispatch/
│   ├── today/
│   ├── schedule/
│   ├── webhooks/
│   ├── dashboard/
│   └── settings/
│       ├── profile/
│       ├── notifications/
│       ├── team/
│       ├── properties/
│       ├── webhooks/
│       ├── audit/
│       └── account/
```

## MCP available

- `context7` — live Next.js 15, Apollo Client 4, TanStack Query 5, Tailwind 4, Motion, shadcn/ui docs.
