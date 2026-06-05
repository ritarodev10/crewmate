import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'
import { EnvConfig } from '../../config/env.validation'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class CloudflareSecretGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true })

    // Skip validation in local development — no CF proxy present
    if (nodeEnv === 'development') {
      return true
    }

    // Skip for routes explicitly marked @Public() (health checks etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const header = request.headers['x-cloudflare-secret']
    const expected = this.configService.get('CLOUDFLARE_SECRET', { infer: true })

    if (header !== expected) {
      throw new UnauthorizedException('Missing or invalid Cloudflare secret')
    }

    return true
  }
}
