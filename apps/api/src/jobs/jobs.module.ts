import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'

@Module({
  imports: [EventsModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
