'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@web/lib/utils'
import { JobCard } from './JobCard'
import { NewJobModal } from './NewJobModal'
import { JobDetailDrawer } from '@web/components/shared/JobDetailDrawer'
import { JobFilterBar, applyJobFilters } from '@web/components/shared/JobFilterBar'
import { WORKERS, JOB_TYPES } from '@web/data/seed'
import type { Job, JobStatus } from '@web/types/api'
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
// JobsKanban
// ---------------------------------------------------------------------------

interface JobsKanbanProps {
  jobs: Job[]
  session: Session | null
}

export function JobsKanban({ jobs, session }: JobsKanbanProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [newJobOpen, setNewJobOpen] = useState(false)
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    statuses: [],
    workerId: null,
    jobTypeId: null,
  })

  const canCreateJob =
    session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER'

  const filteredJobs = applyJobFilters(jobs, filters)

  // Build a unique list of workers that appear in these jobs
  const jobWorkers = WORKERS.filter((w) =>
    jobs.some(
      (j) =>
        j.workerId === w.id ||
        (j.team?.members ?? []).some((m) => m.workerId === w.id)
    )
  )

  return (
    <>
      {/* Filter bar + new job button row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <JobFilterBar
            filters={filters}
            onChange={setFilters}
            workers={jobWorkers}
            jobTypes={JOB_TYPES}
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
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colJobs = filteredJobs.filter((j) => j.status === col.status)
          return (
            <div key={col.status} className="flex flex-col min-h-[200px]">
              {/* Column header */}
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

              {/* Column body */}
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
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={setSelectedJobId}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Job detail drawer */}
      <JobDetailDrawer
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        session={session}
      />

      {/* New job modal */}
      {canCreateJob && (
        <NewJobModal
          open={newJobOpen}
          onClose={() => setNewJobOpen(false)}
        />
      )}
    </>
  )
}
