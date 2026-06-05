# Login — /login

## Overview

Entry point for all CrewMate users. A two-panel layout at `md` and above: a brand panel on the left
and a sign-in form on the right. On narrow viewports the brand panel is hidden and replaced by a
thin brand-color strip across the top of the page. All roles share one login screen; post-login
redirect is determined server-side by the authenticated user's role.

The screen operates in **demo mode**: fixture sessions are pre-seeded and any matching email
accepts any password. A row of one-click shortcut buttons (one per seeded actor) appears below the
form divider so a reviewer can log in without typing.

---

## Roles With Access

All roles — the screen is unauthenticated. Visiting `/login` while already holding a valid session
should redirect to the appropriate home route (see Post-login Redirects).

| Role        | Can reach `/login` | Post-login destination |
|-------------|-------------------|------------------------|
| SUPER_ADMIN | Yes               | `/dashboard`           |
| MANAGER     | Yes               | `/dashboard`           |
| TEAM_LEAD   | Yes               | `/dashboard` (team-scoped view) |
| WORKER      | Yes               | `/worker`              |

---

## Layout Diagram (ASCII art)

### Desktop (≥ md, two-panel split)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  LEFT PANEL (50 vw — brand color bg)    RIGHT PANEL (50 vw — canvas bg)│
│ ┌─────────────────────────────────┐   ┌─────────────────────────────┐   │
│ │                                 │   │                             │   │
│ │  CrewMate                       │   │  ┌───────────────────────┐  │   │
│ │  (wordmark — top-left)          │   │  │ [!] Error banner      │  │   │
│ │                                 │   │  │ (conditional)         │  │   │
│ │                                 │   │  └───────────────────────┘  │   │
│ │                                 │   │                             │   │
│ │  Coordinate field work          │   │  Sign in to your account   │   │
│ │  without the chaos.             │   │  Welcome back. Enter your  │   │
│ │                                 │   │  email and password...     │   │
│ │  Dispatch, track, and           │   │                             │   │
│ │  reconcile jobs across          │   │  Work email                │   │
│ │  properties and crews in        │   │  ┌─────────────────────┐  │   │
│ │  real time.                     │   │  │ you@company.com     │  │   │
│ │                                 │   │  └─────────────────────┘  │   │
│ │                                 │   │                             │   │
│ │                                 │   │  Password           Forgot? │   │
│ │                                 │   │  ┌─────────────────┐[👁]  │   │
│ │                                 │   │  │ •••••••••••••   │      │   │
│ │                                 │   │  └─────────────────┘      │   │
│ │                                 │   │                             │   │
│ │                                 │   │  ┌─────────────────────┐  │   │
│ │                                 │   │  │     Sign in          │  │   │
│ │  ─────────────────────────────  │   │  └─────────────────────┘  │   │
│ │  🏢 Brookline  📍 Northwind     │   │                             │   │
│ │  🗓 Harborline                  │   │  ─────── or ───────        │   │
│ │                                 │   │                             │   │
│ └─────────────────────────────────┘   │  ┌─────────────────────┐  │   │
│                                       │  │ [G] Continue w/ Google│ │   │
│                                       │  └─────────────────────┘  │   │
│                                       │                             │   │
│                                       │  ── Demo shortcuts ────    │   │
│                                       │  ┌──────┐ ┌──────┐        │   │
│                                       │  │Admin │ │Marco │        │   │
│                                       │  └──────┘ └──────┘        │   │
│                                       │  ┌──────┐ ┌──────┐ ┌────┐ │   │
│                                       │  │Luca  │ │Sofia │ │Ant.│ │   │
│                                       │  └──────┘ └──────┘ └────┘ │   │
│                                       │                             │   │
│                                       │  Not on CrewMate yet?      │   │
│                                       │  Talk to your operator.    │   │
│                                       │                             │   │
│                                       └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile (< md, single-column)

```
┌──────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 6px brand-color top strip
│                              │
│  Sign in to your account     │
│  Welcome back. Enter your    │
│  email and password...       │
│                              │
│  ┌────────────────────────┐  │
│  │ [!] Error banner       │  │  ← only when error present
│  └────────────────────────┘  │
│                              │
│  Work email                  │
│  ┌────────────────────────┐  │
│  │ you@company.com        │  │
│  └────────────────────────┘  │
│                              │
│  Password           Forgot?  │
│  ┌──────────────────────┐[👁]│
│  │ ••••••••••••         │    │
│  └──────────────────────┘    │
│                              │
│  ┌────────────────────────┐  │
│  │       Sign in          │  │
│  └────────────────────────┘  │
│                              │
│  ─────────── or ──────────   │
│                              │
│  ┌────────────────────────┐  │
│  │ [G]  Continue w/ Google│  │
│  └────────────────────────┘  │
│                              │
│  ── Demo shortcuts ──        │
│  ┌─────┐ ┌───────┐          │
│  │Admin│ │Marco  │          │
│  └─────┘ └───────┘          │
│  ┌─────┐ ┌───────┐ ┌──────┐ │
│  │Luca │ │Sofia  │ │Anton.│ │
│  └─────┘ └───────┘ └──────┘ │
│                              │
│  Not on CrewMate yet?        │
│  Talk to your operator.      │
└──────────────────────────────┘
```

