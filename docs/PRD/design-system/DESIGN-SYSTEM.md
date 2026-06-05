# CrewMate — Design System

> Primary reference: `reference-crewmate.png` | Secondary: `reference-intelly.png`
> Stack: Tailwind 4, shadcn/ui, `@crewmate/ui` tokens
> Last updated: 2026-06-05

---

## 1. Design Philosophy

### The Aesthetic: Clean Modern Ops Dashboard — Warm Canvas, Colorful Cards, Glassmorphism Map

Two reference images define this aesthetic:
- `reference-crewmate.png` — primary target: dark sidebar, warm off-white canvas, colorful KPI cards with sparklines, real person avatars in feed, 2px left accent bars in activity rows, satellite map with labeled pins, glassmorphism legend
- `reference-intelly.png` — style DNA: warm canvas, inner-contained panel layout, section labels in sidebar, dense but airy feel

**Core rules:**
1. **Warm but clean** — canvas is off-white warm (`#F5F0E8`), not parchment/gritty. Cards are clean light surfaces differentiated by a subtle `1px border` and/or a very slight background tint — NO box-shadows on cards.
2. **Color through elements, not backgrounds** — each KPI card has a distinct accent color expressed through its icon background and delta arrow. The card surface stays neutral.
3. **Real person avatars everywhere** — no initials chips. Activity feed rows show circular photo avatars of real Italian-looking people.
4. **Modern sleek icons** — sidebar nav uses clean line icons (Lucide/Heroicons style). KPI card icons are on soft rounded-square colored backgrounds.
5. **Glassmorphism on map overlays only** — legend chip and any floating stats over the satellite map use `backdrop-filter: blur(12px)`, semi-transparent background, light border. Nowhere else.
6. **Modern sans-serif typography** — Inter or Geist. Bold numbers, clean hierarchy.

### What We Keep from References
- Dark sidebar as a distinct floating card, `rounded-2xl`, with OVERVIEW / MANAGEMENT section labels
- Warm off-white canvas visible as a gutter between panels
- Vivid status badge chips (blue/orange/green) that pop against the neutral background
- Dense activity feed with worker photos, event badges, job refs, locations, timestamps
- Full-height satellite Milan map filling the right panel

### What We Change from Previous Attempts
- **No newspaper/parchment texture** — lighter, cleaner, more modern
- **No box-shadows on cards** — border or bg tint only
- **More color variety** — each KPI card accent is a different hue
- **Real face photos** in the activity feed rows
- **Glassmorphism** on map-overlay elements

---

## 2. Color System

### 2.1 Surface Stack

Clean warm neutrals. No parchment texture, no gritty tones.

```
--color-canvas        #F5F0E8   /* warm off-white page background */
--color-surface       #FAF7F3   /* content area — barely lighter than canvas */
--color-surface-card  #FFFFFF   /* card surface — clean, differentiated by border only */
--color-surface-muted #F0EBE2   /* subtle inset, table row alt, hover bg */
--color-border        #E8E2D9   /* 1px card border — warm gray */
--color-border-strong #D4CCC2   /* section dividers, table headers */
```

Cards use NO box-shadow. Visual hierarchy comes from the `1px border` and the canvas/card color step.

### 2.1b KPI Card Accent Colors

Each of the 4 KPI cards has a distinct accent color for its icon background and delta indicator:

```
Card 1 — Total Jobs:    icon bg #FDEBD4  icon color #ED742F  (orange)
Card 2 — Active Workers: icon bg #DAE9FF  icon color #2563EB  (blue)
Card 3 — On-Time Rate:  icon bg #D4F5E2  icon color #16A34A  (green)
Card 4 — Revenue Today: icon bg #FEF3C7  icon color #D97706  (amber)
```

### 2.2 Sidebar (Dark Masthead)

The one dramatic element. Near-black with warm undertone so it doesn't feel cold.

```
--color-sidebar-bg         #111318   /* near-black, warm undertone */
--color-sidebar-fg         #EDE8D8   /* primary nav text — warm off-white */
--color-sidebar-fg-muted   #6B6760   /* section labels, inactive icons */
--color-sidebar-item-hover  #1C1F27  /* hover state bg */
--color-sidebar-item-active #252932  /* active nav item bg */
--color-sidebar-border      #1E2029  /* internal dividers */
```

### 2.3 Brand / Primary

Orange that pops against parchment. Used for CTAs, active nav indicator, highlighted values.

