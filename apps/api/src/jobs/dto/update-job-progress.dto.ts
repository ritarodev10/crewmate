import { IsIn, IsInt } from 'class-validator'

export class UpdateJobProgressDto {
  @IsInt()
  @IsIn([0, 25, 50, 75, 100])
  progressPct!: number
}
