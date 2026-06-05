import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  healthz(): { status: string } {
    return { status: 'ok' }
  }

  @Public()
  @Get('readyz')
  @HttpCode(HttpStatus.OK)
  async readyz(): Promise<{ status: string; db: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ok', db: 'ok' }
    } catch {
      throw new ServiceUnavailableException('Database is not reachable')
    }
  }
}
