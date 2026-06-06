import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { EnvConfig } from '../config/env.validation'
import { JwtPayload } from '../auth/jwt.strategy'
import { WsEventName, WsEventPayload } from './events.types'

@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env['WEB_URL'] ?? '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server

  private readonly logger = new Logger(EventsGateway.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  // -------------------------------------------------------------------------
  // handleConnection — verify JWT from handshake, join operator room
  // -------------------------------------------------------------------------
  handleConnection(client: Socket): void {
    const token = client.handshake.auth['token'] as string | undefined

    if (!token) {
      this.logger.warn(`WS connection rejected — no token [${client.id}]`)
      client.disconnect()
      return
    }

    try {
      const secret = this.configService.get('JWT_SECRET', { infer: true })
      const payload = this.jwtService.verify<JwtPayload>(token, { secret })

      // Store verified identity on the socket data so emit helpers can use it
      client.data['operatorId'] = payload.operatorId
      client.data['userId'] = payload.sub

      void client.join(`operator:${payload.operatorId}`)
      this.logger.debug(
        `WS connected: userId=${payload.sub} operator=${payload.operatorId} [${client.id}]`,
      )
    } catch {
      this.logger.warn(`WS connection rejected — invalid token [${client.id}]`)
      client.disconnect()
    }
  }

  // -------------------------------------------------------------------------
  // handleDisconnect — logging only
  // -------------------------------------------------------------------------
  handleDisconnect(client: Socket): void {
    this.logger.debug(`WS disconnected [${client.id}]`)
  }

  // -------------------------------------------------------------------------
  // Generic typed emit — called by service layer only
  // -------------------------------------------------------------------------
  emit<T extends WsEventName>(
    operatorId: string,
    event: T,
    payload: WsEventPayload[T],
  ): void {
    this.server.to(`operator:${operatorId}`).emit(event, payload)
  }
}
