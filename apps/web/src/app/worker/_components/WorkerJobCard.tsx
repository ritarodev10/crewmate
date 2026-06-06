import Link from 'next/link'
import type { Job } from '@web/types/api'

interface WorkerJobCardProps {
  job: Job
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-500' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function WorkerJobCard({ job }: WorkerJobCardProps) {
  const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.SCHEDULED
  const isInProgress = job.status === 'IN_PROGRESS'
  const isCancelled = job.status === 'CANCELLED'

  return (
    <Link
      href={`/worker/jobs/${job.id}`}
      className={`block rounded-xl bg-surface shadow-sm border border-border p-4 transition-opacity${isCancelled ? ' opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        <span className="text-xs text-muted">{formatTime(job.scheduledFor)}</span>
      </div>

      <p className="mt-2 font-semibold text-default leading-tight">
        {job.customer?.name ?? '—'}
      </p>
      <p className="text-sm text-muted truncate">{job.customer?.address ?? '—'}</p>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{job.jobType?.label ?? '—'}</span>
        <span>{job.estimatedHours} hrs</span>
      </div>

      {isInProgress && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.min(job.progressPct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-amber-600 font-medium">{job.progressPct}% complete</p>
        </div>
      )}
    </Link>
  )
}
