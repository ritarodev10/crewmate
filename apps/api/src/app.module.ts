import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { HealthModule } from './health/health.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { RolesGuard } from './auth/guards/roles.guard'
import { CloudflareSecretGuard } from './auth/guards/cloudflare-secret.guard'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CloudflareSecretGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
