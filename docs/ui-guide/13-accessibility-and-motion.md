# 13 — Accessibility and motion

Accessibility is a release gate, not a polish phase. A screen that fails the contract in this chapter does not ship. Motion is treated the same way. If reduced-motion is on, the surface still works; if it does not, the surface is broken.

The product is used by coordinators under pressure and by workers in the field on cheap phones. Neither user has time for an interface that fights them. Calm, plain, fast.

## Release gate

The bar is concrete.

| Gate | Threshold | Enforced by |
|---|---|---|
| Lighthouse a11y score | 95 or higher on every shipping page | CI step on the built site |
| WCAG 2.2 conformance | AA across the product, AAA where reasonable | Manual sweep + axe-core |
| Keyboard reachability | Every interactive element reachable and operable from the keyboard | Manual sweep per page |
| Visible focus | Every focusable element renders a visible ring on `:focus-visible` | Component contract |
| Reduced-motion | All `motion-*` tokens collapse to 1ms, transforms drop | Global CSS rule |

"Reasonable AAA" means body text contrast at least 7.0 and headings at least 4.5 where the type system already allows it, not a blanket AAA target across every component.

A page that fails any row above does not get merged. The CI gate is hard. Local overrides are not granted.

## Color contrast

Contrast was measured with the WebAIM contrast checker against the tokens defined in chapter 00. The table below is the recorded result for every text-on-fill pair the product actually uses.

| Foreground | Background | Hex pair | Ratio | WCAG |
|---|---|---|---|---|
| `text-default` (`--color-ink`) | `bg-surface` (`--color-paper`) | `#1A1A1A` on `#FFFFFF` | 16.10 | AAA |
| `text-default` (`--color-ink`) | `bg-canvas` (`--color-bone`) | `#1A1A1A` on `#FAFAF7` | 15.42 | AAA |
| `text-muted` (`--color-muted`) | `bg-surface` | `#5A5A5A` on `#FFFFFF` | 7.04 | AAA |
| `text-muted` | `bg-canvas` | `#5A5A5A` on `#FAFAF7` | 6.74 | AAA |
| `text-on-brand` (`#FFFFFF`) | `bg-brand` (`--color-navy`) | `#FFFFFF` on `#1F3A5F` | 10.18 | AAA |
| `text-brand` (`--color-navy`) | `bg-brand-soft` (`--color-navy-fade`) | `#1F3A5F` on `#EEF2F7` | 8.39 | AAA |
| `text-[--color-success]` | `bg-[--color-success-fade]` | `#2F7D5E` on `#E6F1EC` | 4.61 | AA |
| `text-[--color-warn]` | `bg-[--color-warn-fade]` | `#B7791F` on `#FAF1DC` | 4.55 | AA |
| `text-[--color-danger]` | `bg-[--color-danger-fade]` | `#B23A48` on `#F7E6E8` | 5.06 | AA |
| `text-[--color-info]` | `bg-[--color-info-fade]` | `#2C5C8A` on `#E8EFF7` | 6.04 | AAA |
| `text-muted` on amber soft (progress pill) | `bg-[--color-amber-fade]` | `#5A5A5A` on `#FBF5E6` | 6.59 | AAA |

Two rules follow from this table.

1. `text-muted` on `bg-surface` and on `bg-canvas` both clear 4.5. Helper text and captions in those positions are conformant. `text-muted` on `bg-brand-soft` is not in the table and is not used. Captions inside a brand-soft fill switch to `text-brand`.
2. The status pill family clears AA on its own fade. The pills do not need a heavier text color and the borders on the pills are for shape, not for contrast.

Color is never the only signal. Every status pill carries a text label. Every status row in a table carries a label cell, not just a colored dot. Charts pair color with shape (solid line, dashed line) or with a legend label adjacent to the line.

## Focus management

Focus is the primary signal for keyboard users. It is visible, predictable, and always returns to a sensible place.

### Focus ring

The default focus ring is defined in chapter 00 and applies to every focusable element through a global rule.

```css
:focus-visible {
  outline: 2px solid var(--color-navy-soft);
  outline-offset: 2px;
  border-radius: inherit;
}
```

`:focus-visible` is required, not `:focus`. A mouse click on a button must not leave the ring behind. Keyboard focus must always show the ring. The ring is the same on every component; no surface invents its own.

### Tab order

Tab order follows DOM order. No element uses `tabIndex` greater than 0. Programmatic focus uses `tabIndex={-1}` only on containers that need to receive focus (live regions, dialog roots).

