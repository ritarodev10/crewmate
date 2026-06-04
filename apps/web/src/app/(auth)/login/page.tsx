'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Building2, CalendarClock, MapPin, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import { loginAction } from './actions';

/* ── Schema ─────────────────────────────────────────────────────────────── */

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ── Google mark (inline SVG — the only third-party brand mark) ──────── */

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ── Customer wordmarks (outlined style, decorative) ─────────────────── */

function CustomerWordmarks() {
  return (
    <div className="flex items-center gap-space-8">
      <div className="flex items-center gap-space-2 text-white/50">
        <Building2 size={18} strokeWidth={1.75} />
        <span className="text-small">Brookline</span>
      </div>
      <div className="flex items-center gap-space-2 text-white/50">
        <MapPin size={18} strokeWidth={1.75} />
        <span className="text-small">Northwind</span>
      </div>
      <div className="flex items-center gap-space-2 text-white/50">
        <CalendarClock size={18} strokeWidth={1.75} />
        <span className="text-small">Harborline</span>
      </div>
    </div>
  );
}

/* ── Spinner (14px, matches button loading convention) ───────────────── */

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const result = await loginAction(values.email, values.password);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  const hasError = serverError !== null;

  return (
    <div className="flex min-h-dvh">
      {/* ── Left panel: brand ────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 bg-brand flex-col justify-between p-space-16">
        {/* Top: wordmark */}
        <div>
          <span className="text-h3 font-semibold text-on-brand">
            CrewMate
          </span>
        </div>

        {/* Middle: editorial headline + sub-copy */}
        <div>
          <h2
            className="text-display font-bold text-on-brand text-balance"
            style={{ lineHeight: '1.15' }}
          >
            Coordinate field work without the chaos.
          </h2>
          <p className="mt-space-4 text-body text-on-brand/80 max-w-xs text-pretty">
            Dispatch, track, and reconcile jobs across properties and crews in real time.
          </p>
        </div>

        {/* Bottom: customer wordmarks */}
        <CustomerWordmarks />
      </div>

      {/* ── Mobile brand strip (below md) ────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-1.5 bg-brand" />

      {/* ── Right panel: sign-in form ────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-space-6 py-space-16">
        <div className="w-full max-w-[400px]">
          {/* Error banner — form-level, above heading */}
          {hasError && (
            <div
              role="alert"
              className="mb-space-6 flex items-start gap-space-3 rounded-lg border border-danger bg-danger-fade px-space-4 py-space-3"
            >
              <AlertCircle
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-danger"
              />
              <p className="text-small text-default">{serverError}</p>
            </div>
          )}

          {/* Heading row */}
          <div className="mb-space-6">
            <h1 className="text-h2 font-semibold text-default text-balance">
              Sign in to your account
            </h1>
            <p className="mt-space-2 text-body text-muted text-pretty">
              Welcome back. Enter your email and password to continue.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-busy={isSubmitting}
            className="space-y-space-5"
          >
            {/* Email field */}
            <div>
              <Label htmlFor="email" className="mb-space-2 block">
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="you@company.com"
                readOnly={isSubmitting}
                aria-invalid={!!errors.email || hasError}
                className={cn(
                  hasError && !errors.email && 'border-danger',
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-space-1 text-small text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-baseline justify-between mb-space-2">
                <Label htmlFor="password">Password</Label>
                <a
                  href="/auth/reset"
                  className="text-small text-brand hover:underline"
                  tabIndex={0}
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  readOnly={isSubmitting}
                  aria-invalid={!!errors.password || hasError}
                  className={cn(
                    'pr-space-10',
                    hasError && !errors.password && 'border-danger',
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-space-3 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.75} />
                  ) : (
                    <Eye size={16} strokeWidth={1.75} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-space-1 text-small text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Primary action */}
            <Button
              variant="default"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          {/* Divider with "or" label */}
          <div className="my-space-6 flex items-center gap-space-4">
            <div className="h-px flex-1 bg-line" />
            <span className="text-small text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {/* Secondary action: Google */}
          <Button
            variant="outline"
            size="lg"
            type="button"
            className="w-full"
          >
            <GoogleMark className="size-icon-md" />
            Continue with Google
          </Button>

          {/* Bottom helper text */}
          <p className="mt-space-6 text-small text-muted">
            Not on CrewMate yet?{' '}
            <a
              href="/auth/contact-operator"
              className="text-brand underline underline-offset-2"
            >
              Talk to your operator
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
