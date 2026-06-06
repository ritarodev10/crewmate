// =============================================================================
// demo/demo.controller.ts
// =============================================================================

import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtPayload } from '../auth/jwt.strategy'
import { DemoService } from './demo.service'

@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  /**
   * POST /demo/reset
   *
   * Resets the 40 seeded demo jobs, all worker statuses, and their status
   * event audit trails back to the original seed state.
   *
   * Restricted to SUPER_ADMIN and MANAGER roles.
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  reset(@CurrentUser() user: JwtPayload) {
    return this.demoService.reset(user)
  }
}
