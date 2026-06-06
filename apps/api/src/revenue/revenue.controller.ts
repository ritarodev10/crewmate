import { Controller, Get } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtPayload } from '../auth/jwt.strategy'
import { RevenueService } from './revenue.service'

@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  getRevenueSummary(@CurrentUser() user: JwtPayload) {
    return this.revenueService.getRevenueSummary(user)
  }
}
