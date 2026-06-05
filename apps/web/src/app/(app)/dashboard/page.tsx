import { cookies } from 'next/headers'
import type { Session } from '@web/lib/session'
import { SESSION_COOKIE, DEMO_ACTOR_COOKIE } from '@web/lib/session'
import { TopBar } from '@web/components/layout/TopBar'
import { KpiCards } from '@web/components/dashboard/KpiCards'
import { ActivityFeed } from '@web/components/dashboard/ActivityFeed'
import { DASHBOARD_SUMMARY, ACTIVITY_FEED, JOBS } from '@web/data/seed'
import { JobMapClient } from './_components/JobMapClient'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const demoActorRaw = cookieStore.get(DEMO_ACTOR_COOKIE)?.value
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  let session: Session | null = null
  try {
    if (demoActorRaw) session = JSON.parse(demoActorRaw) as Session
    else if (sessionRaw) session = JSON.parse(sessionRaw) as Session
  } catch { session = null }

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0">
        {/* Left panel — ~40% */}
        <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col overflow-y-auto border-r border-line shrink-0">
          <div className="p-6 space-y-6">
            <KpiCards summary={DASHBOARD_SUMMARY} session={session} />
          </div>
          <div className="flex-1 px-6 pb-6">
            <ActivityFeed events={ACTIVITY_FEED} />
          </div>
        </div>
        {/* Right panel — ~60%, map fills it */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <JobMapClient jobs={JOBS} session={session} />
        </div>
      </main>
    </>
  )
}
