import { IsEnum, IsOptional, IsString } from 'class-validator'
import { CancelCode } from '@prisma/client'

export class CancelJobDto {
  @IsEnum(CancelCode)
  cancelReasonCode!: CancelCode

  @IsOptional()
  @IsString()
  cancelReasonNote?: string
}
