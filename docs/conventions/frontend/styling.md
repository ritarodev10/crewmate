# Styling Conventions

Tailwind CSS 4, CSS custom properties, and shadcn/ui styling patterns for `apps/web/`.

---

## Design Tokens

All design tokens are defined as CSS custom properties in `src/app/globals.css` using Tailwind 4's `@theme` block. No `tailwind.config.ts` file is needed for base tokens.

### Token Definitions

```css
/* src/app/globals.css */

@import 'tailwindcss';

@theme {
  /* Surface stack — warm neutrals */
  --color-canvas: #F5F0E8;
  --color-surface: #FAF7F3;
  --color-surface-card: #FFFFFF;
  --color-surface-muted: #F0EBE2;
  --color-border: #E8E2D9;
  --color-border-strong: #D4CCC2;

  /* Sidebar */
  --color-sidebar-bg: #111318;
  --color-sidebar-fg: #EDE8D8;
  --color-sidebar-fg-muted: #6B6760;
  --color-sidebar-item-hover: #1C1F27;
  --color-sidebar-item-active: #252932;
  --color-sidebar-border: #1E2029;

  /* Brand / Primary */
  --color-primary: #ED742F;
  --color-primary-hover: #D4621E;
  --color-primary-subtle: #F8E8D8;
  --color-primary-fg: #FFFFFF;

  /* Job status */
  --color-status-scheduled: #2563EB;
  --color-status-in-progress: #EA5C0A;
  --color-status-completed: #16A34A;
  --color-status-cancelled: #78716C;

  --color-status-scheduled-bg: #E8EFFC;
  --color-status-in-progress-bg: #FCEEE5;
  --color-status-completed-bg: #E6F2EA;
  --color-status-cancelled-bg: #EAE5DC;

  /* Worker status */
  --color-worker-on-job: #EA5C0A;
  --color-worker-idle: #78716C;
  --color-worker-offline: #5C5752;

  /* Semantic / Feedback */
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #2563EB;

  --color-success-subtle: #E6F2EA;
  --color-warning-subtle: #FEF3CD;
  --color-error-subtle: #FDEAEA;
  --color-info-subtle: #E8EFFC;

  /* Text — warm tones throughout */
  --color-text-primary: #1C1710;
  --color-text-secondary: #4A3F2F;
  --color-text-muted: #8A7A62;
  --color-text-inverse: #EDE8D8;

  /* KPI card accents */
  --color-kpi-jobs-bg: #FDEBD4;
  --color-kpi-jobs-fg: #ED742F;
  --color-kpi-workers-bg: #DAE9FF;
  --color-kpi-workers-fg: #2563EB;
  --color-kpi-ontime-bg: #D4F5E2;
  --color-kpi-ontime-fg: #16A34A;
  --color-kpi-revenue-bg: #FEF3C7;
  --color-kpi-revenue-fg: #D97706;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Shadows — warm-tinted, never cool or blue */
  --shadow-sm: 0 1px 4px rgba(80, 55, 20, 0.08);
  --shadow-md: 0 4px 12px rgba(80, 55, 20, 0.10);
  --shadow-lg: 0 8px 24px rgba(80, 55, 20, 0.14);
  --shadow-xl: 0 16px 40px rgba(80, 55, 20, 0.18);

  /* Motion */
  --transition-fast: 100ms ease-out;
  --transition-base: 150ms ease-out;
  --transition-slow: 200ms ease-out;
  --transition-map: 250ms ease-out;
}
```

### shadcn/ui Semantic Overrides

shadcn/ui reads its own CSS custom properties. Map them to the CrewMate tokens in the same `globals.css`:

```css
:root {
  --background: var(--color-canvas);
  --foreground: var(--color-text-primary);
  --card: var(--color-surface-card);
  --card-foreground: var(--color-text-primary);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-primary-fg);
  --muted: var(--color-surface-muted);
  --muted-foreground: var(--color-text-muted);
  --border: var(--color-border);
  --destructive: var(--color-error);
  --destructive-foreground: #FFFFFF;
  --ring: var(--color-primary);
  --radius: 0.75rem;
}
```

---

## Tailwind 4 Specifics

### No `tailwind.config.ts`

