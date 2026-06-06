import { Injectable } from '@nestjs/common'
import { JobStatus, WorkerStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { JwtPayload } from '../auth/jwt.strategy'

function todayBounds(): { gte: Date; lte: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { gte: start, lte: end }
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: JwtPayload) {
    const { operatorId } = user
    const today = todayBounds()

    const [
      totalJobs,
      completedJobs,
      inProgressJobs,
      scheduledJobs,
      cancelledJobs,
      activeWorkers,
    ] = await Promise.all([
      this.prisma.job.count({ where: { operatorId } }),
      this.prisma.job.count({ where: { operatorId, status: JobStatus.COMPLETED } }),
      this.prisma.job.count({ where: { operatorId, status: JobStatus.IN_PROGRESS } }),
      this.prisma.job.count({ where: { operatorId, status: JobStatus.SCHEDULED } }),
      this.prisma.job.count({ where: { operatorId, status: JobStatus.CANCELLED } }),
      this.prisma.worker.count({ where: { operatorId, status: WorkerStatus.ON_JOB } }),
    ])

    // Revenue/profit: only COMPLETED jobs scheduled today
    const completedToday = await this.prisma.job.findMany({
      where: { operatorId, status: JobStatus.COMPLETED, scheduledFor: today },
      include: {
        worker: { select: { hourlyRate: true } },
        team: {
          include: {
            members: { include: { worker: { select: { hourlyRate: true } } } },
          },
        },
      },
    })

    let todayRevenue = 0
    let todayProfit = 0

    for (const job of completedToday) {
      if (job.assigneeKind === 'SOLO' && job.worker) {
        const revenue = Math.round(job.clientRatePerHour * job.estimatedHours)
        const cost = Math.round(job.worker.hourlyRate * job.estimatedHours)
        todayRevenue += revenue
        todayProfit += revenue - cost
      } else if (job.assigneeKind === 'TEAM' && job.team) {
        const memberCount = job.team.members.length
        const revenue = Math.round(job.clientRatePerHour * job.estimatedHours * memberCount)
        const cost = job.team.members.reduce(
          (sum, m) => sum + Math.round(m.worker.hourlyRate * job.estimatedHours),
          0,
        )
        todayRevenue += revenue
        todayProfit += revenue - cost
      }
    }

    return {
      data: {
        totalJobs,
        completedJobs,
        inProgressJobs,
        scheduledJobs,
        cancelledJobs,
        activeWorkers,
        todayRevenue,
        todayProfit,
      },
    }
  }

  async getActivity(user: JwtPayload) {
    const { operatorId } = user

    const events = await this.prisma.jobStatusEvent.findMany({
      where: { job: { operatorId } },
      orderBy: { occurredAt: 'desc' },
      take: 20,
      include: {
        job: {
          select: {
            id: true,
            jobType: { select: { label: true } },
            worker: { select: { name: true } },
            team: {
              select: {
                name: true,
                members: {
                  take: 1,
                  include: { worker: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    })

    const data = events.map((e) => {
      const workerName =
        e.job.worker?.name ??
        e.job.team?.members[0]?.worker.name ??
        null

      return {
        id: e.id,
        jobId: e.job.id,
        jobTypeLabel: e.job.jobType.label,
        workerName,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        note: e.note,
        occurredAt: e.occurredAt,
      }
    })

    return { data }
  }
}
