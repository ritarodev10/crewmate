import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@prisma/client'
import { FastifyRequest } from 'fastify'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { JwtPayload } from '../jwt.strategy'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    // No @Roles() decorator — allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtPayload }>()

    const user = request.user

    if (!user) {
      throw new ForbiddenException('Access denied')
    }

    const hasRole = requiredRoles.includes(user.role)
    if (!hasRole) {
      throw new ForbiddenException(
        `Role ${user.role} is not permitted to access this resource`,
      )
    }

    return true
  }
}
