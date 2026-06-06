// =============================================================================
// demo/demo.service.ts
//
// Resets the 40 seeded "today" jobs (J-001 through J-040) back to their
// original seed state so the demo environment can be showcased repeatedly.
// =============================================================================

import { Injectable } from '@nestjs/common'
import { CancelCode, JobStatus, WorkerStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { JwtPayload } from '../auth/jwt.strategy'

// ---------------------------------------------------------------------------
// The 40 demo job IDs — only these are touched during reset.
// ---------------------------------------------------------------------------
const TODAY_JOB_IDS = [
  'J-001', 'J-002', 'J-003', 'J-004', 'J-005',
  'J-006', 'J-007', 'J-008', 'J-009', 'J-010',
  'J-011', 'J-012', 'J-013', 'J-014', 'J-015',
  'J-016', 'J-017', 'J-018', 'J-019', 'J-020',
  'J-021', 'J-022', 'J-023', 'J-024', 'J-025',
  'J-026', 'J-027', 'J-028', 'J-029', 'J-030',
  'J-031', 'J-032', 'J-033', 'J-034', 'J-035',
  'J-036', 'J-037', 'J-038', 'J-039', 'J-040',
]

// Jobs that must remain CANCELLED after reset, with their original cancel data.
interface CancelledJobSeed {
  kind: 'CANCELLED'
  cancelReasonCode: CancelCode
}

const CANCELLED_JOB_SEEDS: Record<string, CancelledJobSeed> = {
  'J-019': { kind: 'CANCELLED', cancelReasonCode: CancelCode.CUSTOMER_CANCELLED },
  'J-020': { kind: 'CANCELLED', cancelReasonCode: CancelCode.EQUIPMENT_UNAVAILABLE },
  'J-038': { kind: 'CANCELLED', cancelReasonCode: CancelCode.WORKER_NO_SHOW },
  'J-039': { kind: 'CANCELLED', cancelReasonCode: CancelCode.ACCESS_DENIED },
  'J-040': { kind: 'CANCELLED', cancelReasonCode: CancelCode.DUPLICATE_JOB },
}

// Jobs with original seed status, progressPct, sched time, and optional rating/testimony.
interface CompletedJobSeed {
  kind: 'COMPLETED'
  progressPct: 100
  schedHour: number
  schedMin: number
  estimatedHours: number
  customerRating: number
  customerTestimony: string
}

interface InProgressJobSeed {
  kind: 'IN_PROGRESS'
  progressPct: number
  schedHour: number
  schedMin: number
}

interface ScheduledJobSeed {
  kind: 'SCHEDULED'
  progressPct: 0
}

type NonCancelledSeed = CompletedJobSeed | InProgressJobSeed | ScheduledJobSeed

// ---------------------------------------------------------------------------
// Seed metadata for non-CANCELLED jobs.
// estimatedHours is required for computing startedAt / completedAt timestamps.
// ---------------------------------------------------------------------------
const NON_CANCELLED_SEEDS: Record<string, NonCancelledSeed> = {
  // COMPLETED team jobs
  'J-001': { kind: 'COMPLETED', progressPct: 100, schedHour: 7,  schedMin: 0,  estimatedHours: 4.0, customerRating: 5, customerTestimony: 'Excellent team, arrived early and left everything spotless.' },
  'J-002': { kind: 'COMPLETED', progressPct: 100, schedHour: 7,  schedMin: 30, estimatedHours: 2.0, customerRating: 5, customerTestimony: 'Sofia was professional and thorough. Very satisfied.' },
  'J-003': { kind: 'COMPLETED', progressPct: 100, schedHour: 8,  schedMin: 0,  estimatedHours: 3.5, customerRating: 4, customerTestimony: 'Good work, clean finish. Slight delay but communicated well.' },
  'J-004': { kind: 'COMPLETED', progressPct: 100, schedHour: 8,  schedMin: 30, estimatedHours: 1.5, customerRating: 5, customerTestimony: 'Fast and efficient. Drain works perfectly now.' },
  'J-005': { kind: 'COMPLETED', progressPct: 100, schedHour: 9,  schedMin: 0,  estimatedHours: 2.0, customerRating: 5, customerTestimony: 'Beautiful result. The new lighting transforms the gallery.' },
  'J-006': { kind: 'COMPLETED', progressPct: 100, schedHour: 9,  schedMin: 15, estimatedHours: 2.5, customerRating: 4, customerTestimony: 'Problem fixed correctly. Would use again.' },
  'J-007': { kind: 'COMPLETED', progressPct: 100, schedHour: 9,  schedMin: 30, estimatedHours: 3.0, customerRating: 5, customerTestimony: 'Diagnosed the issue quickly. System running perfectly.' },
  'J-008': { kind: 'COMPLETED', progressPct: 100, schedHour: 10, schedMin: 0,  estimatedHours: 4.5, customerRating: 5, customerTestimony: 'Critical work done with precision. Generator is fully operational.' },
  // IN_PROGRESS team jobs
  'J-009': { kind: 'IN_PROGRESS', progressPct: 75,  schedHour: 11, schedMin: 0  },
  'J-010': { kind: 'IN_PROGRESS', progressPct: 50,  schedHour: 11, schedMin: 30 },
  'J-011': { kind: 'IN_PROGRESS', progressPct: 25,  schedHour: 12, schedMin: 0  },
  'J-012': { kind: 'IN_PROGRESS', progressPct: 50,  schedHour: 12, schedMin: 30 },
  'J-013': { kind: 'IN_PROGRESS', progressPct: 75,  schedHour: 13, schedMin: 0  },
  // SCHEDULED team jobs
  'J-014': { kind: 'SCHEDULED', progressPct: 0 },
  'J-015': { kind: 'SCHEDULED', progressPct: 0 },
  'J-016': { kind: 'SCHEDULED', progressPct: 0 },
  'J-017': { kind: 'SCHEDULED', progressPct: 0 },
  'J-018': { kind: 'SCHEDULED', progressPct: 0 },
  // COMPLETED solo jobs
  'J-021': { kind: 'COMPLETED', progressPct: 100, schedHour: 7,  schedMin: 0,  estimatedHours: 3.0, customerRating: 5, customerTestimony: 'Antonio solved a tricky HVAC fault in under 3 hours. Impressive.' },
  'J-022': { kind: 'COMPLETED', progressPct: 100, schedHour: 7,  schedMin: 0,  estimatedHours: 2.5, customerRating: 5, customerTestimony: 'Quick and clean. No mess left behind, critical for a hospital.' },
  'J-023': { kind: 'COMPLETED', progressPct: 100, schedHour: 7,  schedMin: 30, estimatedHours: 1.5, customerRating: 4, customerTestimony: 'Drain cleared, no issues. Standard but solid work.' },
  'J-024': { kind: 'COMPLETED', progressPct: 100, schedHour: 8,  schedMin: 0,  estimatedHours: 2.0, customerRating: 5, customerTestimony: 'Great job! The new lighting looks fantastic in our office.' },
  'J-025': { kind: 'COMPLETED', progressPct: 100, schedHour: 8,  schedMin: 0,  estimatedHours: 3.5, customerRating: 4, customerTestimony: 'Competent work. Panel upgraded without any disruption to operations.' },
  'J-026': { kind: 'COMPLETED', progressPct: 100, schedHour: 9,  schedMin: 30, estimatedHours: 4.0, customerRating: 5, customerTestimony: 'Full AC install done properly. Very happy with the result.' },
  'J-027': { kind: 'COMPLETED', progressPct: 100, schedHour: 10, schedMin: 0,  estimatedHours: 2.0, customerRating: 5, customerTestimony: 'Giulia is always reliable. System running better than ever.' },
  // IN_PROGRESS solo jobs
  'J-028': { kind: 'IN_PROGRESS', progressPct: 75,  schedHour: 11, schedMin: 0  },
  'J-029': { kind: 'IN_PROGRESS', progressPct: 50,  schedHour: 12, schedMin: 0  },
  'J-030': { kind: 'IN_PROGRESS', progressPct: 25,  schedHour: 12, schedMin: 30 },
  // SCHEDULED solo jobs
  'J-031': { kind: 'SCHEDULED', progressPct: 0 },
  'J-032': { kind: 'SCHEDULED', progressPct: 0 },
  'J-033': { kind: 'SCHEDULED', progressPct: 0 },
  'J-034': { kind: 'SCHEDULED', progressPct: 0 },
  'J-035': { kind: 'SCHEDULED', progressPct: 0 },
  'J-036': { kind: 'SCHEDULED', progressPct: 0 },
  'J-037': { kind: 'SCHEDULED', progressPct: 0 },
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function todayAt(hours: number, minutes: number): Date {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  async reset(_user: JwtPayload): Promise<{ data: { message: string } }> {
    await this.prisma.$transaction(async (tx) => {
      // -----------------------------------------------------------------------
      // Step 1: Wipe all status events for the 40 demo jobs.
      // -----------------------------------------------------------------------
      await tx.jobStatusEvent.deleteMany({
        where: { jobId: { in: TODAY_JOB_IDS } },
      })

      // -----------------------------------------------------------------------
      // Step 2a: Reset all non-cancelled jobs to SCHEDULED baseline.
      //          (We reset cancelled jobs separately with their cancel data.)
      // -----------------------------------------------------------------------
      const nonCancelledIds = TODAY_JOB_IDS.filter(
        (id) => !(id in CANCELLED_JOB_SEEDS),
      )

      await tx.job.updateMany({
        where: { id: { in: nonCancelledIds } },
        data: {
          status: JobStatus.SCHEDULED,
          progressPct: 0,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          cancelledBy: null,
          cancelReasonCode: null,
          cancelReasonNote: null,
        },
      })

      // -----------------------------------------------------------------------
      // Step 2b: Restore original progressPct, rating, testimony, and
      //          timestamps for each non-cancelled job individually.
      // -----------------------------------------------------------------------
      for (const [jobId, seed] of Object.entries(NON_CANCELLED_SEEDS)) {
        if (seed.kind === 'COMPLETED') {
          const scheduledFor = todayAt(seed.schedHour, seed.schedMin)
          const startedAt = addMinutes(scheduledFor, 5)
          const completedAt = addHours(startedAt, seed.estimatedHours)

          await tx.job.update({
            where: { id: jobId },
            data: {
              status: JobStatus.COMPLETED,
              progressPct: 100,
              startedAt,
              completedAt,
              customerRating: seed.customerRating,
              customerTestimony: seed.customerTestimony,
            },
          })
        } else if (seed.kind === 'IN_PROGRESS') {
          const scheduledFor = todayAt(seed.schedHour, seed.schedMin)
          const startedAt = addMinutes(scheduledFor, 5)

          await tx.job.update({
            where: { id: jobId },
            data: {
              status: JobStatus.IN_PROGRESS,
              progressPct: seed.progressPct,
              startedAt,
            },
          })
        }
        // SCHEDULED jobs are already in the correct state from updateMany above
      }

      // -----------------------------------------------------------------------
      // Step 2c: Restore cancelled jobs.
      // -----------------------------------------------------------------------
      for (const [jobId, seed] of Object.entries(CANCELLED_JOB_SEEDS)) {
        // Fetch scheduledFor to compute cancelledAt = sched - 30min.
        const job = await tx.job.findUnique({
          where: { id: jobId },
          select: { scheduledFor: true },
        })

        if (job) {
          const cancelledAt = addMinutes(job.scheduledFor, -30)

          await tx.job.update({
            where: { id: jobId },
            data: {
              status: JobStatus.CANCELLED,
              progressPct: 0,
              startedAt: null,
              completedAt: null,
              cancelledAt,
              cancelledBy: 'u-01',
              cancelReasonCode: seed.cancelReasonCode,
              cancelReasonNote: null,
            },
          })
        }
      }

      // -----------------------------------------------------------------------
      // Step 3: Reset all workers to IDLE then restore original statuses.
      // -----------------------------------------------------------------------
      await tx.worker.updateMany({
        where: { operatorId: 'op-001' },
        data: { status: WorkerStatus.IDLE },
      })

      const workerStatuses: { id: string; status: WorkerStatus }[] = [
        { id: 'w-01', status: WorkerStatus.ON_JOB },
        { id: 'w-02', status: WorkerStatus.ON_JOB },
        { id: 'w-03', status: WorkerStatus.ON_JOB },
        { id: 'w-04', status: WorkerStatus.IDLE   },
        { id: 'w-05', status: WorkerStatus.ON_JOB },
        { id: 'w-06', status: WorkerStatus.ON_JOB },
        { id: 'w-07', status: WorkerStatus.IDLE   },
        { id: 'w-08', status: WorkerStatus.ON_JOB },
        { id: 'w-09', status: WorkerStatus.IDLE   },
      ]

      for (const ws of workerStatuses) {
        await tx.worker.update({
          where: { id: ws.id },
          data: { status: ws.status },
        })
      }

      // -----------------------------------------------------------------------
      // Step 4: Re-create original JobStatusEvents.
      // -----------------------------------------------------------------------
      const eventsToCreate: {
        jobId: string
        actorUserId: string
        fromStatus: JobStatus | null
        toStatus: JobStatus
        occurredAt: Date
      }[] = []

      for (const [jobId, seed] of Object.entries(NON_CANCELLED_SEEDS)) {
        if (seed.kind === 'COMPLETED') {
          const scheduledFor = todayAt(seed.schedHour, seed.schedMin)
          const startedAt = addMinutes(scheduledFor, 5)
          const completedAt = addHours(startedAt, seed.estimatedHours)

          eventsToCreate.push({
            jobId,
            actorUserId: 'u-01',
            fromStatus: JobStatus.SCHEDULED,
            toStatus: JobStatus.IN_PROGRESS,
            occurredAt: startedAt,
          })
          eventsToCreate.push({
            jobId,
            actorUserId: 'u-01',
            fromStatus: JobStatus.IN_PROGRESS,
            toStatus: JobStatus.COMPLETED,
            occurredAt: completedAt,
          })
        } else if (seed.kind === 'IN_PROGRESS') {
          const scheduledFor = todayAt(seed.schedHour, seed.schedMin)
          const startedAt = addMinutes(scheduledFor, 5)

          eventsToCreate.push({
            jobId,
            actorUserId: 'u-01',
            fromStatus: JobStatus.SCHEDULED,
            toStatus: JobStatus.IN_PROGRESS,
            occurredAt: startedAt,
          })
        }
        // SCHEDULED: no events to create
      }

      // Cancelled jobs get a single CANCELLED event
      for (const [jobId] of Object.entries(CANCELLED_JOB_SEEDS)) {
        const job = await tx.job.findUnique({
          where: { id: jobId },
          select: { cancelledAt: true },
        })

        if (job?.cancelledAt) {
          eventsToCreate.push({
            jobId,
            actorUserId: 'u-01',
            fromStatus: JobStatus.SCHEDULED,
            toStatus: JobStatus.CANCELLED,
            occurredAt: job.cancelledAt,
          })
        }
      }

      await tx.jobStatusEvent.createMany({ data: eventsToCreate })
    })

    return { data: { message: 'Demo reset complete' } }
  }
}
