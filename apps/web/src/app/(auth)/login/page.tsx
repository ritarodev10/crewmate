'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginAction } from './actions';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-screen">
      {/* Left panel — navy brand panel, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[40%] bg-brand flex-col justify-between p-space-16">
        <div>
          <span className="text-h2 text-on-brand font-semibold">CrewMate</span>
        </div>
        <div>
          <p className="text-display text-on-brand font-bold leading-tight">
            Coordinate your crew.
          </p>
          <p className="mt-space-4 text-body text-white/60">
            Field service operations — dispatching, scheduling, and tracking — in one place.
          </p>
        </div>
        <p className="text-small text-white/40">
          Phase 2 preview — sample data only
        </p>
      </div>

      {/* Right panel — sign-in card */}
      <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-space-6 py-space-16">
        <div className="w-full max-w-sm">
          <div className="mb-space-8">
            <h1 className="text-h1 text-default font-bold">Sign in</h1>
            <p className="mt-space-2 text-small text-muted">
              Use a demo account to explore CrewMate.
            </p>
          </div>

          {serverError !== null && (
            <div className="mb-space-4 rounded-md border border-danger bg-danger-fade px-space-4 py-space-3">
              <p className="text-small text-danger">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-5">
            <div>
              <label htmlFor="email" className="block text-body-strong text-default mb-space-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@brookline.demo"
                className="w-full rounded-md border border-line bg-surface px-space-3 py-space-3 text-body text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-space-1 text-small text-danger">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-body-strong text-default mb-space-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Any password works in demo"
                className="w-full rounded-md border border-line bg-surface px-space-3 py-space-3 text-body text-default placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-space-1 text-small text-danger">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-brand px-space-4 py-space-3 text-body-strong text-on-brand transition-colors hover:bg-brand-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-space-8 rounded-md border border-line bg-surface p-space-4">
            <p className="text-micro text-muted uppercase tracking-[0.05em] mb-space-3">Demo accounts</p>
            <ul className="space-y-space-2">
              <li className="text-small text-muted">
                <span className="font-mono text-mono text-default">admin@brookline.demo</span>
                {' '}— Admin
              </li>
              <li className="text-small text-muted">
                <span className="font-mono text-mono text-default">coordinator1@brookline.demo</span>
                {' '}— Coordinator
              </li>
              <li className="text-small text-muted">
                <span className="font-mono text-mono text-default">worker@brookline.demo</span>
                {' '}— Worker
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
