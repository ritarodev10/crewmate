import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AppConfig } from '../config/config.schema';

export const REDIS_TOKEN = 'REDIS_CLIENT';

export function redisFactory(config: ConfigService<AppConfig, true>): Redis {
  return new Redis(config.get('REDIS_URL', { infer: true }));
}
