import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GeneratePptDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  refinementRounds?: number;
}
