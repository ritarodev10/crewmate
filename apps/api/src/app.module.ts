import { Module } from '@nestjs/common';

// Core, shared, and feature modules are wired here.
// Keep this file flat. Cross-cutting wiring lives in core/*.

@Module({
  imports: [
    // CoreModule,     // config, logger, prisma, redis
    // AuthModule,
    // AuthzModule,    // ability factory, policies guard, permission audit
    // OperatorsModule,
    // PropertiesModule,
    // WorkersModule,
    // JobsModule,
    // SchedulesModule,
    // WebhooksModule,
  ],
})
export class AppModule {}
