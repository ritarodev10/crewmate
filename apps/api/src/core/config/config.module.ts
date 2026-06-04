import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configSchema } from './config.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => configSchema.parse(config),
      expandVariables: false,
    }),
  ],
})
export class ConfigCoreModule {}
