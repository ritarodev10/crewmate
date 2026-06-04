# 07 — Forms

The playbook for every form in the product. Login, invitation acceptance, settings, webhook endpoint editor, role grants, job creation. Forms in CrewMate are state machines with three concerns: capturing input, validating it, and reconciling what the server says back. This chapter says how those three concerns are wired, every time.

Read `01-components.md` for `Input`, `Label`, `FormField`, `Select`, `Combobox`. Read `11-auth-flows.md` for the densest form surfaces (login, invitation acceptance, 2FA enrollment). Read `08-feedback-states.md` for validation timing and post-save feedback. This chapter extends those, it does not replace them.

## The stack

Three libraries, no more. Every form in `apps/web` uses all three.

| Library | Role | Version (apps/web) |
|---|---|---|
| `react-hook-form` | Form state, registration, dirty tracking, submit lifecycle | `[NEEDS: react-hook-form version, not in apps/web/package.json yet]` |
| `zod` | Schema definition and validation | `^3.23.0` |
| `@hookform/resolvers/zod` | Bridges zod schemas into react-hook-form | `[NEEDS: @hookform/resolvers version, not in apps/web/package.json yet]` |

Versions get verified at read-time against `apps/web/package.json`. If they drift, the doc gets a PR.

A form does not reach for any other state library. Not Zustand, not Apollo cache, not `useState` for the field values. The state of "what is the user typing" lives in `react-hook-form` and nowhere else.

Why these three. `react-hook-form` is uncontrolled by default, which keeps re-renders local to the field that changed. `zod` is the same schema library the contracts package already uses for request and response shapes, so we get a single mental model end to end. The resolver package is a 40-line shim that turns a `zod` schema into the validator shape `react-hook-form` expects.

## Standard form shape

Every form follows the same skeleton. The schema lives in a `*.schema.ts` file next to the form. The component imports the schema, builds the form, and renders fields wrapped in `FormField`.

```tsx
// apps/web/src/features/settings/profile/profile-form.schema.ts
import { z } from "zod";

export const profileFormSchema = z.object({
  fullName: z.string().min(1, "Enter your full name."),
  workEmail: z.string().email("Enter a valid email."),
  phone: z
    .string()
    .regex(/^\+?[0-9\s()-]{7,}$/, "Enter a phone number.")
    .optional()
    .or(z.literal("")),
  timezone: z.string().min(1, "Pick a timezone."),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
```

```tsx
// apps/web/src/features/settings/profile/profile-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useUpdateProfile } from "./use-update-profile";
import { mapServerErrors } from "@/lib/forms/map-server-errors";
import { profileFormSchema, type ProfileFormValues } from "./profile-form.schema";

type Props = { defaults: ProfileFormValues };

export function ProfileForm({ defaults }: Props) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const updateProfile = useUpdateProfile();

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values);
    } catch (err) {
      mapServerErrors(err, form);
    }
  });

  const formError = form.formState.errors.root?.serverError?.message;

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={form.formState.isSubmitting}>
      {formError && (
        <Banner variant="error" className="mb-5">
          {formError}
        </Banner>
      )}

      <FormField label="Full name" required error={form.formState.errors.fullName?.message}>
        <Input {...form.register("fullName")} autoComplete="name" />
      </FormField>

      <FormField label="Work email" required error={form.formState.errors.workEmail?.message}>
        <Input type="email" inputMode="email" autoComplete="email" {...form.register("workEmail")} />
      </FormField>

      <FormField label="Phone" hint="Used for SMS reminders on jobs." error={form.formState.errors.phone?.message}>
        <Input type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} />
      </FormField>

      <FormField label="Timezone" required error={form.formState.errors.timezone?.message}>
        <Select {...form.register("timezone")}>{/* options omitted */}</Select>
      </FormField>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={() => form.reset(defaults)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={form.formState.isSubmitting}
          disabled={!form.formState.isDirty || form.formState.isSubmitting}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}
```

The pieces above are not optional. Every form has the same five parts in the same order.

