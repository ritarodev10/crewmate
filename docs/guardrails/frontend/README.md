# UI Guide

The single source of truth for how CrewMate looks, feels, and behaves on screen. Every page, component, and state that ships to a user is described here. Engineers building UI should not invent shapes that aren't documented; they should add them to the guide first, then build.

This guide is paired with the rendered visual reference in `docs/images/ui/` and `docs/images/diagrams/`. Where a chapter describes a screen that has a rendered image, that image is the visual contract. Where there is no rendered image, the chapter is the contract.

## How to read this guide

1. Start with `00-design-system.md`. Read it once front to back. Everything downstream depends on the tokens and voice defined there.
2. Skim `01-components.md`. Note the component names and their APIs. Every UI chapter assumes you know what a `JobCard`, `StatusPill`, or `Drawer` is.
3. Open the chapter for the surface you're building. Each chapter is self-contained and ends with a checklist of what counts as "done".

## File map

| # | File | What's in it |
|---|---|---|
| — | [`README.md`](./README.md) | This index. |
| **Foundations** | | |
| 00 | [`00-design-system.md`](./00-design-system.md) | Brand, color, typography, spacing, radius, motion, voice. The token layer. |
| 01 | [`01-components.md`](./01-components.md) | The component catalog. Buttons, inputs, pills, cards, tables, dialogs. Built on shadcn/ui + Radix. |
| **Architecture** | | |
| 02 | [`02-routes-and-structure.md`](./02-routes-and-structure.md) | Sitemap of every route in `apps/web` plus the feature-based folder convention using `_components`, `_hooks`, `_utils` next to each page. |
| 03 | [`03-layout-and-navigation.md`](./03-layout-and-navigation.md) | App shell, sidebar, topbar, page grid, mobile shell, breadcrumbs, status indicators. |
| 04 | [`04-state-management.md`](./04-state-management.md) | Four kinds of state (Apollo, TanStack Query, URL, Zustand) and the decision table for where each kind belongs. |
| 05 | [`05-data-fetching.md`](./05-data-fetching.md) | TanStack Query and Apollo Client. Query keys, mutations, optimistic updates, cache invalidation, retry, suspense. |
| 06 | [`06-reusable-patterns.md`](./06-reusable-patterns.md) | Catalog of hooks, helpers, and composition patterns. Folder layout rules. Promotion lifecycle. |
| 07 | [`07-forms.md`](./07-forms.md) | react-hook-form plus zod patterns. Server-error reconciliation. Submit states. Multi-step forms. |
| **Cross-cutting** | | |
| 08 | [`08-feedback-states.md`](./08-feedback-states.md) | Loading, empty, error, success, toasts, dialogs, form validation. |
| 09 | [`09-error-handling.md`](./09-error-handling.md) | API error contract restated, error-code-to-UI mapping, three-layer error boundary stack, recovery patterns. |
| 10 | [`10-accessibility-and-motion.md`](./10-accessibility-and-motion.md) | A11y patterns, focus, keyboard, reduced motion, contrast, motion specs. |
| **Per-surface** | | |
| 11 | [`11-auth-flows.md`](./11-auth-flows.md) | Login, signup, invitation acceptance, password reset, 2FA. |
| 12 | [`12-data-display.md`](./12-data-display.md) | Tables, pagination, filters, drawers, detail pages, timelines, status pills usage matrix. |
| 13 | [`13-dashboard-and-analytics.md`](./13-dashboard-and-analytics.md) | Overview page, KPIs, charts, date pickers, export. |
| 14 | [`14-dispatch-board.md`](./14-dispatch-board.md) | Kanban dispatch board, job cards, realtime states. |
| 15 | [`15-worker-mobile.md`](./15-worker-mobile.md) | Mobile shell, today view, action buttons. |
| 16 | [`16-schedule-view.md`](./16-schedule-view.md) | Week grid, drag-to-reschedule, conflict indicators. |
| 17 | [`17-webhooks-and-events.md`](./17-webhooks-and-events.md) | Delivery log, endpoint config, payload viewer, retry. |
| 18 | [`18-team-and-rbac.md`](./18-team-and-rbac.md) | Member list, role pills, scopes, invitations, custom roles, audit log. |
| 19 | [`19-settings.md`](./19-settings.md) | Profile, notifications, billing, properties, webhook endpoints. |

## Rules every contributor follows

- **No new tokens.** If a color, spacing value, radius, or font size you need isn't in `00-design-system.md`, propose it in a PR that updates `00-design-system.md` first. The same rule applies to components and `01-components.md`.
- **Voice is consistent.** Restrained, plain, honest. No marketing language inside the product. No exclamation marks. No "Oops!" empty states. Read `00-design-system.md` for the full voice notes.
- **Mobile is not an afterthought.** Every component declares its mobile behavior. The worker view is mobile-first; everything else is desktop-first but degrades.
- **Accessibility is a release gate.** Lighthouse a11y must hit 95+ on every shipping page. Keyboard traversal must be complete. Screen-reader announcements are tested.
- **Honest gaps.** If a chapter knows about a flow that isn't fully designed yet, it says so explicitly under a `## Gaps` section. No silently waving over missing pieces.

## How agents should use this guide

If you are an AI coding agent picking up a UI task:

1. Read `00-design-system.md` and `01-components.md`. Always. No exceptions.
2. Read the chapter that owns the surface you're building.
3. If the task touches data, read `04-state-management.md` to pick the right state kind, and `05-data-fetching.md` for query and mutation patterns.
4. If the task touches a form, read `07-forms.md` before writing any input or submit handler.
5. Before extracting a hook or helper, check `06-reusable-patterns.md` for the existing catalog and promotion rules.
6. Check the rendered visual at `docs/images/ui/<your-screen>.png` if one exists.
7. Implement using the documented tokens and components only.
8. If you find yourself wanting to import a fresh shadcn primitive or define a new spacing scale, stop and open a PR against the guide first.
