import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { JwtPayload } from '../auth/jwt.strategy'

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: JwtPayload, q: string) {
    const { operatorId } = user

    const [jobs, workers] = await Promise.all([
      this.prisma.job.findMany({
        where: {
          operatorId,
          OR: [
            { customer: { name: { contains: q, mode: 'insensitive' } } },
            { jobType: { label: { contains: q, mode: 'insensitive' } } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          status: true,
          scheduledFor: true,
          customer: { select: { id: true, name: true } },
          jobType: { select: { id: true, label: true } },
          worker: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { scheduledFor: 'desc' },
      }),
      this.prisma.worker.findMany({
        where: {
          operatorId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          avatarUrl: true,
          kind: true,
        },
        take: 10,
      }),
    ])

    return { data: { jobs, workers } }
  }
}
