# 00 — Design System

The token layer. Everything visible in the product is built from the values on this page. No surface invents its own color, type size, spacing unit, or radius. If a value is missing, this file gets a PR before any other code does.

## Brand at a glance

CrewMate coordinates field work for property and hospitality operators. The brand voice is the same one the product needs to project to a stressed coordinator at 7am with a worker who hasn't shown up. Calm, plain, organized. Not playful, not corporate. Closer to Linear than to Mailchimp.

| Trait | Yes | No |
|---|---|---|
| Tone | Direct, plain, helpful | Cute, jokey, exclamatory |
| Density | Comfortable, calm whitespace | Cramped or marketing-airy |
| Color use | Restrained, navy + bone + one accent | Rainbow, gradient-heavy |
| Type | Editorial, geometric sans | Display fonts, novelty fonts |
| Motion | Brief, functional | Decorative, parallax, hover dances |
| Copy | Sentence case, no hype | Title Case Buttons, exclamation marks |

## Color

All values are CSS variables. Use the token name, not the hex, in component code.

### Brand

| Token | Hex | Used for |
|---|---|---|
| `--color-bone` | `#FAFAF7` | App background. The canvas. |
| `--color-paper` | `#FFFFFF` | Card and surface fills above bone. |
| `--color-ink` | `#1A1A1A` | Body text, primary headings. |
| `--color-muted` | `#5A5A5A` | Secondary text, captions, hint copy. |
| `--color-line` | `#E5E7EB` | Borders, dividers, table rules. |
| `--color-line-strong` | `#D0D0D0` | Heavier dividers when needed. |
| `--color-navy` | `#1F3A5F` | Primary brand. Sidebar fill, primary buttons, key labels. |
| `--color-navy-soft` | `#2A4D7A` | Hover state on navy. |
| `--color-navy-fade` | `#EEF2F7` | Tinted navy backgrounds (selected nav, active filter chip). |
| `--color-amber` | `#D4A24C` | Single accent. Active state, in-progress, attention. Used sparingly. |
| `--color-amber-fade` | `#FBF5E6` | Tinted amber fills (active card background, in-progress pill bg). |

### Semantic

| Token | Hex | Used for |
|---|---|---|
| `--color-success` | `#2F7D5E` | Confirmed, delivered, on-time. |
| `--color-success-fade` | `#E6F1EC` | Success pill background. |
| `--color-warn` | `#B7791F` | Retrying, partial, soft warning. Reuses an amber-ish family but darker. |
| `--color-warn-fade` | `#FAF1DC` | Warn pill background. |
| `--color-danger` | `#B23A48` | Failed, deny, destructive. |
| `--color-danger-fade` | `#F7E6E8` | Danger pill background. |
| `--color-info` | `#2C5C8A` | Informational notices. |
| `--color-info-fade` | `#E8EFF7` | Info pill background. |

### Roles in code

A token never appears as a raw color outside its CSS variable definition. Components consume role tokens through Tailwind utilities mapped in `tailwind.config.ts`. Example role mapping:

| Tailwind class | Resolves to |
|---|---|
| `bg-canvas` | `var(--color-bone)` |
| `bg-surface` | `var(--color-paper)` |
| `bg-brand` | `var(--color-navy)` |
| `bg-brand-soft` | `var(--color-navy-fade)` |
| `bg-accent` | `var(--color-amber)` |
| `text-default` | `var(--color-ink)` |
| `text-muted` | `var(--color-muted)` |
| `text-brand` | `var(--color-navy)` |
| `text-on-brand` | `#FFFFFF` |
| `border-line` | `var(--color-line)` |

Component code should reach for `bg-brand`, never `bg-[#1F3A5F]`.

## Typography

Two families, no more. Inter for everything UI. JetBrains Mono for IDs, code, and any tabular numeric where alignment matters.

