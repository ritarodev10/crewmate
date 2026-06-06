'use client'

import { useState } from 'react'
import type { Job, Worker } from '@web/types/api'

interface JobProgressViewProps {
  job: Job
  worker: Worker
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-500' },
}

const STEPS = ['Travel', 'Assess', 'Work', 'Test', 'Sign off']

function formatScheduled(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct / 100)

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="rotate-[-90deg]">
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="10"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-all duration-500"
      />
    </svg>
  )
}

function StepIndicator({ currentPct }: { currentPct: number }) {
  return (
    <div className="flex items-center gap-1 w-full mt-4">
      {STEPS.map((label, idx) => {
        const stepComplete = currentPct >= (idx + 1) * 20
        const stepCurrent = !stepComplete && currentPct >= idx * 20

        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                stepComplete
                  ? 'bg-amber-400 text-white'
                  : stepCurrent
                  ? 'border-2 border-amber-400 text-amber-500 bg-white'
                  : 'bg-zinc-200 text-zinc-400'
              }`}
            >
              {stepComplete ? '✓' : idx + 1}
            </div>
            <span className="text-[10px] text-muted text-center leading-tight">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function JobProgressView({ job, worker }: JobProgressViewProps) {
  const [status, setStatus] = useState(job.status)
  const [progressPct, setProgressPct] = useState(job.progressPct)

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.SCHEDULED
  const currentStep = Math.floor(progressPct / 20) // 0-based index of current step
  const isLastStep = progressPct >= 80

  const earnings = job.estimatedHours * worker.hourlyRate

  function handleStart() {
    setStatus('IN_PROGRESS')
    setProgressPct(0)
  }

  function handleCompleteStep() {
    const next = Math.min(progressPct + 20, 100)
    setProgressPct(next)
    if (next >= 100) {
      setStatus('COMPLETED')
    }
  }

  function handleCompleteJob() {
    setProgressPct(100)
    setStatus('COMPLETED')
  }

  return (
    <div className="p-4 space-y-6">
      {/* Status + type row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-medium bg-zinc-100 text-zinc-600">
          {job.jobType?.label ?? '—'}
        </span>
        <span className="text-xs text-muted ml-auto">{job.estimatedHours} hrs estimated</span>
      </div>

      {/* Progress ring card */}
      <div className="rounded-xl bg-surface shadow p-5 flex flex-col items-center">
        <div className="relative">
          <ProgressRing pct={progressPct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-default">{progressPct}%</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">
          Step {Math.min(currentStep + 1, 5)} of 5
        </p>
        <StepIndicator currentPct={progressPct} />
      </div>

      {/* Action button */}
      {status === 'SCHEDULED' && (
        <button
          onClick={handleStart}
          className="w-full rounded-xl bg-brand text-white font-semibold py-3 text-sm active:opacity-80 transition-opacity"
        >
          Start Job
        </button>
      )}
      {status === 'IN_PROGRESS' && !isLastStep && (
        <button
          onClick={handleCompleteStep}
          className="w-full rounded-xl bg-amber-400 text-white font-semibold py-3 text-sm active:opacity-80 transition-opacity"
        >
          Complete Step {currentStep + 1} — {STEPS[currentStep] ?? ''}
        </button>
      )}
      {status === 'IN_PROGRESS' && isLastStep && (
        <button
          onClick={handleCompleteJob}
          className="w-full rounded-xl bg-green-500 text-white font-semibold py-3 text-sm active:opacity-80 transition-opacity"
        >
          Complete Job
        </button>
      )}
      {status === 'COMPLETED' && (
        <div className="w-full rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold py-3 text-sm text-center">
          Job completed
        </div>
      )}
      {status === 'CANCELLED' && (
        <div className="w-full rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 font-semibold py-3 text-sm text-center">
          Job cancelled
        </div>
      )}

      {/* Details card */}
      <div className="rounded-xl bg-surface shadow p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-default text-xs uppercase tracking-wide text-muted mb-3">
          Job Details
        </h3>
        <div className="flex justify-between">
          <span className="text-muted">Customer</span>
          <span className="font-medium text-default text-right max-w-[60%] truncate">
            {job.customer?.name ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Address</span>
          <span className="font-medium text-default text-right max-w-[60%] text-xs">
            {job.customer?.address ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Scheduled</span>
          <span className="font-medium text-default">{formatScheduled(job.scheduledFor)}</span>
        </div>
        {status === 'COMPLETED' && (
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="text-muted">My earnings</span>
            <span className="font-semibold text-green-600">€{earnings.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
