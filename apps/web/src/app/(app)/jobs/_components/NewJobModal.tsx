'use client'

import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@web/components/ui/dialog'
import { Button } from '@web/components/ui/button'
import { cn } from '@web/lib/utils'
import { createJobAction } from '../actions'
import type { Worker } from '@web/types/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssigneeMode = 'SOLO' | 'TEAM'

interface NewJobFormState {
  customerId: string
  jobTypeId: string
  assigneeMode: AssigneeMode
  workerId: string
  teamId: string
  scheduledStart: string
  estimatedHours: string
}

const EMPTY_FORM: NewJobFormState = {
  customerId: '',
  jobTypeId: '',
  assigneeMode: 'SOLO',
  workerId: '',
  teamId: '',
  scheduledStart: '',
  estimatedHours: '',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NewJobModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  customers: Array<{ id: string; name: string }>
  jobTypes: Array<{ id: string; label: string; estimatedHours: number }>
  workers: Worker[]
  teams: Array<{ id: string; name: string }>
  token: string | undefined
}

export function NewJobModal({
  open,
  onClose,
  onSuccess,
  customers,
  jobTypes,
  workers,
  teams,
  token,
}: NewJobModalProps) {
  const [form, setForm] = useState<NewJobFormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (loading) return
    setForm(EMPTY_FORM)
    setSuccess(false)
    setError(null)
    onClose()
  }

  function patch(partial: Partial<NewJobFormState>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  function isValid() {
    if (!form.customerId || !form.jobTypeId || !form.scheduledStart) return false
    if (form.assigneeMode === 'SOLO' && !form.workerId) return false
    if (form.assigneeMode === 'TEAM' && !form.teamId) return false
    const hrs = parseFloat(form.estimatedHours)
    if (!form.estimatedHours || isNaN(hrs) || hrs <= 0) return false
    return true
  }

  async function handleSubmit() {
    if (!isValid() || loading || !token) return
    setLoading(true)
    setError(null)

    const payload = {
      customerId: form.customerId,
      jobTypeId: form.jobTypeId,
      assigneeKind: form.assigneeMode,
      workerId: form.assigneeMode === 'SOLO' ? form.workerId : null,
      teamId: form.assigneeMode === 'TEAM' ? form.teamId : null,
      scheduledFor: new Date(form.scheduledStart).toISOString(),
      estimatedHours: parseFloat(form.estimatedHours),
    }

    const result = await createJobAction(token, payload)
    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      onSuccess()
      handleClose()
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
          <DialogDescription>
            Create a new field service job and assign it to a worker or team.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="size-10 text-success" />
            <p className="text-sm font-medium text-success">Job created successfully!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer */}
            <FormField label="Customer">
              <select
                value={form.customerId}
                onChange={(e) => patch({ customerId: e.target.value })}
                disabled={loading}
                className={selectClass}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Job Type */}
            <FormField label="Job Type">
              <select
                value={form.jobTypeId}
                onChange={(e) => {
                  const jt = jobTypes.find((j) => j.id === e.target.value)
                  patch({
                    jobTypeId: e.target.value,
                    estimatedHours: jt ? String(jt.estimatedHours) : form.estimatedHours,
                  })
                }}
                disabled={loading}
                className={selectClass}
              >
                <option value="">Select job type…</option>
                {jobTypes.map((jt) => (
                  <option key={jt.id} value={jt.id}>
                    {jt.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Assignee Mode toggle */}
            <FormField label="Assign To">
              <div className="flex gap-2">
                {(['SOLO', 'TEAM'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={loading}
                    onClick={() => patch({ assigneeMode: mode, workerId: '', teamId: '' })}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      form.assigneeMode === mode
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-line bg-surface text-muted hover:border-default/40 hover:text-default'
                    )}
                  >
                    {mode === 'SOLO' ? 'Solo Worker' : 'Team'}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Worker / Team selector */}
            {form.assigneeMode === 'SOLO' ? (
              <FormField label="Worker">
                <select
                  value={form.workerId}
                  onChange={(e) => patch({ workerId: e.target.value })}
                  disabled={loading}
                  className={selectClass}
                >
                  <option value="">Select worker…</option>
                  {workers.filter((w) => w.kind === 'SOLO' || w.kind === 'TEAM_LEAD').map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.status})
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Team">
                <select
                  value={form.teamId}
                  onChange={(e) => patch({ teamId: e.target.value })}
                  disabled={loading}
                  className={selectClass}
                >
                  <option value="">Select team…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Scheduled Start */}
            <FormField label="Scheduled Start">
              <input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) => patch({ scheduledStart: e.target.value })}
                disabled={loading}
                className={inputClass}
              />
            </FormField>

            {/* Estimated Hours */}
            <FormField label="Estimated Hours">
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                placeholder="e.g. 3.5"
                value={form.estimatedHours}
                onChange={(e) => patch({ estimatedHours: e.target.value })}
                disabled={loading}
                className={inputClass}
              />
            </FormField>

            {error && (
              <p className="text-sm text-danger font-medium">{error}</p>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => { void handleSubmit() }}
              disabled={!isValid() || loading}
              className="gap-2"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {loading ? 'Creating…' : 'Create Job'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted uppercase tracking-wide font-semibold block">
        {label}
      </label>
      {children}
    </div>
  )
}

const selectClass = cn(
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-default',
  'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors',
  'cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
)

const inputClass = cn(
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-default placeholder:text-muted',
  'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors',
  'disabled:opacity-60 disabled:cursor-not-allowed'
)
