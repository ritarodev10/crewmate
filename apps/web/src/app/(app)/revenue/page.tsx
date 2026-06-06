import { cookies } from 'next/headers'
import Link from 'next/link'
import { getServerSession } from '@web/lib/session'
import { RevenueView } from './_components/RevenueView'

export default async function RevenuePage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  const role = session?.role
  const isAllowed = role === 'SUPER_ADMIN' || role === 'MANAGER'

  if (!isAllowed) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-md mt-16 rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-default">Access Denied</h2>
          <p className="mt-2 text-sm text-muted">
            You don&apos;t have permission to view the Revenue screen. This page is
            restricted to Managers and Administrators.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <RevenueView />
    </main>
  )
}