---

## Sections / Components

### 1. Left Brand Panel

**What it shows**

Full-height panel visible only on `md` and wider (`hidden md:flex`). Background is the brand primary
color. Contains three vertical zones stacked with `justify-between`:

- **Top** — Product wordmark "CrewMate" (`text-h3 font-semibold text-on-brand`)
- **Middle** — Editorial headline "Coordinate field work without the chaos." (`text-display
  font-bold text-on-brand`, `line-height: 1.15`) + sub-copy paragraph (`text-body text-on-brand/80`,
  max-width ~20rem)
- **Bottom** — Three decorative customer wordmarks (see below)

**Customer wordmarks**

Rendered as icon + label pairs in a flex row (`gap-space-8`), all `text-white/50` (50% opaque white
on the brand background). These are purely decorative logos from fictional tenant names:

| Icon (lucide)  | Label      |
|----------------|------------|
| `Building2`    | Brookline  |
| `MapPin`       | Northwind  |
| `CalendarClock`| Harborline |

**Behavior / interactions**

- Static; no interactive elements.
- Does not scroll independently.

---

### 2. Mobile Brand Strip

**What it shows**

A fixed `h-1.5` (6 px) horizontal bar at the top of the viewport, `bg-brand`. Only visible below
`md`. Provides minimal brand presence without taking up vertical space.

**Behavior / interactions**

- Static. Fixed position — stays at top on scroll.

---

### 3. Error Banner

**What it shows**

A dismissal-free alert block rendered above the heading row when a server-side error is returned
after form submission. Contains:

- `AlertCircle` icon (16 px, `text-danger`, shrink-0)
- Error message text (`text-small text-default`)

Styling: `rounded-lg border border-danger bg-danger-fade px-space-4 py-space-3`.
ARIA: `role="alert"` so screen readers announce it immediately on mount.

**Behavior / interactions**

- Hidden by default (`serverError === null`).
- Appears after a failed `loginAction` call resolves with `{ error: string }`.
- Cleared at the start of each new submission (`setServerError(null)`).
- Does not auto-dismiss.

**Example messages**

| Trigger                    | Message shown                                              |
|----------------------------|------------------------------------------------------------|
| Unrecognised email         | "No fixture account found for this email. Try admin@brookline.demo." |
| API unreachable (future)   | A generic network/server error string from `loginAction`   |

---

### 4. Heading Row

**What it shows**

- `h1` "Sign in to your account" (`text-h2 font-semibold text-default text-balance`)
- Subtitle paragraph "Welcome back. Enter your email and password to continue."
  (`text-body text-muted text-pretty`)

**Behavior / interactions**

- Static. No interactions.
- Appears whether or not an error banner is shown.

---

### 5. Sign-in Form

Managed by `react-hook-form` with a Zod schema (`loginSchema`). `noValidate` suppresses native
browser validation. `aria-busy` is set to `true` while submitting.

#### 5a. Work Email Field

| Attribute        | Value                                      |
|------------------|--------------------------------------------|
| `id`             | `email`                                    |
| `type`           | `email`                                    |
| `autoComplete`   | `username`                                 |
| `autoFocus`      | true (keyboard lands here on page load)    |
| `placeholder`    | `you@company.com`                          |
| `readOnly`       | true while `isSubmitting`                  |
| `aria-invalid`   | true when field-level error OR server error|

**Validation rule:** `z.string().email('Enter a valid email address')`
Error message appears below the input in `text-small text-danger` when triggered.
When a server error is present and there is no specific field error, the input border turns
`border-danger` to reinforce the error state visually.

#### 5b. Password Field

| Attribute        | Value                                          |
|------------------|------------------------------------------------|
| `id`             | `password`                                     |
| `type`           | toggles between `password` and `text`          |
| `autoComplete`   | `current-password`                             |
| `placeholder`    | `Enter your password`                          |
| `readOnly`       | true while `isSubmitting`                      |
| `aria-invalid`   | true when field-level error OR server error    |

