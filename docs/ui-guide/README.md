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
| 00 | [`00-design-system.md`](./00-design-system.md) | Brand, color, typography, spacing, radius, motion, voice. The token layer. |
| 01 | [`01-components.md`](./01-components.md) | The component catalog. Buttons, inputs, pills, cards, tables, dialogs. Built on shadcn/ui + Radix. |
| 02 | [`02-layout-and-navigation.md`](./02-layout-and-navigation.md) | App shell, sidebar, topbar, page grid, mobile shell, breadcrumbs. |
| 03 | [`03-auth-flows.md`](./03-auth-flows.md) | Login, signup, invitation acceptance, password reset, 2FA, impersonation. |
| 04 | [`04-dashboard-and-analytics.md`](./04-dashboard-and-analytics.md) | Overview page, KPIs, charts, date pickers, export. |
| 05 | [`05-data-display.md`](./05-data-display.md) | Tables, pagination, filters, drawers, detail pages, timelines, status pills. |
| 06 | [`06-dispatch-board.md`](./06-dispatch-board.md) | Kanban dispatch board, job cards, realtime states. |
| 07 | [`07-worker-mobile.md`](./07-worker-mobile.md) | Mobile shell, today view, action buttons, offline states, install prompt. |
| 08 | [`08-schedule-view.md`](./08-schedule-view.md) | Week grid, drag-to-reschedule, conflict indicators. |
| 09 | [`09-webhooks-and-events.md`](./09-webhooks-and-events.md) | Delivery log, endpoint config, payload viewer, retry. |
| 10 | [`10-team-and-rbac.md`](./10-team-and-rbac.md) | Member list, role pills, scopes, invitations, custom roles, audit log. |
| 11 | [`11-settings.md`](./11-settings.md) | Profile, notifications, billing, properties config, webhook endpoints. |
| 12 | [`12-feedback-states.md`](./12-feedback-states.md) | Loading, empty, error, success, toasts, dialogs, form validation. |
| 13 | [`13-accessibility-and-motion.md`](./13-accessibility-and-motion.md) | A11y patterns, focus, keyboard, reduced motion, contrast, motion specs. |

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
3. Check the rendered visual at `docs/images/ui/<your-screen>.png` if one exists.
4. Implement using the documented tokens and components only.
5. If you find yourself wanting to import a fresh shadcn primitive or define a new spacing scale, stop and open a PR against the guide first.