1. Schema in a sibling `*.schema.ts`.
2. `useForm` with `zodResolver(schema)`, `defaultValues`, and `mode: "onBlur"`.
3. `<form noValidate onSubmit={form.handleSubmit(onSubmit)}>`.
4. Each input wrapped in `FormField` reading `form.formState.errors.<field>.message`.
5. Submit `Button` with `loading={form.formState.isSubmitting}` and `disabled` driven by `isDirty` and `isSubmitting`.

The submit handler does two jobs. It calls the mutation, and it hands any error to `mapServerErrors` (below). It does no business logic. If a form needs to compute something before sending, that computation lives in the mutation hook, not the submit handler.

## Validation timing

Field validation runs on blur, not on every keystroke. This matches the rule in `08-feedback-states.md`. The user is not red-lined while typing.

| Trigger | Behavior |
|---|---|
| Keystroke | No validation. Field is "in progress." |
| Blur | Field-level validation runs. Inline error shows if invalid. |
| Submit | Full validation pass. First errored field receives focus and is scrolled into view. |
| Server response | Server errors get mapped into fields where possible, otherwise into a form-level banner. |

The `useForm` config uses `mode: "onBlur"`, and `reValidateMode` stays at its default of `onChange` so that a field which already errored is re-checked as the user fixes it. The combination gives "don't yell while I'm typing, but stop yelling the moment I've fixed it."

Submit triggers a full validation pass. `react-hook-form` automatically focuses the first errored field. The component additionally scrolls that field into view with a 24px top offset so the field is not flush against the topbar. The helper lives at `apps/web/src/lib/forms/scroll-to-first-error.ts` and the form invokes it inside the error path of `handleSubmit`.

### Async validation

A handful of fields need a server round trip to validate. The classic case is uniqueness, "is this email already on the team", "is this webhook endpoint URL already configured." Async validation runs on blur with a 400ms debounce.

The pattern is a per-field async validator inside zod's `superRefine`, or a `validate` callback passed to `register` when the rule is local to one form. Either way the call is debounced through a small helper.

```tsx
form.register("workEmail", {
  validate: debouncedUnique(async (email) => {
    const taken = await checkEmailTaken(email);
    return taken ? "This email is already on the team." : true;
  }, 400),
});
```

The debounce holds the last call until 400ms after the user stops typing. While the call is in flight the field's hint slot shows "Checking" in `text-small text-muted`. On resolution the hint is restored or replaced by the inline error.

Async validators never block the user from submitting. If the user submits before the async check resolves, the submit waits for the in-flight check, then validates. If the async check fails, the field gets the inline error and the rest of the form stays untouched.

## Reconciling server errors

The API error envelope is documented in `backend/04-error-handling.md`. The relevant shape on the client.

```ts
type ApiErrorEnvelope = {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};
```

When validation fails server-side, `code === "VALIDATION_FAILED"` and `details.fields` is an array of `{ path: string; reason: string }`. The path is dotted to match the form's field names.

`mapServerErrors` is a single helper every form uses. It walks the envelope and either calls `form.setError(path, { type: "server", message })` per field, or sets a root-level error that the banner reads.

```tsx
// apps/web/src/lib/forms/map-server-errors.ts
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";

type Envelope = {
  code: string;
  message: string;
  requestId: string;
  details?: { fields?: Array<{ path: string; reason: string }> };
};

export function mapServerErrors<T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>,
): void {
  const env = toEnvelope(error);

  if (env.code === "VALIDATION_FAILED" && env.details?.fields?.length) {
    let focused = false;
    for (const { path, reason } of env.details.fields) {
      const fieldName = path as Path<T>;
      form.setError(fieldName, { type: "server", message: reason }, {
        shouldFocus: !focused,
      });
      focused = true;
    }
    return;
  }

  // Anything else becomes a form-level banner.
  const message = friendlyMessage(env);
  form.setError("root.serverError" as Path<T>, {
    type: "server",
    message,
  });
}
```

`friendlyMessage` maps known codes to product copy. Unknown codes fall back to a generic line that includes the `requestId`.

