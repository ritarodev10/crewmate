'use client'

import { User, Users } from 'lucide-react'
import { cn } from '@web/lib/utils'
import type { Job } from '@web/types/api'

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-brand',
  IN_PROGRESS: 'bg-amber',
  COMPLETED: 'bg-success',
  CANCELLED: 'bg-muted',
}

const JOB_TYPE_PILL: Record<string, string> = {
  HVAC_REPAIR: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  HVAC_MAINTENANCE: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  AC_INSTALLATION: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  ELECTRICAL_PANEL: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  PIPE_REPAIR: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  DRAIN_CLEANING: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  LIGHTING_INSTALL: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  GENERATOR_REPAIR: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
}

// ---------------------------------------------------------------------------
// Progress ring (SVG) — shown for IN_PROGRESS cards
// ---------------------------------------------------------------------------

interface ProgressRingProps {
  pct: number
  size?: number
}

function ProgressRing({ pct, size = 28 }: ProgressRingProps) {
  const r = (size - 4) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Progress ${pct}%`}
      className="shrink-0"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={3}
        className="stroke-line"
      />
      {/* Fill */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-amber transition-all duration-300"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-amber"
        style={{ fontSize: size * 0.28, fontWeight: 700, fontFamily: 'inherit' }}
      >
        {pct}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// JobCard
// ---------------------------------------------------------------------------

interface JobCardProps {
  job: Job
  onClick: (jobId: string) => void
}

export function JobCard({ job, onClick }: JobCardProps) {
  const scheduledTime = new Date(job.scheduledFor).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const jobTypeName = job.jobType?.name ?? ''
  const pillClass = JOB_TYPE_PILL[jobTypeName] ?? 'bg-surface text-muted border-line'

  const isTeam = job.assigneeKind === 'TEAM'
  const isInProgress = job.status === 'IN_PROGRESS'

  return (
    <button
      onClick={() => onClick(job.id)}
      className={cn(
        'w-full text-left rounded-xl border border-line bg-surface p-3 space-y-2.5',
        'hover:border-brand/40 hover:shadow-sm transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'
      )}
    >
      {/* Row 1: status dot + customer name + progress ring */}
      <div className="flex items-start gap-2">
        <span
          className={cn('mt-1 size-2 rounded-full shrink-0', STATUS_DOT[job.status] ?? 'bg-muted')}
        />
        <p className="flex-1 min-w-0 text-sm font-semibold text-default leading-snug truncate">
          {job.customer?.name ?? '—'}
        </p>
        {isInProgress && <ProgressRing pct={job.progressPct} />}
      </div>

      {/* Row 2: address */}
      <p className="text-xs text-muted truncate pl-4 leading-none">
        {job.customer?.address ?? '—'}
      </p>

      {/* Row 3: job type pill + time */}
      <div className="flex items-center gap-2 pl-4">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none shrink-0',
            pillClass
          )}
        >
          {job.jobType?.label ?? 'Unknown'}
        </span>
        <span className="ml-auto text-[11px] text-muted font-mono shrink-0">{scheduledTime}</span>
      </div>

      {/* Row 4: assignee */}
      <div className="flex items-center gap-1.5 pl-4">
        {isTeam ? (
          <>
            <Users className="size-3.5 text-muted shrink-0" />
            <span className="inline-flex items-center rounded-full bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 text-[10px] font-semibold leading-none">
              {job.team?.name ?? 'Team'}
            </span>
          </>
        ) : job.worker ? (
          <>
            {job.worker.avatarUrl ? (
              <img
                src={job.worker.avatarUrl}
                alt={job.worker.name}
                className="size-4 rounded-full object-cover ring-1 ring-black/10 shrink-0"
              />
            ) : (
              <div className="size-4 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <User className="size-2.5 text-brand" />
              </div>
            )}
            <span className="text-[11px] text-default font-medium truncate">
              {job.worker.name}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted">Unassigned</span>
        )}
      </div>
    </button>
  )
}