Header row above the input contains the "Password" label on the left and a "Forgot?" link on the
right. "Forgot?" links to `/auth/reset`.

An eye-toggle button (`type="button"`, `tabIndex={-1}`) is absolutely positioned inside the input's
right edge. It shows `Eye` (16 px) when the password is hidden and `EyeOff` when visible.
ARIA label toggles between "Show password" and "Hide password".

**Validation rule:** `z.string().min(1, 'Password is required')`
Error message appears below the input. Same danger-border behaviour as the email field on server
error.

#### 5c. Submit Button

- Label: "Sign in" at rest; shows `Spinner` (14 px, `animate-spin`) + "Signing in" while submitting.
- Variant `default`, size `lg`, full width.
- `disabled={isSubmitting}` — prevents double-submission.
- On click triggers `handleSubmit(onSubmit)`.

**Submission flow:**

1. `react-hook-form` validates the form client-side against `loginSchema`.
2. If valid, `onSubmit` calls `loginAction(email, password)` (Next.js Server Action).
3. The server action looks up the email in `FIXTURE_SESSIONS`.
   - Match → sets `crewmate_session` cookie (httpOnly, sameSite lax, 7-day maxAge) and calls
     `redirect()` to the role-appropriate route.
   - No match → returns `{ error: string }`.
4. On error the component sets `serverError` state and shows the error banner.

---

### 6. Divider

A horizontal rule with an "or" label centred between two `h-px bg-line` lines. Purely visual
separator between the primary action and the secondary (Google) action.

---

### 7. Continue with Google Button

- Variant `outline`, size `lg`, full width.
- Renders an inline `GoogleMark` SVG (the four-colour Google "G") as a leading icon.
- Label: "Continue with Google".
- Currently a `type="button"` placeholder. OAuth flow is not wired in Phase 2.

**Note:** Clicking this button in the current demo does nothing. It serves as a visual affordance
for a future OAuth integration.

---

### 8. Demo Shortcut Buttons

**What it shows**

A labelled section below the Google button. Renders one pill/compact button per seeded demo actor.
Clicking any button instantly auto-fills the email and password fields then submits the form —
no typing required.

**Layout:** Two-row grid or wrapped flex, `gap-space-2`. Each button is compact (size `sm` or
`xs`), variant `ghost` or `outline`, and includes the actor's name and role badge for clarity.

**Seeded actors and their shortcuts:**

| Button label              | Email                         | Password  | Role        | Post-login route |
|---------------------------|-------------------------------|-----------|-------------|-----------------|
| Admin System (SUPER_ADMIN)| admin@crewmate.demo           | demo1234  | SUPER_ADMIN | /dashboard      |
| Marco Bianchi (MANAGER)   | marco.b@crewmate.demo         | demo1234  | MANAGER     | /dashboard      |
| Luca Ferrari (TEAM_LEAD)  | luca.f@crewmate.demo          | demo1234  | TEAM_LEAD   | /dashboard      |
| Sofia Conti (WORKER)      | sofia.c@crewmate.demo         | demo1234  | WORKER      | /worker         |
| Antonio Ricci (WORKER)    | antonio.r@crewmate.demo       | demo1234  | WORKER      | /worker         |

**Behavior / interactions:**

1. On click, the button calls `setValue('email', <email>)` and `setValue('password', 'demo1234')`
   via `react-hook-form`'s `setValue`, then programmatically calls `handleSubmit(onSubmit)()`.
2. The form transitions to `isSubmitting` state, inputs become `readOnly`, button shows spinner.
3. If the action succeeds, the browser is redirected immediately (server redirect).
4. If the action fails for any reason, the error banner appears as normal.

**Note:** In Phase 2 the server action accepts any password for fixture emails, so the demo
shortcuts always succeed.

---

### 9. Footer Helper Text

Below the demo shortcuts (or below the Google button if shortcuts are not rendered):

> "Not on CrewMate yet? **Talk to your operator**."

- "Talk to your operator" is an anchor linking to `/auth/contact-operator`.
- Styled `text-small text-muted` with the link in `text-brand underline underline-offset-2`.

---

## Actions & API Calls

### `loginAction(email, password)` — Next.js Server Action

**File:** `apps/web/src/app/(auth)/login/actions.ts`

**Phase 2 (current — fixture mode):**

```
Input:  email: string, password: string (password ignored)
Lookup: FIXTURE_SESSIONS[email]
Match:  → set cookie `crewmate_session` (JSON, httpOnly, sameSite lax, maxAge 7d)
         → redirect() to role route (no return value — redirect throws internally)
No match: return { error: string }
```