| Code | Banner copy |
|---|---|
| `AUTH_REQUIRED` | Your session expired. Sign in to continue. |
| `AUTHZ_DENIED` | You don't have permission for this action. |
| `RATE_LIMITED` | Too many attempts. Try again in a minute. |
| `CONFLICT` | (uses `env.message`, which names the conflict) |
| `UPSTREAM_FAILED` | A service we depend on is having trouble. Try again in a moment. |
| `INTERNAL_ERROR` | Something broke on our side. Reference: <requestId>. |
| unknown | Couldn't save. Reference: <requestId>. |

Two rules are non-negotiable.

- 5xx errors render a top-of-form `Banner` and do not clear any field values. The user's input is the source of truth they want to fix.
- Per-field errors render inline under the field, not as a toast. Toast-only server errors get missed.

## Field components

Every form input is one of the components in `01-components.md`. The component knows how to look. The form knows what data it carries.

| Field | Component | Notes |
|---|---|---|
| Single-line text | `Input` | `type="text"`, `email`, `tel`, `url`, `password` |
| Multi-line text | `Textarea` | Resizes vertical only, no horizontal grow |
| Single select | `Select` | Use when there are fewer than ~8 options |
| Single select, searchable | `Combobox` | Use when there are 8+ options or async results |
| Multi select, searchable | `MultiCombobox` | Tag-style selected items above the input |
| Boolean | `Checkbox` | Labels are clickable, target ≥ 24px |
| One-of-many | `RadioGroup` | Use when the options are exclusive and benefit from being all visible |
| Toggle | `Switch` | Used in settings, not in transactional forms |
| Single date | `DatePicker` | Built on `Popover` + `Calendar` |
| Date range | `DateRangePicker` | The chart-page filter, the audit log filter |
| File upload | `FileUpload` | Drag-drop desktop, plain `<input type="file">` mobile |

`FormField` is the wrapper. It owns the label, the optional hint, and the error slot. It threads `aria-describedby` and `aria-invalid` onto the input it wraps so a screen reader knows what to read after the field name.

### File upload

The file input is mobile-first. On mobile it is a plain `<input type="file">` styled to look like a `Button variant="secondary"`. On desktop it gains a drop target above the button. The drop target is 96px tall, dashed `border-line` 1px, `radius-md`, with a label "Drop a file or browse." Drag-over swaps the border to `--color-navy-soft` and the fill to `--color-navy-fade`.

Upload progress is rendered as a thin progress bar across the bottom of the field, height 2px, `bg-brand`. The progress comes from the TanStack Query mutation hook for the upload, not from the form. The form receives the resulting file id or signed URL on resolve.

## Custom field hook pattern

Some inputs need extra logic beyond what `register` covers. The 2FA six-cell code input is the canonical example. The phone-number input with a country code is another. For these, wrap the input as a controlled component using `useController` from react-hook-form.

```tsx
// apps/web/src/components/ui/otp-input.tsx
"use client";

import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { useRef } from "react";
import { clsx } from "clsx";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  length?: number;
  ariaLabel?: string;
};

export function OtpInput<T extends FieldValues>({ control, name, length = 6, ariaLabel = "Authentication code" }: Props<T>) {
  const { field, fieldState } = useController({ control, name });
  const cellsRef = useRef<Array<HTMLInputElement | null>>([]);
  const value = ((field.value as string) ?? "").padEnd(length, " ").slice(0, length);

  const setDigit = (index: number, digit: string) => {
    const cleaned = digit.replace(/\D/g, "").slice(0, 1);
    if (!cleaned) return;
    const next = value.split("").map((c, i) => (i === index ? cleaned : c)).join("").trimEnd();
    field.onChange(next);
    if (index < length - 1) cellsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index]?.trim() && index > 0) cellsRef.current[index - 1]?.focus();
  };

  return (
    <div role="group" aria-label={ariaLabel} aria-invalid={!!fieldState.error} className="flex gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { cellsRef.current[i] = el; }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${length}`}
          value={value[i]?.trim() ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onBlur={field.onBlur}
          className={clsx(
            "h-12 w-10 rounded-md border bg-surface text-center font-mono text-h2",
            fieldState.error ? "border-[--color-danger]" : "border-line",
            "focus:outline-none focus:ring-2 focus:ring-[--color-navy-soft]",
          )}
        />
      ))}
    </div>
  );
}
```

Two things matter in the pattern. The input owns its DOM and its keyboard logic; the hook owns its value and validation state. The parent form passes `control` and `name`, the same way it would `register`. The schema validates the resulting string the same way it would any other field.

```tsx
const totpSchema = z.object({
  code: z.string().length(6, "Enter the six-digit code."),
});

