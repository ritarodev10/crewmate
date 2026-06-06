import { cookies } from 'next/headers'
import { getServerSession, SESSION_COOKIE } from '@web/lib/session'
import { apiFetch } from '@web/lib/api'
import { TopBar } from '@web/components/layout/TopBar'
import { JobsKanban } from './_components/JobsKanban'
import type { Job, Worker, JobType } from '@web/types/api'

export default async function JobsPage() {
  const cookieStore = await cookies()
  const session = getServerSession(cookieStore)
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  const mainSession = sessionRaw
    ? (JSON.parse(sessionRaw) as { accessToken?: string })
    : null
  const token: string | undefined = session?.accessToken ?? mainSession?.accessToken

  const [jobsRes, workersRes] = await Promise.all([
    token
      ? apiFetch<{ data: Job[] }>('/jobs', { token }).catch(() => null)
      : Promise.resolve(null),
    token
      ? apiFetch<{ data: Worker[] }>('/workers', { token }).catch(() => null)
      : Promise.resolve(null),
  ])

  const allJobs: Job[] = jobsRes?.data ?? []
  const workers: Worker[] = workersRes?.data ?? []

  // RBAC filter (server-side)
  const visibleJobs = (() => {
    if (!session) return []
    if (session.role === 'SUPER_ADMIN' || session.role === 'MANAGER') return allJobs
    if (session.role === 'TEAM_LEAD') return allJobs.filter((j) => j.assigneeKind === 'TEAM')
    return []
  })()

  // Derive unique customers from jobs
  const customersMap = new Map<string, { id: string; name: string }>()
  for (const job of visibleJobs) {
    if (job.customer && !customersMap.has(job.customerId)) {
      customersMap.set(job.customerId, { id: job.customerId, name: job.customer.name })
    }
  }
  const customers = Array.from(customersMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  // Derive unique jobTypes from jobs (jobType.estimatedHours is now included after backend fix)
  const jobTypesMap = new Map<string, Pick<JobType, 'id' | 'name' | 'label' | 'estimatedHours'>>()
  for (const job of visibleJobs) {
    if (job.jobType && !jobTypesMap.has(job.jobTypeId)) {
      jobTypesMap.set(job.jobTypeId, {
        id: job.jobType.id,
        name: job.jobType.name,
        label: job.jobType.label,
        estimatedHours: (job.jobType as { estimatedHours?: number }).estimatedHours ?? job.estimatedHours,
      })
    }
  }
  const jobTypes = Array.from(jobTypesMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )

  // Derive unique teams from jobs
  const teamsMap = new Map<string, { id: string; name: string }>()
  for (const job of visibleJobs) {
    if (job.team && job.teamId && !teamsMap.has(job.teamId)) {
      teamsMap.set(job.teamId, { id: job.team.id, name: job.team.name })
    }
  }
  const teams = Array.from(teamsMap.values())

  return (
    <>
      <TopBar session={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-line bg-canvas px-6 py-4">
          <h2 className="text-lg font-semibold text-default leading-tight">Jobs</h2>
          <p className="text-xs text-muted mt-0.5">Today&apos;s dispatch board</p>
        </div>
        <div className="p-6">
          <JobsKanban
            jobs={visibleJobs}
            workers={workers}
            customers={customers}
            jobTypes={jobTypes}
            teams={teams}
            session={session}
            token={token}
          />
        </div>
      </main>
    </>
  )
}