Tailwind CSS 4 uses CSS-first configuration. All custom tokens are defined in the `@theme` block in `globals.css`. There is no `tailwind.config.ts` file for base token definitions.

If you need to extend Tailwind with custom utilities or plugins, add them in `globals.css` using `@utility` or `@plugin` directives. Do not create a `tailwind.config.ts` unless there is a specific need that cannot be handled in CSS.

### Use `@apply` Sparingly

`@apply` is allowed only for:

1. Base element resets (e.g., setting default body styles)
2. Repeated utility groups used in 3+ places that cannot be extracted into a component

Never use `@apply` for component-specific styles. Those belong in JSX as utility classes.

```css
/* Good — base reset */
body {
  @apply bg-[--color-canvas] text-[--color-text-primary] antialiased;
}

/* Bad — component-specific styles belong in JSX */
.kpi-card {
  @apply rounded-xl border border-[--color-border] bg-[--color-surface-card] p-5;
}
```

### Responsive Design

Mobile-first breakpoints. The default (no prefix) targets the smallest screen.

| Prefix | Min-width | Use |
|---|---|---|
| (none) | 0px | Worker mobile views (target 430px) |
| `sm:` | 640px | Small adjustments |
| `md:` | 768px | Tablet, search input width changes |
| `lg:` | 1024px | Desktop layout with sidebar |

Worker mobile views (`/worker`, `/worker/jobs/[id]`) are designed for max-width 430px. Use `max-lg:` modifier for styles that should only apply below the desktop breakpoint.

Desktop app shell pages (`/dashboard`, `/jobs`, `/workforce`, `/revenue`) are designed for 1280px+ but must not break at `lg` (1024px).

---

## Class Ordering

Tailwind classes follow this order, enforced by the `prettier-plugin-tailwindcss` Prettier plugin:

1. **Layout** — `flex`, `grid`, `block`, `hidden`, `relative`, `absolute`, `fixed`, `sticky`, `z-*`
2. **Box model** — `w-*`, `h-*`, `size-*`, `p-*`, `m-*`, `gap-*`, `overflow-*`
3. **Typography** — `text-*`, `font-*`, `leading-*`, `tracking-*`, `tabular-nums`, `truncate`
4. **Visual** — `bg-*`, `border-*`, `rounded-*`, `shadow-*`, `opacity-*`
5. **Interactive** — `cursor-*`, `transition-*`, `hover:*`, `focus:*`, `active:*`

The Prettier plugin handles this automatically. Do not manually reorder classes.

---

## Conditional Classes

### Always Use `cn()`

`cn()` from `lib/utils.ts` re-exports `clsx` (conditional logic) combined with `tailwind-merge` (deduplication). Use it for all conditional or merged class strings.

```tsx
import { cn } from '@web/lib/utils';

// Good
<div
  className={cn(
    'rounded-xl border border-[--color-border] p-5',
    isActive && 'border-[--color-primary]',
    isCompact ? 'p-3' : 'p-5',
    className, // forwarded from props
  )}
/>

// Bad — string template literal
<div className={`rounded-xl border p-5 ${isActive ? 'border-blue-500' : ''}`} />

// Bad — ternary without tailwind-merge (conflicting classes not deduped)
<div className={isActive ? 'rounded-xl border border-blue-500 p-5' : 'rounded-xl border border-gray-200 p-5'} />
```

### `cn()` Implementation

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

## Color Usage Rules

### Page Background

Always `bg-[--color-canvas]`. Never `bg-gray-50`, `bg-white`, or any Tailwind default color.

```tsx
// Good
<main className="bg-[--color-canvas]">

// Bad
<main className="bg-gray-50">
```

### Card Surfaces

Always `bg-[--color-surface-card]` with `border border-[--color-border]`. Cards in this design system use borders for hierarchy, not box-shadows (per the design system).

```tsx
// Good
<div className="rounded-xl border border-[--color-border] bg-[--color-surface-card] p-5">

// Bad — box-shadow on card
<div className="rounded-xl bg-white p-5 shadow-md">
```

The exception: drawers and modals use shadows for elevation over the backdrop. Drawers use `shadow-md`, modals use `shadow-lg`.