<OtpInput control={form.control} name="code" />
```

The phone-number-with-country input follows the same shape. The country code dropdown and the number input compose into a single value that `useController` exposes to the form.

## Submit button states

The submit button has five visual states. Every form respects all five.

| State | Visual | When |
|---|---|---|
| Default | `Button variant="primary"`, label like "Save changes" | Form has not been edited yet |
| Dirty | Same visual, enabled even if previously submitted | `form.formState.isDirty` is true |
| Submitting | `loading` prop on, spinner replaces leading slot, label unchanged | `form.formState.isSubmitting` is true |
| Saved | Leading slot becomes `Check` icon, label briefly "Saved" | 1.5s after a successful submit, per `08-feedback-states.md` |
| Disabled | Muted variant, not interactive | Form is invalid and at least one field has been touched |

The default-to-dirty distinction matters. A form is disabled when there is nothing to save. The moment the user changes any field, the button enables. After the user submits and the save lands, the button shows the "Saved" flash for 1.5s, then returns to its resting label and goes back to disabled because the form is no longer dirty.

`Button` (chapter 01) already implements `loading`. The "Saved" flash is implemented in the form itself by reading `form.formState.isSubmitSuccessful` and `form.formState.submitCount`, holding for 1500ms, then resetting.

```tsx
const showSavedFlash = useSaveFlash(form.formState);

<Button
  type="submit"
  variant="primary"
  loading={form.formState.isSubmitting}
  disabled={!form.formState.isDirty || form.formState.isSubmitting}
>
  {showSavedFlash ? (
    <>
      <Check className="icon-sm" /> Saved
    </>
  ) : (
    "Save changes"
  )}
</Button>
```

For higher-stakes saves (billing changes, role grants, webhook secrets) the form additionally fires a `default` Toast reading "Saved." in line with chapter 08. Routine forms get only the inline flash.

## Confirmation before destructive submit

Forms that perform destructive actions (revoke a worker, delete a webhook endpoint, rotate an API key) gate the submit behind a `ConfirmDialog` from chapter 01. The form's submit button opens the dialog. The dialog's primary action calls `form.handleSubmit(onSubmit)`.

```tsx
const [confirmOpen, setConfirmOpen] = useState(false);

<Button
  variant="danger"
  type="button"
  onClick={() => setConfirmOpen(true)}
  disabled={!form.formState.isDirty}
>
  Revoke worker
</Button>

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title={`Revoke ${worker.name}?`}
  description="They will lose access immediately. Pending jobs stay with them until reassigned."
  confirmLabel="Revoke"
  confirmVariant="danger"
  onConfirm={form.handleSubmit(onSubmit)}
/>
```

For irreversible actions the dialog uses the type-to-confirm variant. The rules for which actions require type-to-confirm are in `08-feedback-states.md`.

## Multi-step forms

A handful of flows are multi-step. The invitation acceptance flow has three steps. The 2FA enrollment dialog has three steps. The webhook endpoint editor has two (URL and event subscriptions).

State is held in component-local `useState`, not Zustand. Each step is its own component with its own zod schema. The `next` button validates only the current step's fields.

```tsx
type Step = 1 | 2 | 3;

