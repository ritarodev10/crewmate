import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtPayload } from '../auth/jwt.strategy'
import { JobsService } from './jobs.service'
import { CancelJobDto } from './dto/cancel-job.dto'
import { CreateJobDto } from './dto/create-job.dto'
import { JobsFilterDto } from './dto/jobs-filter.dto'
import { UpdateJobProgressDto } from './dto/update-job-progress.dto'
import { UpdateJobStatusDto } from './dto/update-job-status.dto'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_LEAD,
    UserRole.WORKER,
  )
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filter: JobsFilterDto,
  ) {
    return this.jobsService.findAll(user, filter)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(user, dto)
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_LEAD,
    UserRole.WORKER,
  )
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.jobsService.findOne(user, id)
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_LEAD,
    UserRole.WORKER,
  )
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateStatus(user, id, dto.status)
  }

  @Patch(':id/progress')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_LEAD,
    UserRole.WORKER,
  )
  updateProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobProgressDto,
  ) {
    return this.jobsService.updateProgress(user, id, dto)
  }

  @Patch(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.MANAGER)
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CancelJobDto,
  ) {
    return this.jobsService.cancel(user, id, dto)
  }
}
