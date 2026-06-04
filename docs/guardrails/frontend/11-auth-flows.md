# 11 — Auth flows

Every screen a user sees before they have a session, plus the screens that change a session once they have one. Login, invitation acceptance, password reset, two-factor authentication, sign-out, and session expiry.

The visual contract for the login screen is `docs/images/ui/login.png`. The other surfaces in this chapter inherit the same shell unless this file says otherwise.

## Shared shell

All auth pages outside the in-app overlays (2FA enrollment) use the same two-panel split. Left panel sets brand, right panel does the work.

| Region | Spec |
|---|---|
| Page background | `bg-canvas` |
| Split | 50/50 desktop, single column below `md` |
| Left panel | `bg-brand`, `text-on-brand`, `space-16` outer padding, hidden below `md` |
| Right panel | `bg-canvas`, content centered, max card width 400px |
| Page padding | `space-16` top and bottom on desktop, `space-8` on mobile |

Below `md` the right panel takes the full width with a thin top strip of `bg-brand` 6px high to retain the brand anchor.

### Left panel anatomy (login only)

| Slot | Token |
|---|---|
| Wordmark "CrewMate" | `text-h3`, `text-on-brand`, top-left aligned to outer padding |
| Editorial headline | `text-display`, weight 700, 3 lines max, max width 360px |
| Sub copy | `text-body`, `text-on-brand` at 80% opacity, max width 320px, gap `space-4` below the headline |
| Customer wordmarks row | Three wordmarks (Brookline, Northwind, Harborline), outlined style, equal gaps, anchored to bottom of panel |

The headline is fixed copy. "Coordinate field work without the chaos." The sub line is "Dispatch, track, and reconcile jobs across properties and crews in real time." Both ship in the repo and are not user-editable.

### Right panel anatomy

The card is not a `Card` component. It is a borderless block on the canvas with `space-6` vertical rhythm between its sections. From top to bottom.

1. Heading row. `text-h2` for the title, `text-body text-muted` for the sub-copy beneath.
2. Form region. `FormField` instances stacked with `space-5` between fields.
3. Primary `Button` at `size="lg"`, full width.
4. Divider with "or" label. `border-line` 1px line on each side of a `text-small text-muted` "or".
5. Secondary action (Google) as `Button variant="secondary" size="lg"`, full width.
6. Bottom helper text in `text-small text-muted`, left aligned with the card.

## Login screen

Pixel-faithful to `docs/images/ui/login.png`.

### Heading

| Element | Copy | Token |
|---|---|---|
| Title | Sign in to your account | `text-h2` |
| Sub copy | Welcome back. Enter your email and password to continue. | `text-body text-muted` |

### Fields

| Field | Type | Label | Placeholder | Notes |
|---|---|---|---|---|
| Email | `Input type="email"` | Work email | you@company.com | `autocomplete="username"`, autofocus on first paint |
| Password | `Input type="password"` | Password | Enter your password | `autocomplete="current-password"`, trailing eye `IconButton` toggles visibility |

The password label row carries a trailing inline link. The link reads "Forgot?" in `text-small text-brand`, right-aligned, baseline-aligned with the field's `Label`. Clicking routes to `/auth/reset`.

### Primary action

```tsx
<Button variant="primary" size="lg" type="submit" loading={submitting}>
  {submitting ? 'Signing in' : 'Sign in'}
</Button>
```

Full width. While `loading`, the leading slot becomes the 14px spinner and the label flips to "Signing in". The button is disabled during submission, the form fields are not.

### Secondary action

```tsx
<Button variant="secondary" size="lg" type="button" onClick={startGoogleOAuth}>
  <GoogleMark className="icon-md" />
  Continue with Google
</Button>
```

The Google mark is a static SVG that lives at `apps/web/src/assets/google-mark.svg`. It is the only third-party brand mark allowed in the chrome.

### Bottom helper

```
Not on CrewMate yet? Talk to your operator.
```

Rendered as `text-small text-muted` with "Talk to your operator." underlined as a `LinkButton` routing to `/auth/contact-operator`. In v0.1 that route is a static page that explains the invitation-only model. v0.2 replaces it with the organic signup form below.

### Tab order and submit

Email, password (with visibility toggle reachable from the next stop via Shift+Tab), Forgot link, Sign in, Continue with Google, bottom helper link. Enter inside the form submits.

On submit the primary button enters `loading`, both inputs become read-only (not disabled, so screen readers still announce values), and `aria-busy="true"` lands on the form. Submits take 250ms minimum so the spinner never flashes.

### Error states

A form-level `Banner` renders above the heading, not inline. The banner uses the `error` toast variant tokens (`AlertCircle` in danger, `text-default` body) but is persistent until dismissed or the user retypes.

