import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsIn(['markdown', 'txt'])
  sourceType?: 'markdown' | 'txt';
}