| Token | Family | Notes |
|---|---|---|
| `font-sans` | Inter | UI default, all running text, all headings. |
| `font-mono` | JetBrains Mono | IDs (UUIDs, request IDs), JSON payloads, signed headers. |

Load both with `font-display: swap` and preload the two most common weights (400 and 600). `font-feature-settings: 'cv11', 'ss01', 'ss03'` for Inter, which gives the more humanist letterforms.

### Type scale

| Token | Size | Line height | Weight | Used for |
|---|---|---|---|---|
| `text-display` | 32 / 36 | 1.15 | 700 | Hero headings on auth pages. One per page max. |
| `text-h1` | 24 / 28 | 1.2 | 700 | Page titles (Dashboard, Dispatch board). |
| `text-h2` | 18 / 22 | 1.3 | 600 | Section headings inside a page. |
| `text-h3` | 15 / 18 | 1.4 | 600 | Card titles, drawer headers. |
| `text-body` | 14 / 20 | 1.5 | 400 | Default body. |
| `text-body-strong` | 14 / 20 | 1.5 | 600 | Inline emphasis. |
| `text-small` | 13 / 18 | 1.45 | 400 | Captions, helper text, secondary metadata. |
| `text-micro` | 11 / 14 | 1.3 | 600 | Labels on pills, table column headers, eyebrow tags. ALL CAPS, +0.05em tracking. |
| `text-mono` | 13 / 18 | 1.45 | 500 | JetBrains Mono. IDs, code. |

Tabular numerals (`font-variant-numeric: tabular-nums`) are required on KPI numbers, table cells with counts, latency columns, and any column that needs to align right.

### Voice and copy

- Sentence case for buttons and headings. "Save changes", not "Save Changes".
- Plain verbs. "Send invite", not "Initiate invitation".
- No exclamation marks. "Saved" is enough.
- "Empty" not "No results found!"
- Error copy names the cause, not the symptom. "This email is already on the team", not "Failed".
- Refer to people, not entities, when the user is one. "Your workers", "Maya's day".
- Time is human. "in 12m", "yesterday at 4:12 PM", not "2026-06-03T16:12:04Z".

## Spacing

A single 4px scale. Never use half-units. Never invent values outside the scale.

| Token | px | Common use |
|---|---|---|
| `space-0` | 0 | — |
| `space-1` | 4 | Pill internal padding, tight gaps. |
| `space-2` | 8 | Icon-to-label, dense list rows. |
| `space-3` | 12 | Form field internals, table cell padding. |
| `space-4` | 16 | Default card padding, default vertical rhythm. |
| `space-5` | 20 | Form field vertical rhythm. |
| `space-6` | 24 | Section spacing inside cards, large gaps. |
| `space-8` | 32 | Page section spacing. |
| `space-10` | 40 | Page section spacing on large screens. |
| `space-12` | 48 | Hero block padding. |
| `space-16` | 64 | Top-level page padding on auth and marketing surfaces. |

Touch targets are at least 44×44px on mobile and 32×32px on desktop. Padding inside an interactive element does the work; do not enlarge the visual to meet the target.

## Radius

| Token | px | Used for |
|---|---|---|
| `radius-0` | 0 | Sharp edges (very rare, only on full-width section dividers). |
| `radius-sm` | 4 | Pills, badges, small chips. |
| `radius-md` | 6 | Buttons, inputs, dropdowns. |
| `radius-lg` | 8 | Cards, dialogs, drawers. |
| `radius-xl` | 12 | Large cards, KPI cards, chart cards. |
| `radius-full` | 9999 | Avatars, status dots. |

No `border-radius` value other than these appears anywhere.

## Elevation and borders

We are flat by default. Shadows are a last resort. Where a layered surface needs definition, a 1px border in `--color-line` does the work.

| Token | Spec | Used for |
|---|---|---|
| `shadow-none` | — | Default. Almost all surfaces. |
| `shadow-pop` | `0 4px 14px -6px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(15, 23, 42, 0.04)` | Dropdowns, tooltips, the floating drawer when over a backdrop. |
| `shadow-overlay` | `0 12px 32px -12px rgba(15, 23, 42, 0.18), 0 1px 4px rgba(15, 23, 42, 0.06)` | Dialogs, command palettes. |

