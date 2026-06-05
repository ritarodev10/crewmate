import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common'
import {
  AssigneeKind,
  CancelCode,
  JobStatus,
  Prisma,
  UserRole,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { JwtPayload } from '../auth/jwt.strategy'
import {
  InvalidStatusTransitionError,
  JobAlreadyCancelledError,
  JobNotFoundError,
  JobProgressBusinessError,
} from '../common/errors/domain.errors'
import { CreateJobDto } from './dto/create-job.dto'
import { JobsFilterDto } from './dto/jobs-filter.dto'
import { UpdateJobProgressDto } from './dto/update-job-progress.dto'
import { CancelJobDto } from './dto/cancel-job.dto'

// ---------------------------------------------------------------------------
// Shared select shape for list + single item (without statusEvents)
// ---------------------------------------------------------------------------
const JOB_SELECT = {
  id: true,
  status: true,
  progressPct: true,
  scheduledFor: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelReasonCode: true,
  cancelReasonNote: true,
  estimatedHours: true,
  clientRatePerHour: true,
  lat: true,
  lng: true,
  customerRating: true,
  customerTestimony: true,
  notes: true,
  assigneeKind: true,
  createdAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      address: true,
    },
  },
  jobType: {
    select: {
      id: true,
      name: true,
      label: true,
    },
  },
  worker: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.JobSelect

