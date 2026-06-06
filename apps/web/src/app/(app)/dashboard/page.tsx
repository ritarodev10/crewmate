import { cookies } from 'next/headers'
import { getServerSession, SESSION_COOKIE } from '@web/lib/session'
import { apiFetch } from '@web/lib/api'
import { TopBar } from '@web/components/layout/TopBar'
import { KpiCards } from '@web/components/dashboard/KpiCards'
import { ActivityFeed } from '@web/components/dashboard/ActivityFeed'
import { JobMapClient } from './_components/JobMapClient'
import type { DashboardSummaryData, ActivityEvent, Job } from '@web/types/api'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore) // may be demo actor (no accessToken)

  // Get the real auth token — demo actors share the logged-in user's token
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  const mainSession = sessionRaw ? (JSON.parse(sessionRaw) as { accessToken?: string }) : null
  const token: string | undefined = session?.accessToken ?? mainSession?.accessToken

  // Fetch all dashboard data in parallel; graceful fallback if unauthenticated
  const [summaryRes, activityRes, jobsRes] = await Promise.all([
    token
      ? apiFetch<{ data: DashboardSummaryData }>('/dashboard/summary', { token }).catch(() => null)
      : Promise.resolve(null),
    token
      ? apiFetch<{ data: ActivityEvent[] }>('/dashboard/activity', { token }).catch(() => null)
      : Promise.resolve(null),
    token
      ? apiFetch<{ data: Job[] }>('/jobs', { token }).catch(() => null)
      : Promise.resolve(null),
  ])

  const summary = summaryRes?.data ?? null
  const activity = activityRes?.data ?? []
  const jobs = jobsRes?.data ?? []

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0">
        {/* Left panel — ~40% */}
        <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col overflow-y-auto border-r border-line shrink-0">
          <div className="p-6 space-y-6">
            <KpiCards summary={summary} session={session} />
          </div>
          <div className="flex-1 px-6 pb-6">
            <ActivityFeed events={activity} />
          </div>
        </div>
        {/* Right panel — ~60%, map fills it */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <JobMapClient jobs={jobs} session={session} />
        </div>
      </main>
    </>
  )
}
