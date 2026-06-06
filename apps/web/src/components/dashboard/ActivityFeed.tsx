'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'
import { cn } from '@web/lib/utils'
import type { ActivityEvent } from '@web/types/api'

interface ActivityFeedProps {
  events: ActivityEvent[]
}

function getEventBadge(item: ActivityEvent): {
  label: string
  className: string
} {
  if (item.toStatus === 'COMPLETED') {
    return { label: 'completed job', className: 'bg-success/10 text-success border border-success/20' }
  }
  if (item.toStatus === 'IN_PROGRESS' && item.fromStatus === 'SCHEDULED') {
    return { label: 'started job', className: 'bg-brand/10 text-brand border border-brand/20' }
  }
  if (item.toStatus === 'CANCELLED') {
    return { label: 'job cancelled', className: 'bg-muted/20 text-muted border border-line' }
  }
  if (item.note !== null) {
    return { label: 'progress updated', className: 'bg-amber/10 text-amber border border-amber/20' }
  }
  return { label: item.toStatus.toLowerCase().replace('_', ' '), className: 'bg-muted/10 text-muted border border-line' }
}

function WorkerAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // Deterministic color based on name
  const colors = [
    'bg-brand/20 text-brand',
    'bg-success/20 text-success',
    'bg-amber/20 text-amber',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
  ]
  const idx = name.charCodeAt(0) % colors.length

  return (
    <div
      className={cn(
        'size-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0',
        colors[idx]
      )}
    >
      {initials}
    </div>
  )
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="size-10 rounded-full bg-surface border border-line flex items-center justify-center">
          <Activity className="size-5 text-muted" />
        </div>
        <div>
          <p className="text-sm font-medium text-default">No activity yet today.</p>
          <p className="text-xs text-muted mt-0.5">
            Job status updates will appear here in real time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-default flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-success animate-pulse inline-block" />
          Live Activity
        </h2>
        <Link
          href="/jobs"
          className="text-xs text-brand hover:text-brand-hover font-medium transition-colors"
          prefetch
        >
          View all →
        </Link>
      </div>

      {/* Feed list */}
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {events.map((item) => {
          const badge = getEventBadge(item)
          const relTime = formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })
          const workerDisplayName = item.workerName ?? 'Unknown'

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface/60 transition-colors group"
            >
              <WorkerAvatar name={workerDisplayName} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-default leading-none">
                    {workerDisplayName}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none',
                      badge.className
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-muted font-mono">#{item.jobId}</span>
                  <span className="text-[11px] text-muted">·</span>
                  <span className="text-[11px] text-muted">{item.jobTypeLabel}</span>
                </div>
              </div>

              <time
                dateTime={item.occurredAt}
                title={new Date(item.occurredAt).toISOString()}
                className="text-[11px] text-muted shrink-0 leading-none mt-0.5"
              >
                {relTime}
              </time>
            </div>
          )
        })}
      </div>
    </div>
  )
}
