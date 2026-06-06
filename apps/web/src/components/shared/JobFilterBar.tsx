'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@web/lib/utils'
import type { Job, JobStatus, Worker } from '@web/types/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobFilters {
  search: string
  statuses: JobStatus[]
  workerId: string | null
  jobTypeId: string | null
}

interface JobFilterBarProps {
  filters: JobFilters
  onChange: (filters: JobFilters) => void
  workers: Worker[]
  jobTypes: Array<{ id: string; label: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_ACTIVE_CLASS: Record<JobStatus, string> = {
  SCHEDULED: 'border-brand bg-brand/10 text-brand',
  IN_PROGRESS: 'border-amber bg-amber/10 text-amber',
  COMPLETED: 'border-success bg-success/10 text-success',
  CANCELLED: 'border-muted bg-muted/10 text-muted',
}

export function applyJobFilters(jobs: Job[], filters: JobFilters): Job[] {
  let result = jobs

  if (filters.statuses.length > 0) {
    result = result.filter((j) => filters.statuses.includes(j.status))
  }

  if (filters.workerId) {
    result = result.filter(
      (j) =>
        j.workerId === filters.workerId ||
        (j.team?.members ?? []).some((m) => m.workerId === filters.workerId)
    )
  }

  if (filters.jobTypeId) {
    result = result.filter((j) => j.jobTypeId === filters.jobTypeId)
  }

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter(
      (j) =>
        j.customer?.name?.toLowerCase().includes(q) ||
        j.customer?.address?.toLowerCase().includes(q) ||
        j.id.toLowerCase().includes(q) ||
        j.jobType?.label?.toLowerCase().includes(q) ||
        j.worker?.name?.toLowerCase().includes(q)
    )
  }

  return result
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobFilterBar({ filters, onChange, workers, jobTypes }: JobFilterBarProps) {
  function toggleStatus(status: JobStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses: next })
  }

  function setWorker(id: string | null) {
    onChange({ ...filters, workerId: id })
  }

  function setJobType(id: string | null) {
    onChange({ ...filters, jobTypeId: id })
  }

  function setSearch(q: string) {
    onChange({ ...filters, search: q })
  }

  function clearAll() {
    onChange({ search: '', statuses: [], workerId: null, jobTypeId: null })
  }

  const hasActiveFilters =
    filters.search.trim() ||
    filters.statuses.length > 0 ||
    filters.workerId ||
    filters.jobTypeId

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Text search */}
      <div className="relative flex-1 min-w-48 max-w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          placeholder="Search jobs…"
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            'w-full rounded-lg border border-line bg-surface pl-8 pr-8 py-1.5 text-sm text-default placeholder:text-muted',
            'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors'
          )}
        />
        {filters.search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-default"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(({ value, label }) => {
          const active = filters.statuses.includes(value)
          return (
            <button
              key={value}
              onClick={() => toggleStatus(value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none transition-colors',
                active
                  ? STATUS_ACTIVE_CLASS[value]
                  : 'border-dashed border-line text-muted hover:border-default/50 hover:text-default'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Worker dropdown */}
      <select
        value={filters.workerId ?? ''}
        onChange={(e) => setWorker(e.target.value || null)}
        className={cn(
          'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-default',
          'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors',
          'cursor-pointer'
        )}
      >
        <option value="">All Workers</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      {/* Job type dropdown */}
      <select
        value={filters.jobTypeId ?? ''}
        onChange={(e) => setJobType(e.target.value || null)}
        className={cn(
          'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-default',
          'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors',
          'cursor-pointer'
        )}
      >
        <option value="">All Job Types</option>
        {jobTypes.map((jt) => (
          <option key={jt.id} value={jt.id}>
            {jt.label}
          </option>
        ))}
      </select>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-default transition-colors"
        >
          <X className="size-3" />
          Clear
        </button>
      )}
    </div>
  )
}
