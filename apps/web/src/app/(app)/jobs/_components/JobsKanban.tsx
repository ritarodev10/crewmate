'use client'

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { cn } from '@web/lib/utils'
import { Skeleton } from '@web/components/ui/skeleton'
import { JobCard } from './JobCard'
import { NewJobModal } from './NewJobModal'
import { JobDetailDrawer } from '@web/components/shared/JobDetailDrawer'
import { JobFilterBar, applyJobFilters } from '@web/components/shared/JobFilterBar'
import { useJobs, useWorkers } from '../_hooks/use-jobs'
import type { Job, JobStatus, JobType } from '@web/types/api'
import type { Session } from '@web/lib/session'
import type { JobFilters } from '@web/components/shared/JobFilterBar'

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

interface KanbanColumn {
  status: JobStatus
  label: string
  headerClass: string
  countClass: string
  bodyClass: string
}

const COLUMNS: KanbanColumn[] = [
  {
    status: 'SCHEDULED',
    label: 'Scheduled',
    headerClass: 'border-brand/30 bg-brand/5',
    countClass: 'bg-brand/15 text-brand',
    bodyClass: 'bg-brand/5',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    headerClass: 'border-amber/30 bg-amber/5',
    countClass: 'bg-amber/15 text-amber',
    bodyClass: 'bg-amber/5',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    headerClass: 'border-success/30 bg-success/5',
    countClass: 'bg-success/15 text-success',
    bodyClass: 'bg-success/5',
  },
  {
    status: 'CANCELLED',
    label: 'Cancelled',
    headerClass: 'border-line bg-canvas',
    countClass: 'bg-muted/15 text-muted',
    bodyClass: 'bg-canvas',
  },
]

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function KanbanSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => (
        <div key={col.status} className="flex flex-col min-h-[200px]">
          <div className={cn('rounded-t-xl border-x border-t px-3 py-2.5 flex items-center gap-2', col.headerClass)}>
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-5 w-6 rounded-full ml-auto" />
          </div>
          <div className={cn('flex-1 rounded-b-xl border border-t-0 border-line p-2 space-y-2', col.bodyClass)}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface p-3 space-y-2">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// JobsKanban
// ---------------------------------------------------------------------------

interface JobsKanbanProps {
  session: Session | null
  token: string | undefined
}

export function JobsKanban({ session, token }: JobsKanbanProps) {
  const queryClient = useQueryClient()
  const { data: allJobs, isLoading: jobsLoading } = useJobs()
  const { data: workers = [] } = useWorkers()

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [newJobOpen, setNewJobOpen] = useState(false)
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    statuses: [],
    workerId: null,
    jobTypeId: null,
  })

  const canCreateJob = session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER'

  const visibleJobs = useMemo<Job[]>(() => {
    if (!allJobs || !session) return []
    if (session.role === 'SUPER_ADMIN' || session.role === 'MANAGER') return allJobs
    if (session.role === 'TEAM_LEAD') return allJobs.filter((j) => j.assigneeKind === 'TEAM')
    return []
  }, [allJobs, session])

  const customers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const job of visibleJobs) {
      if (job.customer && !map.has(job.customerId)) {
        map.set(job.customerId, { id: job.customerId, name: job.customer.name })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [visibleJobs])

  const jobTypes = useMemo(() => {
    const map = new Map<string, Pick<JobType, 'id' | 'name' | 'label' | 'estimatedHours'>>()
    for (const job of visibleJobs) {
      if (job.jobType && !map.has(job.jobTypeId)) {
        map.set(job.jobTypeId, {
          id: job.jobType.id,
          name: job.jobType.name,
          label: job.jobType.label,
          estimatedHours: (job.jobType as { estimatedHours?: number }).estimatedHours ?? job.estimatedHours,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [visibleJobs])

  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const job of visibleJobs) {
      if (job.team && job.teamId && !map.has(job.teamId)) {
        map.set(job.teamId, { id: job.team.id, name: job.team.name })
      }
    }
    return Array.from(map.values())
  }, [visibleJobs])

  const filteredJobs = applyJobFilters(visibleJobs, filters)

  function handleJobCreated() {
    setNewJobOpen(false)
    void queryClient.invalidateQueries({ queryKey: ['jobs'] })
  }

  function handleJobCancelled(_jobId: string) {
    setSelectedJobId(null)
    void queryClient.invalidateQueries({ queryKey: ['jobs'] })
  }

  return (
    <>
      {/* Filter bar + new job button row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <JobFilterBar
            filters={filters}
            onChange={setFilters}
            workers={workers}
            jobTypes={jobTypes}
          />
        </div>
        {canCreateJob && (
          <button
            onClick={() => setNewJobOpen(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm',
              'hover:bg-brand/90 transition-colors shrink-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'
            )}
          >
            <Plus className="size-4" />
            New Job
          </button>
        )}
      </div>

      {/* Kanban board */}
      {jobsLoading ? (
        <KanbanSkeleton />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const colJobs = filteredJobs.filter((j) => j.status === col.status)
            return (
              <div key={col.status} className="flex flex-col min-h-[200px]">
                <div
                  className={cn(
                    'rounded-t-xl border-x border-t px-3 py-2.5 flex items-center gap-2',
                    col.headerClass
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-default flex-1">
                    {col.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums leading-none',
                      col.countClass
                    )}
                  >
                    {colJobs.length}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex-1 rounded-b-xl border border-t-0 border-line p-2 space-y-2',
                    col.bodyClass
                  )}
                >
                  {colJobs.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-muted">No jobs</p>
                    </div>
                  ) : (
                    colJobs.map((job) => (
                      <JobCard key={job.id} job={job} onClick={setSelectedJobId} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Job detail drawer */}
      <JobDetailDrawer
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        session={session}
        token={token}
        onJobCancelled={handleJobCancelled}
      />

      {/* New job modal */}
      {canCreateJob && (
        <NewJobModal
          open={newJobOpen}
          onClose={() => setNewJobOpen(false)}
          onSuccess={handleJobCreated}
          customers={customers}
          jobTypes={jobTypes}
          workers={workers}
          teams={teams}
          token={token}
        />
      )}
    </>
  )
}
