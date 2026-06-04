import { Global, Module } from '@nestjs/common';

import { ConfigCoreModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [ConfigCoreModule, PrismaModule, RedisModule],
  exports: [ConfigCoreModule, PrismaModule, RedisModule],
})
export class CoreModule {}
