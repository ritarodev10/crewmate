'use client'

import { useState, useCallback } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cn } from '@web/lib/utils'
import type { Job, JobStatus } from '@web/types/api'
import type { Session } from '@web/lib/session'
import { JobDetailDrawer } from '@web/components/shared/JobDetailDrawer'

interface JobMapProps {
  jobs: Job[]
  session: Session | null
}

type FilterStatus = 'ALL' | JobStatus

const STATUS_COLOR: Record<JobStatus, string> = {
  SCHEDULED: '#2563EB',
  IN_PROGRESS: '#F97316',
  COMPLETED: '#22C55E',
  CANCELLED: '#9CA3AF',
}

const STATUS_LABEL: Record<JobStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const FILTER_OPTIONS: FilterStatus[] = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

// Count jobs by status
function countByStatus(jobs: Job[]): Record<JobStatus, number> {
  const counts: Record<JobStatus, number> = {
    SCHEDULED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }
  for (const job of jobs) {
    counts[job.status] = (counts[job.status] ?? 0) + 1
  }
  return counts
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      className="absolute -inset-[5px] pointer-events-none"
      style={{ rotate: '-90deg' }}
    >
      <circle
        cx="17"
        cy="17"
        r={radius}
        fill="none"
        stroke="rgba(249,115,22,0.3)"
        strokeWidth="3"
      />
      <circle
        cx="17"
        cy="17"
        r={radius}
        fill="none"
        stroke="#F97316"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  )
}

function JobPin({
  job,
  isSelected,
  onClick,
}: {
  job: Job
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const color = STATUS_COLOR[job.status]
  const isCancelled = job.status === 'CANCELLED'
  const isInProgress = job.status === 'IN_PROGRESS'

  return (
    <div
      className="relative"
      style={{ width: '24px', height: '24px' }}
    >
      {isInProgress && <ProgressRing pct={job.progressPct} />}
      <button
        onClick={onClick}
        className={cn(
          'size-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white transition-transform duration-150 active:scale-[0.96]',
          isSelected && 'ring-2 ring-white ring-offset-1 scale-125',
          isCancelled && 'opacity-50'
        )}
        style={{ backgroundColor: color }}
        aria-label={`Job ${job.id} — ${STATUS_LABEL[job.status]}`}
      >
        {isCancelled && (
          <span className="text-[9px] font-bold leading-none">✕</span>
        )}
      </button>
    </div>
  )
}

export function JobMap({ jobs, session }: JobMapProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  const counts = countByStatus(jobs)

  const visibleJobs =
    activeFilter === 'ALL'
      ? jobs
      : jobs.filter((j) => j.status === activeFilter)

  function handleFilterClick(filter: FilterStatus) {
    setActiveFilter((prev) => (prev === filter ? 'ALL' : filter))
    setSelectedJobId(null)
  }

  function handlePinClick(jobId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedJobId((prev) => (prev === jobId ? null : jobId))
  }

  const handleMapClick = useCallback(() => {
    setSelectedJobId(null)
  }, [])

  return (
    <>
      <div className="relative w-full h-full">
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{
            longitude: 9.190,
            latitude: 45.464,
            zoom: 12,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          onClick={handleMapClick}
          reuseMaps
        >
          {visibleJobs.map((job) => (
            <Marker
              key={job.id}
              longitude={job.lng}
              latitude={job.lat}
              anchor="center"
            >
              <JobPin
                job={job}
                isSelected={selectedJobId === job.id}
                onClick={(e) => handlePinClick(job.id, e)}
              />
            </Marker>
          ))}
        </Map>

        {/* Filter toggle bar */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm rounded-xl shadow-lg px-2 py-1.5 flex gap-1 z-10">
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter
            const color = filter !== 'ALL' ? STATUS_COLOR[filter] : undefined

            return (
              <button
                key={filter}
                onClick={() => handleFilterClick(filter)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.96]',
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-muted hover:text-default bg-transparent'
                )}
                style={
                  isActive
                    ? { backgroundColor: color ?? '#111827' }
                    : undefined
                }
              >
                {filter === 'ALL' ? 'All' : STATUS_LABEL[filter]}
              </button>
            )
          })}
        </div>

        {/* Stat bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm rounded-xl shadow px-4 py-2 flex gap-4 text-xs z-10">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-full bg-success inline-block" />
            <span className="tabular-nums font-medium text-default">{counts.COMPLETED}</span>
            Completed
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-full bg-amber inline-block" />
            <span className="tabular-nums font-medium text-default">{counts.IN_PROGRESS}</span>
            In Progress
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-full bg-brand inline-block" />
            <span className="tabular-nums font-medium text-default">{counts.SCHEDULED}</span>
            Scheduled
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-full bg-muted inline-block" />
            <span className="tabular-nums font-medium text-default">{counts.CANCELLED}</span>
            Cancelled
          </span>
        </div>
      </div>

      <JobDetailDrawer
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        session={session}
      />
    </>
  )
}