Cards do not use shadows. Cards use a 1px border in `--color-line` on a `--color-paper` fill.

## Iconography

Lucide React. Stroke width `1.75`. Default size 16px inside body text, 18px in buttons and nav, 20px in topbar actions.

| Token | px |
|---|---|
| `icon-xs` | 14 |
| `icon-sm` | 16 |
| `icon-md` | 18 |
| `icon-lg` | 20 |
| `icon-xl` | 24 |

Icons inherit `currentColor`. They never carry their own color outside that inheritance.

Status dots (the 8px round indicator on cards) are not icons. They are filled circles in a semantic color.

## Motion

Brief and functional. The product never animates to entertain.

| Token | Duration (ms) | Easing | Used for |
|---|---|---|---|
| `motion-fast` | 120 | `cubic-bezier(0.2, 0, 0, 1)` | Hover, focus, color transitions. |
| `motion-base` | 180 | `cubic-bezier(0.2, 0, 0, 1)` | Most enters and exits, drawer slide, dialog scale. |
| `motion-slow` | 280 | `cubic-bezier(0.2, 0, 0, 1)` | Page-level transitions, large surfaces. |

Stagger: never more than 60ms between siblings. Lists do not stagger items beyond the visible viewport on first render.

### Implementation library

Animation is implemented with **Motion** (the rebrand of `framer-motion`, package name still `motion`). CSS transitions handle hover and focus colors; everything else (drawer slide, dialog scale, card pulse on realtime update, toast enter/exit) goes through Motion's `<motion.div>` and `AnimatePresence`.

Motion consumes the design tokens, not bare numbers. A drawer slide reads `duration: 0.18` from the `motion-base` token and the cubic-bezier from the same row. There is one helper file `apps/web/src/lib/motion.ts` that exports the three durations and the easing as named constants, and every animated component imports from there.

```tsx
import { motion, AnimatePresence } from "motion/react";
import { motionBase, easeStandard } from "@/lib/motion";

<AnimatePresence>
  {open && (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: motionBase, ease: easeStandard }}
    />
  )}
</AnimatePresence>
```

### Reduced motion

`prefers-reduced-motion: reduce` collapses all durations to `1ms` and disables non-essential transforms. Required. The Motion implementation uses `useReducedMotion()` to detect the preference and short-circuits the animation, falling back to either a fade-only or no transition at all. The detection is done once at the component boundary, not per animation, so the rule applies uniformly.

## Imagery

The product is text and data first. Where imagery appears:

- Customer logos are rendered as wordmarks in an outline style at low contrast. Never raw uploaded raster logos in the chrome.
- Property thumbnails (future) are square, `radius-md`, treated with a 1px `--color-line` border, no shadow.
- Avatars are colored circles with the initial in `font-sans 600` and a hash-derived hue from a fixed palette of six colors. No uploaded profile photos in v0.1.

## Naming

CSS variables in `kebab-case` and prefixed with their family (`--color-`, `--space-`, `--radius-`, `--shadow-`, `--motion-`, `--icon-`).

Tailwind classes use a small intentional vocabulary on top of these, defined in `tailwind.config.ts` under `theme.extend`. The Tailwind layer is the only place a UI engineer reaches; nothing reaches past it into raw CSS variables in component code.

## What this file does not cover

- Component anatomy. See `01-components.md`.
- Layout grids and breakpoints. See `02-layout-and-navigation.md`.
- Motion choreography for specific surfaces (drawer-in, board-update). See the chapter for that surface.
- Accessibility detail beyond color contrast. See `13-accessibility-and-motion.md`.

If you need a token that doesn't exist, open a PR against this file with the proposed name, the value, and one example surface that uses it. Do not write the value inline anywhere else.
