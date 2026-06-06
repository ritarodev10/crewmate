'use client'

import { MapPin, Clock } from 'lucide-react'
import { cn } from '@web/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@web/components/ui/sheet'
import type { TeamWithStats, WorkerWithStats, LiveStatus } from './types'
import type { Job } from '@web/types/api'

interface TeamDetailDrawerProps {
  teamStats: TeamWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function StatusDot({ status }: { status: LiveStatus }) {
  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        status === 'ON_JOB' && 'bg-[var(--color-amber)]',
        status === 'IDLE' && 'bg-[var(--color-success)]',
        status === 'OFF_DUTY' && 'bg-[var(--color-muted)]'
      )}
    />
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function jobStatusClass(status: Job['status']): string {
  switch (status) {
    case 'COMPLETED': return 'text-[var(--color-success)]'
    case 'IN_PROGRESS': return 'text-[var(--color-amber)]'
    case 'SCHEDULED': return 'text-[var(--color-brand)]'
    case 'CANCELLED': return 'text-[var(--color-danger)]'
  }
}

function jobStatusLabel(status: Job['status']): string {
  switch (status) {
    case 'COMPLETED': return 'Done'
    case 'IN_PROGRESS': return 'Active'
    case 'SCHEDULED': return 'Scheduled'
    case 'CANCELLED': return 'Cancelled'
  }
}

function MemberRow({ ws }: { ws: WorkerWithStats }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
      <div className="relative shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-xs font-bold text-[var(--color-brand)]">
          {getInitials(ws.worker.name)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-default)]">
          {ws.worker.name}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <StatusDot status={ws.liveStatus} />
          <span>
            {ws.liveStatus === 'ON_JOB'
              ? 'On Job'
              : ws.liveStatus === 'IDLE'
                ? 'Idle'
                : 'Off Duty'}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right text-xs text-[var(--color-muted)]">
        <p>{ws.todayJobCount} jobs</p>
        <p>€{ws.todayEarnings}</p>
      </div>
    </div>
  )
}

function TeamJobRow({ job }: { job: Job }) {
  const earnings = Math.round(job.estimatedHours * job.clientRatePerHour)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-default)]">
          {job.jobType?.label ?? '—'}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.customer?.name ?? '—'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(job.scheduledFor)}
          </span>
          <span className="truncate">
            {job.worker?.name ?? '—'}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('text-xs font-semibold', jobStatusClass(job.status))}>
          {jobStatusLabel(job.status)}
        </p>
        <p className="text-xs text-[var(--color-muted)]">€{earnings}</p>
      </div>
    </div>
  )
}

export function TeamDetailDrawer({
  teamStats,
  open,
  onOpenChange,
}: TeamDetailDrawerProps) {
  if (!teamStats) return null

  const { team, memberCount, todayJobCount, todayEarnings, memberStats } = teamStats

  // Collect all today's team jobs (deduplicated by job id)
  const allTeamJobs = memberStats.flatMap((ms) => ms.todayJobs)
  const seenJobIds = new Set<string>()
  const uniqueTeamJobs = allTeamJobs.filter((j) => {
    if (seenJobIds.has(j.id)) return false
    seenJobIds.add(j.id)
    return true
  })
  // Sort by scheduledFor
  uniqueTeamJobs.sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col gap-0 overflow-hidden p-0 bg-[var(--color-surface)]"
      >
        {/* Header */}
        <SheetHeader className="border-b border-[var(--color-line)] px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-base font-bold text-[var(--color-brand)]">
              T
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-[var(--color-default)]">
                {team.name}
              </SheetTitle>
              <SheetDescription className="mt-2 p-0">
                <span className="grid grid-cols-3 divide-x divide-[var(--color-line)] rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]">
                  <span className="flex flex-col items-center py-2">
                    <span className="text-sm font-semibold text-[var(--color-default)]">
                      {memberCount}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">members</span>
                  </span>
                  <span className="flex flex-col items-center py-2">
                    <span className="text-sm font-semibold text-[var(--color-default)]">
                      {todayJobCount}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">jobs today</span>
                  </span>
                  <span className="flex flex-col items-center py-2">
                    <span className="text-sm font-semibold text-[var(--color-default)]">
                      €{todayEarnings}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">earned</span>
                  </span>
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Members */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Members
            </h3>
            <div className="space-y-2">
              {memberStats.map((ws) => (
                <MemberRow key={ws.worker.id} ws={ws} />
              ))}
            </div>
          </section>

          {/* Today's Jobs */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Today&apos;s Jobs
            </h3>
            {uniqueTeamJobs.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No team jobs today.</p>
            ) : (
              <div className="space-y-2">
                {uniqueTeamJobs.map((job) => (
                  <TeamJobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
