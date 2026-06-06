'use client'

import { Star } from 'lucide-react'
import { cn } from '@web/lib/utils'
import type { WorkerWithStats, LiveStatus } from './types'

interface WorkerCardProps {
  workerStats: WorkerWithStats
  onClick: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function StatusPill({ status }: { status: LiveStatus }) {
  if (status === 'ON_JOB') {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-amber)] px-2 py-0.5 text-[10px] font-semibold text-white">
        On Job
      </span>
    )
  }
  if (status === 'IDLE') {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
        Idle
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-muted)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted)]">
      Off Duty
    </span>
  )
}

function RoleBadge({ kind }: { kind: string }) {
  const label =
    kind === 'TEAM_LEAD'
      ? 'Team Lead'
      : kind === 'TEAM_MEMBER'
        ? 'Team Member'
        : 'Solo'

  return (
    <span className="inline-flex items-center rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
      {label}
    </span>
  )
}

export function WorkerCard({ workerStats, onClick }: WorkerCardProps) {
  const { worker, liveStatus, todayJobCount, todayEarnings } = workerStats

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left transition-all',
        'hover:border-[var(--color-brand)]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/50'
      )}
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-sm font-bold text-[var(--color-brand)]">
            {getInitials(worker.name)}
          </div>
          {/* Status dot */}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)]',
              liveStatus === 'ON_JOB' && 'bg-[var(--color-amber)]',
              liveStatus === 'IDLE' && 'bg-[var(--color-success)]',
              liveStatus === 'OFF_DUTY' && 'bg-[var(--color-muted)]'
            )}
          />
        </div>

        {/* Name + role + status */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--color-default)]">
              {worker.name}
            </p>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <RoleBadge kind={worker.kind} />
            <StatusPill status={liveStatus} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--color-line)] rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]">
        <div className="flex flex-col items-center py-2">
          <span className="text-xs font-semibold text-[var(--color-default)]">
            {todayJobCount}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">jobs today</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="text-xs font-semibold text-[var(--color-default)]">
            €{todayEarnings}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">earned</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="flex items-center gap-0.5 text-xs font-semibold text-[var(--color-default)]">
            <Star className="h-3 w-3 fill-[var(--color-amber)] text-[var(--color-amber)]" />
            {worker.rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">rating</span>
        </div>
      </div>
    </button>
  )
}