Skipped elements are not allowed. If an element is hidden from sighted users via CSS, it is also removed from the tab sequence (`tabindex="-1"` and `aria-hidden="true"`).

### Focus trap and return

Three overlays trap focus while open.

| Overlay | Trap | Return target on close |
|---|---|---|
| `Dialog` | Yes | The element that opened the dialog |
| `Drawer` | Yes | The table row, card, or button that opened the drawer |
| `CommandPalette` | Yes | The element that held focus before Cmd+K |

Radix handles the trap and the restore in all three. Component code does not override `onCloseAutoFocus`.

### Skip link

The first focusable element on every page is the skip link.

```tsx
<a href="#main" className="skip-link">Skip to main content</a>
```

It is visually hidden until focused. On focus it appears in the top-left corner of the viewport, styled like a `secondary` button at `sm` size. Activating it moves focus to the page main region (`<main id="main" tabIndex={-1}>`).

## Keyboard navigation

The product is fully usable from the keyboard. No path requires a pointer.

### Global shortcuts

| Keys | Action |
|---|---|
| Cmd+K (Ctrl+K on Windows) | Open command palette |
| ? | Open shortcut cheatsheet |
| Esc | Close the topmost overlay |
| Cmd+/ | Toggle sidebar collapse |
| g then d | Go to dashboard |
| g then b | Go to dispatch board |
| g then s | Go to schedule |

The cheatsheet lists every shortcut and is the source of truth. Shortcuts not on the cheatsheet do not exist.

### Tables

Table rows are keyboard-operable.

| Keys | Action |
|---|---|
| ArrowDown / ArrowUp | Move focus to the next or previous row |
| Home / End | Jump to first or last row |
| Enter | Open the row's drawer or follow its primary action |
| Space | Toggle selection if the table has a checkbox column |
| Shift+ArrowDown / Shift+ArrowUp | Extend a multi-row selection |

The first row receives `tabIndex={0}`; subsequent rows are `tabIndex={-1}` and managed by the roving-focus pattern. The table itself is a single tab stop.

### Forms

| Keys | Action |
|---|---|
| Tab / Shift+Tab | Move between fields in DOM order |
| Enter | Submit when the form has exactly one input |
| Cmd+Enter / Ctrl+Enter | Explicit submit on multi-input forms |
| Esc | Cancel inline editing and restore the prior value |

Multi-input forms do not submit on Enter alone. This prevents the accidental submit when a coordinator hits Enter to dismiss a date picker or to move out of a textarea.

### Drawers

| Keys | Action |
|---|---|
| Esc | Close the drawer |
| Cmd+Enter / Ctrl+Enter | Trigger the primary action |
| Tab | Cycle within the drawer (focus is trapped) |

The drawer's primary action is whatever the footer's primary button does. If the drawer has no primary action, Cmd+Enter is a no-op.

### Dispatch board

Board-level shortcuts live in chapter 06. The summary is that ArrowLeft and ArrowRight move a focused card between columns, Space picks up and drops a card, and Esc cancels a pickup.

## Screen reader patterns

The product targets VoiceOver on macOS and NVDA on Windows. JAWS is not blocked but is not part of the pre-merge sweep.

### Landmarks

Every page renders the same five landmarks.

| Landmark | Element | Holds |
|---|---|---|
| Banner | `<header>` in the app shell | Topbar |
| Navigation | `<nav aria-label="Primary">` | Sidebar |
| Main | `<main id="main">` | Page content |
| Complementary | `<aside>` | Drawer when open |
| Content info | `<footer>` | Footer (mobile shell only) |

The sidebar's active item carries `aria-current="page"`. Visual highlight and `aria-current` move together; one never leads the other.

### Live regions

Three live regions exist at the app root and are populated programmatically.

| Region | Politeness | Used for |
|---|---|---|
| `#toast-default` | polite | Default, success, info, warn toasts |
| `#toast-error` | assertive | Error toasts |
| `#status-announce` | polite | Hidden status updates (job moved, row updated) |

Examples of announcements through `#status-announce`:

- "Job at 12 Beacon St marked in progress."
- "Maya assigned to job at 12 Beacon St."
- "Webhook delivery retried."

The announcer is a visually-hidden `<div role="status" aria-live="polite">` and accepts a short string. It is debounced at 200ms so rapid updates do not flood the SR queue.

### Busy state

Regions that are loading carry `aria-busy="true"` on the container and flip to `false` when the load resolves. Skeletons inside a busy region are decorative (`aria-hidden="true"`) and do not announce.

