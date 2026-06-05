import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator'
import { AssigneeKind } from '@prisma/client'

export class CreateJobDto {
  @IsString()
  customerId!: string

  @IsString()
  jobTypeId!: string

  @IsEnum(AssigneeKind)
  assigneeKind!: AssigneeKind

  @ValidateIf((o: CreateJobDto) => o.assigneeKind === AssigneeKind.SOLO)
  @IsString()
  workerId?: string

  @ValidateIf((o: CreateJobDto) => o.assigneeKind === AssigneeKind.TEAM)
  @IsString()
  teamId?: string

  @IsDateString()
  scheduledFor!: string

  @IsOptional()
  @IsString()
  notes?: string
}
