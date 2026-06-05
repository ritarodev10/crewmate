'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  X,
  ExternalLink,
  Ban,
  User,
  Users,
  Clock,
  Calendar,
  Camera,
  Star,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@web/components/ui/sheet'
import { Button } from '@web/components/ui/button'
import { cn } from '@web/lib/utils'
import { JOBS } from '@web/data/seed'
import type { Session } from '@web/lib/session'
import type { Job, Worker } from '@web/types/api'
import { RevokeJobModal } from '@web/components/shared/RevokeJobModal'

interface JobDetailDrawerProps {
  jobId: string | null
  onClose: () => void
  session: Session | null
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-brand/10 text-brand border border-brand/20',
  IN_PROGRESS: 'bg-amber/10 text-amber border border-amber/20',
  COMPLETED: 'bg-success/10 text-success border border-success/20',
  CANCELLED: 'bg-muted/15 text-muted border border-line',
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const STATUS_HISTORY_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-brand',
  IN_PROGRESS: 'bg-amber',
  COMPLETED: 'bg-success',
  CANCELLED: 'bg-muted',
}

const PROGRESS_STEPS = [0, 25, 50, 75, 100]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted uppercase tracking-wide mb-3 font-semibold">{children}</p>
  )
}

function Divider() {
  return <div className="h-px bg-line my-5" />
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'size-4',
            n <= rating ? 'fill-amber text-amber' : 'fill-none text-line'
          )}
        />
      ))}
    </div>
  )
}

function revenueCalc(job: Job): {
  clientCharge: number
  workerTotal: number
  platformProfit: number
  workerCount: number
} {
  const workerCount = job.assigneeKind === 'TEAM' ? 4 : 1
  const clientCharge = job.estimatedHours * job.clientRatePerHour * workerCount

  let workerTotal = 0
  if (job.assigneeKind === 'TEAM' && job.team?.members) {
    workerTotal = job.team.members.reduce((sum, m) => {
      const rate = m.worker?.hourlyRate ?? 25
      return sum + job.estimatedHours * rate
    }, 0)
  } else if (job.worker) {
    workerTotal = job.estimatedHours * job.worker.hourlyRate
  }

  return {
    clientCharge,
    workerTotal,
    platformProfit: clientCharge - workerTotal,
    workerCount,
  }
}

