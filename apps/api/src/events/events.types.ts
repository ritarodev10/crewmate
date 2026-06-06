import { CancelCode, JobStatus, WorkerStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Emitted event name union
// ---------------------------------------------------------------------------
export type WsEventName =
  | 'job.status.changed'
  | 'job.progress.updated'
  | 'job.cancelled'
  | 'worker.status.changed'

// ---------------------------------------------------------------------------
// Payload shapes — one per event
// ---------------------------------------------------------------------------
export interface JobStatusChangedPayload {
  jobId: string
  status: JobStatus
  workerId?: string
  teamId?: string
  lat: number
  lng: number
  progressPct: number
}

export interface JobProgressUpdatedPayload {
  jobId: string
  progressPct: number
  workerId: string
}

export interface JobCancelledPayload {
  jobId: string
  cancelReasonCode: CancelCode
  cancelledBy: string
}

export interface WorkerStatusChangedPayload {
  workerId: string
  status: WorkerStatus
}

// ---------------------------------------------------------------------------
// Discriminated map used to type the generic emit() method
// ---------------------------------------------------------------------------
export interface WsEventPayload {
  'job.status.changed': JobStatusChangedPayload
  'job.progress.updated': JobProgressUpdatedPayload
  'job.cancelled': JobCancelledPayload
  'worker.status.changed': WorkerStatusChangedPayload
}
