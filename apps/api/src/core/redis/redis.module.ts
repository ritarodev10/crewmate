import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppConfig } from '../config/config.schema';
import { REDIS_TOKEN } from './redis.service';

@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): Redis =>
        new Redis(config.get('REDIS_URL', { infer: true })),
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