export function AcceptInviteFlow({ invite }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Partial<AcceptInviteValues>>({});

  const advance = (next: Step) => (values: Partial<AcceptInviteValues>) => {
    setDraft((d) => ({ ...d, ...values }));
    setStep(next);
  };

  if (step === 1) return <StepIdentity defaults={pickIdentity(draft, invite)} onNext={advance(2)} />;
  if (step === 2) return <StepPassword defaults={pickPassword(draft)} onBack={() => setStep(1)} onNext={advance(3)} />;
  return <StepReview draft={draft as AcceptInviteValues} onBack={() => setStep(2)} onSubmit={() => submitAccept(draft as AcceptInviteValues)} />;
}
```

Each step component uses its own `useForm` and its own `*.schema.ts`. The parent only knows the accumulated `draft` shape. The final step submits to the API; if the server returns per-field errors that map to fields owned by earlier steps, the parent reads the error paths and routes the user back to the offending step.

```tsx
if (env.code === "VALIDATION_FAILED" && env.details?.fields?.length) {
  const firstStep = stepForPath(env.details.fields[0].path);
  setStep(firstStep);
  // The step will pick up the error on mount via the draft + a setError pass.
}
```

The exact wiring of "carry the error from the parent into the step's form" is small and worth getting right once. The shared helper lives at `apps/web/src/lib/forms/multi-step.ts` and accepts the envelope plus a map of path-prefix to step.

## Auto-save vs explicit save

The default is explicit save. CrewMate is not a notes app. Users expect a Save button. Every transactional form (profile, webhook endpoint editor, role grants, job creation) submits on a button click.

The only auto-save surface in v0.1 is the Notification preferences page in `/settings/profile`. Each toggle commits to the server on change, with a debounced batch every 800ms so a user rapidly flipping three switches sends one request, not three.

The auto-save form does not display a Save button. It displays a small `text-small text-muted` line at the bottom of the section reading "Saved <time ago>." On in-flight save the line reads "Saving." On error it switches to `text-[--color-danger]` "Couldn't save. Retrying." and the queue retries up to three times before surfacing a banner.

Anything that affects billing, security, or membership is never auto-save. The user gets a Save button and an explicit confirmation.

## Optimistic UI for form submits

Cross-link `[NEEDS: 15-data-fetching chapter, not yet written]` for the mutation patterns. The short version applies here.

- The form invokes a mutation hook. The optimistic write lives in the hook, not the form.
- On success the cache update is already in place and the form does its post-save flash.
- On error the field errors get populated via `setError`. The form does not roll back the values it shows because the user's input is the source of truth they want to fix.

Which surfaces are optimistic and which are pessimistic is documented per chapter. The form contract is the same either way. The submit handler awaits the mutation, the mutation knows whether to optimistic-update.

## Mobile keyboard handling

Forms get rendered on small screens. The worker mobile shell hits forms at check-in time and during incident reporting. The dispatcher hits forms on a phone during after-hours coverage.

| Concern | Rule |
|---|---|
| `inputMode` | Set per field. `email`, `tel`, `numeric`, `decimal`, `url`, `text`. Never omit on `Input`. |
| `autoComplete` | Set per field using the browser hint vocabulary. `username`, `current-password`, `new-password`, `one-time-code`, `name`, `email`, `tel`, `postal-code`. |
| `enterKeyHint` | Set when the action is not "go." `next`, `done`, `search`, `send`. |
| Focused-input scroll | On iOS the form scrolls the focused input above the keyboard. The helper lives at `apps/web/src/lib/forms/scroll-into-keyboard-view.ts` and runs on `focusin`. |
| Sticky submit on mobile | Long forms anchor the primary `Button` at `position: sticky; bottom: 0` with a `border-top` in `border-line` and `bg-surface`. The sticky bar respects safe-area inset on iOS. |
| Tap targets | Every interactive element is at least 44×44px. Checkboxes and radio dots are visually 18px but the hit area is 44px. |

The `Input` component defaults `autoComplete="off"` if no prop is provided. That default is deliberately permissive: the form author has to set the right value. If they forget, the user's autofill won't work, which is a fixable bug. If we defaulted to `on`, password managers would offer to fill irrelevant fields.

## Accessibility

A recap of the rules from `10-accessibility-and-motion.md` as they apply to forms.

- Every input has a visible `Label`. `FormField` enforces this; passing a child without `label` is a type error.
- Placeholder is never a label. Placeholder is an example value at most.
- Required fields render `aria-required="true"` on the input and a visible asterisk after the label text. The asterisk is `text-[--color-danger]` and has `aria-hidden="true"`.
- Errors link to the input via `aria-describedby` and the input carries `aria-invalid="true"` when an error is set.
- Hints link to the input via `aria-describedby` too. When both a hint and an error apply, `aria-describedby` carries both ids, error first.
- The form announces submit-time errors via an `aria-live="assertive"` region. The banner that renders for form-level errors uses `role="alert"`.
- Field-level error text uses `role="status"` with `aria-live="polite"`, so a screen reader reads it without preempting the user's typing.
- Focus restores to the field that opened any dialog spawned by the form (confirm, file picker fallback).
- Keyboard order matches visual order top to bottom. Skip links are not used inside forms; the form is short enough not to need one.

The form's `<form>` element carries `noValidate`. The browser's built-in validation tooltip is suppressed; our inline errors are the only error UI.

## Anti-patterns

Forms that hit any of these get rejected at review.

- **Form state lives in Zustand or a global store.** Form state is local to a component tree. Zustand is for ephemeral UI like a drawer open flag.
- **Server errors render as toasts only.** A toast is transient. Per-field errors and form-level errors must render in the form itself, in addition to any toast.
- **Submit handler does business logic.** The handler calls the mutation and maps errors. Anything else lives in the mutation hook.
- **Hand-rolled validation.** If a rule can be a zod schema, it is a zod schema. Validation functions outside zod exist only for async uniqueness checks and even then they read like one-liners.
- **Placeholder used as the label.** Always pair an input with a visible `Label`.
- **Disabled inputs during submit.** Inputs go read-only (`readOnly`), not `disabled`. Disabled removes the input from the screen-reader tab order and clears its announced value.
- **A form without `noValidate`.** The native browser validation tooltip is the wrong UI for our error language.
- **Validation on keystroke.** The user is not red-lined while typing. The mode is `onBlur`.
- **`form.reset()` after a server save without re-fetching the data.** Reset restores the defaults that were passed in. After a successful save the new server state is the new default; refetch or update the cache, then reset to the fresh values.
- **A button labeled "Submit."** Buttons get verbs that name the action. "Save changes." "Invite member." "Revoke worker."

## Done checklist

A form is shipped when all of the following are true.

- [ ] Schema lives in a sibling `*.schema.ts`.
- [ ] The component uses `useForm` with `zodResolver(schema)`, `defaultValues`, and `mode: "onBlur"`.
- [ ] Every input is wrapped in `FormField` with a visible `Label`.
- [ ] `aria-invalid`, `aria-describedby`, and `aria-required` are set per field.
- [ ] Submit button uses `loading={form.formState.isSubmitting}` and the dirty / saved / disabled states from this chapter.
- [ ] Server errors flow through `mapServerErrors`. Per-field codes land inline; everything else lands in a form-level banner.
- [ ] 5xx errors do not clear field values.
- [ ] Destructive submits gate behind `ConfirmDialog`, with type-to-confirm when irreversible.
- [ ] Multi-step flows hold state in local `useState` and validate the current step only.
- [ ] Mobile fields set `inputMode`, `autoComplete`, and `enterKeyHint` correctly.
- [ ] The post-save flash respects `prefers-reduced-motion`.
- [ ] At least one component test covers happy path, one field error, and a 5xx banner path.

## Gaps

- `react-hook-form` and `@hookform/resolvers` are not yet pinned in `apps/web/package.json`. `[NEEDS: add react-hook-form and @hookform/resolvers to apps/web dependencies]`.
- `mapServerErrors` and `useSaveFlash` are described here but not yet vendored into `apps/web/src/lib/forms/`. `[NEEDS: ship apps/web/src/lib/forms/ helpers]`.
- The auto-save Notification preferences surface does not yet have a rendered design. `[NEEDS: docs/images/ui/notification-preferences.png]`.
- The exact debounce window for async uniqueness checks (400ms) has not been usability-tested. It may need to shorten for high-latency networks.
- The "carry an error from the multi-step parent into a step's form" helper is sketched but not yet implemented. `[NEEDS: apps/web/src/lib/forms/multi-step.ts]`.
- We do not yet have a documented pattern for forms whose schema depends on a server-fetched config (e.g. custom job-type fields per operator). For v0.1 those forms compose two zod schemas at runtime; v0.2 may move to a contract-driven generator.
