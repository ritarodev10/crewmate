import { cookies } from 'next/headers'
import { TopBar } from '@web/components/layout/TopBar'
import { getServerSession } from '@web/lib/session'
import { WORKERS, JOBS, TEAMS } from '@web/data/seed'
import { WorkforceView } from './_components/WorkforceView'
import type { WorkerWithStats, TeamWithStats, LiveStatus } from './_components/types'
import type { Job } from '@web/types/api'

// Team Alfa member ids
const TEAM_ALFA_WORKER_IDS = new Set(['w-01', 'w-02', 'w-03', 'w-04'])

function computeLiveStatus(workerId: string, todayJobs: Job[]): LiveStatus {
  const hasInProgress = todayJobs.some(
    (j) => j.workerId === workerId && j.status === 'IN_PROGRESS'
  )
  if (hasInProgress) return 'ON_JOB'

  const hasScheduled = todayJobs.some(
    (j) => j.workerId === workerId && j.status === 'SCHEDULED'
  )
  if (hasScheduled) return 'IDLE'

  return 'OFF_DUTY'
}

function computeEarnings(workerId: string, jobs: Job[]): number {
  return jobs
    .filter((j) => j.workerId === workerId && j.status === 'COMPLETED')
    .reduce((sum, j) => sum + Math.round(j.estimatedHours * j.clientRatePerHour), 0)
}

export default async function WorkforcePage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)

  const isTeamLead = session?.role === 'TEAM_LEAD'

  // Filter workers by role:
  // TEAM_LEAD → only Team Alfa members (w-01..w-04)
  // MANAGER / SUPER_ADMIN → all workers
  const visibleWorkers = isTeamLead
    ? WORKERS.filter((w) => TEAM_ALFA_WORKER_IDS.has(w.id))
    : WORKERS

  // Today's jobs (all of JOBS are already today's)
  const todayJobs = JOBS

  // Build WorkerWithStats for each visible worker
  const workerStats: WorkerWithStats[] = visibleWorkers.map((worker) => {
    const workerJobs = todayJobs.filter((j) => j.workerId === worker.id)
    const liveStatus = computeLiveStatus(worker.id, workerJobs)
    const todayEarnings = computeEarnings(worker.id, workerJobs)

    return {
      worker,
      liveStatus,
      todayJobs: workerJobs,
      todayJobCount: workerJobs.filter((j) => j.status !== 'CANCELLED').length,
      todayEarnings,
    }
  })

  // Build TeamWithStats
  const teamStats: TeamWithStats[] = TEAMS.map((team) => {
    const teamMemberIds = (team.members ?? []).map((m) => m.workerId)

    // Only include members that are visible to this session
    const visibleMemberStats = workerStats.filter((ws) =>
      teamMemberIds.includes(ws.worker.id)
    )

    const teamJobs = todayJobs.filter(
      (j) => j.teamId === team.id && j.status !== 'CANCELLED'
    )
    const uniqueTeamJobIds = new Set(teamJobs.map((j) => j.id))
    const teamEarnings = Array.from(uniqueTeamJobIds).reduce((sum, jid) => {
      const job = teamJobs.find((j) => j.id === jid)
      if (!job || job.status !== 'COMPLETED') return sum
      return sum + Math.round(job.estimatedHours * job.clientRatePerHour)
    }, 0)

    return {
      team,
      memberCount: teamMemberIds.length,
      todayJobCount: teamJobs.length,
      todayEarnings: teamEarnings,
      memberStats: visibleMemberStats,
    }
  })

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-default)]">Workforce</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Live worker status across all crews
          </p>
        </div>
        <WorkforceView
          workers={workerStats}
          teams={teamStats}
          session={session}
        />
      </main>
    </>
  )
}
