import { cookies } from 'next/headers'
import { getServerSession } from '@web/lib/session'
import { TopBar } from '@web/components/layout/TopBar'
import { JobsKanban } from './_components/JobsKanban'
import { JOBS } from '@web/data/seed'

export default async function JobsPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  // RBAC filter:
  // SUPER_ADMIN / MANAGER → all 40 jobs
  // TEAM_LEAD → only jobs where assigneeKind === 'TEAM'
  // WORKER → never reaches this route (middleware redirects to /worker)
  const visibleJobs = (() => {
    if (!session) return []
    if (session.role === 'SUPER_ADMIN' || session.role === 'MANAGER') {
      return JOBS
    }
    if (session.role === 'TEAM_LEAD') {
      return JOBS.filter((j) => j.assigneeKind === 'TEAM')
    }
    return []
  })()

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="border-b border-line bg-canvas px-6 py-4">
          <h2 className="text-lg font-semibold text-default leading-tight">Jobs</h2>
          <p className="text-xs text-muted mt-0.5">Today&apos;s dispatch board</p>
        </div>

        {/* Kanban (client-side interactive) */}
        <div className="p-6">
          <JobsKanban jobs={visibleJobs} session={session} />
        </div>
      </main>
    </>
  )
}
