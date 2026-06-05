'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Building2, CalendarClock, Eye, EyeOff, Loader2, MapPin } from 'lucide-react'
import { Button } from '@web/components/ui/button'
import { Input } from '@web/components/ui/input'
import { cn } from '@web/lib/utils'
import { loginAction } from './actions'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

const DEMO_ACTORS = [
  { name: 'Admin System', role: 'SUPER_ADMIN', email: 'admin@crewmate.demo' },
  { name: 'Marco Bianchi', role: 'MANAGER', email: 'marco.b@crewmate.demo' },
  { name: 'Luca Ferrari', role: 'TEAM_LEAD', email: 'luca.f@crewmate.demo' },
  { name: 'Sofia Conti', role: 'WORKER', email: 'sofia.c@crewmate.demo' },
  { name: 'Antonio Ricci', role: 'WORKER', email: 'antonio.r@crewmate.demo' },
] as const

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginValues) {
    setServerError(null)
    const result = await loginAction(values.email, values.password)
    if (result?.error) {
      setServerError(result.error)
    }
    // On success, loginAction calls redirect() internally — no return value
  }

  function handleDemoLogin(email: string) {
    setValue('email', email)
    setValue('password', 'demo1234')
    handleSubmit(onSubmit)()
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile brand strip */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-brand md:hidden" />

      {/* Left brand panel */}
      <div className="hidden md:flex md:w-1/2 bg-brand flex-col justify-between p-12">
        {/* Top: wordmark */}
        <div>
          <span className="text-2xl font-bold text-white">CrewMate</span>
        </div>

        {/* Middle: headline + sub-copy */}
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight max-w-sm">
            Coordinate field work without the chaos.
          </h2>
          <p className="text-white/80 text-sm mt-4 max-w-xs">
            Dispatch jobs, track workers in real time, and keep every team on the same page — from the office or the field.
          </p>
        </div>

        {/* Bottom: customer wordmarks */}
        <div className="flex gap-6 text-white/50 text-sm">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            Brookline
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            Northwind
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            Harborline
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 py-12 md:px-16 bg-canvas">
        <div className="w-full max-w-sm mx-auto">
          {/* Error banner */}
          {serverError !== null && (
            <div
              role="alert"
              className="bg-danger-fade border border-danger rounded-lg px-4 py-3 flex items-center gap-2 mb-4"
            >
              <AlertCircle className="size-4 text-danger shrink-0" />
              <p className="text-sm text-default">{serverError}</p>
            </div>
          )}

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-default">Sign in to your account</h1>
          <p className="text-sm text-muted mt-1 mb-6">
            Welcome back. Enter your email and password to continue.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-default">
                Work email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="you@company.com"
                readOnly={isSubmitting}
                className={cn(
                  serverError && !errors.email ? 'border-danger' : ''
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-default">
                  Password
                </label>
                <a
                  href="/auth/reset"
                  className="text-xs text-brand underline underline-offset-2 hover:text-brand-hover"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  readOnly={isSubmitting}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-default transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-brand text-white hover:bg-brand-hover active:scale-[0.96] transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in&hellip;
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Google button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2"
          >
            {/* Google "G" SVG */}
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Demo shortcuts */}
          <div className="mt-6">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">Demo logins</p>
            <div className="flex gap-2 flex-wrap">
              {DEMO_ACTORS.map((actor) => (
                <button
                  key={actor.email}
                  type="button"
                  onClick={() => handleDemoLogin(actor.email)}
                  className={cn(
                    'inline-flex flex-col items-start gap-0.5 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors',
                    'hover:bg-canvas hover:border-brand/40 active:scale-[0.96] active:transition-transform',
                    'text-xs text-default font-medium'
                  )}
                >
                  <span>{actor.name}</span>
                  <span className="text-xs text-muted font-normal">{actor.role.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted mt-6">
            Not on CrewMate yet?{' '}
            <a
              href="/auth/contact-operator"
              className="text-brand underline underline-offset-2 hover:text-brand-hover"
            >
              Talk to your operator.
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