| Cause | Banner copy | Field highlights |
|---|---|---|
| Email or password wrong | These credentials don't match an account. | Both fields show `border-[--color-danger]`, no inline error text |
| Account locked after repeated failures | This account is temporarily locked. Try again in 15 minutes. | No field highlight |
| Account disabled by admin | This account has been disabled. Contact your operator. | No field highlight |
| Rate-limited at the IP | Too many attempts. Try again in a minute. | No field highlight |
| Network failure | We couldn't reach the server. Check your connection and try again. | No field highlight |
| Session expired (arrived from a 401 refresh failure) | Your session expired. Sign in to continue. | No field highlight, banner is `info` variant tokens not `error` |
| 2FA required after correct password | none, routes to `/auth/2fa` | n/a |

Field-specific errors are reserved for client-side validation that fires before submit (e.g. malformed email). Submit failures use the banner so the user reads one message, not two.

## Signup (organic, v0.2)

Organic signup is deferred. v0.1 ships invitation-only. This section documents the v0.2 shape so the shell can be reused.

### Heading

| Element | Copy |
|---|---|
| Title | Create your operator account |
| Sub copy | A 14-day trial. No card required. |

### Fields

| Field | Type | Label | Notes |
|---|---|---|---|
| Full name | `Input type="text"` | Your name | `autocomplete="name"` |
| Work email | `Input type="email"` | Work email | `autocomplete="email"`, duplicate check on blur |
| Password | `Input type="password"` | Password | `autocomplete="new-password"`, inline strength hint |
| Operator name | `Input type="text"` | What's your company called? | This becomes the tenant display name |

Password hint reads "At least 12 characters, one number, one symbol." in `text-small text-muted`. The hint turns into a green checkmark line per requirement met. No password strength bar.

Primary action label is "Create account". Secondary is "Continue with Google". Bottom helper is "Already on CrewMate? Sign in." with a link to `/auth/login`.

On success the user lands on `/onboarding`, which is out of scope for this chapter.

[NEEDS: organic-signup tenant slug field — decide whether the operator picks a slug at signup or after]

## Invitation acceptance

A coordinator or worker invited from `/settings/team` receives an email with a one-time link. The link routes to `/auth/accept?token=...`.

### Token states

| State | Result |
|---|---|
| Valid, unused, unexpired | Render the acceptance form |
| Expired (>7 days) | Render the "Link expired" state below |
| Already used | Render the "Invitation already accepted" state below |
| Unknown / tampered | Render the "Link not found" state below |

The page does not require the user to be signed out. If a signed-in user opens an invite for a different account, we sign them out first and then render the acceptance form.

### Acceptance form

Same shell as login. Right panel content:

| Element | Copy / spec |
|---|---|
| Heading | Accept your invitation |
| Sub copy | <Inviter's display name> invited you to <Operator name>. Set a password to finish. |
| Email field | Read-only `Input` with `disabled` styling, pre-filled, `aria-readonly` |
| Full name field | Pre-filled with the value the inviter typed, editable |
| Password field | `Input type="password"`, `autocomplete="new-password"`, same strength hint as v0.2 signup |
| Confirm password | `Input type="password"`, must match password on blur |
| Role + scope summary | Read-only block, see below |
| Primary action | Accept invitation |

### Role and scope summary

A bordered block in `bg-canvas` with `border-line` 1px, `radius-md`, `space-4` padding. Two rows.

```tsx
<div className="bg-canvas border border-line rounded-md p-4 space-y-3">
  <div className="flex items-center justify-between">
    <span className="text-micro text-muted">Role</span>
    <RolePill role={invite.role} />
  </div>
  <div className="flex items-center justify-between">
    <span className="text-micro text-muted">Scope</span>
    <span className="text-small text-default">{scopeLabel(invite.scope)}</span>
  </div>
</div>
```

`scopeLabel` returns "All properties" for `kind: 'tenant'`, the region name for `kind: 'region'`, or "3 properties" with a hover `Tooltip` listing names for `kind: 'properties'`. The user cannot edit role or scope from this surface.

### Post-acceptance landing

| Role | Lands on |
|---|---|
| `worker` | `/today` |
| `coordinator` | `/dispatch` |
| `tenant_admin` (invited by `super_admin`) | `/dashboard` |

A `Toast` variant `success` greets them, "Welcome to <operator name>." Auto-dismiss 5s.

### Invitation error states

| State | Heading | Sub copy | Primary action |
|---|---|---|---|
| Link expired | This invitation link expired. | Ask the person who invited you to send a new one. | none |
| Already accepted | This invitation was already accepted. | Sign in with your email and password. | Go to sign in |
| Link not found | This link isn't valid. | Double check the URL or ask for a new invitation. | none |

