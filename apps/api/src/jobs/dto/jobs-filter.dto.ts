import { IsEnum, IsOptional, IsString } from 'class-validator'
import { JobStatus } from '@prisma/client'

export class JobsFilterDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus

  @IsOptional()
  @IsString()
  worker?: string

  @IsOptional()
  @IsString()
  type?: string
}
