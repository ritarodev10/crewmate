'use client'

import type { Job } from '@web/types/api'
import { WorkerJobCard } from './WorkerJobCard'

interface WorkerJobListProps {
  jobs: Job[]
}

function sortJobs(jobs: Job[]): Job[] {
  const order: Record<string, number> = {
    IN_PROGRESS: 0,
    SCHEDULED: 1,
    COMPLETED: 2,
    CANCELLED: 3,
  }

  return [...jobs].sort((a, b) => {
    const orderDiff = (order[a.status] ?? 99) - (order[b.status] ?? 99)
    if (orderDiff !== 0) return orderDiff
    // Within SCHEDULED: sort by scheduledFor asc
    if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    }
    return 0
  })
}

export function WorkerJobList({ jobs }: WorkerJobListProps) {
  const sorted = sortJobs(jobs)

  if (sorted.length === 0) {
    return (
      <p className="text-center text-sm text-muted py-8">No jobs assigned today.</p>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map(job => (
        <WorkerJobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