Each error state replaces the form region with an `EmptyState` composition. No banner is shown above.

## Reset password

Three steps, two URLs. Same shell as login.

### Step 1, request a reset

Route `/auth/reset`.

| Element | Copy |
|---|---|
| Heading | Reset your password |
| Sub copy | Enter your email. We'll send you a link to set a new one. |
| Field | Email, `autocomplete="email"`, autofocus |
| Primary action | Send reset link |
| Bottom helper | Remembered it? Sign in. |

On submit the API responds with `204` whether or not the email exists. The UI always renders the confirmation state, which is a fresh `EmptyState` in place of the form.

```
Check your email
We sent a one-time link to <email>. It expires in 30 minutes.
```

No resend button. The user is told to wait, and the rate limiter prevents abuse. A `LinkButton` "Use a different email" returns to step 1.

### Step 2, the email

The email contains a one-time link with a 30 minute expiry. UI surface for the email lives in chapter 19 transactional templates. The link routes to `/auth/reset/confirm?token=...`.

### Step 3, set a new password

Route `/auth/reset/confirm`. Same shell as invitation acceptance, same form anatomy minus the role/scope block.

| Element | Copy |
|---|---|
| Heading | Set a new password |
| Sub copy | Pick something you don't use elsewhere. |
| Password field | `Input type="password"`, strength hint |
| Confirm password | `Input type="password"` |
| Primary action | Save and sign in |

On submit the user is signed in and redirected by role exactly as in invitation acceptance. A success `Toast` reads "Password updated."

### Reset error states

| Cause | Treatment |
|---|---|
| Token expired (>30 min) | `EmptyState`, heading "This reset link expired.", primary action "Request a new link" routing to `/auth/reset` |
| Token already used | `EmptyState`, heading "This reset link was already used.", action "Sign in" |
| Token not found | `EmptyState`, heading "This link isn't valid.", action "Request a new link" |
| Password fails policy | Inline error under the password field, no banner |
| Passwords don't match | Inline error under confirm field |
| Rate-limited (step 1) | Banner above heading, "Too many attempts. Try again in a minute." |

## Two-factor authentication

TOTP only in v0.1. SMS is not on the roadmap.

### Enrollment in settings

Lives in `/settings/profile` under a "Two-factor authentication" section. The section is collapsed by default with a `Switch`. Toggling on opens an inline `Dialog` rather than navigating.

The dialog has three steps, each a step in a horizontal stepper at the top of the dialog. Stepper dots are 8px, brand fill on completed, `border-line` on upcoming.

| Step | Title | Content |
|---|---|---|
| 1 of 3 | Scan the QR code | QR image 200×200px, `border-line` 1px, `radius-md`. Below it a `text-mono text-small` row showing the manual setup code with a "Copy" `IconButton`. |
| 2 of 3 | Enter the six-digit code | Single field, six monospace inputs in a row using `font-mono`, gap `space-2`. Autofocus on the first cell, auto-advance per digit, backspace moves back. |
| 3 of 3 | Save your recovery codes | List of ten codes in `font-mono text-body`, two columns, gap `space-3`. Two `Button`s, "Copy all" (secondary) and "Download .txt" (secondary). One `Checkbox` "I've saved these somewhere safe." gates the dialog's `Button variant="primary"` "Finish". |

Closing the dialog before step 3 cancels enrollment and the secret is discarded server-side.

### Verification page after login

Route `/auth/2fa`. Same shell as login.

| Element | Copy |
|---|---|
| Heading | Enter your authentication code |
| Sub copy | Open your authenticator app and type the six-digit code. |
| Field | Six-digit code, same six-cell input as enrollment step 2 |
| Primary action | Verify |
| Bottom helper | Lost access? Use a recovery code. |

The "Use a recovery code" link swaps the field for a single `Input type="text"` with `font-mono`, placeholder `XXXX-XXXX-XXXX`, and a "Back to code" link to swap back.

### Recovery codes display

Recovery codes are shown once, at enrollment step 3. If the user closes the dialog without saving them, they can regenerate from `/settings/profile`. Regenerating invalidates the previous set and opens a `ConfirmDialog` reading "Replace your recovery codes? Old codes will stop working immediately."

### 2FA error states

| Cause | Treatment |
|---|---|
| Code wrong | Inline error under the six-cell input, "That code didn't match. Try again." Cells reset to empty, focus on first cell. |
| Code expired (TOTP drift) | Same as above, copy reads "That code expired. Use the current one from your app." |
| Recovery code wrong | Inline error, "That recovery code isn't valid." |
| Rate-limited after 5 wrong codes | Banner above heading, "Too many attempts. Wait a minute and try again." Input disabled for 60 seconds with a visible countdown. |
| Backup state, lost device and lost recovery codes | `LinkButton` "Contact your operator" routes to `/auth/contact-operator` |

