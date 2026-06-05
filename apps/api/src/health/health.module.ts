import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'

// PrismaModule is @Global() so PrismaService is available without explicit import.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
