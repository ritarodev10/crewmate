import { Injectable } from '@nestjs/common'
import { JobStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { JwtPayload } from '../auth/jwt.strategy'
import { WorkerNotFoundError } from '../common/errors/domain.errors'

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: JwtPayload) {
    const workers = await this.prisma.worker.findMany({
      where: { operatorId: user.operatorId },
      include: {
        user: { select: { name: true, email: true } },
        teamMemberships: { include: { team: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    })

    return { data: workers }
  }

  async findOne(user: JwtPayload, workerId: string) {
    const worker = await this.prisma.worker.findFirst({
      where: { id: workerId, operatorId: user.operatorId },
      include: {
        user: { select: { name: true, email: true, role: true } },
        teamMemberships: { include: { team: { select: { id: true, name: true, leadId: true } } } },
      },
    })

    if (!worker) throw new WorkerNotFoundError(workerId)

    return { data: worker }
  }

  async getEarnings(
    user: JwtPayload,
    workerId: string,
    period: 'week' | 'month' | 'lifetime',
  ) {
    const worker = await this.prisma.worker.findFirst({
      where: { id: workerId, operatorId: user.operatorId },
      select: { id: true, name: true, hourlyRate: true },
    })

    if (!worker) throw new WorkerNotFoundError(workerId)

    const dateFilter = periodToDateFilter(period)

    // SOLO jobs assigned directly to this worker
    const soloJobs = await this.prisma.job.findMany({
      where: {
        operatorId: user.operatorId,
        workerId,
        assigneeKind: 'SOLO',
        status: JobStatus.COMPLETED,
        ...(dateFilter ? { completedAt: dateFilter } : {}),
      },
      select: { estimatedHours: true },
    })

    // TEAM jobs: find teams this worker belongs to, then get their completed jobs
    const memberships = await this.prisma.teamMember.findMany({
      where: { workerId },
      select: { teamId: true },
    })
    const teamIds = memberships.map((m) => m.teamId)

    const teamJobs =
      teamIds.length > 0
        ? await this.prisma.job.findMany({
            where: {
              operatorId: user.operatorId,
              teamId: { in: teamIds },
              assigneeKind: 'TEAM',
              status: JobStatus.COMPLETED,
              ...(dateFilter ? { completedAt: dateFilter } : {}),
            },
            select: { estimatedHours: true },
          })
        : []

    const allJobs = [...soloJobs, ...teamJobs]
    const totalEarnings = allJobs.reduce(
      (sum, job) => sum + Math.round(worker.hourlyRate * job.estimatedHours),
      0,
    )

    return {
      data: {
        workerId: worker.id,
        workerName: worker.name,
        totalEarnings,
        jobCount: allJobs.length,
        period,
      },
    }
  }
}

function periodToDateFilter(period: 'week' | 'month' | 'lifetime') {
  if (period === 'lifetime') return null
  const now = new Date()
  const cutoff = new Date(now)
  if (period === 'week') cutoff.setDate(cutoff.getDate() - 7)
  if (period === 'month') cutoff.setDate(cutoff.getDate() - 30)
  return { gte: cutoff }
}
