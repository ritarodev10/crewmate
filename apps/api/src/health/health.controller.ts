import { Controller, Get, HttpCode } from '@nestjs/common'

@Controller()
export class HealthController {
  @Get('healthz')
  @HttpCode(200)
  healthz() {
    return { status: 'ok' }
  }
}
