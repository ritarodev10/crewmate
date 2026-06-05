import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { JwtPayload } from '../jwt.strategy'

/** Extracts the JWT payload from request.user (populated by Passport after JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload }>()
    return request.user
  },
)