### No Hardcoded Hex Colors in JSX

Never write a hex color directly in a `className` or `style` prop. Always reference a CSS custom property or a Tailwind token defined in `@theme`.

```tsx
// Good
<span className="text-[--color-status-scheduled]">Scheduled</span>

// Bad
<span className="text-[#2563EB]">Scheduled</span>

// Bad
<span style={{ color: '#2563EB' }}>Scheduled</span>
```

### Status Colors

Always use the `--color-status-*` tokens. Never use arbitrary Tailwind orange/green/grey/blue values for job or worker status.

```tsx
// Good
const statusColor: Record<JobStatus, string> = {
  SCHEDULED: 'text-[--color-status-scheduled]',
  IN_PROGRESS: 'text-[--color-status-in-progress]',
  COMPLETED: 'text-[--color-status-completed]',
  CANCELLED: 'text-[--color-status-cancelled]',
};

// Bad
const statusColor: Record<JobStatus, string> = {
  SCHEDULED: 'text-blue-600',
  IN_PROGRESS: 'text-orange-500',
  COMPLETED: 'text-green-600',
  CANCELLED: 'text-gray-500',
};
```

### Text Colors

All text uses warm-toned tokens. Never use cool grays (`text-gray-*`, `text-slate-*`, `text-zinc-*`).

| Token | Use |
|---|---|
| `text-[--color-text-primary]` | Headings, bold values, primary content |
| `text-[--color-text-secondary]` | Body text, descriptions |
| `text-[--color-text-muted]` | Timestamps, metadata, captions, secondary labels |
| `text-[--color-text-inverse]` | Text on dark backgrounds (sidebar) |

---

## Shadow Scale

Warm-tinted shadows using `rgba(80, 55, 20, ...)`. Never use default Tailwind shadows (they are cool-tinted with `rgba(0, 0, 0, ...)`).

| Token | Value | Use |
|---|---|---|
| `shadow-[--shadow-sm]` | `0 1px 4px rgba(80,55,20,0.08)` | Subtle card differentiation (rarely needed, borders preferred) |
| `shadow-[--shadow-md]` | `0 4px 12px rgba(80,55,20,0.10)` | Drawer overlay, demo actor switcher |
| `shadow-[--shadow-lg]` | `0 8px 24px rgba(80,55,20,0.14)` | Modal overlay, floating elements |
| `shadow-[--shadow-xl]` | `0 16px 40px rgba(80,55,20,0.18)` | Demo actor switcher dropdown |

Cards do **not** use shadows. Cards use `border border-[--color-border]` for visual hierarchy. The canvas-to-card color step (`--color-canvas` to `--color-surface-card`) provides depth.

---

## Border Radius Scale

```
rounded-sm    4px     chips, table cells
rounded-md    6px     badges, small buttons
rounded-lg    8px     icon backgrounds, small cards
rounded-xl    12px    standard cards, map container
rounded-2xl   16px    shell panels (sidebar, content area)
rounded-full  9999px  avatars, dots, pill badges
```

### Concentric Radius Rule

When nesting rounded elements, the outer radius must equal the inner radius plus the padding between them. Mismatched radii on nested elements is the most common visual flaw.

```tsx
// Good — outer rounded-2xl (16px) = inner rounded-xl (12px) + p-1 (4px)
<div className="rounded-2xl bg-[--color-surface] p-1">
  <div className="rounded-xl bg-[--color-surface-card]">
    {/* content */}
  </div>
</div>

// Bad — same radius on both
<div className="rounded-xl bg-[--color-surface] p-4">
  <div className="rounded-xl bg-[--color-surface-card]">
    {/* Looks wrong — inner corners don't align with outer */}
  </div>
</div>
```

---

## Typography

### Font Loading

Inter is loaded via `next/font/google` in `app/layout.tsx`:

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

### Font Smoothing

Apply `antialiased` on the `<body>` element for crisper text rendering on macOS. This is set once in the root layout and never overridden.

### Type Scale

