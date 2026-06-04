import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  WEBHOOK_SIGNING_SECRET: z.string().min(32),
  CLOUDFLARE_SHARED_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;