## Sign-out behavior

The user menu in the topbar has a "Sign out" item. The item is `DropdownMenu.Item` with no icon and no destructive styling. Sign-out is not destructive.

On click:

1. POST `/v1/auth/sign-out`. The server clears the refresh token cookie and revokes the session.
2. The client clears local state (React Query cache, Zustand stores).
3. Hard navigation to `/login`.
4. A neutral `Toast variant="default"` shows on the login page, "You're signed out."

Failure mode. If the sign-out request fails (network), the client still clears local state and navigates. The server cleans up orphaned refresh tokens on the next login.

## Session expiry

Access tokens are short-lived. Refresh tokens are long-lived and rotate on every use. Both are HTTP-only cookies set by the API.

### Transparent refresh

The HTTP client wraps every API call. When a request returns `401` with code `ACCESS_TOKEN_EXPIRED`, the client:

1. Queues the failing request.
2. Calls `/v1/auth/refresh`.
3. On success, replays the queued request once.
4. On failure, drops the queue and triggers expired-session flow.

The UI shows no indication of step 1 through 3. There is no spinner, no toast.

### Expired-session flow

When refresh fails or returns `401`:

1. The client clears local state.
2. Hard navigation to `/login?reason=expired`.
3. The login page reads the query and renders the `info`-variant banner above the heading, "Your session expired. Sign in to continue."
4. The query parameter is stripped from the URL after the banner mounts so a refresh doesn't repeat the message.

## Cross-flow error state matrix

| Flow | Rate limit | Bad input | Expired token / link | Already used |
|---|---|---|---|---|
| Login | Banner, retry timer | Banner, field outlines | Banner on arrival from refresh failure | n/a |
| Signup (v0.2) | Banner, retry timer | Inline per field | n/a | "Already on CrewMate? Sign in." |
| Invitation | Banner | Inline | `EmptyState` "Link expired" | `EmptyState` "Already accepted" |
| Reset request | Banner | Inline (malformed email) | n/a | n/a |
| Reset confirm | Banner | Inline | `EmptyState` "Link expired" | `EmptyState` "Already used" |
| 2FA verify | Banner, 60s countdown | Inline, cells reset | Inline, "use the current one" | n/a |
| Sign-out | n/a, swallowed | n/a | n/a | n/a |

## Accessibility notes

- The login form is a single `<form>` with `noValidate`. Client validation runs on submit and on blur after a first failed submit.
- Every field has a visible `Label`. Placeholder is never a label.
- Banners render with `role="status"` for info and `role="alert"` for error.
- The 2FA six-cell input is a single conceptual control. The component exposes one `aria-label="Authentication code"` on the wrapping group and `aria-label="Digit N of 6"` on each cell.
- Focus restores after a `Dialog` closes. On the 2FA enrollment dialog, focus restores to the `Switch` that opened it.
- `prefers-reduced-motion: reduce` removes the banner's appearance transition and the dialog's scale-in.

## Done checklist

A new auth surface is "done" when:

- [ ] It uses only tokens from `00-design-system.md` and components from `01-components.md`.
- [ ] Every error state in this chapter's matrix is wired and tested.
- [ ] Tab order matches the order documented for the surface.
- [ ] Screen-reader announcements are tested with VoiceOver and NVDA.
- [ ] The visual cross-checks at `docs/images/ui/login.png` (and any new renders) match the implementation.
- [ ] Lighthouse a11y is 95+ on the page.
- [ ] e2e test covers happy path, one failure path, and the expired-link or expired-session path.

## Gaps

- **Organic signup is deferred to v0.2.** v0.1 ships invitation-only. The signup shell above is the contract for when v0.2 lands.
- **Magic-link auth is not designed.** No passwordless flow planned for v0.1 or v0.2.
- **SSO (SAML, OIDC) is not designed.** Google OAuth is the only third-party identity provider. SAML lands no earlier than v0.3.
- **SMS-based 2FA is not on the roadmap.** TOTP only.
- **Device trust is not in v0.1.** Every login requires the 2FA step if 2FA is enabled.
- **Account deletion lives in `/settings/profile`,** documented in chapter 19, not here.
- **Impersonation was considered and dropped from v0.1.** See the "Out of scope" section in `docs/FEATURES.md`. Custom roles (F-012) carry the v0.2 complexity story instead.
- **Organic signup tenant slug behavior is undecided.** `[NEEDS: organic-signup tenant slug field]`.
- **Recovery code regeneration is rate-limited server-side to once per 24 hours.** The UI does not yet show the cooldown.
