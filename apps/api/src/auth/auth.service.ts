import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { InvalidCredentialsError } from '../common/errors/domain.errors'
import { EnvConfig } from '../config/env.validation'
import { JwtPayload } from './jwt.strategy'

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: string
    name: string
    operatorId: string
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        operatorId: true,
      },
    })

    if (!user) {
      throw new InvalidCredentialsError()
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)

    if (!passwordValid) {
      throw new InvalidCredentialsError()
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      operatorId: user.operatorId,
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', { infer: true }),
      expiresIn: '15m',
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: '7d',
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        operatorId: user.operatorId,
      },
    }
  }

  refresh(refreshToken: string): string {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      })

      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        operatorId: payload.operatorId,
      }

      return this.jwtService.sign(newPayload, {
        secret: this.configService.get('JWT_SECRET', { infer: true }),
        expiresIn: '15m',
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }
}
