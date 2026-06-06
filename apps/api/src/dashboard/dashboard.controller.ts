import { Controller, Get } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtPayload } from '../auth/jwt.strategy'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD)
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getSummary(user)
  }

  @Get('activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD)
  getActivity(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getActivity(user)
  }
}