### Names and descriptions

| Pattern | Mechanism |
|---|---|
| Icon-only button | `aria-label` required, matches the tooltip text |
| Form field error | `aria-describedby` points to the error node, `aria-invalid="true"` while in error |
| Form field hint | `aria-describedby` points to the hint node when no error is present |
| Dialog | `aria-labelledby` points to the title, `aria-describedby` points to the description |
| Drawer | `aria-labelledby` points to the entity title in the drawer header |
| Sortable column | `aria-sort` carries `none`, `ascending`, or `descending` |

## Form labeling

Forms follow the same rules across the product.

- Every input has a visible `<Label>`. Placeholder is never a label. Removing the label to "save space" is not allowed.
- The label sits above the input. Left-aligned. `text-small` weight 600 in `text-default`.
- Required fields render an asterisk after the label text and set `aria-required="true"` on the input. The asterisk uses `text-[--color-danger]`.
- The error message sits below the input, replaces the hint, and is linked via `aria-describedby`. The input also carries `aria-invalid="true"` while the error is present.
- Optional fields do not advertise themselves as optional. If most fields are optional, the rare required ones still carry the asterisk; the form does not flip the convention.

```tsx
<FormField
  label="Work email"
  hint="We never share this."
  error={errors.email}
  required
>
  <Input type="email" name="email" placeholder="you@company.com" />
</FormField>
```

`FormField` wires `id`, `htmlFor`, `aria-describedby`, and `aria-invalid` automatically. Component code does not write those attributes by hand.

## Heading structure

One `h1` per page. The `h1` is the page title rendered in the topbar (or in the auth hero on auth pages). Subsequent headings descend without skipping a level.

| Level | Used for |
|---|---|
| `h1` | Page title |
| `h2` | Section heading inside the page, drawer title |
| `h3` | Card title, sub-section heading |
| `h4` | Rarely; only inside a long-form settings panel |

The drawer's title is `h2` even though it sits inside a `<main>` that already has an `h1`. The drawer is a sibling region announced as complementary, and its own heading hierarchy starts at `h2`.

The card title is `h3`. KPI cards, chart cards, and content cards all follow that rule.

## Tooling

The Storybook a11y addon is enabled and runs on every component story. A story that fails a violation does not pass the storybook CI step.

Lighthouse runs against the built site on every PR. The a11y category must score 95 or higher on the routes listed in the CI config. The list grows as routes are added; chapter authors append to it when they ship a new page.

`[NEEDS: full route list in lighthouse CI config]` for the canonical set.

Axe-core scans against built pages are `[NEEDS: axe CI integration]` and deferred to v0.2. Until then, the manual sweep below is the safety net.

## Motion reference

Durations and easings live in chapter 00 motion tokens. This section is the cross-cutting rule set.

### Library

Animation is implemented with **Motion** (package `motion`, the rebrand of `framer-motion`). CSS transitions cover hover and focus color changes. Anything that enters, exits, slides, scales, or pulses goes through Motion's `motion.div` and `AnimatePresence`.

Components consume the tokens through the helper at `apps/web/src/lib/motion.ts`, never as bare numbers. This keeps every animated component pointing at the same source of truth, so a change to a duration in chapter 00 propagates everywhere.

### Token recap

| Token | Duration | Easing |
|---|---|---|
| `motion-fast` | 120ms | `cubic-bezier(0.2, 0, 0, 1)` |
| `motion-base` | 180ms | `cubic-bezier(0.2, 0, 0, 1)` |
| `motion-slow` | 280ms | `cubic-bezier(0.2, 0, 0, 1)` |

Spring physics are not used. CrewMate uses cubic-bezier across the board so that motion is predictable, can be tuned in one place, and renders identically on slow devices.

### Stagger rule

Stagger is allowed but bounded.

- Never above 60ms between siblings.
- Never on items outside the first viewport. If a list has 200 rows, only the rows visible on first paint stagger; the rest fade in together.
- Stagger is not used on user-driven actions. A list re-sorting after a filter does not stagger; it transitions in `motion-base`.

### Reduced motion

`@media (prefers-reduced-motion: reduce)` applies globally.

| Surface element | Default | With reduced-motion |
|---|---|---|
| `motion-*` durations | 120 / 180 / 280ms | 1ms |
| Slide transforms (drawer, toast) | Translate from offset to 0 | Replaced by fade-only |
| Scale transforms (dialog) | Scale from 0.96 to 1.0 | Replaced by fade-only |
| Skeleton shimmer | 1200ms linear infinite | Flat `bg-canvas` fill, no animation |
| Dispatch board realtime pulse | 600ms color fade with subtle scale | Flat color transition, no scale |
| Toast enter | Slide up + fade | Fade only |
| Stagger on list enter | Up to 60ms per sibling | Disabled, items appear together |

