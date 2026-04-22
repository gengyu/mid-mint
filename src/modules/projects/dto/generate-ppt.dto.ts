import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GeneratePptDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  requestedSlides?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  refinementRounds?: number;
}