```
--color-primary         #ED742F   /* brand orange — vivid pop on parchment */
--color-primary-hover   #D4621E   /* darker on hover */
--color-primary-subtle  #F8E8D8   /* warm parchment-tinted orange for badge fills */
--color-primary-fg      #FFFFFF   /* text on solid orange button */
```

### 2.4 Job Status Colors

These are the vivid ink colors. They must pop clearly against `--color-canvas` and `--color-surface-card`.

```
--color-status-scheduled   #2563EB   /* vivid blue — "ink on parchment" */
--color-status-in-progress #EA5C0A   /* vivid burnt orange */
--color-status-completed   #16A34A   /* vivid forest green */
--color-status-cancelled   #78716C   /* stone — the one that recedes */

/* Badge fill backgrounds — warm-tinted, NOT cool pastels */
--color-status-scheduled-bg    #E8EFFC   /* pale blue-parchment */
--color-status-in-progress-bg  #FCEEE5   /* pale orange-parchment */
--color-status-completed-bg    #E6F2EA   /* pale green-parchment */
--color-status-cancelled-bg    #EAE5DC   /* pale stone-parchment */
```

### 2.5 Worker Status

```
--color-worker-on-job   #EA5C0A   /* same as in-progress — they're active */
--color-worker-idle     #78716C   /* stone muted */
--color-worker-offline  #5C5752   /* darker stone */
```

### 2.6 Semantic / Feedback

```
--color-success   #16A34A   /* forest green — same as completed */
--color-warning   #D97706   /* amber */
--color-error     #DC2626   /* vivid red */
--color-info      #2563EB   /* same as scheduled blue */

/* Parchment-tinted fills */
--color-success-subtle  #E6F2EA
--color-warning-subtle  #FEF3CD
--color-error-subtle    #FDEAEA
--color-info-subtle     #E8EFFC
```

### 2.7 Text

Warm tones throughout — no cool gray text.

```
--color-text-primary    #1C1710   /* warm near-black — headings, bold values */
--color-text-secondary  #4A3F2F   /* warm dark brown — body text */
--color-text-muted      #8A7A62   /* warm gray-brown — timestamps, meta, captions */
--color-text-inverse    #EDE8D8   /* on dark sidebar backgrounds */
```

---

## 3. Typography

### 3.1 Scale

Editorial weight contrast is essential — numbers and headings should feel bold against the warm background.

| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-display` | 28px / 1.2 | 700 | Page title |
| `text-heading` | 20px / 1.3 | 700 | Section titles, drawer heading |
| `text-subheading` | 16px / 1.4 | 600 | Card titles, column headers |
| `text-kpi` | 36px / 1.0 | 800 | KPI numbers — maximum weight, commands attention |
| `text-body` | 14px / 1.5 | 400 | Default body text |
| `text-body-sm` | 13px / 1.5 | 400 | Secondary info |
| `text-label` | 12px / 1.4 | 500 | Badges, chips, table labels |
| `text-caption` | 11px / 1.3 | 400 | Timestamps, meta, nav section labels |

### 3.2 Font Family

```
--font-sans: 'Inter', system-ui, sans-serif
--font-mono: 'JetBrains Mono', monospace   /* IDs, codes */
```

### 3.3 Sidebar Typography

Section group labels: `text-caption`, `font-semibold`, `uppercase`, `letter-spacing: 0.08em`, `color: --color-sidebar-fg-muted`.

Nav item labels: `text-body-sm`, `font-medium`, inactive `--color-sidebar-fg-muted`, active `--color-sidebar-fg`.

---

## 4. Layout Architecture

### 4.1 Shell Structure

The app shell floats on the parchment canvas with visible breathing room.

```
Viewport  bg: --color-canvas (#E8DFC8)
└── Shell  h-screen  p-3  gap-3  flex
    ├── Sidebar   w-[220px]  rounded-2xl  bg-sidebar-bg  flex-shrink-0
    └── Content   flex-1     rounded-2xl  bg-surface     overflow-hidden
        ├── Topbar   h-[56px]  border-b border-border  px-6
        └── Body     flex-1    overflow-y-auto  bg-surface
```

Key: `--color-surface` (`#EEE7D4`) is only slightly lighter than the canvas (`#E8DFC8`). The visible gutter at the edges of the shell shows the canvas. The content area does NOT look like a dramatically different "white panel" — it reads as one warm environment with the sidebar as the only dramatic break.

### 4.2 Dashboard Split

```
Body (canvas bg bleeds through content area bg)
├── Left panel  ~42%  px-6 py-5
│   ├── KPI grid  2×2  gap-4
│   └── Activity feed  (fills remaining height)
└── Right panel  ~58%  (map fills flush, no padding)
    └── Mapbox satellite  rounded-xl  h-full
```

### 4.3 Drawer

```
Fixed right overlay
└── Drawer  w-[520px]  h-full  bg-surface-card
    ├── Header  px-6 py-5  border-b
    └── Body    px-6 py-5  overflow-y-auto
```

---

## 5. Component Patterns

### 5.1 Cards

All cards are `--color-surface-card` (`#F5EFE0`) — the lightest parchment tier.

```
bg: --color-surface-card
rounded-xl
border: 1px solid --color-border
box-shadow: 0 2px 6px rgba(80,60,20,0.08)   /* warm-tinted shadow */
padding: 20px
```

No cold-tinted shadows. The shadow color uses warm brown, not black or blue.

### 5.2 KPI Cards

```
┌──────────────────────────────────┐
│ [icon on soft rounded bg]        │  icon 20px, on 36px rounded-lg bg
│                                  │  bg color = status-bg tint
│ 40                               │  text-kpi (36px 800-weight) text-primary
│ Total Jobs Today                 │  text-caption uppercase muted  mt-2
│ ▲ +0%  vs yesterday              │  text-label color varies  mt-1
└──────────────────────────────────┘
```

Icon background colors:
- Jobs: `--color-primary-subtle` (orange parchment tint)
- Workers: `--color-status-scheduled-bg` (blue parchment tint)
- On-time: `--color-status-completed-bg` (green parchment tint)
- Revenue: `--color-warning-subtle` (amber parchment tint)

### 5.3 Status Badges

Pill badge: `rounded-full px-2.5 py-0.5 text-label font-medium`

| State | Background | Text |
|---|---|---|
| SCHEDULED | `--color-status-scheduled-bg` | `--color-status-scheduled` |
| IN_PROGRESS | `--color-status-in-progress-bg` | `--color-status-in-progress` |
| COMPLETED | `--color-status-completed-bg` | `--color-status-completed` |
| CANCELLED | `--color-status-cancelled-bg` | `--color-status-cancelled` |

The parchment-tinted backgrounds ensure badges feel warm, not clinical (no cold pastel fills).

### 5.4 Sidebar Navigation

```
Sidebar (#111318, rounded-2xl, flex col)
│
├── Logo area  px-5 pt-5 pb-4
│   ├── "CrewMate" wordmark  text-heading text-inverse
│   └── Role pill  text-caption  bg-sidebar-item-active  px-2 py-0.5 rounded-md
│
├── Nav  flex-1  px-3  py-3  space-y-5
│   ├── [Group "OVERVIEW"]
│   │   ├── Section label  text-caption uppercase tracking-wide muted
│   │   └── NavItem × 2  (Dashboard, Jobs)
│   └── [Group "MANAGEMENT"]
│       ├── Section label
│       └── NavItem × 2  (Workers, Revenue)
│
└── User row  px-4 pb-4  mt-auto
    ├── Avatar  32px circle
    ├── Name    text-body-sm text-inverse font-medium
    └── Role    text-caption text-sidebar-fg-muted
```

Active NavItem: `bg-sidebar-item-active`, left border `3px solid --color-primary`, text full `--color-sidebar-fg`.

### 5.5 Topbar

```
height: 56px  bg: --color-surface  border-bottom: --color-border
├── Left:   breadcrumb  text-body-sm  text-muted
└── Right:  demo actor chip  (dark pill, shadow-md)
```

### 5.6 Activity Feed Row

```
┌──────────────────────────────────────────────────────────┐
│ [AV]  Luca Ferrari    [completed job]  #J-005 · Lighting  │
│       Brera Pinacoteca                          09:52 AM  │
└──────────────────────────────────────────────────────────┘
```

Row: `py-3 border-b border-border`. No card bg — rows sit directly on the feed container bg.

Avatar: 32px circle, colored by worker initials hash.

### 5.7 Map Pins

DOM elements on Mapbox satellite canvas:

| State | Style |
|---|---|
| SCHEDULED | 14px circle, `--color-status-scheduled`, white border 2px |
| IN_PROGRESS | 16px circle, `--color-status-in-progress`, pulsing outer ring |
| COMPLETED | 13px circle, `--color-status-completed`, checkmark |
| CANCELLED | 12px circle, `--color-status-cancelled`, no animation |

---

## 6. Shadows

Warm-tinted, never cool or blue:

```
shadow-sm   0 1px 4px rgba(80,55,20,0.08)
shadow-md   0 4px 12px rgba(80,55,20,0.10)
shadow-lg   0 8px 24px rgba(80,55,20,0.14)
shadow-xl   0 16px 40px rgba(80,55,20,0.18)
```

---

## 7. Border Radius

```
rounded-sm   4px    /* micro: chips, table cells */
rounded-md   6px    /* badges, small buttons */
rounded-lg   8px    /* icon backgrounds, small cards */
rounded-xl   12px   /* standard cards, map container */
rounded-2xl  16px   /* shell panels: sidebar, content area */
rounded-full 9999px /* avatars, dots, pill badges */
```

---

## 8. Motion

```
transition-fast   100ms ease-out  /* hover state color changes */
transition-base   150ms ease-out  /* badge show/hide */
transition-slow   200ms ease-out  /* drawer slide */
transition-map    250ms ease-out  /* pin color/size on WS update */
```

---

## 9. Mapbox

```
style:  mapbox://styles/mapbox/satellite-streets-v12
center: [9.190, 45.464]
zoom:   12
```

The satellite dark imagery creates sharp contrast with the surrounding warm parchment UI — this is intentional. The map is the only "cold" element alongside the sidebar.

---

## 10. What NOT to Do

- **No `#FFFFFF`** — not on cards, not on inputs, not anywhere. Use `--color-surface-card` (#F5EFE0).
- **No cool gray** — not `#F5F5F5`, not `#E5E7EB`, not `slate-*`. Use warm parchment variants.
- **No blue-tinted shadows** — use the warm rgba(80,55,20,…) shadow stack only.
- **No flat sidebar** — the dark sidebar must have `rounded-2xl` and visible gutter from the canvas edge.
- **No cold status badge fills** — badge backgrounds must use the warm `*-bg` tokens, not Tailwind's default blue/green pastels.
- **No thin KPI numbers** — KPI values must be 800-weight. Thin numbers on parchment disappear.
- **No gray text** — all text through warm text tokens. `#9CA3AF` reads cold on parchment; use `--color-text-muted` (#8A7A62) instead.
- **No default Tailwind colors** — everything through CSS custom properties.

---

## 11. Tailwind 4 Mapping

```css
/* packages/ui/src/tokens.css */
:root {
  --color-canvas:         #E8DFC8;
  --color-surface:        #EEE7D4;
  --color-surface-card:   #F5EFE0;
  --color-surface-muted:  #DFD7C0;
  --color-border:         #D0C8B0;
  --color-border-strong:  #BDB49E;
  --color-primary:        #ED742F;
  --color-primary-hover:  #D4621E;
  --color-primary-subtle: #F8E8D8;
  --color-text-primary:   #1C1710;
  --color-text-secondary: #4A3F2F;
  --color-text-muted:     #8A7A62;
  --color-sidebar-bg:     #111318;
  --color-sidebar-fg:     #EDE8D8;
  /* ... status tokens from section 2.4 ... */
}
```

shadcn/ui semantic overrides:
```
--background          → --color-canvas
--card                → --color-surface-card
--border              → --color-border
--primary             → --color-primary
--primary-foreground  → #FFFFFF
--muted               → --color-surface-muted
--muted-foreground    → --color-text-muted
--destructive         → --color-error
--foreground          → --color-text-primary
```

---

## 12. Reference Files

| File | Purpose |
|---|---|
| `docs/PRD/design-system/reference-crewmate.png` | **Primary** — canonical CrewMate dashboard target: dark sidebar, warm canvas, colorful KPI cards with sparklines, activity feed with accent bars, satellite Milan map, glassmorphism legend |
| `docs/PRD/design-system/reference-intelly.png` | **Secondary** — Intelly medical dashboard: layout DNA, warm canvas aesthetic, inner-contained panel style |
| `packages/ui/src/tokens.css` | CSS custom properties (to be written) |
| `apps/web/src/app/globals.css` | Tailwind 4 `@theme` mapping (to be written) |
| `docs/PRD/screens/_INDEX.md` | Screen layout diagrams |