**Cookie shape:**

```json
{
  "userId": "user-001",
  "role": "tenant_admin",
  "operatorId": "op-brookline-001",
  "name": "Alex Chen"
}
```

**Phase 3+ (planned — real API):**

```
POST /auth/login
Body:   { email, password }
200:    { accessToken: string }  → store token, decode role, redirect
401:    { message: string }      → show error banner
```

---

## Post-login Redirects by Role

The redirect target is determined by `session.role` inside the server action.

| Role value (fixture) | Mapped canonical role | Redirect target |
|----------------------|-----------------------|-----------------|
| `tenant_admin`       | SUPER_ADMIN           | `/dispatch`     |
| `coordinator`        | MANAGER               | `/dispatch`     |
| `worker`             | WORKER / TEAM_LEAD    | `/today`        |

**Note on naming:** The fixture `UserRole` type uses `tenant_admin | coordinator | worker`. The
canonical SEED-DATA roles (`SUPER_ADMIN | MANAGER | TEAM_LEAD | WORKER`) will be adopted in Phase 3
when the real API is wired. When Phase 3 ships:

| Role       | Redirect target              |
|------------|------------------------------|
| SUPER_ADMIN| `/dashboard`                 |
| MANAGER    | `/dashboard`                 |
| TEAM_LEAD  | `/dashboard` (team-scoped)   |
| WORKER     | `/worker`                    |

---

## Demo Mode (Shortcut Buttons)

Demo shortcuts exist to let a reviewer or hiring manager switch between user perspectives instantly
without managing credentials. They should be visually distinct from the primary login flow (e.g.
contained in a clearly labelled "Demo logins" section) so they are not mistaken for real accounts.

**Shortcut buttons — full specification:**

```
┌──────────────────────────────────────────────────────────┐
│  Demo logins                                             │
│                                                          │
│  ┌─────────────────────────────┐  ┌───────────────────┐ │
│  │ Admin System  SUPER_ADMIN   │  │ Marco B.  MANAGER │ │
│  └─────────────────────────────┘  └───────────────────┘ │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────┐ │
│  │ Luca F. TEAM_LEAD│  │ Sofia C.  WORKER │  │Anton. │ │
│  └──────────────────┘  └──────────────────┘  │WORKER │ │
│                                               └────────┘ │
└──────────────────────────────────────────────────────────┘
```

- All five buttons are always rendered (no conditional visibility).
- Buttons are non-destructive: clicking one always navigates away on success, so there is no risk
  of "stuck" state.
- The password field will briefly show "demo1234" filled in before the redirect (normal behaviour).

---

## Notes / Edge Cases

1. **Already authenticated.** Middleware (or a `getSession` check in the page) should detect an
   active `crewmate_session` cookie and redirect to the appropriate home route before rendering the
   login page. Without this guard, an authenticated user visiting `/login` sees the form again.

2. **Password field toggle and form autofill.** Browser autofill may override `showPassword` state
   by writing directly to the DOM. The eye toggle reads from React state, so after autofill the icon
   may appear inconsistent until the user interacts. This is a known cosmetic issue and low priority.

3. **Google button is a no-op in Phase 2.** No onClick handler is wired. Phase 3 will add OAuth via
   NextAuth or a redirect to `/auth/google`.

4. **`/auth/reset` and `/auth/contact-operator` are placeholder routes.** These pages do not exist
   in Phase 2. Clicking "Forgot?" or "Talk to your operator" will 404 unless stub pages are added.

5. **Tab order.** The eye-toggle button has `tabIndex={-1}` intentionally — it should not appear in
   the keyboard tab sequence. The submit button follows the password field naturally.

6. **`readOnly` vs `disabled` on inputs.** Inputs are `readOnly` (not `disabled`) during submission
   so the values are still submitted if the form re-triggers, and to preserve the visual input
   style without the disabled greying.

7. **Server Action redirect semantics.** `redirect()` in Next.js Server Actions throws a special
   internal error (`NEXT_REDIRECT`). The `loginAction` function never returns on success — it throws.
   Callers must not await a resolved value when the action redirects; the browser simply navigates.

8. **Cookie `maxAge` is 7 days.** Closing the browser does not expire the session in the demo (no
   `session`-flag cookie). For a production build, consider `session: true` + short maxAge or an
   explicit logout endpoint.

9. **Operator-scoped data.** The `crewmate_session` cookie includes `operatorId` (`op-brookline-001`
   for all fixture users). Every authenticated API call and fixture data lookup uses this value to
   scope tenant data. Never render data from a different `operatorId` than the one in the session.
