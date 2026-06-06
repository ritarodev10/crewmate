import { Controller, Get, Param, Query } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { IsIn, IsOptional } from 'class-validator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtPayload } from '../auth/jwt.strategy'
import { WorkersService } from './workers.service'

class WorkerEarningsQueryDto {
  @IsOptional()
  @IsIn(['week', 'month', 'lifetime'])
  period?: 'week' | 'month' | 'lifetime'
}

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.workersService.findAll(user)
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD)
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workersService.findOne(user, id)
  }

  @Get(':id/earnings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD)
  getEarnings(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() query: WorkerEarningsQueryDto,
  ) {
    return this.workersService.getEarnings(user, id, query.period ?? 'week')
  }
}
