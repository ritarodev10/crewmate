'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
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
import { cancelJobAction } from '@web/app/(app)/jobs/actions'
import type { CancelCode } from '@web/types/api'

interface RevokeJobModalProps {
  jobId: string
  open: boolean
  onClose: () => void
  token?: string
  onSuccess?: () => void
}

const CANCEL_REASONS: { code: CancelCode; label: string }[] = [
  { code: 'CUSTOMER_CANCELLED', label: 'Customer requested cancellation' },
  { code: 'EQUIPMENT_UNAVAILABLE', label: 'Required equipment not available' },
  { code: 'WORKER_NO_SHOW', label: 'Worker did not show up' },
  { code: 'ACCESS_DENIED', label: 'Could not access the property' },
  { code: 'DUPLICATE_JOB', label: 'Entered in error / duplicate' },
  { code: 'EMERGENCY_RECALL', label: 'Worker recalled for emergency' },
]

export function RevokeJobModal({ jobId, open, onClose, token, onSuccess }: RevokeJobModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancelCode | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (loading) return
    setSelectedReason(null)
    setNote('')
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!selectedReason || loading || !token) return
    setLoading(true)
    setError(null)

    const result = await cancelJobAction(token, jobId, {
      cancelReasonCode: selectedReason,
      ...(note.trim() ? { cancelReasonNote: note.trim() } : {}),
    })

    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setSelectedReason(null)
    setNote('')
    onSuccess?.()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Revoke Job {jobId}</DialogTitle>
          <DialogDescription>
            Select a reason for cancelling this job. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Reason radio group */}
        <fieldset className="space-y-2">
          <legend className="text-xs text-muted uppercase tracking-wide mb-2 block">
            Cancellation reason
          </legend>
          {CANCEL_REASONS.map(({ code, label }) => (
            <label
              key={code}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-sm',
                selectedReason === code
                  ? 'border-danger/50 bg-danger-fade text-danger'
                  : 'border-line bg-surface hover:border-danger/30 hover:bg-danger-fade/40 text-default'
              )}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={code}
                checked={selectedReason === code}
                onChange={() => setSelectedReason(code)}
                className="accent-danger shrink-0"
              />
              {label}
            </label>
          ))}
        </fieldset>

        {/* Note textarea */}
        <div className="space-y-1.5">
          <label htmlFor="revoke-note" className="text-xs text-muted uppercase tracking-wide block">
            Additional context (optional)
          </label>
          <textarea
            id="revoke-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Add any additional context…"
            className={cn(
              'w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-default placeholder:text-muted',
              'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
              'transition-colors'
            )}
          />
          <p className="text-[11px] text-muted text-right">{note.length}/280</p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-fade px-3 py-2.5">
          <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger font-medium">This action cannot be undone.</p>
        </div>

        {error && (
          <p className="text-sm text-danger font-medium">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { void handleConfirm() }}
            disabled={!selectedReason || loading}
            className="gap-2"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {loading ? 'Revoking…' : 'Confirm Revoke'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
