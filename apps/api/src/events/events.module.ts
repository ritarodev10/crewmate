import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { EventsGateway } from './events.gateway'

@Module({
  imports: [
    // Register JwtModule without a default secret — the gateway passes the
    // secret explicitly in verify() calls, matching the auth module pattern.
    JwtModule.register({}),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
