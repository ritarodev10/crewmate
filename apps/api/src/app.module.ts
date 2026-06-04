import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CloudflareSecretGuard } from './common/guards/cloudflare-secret.guard';
import { CoreModule } from './core/core.module';
import { HealthModule } from './modules/health/health.module';

// Core, shared, and feature modules are wired here.
// Keep this file flat. Cross-cutting wiring lives in core/*.

@Module({
  imports: [
    CoreModule,
    HealthModule,
    // AuthModule,
    // AuthzModule,    // ability factory, policies guard, permission audit
    // OperatorsModule,
    // PropertiesModule,
    // WorkersModule,
    // JobsModule,
    // SchedulesModule,
    // WebhooksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CloudflareSecretGuard },
  ],
})
export class AppModule {}