function formatCurrency(cents: number): string {
  return `€${cents.toLocaleString('en-EU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function JobDetailDrawer({ jobId, onClose, session }: JobDetailDrawerProps) {
  const [revokeOpen, setRevokeOpen] = useState(false)

  const job = jobId ? JOBS.find((j) => j.id === jobId) ?? null : null

  const canSeeRevenue =
    session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER'
  const canRevoke = canSeeRevenue
  const isRevokable =
    job !== null &&
    job.status !== 'COMPLETED' &&
    job.status !== 'CANCELLED'

  return (
    <>
      <Sheet open={!!jobId} onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col bg-canvas"
        >
          {job ? <DrawerBody job={job} session={session} canSeeRevenue={canSeeRevenue} canRevoke={canRevoke} isRevokable={isRevokable} onClose={onClose} onRevoke={() => setRevokeOpen(true)} /> : <DrawerEmpty onClose={onClose} />}
        </SheetContent>
      </Sheet>

      {jobId && (
        <RevokeJobModal
          jobId={jobId}
          open={revokeOpen}
          onClose={() => setRevokeOpen(false)}
        />
      )}
    </>
  )
}

function DrawerEmpty({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-line bg-surface">
        <p className="text-sm text-muted">Job not found</p>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-canvas transition-colors" aria-label="Close">
          <X className="size-4 text-muted" />
        </button>
      </div>
    </div>
  )
}

interface DrawerBodyProps {
  job: Job
  session: Session | null
  canSeeRevenue: boolean
  canRevoke: boolean
  isRevokable: boolean
  onClose: () => void
  onRevoke: () => void
}

function DrawerBody({ job, session, canSeeRevenue, canRevoke, isRevokable, onClose, onRevoke }: DrawerBodyProps) {
  const { clientCharge, workerTotal, platformProfit } = revenueCalc(job)
  const isProjected = job.status !== 'COMPLETED'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 border-b border-line bg-surface px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold uppercase tracking-widest text-default">
                {job.jobType?.label ?? 'Job'}
              </p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
                  STATUS_BADGE[job.status] ?? 'bg-muted/10 text-muted'
                )}
              >
                {STATUS_LABEL[job.status] ?? job.status}
              </span>
            </div>
            <p className="text-xs text-muted font-mono mt-1">{job.id}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md hover:bg-canvas transition-colors"
            aria-label="Close"
          >
            <X className="size-4 text-muted" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* 1. Customer */}
        <section>
          <SectionLabel>Customer</SectionLabel>
          <div className="bg-surface rounded-xl border border-line p-4 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="size-4 text-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-default">{job.customer?.name}</p>
                <p className="text-xs text-muted mt-0.5">{job.customer?.address}</p>
              </div>
            </div>
            {job.customer?.contactName && (
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted shrink-0" />
                <p className="text-xs text-default">{job.customer.contactName}</p>
              </div>
            )}
            {job.customer?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted shrink-0" />
                <p className="text-xs text-default">{job.customer.phone}</p>
              </div>
            )}
            {job.customer?.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted shrink-0" />
                <p className="text-xs text-default">{job.customer.email}</p>
              </div>
            )}
          </div>
        </section>

        <Divider />

        {/* 2. Assigned */}
        <section>
          <SectionLabel>Assigned</SectionLabel>
          {job.assigneeKind === 'SOLO' && job.worker ? (
            <SoloWorkerCard worker={job.worker} />
          ) : job.assigneeKind === 'TEAM' && job.team ? (
            <TeamCard
              teamName={job.team.name}
              members={(job.team.members ?? []).map(m => m.worker).filter((w): w is Worker => w !== undefined)}
            />
          ) : (
            <p className="text-sm text-muted">No assignment</p>
          )}
        </section>

        <Divider />

        {/* 3. Progress (IN_PROGRESS only) */}
        {job.status === 'IN_PROGRESS' && (
          <>
            <section>
              <SectionLabel>Progress</SectionLabel>
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="h-2 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber rounded-full transition-all duration-500"
                    style={{ width: `${job.progressPct}%` }}
                  />
                </div>
                {/* Step pills */}
                <div className="flex gap-2 flex-wrap">
                  {PROGRESS_STEPS.map((step) => (
                    <span
                      key={step}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium border',
                        job.progressPct >= step
                          ? 'bg-amber/10 text-amber border-amber/30'
                          : 'bg-surface text-muted border-line'
                      )}
                    >
                      {step}%
                    </span>
                  ))}
                </div>
                {/* Last update */}
                {job.statusEvents && job.statusEvents.length > 0 && (
                  <p className="text-xs text-muted">
                    Last update:{' '}
                    {format(
                      new Date(job.statusEvents[job.statusEvents.length - 1].occurredAt),
                      'HH:mm'
                    )}
                  </p>
                )}
              </div>
            </section>
            <Divider />
          </>
        )}

        {/* 4. Schedule */}
        <section>
          <SectionLabel>Schedule</SectionLabel>
          <div className="bg-surface rounded-xl border border-line p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted shrink-0" />
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide">Scheduled for</p>
                <p className="text-sm text-default font-medium">
                  {format(new Date(job.scheduledFor), 'HH:mm · EEE d MMM yyyy')}
                </p>
              </div>
            </div>
            {job.startedAt && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Started at</p>
                  <p className="text-sm text-default font-medium">
                    {format(new Date(job.startedAt), 'HH:mm · EEE d MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted shrink-0" />
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide">Estimated duration</p>
                <p className="text-sm text-default font-medium">{job.estimatedHours}h</p>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* 5. Revenue Breakdown (MANAGER/SUPER_ADMIN only) */}
        {canSeeRevenue && (
          <>
            <section>
              <SectionLabel>
                Revenue Breakdown{isProjected && <span className="normal-case ml-1 text-muted">(projected)</span>}
              </SectionLabel>
              <div className="bg-surface rounded-xl border border-line overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <p className="text-sm text-muted">Client charge</p>
                  <p className="text-sm font-semibold text-default tabular-nums">{formatCurrency(clientCharge)}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <p className="text-sm text-muted">Worker total</p>
                  <p className="text-sm font-medium text-default tabular-nums">−{formatCurrency(workerTotal)}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-success/5">
                  <p className="text-sm font-semibold text-success">Platform profit</p>
                  <p className="text-sm font-bold text-success tabular-nums">{formatCurrency(platformProfit)}</p>
                </div>
              </div>
            </section>
            <Divider />
          </>
        )}

        {/* 6. Photos Before */}
        <section>
          <SectionLabel>Photos — Before</SectionLabel>
          {job.customerPhotoUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {job.customerPhotoUrls.slice(0, 2).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Before photo ${i + 1}`}
                  className="w-full h-[120px] object-cover rounded-lg border border-line"
                  style={{ outline: '1px solid rgba(0,0,0,0.08)' }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-line bg-surface/50">
              <p className="text-xs text-muted flex items-center gap-1.5">
                <Camera className="size-4" />
                No before photos
              </p>
            </div>
          )}
        </section>

        <Divider />

        {/* 7. Photos After */}
        <section>
          <SectionLabel>Photos — After</SectionLabel>
          {job.status === 'COMPLETED' && job.workerPhotoUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {job.workerPhotoUrls.slice(0, 2).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`After photo ${i + 1}`}
                  className="w-full h-[120px] object-cover rounded-lg border border-line"
                  style={{ outline: '1px solid rgba(0,0,0,0.08)' }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-line bg-surface/50">
              <p className="text-xs text-muted flex items-center gap-1.5">
                <Camera className="size-4" />
                {job.status === 'COMPLETED'
                  ? 'No after photos uploaded'
                  : 'Photos will appear when completed'}
              </p>
            </div>
          )}
        </section>

        {/* 8. Customer Feedback (COMPLETED + rating) */}
        {job.status === 'COMPLETED' && job.customerRating !== null && job.customerRating !== undefined && (
          <>
            <Divider />
            <section>
              <SectionLabel>Customer Feedback</SectionLabel>
              <div className="bg-surface rounded-xl border border-line p-4 space-y-2">
                <StarRating rating={job.customerRating} />
                {job.customerTestimony && (
                  <p className="text-sm text-default italic leading-relaxed">
                    &ldquo;{job.customerTestimony}&rdquo;
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        <Divider />

        {/* 9. Status History */}
        <section>
          <SectionLabel>Status History</SectionLabel>
          {job.statusEvents && job.statusEvents.length > 0 ? (
            <ol className="relative ml-2 space-y-0">
              {[...job.statusEvents].reverse().map((event, idx, arr) => (
                <li key={event.id} className="relative flex gap-4 pb-4 last:pb-0">
                  {/* Connector line */}
                  {idx < arr.length - 1 && (
                    <div className="absolute left-[7px] top-5 bottom-0 w-px bg-line" />
                  )}
                  {/* Dot */}
                  <div
                    className={cn(
                      'mt-1 size-3.5 rounded-full shrink-0 z-10 ring-2 ring-canvas',
                      STATUS_HISTORY_COLOR[event.toStatus] ?? 'bg-muted'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-default">
                      {event.fromStatus ? `${STATUS_LABEL[event.fromStatus] ?? event.fromStatus} → ` : ''}
                      {STATUS_LABEL[event.toStatus] ?? event.toStatus}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {format(new Date(event.occurredAt), 'HH:mm · d MMM yyyy')}
                    </p>
                    {event.note && (
                      <p className="text-xs text-muted mt-1 italic">{event.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No history available.</p>
          )}
        </section>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-line bg-surface px-5 py-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => window.open(`/worker/jobs/${job.id}`, '_blank')}
        >
          <ExternalLink className="size-3.5" />
          Open in Worker View
        </Button>
        {canRevoke && (
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 gap-1.5"
            disabled={!isRevokable}
            onClick={onRevoke}
          >
            <Ban className="size-3.5" />
            Revoke Job
          </Button>
        )}
      </div>
    </div>
  )
}

function SoloWorkerCard({ worker }: { worker: Worker }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-4">
      <div className="flex items-center gap-3">
        {worker.avatarUrl ? (
          <img
            src={worker.avatarUrl}
            alt={worker.name}
            className="size-10 rounded-full object-cover ring-1 ring-black/10"
          />
        ) : (
          <div className="size-10 rounded-full bg-brand/10 flex items-center justify-center">
            <User className="size-5 text-brand" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-default">{worker.name}</p>
            <span className="rounded-full bg-amber/10 text-amber border border-amber/20 px-2 py-0.5 text-[10px] font-semibold">
              SOLO
            </span>
          </div>
          {worker.phone && (
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
              <Phone className="size-3" />
              {worker.phone}
            </p>
          )}
        </div>
        <div
          className={cn(
            'size-2.5 rounded-full shrink-0',
            worker.status === 'ON_JOB' ? 'bg-success' : worker.status === 'IDLE' ? 'bg-amber' : 'bg-muted'
          )}
        />
      </div>
    </div>
  )
}

function TeamCard({ teamName, members }: { teamName: string; members: Worker[] }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted shrink-0" />
        <p className="text-sm font-semibold text-default">{teamName}</p>
        <ChevronRight className="size-3.5 text-muted ml-auto" />
      </div>
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-2.5">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="size-7 rounded-full object-cover ring-1 ring-black/10 shrink-0"
              />
            ) : (
              <div className="size-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <User className="size-3.5 text-brand" />
              </div>
            )}
            <p className="text-xs font-medium text-default flex-1 min-w-0 truncate">{member.name}</p>
            <span className="text-[10px] font-medium text-muted">{member.kind}</span>
            <div
              className={cn(
                'size-2 rounded-full shrink-0',
                member.status === 'ON_JOB' ? 'bg-success' : member.status === 'IDLE' ? 'bg-amber' : 'bg-muted'
              )}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
