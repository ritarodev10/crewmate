import { cookies } from 'next/headers'
import { getServerSession } from '@web/lib/session'
import { JOBS, WORKERS } from '@web/data/seed'
import { EarningsCard } from './_components/EarningsCard'
import { WorkerJobList } from './_components/WorkerJobList'
import { LogoutButton } from './_components/LogoutButton'

export default async function WorkerPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)
  const worker = WORKERS.find(w => w.id === session?.workerId) ?? WORKERS[0]

  const workerJobs = JOBS.filter(j => j.workerId === worker.id)

  const completedToday = workerJobs.filter(j => j.status === 'COMPLETED')
  const todayEarnings = completedToday.reduce(
    (sum, j) => sum + j.estimatedHours * worker.hourlyRate,
    0,
  )

  const scheduledCount = workerJobs.filter(j => j.status === 'SCHEDULED').length
  const inProgressCount = workerJobs.filter(j => j.status === 'IN_PROGRESS').length
  const doneCount = completedToday.length

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-canvas flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-sidebar text-white px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">CrewMate</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">{worker.name}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Earnings card */}
      <EarningsCard
        todayEarnings={todayEarnings}
        todayCompleted={doneCount}
        workerHourlyRate={worker.hourlyRate}
      />

      {/* Status bar */}
      <div className="mx-4 flex gap-4 text-xs text-muted">
        <span>Scheduled: <strong className="text-default">{scheduledCount}</strong></span>
        <span>In Progress: <strong className="text-default">{inProgressCount}</strong></span>
        <span>Done: <strong className="text-default">{doneCount}</strong></span>
      </div>

      {/* Section header */}
      <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-muted">
        Today&apos;s Jobs
      </h2>

      {/* Job list */}
      <div className="px-4 pb-4">
        <WorkerJobList jobs={workerJobs} />
      </div>
    </div>
  )
}