| Token | Size | Weight | Tailwind classes | Use |
|---|---|---|---|---|
| display | 28px / 1.2 | 700 | `text-[28px] font-bold leading-[1.2]` | Page title |
| heading | 20px / 1.3 | 700 | `text-xl font-bold leading-tight` | Section titles, drawer heading |
| subheading | 16px / 1.4 | 600 | `text-base font-semibold` | Card titles, column headers |
| kpi | 36px / 1.0 | 800 | `text-4xl font-extrabold leading-none tabular-nums` | KPI numbers |
| body | 14px / 1.5 | 400 | `text-sm` | Default body text |
| body-sm | 13px / 1.5 | 400 | `text-[13px]` | Secondary info |
| label | 12px / 1.4 | 500 | `text-xs font-medium` | Badges, chips, table labels |
| caption | 11px / 1.3 | 400 | `text-[11px]` | Timestamps, meta, nav section labels |

### Text Wrapping

- Headings: `text-balance` (prevents awkward line breaks in short headings)
- Body text and paragraphs: `text-pretty` (avoids orphaned words on the last line)
- Dense UI (tables, cards): `truncate` or `line-clamp-*` to prevent overflow

### Tabular Numbers

Use `tabular-nums` on all dynamic number values to prevent layout shift when digits change:

```tsx
// Good
<span className="tabular-nums text-4xl font-extrabold">{jobCount}</span>

// Bad — proportional numerals cause width jitter
<span className="text-4xl font-extrabold">{jobCount}</span>
```

This is critical for KPI cards, earnings amounts, progress percentages, and any counter that updates live.

---

## shadcn/ui Component Integration

### Generated Components

Components in `components/ui/` are added via `npx shadcn add <name>` and are never hand-edited. Current components used:

- `button`, `card`, `badge`, `dialog`, `sheet`, `avatar`, `input`, `select`, `radio-group`, `textarea`, `tabs`, `tooltip`, `skeleton`

### Wrapping Pattern

When a shadcn primitive needs project-specific defaults, create a wrapper in `components/`:

```tsx
// components/app-sheet.tsx — wrapper for project defaults
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@web/components/ui/sheet';
import { cn } from '@web/lib/utils';

interface AppSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function AppSheet({ open, onClose, title, children, className }: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className={cn('w-[480px] bg-[--color-surface-card] p-0', className)}
      >
        <SheetHeader className="border-b border-[--color-border] px-6 py-5">
          <SheetTitle className="text-xl font-bold text-[--color-text-primary]">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-6 py-5">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Glassmorphism

Used **only** on map overlay elements (legend chips, floating stats over the Mapbox satellite map). Never on cards, modals, or drawers.

```tsx
// Good — glassmorphism on map overlay
<div className="rounded-lg border border-white/20 bg-white/70 px-3 py-1.5 backdrop-blur-[12px]">
  <span className="text-xs font-medium">SCHEDULED: 12</span>
</div>

// Bad — glassmorphism on a card
<div className="rounded-xl bg-white/80 p-5 backdrop-blur-md">
  {/* Cards use solid backgrounds, not glassmorphism */}
</div>
```

---

## What NOT to Do

These are the most common mistakes that break the design system. Each is a build-blocking review comment.

| Mistake | Correct approach |
|---|---|
| Using `bg-white` or `#FFFFFF` for cards | `bg-[--color-surface-card]` |
| Using `bg-gray-50` for page background | `bg-[--color-canvas]` |
| Using cool gray text (`text-gray-500`, `text-slate-600`) | `text-[--color-text-muted]` or `text-[--color-text-secondary]` |
| Default Tailwind shadows (`shadow-md`) | `shadow-[--shadow-md]` with warm-tinted values |
| Hardcoded hex in className | CSS custom property reference |
| Box-shadow on cards | `border border-[--color-border]` only |
| `@apply` for component styles | Utility classes in JSX |
| Editing files in `components/ui/` | Create a wrapper component in `components/` |
| Tailwind's default status colors (`text-blue-600`, `text-orange-500`) | `text-[--color-status-scheduled]`, `text-[--color-status-in-progress]` |
| Thin KPI numbers (font-weight < 800) | `font-extrabold` (800) for KPI values |
| Glassmorphism outside of map overlays | Solid backgrounds everywhere except map floating elements |
| String template for conditional classes | `cn()` from `lib/utils.ts` |