The global rule sets all `motion-*` durations to 1ms. Individual components that use transforms override the transform property to `none` inside the reduced-motion media query.

Motion components detect the preference via `useReducedMotion()` at the component boundary. When the hook returns true, the component falls back to a fade-only animation or skips the animation entirely. The detection runs once per component, not per animation, so the rule applies uniformly across a render tree.

### Per-surface motion specs

The cross-references below point to the chapters that own each surface.

| Surface | Owner chapter |
|---|---|
| Drawer enter / exit | 05 — data display |
| Dispatch board card move and realtime updates | 06 — dispatch board |
| Toast enter / exit | 12 — feedback states |
| Dialog enter / exit | 01 — components |
| Sidebar collapse | 02 — layout and navigation |
| Schedule drag-to-reschedule | 08 — schedule view |

Each chapter records its specific durations, easings, and transform sequences. This chapter sets the floor; the chapters refine.

## Mobile-specific accessibility

The worker mobile shell has its own constraints.

- Tap targets are at least 44px on the touch surface. Padding does the work; visual size can stay smaller as long as the hit area meets the floor.
- Bottom-tab items are never icon-only. Icon plus label, every item, every state. The label is `text-micro` and sits below the icon.
- VoiceOver focus order follows DOM order. The tab bar is reachable in a single swipe from the bottom of the page.
- Pull-to-refresh announces "Refreshing" through the polite live region and "Refreshed" when complete. The visual spinner is supplementary.
- The install prompt is dismissible from the keyboard via Esc and from screen readers via a labeled close button.

Reduced-motion on mobile drops the page-transition slide between today / week / profile to a fade.

## Internationalization readiness

Every string in the product flows through an i18n helper from day one, even though only English ships in v0.1. The helper is `t()` from `@/lib/i18n`. Component code reads:

```tsx
<Button variant="primary">{t('jobs.actions.assign')}</Button>
```

Inline literals are not allowed in production code. ESLint flags them.

Dates and numbers use the platform `Intl` APIs, never hand-formatted strings.

```ts
new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(n)
```

The locale is read from the user's profile, falling back to `navigator.language`, falling back to `en-US`.

RTL support is `[NEEDS: design pass for RTL]` and is not in v0.1. The component code uses logical CSS properties (`padding-inline-start`, `margin-block-end`) where possible so that the eventual switch does not require a sweep through every component.

## Per-page testing checklist

Before a page ships, the author runs this sweep.

- [ ] Lighthouse a11y score is 95 or higher.
- [ ] Tab traversal completes the page with visible focus at every stop.
- [ ] No `tabIndex` greater than 0 in the DOM.
- [ ] One `h1`. Heading levels descend without skips.
- [ ] Skip link is the first focusable element and works.
- [ ] Every form field has a visible label and a working error path.
- [ ] Every icon-only button has an `aria-label`.
- [ ] VoiceOver on macOS reads the primary flow without confusion.
- [ ] NVDA on Windows reads the primary flow without confusion.
- [ ] Color picker hover on every status pill confirms the recorded contrast ratio.
- [ ] Reduced-motion is toggled on and the page is still usable.
- [ ] No element conveys meaning by color alone.
- [ ] Live region announcements fire for status changes (job moved, row updated, retry triggered).
- [ ] Focus returns to the trigger when any overlay closes.

A page that fails any box does not ship.

## Gaps

- RTL design pass is `[NEEDS: design pass for RTL]`. Logical CSS properties are in place, but mirrored layouts, calendar direction, and chart axis flipping are not designed yet. Deferred past v0.1.
- Automated axe-core in CI is `[NEEDS: axe CI integration]` and deferred to v0.2. Until then the manual sweep above is the safety net.
- Full localization beyond English is deferred. The i18n helper and `Intl` formatters are wired so the eventual switch is mechanical, but no second locale ships in v0.1.
- High-contrast theme is `[NEEDS: high-contrast palette]` and is out of scope for v0.1. The default palette already clears AA, so a dedicated high-contrast mode is a polish for later.
- JAWS sanity sweep is not in the pre-merge checklist for v0.1. VoiceOver and NVDA are. JAWS is `[NEEDS: tester access]`.
