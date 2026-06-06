import { Injectable } from '@nestjs/common'
import { JobStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { JwtPayload } from '../auth/jwt.strategy'

function dayBounds(offsetDays: number): { gte: Date; lte: Date } {
  const start = new Date()
  start.setDate(start.getDate() + offsetDays)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { gte: start, lte: end }
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function computeJobRevenue(job: {
  clientRatePerHour: number
  estimatedHours: number
  assigneeKind: string
  worker: { hourlyRate: number } | null
  team: { members: { worker: { hourlyRate: number } }[] } | null
}): { revenue: number; profit: number } {
  if (job.assigneeKind === 'SOLO' && job.worker) {
    const revenue = Math.round(job.clientRatePerHour * job.estimatedHours)
    const cost = Math.round(job.worker.hourlyRate * job.estimatedHours)
    return { revenue, profit: revenue - cost }
  }
  if (job.assigneeKind === 'TEAM' && job.team) {
    const memberCount = job.team.members.length
    const revenue = Math.round(job.clientRatePerHour * job.estimatedHours * memberCount)
    const cost = job.team.members.reduce(
      (sum, m) => sum + Math.round(m.worker.hourlyRate * job.estimatedHours),
      0,
    )
    return { revenue, profit: revenue - cost }
  }
  return { revenue: 0, profit: 0 }
}

const JOB_REVENUE_INCLUDE = {
  worker: { select: { hourlyRate: true } },
  team: {
    include: {
      members: { include: { worker: { select: { hourlyRate: true } } } },
    },
  },
  jobType: { select: { id: true, name: true, label: true } },
} as const

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueSummary(user: JwtPayload) {
    const { operatorId } = user
    const today = dayBounds(0)

    // Fetch all completed jobs for the last 8 days (today + past 7)
    const since = new Date()
    since.setDate(since.getDate() - 7)
    since.setHours(0, 0, 0, 0)

    const allCompleted = await this.prisma.job.findMany({
      where: {
        operatorId,
        status: JobStatus.COMPLETED,
        scheduledFor: { gte: since },
      },
      include: JOB_REVENUE_INCLUDE,
    })

    // Today summary
    const todayJobs = allCompleted.filter(
      (j) => j.scheduledFor >= today.gte && j.scheduledFor <= today.lte,
    )
    const todayTotals = todayJobs.reduce(
      (acc, j) => {
        const { revenue, profit } = computeJobRevenue(j)
        return { revenue: acc.revenue + revenue, profit: acc.profit + profit }
      },
      { revenue: 0, profit: 0 },
    )

    // 8-day trend (day -7 through today)
    const trend: { date: string; revenue: number; profit: number }[] = []
    for (let offset = -7; offset <= 0; offset++) {
      const bounds = dayBounds(offset)
      const dayJobs = allCompleted.filter(
        (j) => j.scheduledFor >= bounds.gte && j.scheduledFor <= bounds.lte,
      )
      const totals = dayJobs.reduce(
        (acc, j) => {
          const { revenue, profit } = computeJobRevenue(j)
          return { revenue: acc.revenue + revenue, profit: acc.profit + profit }
        },
        { revenue: 0, profit: 0 },
      )
      trend.push({ date: toDateString(bounds.gte), ...totals })
    }

    // By job type (today only)
    const byJobTypeMap = new Map<
      string,
      { jobTypeId: string; name: string; label: string; revenue: number; profit: number; jobCount: number }
    >()

    for (const job of todayJobs) {
      const key = job.jobType.id
      const existing = byJobTypeMap.get(key) ?? {
        jobTypeId: job.jobType.id,
        name: job.jobType.name,
        label: job.jobType.label,
        revenue: 0,
        profit: 0,
        jobCount: 0,
      }
      const { revenue, profit } = computeJobRevenue(job)
      byJobTypeMap.set(key, {
        ...existing,
        revenue: existing.revenue + revenue,
        profit: existing.profit + profit,
        jobCount: existing.jobCount + 1,
      })
    }

    return {
      data: {
        today: todayTotals,
        trend,
        byJobType: Array.from(byJobTypeMap.values()),
      },
    }
  }
}