// ---------------------------------------------------------------------------
// Extended select for single-item (adds photo URLs + statusEvents)
// ---------------------------------------------------------------------------
const JOB_DETAIL_SELECT = {
  ...JOB_SELECT,
  customerPhotoUrls: true,
  workerPhotoUrls: true,
  statusEvents: {
    select: {
      id: true,
      actorUserId: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      metadata: true,
      occurredAt: true,
    },
    orderBy: { occurredAt: 'asc' as const },
  },
} satisfies Prisma.JobSelect

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // GET /jobs
  // -------------------------------------------------------------------------
  async findAll(
    user: JwtPayload,
    filter: JobsFilterDto,
  ): Promise<{ data: unknown[]; meta: { total: number } }> {
    const where = await this.buildListWhere(user, filter)

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        select: JOB_SELECT,
        orderBy: { scheduledFor: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ])

    return { data: jobs, meta: { total } }
  }

  // -------------------------------------------------------------------------
  // POST /jobs
  // -------------------------------------------------------------------------
  async create(
    user: JwtPayload,
    dto: CreateJobDto,
  ): Promise<{ data: unknown }> {
    const { operatorId, sub: actorUserId } = user

    // Validate customer belongs to operator
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, operatorId },
      select: { id: true, lat: true, lng: true },
    })
    if (!customer) {
      throw new JobNotFoundError(dto.customerId)
    }

    // Validate jobType belongs to operator
    const jobType = await this.prisma.jobType.findFirst({
      where: { id: dto.jobTypeId, operatorId },
      select: {
        id: true,
        estimatedHours: true,
        clientRatePerHour: true,
        customerPhotos: true,
        workerPhotos: true,
      },
    })
    if (!jobType) {
      throw new JobNotFoundError(dto.jobTypeId)
    }

    // Validate assignee
    if (dto.assigneeKind === AssigneeKind.SOLO) {
      if (!dto.workerId) {
        throw new UnprocessableEntityException(
          'workerId is required when assigneeKind is SOLO',
        )
      }
      const worker = await this.prisma.worker.findFirst({
        where: { id: dto.workerId, operatorId },
        select: { id: true },
      })
      if (!worker) {
        throw new JobNotFoundError(dto.workerId)
      }
    } else {
      if (!dto.teamId) {
        throw new UnprocessableEntityException(
          'teamId is required when assigneeKind is TEAM',
        )
      }
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, operatorId },
        select: { id: true },
      })
      if (!team) {
        throw new JobNotFoundError(dto.teamId)
      }
    }

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          operatorId,
          customerId: dto.customerId,
          jobTypeId: dto.jobTypeId,
          assigneeKind: dto.assigneeKind,
          workerId: dto.assigneeKind === AssigneeKind.SOLO ? dto.workerId : null,
          teamId: dto.assigneeKind === AssigneeKind.TEAM ? dto.teamId : null,
          scheduledFor: new Date(dto.scheduledFor),
          notes: dto.notes ?? null,
          estimatedHours: jobType.estimatedHours,
          clientRatePerHour: jobType.clientRatePerHour,
          customerPhotoUrls: jobType.customerPhotos,
          workerPhotoUrls: jobType.workerPhotos,
          lat: customer.lat,
          lng: customer.lng,
        },
        select: JOB_SELECT,
      })

      await tx.jobStatusEvent.create({
        data: {
          jobId: created.id,
          actorUserId,
          fromStatus: null,
          toStatus: JobStatus.SCHEDULED,
        },
      })

      return created
    })

    return { data: job }
  }

  // -------------------------------------------------------------------------
  // GET /jobs/:id
  // -------------------------------------------------------------------------
  async findOne(user: JwtPayload, jobId: string): Promise<{ data: unknown }> {
    const where = await this.buildSingleWhere(user, jobId)

    const job = await this.prisma.job.findFirst({
      where,
      select: JOB_DETAIL_SELECT,
    })

    if (!job) {
      throw new JobNotFoundError(jobId)
    }

    return { data: job }
  }

  // -------------------------------------------------------------------------
  // PATCH /jobs/:id/status
  // -------------------------------------------------------------------------
  async updateStatus(
    user: JwtPayload,
    jobId: string,
    targetStatus: JobStatus,
  ): Promise<{ data: unknown }> {
    if (targetStatus === JobStatus.CANCELLED) {
      throw new BadRequestException(
        'Use PATCH /jobs/:id/cancel to cancel a job',
      )
    }

    const where = await this.buildSingleWhere(user, jobId)
    const existing = await this.prisma.job.findFirst({
      where,
      select: { id: true, status: true, progressPct: true },
    })

    if (!existing) {
      throw new JobNotFoundError(jobId)
    }

    const { status: currentStatus } = existing

    // State machine validation
    if (
      currentStatus === JobStatus.SCHEDULED &&
      targetStatus === JobStatus.IN_PROGRESS
    ) {
      // Valid transition
    } else if (
      currentStatus === JobStatus.IN_PROGRESS &&
      targetStatus === JobStatus.COMPLETED
    ) {
      if (existing.progressPct !== 100) {
        throw new JobProgressBusinessError(
          'Job must be at 100% progress before completing',
        )
      }
    } else {
      throw new InvalidStatusTransitionError(currentStatus, targetStatus)
    }

    const now = new Date()
    const updateData: Prisma.JobUpdateInput = { status: targetStatus }

    if (targetStatus === JobStatus.IN_PROGRESS) {
      updateData.startedAt = now
    } else if (targetStatus === JobStatus.COMPLETED) {
      updateData.completedAt = now
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.update({
        where: { id: existing.id },
        data: updateData,
        select: JOB_SELECT,
      })

      await tx.jobStatusEvent.create({
        data: {
          jobId: existing.id,
          actorUserId: user.sub,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          metadata:
            targetStatus === JobStatus.COMPLETED
              ? { progressPct: existing.progressPct }
              : Prisma.JsonNull,
        },
      })

      return job
    })

    return { data: updated }
  }

  // -------------------------------------------------------------------------
  // PATCH /jobs/:id/progress
  // -------------------------------------------------------------------------
  async updateProgress(
    user: JwtPayload,
    jobId: string,
    dto: UpdateJobProgressDto,
  ): Promise<{ data: unknown }> {
    const where = await this.buildSingleWhere(user, jobId)
    const existing = await this.prisma.job.findFirst({
      where,
      select: { id: true, status: true, progressPct: true },
    })

    if (!existing) {
      throw new JobNotFoundError(jobId)
    }

    if (existing.status !== JobStatus.IN_PROGRESS) {
      throw new InvalidStatusTransitionError(
        existing.status,
        'progress update requires IN_PROGRESS',
      )
    }

    if (dto.progressPct < existing.progressPct) {
      throw new InvalidStatusTransitionError(
        `progressPct ${existing.progressPct}`,
        `progressPct ${dto.progressPct} (cannot go backwards)`,
      )
    }

    const updated = await this.prisma.job.update({
      where: { id: existing.id },
      data: { progressPct: dto.progressPct },
      select: JOB_SELECT,
    })

    return { data: updated }
  }

  // -------------------------------------------------------------------------
  // PATCH /jobs/:id/cancel
  // -------------------------------------------------------------------------
  async cancel(
    user: JwtPayload,
    jobId: string,
    dto: CancelJobDto,
  ): Promise<{ data: unknown }> {
    // MANAGER/SUPER_ADMIN only — enforced by @Roles at route level already,
    // but we query without role scoping (just operatorId) for these roles.
    const existing = await this.prisma.job.findFirst({
      where: { id: jobId, operatorId: user.operatorId },
      select: { id: true, status: true },
    })

    if (!existing) {
      throw new JobNotFoundError(jobId)
    }

    if (existing.status === JobStatus.COMPLETED) {
      throw new InvalidStatusTransitionError(
        JobStatus.COMPLETED,
        JobStatus.CANCELLED,
      )
    }

    if (existing.status === JobStatus.CANCELLED) {
      throw new JobAlreadyCancelledError(jobId)
    }

    const now = new Date()

    const updated = await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.update({
        where: { id: existing.id },
        data: {
          status: JobStatus.CANCELLED,
          cancelledAt: now,
          cancelledBy: user.sub,
          cancelReasonCode: dto.cancelReasonCode,
          cancelReasonNote: dto.cancelReasonNote ?? null,
        },
        select: JOB_SELECT,
      })

      await tx.jobStatusEvent.create({
        data: {
          jobId: existing.id,
          actorUserId: user.sub,
          fromStatus: existing.status,
          toStatus: JobStatus.CANCELLED,
          metadata: { cancelReasonCode: dto.cancelReasonCode as string },
        },
      })

      return job
    })

    return { data: updated }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Builds the WHERE clause for list queries scoped by RBAC role.
   */
  private async buildListWhere(
    user: JwtPayload,
    filter: JobsFilterDto,
  ): Promise<Prisma.JobWhereInput> {
    const base: Prisma.JobWhereInput = {
      operatorId: user.operatorId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.worker ? { workerId: filter.worker } : {}),
      ...(filter.type ? { jobTypeId: filter.type } : {}),
    }

    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.MANAGER
    ) {
      return base
    }

    if (user.role === UserRole.TEAM_LEAD) {
      // Jobs where workerId is in their team OR teamId is their team
      const membership = await this.prisma.teamMember.findFirst({
        where: { worker: { userId: user.sub, operatorId: user.operatorId } },
        select: { teamId: true, workerId: true },
      })

      if (!membership) {
        // Team lead not associated with any team — return no results
        return { ...base, id: '__no_match__' }
      }

      return {
        ...base,
        OR: [
          { teamId: membership.teamId },
          { workerId: membership.workerId },
        ],
      }
    }

    // WORKER — only their own jobs
    const worker = await this.prisma.worker.findFirst({
      where: { userId: user.sub, operatorId: user.operatorId },
      select: { id: true },
    })

    if (!worker) {
      return { ...base, id: '__no_match__' }
    }

    return { ...base, workerId: worker.id }
  }

  /**
   * Builds the WHERE clause for single-item queries scoped by RBAC role.
   */
  private async buildSingleWhere(
    user: JwtPayload,
    jobId: string,
  ): Promise<Prisma.JobWhereInput> {
    const base: Prisma.JobWhereInput = {
      id: jobId,
      operatorId: user.operatorId,
    }

    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.MANAGER
    ) {
      return base
    }

    if (user.role === UserRole.TEAM_LEAD) {
      const membership = await this.prisma.teamMember.findFirst({
        where: { worker: { userId: user.sub, operatorId: user.operatorId } },
        select: { teamId: true, workerId: true },
      })

      if (!membership) {
        return { ...base, id: '__no_match__' }
      }

      return {
        ...base,
        OR: [
          { teamId: membership.teamId },
          { workerId: membership.workerId },
        ],
      }
    }

    // WORKER
    const worker = await this.prisma.worker.findFirst({
      where: { userId: user.sub, operatorId: user.operatorId },
      select: { id: true },
    })

    if (!worker) {
      return { ...base, id: '__no_match__' }
    }

    return { ...base, workerId: worker.id }
  }
}
