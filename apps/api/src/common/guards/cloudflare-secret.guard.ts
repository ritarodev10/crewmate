import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type { AppConfig } from '../../core/config/config.schema';

const BYPASS_PATHS = new Set(['/healthz', '/readyz']);

@Injectable()
export class CloudflareSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (BYPASS_PATHS.has(req.path)) return true;

    const provided = req.header('x-cloudflare-secret');
    const expected = this.config.get('CLOUDFLARE_SHARED_SECRET', { infer: true });
    if (!provided || provided !== expected) {
      throw new UnauthorizedException({ message: 'Unauthorized' });
    }
    return true;
  }
}
