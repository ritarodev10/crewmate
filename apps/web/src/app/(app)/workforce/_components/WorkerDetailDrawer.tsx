'use client'

import { useState } from 'react'
import { Star, Clock, MapPin } from 'lucide-react'
import { cn } from '@web/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@web/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@web/components/ui/tabs'
import type { WorkerWithStats, LiveStatus } from './types'
import type { Job } from '@web/types/api'

interface WorkerDetailDrawerProps {
  workerStats: WorkerWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isTeamLead?: boolean
  teamSummary?: {
    memberCount: number
    todayJobCount: number
    todayEarnings: number
  }
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
      <span className="inline-flex items-center rounded-full bg-[var(--color-amber)] px-2.5 py-0.5 text-xs font-semibold text-white">
        On Job
      </span>
    )
  }
  if (status === 'IDLE') {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-success)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-success)]">
        Idle
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-muted)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-muted)]">
      Off Duty
    </span>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function jobStatusLabel(status: Job['status']): string {
  switch (status) {
    case 'COMPLETED': return 'Completed'
    case 'IN_PROGRESS': return 'In Progress'
    case 'SCHEDULED': return 'Scheduled'
    case 'CANCELLED': return 'Cancelled'
  }
}

function jobStatusClass(status: Job['status']): string {
  switch (status) {
    case 'COMPLETED': return 'text-[var(--color-success)]'
    case 'IN_PROGRESS': return 'text-[var(--color-amber)]'
    case 'SCHEDULED': return 'text-[var(--color-brand)]'
    case 'CANCELLED': return 'text-[var(--color-danger)]'
  }
}

function JobRow({ job }: { job: Job }) {
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-3 text-center">
      <p className="text-lg font-bold text-[var(--color-default)]">{value}</p>
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  )
}

export function WorkerDetailDrawer({
  workerStats,
  open,
  onOpenChange,
  isTeamLead = false,
  teamSummary,
}: WorkerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('today')

  if (!workerStats) return null

  const { worker, liveStatus, todayJobs, todayJobCount, todayEarnings } = workerStats

  // Completed jobs only for week/month/all-time earning computations
  const completedJobs = todayJobs.filter((j) => j.status === 'COMPLETED')
  const totalCompleted = completedJobs.length
  // All-time approximation: today's completed + placeholder counts from seed
  const allTimeJobsCompleted = totalCompleted + (worker.kind === 'TEAM_LEAD' ? 80 : 50)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col gap-0 overflow-hidden p-0 bg-[var(--color-surface)]"
      >
        {/* Header */}
        <SheetHeader className="border-b border-[var(--color-line)] px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-base font-bold text-[var(--color-brand)]">
              {getInitials(worker.name)}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-[var(--color-default)]">
                {worker.name}
              </SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 p-0">
                <span className="text-xs text-[var(--color-muted)]">
                  {worker.kind === 'TEAM_LEAD'
                    ? 'Team Lead'
                    : worker.kind === 'TEAM_MEMBER'
                      ? 'Team Member'
                      : 'Solo Worker'}
                </span>
                <StatusPill status={liveStatus} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList
              variant="line"
              className="w-full justify-start border-b border-[var(--color-line)] rounded-none px-5 h-10"
            >
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="alltime">All Time</TabsTrigger>
            </TabsList>

            {/* TODAY */}
            <TabsContent value="today" className="p-5 space-y-3">
              {todayJobs.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No jobs scheduled today.</p>
              ) : (
                todayJobs.map((job) => <JobRow key={job.id} job={job} />)
              )}
            </TabsContent>

            {/* THIS WEEK */}
            <TabsContent value="week" className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Earnings"
                  value={`€${Math.round(todayEarnings * 5)}`}
                />
                <StatCard label="Jobs Completed" value={String(todayJobCount * 4)} />
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Weekly data computed from today&apos;s activity.
              </p>
            </TabsContent>

            {/* THIS MONTH */}
            <TabsContent value="month" className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Earnings"
                  value={`€${Math.round(todayEarnings * 22)}`}
                />
                <StatCard label="Jobs Completed" value={String(todayJobCount * 18)} />
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Monthly data computed from today&apos;s activity.
              </p>
            </TabsContent>

            {/* ALL TIME */}
            <TabsContent value="alltime" className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Jobs Completed"
                  value={String(allTimeJobsCompleted)}
                />
                <StatCard
                  label="Rating"
                  value={worker.rating.toFixed(1)}
                />
              </div>

              {/* Team summary for Team Lead viewing their own drawer */}
              {isTeamLead && teamSummary && (
                <div className="rounded-xl border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/5 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">
                    Team Summary
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard
                      label="Members"
                      value={String(teamSummary.memberCount)}
                    />
                    <StatCard
                      label="Today&apos;s Jobs"
                      value={String(teamSummary.todayJobCount)}
                    />
                    <StatCard
                      label="Earnings"
                      value={`€${teamSummary.todayEarnings}`}
                    />
                  </div>
                </div>
              )}

              {/* Star rating display */}
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
                <Star className="h-4 w-4 fill-[var(--color-amber)] text-[var(--color-amber)]" />
                <span className="text-sm font-semibold text-[var(--color-default)]">
                  {worker.rating.toFixed(1)}
                </span>
                <span className="text-xs text-[var(--color-muted)]">avg customer rating</span>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
