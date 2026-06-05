import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserRole } from '@prisma/client'
import { EnvConfig } from '../config/env.validation'

export interface JwtPayload {
  sub: string        // userId
  email: string
  role: UserRole
  operatorId: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService<EnvConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', { infer: true }),
    })
  }

  validate(payload: JwtPayload): JwtPayload {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      operatorId: payload.operatorId,
    }
  }
}
